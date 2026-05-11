import { getState } from '../store.js';
import { LOCKED_START, CELL_REQUIREMENTS } from '../config.js';

export const renderGrid = () => {
  const gridEl = document.getElementById('grid');
  if (!gridEl) return;
  
  const state = getState();
  gridEl.innerHTML = '';
  
  state.board.forEach((item, idx) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.idx = idx;
    
    const isUnlocked = state.unlockedCells.includes(idx);
    
    if (idx >= LOCKED_START && !isUnlocked) {
      cell.classList.add('locked');
      cell.dataset.locked = 'true';
      const req = CELL_REQUIREMENTS[idx];
      if (req) cell.title = req.text;
    } else if (item) {
      const img = document.createElement('img');
      img.src = `/assets/${item.img}`;
      img.alt = item.name;
      img.draggable = false;
      img.onerror = () => {
        const ph = document.createElement('div');
        ph.className = 'img-placeholder';
        ph.textContent = item.name;
        img.replaceWith(ph);
      };
      cell.appendChild(img);
    }
    gridEl.appendChild(cell);
  });
};

export const triggerExplosion = (idx) => {
  const cell = document.querySelector(`.cell[data-idx="${idx}"]`);
  if (cell) {
    cell.classList.add('exploding');
    setTimeout(() => cell.classList.remove('exploding'), 500);
  }
};

export const showBonusSpawn = (idx, item) => {
  const cell = document.querySelector(`.cell[data-idx="${idx}"]`);
  if (cell) {
    cell.classList.add('bonus-spawn');
    setTimeout(() => cell.classList.remove('bonus-spawn'), 500);
  }
};