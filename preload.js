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
  setPinState: (pinned) => ipcRenderer.invoke('set-pin-state', pinned),
  
  // 配置管理
  getAllConfig: () => ipcRenderer.invoke('get-all-config'),
  getConfig: (key) => ipcRenderer.invoke('get-config', key),
  setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),
  
  // 应用信息
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // 重新加载解锁配置
  reloadUnlockConfig: () => ipcRenderer.send('reload-unlock-config'),
  
  // 触发webview全屏
  triggerWebviewFullscreen: () => ipcRenderer.send('trigger-webview-fullscreen'),
  
  // 切换webview开发者工具
  toggleWebviewDevtools: () => ipcRenderer.send('toggle-webview-devtools')
});



