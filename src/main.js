import { getState, updateState, resetGame, addXP, loadProgress, claimTaskReward, claimAdventReward, updateTaskProgress, getRecords, startSpeedrun, stopSpeedrun, getPlayerId } from './store.js';
import { ALL_ITEMS, LOCKED_START, MERGE_XP, CELL_REQUIREMENTS, ADVENT_REWARDS, MAX_ENERGY, SPAWN_COST, getRandomItemId } from './config.js';
import { t, loadLanguage, updateTexts } from './i18n.js';
import { initTelegram, playHaptic } from './api/telegram.js';
import { connectBattleWebSocket, sendBattleMessage, getPlayerName, getOnlinePlayers, getTotalStats, savePlayerStats } from './api/leaderboardApi.js';
import { initDragDrop } from './logic/dragdrop.js';
import { tryMerge, tryMergeBonus } from './logic/merge.js';
import { startRegenTimer, spendEnergy } from './logic/energy.js';
import { renderGrid } from './ui/grid.js';
import { updateHeader } from './ui/header.js';
import { initSellPanel } from './ui/sellPanel.js';

let battleActive = false;
let currentBattleId = null;
let opponentName = '';
let opponentId = '';
let opponentMerges = 0;
let myMergesInBattle = 0;

function formatTimeForDisplay(ms) {
  if (!ms || ms === 0) return '00:00.00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`;
}

function formatTimeShort(seconds) {
  if (seconds < 60) return `${seconds} сек`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин ${seconds % 60} сек`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ч ${Math.floor((seconds % 3600) / 60)} мин`;
  return `${Math.floor(seconds / 86400)} д ${Math.floor((seconds % 86400) / 3600)} ч`;
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

async function updateStatsUI() {
  const state = getState();
  const onlinePlayers = await getOnlinePlayers();
  const myMerges = state.stats.merges || 0;
  const mySpawns = Object.values(state.stats.spawns || {}).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
  const mySells = state.stats.sells || 0;
  const myTime = Math.floor((Date.now() - (state.stats.sessionStartTime || Date.now())) / 1000) + (state.stats.totalPlayTime || 0);
  
  const mergesEl = document.getElementById('total-merges-all');
  if (mergesEl) mergesEl.textContent = myMerges;
  const spawnsEl = document.getElementById('total-spawns-all');
  if (spawnsEl) spawnsEl.textContent = mySpawns;
  const sellsEl = document.getElementById('total-sells-all');
  if (sellsEl) sellsEl.textContent = mySells;
  const timeEl = document.getElementById('total-time-all');
  if (timeEl) timeEl.textContent = formatTimeShort(myTime);
  
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
  const onlineCountEl = document.getElementById('online-count');
  if (onlineCountEl) onlineCountEl.textContent = onlinePlayers?.length || 1;
}

async function updateLeaderboardUI() {
  const list = document.querySelector('.leaderboard-list');
  if (!list) return;
  const records = getRecords();
  const sortedRecords = [...records].sort((a, b) => (a.time || 999999) - (b.time || 999999)).slice(0, 10);
  const bestEl = document.getElementById('lb-best');
  if (bestEl && sortedRecords.length > 0) {
    bestEl.textContent = `🏆 Лучший: ${formatTimeForDisplay(sortedRecords[0].time)}`;
  } else if (bestEl) {
    bestEl.textContent = '🏆 Лучший: --:--';
  }
  if (sortedRecords.length === 0) {
    list.innerHTML = '<div class="leaderboard-empty">🎯 Создай Вселенную!</div>';
    return;
  }
  const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const myName = tg?.username || tg?.first_name || 'Игрок';
  list.innerHTML = sortedRecords.map((rec, i) => {
    const isMe = rec.playerName === myName;
    return `
      <div class="leaderboard-item ${i === 0 ? 'first' : i === 1 ? 'second' : i === 2 ? 'third' : ''} ${isMe ? 'current-player' : ''}">
        <div class="lb-rank">${i + 1}</div>
        <div class="lb-name">${isMe ? '👤 ' : ''}${rec.playerName || 'Игрок'}</div>
        <div class="lb-time">${formatTimeForDisplay(rec.time)}</div>
        <div class="lb-stats">📦${rec.level || 0}</div>
      </div>
    `;
  }).join('');
}

function updateTasksUI() {
  const list = document.querySelector('.task-list');
  if (!list) return;
  const state = getState();
  list.innerHTML = state.tasks.map(task => {
    const r = task.rewards || {};
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
        updateTasksUI();
        updateHeader();
        updateStatsUI();
      }
    });
  });
}

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
      if (status) { status.innerHTML = '⏳ Поиск соперника...'; status.classList.add('active'); }
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
  if (status) { status.innerHTML = '🔍 Поиск соперника...'; status.classList.add('active'); }
  sendBattleMessage({ type: 'join', playerId: getPlayerId(), playerName: getPlayerName() });
}

function handleMerge(src, tgt) {
  const state = getState();
  const s = state.board[src];
  const t = state.board[tgt];
  if (!s || !t) return false;
  if (!state.stats.mergedItems) state.stats.mergedItems = {};
  state.stats.mergedItems[s.id] = (state.stats.mergedItems[s.id] || 0) + 1;
  state.stats.merges = (state.stats.merges || 0) + 1;
  updateState({ stats: state.stats });
  updateTaskProgress('merge', 1);
  updateTaskProgress('merge_id', 1, s.id);
  let result = tryMerge(src, tgt);
  if (!result.success && s.id >= 16) result = tryMergeBonus(src, tgt);
  if (result.success) {
    const sndMerge = new Audio('/assets/merge.mp3');
    sndMerge.volume = 0.3;
    sndMerge.play().catch(() => {});
    playHaptic('medium');
    if (result.isBonusMerge) {
      const newEnergy = Math.min(state.energy + (result.energyReward || 0), MAX_ENERGY);
      updateState({ board: result.newBoard, coins: state.coins + (result.coinReward || 0), energy: newEnergy, stats: state.stats });
      addXP(result.xpReward || 0);
    } else {
      addXP(result.xpReward || 0);
      const energyBonus = result.energyReward || 0;
      const newEnergy = energyBonus > 0 ? Math.min(state.energy + energyBonus, MAX_ENERGY) : state.energy;
      updateState({ board: result.newBoard, coins: state.coins + result.coinReward, energy: newEnergy, stats: state.stats });
    }
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

function onUpdate() {
  renderGrid();
  updateHeader();
  updateTasksUI();
  updateAdventUI();
  updateLeaderboardUI();
  updateStatsUI();
  updateTexts();
}

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
  onUpdate();
  
  // Правила в верхней панели
  const rulesHeader = document.getElementById('rules-inline');
  if (rulesHeader) {
    rulesHeader.addEventListener('click', () => {
      const overlay = document.createElement('div'); overlay.className = 'overlay'; document.body.appendChild(overlay);
      const modal = document.createElement('div'); modal.className = 'unlock-hint';
      modal.innerHTML = `
        <h3>📖 ПРАВИЛА ИГРЫ</h3>
        <p>🔹 <strong>ИГРА:</strong> объединяй одинаковые предметы.<br>
        🔹 <strong>ЦЕЛЬ:</strong> собрать ВСЕЛЕННУЮ (уровень 14).<br>
        🔹 <strong>НАГРАДЫ:</strong> монеты, энергия, XP.<br>
        🔹 <strong>⚔️ БИТВА:</strong> PvP режим — кто быстрее соберёт Вселенную.<br>
        🔹 <strong>📅 АДВЕНТ:</strong> ежедневные бонусы.<br>
        🔹 <strong>🏆 РЕКОРДЫ:</strong> лучшее время создания Вселенной.</p>
        <button onclick="this.closest('.unlock-hint')?.remove(); document.querySelector('.overlay')?.remove()">ХОРОШО</button>
      `;
      document.body.appendChild(modal);
    });
  }
  
  // Табы
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
      if (tab === 'stats') updateStatsUI();
      if (tab === 'leaderboard') updateLeaderboardUI();
    });
  });
  
  // Кнопка СОЗДАТЬ
  const createBtn = document.getElementById('create-btn');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      const state = getState();
      const free = state.board.findIndex((c, i) => c === null && state.unlockedCells.includes(i));
      if (free === -1) { alert('Нет свободных ячеек!'); return; }
      if (!spendEnergy()) { alert('Не хватает энергии!'); return; }
      const id = getRandomItemId();
      const item = ALL_ITEMS.find(i => i.id === id);
      if (!state.stats.spawns) state.stats.spawns = {};
      state.stats.spawns[id] = (state.stats.spawns[id] || 0) + 1;
      updateState({ stats: state.stats });
      updateTaskProgress('spawn', 1);
      const newBoard = [...state.board];
      newBoard[free] = item;
      updateState({ board: newBoard });
      const snd = new Audio('/assets/click.mp3');
      snd.volume = 0.3;
      snd.play().catch(() => {});
      onUpdate();
    });
  }
  
  // Кнопка БИТВЫ
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
  
  // ТЕСТОВАЯ КНОПКА (только для localhost)
  const debugBtn = document.getElementById('debug-universe-btn');
  if (debugBtn && window.location.hostname === 'localhost') {
    debugBtn.style.display = 'block';
    debugBtn.addEventListener('click', () => {
      const state = getState();
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
        addXP(1100);
        updateState({ coins: state.coins + 5000, energy: Math.min(state.energy + 200, MAX_ENERGY) });
        alert('🌌 ВСЕЛЕННАЯ И САТОШИ СОЗДАНЫ!\n+5000🪙 +200⚡ +1100XP');
        onUpdate();
      } else {
        alert('❌ Нужно 2 свободные ячейки!');
      }
    });
  }
  
  // Drag & Drop
  const gridEl = document.getElementById('grid');
  if (gridEl) initDragDrop(gridEl, handleMerge, handleMove);
  
  // Подсказки для замков
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
  
  setInterval(() => updateStatsUI(), 60000);
  console.log('✅ Игра загружена!');
});