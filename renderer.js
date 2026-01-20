// 渲染进程脚本：模块加载、设置界面等

let currentModule = null;
let availableModules = [];

// 初始化
window.addEventListener('DOMContentLoaded', async () => {
  // 绑定工具栏按钮
  setupToolbar();
  
  // 加载可用模块列表
  await loadAvailableModules();
  
  // 加载当前选中的模块
  await loadCurrentModule();
  
  // 设置设置面板
  setupSettingsPanel();
});

// 设置工具栏
function setupToolbar() {
  const closeBtn = document.getElementById('close-btn');
  const minBtn = document.getElementById('min-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const moduleBtn = document.getElementById('module-btn');
  const pinBtn = document.getElementById('pin-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

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
      console.log('Settings button clicked');
      showSystemSettings();
    });
  } else {
    console.error('Settings button not found');
  }

  if (moduleBtn) {
    moduleBtn.addEventListener('click', () => {
      console.log('Module button clicked');
      showModulePanel();
    });
  } else {
    console.error('Module button not found');
  }

  if (pinBtn) {
    // 加载固定状态
    loadPinState();
    
    pinBtn.addEventListener('click', async () => {
      const currentState = await window.electronAPI.getPinState();
      const newState = !currentState;
      await window.electronAPI.setPinState(newState);
      updatePinButton(newState);
    });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      console.log('Fullscreen button clicked');
      if (window.electronAPI && window.electronAPI.triggerWebviewFullscreen) {
        window.electronAPI.triggerWebviewFullscreen();
      }
    });
  }

  const devtoolsBtn = document.getElementById('devtools-btn');
  if (devtoolsBtn) {
    devtoolsBtn.addEventListener('click', () => {
      console.log('Devtools button clicked');
      if (window.electronAPI && window.electronAPI.toggleWebviewDevtools) {
        window.electronAPI.toggleWebviewDevtools();
      }
    });
  }
}

// 加载固定状态
async function loadPinState() {
  try {
    const isPinned = await window.electronAPI.getPinState();
    updatePinButton(isPinned);
  } catch (error) {
    console.error('Failed to load pin state:', error);
  }
}

// 更新固定按钮显示
function updatePinButton(isPinned) {
  const pinBtn = document.getElementById('pin-btn');
  if (pinBtn) {
    if (isPinned) {
      pinBtn.classList.add('pinned');
      pinBtn.title = '取消固定窗口';
    } else {
      pinBtn.classList.remove('pinned');
      pinBtn.title = '固定窗口';
    }
  }
}


// 加载可用模块
async function loadAvailableModules() {
  try {
    const modules = await window.electronAPI.getAvailableModules();
    availableModules = modules;
  } catch (error) {
    console.error('加载模块列表失败:', error);
    // 默认模块
    availableModules = [
      { id: 'douyin', name: '抖音', icon: '📱', description: '刷抖音短视频' },
      { id: 'novel', name: '看小说', icon: '📚', description: '阅读网络小说' }
    ];
  }
}

// 加载当前模块
async function loadCurrentModule() {
  try {
    const moduleId = await window.electronAPI.getCurrentModule();
    await switchModule(moduleId);
  } catch (error) {
    console.error('加载当前模块失败:', error);
    // 默认加载抖音
    await switchModule('douyin');
  }
}

// 切换模块
async function switchModule(moduleId) {
  const container = document.getElementById('module-container');
  if (!container) return;

  // 销毁当前模块
  if (currentModule && currentModule.destroyScript) {
    try {
      eval(currentModule.destroyScript);
    } catch (error) {
      console.error('执行销毁脚本失败:', error);
    }
  }

  // 清空容器
  container.innerHTML = '';

  try {
    // 从主进程加载模块
    const moduleData = await window.electronAPI.loadModule(moduleId);
    
    if (moduleData && moduleData.content) {
      container.innerHTML = moduleData.content;
      
      // 执行初始化脚本
      if (moduleData.initScript) {
        try {
          eval(moduleData.initScript);
        } catch (error) {
          console.error('执行初始化脚本失败:', error);
        }
      }
      
      currentModule = moduleData;
      
      // 更新工具栏显示
      const moduleNameEl = document.getElementById('current-module-name');
      if (moduleNameEl) {
        const module = availableModules.find(m => m.id === moduleId);
        moduleNameEl.textContent = module ? module.icon + ' ' + module.name : '';
      }

      // 更新模块控制栏
      updateModuleControlBar(moduleId);
    }
  } catch (error) {
    console.error('加载模块失败:', error);
    container.innerHTML = '<div style="padding: 20px; color: #999; text-align: center;">模块加载失败</div>';
  }
}

// 更新模块控制栏
function updateModuleControlBar(moduleId) {
  const controlBar = document.getElementById('module-control-bar');
  if (!controlBar) return;

  // 清空控制栏
  controlBar.innerHTML = '';

  if (moduleId === 'douyin') {
    // 抖音模块控制栏
    controlBar.innerHTML = `
      <button class="module-control-btn" id="douyin-home-btn">🏠 主页</button>
      <button class="module-control-btn" id="douyin-page-fullscreen-btn">⛶ 页面全屏</button>
      <button class="module-control-btn" id="douyin-refresh-btn">🔄 刷新</button>
    `;
    controlBar.classList.add('show');

    // 绑定事件
    const homeBtn = document.getElementById('douyin-home-btn');
    const fullscreenBtn = document.getElementById('douyin-page-fullscreen-btn');
    const refreshBtn = document.getElementById('douyin-refresh-btn');

    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        if (window.electronAPI && window.electronAPI.navigateWebview) {
          window.electronAPI.navigateWebview('https://www.douyin.com/');
        }
      });
    }

    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        console.log('[Douyin Control] Page fullscreen button clicked');
        
        if (!window.electronAPI) {
          console.error('[Douyin Control] window.electronAPI is not available');
          return;
        }
        
        if (!window.electronAPI.executeWebviewScript) {
          console.error('[Douyin Control] executeWebviewScript is not available');
          return;
        }
        
        console.log('[Douyin Control] Executing webview script to find and click fullscreen button');
        
        // 点击抖音的 xgplayer-page-full-screen 按钮
        window.electronAPI.executeWebviewScript(`
          (function() {
            console.log('[Webview Script] Starting to find fullscreen button');
            
            // 方法1: 查找 xgplayer-page-full-screen 按钮
            console.log('[Webview Script] Method 1: Looking for .xgplayer-page-full-screen');
            const fullscreenBtn1 = document.querySelector('.xgplayer-page-full-screen');
            if (fullscreenBtn1) {
              console.log('[Webview Script] Found .xgplayer-page-full-screen button, clicking...');
              fullscreenBtn1.click();
              return { success: true, method: 'xgplayer-page-full-screen', element: fullscreenBtn1.className };
            }
            
            // 方法2: 查找包含 xgplayer-page-full-screen 的类
            console.log('[Webview Script] Method 2: Looking for elements with xgplayer-page-full-screen in class');
            const fullscreenBtn2 = document.querySelector('[class*="xgplayer-page-full-screen"]');
            if (fullscreenBtn2) {
              console.log('[Webview Script] Found element with xgplayer-page-full-screen in class, clicking...');
              fullscreenBtn2.click();
              return { success: true, method: 'class-contains-xgplayer-page-full-screen', element: fullscreenBtn2.className };
            }
            
            // 方法3: 查找包含 page-full-screen 的类
            console.log('[Webview Script] Method 3: Looking for elements with page-full-screen in class');
            const fullscreenBtn3 = document.querySelector('[class*="page-full-screen"]');
            if (fullscreenBtn3) {
              console.log('[Webview Script] Found element with page-full-screen in class, clicking...');
              fullscreenBtn3.click();
              return { success: true, method: 'class-contains-page-full-screen', element: fullscreenBtn3.className };
            }
            
            // 方法4: 查找所有包含 fullscreen 的按钮
            console.log('[Webview Script] Method 4: Looking for all buttons/divs with fullscreen in class');
            const buttons = document.querySelectorAll('button, div[role="button"], .xgplayer-controls-item');
            console.log('[Webview Script] Found ' + buttons.length + ' potential buttons');
            
            for (let i = 0; i < buttons.length; i++) {
              const btn = buttons[i];
              const className = btn.className || '';
              const classList = Array.from(btn.classList || []);
              
              if (className.includes('full-screen') || className.includes('fullscreen') || className.includes('page-full')) {
                console.log('[Webview Script] Found button with fullscreen-related class:', className);
                console.log('[Webview Script] Button classList:', classList);
                console.log('[Webview Script] Clicking button...');
                btn.click();
                return { success: true, method: 'search-all-buttons', element: className, index: i };
              }
            }
            
            // 方法5: 查找所有 xgplayer 相关的控制项
            console.log('[Webview Script] Method 5: Looking for xgplayer-controls-item elements');
            const xgplayerItems = document.querySelectorAll('.xgplayer-controls-item');
            console.log('[Webview Script] Found ' + xgplayerItems.length + ' xgplayer-controls-item elements');
            
            for (let i = 0; i < xgplayerItems.length; i++) {
              const item = xgplayerItems[i];
              const className = item.className || '';
              const ariaLabel = item.getAttribute('aria-label') || '';
              const title = item.getAttribute('title') || '';
              
              console.log('[Webview Script] Item ' + i + ' - className:', className, 'aria-label:', ariaLabel, 'title:', title);
              
              if (className.includes('full') || ariaLabel.includes('全屏') || ariaLabel.includes('fullscreen') || title.includes('全屏') || title.includes('fullscreen')) {
                console.log('[Webview Script] Found xgplayer-controls-item with fullscreen-related content, clicking...');
                item.click();
                return { success: true, method: 'xgplayer-controls-item', element: className, ariaLabel: ariaLabel, title: title };
              }
            }
            
            // 方法6: 尝试查找所有可能的全屏相关元素
            console.log('[Webview Script] Method 6: Looking for any element with fullscreen-related attributes');
            const allElements = document.querySelectorAll('*');
            console.log('[Webview Script] Total elements found:', allElements.length);
            
            for (let i = 0; i < Math.min(allElements.length, 1000); i++) {
              const el = allElements[i];
              const className = el.className || '';
              const ariaLabel = el.getAttribute('aria-label') || '';
              const title = el.getAttribute('title') || '';
              const id = el.id || '';
              
              if (className.includes('full') && (className.includes('screen') || className.includes('Screen'))) {
                console.log('[Webview Script] Found element with fullscreen in className:', className);
                console.log('[Webview Script] Element tag:', el.tagName, 'id:', id, 'aria-label:', ariaLabel);
                el.click();
                return { success: true, method: 'search-all-elements', element: className, tag: el.tagName, id: id };
              }
            }
            
            console.log('[Webview Script] Could not find fullscreen button');
            return { success: false, error: 'No fullscreen button found' };
          })();
        `).then((result) => {
          console.log('[Douyin Control] Webview script execution result:', result);
          if (result && result.success) {
            console.log('[Douyin Control] Fullscreen button clicked successfully via method:', result.method);
          } else {
            console.error('[Douyin Control] Failed to click fullscreen button:', result);
          }
        }).catch((error) => {
          console.error('[Douyin Control] Error executing webview script:', error);
        });
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        if (window.electronAPI && window.electronAPI.executeWebviewScript) {
          window.electronAPI.executeWebviewScript('location.reload();');
        }
      });
    }
  } else if (moduleId === 'novel') {
    // 小说模块控制栏
    controlBar.innerHTML = `
      <button class="module-control-btn" id="novel-refresh-btn">🔄 刷新</button>
      <button class="module-control-btn" id="novel-back-btn">← 返回</button>
      <button class="module-control-btn" id="novel-forward-btn">→ 前进</button>
    `;
    controlBar.classList.add('show');

    // 绑定事件
    const refreshBtn = document.getElementById('novel-refresh-btn');
    const backBtn = document.getElementById('novel-back-btn');
    const forwardBtn = document.getElementById('novel-forward-btn');

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        if (window.electronAPI && window.electronAPI.executeWebviewScript) {
          window.electronAPI.executeWebviewScript('location.reload();');
        }
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (window.electronAPI && window.electronAPI.executeWebviewScript) {
          window.electronAPI.executeWebviewScript('window.history.back();');
        }
      });
    }

    if (forwardBtn) {
      forwardBtn.addEventListener('click', () => {
        if (window.electronAPI && window.electronAPI.executeWebviewScript) {
          window.electronAPI.executeWebviewScript('window.history.forward();');
        }
      });
    }
  } else {
    // 其他模块，隐藏控制栏
    controlBar.classList.remove('show');
  }
}

// 显示模块选择面板
function showModulePanel() {
  const panel = document.getElementById('module-panel');
  const moduleList = document.getElementById('module-list');
  
  if (!panel || !moduleList) return;

  // 清空列表
  moduleList.innerHTML = '';

  // 获取当前选中的模块
  window.electronAPI.getCurrentModule().then(currentModuleId => {
    // 创建模块选项
    availableModules.forEach(module => {
      const option = document.createElement('div');
      option.className = 'module-option';
      if (module.id === currentModuleId) {
        option.classList.add('selected');
      }

      option.innerHTML = `
        <span class="module-icon">${module.icon}</span>
        <div class="module-info">
          <div class="module-name">${module.name}</div>
          <div class="module-desc">${module.description}</div>
        </div>
        <div class="radio-indicator"></div>
      `;

      option.addEventListener('click', async () => {
        // 移除其他选中状态
        moduleList.querySelectorAll('.module-option').forEach(el => {
          el.classList.remove('selected');
        });
        // 添加当前选中状态
        option.classList.add('selected');
        
        // 切换模块
        await switchModule(module.id);
        // 保存设置
        await window.electronAPI.setCurrentModule(module.id);
      });

      moduleList.appendChild(option);
    });

    panel.classList.add('show');
  });
}

// 显示系统设置面板
async function showSystemSettings() {
  const panel = document.getElementById('settings-panel');
  const settingsList = document.getElementById('settings-list');
  
  if (!panel || !settingsList) {
    console.error('Settings panel or settings list not found');
    return;
  }

  settingsList.innerHTML = '';

  try {
    // 加载当前配置
    const config = await window.electronAPI.getAllConfig();
    const version = await window.electronAPI.getAppVersion();

    // 版本信息
    const versionItem = document.createElement('div');
    versionItem.className = 'setting-item';
    versionItem.innerHTML = `
      <div class="setting-label">
        <span class="setting-label-text">版本号</span>
        <span style="color: #666; font-size: 12px;">v${version}</span>
      </div>
      <div class="setting-control" style="justify-content: center; margin-top: 8px;">
        <button class="check-update-btn" id="check-update-btn">检查更新</button>
      </div>
    `;
    settingsList.appendChild(versionItem);

    // 检查更新按钮
    const checkUpdateBtn = versionItem.querySelector('#check-update-btn');
    if (checkUpdateBtn) {
      checkUpdateBtn.addEventListener('click', async () => {
        checkUpdateBtn.disabled = true;
        checkUpdateBtn.textContent = '检查中...';
        try {
          await window.electronAPI.checkForUpdates();
          checkUpdateBtn.textContent = '已是最新版本';
          setTimeout(() => {
            checkUpdateBtn.disabled = false;
            checkUpdateBtn.textContent = '检查更新';
          }, 2000);
        } catch (error) {
          checkUpdateBtn.textContent = '检查失败';
          setTimeout(() => {
            checkUpdateBtn.disabled = false;
            checkUpdateBtn.textContent = '检查更新';
          }, 2000);
        }
      });
    }

    // 窗口位置设置
    const positionItem = document.createElement('div');
    positionItem.className = 'setting-item';
    positionItem.innerHTML = `
      <div class="setting-label">
        <span class="setting-label-text">窗口位置</span>
      </div>
      <div class="setting-description">设置窗口在屏幕上的默认位置</div>
      <div class="setting-control" style="margin-top: 8px;">
        <select class="select-control" id="window-position-select">
          <option value="top-left">左上角</option>
          <option value="top-right">右上角</option>
          <option value="bottom-left">左下角</option>
          <option value="bottom-right">右下角</option>
        </select>
      </div>
    `;
    const positionSelect = positionItem.querySelector('#window-position-select');
    positionSelect.value = config.windowPosition || 'top-right';
    positionSelect.addEventListener('change', async (e) => {
      await window.electronAPI.setConfig('windowPosition', e.target.value);
    });
    settingsList.appendChild(positionItem);

    // 默认固定状态
    const defaultPinnedItem = document.createElement('div');
    defaultPinnedItem.className = 'setting-item';
    defaultPinnedItem.innerHTML = `
      <div class="setting-label">
        <span class="setting-label-text">默认固定窗口</span>
        <div class="toggle-switch ${config.defaultPinned ? 'active' : ''}" id="default-pinned-toggle"></div>
      </div>
      <div class="setting-description">启动时是否默认固定窗口（固定后鼠标移出不会隐藏）</div>
    `;
    const defaultPinnedToggle = defaultPinnedItem.querySelector('#default-pinned-toggle');
    defaultPinnedToggle.addEventListener('click', async () => {
      const newValue = !defaultPinnedToggle.classList.contains('active');
      defaultPinnedToggle.classList.toggle('active');
      await window.electronAPI.setConfig('defaultPinned', newValue);
    });
    settingsList.appendChild(defaultPinnedItem);

    // 隐藏延迟设置
    const hideDelayItem = document.createElement('div');
    hideDelayItem.className = 'setting-item';
    hideDelayItem.innerHTML = `
      <div class="setting-label">
        <span class="setting-label-text">隐藏延迟时间</span>
      </div>
      <div class="setting-description">鼠标移出窗口后延迟隐藏的时间（毫秒），0表示立刻隐藏</div>
      <div class="setting-control" style="margin-top: 8px;">
        <input type="number" class="input-control" id="hide-delay-input" min="0" max="10000" step="100" value="${config.hideDelayOnMouseLeave || 0}">
        <span style="color: #666; font-size: 12px;">毫秒</span>
      </div>
    `;
    const hideDelayInput = hideDelayItem.querySelector('#hide-delay-input');
    hideDelayInput.addEventListener('change', async (e) => {
      const value = parseInt(e.target.value) || 0;
      await window.electronAPI.setConfig('hideDelayOnMouseLeave', value);
    });
    settingsList.appendChild(hideDelayItem);

    // 鼠标进入/离开解锁时间窗口设置
    const enterLeaveWindowItem = document.createElement('div');
    enterLeaveWindowItem.className = 'setting-item';
    enterLeaveWindowItem.innerHTML = `
      <div class="setting-label">
        <span class="setting-label-text">进入/离开时间窗口</span>
      </div>
      <div class="setting-description">鼠标进入/离开解锁的时间窗口（毫秒），在此时间内需要达到指定次数</div>
      <div class="setting-control" style="margin-top: 8px;">
        <input type="number" class="input-control" id="enter-leave-window-input" min="1000" max="10000" step="500" value="${config.mouseEnterLeaveWindow || 3000}">
        <span style="color: #666; font-size: 12px;">毫秒</span>
      </div>
    `;
    const enterLeaveWindowInput = enterLeaveWindowItem.querySelector('#enter-leave-window-input');
    enterLeaveWindowInput.addEventListener('change', async (e) => {
      const value = parseInt(e.target.value) || 3000;
      await window.electronAPI.setConfig('mouseEnterLeaveWindow', value);
      // 通知主进程重新加载配置
      await window.electronAPI.reloadUnlockConfig();
    });
    settingsList.appendChild(enterLeaveWindowItem);

    // 鼠标进入/离开解锁次数阈值设置
    const enterLeaveThresholdItem = document.createElement('div');
    enterLeaveThresholdItem.className = 'setting-item';
    enterLeaveThresholdItem.innerHTML = `
      <div class="setting-label">
        <span class="setting-label-text">进入/离开次数阈值</span>
      </div>
      <div class="setting-description">在时间窗口内需要达到的鼠标进入/离开次数</div>
      <div class="setting-control" style="margin-top: 8px;">
        <input type="number" class="input-control" id="enter-leave-threshold-input" min="2" max="10" step="1" value="${config.mouseEnterLeaveThreshold || 3}">
        <span style="color: #666; font-size: 12px;">次</span>
      </div>
    `;
    const enterLeaveThresholdInput = enterLeaveThresholdItem.querySelector('#enter-leave-threshold-input');
    enterLeaveThresholdInput.addEventListener('change', async (e) => {
      const value = parseInt(e.target.value) || 3;
      await window.electronAPI.setConfig('mouseEnterLeaveThreshold', value);
      // 通知主进程重新加载配置
      await window.electronAPI.reloadUnlockConfig();
    });
    settingsList.appendChild(enterLeaveThresholdItem);

    panel.classList.add('show');
  } catch (error) {
    console.error('Failed to load settings:', error);
    settingsList.innerHTML = '<div style="padding: 20px; color: #f44336; text-align: center;">加载设置失败</div>';
  }
}

// 设置面板
function setupSettingsPanel() {
  // 模块选择面板
  const modulePanel = document.getElementById('module-panel');
  const moduleCloseBtn = document.getElementById('module-close');

  if (moduleCloseBtn) {
    moduleCloseBtn.addEventListener('click', () => {
      if (modulePanel) {
        modulePanel.classList.remove('show');
      }
    });
  }

  if (modulePanel) {
    modulePanel.addEventListener('click', (e) => {
      if (e.target === modulePanel) {
        modulePanel.classList.remove('show');
      }
    });
  }

  // 系统设置面板
  const settingsPanel = document.getElementById('settings-panel');
  const settingsCloseBtn = document.getElementById('settings-close');

  if (settingsCloseBtn) {
    settingsCloseBtn.addEventListener('click', () => {
      if (settingsPanel) {
        settingsPanel.classList.remove('show');
      }
    });
  }

  if (settingsPanel) {
    settingsPanel.addEventListener('click', (e) => {
      if (e.target === settingsPanel) {
        settingsPanel.classList.remove('show');
      }
    });
  }
}
