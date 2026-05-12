import { MAX_ENERGY, START_ENERGY, LOCKED_START, DAILY_TASKS, ADVENT_REWARDS, CELL_REQUIREMENTS, ALL_ITEMS } from './config.js';

// Красивое модальное окно для адвента
function showAdventModal(message) {
  const oldModal = document.querySelector('.advent-modal');
  if (oldModal) oldModal.remove();
  const oldOverlay = document.querySelector('.advent-overlay');
  if (oldOverlay) oldOverlay.remove();
  
  const overlay = document.createElement('div');
  overlay.className = 'advent-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:1999;';
  document.body.appendChild(overlay);
  
  const modal = document.createElement('div');
  modal.className = 'advent-modal';
  modal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(135deg,#1e3c72,#0f2a5a);padding:24px;border-radius:24px;z-index:2000;max-width:300px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,0.5);border:2px solid #f7931a;';
  modal.innerHTML = `
    <h3 style="color:#f7931a;margin-bottom:15px;font-size:20px;">📅 ХАЛВИНГ КАЛЕНДАРЬ</h3>
    <p style="margin-bottom:20px;font-size:14px;line-height:1.4;">${message}</p>
    <button style="background:linear-gradient(135deg,#f7931a,#ffbc42);border:none;padding:10px 24px;border-radius:30px;font-weight:bold;cursor:pointer;color:#1a1a2e;" onclick="this.closest('.advent-modal')?.remove(); document.querySelector('.advent-overlay')?.remove()">ХОРОШО</button>
  `;
  document.body.appendChild(modal);
}

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
  lastAdventClaimTime: null,
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

export const getState = () => state;

export const updateState = (patch) => {
  Object.assign(state, patch);
  saveProgress();
  
  if (patch.stats?.mergedItems) {
    checkCellUnlocks();
  }
  
  if (patch.stats || patch.coins !== undefined || patch.energy !== undefined) {
    syncStatsToGlobal();
  }
};

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
      lastAdventClaimTime: state.lastAdventClaimTime,
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
      state.lastAdventClaimTime = p.lastAdventClaimTime ?? null;
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
  
  const today = new Date().toDateString();
  if (state.stats.lastDailyReset !== today) {
    state.tasks.forEach(t => { t.progress = 0; t.claimed = false; });
    state.stats.lastDailyReset = today;
    updateState({ tasks: state.tasks, stats: state.stats });
  }
};

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

export const checkCellUnlocks = () => {
  let newUnlocks = 0;
  
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
        console.log(`🔓 Ячейка #${idx} разблокирована!`);
      }
    }
  }
  
  if (newUnlocks > 0) {
    state.unlockedCount = state.unlockedCells.filter(i => i >= LOCKED_START).length;
    updateState({ unlockedCells: state.unlockedCells, unlockedCount: state.unlockedCount });
    updateTaskProgress('unlock', newUnlocks);
  }
};

export const resetGame = () => {
  const newBoard = [...state.board];
  for (let i = 0; i < 4 && i < state.unlockedCells.length; i++) {
    if (!newBoard[state.unlockedCells[i]]) {
      newBoard[state.unlockedCells[i]] = ALL_ITEMS.find(item => item.id === 1);
    }
  }
  updateState({ board: newBoard, isGameOver: false, speedrunStart: null });
};

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
  
  if (leveled) {
    checkCellUnlocks();
  }
  
  return leveled;
};

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
      } else if (type === 'sell') {
        const newProg = Math.min(task.progress + value, task.target);
        if (newProg !== task.progress) {
          task.progress = newProg;
          changed = true;
        }
      } else {
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
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartTime = todayStart.getTime();
  
  if (state.lastAdventClaimTime && state.lastAdventClaimTime >= todayStartTime) {
    const remaining = 24 * 60 * 60 * 1000 - (now - state.lastAdventClaimTime);
    const hours = Math.floor(remaining / (3600000));
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    showAdventModal(`⏰ Следующий бонус через<br>${hours}ч ${minutes}м ${seconds}с!`);
    return null;
  }
  
  const reward = ADVENT_REWARDS[(state.adventDay - 1) % ADVENT_REWARDS.length];
  if (!reward) return null;
  
  const freeCells = state.board.filter((c, i) => c === null && state.unlockedCells.includes(i)).length;
  const neededCells = (reward.type === 'item' && reward.count) || 
                      (reward.type === 'bonus_item' && 1) || 
                      (reward.type === 'special' && 1) || 0;
  
  if (neededCells > freeCells) {
    showAdventModal(`❌ Нужно освободить ${neededCells} ячеек!<br>Продай или объедини предметы.`);
    return null;
  }
  
  state.lastAdventClaimTime = now;
  
  if (reward.type === 'energy') {
    state.energy = Math.min(state.energy + reward.amount, MAX_ENERGY);
  }
  if (reward.type === 'xp') {
    addXP(reward.amount);
  }
  if (reward.type === 'all') {
    state.coins += reward.coins;
    state.energy = Math.min(state.energy + reward.energy, MAX_ENERGY);
    addXP(reward.xp);
  }
  if (reward.type === 'item') {
    for (let i = 0; i < reward.count; i++) {
      const free = state.board.findIndex((c, idx) => c === null && state.unlockedCells.includes(idx));
      if (free !== -1) {
        const item = ALL_ITEMS.find(it => it.id === reward.id);
        if (item) state.board[free] = item;
      }
    }
  }
  if (reward.type === 'bonus_item') {
    const bonusId = Math.floor(Math.random() * 10) + 16;
    const bonusItem = ALL_ITEMS.find(it => it.id === bonusId);
    const free = state.board.findIndex((c, idx) => c === null && state.unlockedCells.includes(idx));
    if (free !== -1 && bonusItem) state.board[free] = bonusItem;
  }
  if (reward.type === 'special') {
    const bitcoinItem = ALL_ITEMS.find(it => it.id === 11);
    const free = state.board.findIndex((c, idx) => c === null && state.unlockedCells.includes(idx));
    if (free !== -1 && bitcoinItem) state.board[free] = bitcoinItem;
  }
  
  state.adventDay = (state.adventDay % 7) + 1;
  
  updateTaskProgress('daily_claim');
  updateState({
    energy: state.energy,
    coins: state.coins,
    xp: state.xp,
    level: state.level,
    xpToNext: state.xpToNext,
    adventDay: state.adventDay,
    lastAdventClaimTime: now,
    board: state.board
  });
  
  return reward;
};

export const getPlayerId = () => {
  if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
    return String(window.Telegram.WebApp.initDataUnsafe.user.id);
  }
  let id = localStorage.getItem('player_id');
  if (!id) {
    id = 'player_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('player_id', id);
  }
  return id;
};

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
  state.speedrunStart = null;
  
  let playerName = 'Игрок';
  if (window.Telegram?.WebApp?.initDataUnsafe?.user?.username) {
    playerName = window.Telegram.WebApp.initDataUnsafe.user.username;
  } else if (window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name) {
    playerName = window.Telegram.WebApp.initDataUnsafe.user.first_name;
  } else {
    playerName = localStorage.getItem('player_name') || 'Игрок';
  }
  
  const isBest = !state.speedrunBest || elapsed < state.speedrunBest;
  if (isBest) {
    state.speedrunBest = elapsed;
  }
  
  const records = JSON.parse(localStorage.getItem('satoshi_records') || '[]');
  records.push({
    playerId: getPlayerId(),
    playerName: playerName,
    time: elapsed,
    level: state.level,
    date: new Date().toISOString()
  });
  
  records.sort((a, b) => a.time - b.time);
  localStorage.setItem('satoshi_records', JSON.stringify(records.slice(0, 50)));
  
  updateState({ speedrunStart: null, speedrunBest: state.speedrunBest });
  
  return { elapsed, isBest };
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