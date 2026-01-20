<template>
  <div id="app">
    <Toolbar 
      :current-module-name="currentModuleName"
      @show-module-panel="showModulePanel = true"
      @show-settings="showSettingsPanel = true"
    />
    <ModuleControlBar :module-id="currentModuleId" />
    <div 
      id="module-container" 
      ref="moduleContainer"
      :class="{ 'with-control-bar': showControlBar }"
    ></div>
    <ModulePanel
      v-model:visible="showModulePanel"
      :available-modules="availableModules"
      :current-module-id="currentModuleId"
      @select-module="handleModuleSelect"
    />
    <SettingsPanel
      v-model:visible="showSettingsPanel"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import Toolbar from './components/Toolbar.vue';
import ModuleControlBar from './components/ModuleControlBar.vue';
import ModulePanel from './components/ModulePanel.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import { useModules } from './composables/useModules';

const { 
  availableModules, 
  currentModuleId, 
  currentModule, 
  currentModuleName,
  loadAvailableModules,
  loadCurrentModule,
  switchModule,
  saveCurrentModule
} = useModules();

const showModulePanel = ref(false);
const showSettingsPanel = ref(false);
const moduleContainer = ref(null);

const showControlBar = computed(() => {
  return currentModuleId.value === 'douyin' || currentModuleId.value === 'novel';
});

// 加载模块内容到容器
const loadModuleContent = async (moduleData) => {
  if (!moduleContainer.value || !moduleData || !moduleData.content) return;
  
  // 清空容器
  moduleContainer.value.innerHTML = '';
  
  // 设置内容
  moduleContainer.value.innerHTML = moduleData.content;
  
  // 等待 DOM 更新后执行初始化脚本
  await nextTick();
  if (moduleData.initScript) {
    try {
      eval(moduleData.initScript);
    } catch (error) {
      console.error('执行初始化脚本失败:', error);
    }
  }
};

const handleModuleSelect = async (moduleId) => {
  try {
    await switchModule(moduleId);
    await saveCurrentModule(moduleId);
    showModulePanel.value = false;
    
    // 加载模块内容
    if (currentModule.value) {
      await loadModuleContent(currentModule.value);
    }
  } catch (error) {
    console.error('切换模块失败:', error);
    if (moduleContainer.value) {
      moduleContainer.value.innerHTML = '<div style="padding: 20px; color: #999; text-align: center;">模块加载失败</div>';
    }
  }
};

// 监听模块变化，更新内容
watch(currentModule, async (newModule) => {
  if (newModule) {
    await loadModuleContent(newModule);
  }
}, { immediate: true });

onMounted(async () => {
  // 界面和配置加载完成后，延迟 3 秒再开始加载模块内容（如抖音链接）
  console.log('[App] Vue app mounted, will load modules after 3 seconds...');
  setTimeout(async () => {
    console.log('[App] Loading modules after 3-second delay');
    await loadAvailableModules();
    await loadCurrentModule();
    // 实际内容加载由 watch(currentModule) 负责
  }, 3000);
});
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
}

#app {
  width: 100%;
  height: 100%;
  position: relative;
}

#module-container {
  position: absolute;
  top: 36px;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: calc(100% - 36px);
  overflow: hidden;
}

#module-container.with-control-bar {
  top: 68px;
  height: calc(100% - 68px);
}

/* 全屏模式下隐藏工具栏 */
body:fullscreen #toolbar,
html:fullscreen #toolbar {
  display: none;
}

body:fullscreen #module-container,
html:fullscreen #module-container {
  top: 0;
  height: 100%;
}
</style>

