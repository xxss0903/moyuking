// 小说阅读模块
module.exports = {
  id: 'novel',
  name: '看小说',
  icon: '📚',
  description: '阅读网络小说',
  
  // 模块的 HTML 内容
  getContent: () => {
    return `
      <div id="novel-container" style="width: 100%; height: 100%; background: #f5f5f5; overflow-y: auto; padding: 20px; box-sizing: border-box;">
        <div style="max-width: 800px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h2 style="margin-top: 0; color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">小说阅读器</h2>
          
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; color: #666; font-size: 14px;">选择小说网站：</label>
            <select id="novel-site-select" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
              <option value="qidian">起点中文网</option>
              <option value="zongheng">纵横中文网</option>
              <option value="17k">17K小说网</option>
              <option value="custom">自定义网址</option>
            </select>
          </div>
          
          <div id="custom-url-container" style="display: none; margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; color: #666; font-size: 14px;">输入网址：</label>
            <input type="text" id="custom-novel-url" placeholder="https://..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
          </div>
          
          <button id="novel-load-btn" style="width: 100%; padding: 10px; background: #007bff; color: #fff; border: none; border-radius: 4px; font-size: 14px; cursor: pointer; margin-bottom: 20px;">
            加载小说
          </button>
          
          <div id="novel-webview-container" style="display: none; width: 100%; height: 600px; border: 1px solid #ddd; border-radius: 4px; overflow: hidden;">
            <webview id="novel-webview" style="width: 100%; height: 100%; display: flex;" allowpopups></webview>
          </div>
          
          <div id="novel-placeholder" style="text-align: center; color: #999; padding: 40px 0;">
            <p>👆 选择小说网站并点击"加载小说"开始阅读</p>
          </div>
        </div>
      </div>
    `;
  },
  
  // 模块初始化逻辑（返回初始化脚本字符串）
  getInitScript: () => {
    return `
      (function() {
        const siteSelect = document.querySelector('#novel-site-select');
        const customUrlContainer = document.querySelector('#custom-url-container');
        const customUrlInput = document.querySelector('#custom-novel-url');
        const loadBtn = document.querySelector('#novel-load-btn');
        const webviewContainer = document.querySelector('#novel-webview-container');
        const webview = document.querySelector('#novel-webview');
        const placeholder = document.querySelector('#novel-placeholder');
        
        const novelSites = {
          qidian: 'https://www.qidian.com/',
          zongheng: 'http://www.zongheng.com/',
          '17k': 'https://www.17k.com/',
          custom: null
        };
        
        if (siteSelect) {
          siteSelect.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
              customUrlContainer.style.display = 'block';
            } else {
              customUrlContainer.style.display = 'none';
            }
          });
        }
        
        if (loadBtn) {
          loadBtn.addEventListener('click', () => {
            let url = '';
            
            if (siteSelect.value === 'custom') {
              url = customUrlInput.value.trim();
            } else {
              url = novelSites[siteSelect.value];
            }
            
            if (!url) {
              alert('请输入有效的网址');
              return;
            }
            
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
              url = 'https://' + url;
            }
            
            if (webview) {
              webview.src = url;
              webviewContainer.style.display = 'block';
              placeholder.style.display = 'none';
              
              const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
              webview.setAttribute('useragent', ua);
            }
          });
        }
      })();
    `;
  },
  
  // 模块销毁逻辑
  getDestroyScript: () => {
    return `// 清理资源（如果需要）`;
  }
};

