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
      showSettingsPanel();
    });
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

// 显示设置面板
function showSettingsPanel() {
  const panel = document.getElementById('settings-panel');
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

// 设置设置面板
function setupSettingsPanel() {
  const panel = document.getElementById('settings-panel');
  const closeBtn = document.getElementById('settings-close');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (panel) {
        panel.classList.remove('show');
      }
    });
  }

  // 点击背景关闭
  if (panel) {
    panel.addEventListener('click', (e) => {
      if (e.target === panel) {
        panel.classList.remove('show');
      }
    });
  }
}
