const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getStore: () => ipcRenderer.invoke('get-store'),
  saveStore: (data) => ipcRenderer.invoke('save-store', data),
  setBadge: (text) => ipcRenderer.invoke('set-badge', text),
  notify: (title, body) => ipcRenderer.invoke('notify', { title, body })
});
