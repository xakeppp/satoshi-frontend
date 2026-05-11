// ============= TELEGRAM WEBAPP API =============
export const initTelegram = () => {
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#1E3A8A');
    tg.setBackgroundColor('#0F172A');
    tg.enableClosingConfirmation();
    return tg;
  }
  return null;
};

export const playHaptic = (type = 'light') => {
  if (window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
  }
};

export const getUserData = () => {
  return window.Telegram?.WebApp?.initDataUnsafe?.user || null;
};

export const getInitData = () => {
  return window.Telegram?.WebApp?.initData || '';
};

export const saveToCloud = async (key, value) => {
  return new Promise((resolve) => {
    if (!window.Telegram?.WebApp?.CloudStorage) {
      resolve(false);
      return;
    }
    window.Telegram.WebApp.CloudStorage.setItem(key, JSON.stringify(value), (err, stored) => {
      resolve(!err && stored);
    });
  });
};

export const loadFromCloud = async (key) => {
  return new Promise((resolve) => {
    if (!window.Telegram?.WebApp?.CloudStorage) {
      resolve(null);
      return;
    }
    window.Telegram.WebApp.CloudStorage.getItem(key, (err, val) => {
      if (err || !val) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(val));
      } catch {
        resolve(null);
      }
    });
  });
};