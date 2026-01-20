const { ipcRenderer } = require('electron');

// 在 preload 中设置事件监听
function setupMouseListeners() {
  // 监听鼠标中键按下
  window.addEventListener('mousedown', (e) => {
    if (e.button === 1) { // 中键
      e.preventDefault();
      ipcRenderer.send('middle-button-pressed');
    }
  }, true);

  // 监听鼠标中键释放
  window.addEventListener('mouseup', (e) => {
    if (e.button === 1) { // 中键
      e.preventDefault();
      ipcRenderer.send('middle-button-released');
    }
  }, true);

  // 阻止中键的默认行为（滚动）
  window.addEventListener('wheel', (e) => {
    e.preventDefault();
  }, { passive: false });
}

// DOM 加载完成后设置监听器
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupMouseListeners);
} else {
  setupMouseListeners();
}

