const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');

/** @type {BrowserWindow | null} */
let mainWindow = null;
let mouseMonitorTimer = null;
let isMouseInsideWindow = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 800,
    minWidth: 360,
    minHeight: 640,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  // 加载抖音网页版
  mainWindow.loadURL('https://www.douyin.com/').then(() => {
    // 在页面里注入我们的鼠标事件监听脚本
    mainWindow.webContents.executeJavaScript(
      require('fs').readFileSync(path.join(__dirname, 'inject.js'), 'utf-8')
    );
  });

  // 可选：设置一个桌面浏览器 UA，防止被识别为特殊环境
  mainWindow.webContents.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  startMouseMonitor();
}

app.whenReady().then(() => {
  createWindow();

  // 注册一个全局快捷键用于再次显示窗口（防止隐藏后找不到）
  globalShortcut.register('CommandOrControl+Shift+D', () => {
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
  // Windows / Linux 直接退出
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 基于鼠标坐标 + 窗口矩形，检测是否移入/移出应用界面
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
      // 鼠标刚进入窗口区域
      isMouseInsideWindow = true;
      mainWindow.show();
      mainWindow.focus();
    } else if (!inside && isMouseInsideWindow) {
      // 鼠标刚离开窗口区域
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

// 处理窗口控制
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



