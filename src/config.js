// ============= КОНФИГУРАЦИЯ ИГРЫ =============

// Энергия
export const MAX_ENERGY = 5000;
export const START_ENERGY = 500;
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
  { type: 'energy', amount: 50, icon: '⚡', name: '+50 Энергии' },
  { type: 'item', id: 3, icon: '🧠', name: 'Озу-шка' },
  { type: 'xp', amount: 200, icon: '⭐', name: '+200 XP' },
  { type: 'energy', amount: 100, icon: '⚡', name: '+100 Энергии' },
  { type: 'item', id: 7, icon: '🚀', name: 'Сервак' },
  { type: 'xp', amount: 500, icon: '⭐', name: '+500 XP' },
  { type: 'item', id: 11, icon: '₿', name: 'Биткойн' }
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
  { id: 5, img: '5.jpg', name: 'Системник' },
  { id: 6, img: '6.jpg', name: 'Мощный ПеК' },
  { id: 7, img: '7.jpg', name: 'Сервак' },
  { id: 8, img: '8.jpg', name: 'Дата центра' },
  { id: 9, img: '9.jpg', name: 'Илон МУСК' },
  { id: 10, img: '10.jpg', name: 'РАКЕЕЕЕЕЕЕЕЕЕЕЕта' },
  { id: 11, img: '11.jpg', name: 'Биткойн по полтинику' },
  { id: 12, img: '12.jpg', name: 'Сейлор чертяка' },
  { id: 13, img: '13.jpg', name: 'Виталька родненький' },
  { id: 14, img: '14.jpg', name: 'Вселенная' }
];

// Бонусные предметы 15-25
export const BONUS_ITEMS = [
  { id: 15, img: '15.jpg', name: 'Сатоши Накамото' },
  { id: 16, img: '16.jpg', name: 'Собачка Doge' },
  { id: 17, img: '17.jpg', name: 'Pepeгушка' },
  { id: 18, img: '18.jpg', name: 'Шиба хоба' },
  { id: 19, img: '19.jpg', name: 'По головке BONK' }, 
  { id: 20, img: '20.jpg', name: 'Пам парарам' },
  { id: 21, img: '21.jpg', name: 'Дуров верни стену' },
  { id: 22, img: '22.jpg', name: 'Цифровое золото' },
  { id: 23, img: '23.jpg', name: 'кЭфирчик' },
  { id: 24, img: '24.jpg', name: 'Солнечная собачка' },
{ id: 25, img: '25.jpg', name: 'Хриплый' }
];

// Все предметы
export const ALL_ITEMS = [...ITEMS, ...BONUS_ITEMS];

// Шансы выпадения (Биткойн редко, палка редко)
export const getRandomItemId = () => {
  const roll = Math.random() * 100;
  if (roll < 1) return 11;      // 0.5% Биткойн
  if (roll < 2) return 10;        // 1.5% Ракета
  if (roll < 5) return 9;         // 3% Илон Маск
  if (roll < 9) return 8;         // 4% Дата центр
  if (roll < 14) return 7;        // 5% Сервак
  if (roll < 20) return 6;        // 6% Мощный ПК
  if (roll < 28) return 5;        // 8% Системник
  if (roll < 38) return 4;        // 10% Видяха
  if (roll < 50) return 3;        // 12% Озу-шка
  if (roll < 65) return 2;        // 15% Чирик
  return 1;                        // 35% Еденица
};