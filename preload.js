const { contextBridge, ipcRenderer } = require('electron');

// 暴露给网页使用的 API：窗口控制（拖动区域由 CSS 控制）
contextBridge.exposeInMainWorld('electronAPI', {
  closeWindow: () => ipcRenderer.send('window-close'),
  minimizeWindow: () => ipcRenderer.send('window-minimize')
});



