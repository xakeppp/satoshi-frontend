import { getState, updateState } from '../store.js';

export const initDragDrop = (gridEl, onMerge, onMove) => {
  let drag = { active: false, sourceIdx: null, clone: null, startX: 0, startY: 0, moved: false };

  const onPointerDown = (e) => {
    if (drag.active) return;
    const state = getState();
    if (state.isGameOver) return;
    
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const idx = parseInt(cell.dataset.idx);
    const item = state.board[idx];
    
    // Нельзя перетаскивать заблокированные ячейки
    if (cell.classList.contains('locked-by-battle')) return;
    if (!item || !state.unlockedCells.includes(idx)) return;

    drag.active = true;
    drag.sourceIdx = idx;
    const touch = e.touches ? e.touches[0] : null;
    drag.startX = touch ? touch.clientX : e.clientX;
    drag.startY = touch ? touch.clientY : e.clientY;
    drag.moved = false;

    // Создаём клон картинки для перетаскивания
    const clone = document.createElement('img');
    clone.src = '/assets/' + item.img;
    clone.alt = item.name;
    clone.className = 'drag-clone';
    clone.style.left = drag.startX + 'px';
    clone.style.top = drag.startY + 'px';
    clone.style.display = 'block';
    clone.style.opacity = '0.9';
    clone.style.width = '60px';
    clone.style.height = '60px';
    clone.style.position = 'fixed';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '1000';
    clone.style.transform = 'translate(-50%, -50%) scale(1.1)';
    clone.style.borderRadius = '12px';
    clone.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
    document.body.appendChild(clone);
    drag.clone = clone;

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    
    // Легкий хаптик при начале перетаскивания
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
  };

  const onPointerMove = (e) => {
    if (!drag.active) return;
    const touch = e.touches ? e.touches[0] : null;
    const x = touch ? touch.clientX : e.clientX;
    const y = touch ? touch.clientY : e.clientY;
    const dist = Math.hypot(x - drag.startX, y - drag.startY);
    
    if (dist > 10 && !drag.moved) { 
      drag.moved = true; 
      if (drag.clone) drag.clone.style.display = 'block'; 
    }
    if (drag.moved && drag.clone) { 
      drag.clone.style.left = x + 'px'; 
      drag.clone.style.top = y + 'px'; 
    }
  };

  const onPointerUp = (e) => {
    if (!drag.active) return;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    
    if (!drag.moved) { 
      if (drag.clone) drag.clone.remove(); 
      drag = { active: false, sourceIdx: null, clone: null, startX: 0, startY: 0, moved: false }; 
      return; 
    }

    const touch = e.changedTouches ? e.changedTouches[0] : null;
    const x = touch ? touch.clientX : e.clientX;
    const y = touch ? touch.clientY : e.clientY;
    
    if (drag.clone) drag.clone.style.display = 'none';
    const el = document.elementFromPoint(x, y);
    if (drag.clone) drag.clone.style.display = '';
    
    const targetCell = el ? el.closest('.cell') : null;
    let merged = false;
    
    if (targetCell && drag.sourceIdx !== null) {
      const targetIdx = parseInt(targetCell.dataset.idx);
      const state = getState();
      if (state.unlockedCells.includes(targetIdx) && targetIdx !== drag.sourceIdx) {
        if (!targetCell.classList.contains('locked-by-battle')) {
          merged = onMerge(drag.sourceIdx, targetIdx);
        }
      }
    }
    
    if (!merged && drag.sourceIdx !== null) {
      onMove(drag.sourceIdx);
    }
    
    if (drag.clone) drag.clone.remove();
    drag = { active: false, sourceIdx: null, clone: null, startX: 0, startY: 0, moved: false };
  };

  gridEl.addEventListener('pointerdown', onPointerDown);
};