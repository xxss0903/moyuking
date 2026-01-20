const { contextBridge, ipcRenderer } = require('electron');

// 暴露给网页使用的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  closeWindow: () => ipcRenderer.send('window-close'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  
  // 模块管理
  getAvailableModules: () => ipcRenderer.invoke('get-available-modules'),
  getCurrentModule: () => ipcRenderer.invoke('get-current-module'),
  setCurrentModule: (moduleId) => ipcRenderer.invoke('set-current-module', moduleId),
  loadModule: (moduleId) => ipcRenderer.invoke('load-module', moduleId),
  
  // 固定窗口
  getPinState: () => ipcRenderer.invoke('get-pin-state'),
  setPinState: (pinned) => ipcRenderer.invoke('set-pin-state', pinned)
});



