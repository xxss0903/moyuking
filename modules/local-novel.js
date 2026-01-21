// 本地小说阅读模块
module.exports = {
  id: 'local-novel',
  name: '本地小说',
  icon: '📖',
  description: '导入本地小说文件阅读（支持 txt 等文本格式）',

  // 模块的 HTML 内容
  getContent: () => {
    return `
      <div id="local-novel-container" style="width: 100%; height: 100%; background: #f5f5f5; overflow: hidden; padding: 16px; box-sizing: border-box; display: flex; flex-direction: column;">
        <div style="flex: 0 0 auto; max-width: 900px; width: 100%; margin: 0 auto 12px auto; background: #fff; padding: 12px 16px; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 12px; color: #444;">
          <div style="font-weight: 600; margin-right: 8px;">本地小说阅读器</div>
          <button id="local-novel-import-btn" style="padding: 6px 12px; border-radius: 4px; border: none; background: #007bff; color: #fff; cursor: pointer; font-size: 12px;">📂 导入本地小说文件</button>
          <span id="local-novel-file-name" style="margin-left: 4px; color: #666; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">未选择文件</span>
          <div style="flex: 1 1 100%; height: 0;"></div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span>自动滚动</span>
            <button id="local-novel-toggle-scroll-btn" style="padding: 4px 10px; border-radius: 4px; border: none; background: #28a745; color: #fff; cursor: pointer; font-size: 12px;">开始</button>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-left: 12px;">
            <span>速度</span>
            <input id="local-novel-speed-range" type="range" min="1" max="10" value="3" style="width: 120px;">
            <span id="local-novel-speed-label">3</span>
          </div>
        </div>

        <div id="local-novel-reader" style="flex: 1 1 auto; max-width: 900px; width: 100%; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.12); overflow-y: auto; padding: 20px; box-sizing: border-box; line-height: 1.7; font-size: 14px; color: #333; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;">
          <div id="local-novel-placeholder" style="text-align: center; color: #999; padding: 40px 0; font-size: 13px;">
            <p>📂 点击上方“导入本地小说文件”按钮，选择本地 txt 等文本文件开始阅读</p>
            <p style="margin-top: 4px;">支持常见文本格式：txt、md、log、text 等（按 UTF-8 文本方式读取）</p>
          </div>
          <div id="local-novel-content" style="white-space: pre-wrap; word-wrap: break-word; display: none;"></div>
        </div>
      </div>
    `;
  },

  // 模块初始化逻辑（返回初始化脚本字符串）
  getInitScript: () => {
    return `
      (function() {
        console.log('[Local Novel] Init script running');

        const importBtn = document.querySelector('#local-novel-import-btn');
        const fileNameEl = document.querySelector('#local-novel-file-name');
        const contentEl = document.querySelector('#local-novel-content');
        const placeholderEl = document.querySelector('#local-novel-placeholder');
        const readerEl = document.querySelector('#local-novel-reader');
        const toggleScrollBtn = document.querySelector('#local-novel-toggle-scroll-btn');
        const speedRange = document.querySelector('#local-novel-speed-range');
        const speedLabel = document.querySelector('#local-novel-speed-label');

        if (!readerEl) {
          console.log('[Local Novel] Reader element not found, abort init');
          return;
        }

        // 自动滚动相关状态（挂到 window 上，方便销毁脚本清理）
        window.__localNovelAutoScrollTimer = null;
        window.__localNovelAutoScrollEnabled = false;

        function updateSpeedLabel() {
          if (speedRange && speedLabel) {
            speedLabel.textContent = speedRange.value;
          }
        }

        function stopAutoScroll() {
          if (window.__localNovelAutoScrollTimer) {
            clearInterval(window.__localNovelAutoScrollTimer);
            window.__localNovelAutoScrollTimer = null;
          }
          window.__localNovelAutoScrollEnabled = false;
          if (toggleScrollBtn) {
            toggleScrollBtn.textContent = '开始';
            toggleScrollBtn.style.background = '#28a745';
          }
        }

        function startAutoScroll() {
          stopAutoScroll();

          if (!contentEl || contentEl.style.display === 'none') {
            console.log('[Local Novel] No content to scroll, ignore auto scroll start');
            return;
          }

          const baseStep = 1; // 基础步长（像素）
          const stepFactor = 1; // 每档速度增加的倍数

          let speedValue = 3;
          if (speedRange) {
            const v = parseInt(speedRange.value, 10);
            if (!isNaN(v)) speedValue = v;
          }

          const step = baseStep + (speedValue - 1) * stepFactor;
          console.log('[Local Novel] Start auto scroll with speed value:', speedValue, 'step(px):', step);

          window.__localNovelAutoScrollEnabled = true;
          if (toggleScrollBtn) {
            toggleScrollBtn.textContent = '暂停';
            toggleScrollBtn.style.background = '#dc3545';
          }

          window.__localNovelAutoScrollTimer = setInterval(() => {
            if (!window.__localNovelAutoScrollEnabled || !readerEl) return;
            const maxScroll = readerEl.scrollHeight - readerEl.clientHeight;
            if (readerEl.scrollTop >= maxScroll) {
              console.log('[Local Novel] Reached bottom, stop auto scroll');
              stopAutoScroll();
              return;
            }
            readerEl.scrollTop += step;
          }, 50);
        }

        if (speedRange) {
          speedRange.addEventListener('input', () => {
            updateSpeedLabel();
          });
        }
        updateSpeedLabel();

        if (toggleScrollBtn) {
          toggleScrollBtn.addEventListener('click', () => {
            if (window.__localNovelAutoScrollEnabled) {
              stopAutoScroll();
            } else {
              startAutoScroll();
            }
          });
        }

        if (importBtn) {
          importBtn.addEventListener('click', async () => {
            try {
              if (!window.electronAPI || !window.electronAPI.openLocalNovelFile) {
                alert('当前版本不支持本地小说导入，请更新应用或重启后重试');
                console.error('[Local Novel] electronAPI.openLocalNovelFile is not available');
                return;
              }

              const result = await window.electronAPI.openLocalNovelFile();
              console.log('[Local Novel] openLocalNovelFile result:', result);

              if (!result || !result.success) {
                if (result && result.error) {
                  console.error('[Local Novel] Failed to open file:', result.error);
                }
                return;
              }

              const filePath = result.filePath || '';
              const content = result.content || '';

              if (!content) {
                alert('文件内容为空或读取失败');
                return;
              }

              const fileName = filePath.split(/[/\\\\]/).pop() || '本地小说';
              if (fileNameEl) {
                fileNameEl.textContent = fileName;
                fileNameEl.title = filePath;
              }

              if (placeholderEl && contentEl) {
                placeholderEl.style.display = 'none';
                contentEl.style.display = 'block';
                contentEl.textContent = content;
              }

              // 导入新小说后回到顶部并停止自动滚动
              readerEl.scrollTop = 0;
              stopAutoScroll();
            } catch (error) {
              console.error('[Local Novel] Error while importing local novel:', error);
              alert('读取本地小说文件时出错：' + (error && error.message ? error.message : String(error)));
            }
          });
        }

        console.log('[Local Novel] Init script finished');
      })();
    `;
  },

  // 模块销毁逻辑
  getDestroyScript: () => {
    return `
      (function() {
        try {
          if (window.__localNovelAutoScrollTimer) {
            clearInterval(window.__localNovelAutoScrollTimer);
            window.__localNovelAutoScrollTimer = null;
          }
          window.__localNovelAutoScrollEnabled = false;
          console.log('[Local Novel] Destroy script executed, auto scroll cleared');
        } catch (e) {
          console.log('[Local Novel] Destroy script error:', e && e.message);
        }
      })();
    `;
  }
};


