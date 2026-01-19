// 渲染进程脚本：绑定 toolbar 按钮、配置 webview UA 等

window.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('close-btn');
  const minBtn = document.getElementById('min-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const webview = document.getElementById('douyin-webview');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (window.electronAPI && window.electronAPI.closeWindow) {
        window.electronAPI.closeWindow();
      }
    });
  }

  if (minBtn) {
    minBtn.addEventListener('click', () => {
      if (window.electronAPI && window.electronAPI.minimizeWindow) {
        window.electronAPI.minimizeWindow();
      }
    });
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      // 这里可以后续打开你自己的设置界面
      console.log('打开设置面板（待实现）');
    });
  }

  if (webview) {
    // 配置一个桌面浏览器 UA，避免被识别为机器人
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
    webview.setAttribute('useragent', ua);
  }
});


