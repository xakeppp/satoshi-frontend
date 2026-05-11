import { getState, updateState } from '../store.js';
import { MAX_ENERGY, REGEN_AMOUNT, REGEN_INTERVAL, SPAWN_COST } from '../config.js';

let regenInterval = null;

export const startRegenTimer = (onUpdate) => {
  if (regenInterval) clearInterval(regenInterval);
  
  regenInterval = setInterval(() => {
    const state = getState();
    if (state.energy < MAX_ENERGY) {
      const newEnergy = Math.min(state.energy + REGEN_AMOUNT, MAX_ENERGY);
      updateState({ energy: newEnergy });
      if (onUpdate) onUpdate();
    }
  }, REGEN_INTERVAL * 1000);
};

export const spendEnergy = () => {
  const state = getState();
  if (state.energy < SPAWN_COST) return false;
  updateState({ energy: state.energy - SPAWN_COST });
  return true;
};