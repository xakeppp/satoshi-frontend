import { getState, updateState, resetGame, addXP, loadProgress, claimTaskReward, claimAdventReward, updateTaskProgress, getRecords, clearRecords, startSpeedrun, stopSpeedrun } from './store.js';
import { ALL_ITEMS, LOCKED_START, MERGE_XP, CELL_REQUIREMENTS, ADVENT_REWARDS, MAX_ENERGY, SPAWN_COST, getRandomItemId } from './config.js';
import { t, loadLanguage, updateTexts } from './i18n.js';
import { initTelegram, playHaptic } from './api/telegram.js';
import { connectBattleWebSocket, sendBattleMessage, getPlayerId, getPlayerName, getOnlinePlayers, getTotalStats, getGlobalLeaderboard, savePlayerStats } from './api/leaderboardApi.js';
import { initDragDrop } from './logic/dragdrop.js';
import { tryMerge, tryMergeBonus } from './logic/merge.js';
import { startRegenTimer, spendEnergy } from './logic/energy.js';
import { renderGrid } from './ui/grid.js';
import { updateHeader } from './ui/header.js';
import { initSellPanel } from './ui/sellPanel.js';

// ============= ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =============
let battleActive = false;
let currentBattleId = null;
let opponentName = '';
let opponentId = '';
let opponentMerges = 0;
let myMergesInBattle = 0;

// ============= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =============
function formatTimeShort(seconds) {
  if (seconds < 60) return `${seconds} сек`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин ${seconds % 60} сек`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ч ${Math.floor((seconds % 3600) / 60)} мин`;
  return `${Math.floor(seconds / 86400)} д ${Math.floor((seconds % 86400) / 3600)} ч`;
}

function formatTimeMs(ms) {
  if (!ms) return '--:--';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const ms2 = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms2).padStart(2, '0')}`;
}

function showRewardModal(rewards) {
  const modal = document.createElement('div');
  modal.className = 'reward-modal';
  let content = '<h2>🎉 Награда получена!</h2>';
  if (rewards.coins) content += `<div class="reward-line">+${rewards.coins} 🪙</div>`;
  if (rewards.energy) content += `<div class="reward-line">+${rewards.energy} ⚡</div>`;
  if (rewards.xp) content += `<div class="reward-line">+${rewards.xp} XP</div>`;
  content += '<button onclick="this.closest(\'.reward-modal\').remove()">КРУТО!</button>';
  modal.innerHTML = `<div class="reward-content">${content}</div>`;
  document.body.appendChild(modal);
  setTimeout(() => modal.remove(), 3000);
}

// ============= СТАТИСТИКА UI (ОБНОВЛЯЕТСЯ ПРАВИЛЬНО) =============
async function updateStatsUI() {
  const state = getState();
  const onlinePlayers = await getOnlinePlayers();
  const totalStats = await getTotalStats();
  
  // Своя статистика из store.js
  const myMerges = state.stats.merges || 0;
  const mySpawns = Object.values(state.stats.spawns || {}).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
  const mySells = state.stats.sells || 0;
  const myTime = Math.floor((Date.now() - (state.stats.sessionStartTime || Date.now())) / 1000) + (state.stats.totalPlayTime || 0);
  
  // Обновляем счётчики в DOM
  const mergesEl = document.getElementById('total-merges-all');
  if (mergesEl) mergesEl.textContent = myMerges;
  
  const spawnsEl = document.getElementById('total-spawns-all');
  if (spawnsEl) spawnsEl.textContent = mySpawns;
  
  const sellsEl = document.getElementById('total-sells-all');
  if (sellsEl) sellsEl.textContent = mySells;
  
  const timeEl = document.getElementById('total-time-all');
  if (timeEl) timeEl.textContent = formatTimeShort(myTime);
  
  // Онлайн список
  const onlineListEl = document.getElementById('online-list');
  if (onlineListEl) {
    if (!onlinePlayers || onlinePlayers.length === 0) {
      onlineListEl.innerHTML = '<div class="online-empty">🟢 Вы один</div>';
    } else {
      onlineListEl.innerHTML = onlinePlayers.map(p => `
        <div class="online-player">
          <span class="status"></span>
          <span>${p.username || 'Аноним'}</span>
          <span class="online-stats">📦${p.total_merges || 0}</span>
        </div>
      `).join('');
    }
  }
  
  // Онлайн счётчик
  const onlineCountEl = document.getElementById('online-count');
  if (onlineCountEl) onlineCountEl.textContent = onlinePlayers?.length || 1;
  
  // Сохраняем на сервер
  savePlayerStats({
    totalMerges: myMerges,
    totalSpawns: mySpawns,
    totalSells: mySells,
    totalTime: Math.floor((Date.now() - state.stats.sessionStartTime) / 1000)
  });
}

// ============= ЛИДЕРБОРД UI =============
async function updateLeaderboardUI() {
  const state = getState();
  const globalRecords = await getGlobalLeaderboard();
  const list = document.querySelector('.leaderboard-list');
  if (!list) return;
  
  const bestEl = document.getElementById('lb-best');
  if (bestEl && state.speedrunBest) {
    bestEl.textContent = `Лучший: ${formatTimeMs(state.speedrunBest)}`;
  }
  
  if (!globalRecords || globalRecords.length === 0) {
    list.innerHTML = '<div class="leaderboard-empty">Пока нет рекордов</div>';
    return;
  }
  
  list.innerHTML = globalRecords.slice(0, 10).map((rec, i) => `
    <div class="leaderboard-item ${i === 0 ? 'first' : i === 1 ? 'second' : i === 2 ? 'third' : ''}">
      <div class="lb-rank">${i + 1}</div>
      <div class="lb-name">${rec.username || 'Аноним'}</div>
      <div class="lb-time">${formatTimeMs(rec.best_speedrun)}</div>
      <div class="lb-stats">📦${rec.total_merges || 0}</div>
    </div>
  `).join('');
}

// ============= ЗАДАНИЯ UI =============
function updateTasksUI() {
  const list = document.querySelector('.task-list');
  if (!list) return;
  const state = getState();
  
  list.innerHTML = state.tasks.map(task => {
    const r = task.rewards || { coins: 0, energy: 0, xp: 0 };
    const rewardText = [];
    if (r.coins) rewardText.push(`+${r.coins}🪙`);
    if (r.energy) rewardText.push(`+${r.energy}⚡`);
    if (r.xp) rewardText.push(`+${r.xp}XP`);
    
    return `
      <div class="task-item ${task.claimed ? 'completed' : ''}">
        <div class="task-icon">📋</div>
        <div class="task-info">
          <div class="task-name">${task.name}</div>
          <div class="task-progress">${Math.min(task.progress, task.target)} / ${task.target}</div>
          <div class="xp-bar"><div class="xp-fill" style="width:${(Math.min(task.progress, task.target)/task.target)*100}%"></div></div>
          <div class="task-rewards">${rewardText.join(' ')}</div>
        </div>
        <button class="task-claim-btn" data-task-id="${task.id}" ${task.progress < task.target || task.claimed ? 'disabled' : ''}>
          ${task.claimed ? '✅' : 'Забрать'}
        </button>
      </div>
    `;
  }).join('');
  
  document.querySelectorAll('.task-claim-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskId = parseInt(btn.dataset.taskId);
      if (claimTaskReward(taskId)) {
        const snd = new Audio('/assets/click.mp3');
        snd.volume = 0.3;
        snd.play().catch(() => {});
        playHaptic('success');
        const task = getState().tasks.find(t => t.id === taskId);
        if (task) showRewardModal(task.rewards);
        updateTasksUI();
        updateHeader();
        updateStatsUI();
      }
    });
  });
}

// ============= АДВЕНТ UI =============
function updateAdventUI() {
  const grid = document.querySelector('.advent-grid');
  if (!grid) return;
  const state = getState();
  
  grid.innerHTML = ADVENT_REWARDS.map((r, i) => {
    const dayNum = i + 1;
    const isClaimed = state.lastAdventClaim === new Date().toDateString();
    const isToday = dayNum === state.adventDay && !isClaimed;
    return `<div class="advent-day ${isClaimed ? 'collected' : ''} ${isToday ? 'active' : ''}" data-day="${dayNum}">
      <div class="advent-icon">${r.icon}</div>
      <div class="advent-name">${r.name}</div>
    </div>`;
  }).join('');
  
  grid.querySelectorAll('.advent-day.active').forEach(el => {
    el.addEventListener('click', () => {
      const reward = claimAdventReward();
      if (reward) {
        const snd = new Audio('/assets/merge.mp3');
        snd.volume = 0.3;
        snd.play().catch(() => {});
        playHaptic('success');
        showRewardModal(reward.type === 'energy' ? { energy: reward.amount } : reward.type === 'xp' ? { xp: reward.amount } : { coins: 100 });
        updateAdventUI();
        updateHeader();
        renderGrid();
        updateStatsUI();
      }
    });
  });
}

// ============= БИТВА UI =============
function updateBattleUI() {
  const battleBtn = document.getElementById('battle-btn');
  const battleStatus = document.getElementById('battle-status');
  
  if (battleActive) {
    document.body.classList.add('battle-mode-active');
    if (battleBtn) battleBtn.textContent = '🏳️ СДАТЬСЯ';
    if (battleStatus) {
      battleStatus.classList.add('active');
      battleStatus.innerHTML = `⚔️ БИТВА С ${opponentName} ⚔️<br>📦 Ваши слияния: ${myMergesInBattle} | Слияния соперника: ${opponentMerges}`;
    }
  } else {
    document.body.classList.remove('battle-mode-active');
    if (battleBtn) battleBtn.textContent = '⚔️ БИТВА НАСМЕРТЬ ⚔️';
    if (battleStatus) {
      battleStatus.classList.remove('active');
      battleStatus.innerHTML = '';
    }
  }
}

function handleBattleMessage(data) {
  switch(data.type) {
    case 'waiting':
      const status = document.getElementById('battle-status');
      if (status) {
        status.innerHTML = '⏳ Поиск соперника...';
        status.classList.add('active');
      }
      break;
    case 'battle_start':
      battleActive = true;
      currentBattleId = data.battleId;
      opponentName = data.opponent?.name || 'Соперник';
      opponentId = data.opponent?.id || '';
      opponentMerges = 0;
      myMergesInBattle = 0;
      updateBattleUI();
      break;
    case 'opponent_move':
      opponentMerges++;
      updateBattleUI();
      break;
    case 'battle_end':
      battleActive = false;
      currentBattleId = null;
      updateBattleUI();
      setTimeout(() => {
        const status = document.getElementById('battle-status');
        if (status) status.classList.remove('active');
      }, 3000);
      break;
  }
}

function findBattle() {
  const status = document.getElementById('battle-status');
  if (status) {
    status.innerHTML = '🔍 Поиск соперника...';
    status.classList.add('active');
  }
  sendBattleMessage({ type: 'join', playerId: getPlayerId(), playerName: getPlayerName() });
}

// ============= СЛИЯНИЕ (ОБНОВЛЯЕТ СТАТИСТИКУ) =============
function handleMerge(src, tgt) {
  const state = getState();
  const s = state.board[src];
  const t = state.board[tgt];
  
  if (!s || !t) return false;
  
  // === ПРАВИЛЬНЫЙ СЧЁТЧИК: +1 за каждое слияние ===
  if (!state.stats.mergedItems) state.stats.mergedItems = {};
  state.stats.mergedItems[s.id] = (state.stats.mergedItems[s.id] || 0) + 1;
  state.stats.merges = (state.stats.merges || 0) + 1;  // +1, а не +id предмета!
  
  updateState({ stats: state.stats });
  
  updateTaskProgress('merge', 1);
  updateTaskProgress('merge_id', 1, s.id);
  
  // Пробуем слияние
  let result = tryMerge(src, tgt);
  if (!result.success && s.id >= 16) result = tryMergeBonus(src, tgt);
  
  if (result.success) {
    const sndMerge = new Audio('/assets/merge.mp3');
    sndMerge.volume = 0.3;
    sndMerge.play().catch(() => {});
    playHaptic('medium');
    
    if (result.isBonusMerge) {
      const newEnergy = Math.min(state.energy + (result.energyReward || 0), MAX_ENERGY);
      updateState({ 
        board: result.newBoard, 
        coins: state.coins + (result.coinReward || 0),
        energy: newEnergy,
        stats: state.stats 
      });
      addXP(result.xpReward || 0);
    } else {
      addXP(result.xpReward || 0);
      const energyBonus = result.energyReward || 0;
      const newEnergy = energyBonus > 0 ? Math.min(state.energy + energyBonus, MAX_ENERGY) : state.energy;
      updateState({ 
        board: result.newBoard, 
        coins: state.coins + result.coinReward, 
        energy: newEnergy, 
        stats: state.stats 
      });
    }
    
    // Битва: увеличиваем счётчик
    if (battleActive) {
      myMergesInBattle++;
      sendBattleMessage({ type: 'battle_move', battleId: currentBattleId, move: { nextId: result.nextId } });
      updateBattleUI();
    }
    
    onUpdate();
    return true;
  }
  return false;
}

// ============= ПЕРЕМЕЩЕНИЕ =============
function handleMove(src) {
  const state = getState();
  const item = state.board[src];
  if (!item) return;
  
  const free = [];
  for (let i = 0; i < state.board.length; i++) {
    if (state.board[i] === null && state.unlockedCells.includes(i)) free.push(i);
  }
  if (free.length === 0) return;
  
  const fromRow = Math.floor(src / 5);
  const fromCol = src % 5;
  let best = free[0];
  let minD = Infinity;
  free.forEach(idx => {
    const row = Math.floor(idx / 5);
    const col = idx % 5;
    const d = Math.abs(row - fromRow) + Math.abs(col - fromCol);
    if (d < minD) { minD = d; best = idx; }
  });
  
  const newBoard = [...state.board];
  newBoard[best] = item;
  newBoard[src] = null;
  updateState({ board: newBoard });
  onUpdate();
}

// ============= ОБНОВЛЕНИЕ ВСЕГО UI =============
function onUpdate() {
  renderGrid();
  updateHeader();
  updateTasksUI();
  updateAdventUI();
  updateLeaderboardUI();
  updateStatsUI();
  updateTexts();
}

// ============= ИНИЦИАЛИЗАЦИЯ =============
window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Игра загружается...');
  
  loadLanguage();
  updateTexts();
  loadProgress();
  initTelegram();
  resetGame();
  startRegenTimer(onUpdate);
  initSellPanel();
  connectBattleWebSocket(handleBattleMessage);
  
  // Звуки
  const sndClick = new Audio('/assets/click.mp3');
  sndClick.volume = 0.3;
  function playSound(type) { if (type === 'click') { sndClick.currentTime = 0; sndClick.play().catch(() => {}); } }
  
  // Первый рендер
  onUpdate();
  
  // === ТАБЫ ===
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
      });
      item.classList.add('active');
      const target = document.getElementById(tab + '-area');
      if (target) { target.classList.add('active'); target.style.display = 'flex'; }
      playSound('click');
      if (tab === 'stats') updateStatsUI();
      if (tab === 'leaderboard') updateLeaderboardUI();
    });
  });
  
  // === КНОПКА СОЗДАТЬ ===
  const createBtn = document.getElementById('create-btn');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      const state = getState();
      const free = state.board.findIndex((c, i) => c === null && state.unlockedCells.includes(i));
      if (free === -1) { alert('Нет свободных ячеек!'); return; }
      if (!spendEnergy()) { alert('Не хватает энергии!'); return; }
      
      const id = getRandomItemId();
      const item = ALL_ITEMS.find(i => i.id === id);
      
      // === ПРАВИЛЬНЫЙ СЧЁТЧИК: +1 за создание ===
      if (!state.stats.spawns) state.stats.spawns = {};
      state.stats.spawns[id] = (state.stats.spawns[id] || 0) + 1;
      
      updateState({ stats: state.stats });
      updateTaskProgress('spawn', 1);
      updateTaskProgress('coins');
      
      const newBoard = [...state.board];
      newBoard[free] = item;
      updateState({ board: newBoard });
      
      playSound('click');
      onUpdate();
    });
  }
  
  // === КНОПКА БИТВЫ ===
  const battleBtn = document.getElementById('battle-btn');
  if (battleBtn) {
    battleBtn.addEventListener('click', () => {
      if (battleActive) {
        sendBattleMessage({ type: 'battle_surrender', battleId: currentBattleId });
        battleActive = false;
        updateBattleUI();
      } else {
        findBattle();
      }
    });
  }
  
  // === DRAG & DROP ===
  const gridEl = document.getElementById('grid');
  if (gridEl) initDragDrop(gridEl, handleMerge, handleMove);
  
  // === ПОДСКАЗКИ ДЛЯ ЗАМКОВ ===
  gridEl.addEventListener('click', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell || !cell.dataset.locked) return;
    const idx = parseInt(cell.dataset.idx);
    const req = CELL_REQUIREMENTS[idx];
    if (!req) return;
    const overlay = document.createElement('div'); overlay.className = 'overlay'; document.body.appendChild(overlay);
    const hint = document.createElement('div'); hint.className = 'unlock-hint';
    hint.innerHTML = `<h3>🔒 Ячейка #${idx}</h3><p>${req.text}</p><button onclick="this.closest('.unlock-hint')?.remove(); document.querySelector('.overlay')?.remove()">ПОНЯТНО</button>`;
    document.body.appendChild(hint);
  });
  
  // === ОЧИСТКА РЕКОРДОВ ===
  window.clearAllRecords = () => {
    if (confirm('Удалить все рекорды?')) { clearRecords(); onUpdate(); }
  };
  
  // Инфо панель (клик для раскрытия)
const infoPanel = document.getElementById('info-panel');
if (infoPanel) {
  infoPanel.addEventListener('click', () => {
    infoPanel.classList.toggle('open');
  });
}
  // === ТАЙМЕР ВРЕМЕНИ В ИГРЕ (обновление каждую минуту) ===
  setInterval(() => {
    updateStatsUI();
  }, 60000);
  
  console.log('✅ Игра загружена!');
  // ============= ТЕСТОВАЯ КНОПКА (СОЗДАНИЕ ВСЕЛЕННОЙ) =============
const debugBtn = document.getElementById('debug-universe-btn');
if (debugBtn) {
  debugBtn.addEventListener('click', () => {
    const state = getState();
    
    // Находим две свободные ячейки для Вселенной (14) и Сатоши (15)
    const freeCells = [];
    for (let i = 0; i < state.board.length; i++) {
      if (state.board[i] === null && state.unlockedCells.includes(i)) {
        freeCells.push(i);
      }
    }
    
    if (freeCells.length >= 2) {
      const universe = ALL_ITEMS.find(i => i.id === 14);
      const satoshi = ALL_ITEMS.find(i => i.id === 15);
      
      const newBoard = [...state.board];
      newBoard[freeCells[0]] = universe;
      newBoard[freeCells[1]] = satoshi;
      
      updateState({ board: newBoard });
      
      // Добавляем награду
      addXP(1100);
      updateState({
        coins: state.coins + 5000,
        energy: Math.min(state.energy + 200, MAX_ENERGY)
      });
      
      alert('🌌 ВСЕЛЕННАЯ И САТОШИ СОЗДАНЫ!\n+5000🪙 +200⚡ +1100XP');
      onUpdate();
    } else {
      alert('❌ Нет свободных ячеек! Продай или объедини предметы.');
    }
  });
}
});

window.getState = getState;
window.claimTaskReward = claimTaskReward;
window.claimAdventReward = claimAdventReward;