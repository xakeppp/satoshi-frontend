import { getState, updateState } from '../store.js';
import { MAX_ENERGY, SELL_REWARDS, ALL_ITEMS } from '../config.js';

export const initSellPanel = () => {
  const panel = document.getElementById('sell-panel');
  const btn = document.getElementById('sell-btn');
  
  if (!panel || !btn) return;
  
  // Функция обновления UI после продажи
  const refreshUI = () => {
    // Обновляем сетку
    const gridEl = document.getElementById('grid');
    if (gridEl) {
      import('./grid.js').then(mod => {
        if (mod.renderGrid) mod.renderGrid();
      });
    }
    // Обновляем шапку
    import('./header.js').then(mod => {
      if (mod.updateHeader) mod.updateHeader();
    });
  };
  
  // Закрытие панели при клике вне
  document.addEventListener('click', function(e) {
    if (!e.target.closest('#sell-panel') && !e.target.closest('.cell')) {
      panel.style.display = 'none';
    }
  });
  
  // Открытие панели при клике на ячейку
  document.addEventListener('click', function(e) {
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
    
    // Миниатюра следующего предмета
    if (sellNext) {
      const nextItem = ALL_ITEMS.find(function(i) { return i.id === item.id + 1; });
      
      if (nextItem && item.id < 15 && item.id !== 14) {
        sellNext.innerHTML = '<div class="next-label">ДАЁТ:</div>' +
          '<img src="/assets/' + nextItem.img + '" class="next-img" onerror="this.style.display=\'none\'" alt="' + nextItem.name + '">' +
          '<span class="next-name">' + nextItem.name + '</span>';
        sellNext.style.display = 'flex';
      } else if (item.id === 14) {
        sellNext.innerHTML = '<div class="next-label">ДАЁТ:</div>' +
          '<span class="next-name" style="color:#ffd700">🌌 САТОШИ + БОНУС!</span>';
        sellNext.style.display = 'flex';
      } else if (item.id >= 15) {
        sellNext.innerHTML = '<div class="next-label">БОНУС:</div>' +
          '<span class="next-name" style="color:#4ade80">+150 🪙⚡XP при слиянии</span>';
        sellNext.style.display = 'flex';
      } else {
        sellNext.style.display = 'none';
      }
    }
    
    panel.dataset.idx = idx;
    panel.style.display = 'flex';
  });
  
  // Продажа предмета
  if (btn) {
    btn.addEventListener('click', function() {
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
      
      // Обновляем статистику продаж
      if (!state.stats.sells) state.stats.sells = 0;
      state.stats.sells += 1;
      
      updateState({
        board: newBoard,
        energy: newEnergy,
        stats: state.stats
      });
      
      // Закрываем панель
      panel.style.display = 'none';
      
      // Обновляем UI
      refreshUI();
      
      // Звук
      var snd = new Audio('/assets/click.mp3');
      snd.volume = 0.3;
      snd.play().catch(function() {});
    });
  }
};