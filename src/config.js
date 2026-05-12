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

// ЕЖЕВНАЯ ЗАДАНИЯ (20 штук)
export const DAILY_TASKS = [
  // Базовые задания
  { id: 1, name: 'Объедини 10 предметов', target: 10, rewards: { coins: 50, energy: 30, xp: 20 }, type: 'merge' },
  { id: 2, name: 'Создай 20 предметов', target: 20, rewards: { coins: 80, energy: 50, xp: 30 }, type: 'spawn' },
  { id: 3, name: 'Продай 10 предметов', target: 10, rewards: { coins: 40, energy: 60, xp: 10 }, type: 'sell' },
  { id: 4, name: 'Достигни 5 уровня', target: 5, rewards: { coins: 150, energy: 80, xp: 100 }, type: 'level' },
  { id: 5, name: 'Пригласи 3 друзей', target: 3, rewards: { coins: 500, energy: 200, xp: 100 }, type: 'invite' },
  { id: 6, name: 'Объедини 2 Видяхи', target: 1, rewards: { coins: 200, energy: 50, xp: 60 }, type: 'merge_id', targetId: 4 },
  { id: 7, name: 'Забери ежедневный бонус', target: 1, rewards: { coins: 100, energy: 100, xp: 50 }, type: 'daily_claim' },
  { id: 8, name: 'Собери 1000 монет', target: 1000, rewards: { coins: 200, energy: 100, xp: 50 }, type: 'coins' },
  { id: 9, name: 'Создай Ракету (уровень 10)', target: 1, rewards: { coins: 500, energy: 200, xp: 200 }, type: 'merge_id', targetId: 10 },
  { id: 10, name: 'Разблокируй все ячейки', target: 5, rewards: { coins: 1000, energy: 500, xp: 500 }, type: 'unlock' },
  
  // НОВЫЕ 10 ЗАДАНИЙ
  { id: 11, name: 'Создай 3 Ракеты', target: 3, rewards: { coins: 500, energy: 150, xp: 200 }, type: 'merge_id', targetId: 10 },
  { id: 12, name: 'Собери 10000 монет', target: 10000, rewards: { coins: 1000, energy: 300, xp: 500 }, type: 'coins' },
  { id: 13, name: 'Объедини 100 предметов', target: 100, rewards: { coins: 500, energy: 200, xp: 300 }, type: 'merge' },
  { id: 14, name: 'Продай 50 предметов', target: 50, rewards: { coins: 300, energy: 100, xp: 150 }, type: 'sell' },
  { id: 15, name: 'Создай 100 предметов', target: 100, rewards: { coins: 400, energy: 150, xp: 200 }, type: 'spawn' },
  { id: 16, name: 'Достигни 20 уровня', target: 20, rewards: { coins: 2000, energy: 500, xp: 1000 }, type: 'level' },
  { id: 17, name: 'Объедини 2 Сатоши', target: 1, rewards: { coins: 1000, energy: 300, xp: 500 }, type: 'merge_id', targetId: 15 },
  { id: 18, name: 'Создай 5 Видяк', target: 5, rewards: { coins: 200, energy: 80, xp: 100 }, type: 'merge_id', targetId: 4 },
  { id: 19, name: 'Создай 3 Сервака', target: 3, rewards: { coins: 400, energy: 150, xp: 200 }, type: 'merge_id', targetId: 7 },
  { id: 20, name: 'Создай Биткойн (уровень 11)', target: 1, rewards: { coins: 2000, energy: 500, xp: 1000 }, type: 'merge_id', targetId: 11 }
];

// Адвент награды
export const ADVENT_REWARDS = [
  { day: 1, type: 'energy', amount: 100, icon: '⚡', name: '+100 Энергии' },
  { day: 2, type: 'item', id: 13, count: 2, icon: '🧠', name: '2 Виталика' },
  { day: 3, type: 'xp', amount: 1000, icon: '⭐', name: '+1000 XP' },
  { day: 4, type: 'all', coins: 1000, energy: 1000, xp: 1000, icon: '🎁', name: '+1000 всего' },
  { day: 5, type: 'bonus_item', icon: '🎲', name: 'Случайный бонус' },
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
  { id: 5, img: '5.jpg', name: 'Системник' },
  { id: 6, img: '6.jpg', name: 'Мощный ПеК' },
  { id: 7, img: '7.jpg', name: 'Сервак' },
  { id: 8, img: '8.jpg', name: 'Дата центра' },
  { id: 9, img: '9.jpg', name: 'Илон МУСК' },
  { id: 10, img: '10.jpg', name: 'РАКЕТА' },
  { id: 11, img: '11.jpg', name: 'Биткойн' },
  { id: 12, img: '12.jpg', name: 'Сейлор' },
  { id: 13, img: '13.jpg', name: 'Виталик' },
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

// Шансы выпадения (твоя версия)
export const getRandomItemId = () => {
  const roll = Math.random() * 100;
  
  if (roll < 0.5) return 11;
  if (roll < 2) return 9;
  if (roll < 3.5) return 12;
  if (roll < 5) return 13;
  if (roll < 5.2) return 14;
  if (roll < 8) return 10;
  if (roll < 12) return 8;
  if (roll < 17) return 7;
  if (roll < 23) return 6;
  if (roll < 31) return 5;
  if (roll < 42) return 4;
  if (roll < 55) return 3;
  if (roll < 72) return 2;
  return 1;
};