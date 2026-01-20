const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { loadConfig, updateConfig, getConfig, setConfig } = require('./config');
const packageJson = require('./package.json');

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
const webviewContents = []; // 存储所有webview的引用
let mouseMonitorTimer = null;
let isMouseInsideWindow = false;
let hideDelayTimer = null; // 延迟隐藏定时器

// 鼠标中键长按检测
let middleButtonPressed = false;
let middleButtonPressTime = null;
let middleButtonPressTimer = null;
let MIDDLE_BUTTON_HOLD_TIME = 1000; // 从配置文件加载

// 窗口固定状态（从配置文件加载）
let isWindowPinned = false;

// 鼠标进入/离开次数检测（可配置时间窗口和次数阈值）
let mouseEnterLeaveCount = 0; // 进入/离开次数
let mouseEnterLeaveTimer = null; // 时间窗口计时器
let MOUSE_ENTER_LEAVE_WINDOW = 3000; // 时间窗口（从配置文件加载）
let MOUSE_ENTER_LEAVE_THRESHOLD = 3; // 次数阈值（从配置文件加载）

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

// 设置窗口位置到屏幕角落
function setWindowPosition(position) {
  if (!mainWindow) return;
  
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const windowWidth = 480;
  const windowHeight = 800;
  const margin = 10;
  
  let x, y;
  
  switch (position) {
    case 'top-left':
      x = margin;
      y = margin;
      break;
    case 'top-right':
      x = width - windowWidth - margin;
      y = margin;
      break;
    case 'bottom-left':
      x = margin;
      y = height - windowHeight - margin;
      break;
    case 'bottom-right':
      x = width - windowWidth - margin;
      y = height - windowHeight - margin;
      break;
    default:
      return;
  }
  
  mainWindow.setPosition(x, y);
  console.log(`[Window] Position set to ${position}: (${x}, ${y})`);
}

function createWindow() {
  const config = loadConfig();
  
  // 从配置文件加载所有设置
  isWindowPinned = config.defaultPinned || config.isWindowPinned || false;
  MIDDLE_BUTTON_HOLD_TIME = config.middleButtonHoldTime || 1000;
  console.log(`[Config] Window pinned state loaded: ${isWindowPinned}`);
  console.log(`[Config] Middle button hold time loaded: ${MIDDLE_BUTTON_HOLD_TIME}ms`);
  console.log(`[Config] Hide delay on mouse leave: ${config.hideDelayOnMouseLeave || 0}ms`);
  
  // 如果配置了窗口位置且没有保存的位置，设置窗口位置
  if (config.windowPosition && !config.windowBounds) {
    // 延迟设置，等窗口创建后再设置位置
    setTimeout(() => {
      setWindowPosition(config.windowPosition);
    }, 100);
  }
  
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

  // 根据环境加载不同的文件
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    // 开发环境：加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173');
    // 打开开发者工具（可选）
    // mainWindow.webContents.openDevTools();
  } else {
    // 生产环境：加载构建后的文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

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

  // 处理webview的HTML5全屏请求（如抖音视频全屏）
  mainWindow.webContents.on('did-attach-webview', (event, webContents) => {
    console.log(`[Webview] Webview attached, setting up fullscreen handlers`);
    webviewContents.push(webContents);
    
    // 监听webview进入HTML5全屏（如视频全屏）
    webContents.on('enter-html-full-screen', () => {
      console.log(`[Webview] Entered HTML5 fullscreen (e.g., video fullscreen)`);
      if (mainWindow) {
        // 隐藏工具栏，让webview全屏显示
        mainWindow.webContents.send('webview-enter-fullscreen');
        // 将应用窗口设置为全屏，以支持全屏滚动
        mainWindow.setFullScreen(true);
      }
    });

    // 监听webview退出HTML5全屏
    webContents.on('leave-html-full-screen', () => {
      console.log(`[Webview] Left HTML5 fullscreen`);
      if (mainWindow) {
        mainWindow.webContents.send('webview-leave-fullscreen');
        mainWindow.setFullScreen(false);
      }
    });

    // 监听webview关闭，从数组中移除
    webContents.on('destroyed', () => {
      const index = webviewContents.indexOf(webContents);
      if (index > -1) {
        webviewContents.splice(index, 1);
      }
    });
  });

  // 全局函数：触发webview全屏
  global.triggerWebviewFullscreen = () => {
    console.log(`[Webview] Triggering fullscreen from toolbar button`);
    // 使用存储的webview引用
    if (webviewContents.length === 0) {
      console.log(`[Webview] No webview found`);
      return false;
    }
    
    // 使用第一个webview
    const webContents = webviewContents[0];
    console.log(`[Webview] Attempting to trigger fullscreen on webview`);
    
    // 尝试多种方式触发全屏
    webContents.executeJavaScript(`
      (function() {
        // 方法1: 查找视频元素并触发全屏
        const videos = document.querySelectorAll('video');
        if (videos.length > 0) {
          const video = videos[0];
          if (video.requestFullscreen) {
            video.requestFullscreen().catch(err => console.log('Fullscreen error:', err));
            return true;
          } else if (video.webkitRequestFullscreen) {
            video.webkitRequestFullscreen();
            return true;
          } else if (video.mozRequestFullScreen) {
            video.mozRequestFullScreen();
            return true;
          } else if (video.msRequestFullscreen) {
            video.msRequestFullscreen();
            return true;
          }
        }
        
        // 方法2: 查找全屏按钮并点击
        const fullscreenButtons = document.querySelectorAll('[class*="fullscreen"], [class*="Fullscreen"], button[aria-label*="全屏"], button[aria-label*="fullscreen"]');
        if (fullscreenButtons.length > 0) {
          fullscreenButtons[0].click();
          return true;
        }
        
        // 方法3: 尝试对整个文档触发全屏
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(err => console.log('Fullscreen error:', err));
          return true;
        } else if (document.documentElement.webkitRequestFullscreen) {
          document.documentElement.webkitRequestFullscreen();
          return true;
        }
        
        return false;
      })();
    `).then((result) => {
      if (result) {
        console.log(`[Webview] Fullscreen triggered successfully`);
      } else {
        console.log(`[Webview] Could not trigger fullscreen, no suitable element found`);
      }
    }).catch((err) => {
      console.log(`[Webview] Error triggering fullscreen:`, err);
    });
    
    return true;
  };

  // 全局函数：切换webview开发者工具
  global.toggleWebviewDevtools = () => {
    console.log(`[Webview] Toggling devtools from toolbar button`);
    
    // 使用存储的webview引用
    if (webviewContents.length === 0) {
      console.log(`[Webview] No webview found to toggle devtools`);
      return false;
    }
    
    // 使用第一个webview
    const webContents = webviewContents[0];
    
    if (webContents.isDevToolsOpened()) {
      console.log(`[Webview] Closing devtools`);
      webContents.closeDevTools();
    } else {
      console.log(`[Webview] Opening devtools`);
      webContents.openDevTools();
    }
    
    return true;
  };

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
      mouseEnterLeaveCount++;
      
      console.log(`\n[Mouse Monitor] ========== Mouse Entered Window Area ==========`);
      console.log(`[Mouse Monitor] Window position: (${bounds.x}, ${bounds.y})`);
      console.log(`[Mouse Monitor] Window size: ${bounds.width} x ${bounds.height}`);
      console.log(`[Mouse Monitor] Mouse position: (${cursorPoint.x}, ${cursorPoint.y})`);
      console.log(`[Mouse Monitor] Enter/Leave count: ${mouseEnterLeaveCount}/${MOUSE_ENTER_LEAVE_THRESHOLD}`);
      console.log(`[Mouse Monitor] ================================================\n`);
      
      // 如果这是第一次进入，启动3秒计时器
      if (mouseEnterLeaveCount === 1) {
        // 清除之前的计时器
        if (mouseEnterLeaveTimer) {
          clearTimeout(mouseEnterLeaveTimer);
        }
        
        mouseEnterLeaveTimer = setTimeout(() => {
          console.log(`[Mouse Monitor] 3 second window expired, resetting count`);
          mouseEnterLeaveCount = 0;
          mouseEnterLeaveTimer = null;
        }, MOUSE_ENTER_LEAVE_WINDOW);
      }
      
      // 检查是否达到3次进入/离开
      if (mouseEnterLeaveCount >= MOUSE_ENTER_LEAVE_THRESHOLD) {
        console.log(`\n[Unlock Success] ========== Mouse Enter/Leave Pattern Detected ==========`);
        console.log(`[Unlock Success] Detected ${mouseEnterLeaveCount} enter/leave events in 3 seconds`);
        console.log(`[Unlock Success] Showing main window`);
        console.log(`[Unlock Success] ===================================================\n`);
        
        // 重置计数器
        mouseEnterLeaveCount = 0;
        if (mouseEnterLeaveTimer) {
          clearTimeout(mouseEnterLeaveTimer);
          mouseEnterLeaveTimer = null;
        }
        
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
      }
      
      // 确保覆盖窗口可见且可以接收鼠标事件（用于中键解锁）
      if (overlayWindow) {
        overlayWindow.setIgnoreMouseEvents(false);
        overlayWindow.show();
      }
    } else if (!inside && isMouseInsideWindow) {
      // 鼠标离开应用矩形区域
      isMouseInsideWindow = false;
      mouseEnterLeaveCount++;
      
      console.log(`\n[Mouse Monitor] ========== Mouse Left Window Area ==========`);
      console.log(`[Mouse Monitor] Mouse position: (${cursorPoint.x}, ${cursorPoint.y})`);
      console.log(`[Mouse Monitor] Window pinned: ${isWindowPinned}`);
      console.log(`[Mouse Monitor] Enter/Leave count: ${mouseEnterLeaveCount}/${MOUSE_ENTER_LEAVE_THRESHOLD}`);
      
      // 如果这是第一次离开，启动3秒计时器（如果还没启动）
      if (mouseEnterLeaveCount === 1) {
        // 清除之前的计时器
        if (mouseEnterLeaveTimer) {
          clearTimeout(mouseEnterLeaveTimer);
        }
        
        mouseEnterLeaveTimer = setTimeout(() => {
          console.log(`[Mouse Monitor] 3 second window expired, resetting count`);
          mouseEnterLeaveCount = 0;
          mouseEnterLeaveTimer = null;
        }, MOUSE_ENTER_LEAVE_WINDOW);
      }
      
      // 检查是否达到3次进入/离开
      if (mouseEnterLeaveCount >= MOUSE_ENTER_LEAVE_THRESHOLD) {
        console.log(`\n[Unlock Success] ========== Mouse Enter/Leave Pattern Detected ==========`);
        console.log(`[Unlock Success] Detected ${mouseEnterLeaveCount} enter/leave events in 3 seconds`);
        console.log(`[Unlock Success] Showing main window`);
        console.log(`[Unlock Success] ===================================================\n`);
        
        // 重置计数器
        mouseEnterLeaveCount = 0;
        if (mouseEnterLeaveTimer) {
          clearTimeout(mouseEnterLeaveTimer);
          mouseEnterLeaveTimer = null;
        }
        
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
      }
      
      // 重置中键状态
      if (middleButtonPressTimer) {
        clearTimeout(middleButtonPressTimer);
        middleButtonPressTimer = null;
      }
      middleButtonPressed = false;
      middleButtonPressTime = null;
      
      // 清除之前的延迟隐藏定时器
      if (hideDelayTimer) {
        clearTimeout(hideDelayTimer);
        hideDelayTimer = null;
      }
      
      // 注意：不重置 mouseEnterLeaveCount，因为离开也算一次事件
      
      // 如果窗口未固定，则延迟隐藏窗口
      if (!isWindowPinned) {
        const hideDelay = getConfig('hideDelayOnMouseLeave') || 0;
        console.log(`[Mouse Monitor] Hide delay: ${hideDelay}ms`);
        
        if (hideDelay === 0) {
          // 立刻隐藏
          console.log(`[Mouse Monitor] Hiding window immediately (not pinned)`);
          if (mainWindow) {
            mainWindow.hide();
          }
          
          // 隐藏覆盖窗口
          if (overlayWindow) {
            overlayWindow.setIgnoreMouseEvents(true);
            overlayWindow.hide();
          }
        } else {
          // 延迟隐藏
          console.log(`[Mouse Monitor] Will hide window after ${hideDelay}ms`);
          hideDelayTimer = setTimeout(() => {
            if (!isMouseInsideWindow && !isWindowPinned && mainWindow) {
              console.log(`[Mouse Monitor] Hiding window after delay (not pinned)`);
              mainWindow.hide();
              
              // 隐藏覆盖窗口
              if (overlayWindow) {
                overlayWindow.setIgnoreMouseEvents(true);
                overlayWindow.hide();
              }
            }
            hideDelayTimer = null;
          }, hideDelay);
        }
      } else {
        console.log(`[Mouse Monitor] Window is pinned, keeping visible`);
      }
      console.log(`[Mouse Monitor] =============================================\n`);
    }
    
    // 如果鼠标重新进入窗口，取消延迟隐藏
    if (inside && hideDelayTimer) {
      clearTimeout(hideDelayTimer);
      hideDelayTimer = null;
      console.log(`[Mouse Monitor] Canceled hide delay (mouse re-entered)`);
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

// IPC 处理：配置管理
ipcMain.handle('get-all-config', () => {
  return loadConfig();
});

ipcMain.handle('get-config', (event, key) => {
  return getConfig(key);
});

ipcMain.handle('set-config', (event, key, value) => {
  setConfig(key, value);
  console.log(`[Config] Config updated: ${key} = ${value}`);
  
  // 如果修改了窗口位置，立即应用
  if (key === 'windowPosition' && mainWindow) {
    setWindowPosition(value);
  }
  
  // 如果修改了默认固定状态，更新当前状态（需要重启生效）
  if (key === 'defaultPinned') {
    console.log(`[Config] Default pinned changed, will take effect on next startup`);
  }
  
  // 如果修改了鼠标进入/离开解锁配置，立即重新加载
  if (key === 'mouseEnterLeaveWindow' || key === 'mouseEnterLeaveThreshold') {
    const config = loadConfig();
    MOUSE_ENTER_LEAVE_WINDOW = config.mouseEnterLeaveWindow || 3000;
    MOUSE_ENTER_LEAVE_THRESHOLD = config.mouseEnterLeaveThreshold || 3;
    console.log(`[Config] Mouse enter/leave unlock config reloaded: window=${MOUSE_ENTER_LEAVE_WINDOW}ms, threshold=${MOUSE_ENTER_LEAVE_THRESHOLD}`);
  }
  
  return true;
});

// IPC 处理：重新加载解锁配置
ipcMain.on('reload-unlock-config', () => {
  const config = loadConfig();
  MOUSE_ENTER_LEAVE_WINDOW = config.mouseEnterLeaveWindow || 3000;
  MOUSE_ENTER_LEAVE_THRESHOLD = config.mouseEnterLeaveThreshold || 3;
  MIDDLE_BUTTON_HOLD_TIME = config.middleButtonHoldTime || 1000;
  console.log(`[Config] Unlock config reloaded: enter/leave window=${MOUSE_ENTER_LEAVE_WINDOW}ms, threshold=${MOUSE_ENTER_LEAVE_THRESHOLD}, middle button=${MIDDLE_BUTTON_HOLD_TIME}ms`);
});

// IPC 处理：应用信息
ipcMain.handle('get-app-version', () => {
  return packageJson.version;
});

ipcMain.handle('check-for-updates', async () => {
  // 简单的更新检查（实际应该连接更新服务器）
  console.log(`[Update] Checking for updates...`);
  console.log(`[Update] Current version: ${packageJson.version}`);
  // 这里可以添加实际的更新检查逻辑
  return { hasUpdate: false, latestVersion: packageJson.version };
});

// IPC 处理：触发webview全屏
ipcMain.on('trigger-webview-fullscreen', () => {
  if (global.triggerWebviewFullscreen) {
    global.triggerWebviewFullscreen();
  } else {
    console.log(`[Webview] triggerWebviewFullscreen function not available`);
  }
});

// IPC 处理：切换webview开发者工具
ipcMain.on('toggle-webview-devtools', () => {
  if (global.toggleWebviewDevtools) {
    global.toggleWebviewDevtools();
  } else {
    console.log(`[Webview] toggleWebviewDevtools function not available`);
  }
});

// IPC 处理：导航webview
ipcMain.on('navigate-webview', (event, url) => {
  console.log(`[Webview] Navigating to: ${url}`);
  if (webviewContents.length > 0) {
    const webContents = webviewContents[0];
    webContents.loadURL(url);
  } else {
    console.log(`[Webview] No webview found to navigate`);
  }
});

// IPC 处理：在webview中执行脚本
ipcMain.handle('execute-webview-script', async (event, script) => {
  console.log(`[Webview] ========== Executing script in webview ==========`);
  console.log(`[Webview] Webview count: ${webviewContents.length}`);
  
  if (webviewContents.length > 0) {
    const webContents = webviewContents[0];
    console.log(`[Webview] Webview URL: ${webContents.getURL()}`);
    console.log(`[Webview] Webview is loading: ${webContents.isLoading()}`);
    console.log(`[Webview] Script length: ${script.length} characters`);
    
    try {
      console.log(`[Webview] Executing JavaScript script...`);
      const result = await webContents.executeJavaScript(script);
      console.log(`[Webview] Script executed successfully`);
      console.log(`[Webview] Result:`, result);
      console.log(`[Webview] ===========================================`);
      return { success: true, result: result };
    } catch (error) {
      console.error(`[Webview] Error executing script:`, error);
      console.error(`[Webview] Error message:`, error.message);
      console.error(`[Webview] Error stack:`, error.stack);
      console.log(`[Webview] ===========================================`);
      return { success: false, error: error.message };
    }
  } else {
    console.log(`[Webview] No webview found to execute script`);
    console.log(`[Webview] ===========================================`);
    return { success: false, error: 'No webview found' };
  }
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
