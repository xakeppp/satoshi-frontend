// ============= КОНФИГУРАЦИЯ ИГРЫ =============

// Энергия
export const MAX_ENERGY = 5000;
export const START_ENERGY = 100;
export const SPAWN_COST = 2;
export const REGEN_AMOUNT = 2;
export const REGEN_INTERVAL = 60;

// Блокировка ячеек
export const LOCKED_START = 20;

// Опыт за слияние
export const MERGE_XP = {
  1: 10, 2: 20, 3: 35, 4: 55, 5: 80,
  6: 110, 7: 150, 8: 200, 9: 270, 10: 360,
  11: 480, 12: 640, 13: 850, 14: 1100, 15: 1500
};

// Требования к ячейкам
export const CELL_REQUIREMENTS = {
  20: { type: 'merge', id: 4, count: 1, text: 'Объедини 2 Видяхи' },
  21: { type: 'merge', id: 8, count: 3, text: 'Объедини 6 Дата центров' },
  22: { type: 'merge', id: 6, count: 1, text: 'Объедини 2 Мощных ПеКа' },
  23: { type: 'level', level: 15, text: 'Достигни 15 уровня' },
  24: { type: 'merge', id: 12, count: 2, text: 'Объедини 4 Сейлоров' }
};

// Ежедневные задания
export const DAILY_TASKS = [
  { id: 1, name: 'Объедини 10 предметов', target: 10, rewards: { coins: 50, energy: 30, xp: 20 }, type: 'merge' },
  { id: 2, name: 'Создай 20 предметов', target: 20, rewards: { coins: 80, energy: 50, xp: 30 }, type: 'spawn' },
  { id: 3, name: 'Продай 10 предметов', target: 10, rewards: { coins: 40, energy: 60, xp: 10 }, type: 'sell' },
  { id: 4, name: 'Достигни 5 уровня', target: 5, rewards: { coins: 150, energy: 80, xp: 100 }, type: 'level' },
  { id: 5, name: 'Пригласи 3 друзей', target: 3, rewards: { coins: 500, energy: 200, xp: 100 }, type: 'invite' }
];

// Адвент награды
export const ADVENT_REWARDS = [
  { day: 1, type: 'energy', amount: 100, icon: '⚡', name: '+100 Энергии' },
  { day: 2, type: 'item', id: 13, count: 2, icon: '🧠', name: '2 Виталика' },
  { day: 3, type: 'xp', amount: 1000, icon: '⭐', name: '+1000 XP' },
  { day: 4, type: 'all', coins: 1000, energy: 1000, xp: 1000, icon: '🎁', name: '+1000 всего' },
  { day: 5, type: 'bonus_item', icon: '🎲', name: 'Случайный бонус (15-25)' },
  { day: 6, type: 'item', id: 14, count: 3, icon: '🌌', name: '3 Вселенных' },
  { day: 7, type: 'special', icon: '₿', name: 'Биткойн' }
];

// Награды за продажу
export const SELL_REWARDS = {
  1: 150,
  2: 2,
  3: 3,
  4: 5,
  default: (id) => Math.floor(id * 1.5)
};

// Основные предметы 1-14
export const ITEMS = [
  { id: 1, img: '1.jpg', name: 'Еденица' },
  { id: 2, img: '2.jpg', name: 'Чирик' },
  { id: 3, img: '3.jpg', name: 'Озу-шка' },
  { id: 4, img: '4.jpg', name: 'Видяха' },
  { id: 5, img: '5.jpg', name: 'Комп' },
  { id: 6, img: '6.jpg', name: 'Мощный ПеК' },
  { id: 7, img: '7.jpg', name: 'Сервак' },
  { id: 8, img: '8.jpg', name: 'Дата центр' },
  { id: 9, img: '9.jpg', name: 'Элмо Муск' },
  { id: 10, img: '10.jpg', name: 'Масколёт' },
  { id: 11, img: '11.jpg', name: 'BTC за 50' },
  { id: 12, img: '12.jpg', name: 'Криптоикона' },
  { id: 13, img: '13.jpg', name: 'Виталька' },
  { id: 14, img: '14.jpg', name: 'Вселенная' }
];

// Бонусные предметы 15-25
export const BONUS_ITEMS = [
  { id: 15, img: '15.jpg', name: 'Сатоши' },
  { id: 16, img: '16.jpg', name: 'Doge' },
  { id: 17, img: '17.jpg', name: 'Pepeгушка' },
  { id: 18, img: '18.jpg', name: 'Шиба хоба' },
  { id: 19, img: '19.jpg', name: 'BONK' }, 
  { id: 20, img: '20.jpg', name: 'Пам парарам' },
  { id: 21, img: '21.jpg', name: 'Дуров верни стену' },
  { id: 22, img: '22.jpg', name: 'Цифровое золото' },
  { id: 23, img: '23.jpg', name: 'кЭфирчик' },
  { id: 24, img: '24.jpg', name: 'Солнечная' },
{ id: 25, img: '25.jpg', name: 'Хриплый' }
];

// Все предметы
export const ALL_ITEMS = [...ITEMS, ...BONUS_ITEMS];

// Шансы выпадения (Илон Маск и Сейлор — чаще)
export const getRandomItemId = () => {
  const roll = Math.random() * 100;
  
  // БИТКОЙН (редкий)
  if (roll < 0.5) return 11;       // 0.5% Биткойн
  
  // ИЛОН МАСК + СЕЙЛОР (повышенный шанс)
  if (roll < 2) return 9;          // 2% Илон Маск (было 2%)
  if (roll < 3.5) return 12;       // 2% Сейлор (БЫЛО 0.15%!)
  if (roll < 5) return 13;         // 1% Виталик
  
  // ВСЕЛЕННАЯ (очень редко)
  if (roll < 5.2) return 14;       // 0.2% Вселенная
  
  // РАКЕТА
  if (roll < 8) return 10;         // 2.8% Ракета
  
  // ДАТА ЦЕНТР
  if (roll < 12) return 8;         // 4% Дата центр
  
  // СЕРВАК
  if (roll < 17) return 7;         // 5% Сервак
  
  // МОЩНЫЙ ПК
  if (roll < 23) return 6;         // 6% Мощный ПК
  
  // СИСТЕМНИК
  if (roll < 31) return 5;         // 8% Системник
  
  // ВИДЯХА
  if (roll < 42) return 4;         // 11% Видяха
  
  // ОЗУ-ШКА
  if (roll < 55) return 3;         // 13% Озу-шка
  
  // ЧИРИК
  if (roll < 72) return 2;         // 17% Чирик
  
  // ЕДЕНИЦА
  return 1;                         // 28% Еденица
};
