import { getState, updateState, addXP, stopSpeedrun, updateTaskProgress, startSpeedrun } from '../store.js';
import { ALL_ITEMS, MERGE_XP, MAX_ENERGY } from '../config.js';

// Глобальная переменная для таймера замены Сатоши
let satoshiTimer = null;

// Функция замены Сатоши на бонус
function replaceSatoshiWithBonus(satoshiIndex, board) {
  // Выбираем случайный бонус от 16 до 25
  const bonusId = Math.floor(Math.random() * 10) + 16; // 16-25
  const bonusItem = ALL_ITEMS.find(i => i.id === bonusId);
  
  if (!bonusItem) return;
  
  const newBoard = [...board];
  newBoard[satoshiIndex] = bonusItem;
  updateState({ board: newBoard });
  
  // Обновляем UI
  import('../ui/grid.js').then(mod => {
    if (mod.renderGrid) mod.renderGrid();
    if (mod.showBonusSpawn) mod.showBonusSpawn(satoshiIndex, bonusItem);
  });
  import('../ui/header.js').then(mod => mod.updateHeader());
  
  // Звук появления бонуса
  const snd = new Audio('/assets/merge.mp3');
  snd.volume = 0.3;
  snd.play().catch(() => {});
}

// Основное слияние
export const tryMerge = (src, tgt) => {
  const state = getState();
  if (state.isGameOver) return { success: false };

  const s = state.board[src];
  const t = state.board[tgt];
  if (!s || !t || s.id !== t.id) return { success: false };
  
  // Бонусные предметы 16-25 при слиянии дают награду и исчезают
  if (s.id >= 16) {
    const newBoard = [...state.board];
    newBoard[src] = null;
    newBoard[tgt] = null;
    return {
      success: true,
      newBoard,
      coinReward: 150,
      xpReward: 150,
      energyReward: 150,
      isBonusMerge: true
    };
  }
  
  // Запускаем таймер скоррана при первом мерже (только для предметов 1-14)
  if (!state.speedrunStart && s.id < 14) {
    startSpeedrun();
  }

  const nextId = s.id + 1;
  const nextItem = ALL_ITEMS.find(i => i.id === nextId);

  let coinReward = Math.min(100 * nextId, 1000);
  let xpReward = MERGE_XP[s.id] || 10;
  let energyReward = 0;

  // Если создали Вселенную (14) + 14 = 15 (Сатоши)
  if (s.id === 14 && nextId === 15) {
    coinReward = 5000;
    energyReward = 100;
    xpReward = 1500;
    
    // Останавливаем скорран
    const speedrunResult = stopSpeedrun();
    if (speedrunResult?.isBest) {
      coinReward += 500;
      xpReward += 200;
    }
  }

  const newBoard = [...state.board];
  newBoard[tgt] = nextItem;
  newBoard[src] = null;

  // Если создали Сатоши (15) — запускаем таймер на замену бонусом
  if (nextId === 15) {
    // Очищаем предыдущий таймер
    if (satoshiTimer) clearTimeout(satoshiTimer);
    
    // Запускаем звук фанфар
    const sndExplode = new Audio('/assets/explode.mp3');
    sndExplode.volume = 0.5;
    sndExplode.play().catch(() => {});
    
    // Показываем модальное окно
    showSatoshiModal();
    
    // Через 4 секунды заменяем Сатоши на бонус
    satoshiTimer = setTimeout(() => {
      const currentState = getState();
      const satoshiIndex = currentState.board.findIndex(item => item && item.id === 15);
      if (satoshiIndex !== -1) {
        replaceSatoshiWithBonus(satoshiIndex, currentState.board);
      }
      satoshiTimer = null;
    }, 4000);
  }

  return { 
    success: true, 
    nextId, 
    nextItem, 
    newBoard, 
    coinReward,
    xpReward,
    energyReward
  };
};

// Модальное окно для Сатоши
function showSatoshiModal(speedrunResult, coinReward, xpReward, energyReward) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  document.body.appendChild(overlay);
  
  const modal = document.createElement('div');
  modal.className = 'unlock-hint';
  modal.innerHTML = `
    <h3>🌌 САТОШИ НАКАМОТО</h3>
    <p>Поздравляю с созданием Вселенной!<br>
    +${coinReward || 5000} 🪙 +${energyReward || 100} ⚡ +${xpReward || 1500} XP</p>
    <button onclick="this.closest('.unlock-hint')?.remove(); document.querySelector('.overlay')?.remove()">ХОРОШО</button>
  `;
  document.body.appendChild(modal);
  
  setTimeout(() => {
    if (modal.parentNode) modal.remove();
    if (overlay.parentNode) overlay.remove();
  }, 4000);
}

// Бонусное слияние (для совместимости)
export const tryMergeBonus = (src, tgt) => {
  const state = getState();
  const s = state.board[src];
  const t = state.board[tgt];
  if (!s || !t || s.id !== t.id || s.id < 16) return { success: false };
  
  const newBoard = [...state.board];
  newBoard[src] = null;
  newBoard[tgt] = null;
  
  return {
    success: true,
    newBoard,
    coinReward: 150,
    xpReward: 150,
    energyReward: 150,
    isBonusMerge: true
  };
};

export const triggerGameOver = (playSound) => {
  console.log('GameOver deprecated');
};