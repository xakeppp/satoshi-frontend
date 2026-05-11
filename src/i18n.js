// ============= ЛОКАЛИЗАЦИЯ =============
const translations = {
  ru: {
    appName: 'ПУТЬ САТОШИ',
    league: 'УЧАСТНИК ЛИГИ САТОШИ',
    hint: 'СОЕДИНЯЙ ЖЕЛЕЗО И СТРОЙ ИМПЕРИЮ!',
    create: 'СОЗДАТЬ',
    sell: 'ПРОДАТЬ',
    energy: 'Энергия',
    level: 'УРОВЕНЬ',
    tasks: 'ЗАДАНИЯ',
    advent: 'АДВЕНТ',
    coins: 'Монеты',
    rank: 'Ранг',
    cell: 'Ячейка',
    gotit: 'ПОНЯТНО',
    noFreeCells: 'Нет свободных ячеек! Продай или объедини предметы.',
    received: 'Получено',
    alreadyClaimed: 'Уже получено сегодня!',
    game: 'ИГРА'
  },
  en: {
    appName: 'SATOSHI PATH',
    league: 'SATOSHI LEAGUE MEMBER',
    hint: 'MERGE ITEMS & BUILD EMPIRE!',
    create: 'CREATE',
    sell: 'SELL',
    energy: 'Energy',
    level: 'LEVEL',
    tasks: 'QUESTS',
    advent: 'ADVENT',
    coins: 'Coins',
    rank: 'Rank',
    cell: 'Cell',
    gotit: 'GOT IT',
    noFreeCells: 'No free cells! Sell or merge items first.',
    received: 'Received',
    alreadyClaimed: 'Already claimed today!',
    game: 'GAME'
  }
};

let currentLang = 'ru';

export const initI18n = () => {
  if (window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code) {
    const tgLang = window.Telegram.WebApp.initDataUnsafe.user.language_code;
    if (translations[tgLang]) {
      currentLang = tgLang;
      return currentLang;
    }
  }
  const browserLang = navigator.language.slice(0, 2);
  if (translations[browserLang]) {
    currentLang = browserLang;
    return currentLang;
  }
  return currentLang;
};

export const t = (key) => {
  return translations[currentLang]?.[key] || translations.ru[key] || key;
};

export const setLanguage = (lang) => {
  if (translations[lang]) {
    currentLang = lang;
    localStorage.setItem('satoshi_lang', lang);
    return true;
  }
  return false;
};

export const loadLanguage = () => {
  const saved = localStorage.getItem('satoshi_lang');
  if (saved && translations[saved]) {
    currentLang = saved;
    return currentLang;
  }
  return initI18n();
};

export const updateTexts = () => {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);
    if (translation) el.textContent = translation;
  });
};