const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { loadConfig, updateConfig } = require('./config');

/** @type {BrowserWindow | null} */
let mainWindow = null;
let mouseMonitorTimer = null;
let isMouseInsideWindow = false;

// 加载所有可用模块
function loadModules() {
  const modulesDir = path.join(__dirname, 'modules');
  const modules = {};
  
  if (fs.existsSync(modulesDir)) {
    const files = fs.readdirSync(modulesDir);
    files.forEach(file => {
      if (file.endsWith('.js')) {
        try {
          const modulePath = path.join(modulesDir, file);
          const module = require(modulePath);
          if (module && module.id) {
            modules[module.id] = module;
          }
        } catch (error) {
          console.error(`加载模块 ${file} 失败:`, error);
        }
      }
    });
  }
  
  return modules;
}

let availableModules = loadModules();

function createWindow() {
  const config = loadConfig();
  
  mainWindow = new BrowserWindow({
    width: config.windowBounds?.width || 480,
    height: config.windowBounds?.height || 800,
    x: config.windowBounds?.x,
    y: config.windowBounds?.y,
    minWidth: 360,
    minHeight: 640,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webviewTag: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // 保存窗口位置
  mainWindow.on('moved', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      updateConfig({ windowBounds: bounds });
    }
  });

  mainWindow.on('resized', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      updateConfig({ windowBounds: bounds });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  startMouseMonitor();
}

app.whenReady().then(() => {
  createWindow();

  // 注册全局快捷键
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    if (!mainWindow) {
      createWindow();
    } else {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 鼠标监控
function startMouseMonitor() {
  if (mouseMonitorTimer) {
    clearInterval(mouseMonitorTimer);
    mouseMonitorTimer = null;
  }

  mouseMonitorTimer = setInterval(() => {
    if (!mainWindow) return;

    const cursorPoint = screen.getCursorScreenPoint();
    const bounds = mainWindow.getBounds();

    const inside =
      cursorPoint.x >= bounds.x &&
      cursorPoint.x <= bounds.x + bounds.width &&
      cursorPoint.y >= bounds.y &&
      cursorPoint.y <= bounds.y + bounds.height;

    if (inside && !isMouseInsideWindow) {
      isMouseInsideWindow = true;
      mainWindow.show();
      mainWindow.focus();
    } else if (!inside && isMouseInsideWindow) {
      isMouseInsideWindow = false;
      mainWindow.hide();
    }
  }, 150);
}

app.on('before-quit', () => {
  if (mouseMonitorTimer) {
    clearInterval(mouseMonitorTimer);
    mouseMonitorTimer = null;
  }
});

// IPC 处理：窗口控制
ipcMain.on('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

// IPC 处理：模块管理
ipcMain.handle('get-available-modules', () => {
  return Object.values(availableModules).map(module => ({
    id: module.id,
    name: module.name,
    icon: module.icon,
    description: module.description
  }));
});

ipcMain.handle('get-current-module', () => {
  const config = loadConfig();
  return config.currentModule || 'douyin';
});

ipcMain.handle('set-current-module', (event, moduleId) => {
  updateConfig({ currentModule: moduleId });
  return true;
});

ipcMain.handle('load-module', (event, moduleId) => {
  const module = availableModules[moduleId];
  if (!module) {
    throw new Error(`模块 ${moduleId} 不存在`);
  }
  
  return {
    content: module.getContent(),
    initScript: module.getInitScript ? module.getInitScript() : '',
    destroyScript: module.getDestroyScript ? module.getDestroyScript() : ''
  };
});
