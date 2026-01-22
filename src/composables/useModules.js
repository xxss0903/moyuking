import { ref } from 'vue';
import { useElectronAPI } from './useElectronAPI';

export function useModules() {
  const electronAPI = useElectronAPI();
  const availableModules = ref([]);
  const currentModuleId = ref(null);
  const currentModule = ref(null);
  const currentModuleName = ref('-');

  // 加载可用模块列表
  const loadAvailableModules = async () => {
    if (!electronAPI) return;
    
    try {
      const modules = await electronAPI.getAvailableModules();
      const list = Array.isArray(modules) ? [...modules] : [];

      // 确保 Vue 模块（抖音 / 小红书 / 浏览器 / 本地小说）在列表中，即使不再由 modules 目录提供
      if (!list.find(m => m.id === 'douyin')) {
        list.push({
          id: 'douyin',
          name: '抖音',
          icon: '📱',
          description: '刷抖音短视频'
        });
      }

      if (!list.find(m => m.id === 'xiaohongshu')) {
        list.push({
          id: 'xiaohongshu',
          name: '小红书',
          icon: '📕',
          description: '刷小红书笔记'
        });
      }

      if (!list.find(m => m.id === 'browser')) {
        list.push({
          id: 'browser',
          name: '浏览器',
          icon: '🌐',
          description: '输入网址或搜索关键字进行浏览'
        });
      }

      if (!list.find(m => m.id === 'local-novel')) {
        list.push({
          id: 'local-novel',
          name: '本地小说',
          icon: '📖',
          description: '导入本地 txt 等小说文件阅读'
        });
      }

      availableModules.value = list;
    } catch (error) {
      console.error('加载模块列表失败:', error);
      // 默认模块
      availableModules.value = [
        { id: 'douyin', name: '抖音', icon: '📱', description: '刷抖音短视频' },
        { id: 'novel', name: '看小说', icon: '📚', description: '阅读网络小说' },
        { id: 'local-novel', name: '本地小说', icon: '📖', description: '导入本地 txt 等小说文件阅读' }
      ];
    }
  };

  // 加载当前模块
  const loadCurrentModule = async () => {
    if (!electronAPI) return;
    
    try {
      const moduleId = await electronAPI.getCurrentModule();
      await switchModule(moduleId);
    } catch (error) {
      console.error('加载当前模块失败:', error);
      // 默认加载抖音
      await switchModule('douyin');
    }
  };

  // 使用 Vue 的模块（不依赖 modules/*.js 提供 content/initScript）
  const vueModuleIds = ['douyin', 'xiaohongshu', 'browser', 'novel', 'local-novel'];

  // 切换模块
  const switchModule = async (moduleId) => {
    if (!electronAPI) return;

    // 销毁当前模块（仅对非 Vue 模块执行 destroyScript）
    if (!vueModuleIds.includes(currentModuleId.value) && currentModule.value && currentModule.value.destroyScript) {
      try {
        eval(currentModule.value.destroyScript);
      } catch (error) {
        console.error('执行销毁脚本失败:', error);
      }
    }

    // Vue 模块不再从主进程加载 HTML / 脚本，仅更新当前模块 ID 和名称
    if (vueModuleIds.includes(moduleId)) {
      currentModuleId.value = moduleId;
      currentModule.value = null;

      const module = availableModules.value.find(m => m.id === moduleId);
      currentModuleName.value = module ? module.icon + ' ' + module.name : '';

      return null;
    }

    try {
      // 从主进程加载非 Vue 模块（如抖音等）
      const moduleData = await electronAPI.loadModule(moduleId);
      
      if (moduleData && moduleData.content) {
        currentModule.value = moduleData;
        currentModuleId.value = moduleId;
        
        // 更新模块名称显示
        const module = availableModules.value.find(m => m.id === moduleId);
        currentModuleName.value = module ? module.icon + ' ' + module.name : '';
        
        return moduleData;
      }
    } catch (error) {
      console.error('加载模块失败:', error);
      throw error;
    }
  };

  // 保存当前模块设置
  const saveCurrentModule = async (moduleId) => {
    if (!electronAPI) return;
    await electronAPI.setCurrentModule(moduleId);
  };

  return {
    availableModules,
    currentModuleId,
    currentModule,
    currentModuleName,
    loadAvailableModules,
    loadCurrentModule,
    switchModule,
    saveCurrentModule
  };
}

