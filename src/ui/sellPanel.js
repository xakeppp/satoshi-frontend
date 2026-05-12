import { getState, updateState } from '../store.js';
import { MAX_ENERGY, SELL_REWARDS, ALL_ITEMS } from '../config.js';

let hideTimeout = null;

export const initSellPanel = () => {
  const panel = document.getElementById('sell-panel');
  const btn = document.getElementById('sell-btn');
  const hintBox = document.getElementById('hint-box');
  
  if (!panel || !btn) return;
  
  const hidePanel = () => {
    panel.style.display = 'none';
    if (hintBox) hintBox.style.display = 'flex';
    if (hideTimeout) clearTimeout(hideTimeout);
  };
  
  const showPanel = () => {
    panel.style.display = 'flex';
    if (hintBox) hintBox.style.display = 'none';
    if (hideTimeout) clearTimeout(hideTimeout);
    hideTimeout = setTimeout(hidePanel, 5000);
  };
  
  const closePanel = (e) => {
    if (!e.target.closest('#sell-panel') && !e.target.closest('.cell')) {
      hidePanel();
    }
  };
  
  document.addEventListener('click', closePanel);
  document.addEventListener('touchstart', closePanel);
  
  const openPanel = (e) => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    if (cell.classList.contains('locked')) return;
    if (cell.classList.contains('locked-by-battle')) return;
    
    const idx = parseInt(cell.dataset.idx);
    const item = getState().board[idx];
    if (!item) return;
    
    const sellImg = document.getElementById('sell-img');
    const sellName = document.getElementById('sell-name');
    const sellEnergy = document.getElementById('sell-energy');
    const sellNext = document.getElementById('sell-next');
    
    if (sellImg) {
      sellImg.src = '/assets/' + item.img;
      sellImg.alt = item.name;
    }
    if (sellName) sellName.textContent = item.name;
    
    let reward = SELL_REWARDS[item.id];
    if (!reward && SELL_REWARDS.default) reward = SELL_REWARDS.default(item.id);
    if (!reward) reward = Math.floor(item.id * 1.5);
    if (sellEnergy) sellEnergy.textContent = reward;
    
    if (sellNext) {
      const nextItem = ALL_ITEMS.find(i => i.id === item.id + 1);
      if (nextItem && item.id < 15 && item.id !== 14) {
        sellNext.innerHTML = '<span class="next-label">→</span>' +
          '<img src="/assets/' + nextItem.img + '" class="next-img" onerror="this.style.display=\'none\'">' +
          '<span class="next-name">' + nextItem.name + '</span>';
        sellNext.style.display = 'inline-flex';
      } else if (item.id === 14) {
        sellNext.innerHTML = '<span class="next-label">→</span><span class="next-name" style="color:#ffd700">🌌 САТОШИ</span>';
        sellNext.style.display = 'inline-flex';
      } else if (item.id >= 15) {
        sellNext.innerHTML = '<span class="next-label">💰</span><span class="next-name" style="color:#4ade80">+150</span>';
        sellNext.style.display = 'inline-flex';
      } else {
        sellNext.style.display = 'none';
      }
    }
    
    panel.dataset.idx = idx;
    showPanel();
    e.stopPropagation();
  };
  
  document.addEventListener('click', openPanel);
  document.addEventListener('touchstart', openPanel);
  
  const sellItem = (e) => {
    e.stopPropagation();
    const idx = parseInt(panel.dataset.idx);
    if (isNaN(idx)) return;
    const item = getState().board[idx];
    if (!item) return;
    
    let reward = SELL_REWARDS[item.id];
    if (!reward && SELL_REWARDS.default) reward = SELL_REWARDS.default(item.id);
    if (!reward) reward = Math.floor(item.id * 1.5);
    
    const state = getState();
    const newEnergy = Math.min(state.energy + reward, MAX_ENERGY);
    const newBoard = state.board.slice();
    newBoard[idx] = null;
    
    if (!state.stats.sells) state.stats.sells = 0;
    state.stats.sells += 1;
    
    updateState({ board: newBoard, energy: newEnergy, stats: state.stats });
    hidePanel();
    
    import('./grid.js').then(mod => mod.renderGrid());
    import('./header.js').then(mod => mod.updateHeader());
    
    const snd = new Audio('/assets/click.mp3');
    snd.volume = 0.3;
    snd.play().catch(() => {});
  };
  
  btn.addEventListener('click', sellItem);
  btn.addEventListener('touchstart', sellItem);
};