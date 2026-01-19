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
    // 不在系统任务栏显示图标，配合全局快捷键和鼠标滑入显示
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webviewTag: true // 允许在 index.html 中使用 <webview>
    }
  });

  // 加载本地 HTML：包含自定义 toolbar + 下方的抖音 webview
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

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



