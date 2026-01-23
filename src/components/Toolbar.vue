<template>
  <div id="toolbar">
    <div id="toolbar-left">
      <span>摸鱼王</span>
      <span 
        id="current-module-name" 
        @click.stop="showModulePanel"
        title="点击选择摸鱼方式"
      >
        {{ currentModuleName }}
      </span>
    </div>
    <div id="toolbar-right">
      <div 
        class="toolbar-btn" 
        :class="{ active: isDesktopPetEnabled }" 
        id="moyu-btn" 
        :title="isDesktopPetEnabled ? '关闭摸鱼小鱼' : '开启摸鱼小鱼'" 
        @click="toggleDesktopPet"
      >
        🐟
      </div>
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
import { ref, onMounted, onUnmounted } from 'vue';
import { useElectronAPI } from '../composables/useElectronAPI';

const electronAPI = useElectronAPI();
const isPinned = ref(false);
const isDesktopPetEnabled = ref(false);
let configCheckInterval = null;

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

const loadDesktopPetState = async () => {
  if (!electronAPI) return;
  try {
    const config = await electronAPI.getConfig('enableDesktopPet');
    isDesktopPetEnabled.value = config === true;
  } catch (error) {
    console.error('Failed to load desktop pet state:', error);
  }
};

const toggleDesktopPet = async () => {
  if (!electronAPI) return;
  try {
    const newState = !isDesktopPetEnabled.value;
    await electronAPI.setConfig('enableDesktopPet', newState);
    isDesktopPetEnabled.value = newState;
  } catch (error) {
    console.error('Failed to toggle desktop pet:', error);
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
  loadDesktopPetState();
  
  // 定期检查配置变化（每2秒检查一次，确保与设置面板同步）
  configCheckInterval = setInterval(() => {
    loadDesktopPetState();
  }, 2000);
});

onUnmounted(() => {
  if (configCheckInterval) {
    clearInterval(configCheckInterval);
    configCheckInterval = null;
  }
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

#current-module-name {
  font-weight: 500;
  -webkit-app-region: no-drag;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background 0.15s;
}

#current-module-name:hover {
  background: rgba(255, 255, 255, 0.12);
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

.toolbar-btn.active {
  background: rgba(24, 144, 255, 0.3);
  color: #1890ff;
}

.toolbar-btn.active:hover {
  background: rgba(24, 144, 255, 0.5);
}
</style>

