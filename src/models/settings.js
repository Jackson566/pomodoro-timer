const DEFAULTS = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  pomodorosBeforeLongBreak: 4,
  soundEnabled: true,
  soundVolume: 0.8
};

function getSettings(store) {
  return { ...DEFAULTS, ...(store.settings || {}) };
}

function saveSettings(store, newSettings) {
  store.settings = { ...DEFAULTS, ...newSettings };
  return store;
}

module.exports = { getSettings, saveSettings, DEFAULTS };
