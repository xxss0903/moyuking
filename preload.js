const { contextBridge, ipcRenderer } = require('electron');

// TextDecoder 解码函数（优先使用原生 API）
// 如果 TextDecoder 不支持 GBK，则回退到 iconv-lite
let iconvLite = null;
try {
  iconvLite = require('iconv-lite');
} catch (e) {
  console.warn('[Preload] iconv-lite not available');
}

const iconv = (text) => {
  try {
    // 方法1: 尝试使用 TextDecoder（原生 API）
    try {
      const decoder = new TextDecoder('gbk');
      return decoder.decode(text);
    } catch (textDecoderError) {
      // TextDecoder 不支持 GBK，使用备用方案
      if (iconvLite) {
        return iconvLite.decode(text, 'gbk');
      }
      throw new Error('Neither TextDecoder nor iconv-lite available');
    }
  } catch (error) {
    console.error('[Preload] GBK decode error:', error.message);
    // 如果都失败，尝试直接转换为字符串
    if (text instanceof Buffer) {
      return text.toString('utf-8');
    }
    return String(text);
  }
};

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
  readConfigFile: () => ipcRenderer.invoke('read-config-file'),
  getConfigFilePath: () => ipcRenderer.invoke('get-config-file-path'),
  
  // 应用信息
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // 重新加载解锁配置
  reloadUnlockConfig: () => ipcRenderer.send('reload-unlock-config'),
  
  // 触发webview全屏
  triggerWebviewFullscreen: () => ipcRenderer.send('trigger-webview-fullscreen'),
  
  // 切换webview开发者工具
  toggleWebviewDevtools: () => ipcRenderer.send('toggle-webview-devtools'),
  
  // 模块控制操作
  navigateWebview: (url) => ipcRenderer.send('navigate-webview', url),
  executeWebviewScript: (script) => ipcRenderer.invoke('execute-webview-script', script),

  // 重启应用
  restartApp: () => ipcRenderer.send('restart-app'),

  // 本地小说：打开 / 重新读取本地小说文件（可指定编码和已选路径）
  // options: { encoding?: 'utf-8' | 'gbk', filePath?: string }
  openLocalNovelFile: (options) => ipcRenderer.invoke('open-local-novel-file', options),
  
  // 摸鱼系统：获取摸鱼数据
  getMoyuData: () => ipcRenderer.invoke('get-moyu-data'),
  
  // 设置窗口忽略鼠标事件（用于pet窗口点击穿透）
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.invoke('set-ignore-mouse-events', ignore, options)
});

// 全局事件：转发主进程的窗口状态事件到渲染进程（作为自定义事件）
ipcRenderer.on('app-hidden', () => {
  try {
    window.dispatchEvent(new CustomEvent('app-hidden'));
  } catch (e) {
    console.log('[Preload] Failed to dispatch app-hidden event:', e.message);
  }
});

ipcRenderer.on('app-shown', () => {
  try {
    window.dispatchEvent(new CustomEvent('app-shown'));
  } catch (e) {
    console.log('[Preload] Failed to dispatch app-shown event:', e.message);
  }
});

// 监听打开设置的消息
ipcRenderer.on('open-settings', () => {
  try {
    window.dispatchEvent(new CustomEvent('open-settings'));
  } catch (e) {
    console.log('[Preload] Failed to dispatch open-settings event:', e.message);
  }
});

// 监听摸鱼数据更新事件（用于pet窗口）
ipcRenderer.on('moyu-data-updated', (event, data) => {
  try {
    window.dispatchEvent(new CustomEvent('moyu-data-updated', { detail: data }));
  } catch (e) {
    console.log('[Preload] Failed to dispatch moyu-data-updated event:', e.message);
  }
});

// 暴露 iconv 服务到 window.services
window.services = {
  iconv: (text) => {
    return iconv(text);
  }
};
