import { ref } from 'vue';

export function useElectronAPI() {
  const electronAPI = window.electronAPI;

  if (!electronAPI) {
    console.error('electronAPI is not available');
    return null;
  }

  return {
    // 窗口控制
    closeWindow: () => electronAPI.closeWindow(),
    minimizeWindow: () => electronAPI.minimizeWindow(),

    // 模块管理
    getAvailableModules: () => electronAPI.getAvailableModules(),
    getCurrentModule: () => electronAPI.getCurrentModule(),
    setCurrentModule: (moduleId) => electronAPI.setCurrentModule(moduleId),
    loadModule: (moduleId) => electronAPI.loadModule(moduleId),

    // 固定窗口
    getPinState: () => electronAPI.getPinState(),
    setPinState: (pinned) => electronAPI.setPinState(pinned),

    // 配置管理
    getAllConfig: () => electronAPI.getAllConfig(),
    getConfig: (key) => electronAPI.getConfig(key),
    setConfig: (key, value) => electronAPI.setConfig(key, value),
    readConfigFile: () => electronAPI.readConfigFile(),
    getConfigFilePath: () => electronAPI.getConfigFilePath(),

    // 应用信息
    getAppVersion: () => electronAPI.getAppVersion(),
    checkForUpdates: () => electronAPI.checkForUpdates(),

    // 重新加载解锁配置
    reloadUnlockConfig: () => electronAPI.reloadUnlockConfig(),

    // 触发webview全屏
    triggerWebviewFullscreen: () => electronAPI.triggerWebviewFullscreen(),

    // 切换webview开发者工具
    toggleWebviewDevtools: () => electronAPI.toggleWebviewDevtools(),

    // 模块控制操作
    navigateWebview: (url) => electronAPI.navigateWebview(url),
    executeWebviewScript: (script) => electronAPI.executeWebviewScript(script),

    // 重启应用
    restartApp: () => electronAPI.restartApp()
  };
}

