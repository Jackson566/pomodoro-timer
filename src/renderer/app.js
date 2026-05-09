const _fs = require('fs');
const _logFile = require('path').join(require('os').homedir(), 'pomodoro-debug.log');
function _log(msg) { _fs.appendFileSync(_logFile, msg + '\n'); }
_log('=== app.js starting ===');

let ipcRenderer, pathModule;
try {
  ipcRenderer = require('electron').ipcRenderer;
  pathModule = require('path');
  _log('electron loaded OK');
} catch(e) {
  _log('FAILED to load electron: ' + e.message);
}

let Timer, statsModule, settingsModule, formatModule;
try {
  Timer = require('../models/timer');
  statsModule = require('../models/stats');
  settingsModule = require('../models/settings');
  formatModule = require('../utils/format');
  _log('local modules loaded OK');
} catch(e) {
  _log('FAILED to load local modules: ' + e.message);
}

const { recordPomodoro, getTodayStats, getTotalPomodoros, getLast7Days } = statsModule || {};
const { getSettings, saveSettings } = settingsModule || {};
const { formatTime, formatHour } = formatModule || {};

const CIRCUMFERENCE = 2 * Math.PI * 88;

let store = {};
let timer = null;
let bellAudio = null;

const $ = (sel) => document.querySelector(sel);

async function init() {
  _log('init() called');
  try {
    store = await ipcRenderer.invoke('get-store');
    _log('store loaded OK');
  } catch(e) {
    _log('FAILED to load store: ' + e.message);
    return;
  }

  const settings = getSettings(store);
  timer = new Timer(settings);

  const soundPath = pathModule.join(__dirname, '..', '..', 'assets', 'sounds', 'bell.wav');
  _log('sound path: ' + soundPath);
  bellAudio = new Audio(soundPath);
  bellAudio.volume = settings.soundVolume;

  timer.onTick = handleTick;
  timer.onComplete = handleComplete;

  updateDisplay(timer.remainingSeconds, timer.totalPhaseSeconds);
  updatePhaseLabel();
  updateDots();
  initSettingsForm(settings);
  loadStats();
  initTabs();
  initControls();
  _log('init() done');
}

function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      tab.classList.add('active');
      $(`#${tab.dataset.view}-view`).classList.add('active');
      if (tab.dataset.view === 'stats') loadStats();
    });
  });
}

function initControls() {
  btnStart.addEventListener('click', () => {
    console.log('start clicked');
    timer.start();
    btnStart.style.display = 'none';
    btnPause.style.display = 'inline-block';
  });

  btnPause.addEventListener('click', () => {
    timer.pause();
    btnStart.style.display = 'inline-block';
    btnPause.style.display = 'none';
  });

  btnReset.addEventListener('click', () => {
    timer.reset();
    btnStart.style.display = 'inline-block';
    btnPause.style.display = 'none';
    updateDisplay(timer.remainingSeconds, timer.totalPhaseSeconds);
    updatePhaseLabel();
    updateDots();
    ipcRenderer.invoke('set-badge', '');
  });
}

function handleTick(remaining, total) {
  updateDisplay(remaining, total);
  const timeStr = formatTime(remaining);
  ipcRenderer.invoke('set-badge', timeStr);
  document.title = `${timeStr} - ${timer.phaseLabel}`;
}

async function handleComplete(phase) {
  const settings = getSettings(store);

  if (phase === 'work') {
    const label = taskInput.value.trim();
    store = recordPomodoro(store, label, settings.workDuration);
    await ipcRenderer.invoke('save-store', store);
  }

  if (settings.soundEnabled) playSound();

  const msg = phase === 'work' ? '番茄完成！休息一下' : '休息结束，继续加油！';
  ipcRenderer.invoke('notify', 'Pomodoro Timer', msg);

  updatePhaseLabel();
  updateDisplay(timer.remainingSeconds, timer.totalPhaseSeconds);
  updateDots();

  btnStart.style.display = 'inline-block';
  btnPause.style.display = 'none';
}

function playSound() {
  if (!bellAudio) return;
  bellAudio.currentTime = 0;
  bellAudio.play().catch(() => {});
}

function updateDisplay(remaining, total) {
  timerDisplay.textContent = formatTime(remaining);
  const progress = total > 0 ? remaining / total : 1;
  const offset = CIRCUMFERENCE * (1 - progress);
  ringProgress.style.strokeDashoffset = offset;
}

function updatePhaseLabel() {
  phaseLabel.textContent = timer.phaseLabel;
  const colors = { work: 'var(--accent)', shortBreak: '#3498db', longBreak: '#9b59b6' };
  ringProgress.style.stroke = colors[timer.phase] || 'var(--accent)';
}

function updateDots() {
  const total = timer.pomodorosBeforeLongBreak;
  const done = timer.pomodorosInSet;
  const container = $('#progress-dots');
  container.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('span');
    dot.className = 'dot' + (i < done ? ' completed' : '');
    container.appendChild(dot);
  }
}

function loadStats() {
  const today = getTodayStats(store);
  const total = getTotalPomodoros(store);

  $('#today-count').textContent = today.length;
  $('#total-count').textContent = total;

  const days = getLast7Days(store);
  const maxCount = Math.max(1, ...days.map(d => d.count));
  const chart = $('#bar-chart');
  chart.innerHTML = '';
  days.forEach(day => {
    const item = document.createElement('div');
    item.className = 'bar-item';
    const count = document.createElement('span');
    count.className = 'bar-count';
    count.textContent = day.count || '';
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = day.count > 0 ? `${(day.count / maxCount) * 100}%` : '4px';
    const label = document.createElement('span');
    label.className = 'bar-label';
    label.textContent = day.label;
    item.appendChild(count);
    item.appendChild(bar);
    item.appendChild(label);
    chart.appendChild(item);
  });

  const list = $('#today-list');
  list.innerHTML = '';
  if (today.length === 0) {
    list.innerHTML = '<li class="empty">暂无记录</li>';
  } else {
    today.forEach(record => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = record.label || '未命名';
      const time = document.createElement('span');
      time.textContent = formatHour(record.startTime);
      li.appendChild(name);
      li.appendChild(time);
      list.appendChild(li);
    });
  }
}

function initSettingsForm(settings) {
  $('#set-work').value = settings.workDuration;
  $('#set-short').value = settings.shortBreakDuration;
  $('#set-long').value = settings.longBreakDuration;
  $('#set-before-long').value = settings.pomodorosBeforeLongBreak;
  $('#set-sound').checked = settings.soundEnabled;
  $('#sound-status').textContent = settings.soundEnabled ? '开启' : '关闭';
  $('#set-volume').value = Math.round(settings.soundVolume * 100);

  $('#set-sound').addEventListener('change', (e) => {
    $('#sound-status').textContent = e.target.checked ? '开启' : '关闭';
  });

  $('#btn-save-settings').addEventListener('click', async () => {
    const newSettings = {
      workDuration: parseInt($('#set-work').value) || 25,
      shortBreakDuration: parseInt($('#set-short').value) || 5,
      longBreakDuration: parseInt($('#set-long').value) || 15,
      pomodorosBeforeLongBreak: parseInt($('#set-before-long').value) || 4,
      soundEnabled: $('#set-sound').checked,
      soundVolume: parseInt($('#set-volume').value) / 100
    };

    store = saveSettings(store, newSettings);
    await ipcRenderer.invoke('save-store', store);

    timer.updateSettings(newSettings);
    bellAudio.volume = newSettings.soundVolume;

    if (timer.state === 'idle') {
      updateDisplay(timer.remainingSeconds, timer.totalPhaseSeconds);
      updateDots();
    }

    const msg = $('#save-msg');
    msg.textContent = '已保存';
    setTimeout(() => { msg.textContent = ''; }, 2000);
  });
}

// These are safe at script bottom since HTML elements exist before <script>
const phaseLabel = $('#phase-label');
const timerDisplay = $('#timer-display');
const ringProgress = $('#ring-progress');
const btnStart = $('#btn-start');
const btnPause = $('#btn-pause');
const btnReset = $('#btn-reset');
const taskInput = $('#task-label');

ringProgress.style.strokeDasharray = CIRCUMFERENCE;
ringProgress.style.strokeDashoffset = 0;

document.addEventListener('DOMContentLoaded', init);
