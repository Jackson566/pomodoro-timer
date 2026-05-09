function formatDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function recordPomodoro(store, label, duration) {
  const now = new Date();
  const dateKey = formatDate(now);
  if (!store.stats) store.stats = {};
  if (!store.stats[dateKey]) store.stats[dateKey] = [];

  store.stats[dateKey].push({
    startTime: now.toISOString(),
    endTime: new Date(now.getTime()).toISOString(),
    label: label || '',
    duration: duration
  });

  return store;
}

function getTodayStats(store) {
  const dateKey = formatDate(new Date());
  return (store.stats && store.stats[dateKey]) || [];
}

function getTotalPomodoros(store) {
  if (!store.stats) return 0;
  return Object.values(store.stats).reduce((sum, day) => sum + day.length, 0);
}

function getLast7Days(store) {
  const result = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = formatDate(d);
    const count = (store.stats && store.stats[key]) ? store.stats[key].length : 0;
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    result.push({
      date: key,
      label: weekdays[d.getDay()],
      count
    });
  }
  return result;
}

module.exports = { recordPomodoro, getTodayStats, getTotalPomodoros, getLast7Days, formatDate };
