<template>
  <!--
    渲染架构说明（Vue 版本）
    --------------------------------------
    - 整个 Electron 主窗口的前端 UI 由本组件接管，旧的 renderer.js 已废弃并删除。
    - 结构：
      - Toolbar：顶部工具栏（拖动、关闭、设置、当前模块名称点击打开模块选择面板等）。
      - ModuleControlBar：根据当前模块（抖音 / 小说）展示对应的控制按钮。
      - Vue 模块容器：用于承载使用 Vue 编写的模块（抖音 / 网络小说 / 本地小说等）。
      - #module-container：兼容旧的通过 modules/*.js 提供 HTML 的模块（后续会逐步替换为 Vue）。
      - ModulePanel：模块选择面板（选择抖音 / 小说等）。
      - SettingsPanel：系统设置面板（全部设置项已改为 Vue 实现）。
    - 模块加载方式：
      - Vue 模块（如 douyin / novel / local-novel）直接在模板中挂载对应组件。
      - 旧模块通过 useModules composable 向主进程请求模块描述（HTML + 初始化脚本），
        再将 HTML 字符串写入 #module-container（innerHTML），并执行 initScript。
    - 启动时序：
      - Electron 主进程先加载 moyu_config.json，初始化所有配置。
      - 本 Vue 应用挂载完成后，延迟 3 秒再调用 loadAvailableModules / loadCurrentModule，
        由 watch(currentModule) 触发实际模块内容加载，避免过早访问网页链接。
  -->
  <div id="app">
    <Toolbar 
      :current-module-name="currentModuleName"
      @show-module-panel="showModulePanel = true"
      @show-settings="showSettingsPanel = true"
    />
    <ModuleControlBar :module-id="currentModuleId" />

    <!-- 使用 Vue 实现的模块（抖音 / 小红书 / 网络小说 / 本地小说等） -->
    <div
      v-if="isVueModule"
      id="vue-module-container"
      :class="{ 'with-control-bar': showControlBar }"
    >
      <DouyinModule v-if="currentModuleId === 'douyin'" />
      <XiaohongshuModule v-else-if="currentModuleId === 'xiaohongshu'" />
      <WebNovelModule v-else-if="currentModuleId === 'novel'" />
      <LocalNovelModule v-else-if="currentModuleId === 'local-novel'" />
    </div>

    <!-- 传统模块容器（通过 modules/*.js 提供 HTML + initScript，如抖音、本地小说等） -->
    <div 
      v-else
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
import DouyinModule from './components/DouyinModule.vue';
import XiaohongshuModule from './components/XiaohongshuModule.vue';
import WebNovelModule from './components/WebNovelModule.vue';
import LocalNovelModule from './components/LocalNovelModule.vue';
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

// 使用 Vue 的模块（抖音、小红书、网络小说、本地小说等）
const vueModuleIds = ['douyin', 'xiaohongshu', 'novel', 'local-novel'];

const showControlBar = computed(() => {
  return currentModuleId.value === 'douyin' || currentModuleId.value === 'xiaohongshu' || currentModuleId.value === 'novel';
});

const isVueModule = computed(() => vueModuleIds.includes(currentModuleId.value));

// 加载模块内容到容器
const loadModuleContent = async (moduleData) => {
  // 对于使用 Vue 编写的模块（如 novel），不再通过 innerHTML 注入内容
  if (isVueModule.value) {
    return;
  }

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

#vue-module-container {
  position: absolute;
  top: 36px;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: calc(100% - 36px);
  overflow: hidden;
}

#vue-module-container.with-control-bar {
  top: 68px;
  height: calc(100% - 68px);
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

