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
    
    if (cell.classList.contains('locked-by-battle')) return;
    if (!item || !state.unlockedCells.includes(idx)) return;

    drag.active = true;
    drag.sourceIdx = idx;
    const touch = e.touches ? e.touches[0] : null;
    drag.startX = touch ? touch.clientX : e.clientX;
    drag.startY = touch ? touch.clientY : e.clientY;
    drag.moved = false;

    // СОЗДАЁМ КЛОН (НО ЛЁГКИЙ)
    const clone = document.createElement('img');
    clone.src = '/assets/' + item.img;
    clone.alt = item.name;
    clone.className = 'drag-clone';
    
    // ЛЁГКИЕ CSS-свойства (без box-shadow, без filter)
    clone.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 9999;
      width: 60px;
      height: 60px;
      left: ${drag.startX - 30}px;
      top: ${drag.startY - 30}px;
      opacity: 0.85;
      transform: scale(1.05);
      transition: none;
      will-change: left, top;
      border-radius: 12px;
    `;
    
    document.body.appendChild(clone);
    drag.clone = clone;

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // Лёгкий хаптик
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
  };

  const onTouchMove = (e) => {
    if (!drag.active) return;
    e.preventDefault();
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    const dist = Math.hypot(x - drag.startX, y - drag.startY);
    
    if (dist > 10 && !drag.moved) {
      drag.moved = true;
    }
    if (drag.moved && drag.clone) {
      drag.clone.style.left = (x - 30) + 'px';
      drag.clone.style.top = (y - 30) + 'px';
    }
  };

  const onMouseMove = (e) => {
    if (!drag.active) return;
    const x = e.clientX;
    const y = e.clientY;
    const dist = Math.hypot(x - drag.startX, y - drag.startY);
    
    if (dist > 10 && !drag.moved) {
      drag.moved = true;
    }
    if (drag.moved && drag.clone) {
      drag.clone.style.left = (x - 30) + 'px';
      drag.clone.style.top = (y - 30) + 'px';
    }
  };

  const onTouchEnd = (e) => {
    if (!drag.active) return;
    e.preventDefault();
    finishDrag(e.changedTouches[0]);
  };

  const onMouseUp = (e) => {
    if (!drag.active) return;
    finishDrag(e);
  };

  const finishDrag = (point) => {
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    
    if (!drag.moved) {
      if (drag.clone) drag.clone.remove();
      drag = { active: false, sourceIdx: null, clone: null, startX: 0, startY: 0, moved: false };
      return;
    }

    const x = point.clientX;
    const y = point.clientY;
    
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

  gridEl.addEventListener('touchstart', onPointerDown, { passive: false });
  gridEl.addEventListener('mousedown', onPointerDown);
};
