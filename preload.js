const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  parseFile: (payload) => ipcRenderer.invoke('parse-file', payload),
  openDialog: () => ipcRenderer.invoke('open-dialog'),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
});
