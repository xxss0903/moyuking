<template>
  <div id="toolbar">
    <div id="toolbar-left">
      <span>摸鱼王</span>
      <span id="current-module-name">{{ currentModuleName }}</span>
    </div>
    <div id="toolbar-right">
      <div class="toolbar-btn" id="module-btn" title="选择摸鱼方式" @click="showModulePanel">🎮</div>
      <div class="toolbar-btn" id="settings-btn" title="系统设置" @click="showSettings">⚙</div>
      <div 
        class="toolbar-btn" 
        :class="{ pinned: isPinned }" 
        id="pin-btn" 
        :title="isPinned ? '取消固定窗口' : '固定窗口'" 
        @click="togglePin"
      >
        📌
      </div>
      <div class="toolbar-btn" id="fullscreen-btn" title="视频全屏" @click="triggerFullscreen">⛶</div>
      <div class="toolbar-btn" id="devtools-btn" title="开发者工具" @click="toggleDevtools">🔧</div>
      <div class="toolbar-btn" id="min-btn" title="最小化" @click="minimizeWindow">—</div>
      <div class="toolbar-btn close" id="close-btn" title="关闭" @click="closeWindow">×</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useElectronAPI } from '../composables/useElectronAPI';

const electronAPI = useElectronAPI();
const isPinned = ref(false);

const emit = defineEmits(['show-module-panel', 'show-settings']);

const closeWindow = () => {
  if (electronAPI) {
    electronAPI.closeWindow();
  }
};

const minimizeWindow = () => {
  if (electronAPI) {
    electronAPI.minimizeWindow();
  }
};

const togglePin = async () => {
  if (!electronAPI) return;
  const currentState = await electronAPI.getPinState();
  const newState = !currentState;
  await electronAPI.setPinState(newState);
  isPinned.value = newState;
};

const triggerFullscreen = () => {
  if (electronAPI) {
    electronAPI.triggerWebviewFullscreen();
  }
};

const toggleDevtools = () => {
  if (electronAPI) {
    electronAPI.toggleWebviewDevtools();
  }
};

const showModulePanel = () => {
  emit('show-module-panel');
};

const showSettings = () => {
  emit('show-settings');
};

const loadPinState = async () => {
  if (!electronAPI) return;
  try {
    const pinned = await electronAPI.getPinState();
    isPinned.value = pinned;
  } catch (error) {
    console.error('Failed to load pin state:', error);
  }
};

defineProps({
  currentModuleName: {
    type: String,
    default: '-'
  }
});

onMounted(() => {
  loadPinState();
});
</script>

<style scoped>
#toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  -webkit-app-region: drag;
  user-select: none;
  z-index: 10;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 12px;
}

#toolbar-left {
  opacity: 0.85;
  display: flex;
  align-items: center;
  gap: 8px;
}

#current-module-name {
  font-weight: 500;
}

#toolbar-right {
  display: flex;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.toolbar-btn {
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 14px;
}

.toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.toolbar-btn.close:hover {
  background: rgba(255, 0, 0, 0.6);
}

.toolbar-btn.pinned {
  background: rgba(255, 193, 7, 0.3);
  color: #ffc107;
}

.toolbar-btn.pinned:hover {
  background: rgba(255, 193, 7, 0.5);
}
</style>

