const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (...args) => ipcRenderer.invoke(...args),
  on: (...args) => ipcRenderer.on(...args)
}); 