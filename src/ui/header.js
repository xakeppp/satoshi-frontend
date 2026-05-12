import { getState } from '../store.js';
import { MAX_ENERGY } from '../config.js';

const RANKS = [
  'НОВИЧОК', 'ХОДЛЕР', 'МАЙНЕР', 'СТЕЙКЕР', 'ТРЕЙДЕР',
  'ДЕГЕН', 'ДЕФИ-МАГ', 'NFT-ТЮЛЕНЬ', 'DAO-БОСС', 'ЛАМБОРГИНИСТ',
  'ИНСАЙДЕР', 'КИТ', 'БИТКОИН-МАКСИ', 'ЛУНАТИК', 'САТОШИ'
];

function formatSpeedrunTime(ms) {
  if (!ms && ms !== 0) return '00:00.00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`;
}

let speedrunInterval = null;

function startSpeedrunTimer() {
  if (speedrunInterval) clearInterval(speedrunInterval);
  speedrunInterval = setInterval(() => {
    const state = getState();
    if (state.speedrunStart) {
      updateSpeedrunDisplay();
    }
  }, 100);
}
// Обновление таймера адвента
// Обновление таймера адвента (в реальном времени)
function updateAdventTimer() {
  const timerEl = document.getElementById('advent-timer');
  if (!timerEl) return;
  
  const state = getState();
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartTime = todayStart.getTime();
  
  let nextBonusTime;
  if (state.lastAdventClaimTime && state.lastAdventClaimTime >= todayStartTime) {
    nextBonusTime = state.lastAdventClaimTime + 24 * 60 * 60 * 1000;
  } else {
    nextBonusTime = todayStartTime;
  }
  
  const diff = nextBonusTime - now;
  if (diff <= 0) {
    timerEl.textContent = '00:00:00';
    return;
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (3600000)) / (1000 * 60));
  const seconds = Math.floor((diff % 60000) / 1000);
  
  timerEl.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Запускаем интервал для таймера (каждую секунду)
setInterval(() => {
  updateAdventTimer();
}, 1000);
// Вызывай updateAdventTimer() в setInterval (каждую секунду)
function updateSpeedrunDisplay() {
  const state = getState();
  let timerEl = document.getElementById('speedrun-timer');
  
  if (state.speedrunStart) {
    const elapsed = Date.now() - state.speedrunStart;
    const timeStr = formatSpeedrunTime(elapsed);
    
    if (!timerEl) {
      timerEl = document.createElement('div');
      timerEl.id = 'speedrun-timer';
      timerEl.className = 'speedrun-timer-compact';
      // Вставляем после XP бара
      const xpBar = document.querySelector('.xp-bar');
      if (xpBar && xpBar.parentNode) {
        xpBar.parentNode.insertBefore(timerEl, xpBar.nextSibling);
      }
    }
    timerEl.innerHTML = `<span class="sr-icon">⏱️</span> <span class="sr-time">${timeStr}</span> <span class="sr-label">спидран</span>`;
    timerEl.style.display = 'flex';
  } else {
    if (timerEl) timerEl.style.display = 'none';
  }
}

export const updateHeader = () => {
  const state = getState();
  
  const coinsEl = document.getElementById('coins-val');
  if (coinsEl) coinsEl.textContent = state.coins;
  
  const levelEl = document.getElementById('level-val');
  const rankEl = document.getElementById('rank-val');
  if (levelEl) levelEl.textContent = state.level;
  const rankIndex = Math.min(state.level - 1, RANKS.length - 1);
  if (rankEl) rankEl.textContent = RANKS[rankIndex];
  
  const xpFill = document.getElementById('xp-fill');
  if (xpFill) xpFill.style.width = ((state.xp / state.xpToNext) * 100) + '%';
  
  const createBtn = document.getElementById('create-btn');
  if (createBtn) {
    const hasFree = state.board.some((c, i) => c === null && state.unlockedCells.includes(i));
    createBtn.textContent = `СОЗДАТЬ ⚡ ${state.energy} / ${MAX_ENERGY}`;
    createBtn.disabled = state.energy < 2 || state.isGameOver || !hasFree;
  }
  
  updateSpeedrunDisplay();
  
  const lvlNum = document.getElementById('lvl-num');
  const lvlName = document.getElementById('lvl-name');
  const lvlXpFill = document.getElementById('lvl-xp-fill');
  const lvlXpText = document.getElementById('lvl-xp-text');
  if (lvlNum) lvlNum.textContent = state.level;
  if (lvlName) lvlName.textContent = RANKS[rankIndex];
  if (lvlXpFill) lvlXpFill.style.width = ((state.xp / state.xpToNext) * 100) + '%';
  if (lvlXpText) lvlXpText.textContent = `${state.xp} / ${state.xpToNext} XP`;
};

startSpeedrunTimer();
