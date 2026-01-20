// 抖音模块
module.exports = {
  id: 'douyin',
  name: '抖音',
  icon: '📱',
  description: '刷抖音短视频',
  
  // 模块的 HTML 内容
  getContent: () => {
    return `
      <webview
        id="douyin-webview"
        src="https://www.douyin.com/"
        allowpopups
        webpreferences="nodeIntegration=no,contextIsolation=yes,javascript=yes"
        style="width: 100%; height: 100%; display: flex;"
      ></webview>
    `;
  },
  
  // 模块初始化逻辑（返回初始化脚本字符串，在渲染进程中执行）
  getInitScript: () => {
    return `
      (function() {
        const webview = document.querySelector('#douyin-webview');
        if (webview) {
          const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
          webview.setAttribute('useragent', ua);
          
          // 确保webview支持滚动和全屏
          webview.addEventListener('dom-ready', () => {
            console.log('[Douyin] Webview ready, scrolling and fullscreen enabled');
          });
        }
      })();
    `;
  },
  
  // 模块销毁逻辑（返回销毁脚本字符串）
  getDestroyScript: () => {
    return `// 清理资源（如果需要）`;
  }
};

