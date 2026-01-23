const { app, BrowserWindow, globalShortcut, ipcMain, screen, dialog, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// 使用 TextDecoder 进行 GBK 解码（原生 API，优先使用）
// 如果 TextDecoder 不支持 GBK，则回退到 iconv-lite
let iconv = null;
try {
  iconv = require('iconv-lite');
} catch (e) {
  console.warn('[Main] iconv-lite not available, will use TextDecoder only');
}

// GBK 解码函数
function decodeGBK(buffer) {
  try {
    // 方法1: 尝试使用 TextDecoder（原生 API）
    try {
      const decoder = new TextDecoder('gbk');
      return decoder.decode(buffer);
    } catch (textDecoderError) {
      // TextDecoder 不支持 GBK 或失败，尝试方法2
      console.log('[Main] TextDecoder GBK not supported, trying iconv-lite');
    }
    
    // 方法2: 使用 iconv-lite（备用方案）
    if (iconv) {
      return iconv.decode(buffer, 'gbk');
    }
    
    // 方法3: 如果都失败，尝试 UTF-8
    return buffer.toString('utf-8');
  } catch (error) {
    console.error('[Main] GBK decode error:', error.message);
    // 如果解码失败，尝试使用 UTF-8
    try {
      return buffer.toString('utf-8');
    } catch (e) {
      return buffer.toString('latin1');
    }
  }
}

const { loadConfig, updateConfig, getConfig, setConfig, readConfigFile, getConfigFilePath } = require('./config');
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
let tray = null; // 系统托盘图标
let petWindow = null; // 桌面小宠物窗口（小鱼）
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

// 鼠标进入次数检测（可配置时间窗口和次数阈值，只统计进入次数，不统计离开）
let mouseEnterLeaveCount = 0; // 进入次数（只统计进入，不统计离开）
let mouseEnterLeaveTimer = null; // 时间窗口计时器
let MOUSE_ENTER_LEAVE_WINDOW = 3000; // 时间窗口（从配置文件加载）
let MOUSE_ENTER_LEAVE_THRESHOLD = 5; // 次数阈值（从配置文件加载）

// 隐藏窗口时自动暂停视频配置
let AUTO_PAUSE_ON_HIDE = true; // 从配置文件加载
let resumeVideoTimer = null; // 窗口显示后延迟恢复视频的计时器
let videoPausedByAutoHide = false; // 记录是否由自动隐藏逻辑暂停了视频
let WINDOW_OPACITY = 1.0; // 窗口透明度（从配置文件加载，0.2 ~ 1.0）

// 键盘快捷键相关
let KEYBOARD_MODE_ENABLED = false; // 是否启用键盘模式
let KEYBOARD_SHORTCUT = 'CommandOrControl+Shift+M'; // 快捷键组合
let currentShortcut = null; // 当前注册的快捷键

// 桌面小宠物配置
let ENABLE_DESKTOP_PET = false; // 是否启用桌面小宠物

// 摸鱼系统相关变量
let moyuData = null; // 摸鱼数据对象
let moyuDataFile = null; // 数据文件路径
let moyuTimer = null; // 计时器（每秒更新）
let moyuStartTime = null; // 当前会话开始时间
let isMoyuTracking = false; // 是否正在追踪

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

// 注册键盘快捷键
function registerKeyboardShortcut() {
  // 先注销旧的快捷键
  if (currentShortcut) {
    try {
      globalShortcut.unregister(currentShortcut);
      console.log(`[Keyboard] Unregistered old shortcut: ${currentShortcut}`);
    } catch (e) {
      console.log(`[Keyboard] Failed to unregister old shortcut:`, e.message);
    }
    currentShortcut = null;
  }
  
  // 如果键盘模式未启用，不注册快捷键
  if (!KEYBOARD_MODE_ENABLED) {
    console.log(`[Keyboard] Keyboard mode is disabled, shortcut not registered`);
    return;
  }
  
  // 注册新的快捷键
  try {
    const shortcut = KEYBOARD_SHORTCUT || 'CommandOrControl+Shift+M';
    const ret = globalShortcut.register(shortcut, () => {
      console.log(`[Keyboard] Shortcut triggered: ${shortcut}`);
      toggleWindowVisibility();
    });
    
    if (ret) {
      currentShortcut = shortcut;
      console.log(`[Keyboard] Shortcut registered successfully: ${shortcut}`);
    } else {
      console.error(`[Keyboard] Failed to register shortcut: ${shortcut}`);
    }
  } catch (e) {
    console.error(`[Keyboard] Error registering shortcut:`, e.message);
  }
}

// 注销键盘快捷键
function unregisterKeyboardShortcut() {
  if (currentShortcut) {
    try {
      globalShortcut.unregister(currentShortcut);
      console.log(`[Keyboard] Shortcut unregistered: ${currentShortcut}`);
      currentShortcut = null;
    } catch (e) {
      console.error(`[Keyboard] Failed to unregister shortcut:`, e.message);
    }
  }
}

// 切换窗口显示/隐藏
function toggleWindowVisibility() {
  if (!mainWindow) {
    createWindow();
    return;
  }

  if (mainWindow.isVisible()) {
    mainWindow.hide();
    console.log(`[Keyboard] Window hidden via shortcut`);
  } else {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
    console.log(`[Keyboard] Window shown via shortcut`);
  }
}

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

// 初始化配置（在应用启动时调用）
function initializeConfig() {
  console.log(`[Config] ========== Initializing configuration ==========`);
  const config = loadConfig();
  
  // 从配置文件加载所有设置
  isWindowPinned = config.defaultPinned || config.isWindowPinned || false;
  MIDDLE_BUTTON_HOLD_TIME = config.middleButtonHoldTime || 1000;
  MOUSE_ENTER_LEAVE_WINDOW = config.mouseEnterLeaveWindow || 3000;
  MOUSE_ENTER_LEAVE_THRESHOLD = config.mouseEnterLeaveThreshold || 5;
  AUTO_PAUSE_ON_HIDE = config.autoPauseOnHide !== false; // 默认开启
  // 窗口透明度（限制在 0.2 ~ 1.0 之间，避免完全透明导致看不见）
  const opacity = typeof config.windowOpacity === 'number' ? config.windowOpacity : 1.0;
  WINDOW_OPACITY = Math.min(1.0, Math.max(0.2, opacity));
  // 桌面小宠物
  ENABLE_DESKTOP_PET = config.enableDesktopPet === true;
  
  // 键盘模式配置
  KEYBOARD_MODE_ENABLED = config.keyboardModeEnabled === true;
  KEYBOARD_SHORTCUT = config.keyboardShortcut || 'CommandOrControl+Shift+M';
  
  console.log(`[Config] Window pinned state: ${isWindowPinned}`);
  console.log(`[Config] Middle button hold time: ${MIDDLE_BUTTON_HOLD_TIME}ms`);
  const hideDelay = config.hideDelayOnMouseLeave || 1000;
  const finalHideDelay = hideDelay < 1000 ? 1000 : hideDelay;
  console.log(`[Config] Hide delay on mouse leave: ${finalHideDelay}ms (minimum 1000ms)`);
  console.log(`[Config] Mouse enter/leave window: ${MOUSE_ENTER_LEAVE_WINDOW}ms`);
  console.log(`[Config] Mouse enter/leave threshold: ${MOUSE_ENTER_LEAVE_THRESHOLD}`);
  console.log(`[Config] Auto pause on hide: ${AUTO_PAUSE_ON_HIDE}`);
  console.log(`[Config] Window opacity: ${WINDOW_OPACITY}`);
  console.log(`[Config] Keyboard mode enabled: ${KEYBOARD_MODE_ENABLED}`);
  console.log(`[Config] Keyboard shortcut: ${KEYBOARD_SHORTCUT}`);
  console.log(`[Config] Desktop pet enabled: ${ENABLE_DESKTOP_PET}`);
  console.log(`[Config] ================================================`);
  
  return config;
}

// ========== 摸鱼系统数据管理 ==========

// 获取当前日期字符串（YYYY-MM-DD）
function getCurrentDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 加载摸鱼数据
function loadMoyuData() {
  try {
    if (!moyuDataFile) {
      moyuDataFile = path.join(app.getPath('userData'), 'moyu_data.json');
    }
    
    if (fs.existsSync(moyuDataFile)) {
      const data = fs.readFileSync(moyuDataFile, 'utf-8');
      moyuData = JSON.parse(data);
      console.log('[Moyu] Loaded moyu data from:', moyuDataFile);
    } else {
      // 创建默认数据
      moyuData = {
        dailyTime: {},
        totalTime: 0,
        growthValue: 0,
        level: 1,
        lastUpdateDate: getCurrentDateString()
      };
      saveMoyuData();
      console.log('[Moyu] Created default moyu data');
    }
    
    // 检查跨日重置
    const currentDate = getCurrentDateString();
    if (moyuData.lastUpdateDate !== currentDate) {
      console.log(`[Moyu] New day detected (${moyuData.lastUpdateDate} -> ${currentDate}), resetting daily time`);
      // 重置今日时间，但保留累计时间和成长值
      moyuData.dailyTime[currentDate] = 0;
      moyuData.lastUpdateDate = currentDate;
      saveMoyuData();
    } else {
      // 确保今日时间存在
      if (!moyuData.dailyTime[currentDate]) {
        moyuData.dailyTime[currentDate] = 0;
      }
    }
    
    // 确保所有必需字段存在
    if (typeof moyuData.totalTime !== 'number') moyuData.totalTime = 0;
    if (typeof moyuData.growthValue !== 'number') moyuData.growthValue = 0;
    if (typeof moyuData.level !== 'number') moyuData.level = 1;
    
    return moyuData;
  } catch (error) {
    console.error('[Moyu] Failed to load moyu data:', error);
    // 返回默认数据
    moyuData = {
      dailyTime: {},
      totalTime: 0,
      growthValue: 0,
      level: 1,
      lastUpdateDate: getCurrentDateString()
    };
    return moyuData;
  }
}

// 保存摸鱼数据
function saveMoyuData() {
  try {
    if (!moyuData) {
      console.warn('[Moyu] No data to save');
      return;
    }
    
    if (!moyuDataFile) {
      moyuDataFile = path.join(app.getPath('userData'), 'moyu_data.json');
    }
    
    // 确保目录存在
    const dataDir = path.dirname(moyuDataFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(moyuDataFile, JSON.stringify(moyuData, null, 2), 'utf-8');
    console.log('[Moyu] Saved moyu data to:', moyuDataFile);
  } catch (error) {
    console.error('[Moyu] Failed to save moyu data:', error);
  }
}

// 根据成长值计算等级（分阶段）
function calculateLevel(growthValue) {
  if (growthValue < 60) return 1;      // 0-60点（1小时以内）
  if (growthValue < 300) return 2;     // 61-300点（1-5小时）
  if (growthValue < 600) return 3;    // 301-600点（5-10小时）
  if (growthValue < 1200) return 4;   // 601-1200点（10-20小时）
  return 5;                            // 1201+点（20小时以上）
}

// 根据等级计算鱼儿大小（像素）
function calculateSize(level) {
  const baseSize = 80; // 基础大小
  const sizePerLevel = 20; // 每级增加20px
  const maxSize = 180; // 最大大小
  const size = baseSize + (level - 1) * sizePerLevel;
  return Math.min(size, maxSize);
}

// 开始摸鱼时间追踪
function startMoyuTracking() {
  if (isMoyuTracking) {
    console.log('[Moyu] Already tracking, skipping start');
    return;
  }
  
  if (!moyuData) {
    loadMoyuData();
  }
  
  const currentDate = getCurrentDateString();
  const sessionStartTodayTime = moyuData.dailyTime[currentDate] || 0;
  const sessionStartTotalTime = moyuData.totalTime || 0;
  const sessionStartGrowthValue = moyuData.growthValue || 0;
  
  moyuStartTime = {
    timestamp: Date.now(),
    todayTime: sessionStartTodayTime,
    totalTime: sessionStartTotalTime,
    growthValue: sessionStartGrowthValue
  };
  
  isMoyuTracking = true;
  console.log('[Moyu] Started tracking moyu time');
  
  // 立即更新一次
  updateMoyuTime();
  
  // 每秒更新一次
  moyuTimer = setInterval(() => {
    updateMoyuTime();
  }, 1000);
}

// 停止摸鱼时间追踪
function stopMoyuTracking() {
  if (!isMoyuTracking) {
    return;
  }
  
  // 更新最后一次时间（最终保存）
  if (moyuStartTime && typeof moyuStartTime === 'object') {
    updateMoyuTime();
  }
  
  // 清除计时器
  if (moyuTimer) {
    clearInterval(moyuTimer);
    moyuTimer = null;
  }
  
  isMoyuTracking = false;
  moyuStartTime = null;
  
  // 保存数据
  saveMoyuData();
  
  console.log('[Moyu] Stopped tracking moyu time and saved data');
}

// 更新摸鱼时间
function updateMoyuTime() {
  if (!moyuData || !moyuStartTime || typeof moyuStartTime !== 'object') {
    return;
  }
  
  const currentDate = getCurrentDateString();
  const elapsedSeconds = (Date.now() - moyuStartTime.timestamp) / 1000;
  
  // 更新今日时间 = 会话开始时的今日时间 + 本次会话已过时间
  moyuData.dailyTime[currentDate] = moyuStartTime.todayTime + elapsedSeconds;
  
  // 更新累计时间 = 会话开始时的累计时间 + 本次会话已过时间
  moyuData.totalTime = moyuStartTime.totalTime + elapsedSeconds;
  
  // 更新成长值（1分钟 = 1点，每秒增加 1/60 点）
  // 成长值 = 会话开始时的成长值 + 本次会话增加的成长值
  const growthIncrease = elapsedSeconds / 60;
  moyuData.growthValue = moyuStartTime.growthValue + growthIncrease;
  
  // 更新等级
  const newLevel = calculateLevel(Math.floor(moyuData.growthValue));
  if (newLevel !== moyuData.level) {
    console.log(`[Moyu] Level up! ${moyuData.level} -> ${newLevel}`);
    moyuData.level = newLevel;
  }
  
  // 更新最后更新日期
  moyuData.lastUpdateDate = currentDate;
  
  // 通知pet窗口更新（如果存在）
  if (petWindow && petWindow.webContents) {
    try {
      petWindow.webContents.send('moyu-data-updated', {
        dailyTime: Math.floor(moyuData.dailyTime[currentDate]),
        totalTime: Math.floor(moyuData.totalTime),
        growthValue: Math.floor(moyuData.growthValue),
        level: moyuData.level
      });
    } catch (e) {
      // 忽略错误
    }
  }
}

function createWindow() {
  // 加载配置（用于窗口创建时的配置）
  const config = loadConfig();
  
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
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false, // 先不显示，等加载完成后再显示
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webviewTag: true
    }
  });
  
  // 监听页面加载错误
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Window] Failed to load: ${errorCode} - ${errorDescription}`);
    console.error(`[Window] URL: ${validatedURL}`);
    // 显示错误页面
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>加载错误</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
          h1 { color: #e74c3c; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>❌ 页面加载失败</h1>
          <p><strong>错误代码:</strong> ${errorCode}</p>
          <p><strong>错误描述:</strong> ${errorDescription}</p>
          <p><strong>URL:</strong> ${validatedURL}</p>
        </div>
      </body>
      </html>
    `)}`);
  });
  
  // 标记窗口是否应该显示（在页面加载完成后）
  let shouldShowWindow = false;
  let windowShown = false;
  
  // 显示窗口的辅助函数
  const showWindowIfNeeded = () => {
    if (shouldShowWindow && !windowShown && mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      windowShown = true;
      console.log(`[Window] Window shown`);
      return true;
    }
    return false;
  };
  
  // 监听页面加载完成
  mainWindow.webContents.on('did-finish-load', () => {
    console.log(`[Window] Page finished loading`);
    showWindowIfNeeded();
  });
  
  // 监听 DOM 准备完成（更早的事件）
  mainWindow.webContents.on('dom-ready', () => {
    console.log(`[Window] DOM ready`);
    // DOM 准备好后也可以显示窗口
    showWindowIfNeeded();
  });
  
  // 超时保护：如果 5 秒后页面还没加载完成，也显示窗口
  setTimeout(() => {
    if (shouldShowWindow && !windowShown && mainWindow) {
      console.log(`[Window] Timeout: showing window after 5 seconds (page may still be loading)`);
      showWindowIfNeeded();
    }
  }, 5000);
  
  // 监听控制台消息（用于调试）
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console ${level}]: ${message}`);
  });

  // 应用窗口透明度
  try {
    if (typeof WINDOW_OPACITY === 'number') {
      mainWindow.setOpacity(WINDOW_OPACITY);
      console.log(`[Window] Applied opacity: ${WINDOW_OPACITY}`);
    }
  } catch (e) {
    console.log('[Window] Failed to set opacity:', e.message);
  }

  // 根据环境加载不同的文件
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    // 开发环境：加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173');
    // 打开开发者工具（可选）
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境：加载构建后的文件
    // electron-builder 打包后，文件在 resources/app 目录下
    // dist 文件夹和 main.js 在同一目录（resources/app）
    const appPath = app.getAppPath();
    const possiblePaths = [
      path.join(__dirname, 'dist/index.html'),           // 打包后的标准路径
      path.join(appPath, 'dist/index.html'),             // 使用 app.getAppPath()
      path.join(__dirname, '../dist/index.html'),        // 备用路径
      path.join(process.resourcesPath, 'app/dist/index.html') // resources 路径
    ];
    
    console.log(`[Window] Production mode - Looking for HTML file`);
    console.log(`[Window] __dirname: ${__dirname}`);
    console.log(`[Window] app.getAppPath(): ${appPath}`);
    console.log(`[Window] process.resourcesPath: ${process.resourcesPath}`);
    
    let htmlPath = null;
    for (const tryPath of possiblePaths) {
      console.log(`[Window] Checking: ${tryPath}`);
      if (fs.existsSync(tryPath)) {
        htmlPath = tryPath;
        console.log(`[Window] ✓ Found HTML file at: ${htmlPath}`);
        break;
      }
    }
    
    if (htmlPath) {
      mainWindow.loadFile(htmlPath);
      console.log(`[Window] HTML file loaded successfully`);
    } else {
      console.error(`[Window] ✗ HTML file not found in any location`);
      console.error(`[Window] Tried paths:`, possiblePaths);
      // 显示错误页面，包含调试信息
      mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>文件加载失败</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            h1 { color: #e74c3c; }
            .path-list { background: #f8f8f8; padding: 10px; border-radius: 4px; font-family: monospace; }
            .path-item { margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ 文件加载失败</h1>
            <p>无法找到应用文件，请检查安装是否完整。</p>
            <h3>调试信息：</h3>
            <div class="path-list">
              <div class="path-item"><strong>__dirname:</strong> ${__dirname}</div>
              <div class="path-item"><strong>app.getAppPath():</strong> ${appPath}</div>
              <div class="path-item"><strong>process.resourcesPath:</strong> ${process.resourcesPath || 'N/A'}</div>
            </div>
            <h3>尝试的路径：</h3>
            <div class="path-list">
              ${possiblePaths.map(p => `<div class="path-item">${p}</div>`).join('')}
            </div>
          </div>
        </body>
        </html>
      `)}`);
    }
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

  // 当主窗口隐藏/显示时，根据配置自动暂停/恢复视频
  mainWindow.on('hide', () => {
    console.log(`[Window] Main window hidden`);
    // 隐藏时如有计划中的恢复播放计时器，先清除
    if (resumeVideoTimer) {
      clearTimeout(resumeVideoTimer);
      resumeVideoTimer = null;
    }
    if (AUTO_PAUSE_ON_HIDE) {
      console.log(`[Window] Auto pause on hide is enabled, attempting to pause video...`);
      pauseWebviewVideo();
      // 标记是由自动隐藏逻辑暂停的
      videoPausedByAutoHide = true;
    } else {
      videoPausedByAutoHide = false;
    }

    // 停止摸鱼时间追踪
    stopMoyuTracking();
    
    // 隐藏pet窗口
    if (petWindow && petWindow.isVisible()) {
      petWindow.hide();
      console.log('[Pet] Pet window hidden (main window hidden)');
    }

    // 通知渲染进程应用已隐藏（用于本地小说等模块暂停自动行为）
    try {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('app-hidden');
      }
    } catch (e) {
      console.log('[Window] Failed to send app-hidden event:', e.message);
    }
  });

  mainWindow.on('show', () => {
    console.log(`[Window] Main window shown`);

    // 开始摸鱼时间追踪
    startMoyuTracking();
    
    // 显示pet窗口（如果启用且存在）
    if (ENABLE_DESKTOP_PET) {
      if (petWindow) {
        if (!petWindow.isVisible()) {
          petWindow.show();
          console.log('[Pet] Pet window shown (main window shown)');
        }
      } else {
        createPetWindow();
      }
    }

    // 通知渲染进程应用已显示
    try {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('app-shown');
      }
    } catch (e) {
      console.log('[Window] Failed to send app-shown event:', e.message);
    }
    // 只有在之前是由自动隐藏逻辑暂停过视频时，才尝试自动恢复播放
    if (AUTO_PAUSE_ON_HIDE && videoPausedByAutoHide) {
      console.log(`[Window] Auto pause on hide is enabled and video was paused by auto hide, will try to resume video after 500ms...`);

      // 避免多次 show 累积计时器
      if (resumeVideoTimer) {
        clearTimeout(resumeVideoTimer);
      }
      resumeVideoTimer = setTimeout(() => {
        console.log(`[Window] Resuming video after 500ms delay`);
        resumeWebviewVideo();
        resumeVideoTimer = null;
        // 恢复一次后清除标记，避免后续非自动隐藏导致的 show 继续触发
        videoPausedByAutoHide = false;
      }, 500);
    }
  });

  // 处理webview的HTML5全屏请求（如抖音视频全屏）
  mainWindow.webContents.on('did-attach-webview', (event, webContents) => {
    console.log(`[Webview] Webview attached, setting up handlers`);
    webviewContents.push(webContents);
    
    // 监听webview加载完成
    webContents.on('did-finish-load', () => {
      console.log(`[Webview] Webview finished loading: ${webContents.getURL()}`);
    });
    
    // 监听webview DOM 准备完成
    webContents.on('dom-ready', () => {
      console.log(`[Webview] Webview DOM ready: ${webContents.getURL()}`);
    });
    
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

  // 帮助函数：在所有已附加的 webview 中暂停视频
  function pauseWebviewVideo() {
    if (webviewContents.length === 0) {
      console.log(`[Webview] No webview found to pause video`);
      return;
    }

    const webContents = webviewContents[0];
    if (!webContents || webContents.isDestroyed()) {
      console.log(`[Webview] Webview is destroyed or unavailable`);
      return;
    }

    webContents.executeJavaScript(`
      (function() {
        try {
          console.log('[Webview Video] Attempting to pause video...');

          // 方法1: 直接暂停所有 video 元素
          const videos = document.querySelectorAll('video');
          console.log('[Webview Video] Found video elements count:', videos.length);
          let pausedCount = 0;
          videos.forEach((v, idx) => {
            console.log('[Webview Video] Video[' + idx + '] paused=', v.paused);
            if (!v.paused) {
              v.pause();
              pausedCount++;
              console.log('[Webview Video] Paused video[' + idx + ']');
            }
          });
          console.log('[Webview Video] Total paused by direct video.pause():', pausedCount);

          // 方法2: 针对 xgplayer，尝试点击暂停按钮（如果上面没有暂停到）
          if (pausedCount === 0) {
            const selector = '.xgplayer-play, .xgplayer-pause, [class*="xgplayer-play"], [class*="xgplayer-pause"]';
            const pauseBtn = document.querySelector(selector);
            if (pauseBtn) {
              console.log('[Webview Video] Found xgplayer toggle button:', {
                className: pauseBtn.className,
                tagName: pauseBtn.tagName,
                ariaLabel: pauseBtn.getAttribute && pauseBtn.getAttribute('aria-label'),
                text: pauseBtn.innerText && pauseBtn.innerText.trim()
              });
              pauseBtn.click();
              console.log('[Webview Video] Clicked xgplayer play/pause button');
            } else {
              console.log('[Webview Video] No xgplayer toggle button found with selector:', selector);
            }
          }
        } catch (e) {
          console.log('[Webview Video] Error while pausing video:', e.message);
        }
      })();
    `, true).catch(err => {
      console.log('[Webview Video] executeJavaScript error (pause):', err);
    });
  }

  // 帮助函数：在所有已附加的 webview 中恢复播放视频
  function resumeWebviewVideo() {
    if (webviewContents.length === 0) {
      console.log(`[Webview] No webview found to resume video`);
      return;
    }

    const webContents = webviewContents[0];
    if (!webContents || webContents.isDestroyed()) {
      console.log(`[Webview] Webview is destroyed or unavailable`);
      return;
    }

    webContents.executeJavaScript(`
      (function() {
        try {
          console.log('[Webview Video] Attempting to resume video...');

          // 方法1: 优先点击 xgplayer 播放/暂停按钮（与暂停逻辑使用同一类选择器，等于再点一次切换为播放）
          const toggleBtn = document.querySelector('.xgplayer-play, .xgplayer-pause, [class*="xgplayer-play"], [class*="xgplayer-pause"]');
          if (toggleBtn) {
            console.log('[Webview Video] Found xgplayer toggle button, clicking to resume...');
            toggleBtn.click();
            return;
          }

          // 方法2: 直接播放第一个 video 元素
          const videos = document.querySelectorAll('video');
          for (let i = 0; i < videos.length; i++) {
            const v = videos[i];
            if (v.paused) {
              const playPromise = v.play && v.play();
              if (playPromise && playPromise.catch) {
                playPromise.catch(err => console.log('[Webview Video] play() error:', err && err.message));
              }
              console.log('[Webview Video] Called play() on video');
              return;
            }
          }

          console.log('[Webview Video] No suitable element found to resume');
        } catch (e) {
          console.log('[Webview Video] Error while resuming video:', e.message);
        }
      })();
    `, true).catch(err => {
      console.log('[Webview Video] executeJavaScript error (resume):', err);
    });
  }

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
  const isFirstLaunch = config.isFirstLaunch !== false; // 默认 true，第一次启动
  
  // 如果是第一次启动，显示窗口且不隐藏（等待页面加载完成）
  if (isFirstLaunch) {
    shouldShowWindow = true;
    console.log(`[Window] First launch detected, window will show after page loads`);
    // 标记已不是第一次启动
    updateConfig({ isFirstLaunch: false });
    console.log(`[Config] First launch flag set to false`);
    
    // 如果页面已经加载完成，立即显示
    if (mainWindow.webContents.isLoading() === false) {
      mainWindow.show();
      mainWindow.focus();
      windowShown = true;
      console.log(`[Window] Page already loaded, showing window immediately`);
    }
    
    // 固定窗口不需要覆盖窗口
    if (!isWindowPinned && !KEYBOARD_MODE_ENABLED) {
      // 非固定窗口且非键盘模式，创建覆盖窗口用于监听鼠标中键
      createOverlayWindow();
    }
  }
  // 如果窗口是固定状态，启动时直接显示，不隐藏
  else if (isWindowPinned) {
    shouldShowWindow = true;
    if (mainWindow.webContents.isLoading() === false) {
      mainWindow.show();
      mainWindow.focus();
      windowShown = true;
    }
    console.log(`[Window] Window is pinned, showing on startup (not hidden)`);
    // 固定窗口不需要覆盖窗口来监听鼠标中键
    // createOverlayWindow(); // 注释掉，固定窗口不需要
  } 
  // 键盘模式：显示3秒后隐藏（如果配置允许）
  else if (KEYBOARD_MODE_ENABLED) {
    if (showOnStartup) {
      shouldShowWindow = true;
      if (mainWindow.webContents.isLoading() === false) {
        mainWindow.show();
        mainWindow.focus();
        windowShown = true;
      }
      console.log(`[Window] Keyboard mode enabled, window shown for ${displayDuration}ms`);
      setTimeout(() => {
        if (mainWindow) {
          mainWindow.hide();
          console.log(`[Window] Window hidden, use keyboard shortcut to show`);
        }
      }, displayDuration);
    } else {
      mainWindow.hide();
      console.log(`[Window] Keyboard mode enabled, window hidden (use shortcut to show)`);
    }
    // 键盘模式不需要覆盖窗口和鼠标监控
  } 
  // 鼠标模式：显示3秒后隐藏（如果配置允许）
  else if (showOnStartup) {
    shouldShowWindow = true;
    if (mainWindow.webContents.isLoading() === false) {
      mainWindow.show();
      mainWindow.focus();
      windowShown = true;
    }
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

  // 只在非键盘模式下启动鼠标监控
  if (!KEYBOARD_MODE_ENABLED) {
    startMouseMonitor();
  } else {
    console.log(`[Mouse Monitor] Mouse monitor disabled (keyboard mode enabled)`);
  }
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

// 创建桌面小宠物窗口（小鱼）
function createPetWindow() {
  try {
    if (petWindow || !ENABLE_DESKTOP_PET) {
      return;
    }
    const display = screen.getPrimaryDisplay();
    const { width, height } = display.workAreaSize || display.size;
    
    // 全屏窗口，让鱼儿在整个屏幕游动
    petWindow = new BrowserWindow({
      width: width,
      height: height,
      x: 0,
      y: 0,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      roundedCorners: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false
      }
    });

    petWindow.setMenuBarVisibility(false);
    
    // 设置窗口忽略鼠标事件，允许点击穿透到桌面（除了可交互元素）
    // forward: true 表示将鼠标事件转发到桌面应用
    petWindow.setIgnoreMouseEvents(true, { forward: true });

    const petHtmlPath = path.join(__dirname, 'pet.html');
    petWindow.loadFile(petHtmlPath).catch(err => {
      console.error('[Pet] Failed to load pet.html:', err);
    });

    petWindow.on('closed', () => {
      petWindow = null;
    });

    console.log('[Pet] Desktop pet window created (fullscreen, click-through enabled)');
  } catch (e) {
    console.error('[Pet] Failed to create desktop pet window:', e);
  }
}

function destroyPetWindow() {
  if (petWindow) {
    try {
      petWindow.close();
    } catch (e) {
      // ignore
    }
    petWindow = null;
    console.log('[Pet] Desktop pet window destroyed');
  }
}

// 确保应用只能开启一次（单实例）
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 如果获取锁失败，说明已有实例在运行，退出当前实例
  console.log(`[App] Another instance is already running, exiting...`);
  app.quit();
} else {
  // 监听第二个实例启动事件
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log(`[App] Second instance detected, focusing existing window...`);
    // 如果主窗口存在，激活它
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    } else {
      // 如果窗口不存在，创建新窗口
      createWindow();
    }
  });

// 创建系统托盘图标
function createTray() {
  // 托盘图标路径
  const iconPath = path.join(__dirname, 'fish.png');
  
  // 创建托盘图标
  tray = new Tray(iconPath);
  tray.setToolTip('moyuking - 摸鱼王');
  
  // 创建上下文菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示/隐藏窗口',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            if (mainWindow.isMinimized()) {
              mainWindow.restore();
            }
            mainWindow.show();
            mainWindow.focus();
          }
        } else {
          createWindow();
        }
      }
    },
    {
      label: '设置',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.show();
          mainWindow.focus();
          // 发送消息到渲染进程打开设置面板
          mainWindow.webContents.send('open-settings');
        } else {
          createWindow();
          // 等待窗口加载完成后再发送消息
          mainWindow.webContents.once('did-finish-load', () => {
            mainWindow.webContents.send('open-settings');
          });
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  // 设置上下文菜单
  tray.setContextMenu(contextMenu);
  
  // 点击托盘图标显示/隐藏窗口
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createWindow();
    }
  });
  
  console.log('[Tray] System tray icon created');
}

  app.whenReady().then(() => {
    // 先初始化配置，确保所有配置都已加载
    console.log(`[App] Application ready, initializing configuration...`);
    initializeConfig();
    console.log(`[App] Configuration initialized, creating window...`);
    
    // 初始化摸鱼数据
    loadMoyuData();
    
    // 配置加载完成后再创建窗口
    createWindow();
    
    // 创建系统托盘图标
    createTray();

    // 根据配置创建桌面小宠物
    if (ENABLE_DESKTOP_PET) {
      createPetWindow();
    }

    // 注册键盘快捷键（如果启用）
    registerKeyboardShortcut();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  // 注销快捷键
  unregisterKeyboardShortcut();
  
  // 如果有托盘图标，不退出应用（Windows/Linux）
  // macOS 上，即使所有窗口关闭，应用通常也继续运行
  if (process.platform !== 'darwin' && !tray) {
    app.quit();
  }
});

// 应用退出时销毁托盘图标
app.on('before-quit', () => {
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

// 应用退出前注销所有快捷键
app.on('will-quit', () => {
  unregisterKeyboardShortcut();
  globalShortcut.unregisterAll();
  console.log(`[Keyboard] All shortcuts unregistered on app quit`);
});

// 应用退出时销毁托盘和小宠物窗口
app.on('before-quit', () => {
  // 停止摸鱼时间追踪并保存数据
  stopMoyuTracking();
  
  // 确保数据已保存
  if (moyuData) {
    saveMoyuData();
  }
  
  if (tray) {
    tray.destroy();
    tray = null;
  }
  destroyPetWindow();
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
      console.log(`[Mouse Monitor] Enter count: ${mouseEnterLeaveCount}/${MOUSE_ENTER_LEAVE_THRESHOLD}`);
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
      
      // 检查是否达到指定次数的进入（只统计进入次数）
      if (mouseEnterLeaveCount >= MOUSE_ENTER_LEAVE_THRESHOLD) {
        console.log(`\n[Unlock Success] ========== Mouse Enter Pattern Detected ==========`);
        console.log(`[Unlock Success] Detected ${mouseEnterLeaveCount} enter events in ${MOUSE_ENTER_LEAVE_WINDOW}ms`);
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
        // 覆盖窗口保持“穿透点击”，同时通过 forward: true 仍然可以收到鼠标事件
        // 这样在应用隐藏时，不会阻挡下面应用的点击
        overlayWindow.setIgnoreMouseEvents(true, { forward: true });
        overlayWindow.show();
      }
    } else if (!inside && isMouseInsideWindow) {
      // 鼠标离开应用矩形区域（离开不计入统计，只统计进入次数）
      isMouseInsideWindow = false;
      // 注意：不增加计数，只统计进入次数
      
      console.log(`\n[Mouse Monitor] ========== Mouse Left Window Area ==========`);
      console.log(`[Mouse Monitor] Mouse position: (${cursorPoint.x}, ${cursorPoint.y})`);
      console.log(`[Mouse Monitor] Window pinned: ${isWindowPinned}`);
      console.log(`[Mouse Monitor] Enter count: ${mouseEnterLeaveCount}/${MOUSE_ENTER_LEAVE_THRESHOLD} (only enter events are counted)`);
      
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
        let hideDelay = getConfig('hideDelayOnMouseLeave') || 1000;
        // 确保最少1000ms
        if (hideDelay < 1000) {
          hideDelay = 1000;
        }
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

// IPC 处理：获取摸鱼数据
ipcMain.handle('get-moyu-data', () => {
  if (!moyuData) {
    loadMoyuData();
  }
  const currentDate = getCurrentDateString();
  return {
    dailyTime: Math.floor(moyuData.dailyTime[currentDate] || 0),
    totalTime: Math.floor(moyuData.totalTime || 0),
    growthValue: Math.floor(moyuData.growthValue || 0),
    level: moyuData.level || 1
  };
});

// IPC 处理：设置窗口忽略鼠标事件（用于pet窗口点击穿透）
ipcMain.handle('set-ignore-mouse-events', (event, ignore, options) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window && window === petWindow) {
    try {
      window.setIgnoreMouseEvents(ignore, options || { forward: true });
      return true;
    } catch (e) {
      console.error('[Pet] Failed to set ignore mouse events:', e);
      return false;
    }
  }
  return false;
});

ipcMain.handle('get-config', (event, key) => {
  return getConfig(key);
});

// IPC 处理：读取配置文件原始内容
ipcMain.handle('read-config-file', () => {
  return readConfigFile();
});

// IPC 处理：获取配置文件路径
ipcMain.handle('get-config-file-path', () => {
  return getConfigFilePath();
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
  
  // 如果修改了自动暂停开关，立即更新内存中的配置
  if (key === 'autoPauseOnHide') {
    AUTO_PAUSE_ON_HIDE = value !== false;
    console.log(`[Config] Auto pause on hide updated: ${AUTO_PAUSE_ON_HIDE}`);
  }

  // 如果修改了窗口透明度，立即应用到主窗口
  if (key === 'windowOpacity') {
    const opacity = typeof value === 'number' ? value : 1.0;
    WINDOW_OPACITY = Math.min(1.0, Math.max(0.2, opacity));
    if (mainWindow) {
      try {
        mainWindow.setOpacity(WINDOW_OPACITY);
        console.log(`[Config] Window opacity updated and applied: ${WINDOW_OPACITY}`);
      } catch (e) {
        console.log('[Config] Failed to set window opacity:', e.message);
      }
    }
  }
  
  // 如果修改了键盘模式或快捷键，重新注册快捷键
  if (key === 'keyboardModeEnabled' || key === 'keyboardShortcut') {
    const wasKeyboardMode = KEYBOARD_MODE_ENABLED;
    if (key === 'keyboardModeEnabled') {
      KEYBOARD_MODE_ENABLED = value === true;
    }
    if (key === 'keyboardShortcut') {
      KEYBOARD_SHORTCUT = value || 'CommandOrControl+Shift+M';
    }
    
    // 如果从鼠标模式切换到键盘模式，停止鼠标监控和覆盖窗口
    if (!wasKeyboardMode && KEYBOARD_MODE_ENABLED) {
      console.log(`[Config] Switching from mouse mode to keyboard mode`);
      // 停止鼠标监控
      if (mouseMonitorTimer) {
        clearInterval(mouseMonitorTimer);
        mouseMonitorTimer = null;
        console.log(`[Mouse Monitor] Stopped (keyboard mode enabled)`);
      }
      // 隐藏覆盖窗口
      if (overlayWindow) {
        overlayWindow.hide();
        overlayWindow.setIgnoreMouseEvents(true);
        console.log(`[Overlay] Hidden (keyboard mode enabled)`);
      }
    }
    // 如果从键盘模式切换到鼠标模式，需要重启应用才能完全生效
    else if (wasKeyboardMode && !KEYBOARD_MODE_ENABLED) {
      console.log(`[Config] Switching from keyboard mode to mouse mode (may need restart)`);
    }
    
    registerKeyboardShortcut();
    console.log(`[Config] Keyboard shortcut updated, re-registered`);
  }

  // 桌面小宠物开关
  if (key === 'enableDesktopPet') {
    ENABLE_DESKTOP_PET = value === true;
    if (ENABLE_DESKTOP_PET) {
      createPetWindow();
    } else {
      destroyPetWindow();
    }
    console.log(`[Config] Desktop pet updated: ${ENABLE_DESKTOP_PET}`);
  }
  
  // 如果修改了鼠标进入/离开解锁配置，立即重新加载
  if (key === 'mouseEnterLeaveWindow' || key === 'mouseEnterLeaveThreshold') {
    const config = loadConfig();
    MOUSE_ENTER_LEAVE_WINDOW = config.mouseEnterLeaveWindow || 3000;
    MOUSE_ENTER_LEAVE_THRESHOLD = config.mouseEnterLeaveThreshold || 5;
    console.log(`[Config] Mouse enter/leave unlock config reloaded: window=${MOUSE_ENTER_LEAVE_WINDOW}ms, threshold=${MOUSE_ENTER_LEAVE_THRESHOLD}`);
    // 注意：mouseEnterLeaveThreshold 的修改需要重启应用才能完全生效
  }
  
  return true;
});

// IPC 处理：重新加载解锁配置
ipcMain.on('reload-unlock-config', () => {
  const config = loadConfig();
  MOUSE_ENTER_LEAVE_WINDOW = config.mouseEnterLeaveWindow || 3000;
  MOUSE_ENTER_LEAVE_THRESHOLD = config.mouseEnterLeaveThreshold || 5;
  MIDDLE_BUTTON_HOLD_TIME = config.middleButtonHoldTime || 1000;
  console.log(`[Config] Unlock config reloaded: enter/leave window=${MOUSE_ENTER_LEAVE_WINDOW}ms, threshold=${MOUSE_ENTER_LEAVE_THRESHOLD}, middle button=${MIDDLE_BUTTON_HOLD_TIME}ms`);
});

// IPC 处理：重启应用
ipcMain.on('restart-app', () => {
  console.log(`[App] Restarting application...`);
  app.relaunch();
  app.exit(0);
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

// IPC 处理：打开本地小说文件
// options: { encoding?: 'utf-8' | 'gbk', filePath?: string }
ipcMain.handle('open-local-novel-file', async (event, options = {}) => {
  try {
    const encoding = (options && options.encoding) || 'utf-8';
    let filePath = options && options.filePath;

    // 如果没有传入 filePath，则弹出选择框
    if (!filePath) {
      const result = await dialog.showOpenDialog({
        title: '选择本地小说文件',
        filters: [
          { name: '小说/文本文件', extensions: ['txt', 'md', 'log', 'text'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      filePath = result.filePaths[0];
    }

    let content = '';

    try {
      const buffer = fs.readFileSync(filePath);
      console.log(`[Local Novel] File size: ${buffer.length} bytes, encoding: ${encoding}`);
      if (encoding === 'gbk') {
        content = decodeGBK(buffer);
        console.log(`[Local Novel] GBK decode completed, content length: ${content.length}`);
        // 检查前100个字符，确保不是乱码
        if (content.length > 0) {
          const preview = content.substring(0, Math.min(100, content.length));
          console.log(`[Local Novel] Content preview (first 100 chars): ${preview}`);
        }
      } else {
        content = buffer.toString('utf-8');
      }
    } catch (readError) {
      console.error('[Local Novel] Failed to read file:', readError);
      return { success: false, error: readError.message || String(readError) };
    }

    return {
      success: true,
      filePath,
      content,
      encoding
    };
  } catch (error) {
    console.error('[Local Novel] Error in open-local-novel-file handler:', error);
    return { success: false, error: error.message || String(error) };
  }
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
  console.log(`[Webview] Script preview (first 200 chars):`, script.substring(0, 200));
  console.log(`[Webview] Webview count: ${webviewContents.length}`);
  
  if (webviewContents.length > 0) {
    const webContents = webviewContents[0];
    const url = webContents.getURL();
    const isLoading = webContents.isLoading();
    
    console.log(`[Webview] Webview URL: ${url}`);
    console.log(`[Webview] Webview is loading: ${isLoading}`);
    console.log(`[Webview] Script length: ${script.length} characters`);
    
    // 如果 webview 还在加载，等待加载完成
    if (isLoading) {
      console.log(`[Webview] Webview is still loading, waiting for dom-ready...`);
      await new Promise((resolve) => {
        const onDomReady = () => {
          webContents.removeListener('dom-ready', onDomReady);
          console.log(`[Webview] Webview DOM ready, proceeding with script execution`);
          resolve();
        };
        webContents.once('dom-ready', onDomReady);
        // 超时保护
        setTimeout(() => {
          webContents.removeListener('dom-ready', onDomReady);
          console.log(`[Webview] Timeout waiting for dom-ready, proceeding anyway`);
          resolve();
        }, 5000);
      });
    }
    
    try {
      console.log(`[Webview] Executing JavaScript script...`);
      
      // 检查脚本是否已经是一个立即执行函数
      const trimmedScript = script.trim();
      const isIIFE = trimmedScript.startsWith('(function()') || trimmedScript.startsWith('function()');
      
      let finalScript = script;
      
      if (!isIIFE) {
        // 简单脚本，包装成函数并返回成功状态
        finalScript = `(function() { try { ${script}; return { success: true }; } catch(e) { return { success: false, error: e.message }; } })();`;
      } else {
        // 已经是立即执行函数，在外层添加错误处理
        // 如果函数内部没有 try-catch，添加外层保护
        if (!script.includes('try {')) {
          // 提取函数体，添加错误处理
          finalScript = `
            (function() {
              try {
                return ${script};
              } catch (error) {
                console.error('[Script Error]', error);
                return { success: false, error: error.message || String(error) };
              }
            })();
          `;
        }
      }
      
      console.log(`[Webview] Final script length: ${finalScript.length} characters`);
      
      // 使用 executeJavaScript 执行脚本
      // 第二个参数 userGesture 设为 true 允许用户手势相关的操作
      const result = await webContents.executeJavaScript(finalScript, true);
      console.log(`[Webview] Script executed successfully`);
      console.log(`[Webview] Result type:`, typeof result);
      
      // 安全地序列化结果
      try {
        const resultStr = JSON.stringify(result, (key, value) => {
          // 过滤掉不可序列化的值
          if (typeof value === 'function') return '[Function]';
          if (value instanceof Error) return value.message;
          if (value instanceof HTMLElement) return '[HTMLElement]';
          if (value instanceof Node) return '[Node]';
          return value;
        });
        console.log(`[Webview] Result:`, resultStr);
      } catch (e) {
        console.log(`[Webview] Result cannot be serialized:`, e.message);
      }
      
      console.log(`[Webview] ===========================================`);
      
      // 如果结果已经是对象且包含 success 字段，清理并返回
      if (result && typeof result === 'object' && result !== null && 'success' in result) {
        // 确保返回的对象是可序列化的，只保留基本类型
        const cleanResult = {};
        for (const key in result) {
          const value = result[key];
          if (value === null || value === undefined) {
            cleanResult[key] = value;
          } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            cleanResult[key] = value;
          } else if (Array.isArray(value)) {
            // 处理数组
            cleanResult[key] = value.map(item => {
              if (typeof item === 'object' && item !== null) {
                const cleanItem = {};
                for (const k in item) {
                  const v = item[k];
                  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
                    cleanItem[k] = v;
                  } else {
                    cleanItem[k] = String(v);
                  }
                }
                return cleanItem;
              }
              return typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean' ? item : String(item);
            });
          } else {
            cleanResult[key] = String(value);
          }
        }
        return cleanResult;
      }
      
      // 否则包装结果
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
