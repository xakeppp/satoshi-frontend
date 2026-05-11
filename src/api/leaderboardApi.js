// ============= ГИБРИДНАЯ СТАТИСТИКА (ЛОКАЛЬНО + ГЛОБАЛЬНО) =============

let cachedPlayerId = null;
let battleWs = null;
let battleCallbacks = {};

// Конфигурация сервера (потом заменишь на свой URL)
const SERVER_URL = 'http://localhost:5000';
const WS_URL = 'ws://localhost:5000';
let serverAvailable = false;

export const checkServer = async () => {
  try {
    const response = await fetch(`${SERVER_URL}/health`, { signal: AbortSignal.timeout(2000) });
    serverAvailable = response.ok;
    console.log(serverAvailable ? '✅ Сервер доступен' : '❌ Сервер недоступен, работаем локально');
    return serverAvailable;
  } catch(e) { serverAvailable = false; console.log('❌ Сервер недоступен'); return false; }
};

// Локальное хранилище статистики
const getLocalStats = () => {
  const stats = localStorage.getItem('satoshi_local_stats');
  return stats ? JSON.parse(stats) : { total_merges: 0, total_spawns: 0, total_sells: 0, total_time_seconds: 0 };
};
const saveLocalStats = (stats) => localStorage.setItem('satoshi_local_stats', JSON.stringify(stats));

export const getPlayerId = () => {
  if (cachedPlayerId) return cachedPlayerId;
  if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
    cachedPlayerId = String(window.Telegram.WebApp.initDataUnsafe.user.id);
    return cachedPlayerId;
  }
  let id = localStorage.getItem('player_id');
  if (!id) { id = 'player_' + Math.random().toString(36).substr(2, 9); localStorage.setItem('player_id', id); }
  cachedPlayerId = id;
  return id;
};

export const getPlayerName = () => {
  const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (tg?.username) return tg.username;
  if (tg?.first_name) return tg.first_name;
  let name = localStorage.getItem('player_name');
  if (!name) { name = 'Игрок_' + Math.floor(Math.random() * 1000); localStorage.setItem('player_name', name); }
  return name;
};

// Сохранение статистики
export const savePlayerStats = async (stats) => {
  const localStats = getLocalStats();
  if (stats.totalMerges) localStats.total_merges += stats.totalMerges;
  if (stats.totalSpawns) localStats.total_spawns += stats.totalSpawns;
  if (stats.totalSells) localStats.total_sells += stats.totalSells;
  if (stats.totalTime) localStats.total_time_seconds += stats.totalTime;
  saveLocalStats(localStats);
  
  if (serverAvailable) {
    try {
      await fetch(`${SERVER_URL}/api/player`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: getPlayerId(), username: getPlayerName(), ...stats })
      });
    } catch(e) { console.log('Сервер не ответил'); }
  }
  return { success: true };
};

// Получение статистики для вкладки
export const getTotalStats = async () => {
  const localStats = getLocalStats();
  if (serverAvailable) {
    try {
      const response = await fetch(`${SERVER_URL}/api/total-stats`);
      const serverStats = await response.json();
      return { total_merges: localStats.total_merges + (serverStats.total_merges || 0), total_spawns: localStats.total_spawns + (serverStats.total_spawns || 0), total_sells: localStats.total_sells + (serverStats.total_sells || 0), total_time_seconds: localStats.total_time_seconds + (serverStats.total_time_seconds || 0) };
    } catch(e) {}
  }
  return localStats;
};

export const getGlobalLeaderboard = async () => {
  const records = JSON.parse(localStorage.getItem('satoshi_records') || '[]');
  const localStats = getLocalStats();
  if (serverAvailable) {
    try {
      const response = await fetch(`${SERVER_URL}/api/leaderboard`);
      const serverRecords = await response.json();
      if (serverRecords.length) return serverRecords.slice(0, 10);
    } catch(e) {}
  }
  return records.slice(0, 10).map((rec, i) => ({ username: getPlayerName(), best_speedrun: rec.time, total_merges: localStats.total_merges, rank: i + 1 }));
};

export const getOnlineStats = async () => {
  if (serverAvailable) {
    try { const res = await fetch(`${SERVER_URL}/api/online-stats`); return await res.json(); } catch(e) {}
  }
  return { online: 1 };
};

export const getOnlinePlayers = async () => {
  if (serverAvailable) {
    try { const res = await fetch(`${SERVER_URL}/api/online-players`); return await res.json(); } catch(e) {}
  }
  return [{ username: getPlayerName(), total_merges: getLocalStats().total_merges }];
};

export const addSpeedrunRecord = async (timeMs) => {
  const records = JSON.parse(localStorage.getItem('satoshi_records') || '[]');
  records.push({ time: timeMs, date: new Date().toISOString(), displayTime: formatTimeMs(timeMs) });
  records.sort((a, b) => a.time - b.time);
  localStorage.setItem('satoshi_records', JSON.stringify(records.slice(0, 50)));
  if (serverAvailable) {
    try { await fetch(`${SERVER_URL}/api/record`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: getPlayerId(), playerName: getPlayerName(), timeMs }) }); } catch(e) {}
  }
};

// ============= БИТВА (WebSocket) =============
export const connectBattleWebSocket = (onMessage) => {
  battleCallbacks.onMessage = onMessage;
  if (serverAvailable) {
    battleWs = new WebSocket(WS_URL);
    battleWs.onopen = () => battleWs.send(JSON.stringify({ type: 'join', playerId: getPlayerId(), playerName: getPlayerName() }));
    battleWs.onmessage = (event) => { const data = JSON.parse(event.data); if (battleCallbacks.onMessage) battleCallbacks.onMessage(data); };
    battleWs.onclose = () => { serverAvailable = false; console.log('🔌 WebSocket отключён'); };
    return battleWs;
  }
  return null;
};

export const sendBattleMessage = (message) => {
  if (battleWs?.readyState === WebSocket.OPEN) battleWs.send(JSON.stringify(message));
};

export const disconnectBattle = () => { if (battleWs) { battleWs.close(); battleWs = null; } };

function formatTimeMs(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const ms2 = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms2).padStart(2, '0')}`;
}

checkServer();