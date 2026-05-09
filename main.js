const { app, BrowserWindow, ipcMain, Tray, Menu, Notification, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const STORE_PATH = path.join(__dirname, 'data', 'store.json');
const DEFAULT_STORE = {
  settings: {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    pomodorosBeforeLongBreak: 4,
    soundEnabled: true,
    soundVolume: 0.8
  },
  stats: {},
  currentSession: { label: '', phase: 'work', pomodorosCompleted: 0 }
};

let mainWindow = null;
let tray = null;

function loadStore() {
  try {
    const data = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_STORE));
  }
}

function saveStore(data) {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = STORE_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, STORE_PATH);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 560,
    resizable: false,
    icon: path.join(__dirname, 'assets', 'icons', 'icon.png'),
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

  const logFile = path.join(__dirname, 'data', 'renderer.log');
  mainWindow.webContents.on('console-message', (_event, level, message) => {
    const prefix = ['LOG', 'WARN', 'ERROR', ''][level] || 'LOG';
    fs.appendFileSync(logFile, `[${prefix}] ${message}\n`);
  });

  mainWindow.on('close', (e) => {
    if (process.platform === 'darwin') {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icons', 'tray-icon.png');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
  } catch {
    trayIcon = nativeImage.createEmpty();
  }
  tray = new Tray(trayIcon);
  tray.setToolTip('Pomodoro Timer');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Window', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
  ]);
  tray.setContextMenu(contextMenu);
  tray.on('click', () => { mainWindow.show(); mainWindow.focus(); });
}

// IPC handlers
ipcMain.handle('get-store', () => loadStore());
ipcMain.handle('save-store', (_event, data) => saveStore(data));

ipcMain.handle('set-badge', (_event, text) => {
  if (process.platform === 'darwin') {
    app.dock.setBadge(text || '');
  }
  if (tray) {
    tray.setTitle(text || '');
  }
});

ipcMain.handle('notify', (_event, title, body) => {
  if (Notification.isSupported()) {
    new Notification({ title, body, icon: path.join(__dirname, 'assets', 'icons', 'icon.png') }).show();
  }
});

// Single instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    createTray();
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow) mainWindow.show();
});

app.on('before-quit', () => {
  app.isQuitting = true;
});
