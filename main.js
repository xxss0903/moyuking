const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { loadConfig, updateConfig } = require('./config');

// 设置控制台输出编码为 UTF-8（解决中文乱码问题）
if (process.platform === 'win32') {
  try {
    // Windows 系统设置控制台编码
    process.stdout.setDefaultEncoding('utf8');
    process.stderr.setDefaultEncoding('utf8');
  } catch (e) {
    // 忽略设置失败
  }
}

/** @type {BrowserWindow | null} */
let mainWindow = null;
let overlayWindow = null; // 透明覆盖窗口，用于监听鼠标中键
let mouseMonitorTimer = null;
let isMouseInsideWindow = false;

// 鼠标中键长按检测
let middleButtonPressed = false;
let middleButtonPressTime = null;
let middleButtonPressTimer = null;
let MIDDLE_BUTTON_HOLD_TIME = 1000; // 从配置文件加载

// 窗口固定状态（从配置文件加载）
let isWindowPinned = false;

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
          console.error(`[Module Load] Failed to load module ${file}:`, error);
        }
      }
    });
  }
  
  return modules;
}

let availableModules = loadModules();

function createWindow() {
  const config = loadConfig();
  
  // 从配置文件加载所有设置
  isWindowPinned = config.isWindowPinned || false;
  MIDDLE_BUTTON_HOLD_TIME = config.middleButtonHoldTime || 1000;
  console.log(`[Config] Window pinned state loaded: ${isWindowPinned}`);
  console.log(`[Config] Middle button hold time loaded: ${MIDDLE_BUTTON_HOLD_TIME}ms`);
  
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
    // 关闭覆盖窗口
    if (overlayWindow) {
      overlayWindow.close();
    }
  });

  // 从配置文件读取启动显示设置
  const showOnStartup = config.showWindowOnStartup !== false; // 默认 true
  const displayDuration = config.startupDisplayDuration || 3000;
  
  if (showOnStartup) {
    // 启动时先显示窗口，方便用户看到窗口位置，然后隐藏
    mainWindow.show();
    mainWindow.focus();
    console.log(`[Window] Window shown for ${displayDuration}ms to indicate position`);
    console.log(`[Window] Window will hide automatically after ${displayDuration}ms`);
    
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.hide();
        console.log(`[Window] Window hidden, ready for middle button unlock`);
      }
      // 创建透明覆盖窗口用于监听鼠标中键
      createOverlayWindow();
    }, displayDuration);
  } else {
    // 不显示启动窗口，直接隐藏
    mainWindow.hide();
    console.log(`[Window] Window hidden on startup (showWindowOnStartup: false)`);
    createOverlayWindow();
  }

  startMouseMonitor();
}

// 创建透明覆盖窗口，用于监听鼠标中键事件
function createOverlayWindow() {
  if (!mainWindow) return;

  const bounds = mainWindow.getBounds();
  
  overlayWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, 'overlay-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  // 加载一个简单的 HTML 页面来监听鼠标事件
  overlayWindow.loadURL(`data:text/html;charset=utf-8,
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          background: transparent;
          cursor: default;
        }
      </style>
    </head>
    <body></body>
    </html>
  `);

  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  // 覆盖窗口跟随主窗口位置
  mainWindow.on('moved', () => {
    if (mainWindow && overlayWindow) {
      const bounds = mainWindow.getBounds();
      overlayWindow.setBounds(bounds);
    }
  });

  mainWindow.on('resized', () => {
    if (mainWindow && overlayWindow) {
      const bounds = mainWindow.getBounds();
      overlayWindow.setBounds(bounds);
    }
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // 注册全局快捷键：手动显示/隐藏主窗口（绕过手势，用于自用调试）
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    if (!mainWindow) {
      createWindow();
      return;
    }

    if (mainWindow.isVisible()) {
      mainWindow.hide();
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


// 鼠标监控：检测鼠标是否在窗口区域内
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
      // 鼠标刚进入应用所在矩形区域
      isMouseInsideWindow = true;
      console.log(`\n[Mouse Monitor] ========== Mouse Entered Window Area ==========`);
      console.log(`[Mouse Monitor] Window position: (${bounds.x}, ${bounds.y})`);
      console.log(`[Mouse Monitor] Window size: ${bounds.width} x ${bounds.height}`);
      console.log(`[Mouse Monitor] Mouse position: (${cursorPoint.x}, ${cursorPoint.y})`);
      console.log(`[Mouse Monitor] Ready for middle button press and hold`);
      console.log(`[Mouse Monitor] ================================================\n`);
      
      // 确保覆盖窗口可见且可以接收鼠标事件
      if (overlayWindow) {
        overlayWindow.setIgnoreMouseEvents(false);
        overlayWindow.show();
      }
    } else if (!inside && isMouseInsideWindow) {
      // 鼠标离开应用矩形区域
      isMouseInsideWindow = false;
      console.log(`\n[Mouse Monitor] ========== Mouse Left Window Area ==========`);
      console.log(`[Mouse Monitor] Mouse position: (${cursorPoint.x}, ${cursorPoint.y})`);
      console.log(`[Mouse Monitor] Window pinned: ${isWindowPinned}`);
      
      // 重置中键状态
      if (middleButtonPressTimer) {
        clearTimeout(middleButtonPressTimer);
        middleButtonPressTimer = null;
      }
      middleButtonPressed = false;
      middleButtonPressTime = null;
      
      // 如果窗口未固定，则隐藏窗口
      if (!isWindowPinned) {
        console.log(`[Mouse Monitor] Hiding window (not pinned)`);
        if (mainWindow) {
          mainWindow.hide();
        }
        
        // 隐藏覆盖窗口
        if (overlayWindow) {
          overlayWindow.setIgnoreMouseEvents(true);
          overlayWindow.hide();
        }
      } else {
        console.log(`[Mouse Monitor] Window is pinned, keeping visible`);
      }
      console.log(`[Mouse Monitor] =============================================\n`);
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
    throw new Error(`Module ${moduleId} does not exist`);
  }
  
  return {
    content: module.getContent(),
    initScript: module.getInitScript ? module.getInitScript() : '',
    destroyScript: module.getDestroyScript ? module.getDestroyScript() : ''
  };
});

// IPC 处理：固定窗口状态
ipcMain.handle('get-pin-state', () => {
  return isWindowPinned;
});

ipcMain.handle('set-pin-state', (event, pinned) => {
  isWindowPinned = pinned;
  // 保存到配置文件
  updateConfig({ isWindowPinned: pinned, autoHideOnMouseLeave: !pinned });
  console.log(`[Window Pin] Window pin state changed: ${pinned ? 'PINNED' : 'UNPINNED'}`);
  console.log(`[Config] Pin state saved to config file`);
  return true;
});

// IPC 处理：鼠标中键按下
ipcMain.on('middle-button-pressed', () => {
  if (!isMouseInsideWindow) return;
  
  middleButtonPressed = true;
  middleButtonPressTime = Date.now();
  
  console.log(`[Unlock] Middle button pressed, starting hold timer (${MIDDLE_BUTTON_HOLD_TIME}ms)`);
  
  // 清除之前的定时器
  if (middleButtonPressTimer) {
    clearTimeout(middleButtonPressTimer);
  }
  
  // 设置长按检测定时器
  middleButtonPressTimer = setTimeout(() => {
    if (middleButtonPressed && isMouseInsideWindow) {
      console.log(`\n[Unlock Success] ========== Middle Button Hold Detected ==========`);
      console.log(`[Unlock Success] Showing main window`);
      console.log(`[Unlock Success] ===================================================\n`);
      
      // 显示主窗口
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
      
      // 隐藏覆盖窗口
      if (overlayWindow) {
        overlayWindow.setIgnoreMouseEvents(true);
        overlayWindow.hide();
      }
      
      // 重置状态
      middleButtonPressed = false;
      middleButtonPressTime = null;
    }
  }, MIDDLE_BUTTON_HOLD_TIME);
});

// IPC 处理：鼠标中键释放
ipcMain.on('middle-button-released', () => {
  if (!middleButtonPressed) return;
  
  const holdTime = Date.now() - (middleButtonPressTime || Date.now());
  console.log(`[Unlock] Middle button released, hold time: ${holdTime}ms (required: ${MIDDLE_BUTTON_HOLD_TIME}ms)`);
  
  middleButtonPressed = false;
  middleButtonPressTime = null;
  
  // 清除定时器
  if (middleButtonPressTimer) {
    clearTimeout(middleButtonPressTimer);
    middleButtonPressTimer = null;
  }
});
