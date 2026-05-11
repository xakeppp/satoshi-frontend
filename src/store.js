import { MAX_ENERGY, START_ENERGY, LOCKED_START, DAILY_TASKS, ADVENT_REWARDS, CELL_REQUIREMENTS, ALL_ITEMS } from './config.js';

// ============= НАЧАЛЬНОЕ СОСТОЯНИЕ =============
const defaultState = {
  energy: START_ENERGY,
  coins: 1500,
  level: 1,
  xp: 0,
  xpToNext: 100,
  isGameOver: false,
  unlockedCells: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
  board: Array(25).fill(null),
  tasks: DAILY_TASKS.map(t => ({ ...t, progress: 0, claimed: false })),
  adventDay: 1,
  lastAdventClaim: null,
  stats: { 
    merges: 0, 
    sells: 0, 
    spawns: {}, 
    mergedItems: {}, 
    invites: 0, 
    lastDailyReset: null, 
    sessionStartTime: Date.now(),
    totalPlayTime: 0
  },
  regenTimer: null,
  timeUntilRegen: 60,
  speedrunStart: null,
  speedrunBest: null,
  unlockedCount: 0
};

let state = { ...defaultState };

// ============= GETTERS / SETTERS =============
export const getState = () => state;

export const updateState = (patch) => {
  Object.assign(state, patch);
  saveProgress();
  
  // При изменении mergedItems проверяем разблокировку ячеек
  if (patch.stats?.mergedItems) {
    checkCellUnlocks();
  }
  
  // Автоматическая синхронизация статистики
  if (patch.stats || patch.coins !== undefined || patch.energy !== undefined) {
    syncStatsToGlobal();
  }
};

// ============= СОХРАНЕНИЕ =============
export const saveProgress = () => {
  try {
    const now = Date.now();
    const sessionTime = Math.floor((now - (state.stats.sessionStartTime || now)) / 1000);
    state.stats.totalPlayTime = (state.stats.totalPlayTime || 0) + sessionTime;
    state.stats.sessionStartTime = now;
    
    localStorage.setItem('satoshi_save', JSON.stringify({
      energy: state.energy,
      coins: state.coins,
      level: state.level,
      xp: state.xp,
      xpToNext: state.xpToNext,
      unlockedCells: state.unlockedCells,
      board: state.board.map(cell => cell ? { id: cell.id, img: cell.img, name: cell.name } : null),
      adventDay: state.adventDay,
      lastAdventClaim: state.lastAdventClaim,
      stats: state.stats,
      tasks: state.tasks,
      speedrunBest: state.speedrunBest,
      unlockedCount: state.unlockedCount
    }));
  } catch(e) { console.warn('Save error:', e); }
};

export const loadProgress = () => {
  try {
    const saved = localStorage.getItem('satoshi_save');
    if (saved) {
      const p = JSON.parse(saved);
      state.energy = p.energy ?? START_ENERGY;
      state.coins = p.coins ?? 1500;
      state.level = p.level ?? 1;
      state.xp = p.xp ?? 0;
      state.xpToNext = p.xpToNext ?? 100;
      state.unlockedCells = p.unlockedCells ?? defaultState.unlockedCells;
      state.adventDay = p.adventDay ?? 1;
      state.lastAdventClaim = p.lastAdventClaim ?? null;
      state.stats = { ...defaultState.stats, ...(p.stats || {}) };
      state.stats.sessionStartTime = Date.now();
      state.tasks = defaultState.tasks.map((def, i) => ({ ...def, ...(p.tasks?.[i] || {}), rewards: def.rewards }));
      state.speedrunBest = p.speedrunBest ?? null;
      state.unlockedCount = p.unlockedCount ?? 0;
      
      if (p.board) {
        for (let i = 0; i < p.board.length; i++) {
          if (p.board[i]?.id) {
            const item = ALL_ITEMS.find(it => it.id === p.board[i].id);
            state.board[i] = item || null;
          } else state.board[i] = null;
        }
      }
    }
  } catch(e) { console.warn('Load error:', e); }
  
  // Проверка ежедневного сброса
  const today = new Date().toDateString();
  if (state.stats.lastDailyReset !== today) {
    state.tasks.forEach(t => { t.progress = 0; t.claimed = false; });
    state.stats.lastDailyReset = today;
    updateState({ tasks: state.tasks, stats: state.stats });
  }
};

// ============= СИНХРОНИЗАЦИЯ СТАТИСТИКИ =============
let syncTimeout = null;
function syncStatsToGlobal() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      const api = await import('./api/leaderboardApi.js');
      api.savePlayerStats({
        totalMerges: state.stats.merges || 0,
        totalSpawns: Object.values(state.stats.spawns || {}).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0),
        totalSells: state.stats.sells || 0,
        totalTime: Math.floor((Date.now() - (state.stats.sessionStartTime || Date.now())) / 1000),
        coinsWon: state.coins,
        energyWon: MAX_ENERGY - state.energy
      });
    } catch(e) { console.log('Sync error:', e); }
  }, 1000);
}

// ============= РАЗБЛОКИРОВКА ЯЧЕЕК =============
export const checkCellUnlocks = () => {
  let newUnlocks = 0;
  const unlockedBefore = state.unlockedCells.length;
  
  for (const [idxStr, req] of Object.entries(CELL_REQUIREMENTS)) {
    const idx = parseInt(idxStr);
    if (!state.unlockedCells.includes(idx)) {
      let unlocked = false;
      
      if (req.type === 'level' && state.level >= req.level) {
        unlocked = true;
      }
      if (req.type === 'merge') {
        const mergedCount = state.stats.mergedItems?.[req.id] || 0;
        if (mergedCount >= req.count) unlocked = true;
      }
      
      if (unlocked) {
        state.unlockedCells.push(idx);
        newUnlocks++;
        console.log(`🔓 Ячейка #${idx} разблокирована! (${req.text})`);
      }
    }
  }
  
  if (newUnlocks > 0) {
    state.unlockedCount = state.unlockedCells.filter(i => i >= LOCKED_START).length;
    updateState({ unlockedCells: state.unlockedCells, unlockedCount: state.unlockedCount });
    
    // Обновляем прогресс задания на разблокировку
    updateTaskProgress('unlock', newUnlocks);
  }
};

// ============= СБРОС ИГРЫ =============
export const resetGame = () => {
  const newBoard = [...state.board];
  for (let i = 0; i < 4 && i < state.unlockedCells.length; i++) {
    if (!newBoard[state.unlockedCells[i]]) {
      newBoard[state.unlockedCells[i]] = ALL_ITEMS.find(item => item.id === 1);
    }
  }
  updateState({ board: newBoard, isGameOver: false, speedrunStart: null });
};

// ============= XP И УРОВНИ =============
export const addXP = (amount) => {
  let newXp = state.xp + amount;
  let newLevel = state.level;
  let newXpToNext = state.xpToNext;
  let leveled = false;
  
  while (newXp >= newXpToNext) {
    newXp -= newXpToNext;
    newLevel++;
    newXpToNext = Math.floor(newXpToNext * 1.5);
    leveled = true;
  }
  
  state.xp = newXp;
  state.level = newLevel;
  state.xpToNext = newXpToNext;
  
  updateState({ xp: newXp, level: newLevel, xpToNext: newXpToNext });
  updateTaskProgress('level');
  
  // При повышении уровня проверяем разблокировку ячеек
  if (leveled) {
    checkCellUnlocks();
  }
  
  return leveled;
};

// ============= ЗАДАНИЯ =============
export const updateTaskProgress = (type, value = 1, targetId = null) => {
  let changed = false;
  state.tasks.forEach(task => {
    if (task.claimed) return;
    
    if (task.type === type) {
      if (type === 'level' && state.level >= task.target && task.progress < task.target) {
        task.progress = task.target;
        changed = true;
      } else if (type === 'coins' && state.coins >= task.target && task.progress < task.target) {
        task.progress = task.target;
        changed = true;
      } else if (type === 'merge_id' && targetId === task.targetId && task.progress < task.target) {
        task.progress = Math.min(task.progress + 1, task.target);
        changed = true;
      } else if (type === 'unlock') {
        const unlocked = state.unlockedCells.filter(i => i >= LOCKED_START).length;
        if (unlocked >= task.target && task.progress < task.target) {
          task.progress = task.target;
          changed = true;
        }
      } else if (type === 'speedrun') {
        // Проверяется отдельно при завершении скоррана
      } else if (!['level', 'coins', 'merge_id', 'unlock', 'speedrun'].includes(type)) {
        const newProg = Math.min(task.progress + value, task.target);
        if (newProg !== task.progress) {
          task.progress = newProg;
          changed = true;
        }
      }
    }
  });
  if (changed) updateState({ tasks: state.tasks });
};

export const claimTaskReward = (taskId) => {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task || task.progress < task.target || task.claimed) return false;
  
  task.claimed = true;
  const r = task.rewards || {};
  if (r.coins) state.coins += r.coins;
  if (r.energy) state.energy = Math.min(state.energy + r.energy, MAX_ENERGY);
  if (r.xp) addXP(r.xp);
  
  updateState({ coins: state.coins, energy: state.energy, tasks: state.tasks });
  return true;
};

export const claimAdventReward = () => {
  const now = new Date().toDateString();
  if (state.lastAdventClaim === now) return null;
  
  const reward = ADVENT_REWARDS[(state.adventDay - 1) % ADVENT_REWARDS.length];
  state.lastAdventClaim = now;
  
  if (reward.type === 'energy') {
    state.energy = Math.min(state.energy + reward.amount, MAX_ENERGY);
  }
  if (reward.type === 'xp') {
    addXP(reward.amount);
  }
  if (reward.type === 'item') {
    const free = state.board.findIndex((c, i) => c === null && state.unlockedCells.includes(i));
    if (free !== -1) {
      const item = ALL_ITEMS.find(i => i.id === reward.id);
      if (item) state.board[free] = item;
    }
  }
  
  state.adventDay = (state.adventDay % 7) + 1;
  updateTaskProgress('daily_claim');
  updateState({
    energy: state.energy,
    adventDay: state.adventDay,
    lastAdventClaim: now,
    board: state.board
  });
  
  return reward;
};

// ============= СКОРРАН (СПИДРАН) =============
export const startSpeedrun = () => {
  if (!state.speedrunStart) {
    state.speedrunStart = Date.now();
    updateState({ speedrunStart: state.speedrunStart });
    return true;
  }
  return false;
};

export const stopSpeedrun = () => {
  if (!state.speedrunStart) return null;
  
  const elapsed = Date.now() - state.speedrunStart;
  const displayTime = formatTime(elapsed);
  state.speedrunStart = null;
  
  const isBest = !state.speedrunBest || elapsed < state.speedrunBest;
  if (isBest) {
    state.speedrunBest = elapsed;
  }
  
  const records = JSON.parse(localStorage.getItem('satoshi_records') || '[]');
  records.push({
    date: new Date().toISOString(),
    time: elapsed,
    level: state.level,
    coins: state.coins,
    displayTime: displayTime
  });
  records.sort((a, b) => a.time - b.time);
  localStorage.setItem('satoshi_records', JSON.stringify(records.slice(0, 50)));
  
  updateState({ speedrunStart: null, speedrunBest: state.speedrunBest });
  
  // Обновляем задание на скорран (если есть)
  updateTaskProgress('speedrun', 1);
  
  return { elapsed, displayTime, isBest };
};

export const getSpeedrunTime = () => {
  if (!state.speedrunStart) return null;
  return Date.now() - state.speedrunStart;
};

export const getRecords = () => {
  return JSON.parse(localStorage.getItem('satoshi_records') || '[]');
};

export const clearRecords = () => {
  localStorage.removeItem('satoshi_records');
  updateState({ speedrunBest: null });
};

function formatTime(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const ms2 = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms2).padStart(2, '0')}`;
}