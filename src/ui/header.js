import { getState } from '../store.js';
import { MAX_ENERGY } from '../config.js';

const RANKS = [
  'НОВИЧОК', 'ХОДЛЕР', 'МАЙНЕР', 'СТЕЙКЕР', 'ТРЕЙДЕР',
  'ДЕГЕН', 'ДЕФИ-МАГ', 'NFT-ТЮЛЕНЬ', 'DAO-БОСС', 'ЛАМБОРГИНИСТ',
  'ИНСАЙДЕР', 'КИТ', 'БИТКОИН-МАКСИ', 'ЛУНАТИК', 'САТОШИ'
];

// Форматирование времени скоррана
function formatSpeedrunTime(ms) {
  if (!ms && ms !== 0) return '00:00.00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`;
}

// Глобальная переменная для интервала
let speedrunInterval = null;

// Запуск непрерывного обновления таймера
function startSpeedrunTimer() {
  if (speedrunInterval) clearInterval(speedrunInterval);
  speedrunInterval = setInterval(() => {
    const state = getState();
    if (state.speedrunStart) {
      updateSpeedrunDisplay();
    }
  }, 100); // Обновляем каждые 100мс для плавности
}

// Обновление только таймера
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
      const hintBox = document.querySelector('.hint-box');
      if (hintBox && hintBox.parentNode) {
        hintBox.parentNode.insertBefore(timerEl, hintBox.nextSibling);
      }
    }
    timerEl.innerHTML = `<span class="sr-icon">⏱️</span> <span class="sr-time">${timeStr}</span> <span class="sr-label">скорран</span>`;
    timerEl.style.display = 'flex';
  } else {
    if (timerEl) timerEl.style.display = 'none';
  }
}

export const updateHeader = () => {
  const state = getState();
  
  // Монеты
  const coinsEl = document.getElementById('coins-val');
  if (coinsEl) coinsEl.textContent = state.coins;
  
  // Уровень и ранг
  const levelEl = document.getElementById('level-val');
  const rankEl = document.getElementById('rank-val');
  if (levelEl) levelEl.textContent = state.level;
  const rankIndex = Math.min(state.level - 1, RANKS.length - 1);
  if (rankEl) rankEl.textContent = RANKS[rankIndex];
  
  // XP бар
  const xpFill = document.getElementById('xp-fill');
  if (xpFill) xpFill.style.width = ((state.xp / state.xpToNext) * 100) + '%';
  
  // Кнопка СОЗДАТЬ
  const createBtn = document.getElementById('create-btn');
  if (createBtn) {
    const hasFree = state.board.some((c, i) => c === null && state.unlockedCells.includes(i));
    createBtn.textContent = `СОЗДАТЬ ⚡ ${state.energy} / ${MAX_ENERGY}`;
    createBtn.disabled = state.energy < 2 || state.isGameOver || !hasFree;
  }
  
  // Обновляем таймер скоррана
  updateSpeedrunDisplay();
  
  // Вкладка уровня
  const lvlNum = document.getElementById('lvl-num');
  const lvlName = document.getElementById('lvl-name');
  const lvlXpFill = document.getElementById('lvl-xp-fill');
  const lvlXpText = document.getElementById('lvl-xp-text');
  if (lvlNum) lvlNum.textContent = state.level;
  if (lvlName) lvlName.textContent = RANKS[rankIndex];
  if (lvlXpFill) lvlXpFill.style.width = ((state.xp / state.xpToNext) * 100) + '%';
  if (lvlXpText) lvlXpText.textContent = `${state.xp} / ${state.xpToNext} XP`;
};

// Запускаем интервал при загрузке
startSpeedrunTimer();