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
    }
  } catch (error) {
    console.error('加载模块失败:', error);
    container.innerHTML = '<div style="padding: 20px; color: #999; text-align: center;">模块加载失败</div>';
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
