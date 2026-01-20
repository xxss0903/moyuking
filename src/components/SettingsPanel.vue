<template>
  <div id="settings-panel" :class="{ show: visible }" @click.self="close">
    <div id="settings-content">
      <h2>系统设置</h2>
      <div id="settings-list">
        <!-- 版本信息 -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-label-text">版本号</span>
            <span style="color: #666; font-size: 12px;">v{{ version }}</span>
          </div>
          <div class="setting-control" style="justify-content: center; margin-top: 8px;">
            <button 
              class="check-update-btn" 
              :disabled="checkingUpdate"
              @click="checkUpdate"
            >
              {{ updateButtonText }}
            </button>
          </div>
        </div>

        <!-- 窗口位置设置 -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-label-text">窗口位置</span>
          </div>
          <div class="setting-description">设置窗口在屏幕上的默认位置</div>
          <div class="setting-control" style="margin-top: 8px;">
            <select class="select-control" v-model="config.windowPosition" @change="updateConfig('windowPosition', $event.target.value)">
              <option value="top-left">左上角</option>
              <option value="top-right">右上角</option>
              <option value="bottom-left">左下角</option>
              <option value="bottom-right">右下角</option>
            </select>
          </div>
        </div>

        <!-- 默认固定状态 -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-label-text">默认固定窗口</span>
            <div 
              class="toggle-switch" 
              :class="{ active: config.defaultPinned }"
              @click="toggleDefaultPinned"
            ></div>
          </div>
          <div class="setting-description">启动时是否默认固定窗口（固定后鼠标移出不会隐藏）</div>
        </div>

        <!-- 隐藏延迟设置 -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-label-text">隐藏延迟时间</span>
          </div>
          <div class="setting-description">鼠标移出窗口后延迟隐藏的时间（毫秒），0表示立刻隐藏</div>
          <div class="setting-control" style="margin-top: 8px;">
            <input 
              type="number" 
              class="input-control" 
              v-model.number="config.hideDelayOnMouseLeave"
              min="0" 
              max="10000" 
              step="100"
              @change="updateConfig('hideDelayOnMouseLeave', $event.target.value)"
            >
            <span style="color: #666; font-size: 12px;">毫秒</span>
          </div>
        </div>

        <!-- 进入/离开时间窗口 -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-label-text">进入/离开时间窗口</span>
          </div>
          <div class="setting-description">鼠标进入/离开解锁的时间窗口（毫秒），在此时间内需要达到指定次数</div>
          <div class="setting-control" style="margin-top: 8px;">
            <input 
              type="number" 
              class="input-control" 
              v-model.number="config.mouseEnterLeaveWindow"
              min="1000" 
              max="10000" 
              step="500"
              @change="updateEnterLeaveWindow"
            >
            <span style="color: #666; font-size: 12px;">毫秒</span>
          </div>
        </div>

        <!-- 进入/离开次数阈值 -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-label-text">进入/离开次数阈值</span>
          </div>
          <div class="setting-description">在时间窗口内需要达到的鼠标进入/离开次数</div>
          <div class="setting-control" style="margin-top: 8px;">
            <input 
              type="number" 
              class="input-control" 
              v-model.number="config.mouseEnterLeaveThreshold"
              min="2" 
              max="10" 
              step="1"
              @change="updateEnterLeaveThreshold"
            >
            <span style="color: #666; font-size: 12px;">次</span>
          </div>
        </div>

        <!-- 配置文件信息 -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-label-text">配置文件</span>
          </div>
          <div class="setting-description">查看配置文件路径和内容</div>
          <div class="setting-control" style="margin-top: 8px; flex-direction: column; align-items: flex-start; gap: 8px;">
            <div style="font-size: 12px; color: #666; word-break: break-all;">
              路径: {{ configFilePath || '加载中...' }}
            </div>
            <button 
              class="view-config-btn" 
              @click="viewConfigFile"
              :disabled="viewingConfig"
            >
              {{ viewingConfig ? '查看中...' : '查看配置文件内容' }}
            </button>
          </div>
        </div>
      </div>
      <button id="settings-close" @click="close">确定</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useElectronAPI } from '../composables/useElectronAPI';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:visible']);

const electronAPI = useElectronAPI();
const version = ref('1.0.0');
const config = ref({
  windowPosition: 'top-right',
  defaultPinned: false,
  hideDelayOnMouseLeave: 0,
  mouseEnterLeaveWindow: 3000,
  mouseEnterLeaveThreshold: 5
});
const checkingUpdate = ref(false);
const updateButtonText = ref('检查更新');
const thresholdChanged = ref(false); // 跟踪是否修改了阈值
const initialThreshold = ref(5); // 记录初始阈值
const configFilePath = ref(''); // 配置文件路径
const viewingConfig = ref(false); // 是否正在查看配置

const close = async () => {
  // 如果修改了阈值，提示重启
  if (thresholdChanged.value) {
    const shouldRestart = confirm('您已修改了"进入/离开次数阈值"设置，需要重启应用才能生效。\n\n是否现在重启应用？');
    if (shouldRestart) {
      if (electronAPI && electronAPI.restartApp) {
        electronAPI.restartApp();
      }
      return; // 不关闭面板，等待重启
    }
  }
  emit('update:visible', false);
};

const loadConfig = async () => {
  if (!electronAPI) return;
  try {
    const allConfig = await electronAPI.getAllConfig();
    config.value = {
      windowPosition: allConfig.windowPosition || 'top-right',
      defaultPinned: allConfig.defaultPinned || false,
      hideDelayOnMouseLeave: allConfig.hideDelayOnMouseLeave || 0,
      mouseEnterLeaveWindow: allConfig.mouseEnterLeaveWindow || 3000,
      mouseEnterLeaveThreshold: allConfig.mouseEnterLeaveThreshold || 5
    };
    initialThreshold.value = config.value.mouseEnterLeaveThreshold;
    thresholdChanged.value = false; // 重置标记
    version.value = await electronAPI.getAppVersion();
    
    // 加载配置文件路径
    if (electronAPI.getConfigFilePath) {
      configFilePath.value = await electronAPI.getConfigFilePath();
    }
  } catch (error) {
    console.error('Failed to load config:', error);
  }
};

const updateConfig = async (key, value) => {
  if (!electronAPI) return;
  await electronAPI.setConfig(key, value);
};

const toggleDefaultPinned = async () => {
  const newValue = !config.value.defaultPinned;
  config.value.defaultPinned = newValue;
  await updateConfig('defaultPinned', newValue);
};

const updateEnterLeaveWindow = async (e) => {
  const value = parseInt(e.target.value) || 3000;
  config.value.mouseEnterLeaveWindow = value;
  await updateConfig('mouseEnterLeaveWindow', value);
  if (electronAPI) {
    await electronAPI.reloadUnlockConfig();
  }
};

const updateEnterLeaveThreshold = async (e) => {
  const value = parseInt(e.target.value) || 5;
  config.value.mouseEnterLeaveThreshold = value;
  await updateConfig('mouseEnterLeaveThreshold', value);
  // 标记阈值已修改
  if (value !== initialThreshold.value) {
    thresholdChanged.value = true;
  } else {
    thresholdChanged.value = false;
  }
  // 注意：不调用 reloadUnlockConfig，因为需要重启才能完全生效
};

const checkUpdate = async () => {
  if (!electronAPI || checkingUpdate.value) return;
  
  checkingUpdate.value = true;
  updateButtonText.value = '检查中...';
  
  try {
    await electronAPI.checkForUpdates();
    updateButtonText.value = '已是最新版本';
    setTimeout(() => {
      checkingUpdate.value = false;
      updateButtonText.value = '检查更新';
    }, 2000);
  } catch (error) {
    updateButtonText.value = '检查失败';
    setTimeout(() => {
      checkingUpdate.value = false;
      updateButtonText.value = '检查更新';
    }, 2000);
  }
};

const viewConfigFile = async () => {
  if (!electronAPI || viewingConfig.value) return;
  
  viewingConfig.value = true;
  
  try {
    const result = await electronAPI.readConfigFile();
    if (result && result.success) {
      // 在新窗口中显示配置文件内容
      const configWindow = window.open('', '_blank', 'width=800,height=600');
      if (configWindow) {
        configWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>配置文件内容 - moyu_config.json</title>
              <style>
                body {
                  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                  padding: 20px;
                  background: #1e1e1e;
                  color: #d4d4d4;
                }
                pre {
                  background: #252526;
                  padding: 15px;
                  border-radius: 5px;
                  overflow-x: auto;
                  white-space: pre-wrap;
                  word-wrap: break-word;
                }
                .path {
                  color: #569cd6;
                  margin-bottom: 10px;
                  font-size: 12px;
                }
                .error {
                  color: #f48771;
                }
              </style>
            </head>
            <body>
              <div class="path">文件路径: ${result.path}</div>
              <pre>${result.content}</pre>
            </body>
          </html>
        `);
        configWindow.document.close();
      }
    } else {
      alert(`读取配置文件失败: ${result?.error || '未知错误'}`);
    }
  } catch (error) {
    alert(`读取配置文件失败: ${error.message}`);
  } finally {
    viewingConfig.value = false;
  }
};

onMounted(() => {
  loadConfig();
});
</script>

<style scoped>
#settings-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 1000;
  display: none;
  align-items: center;
  justify-content: center;
  -webkit-app-region: no-drag;
}

#settings-panel.show {
  display: flex;
}

#settings-content {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

#settings-content h2 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 20px;
}

.setting-item {
  padding: 16px 0;
  border-bottom: 1px solid #eee;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.setting-label-text {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.setting-description {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  background: #ccc;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.3s;
}

.toggle-switch.active {
  background: #007bff;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.3s;
}

.toggle-switch.active::after {
  transform: translateX(20px);
}

.select-control {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  background: #fff;
}

.input-control {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  width: 100px;
}

.check-update-btn {
  padding: 8px 16px;
  background: #28a745;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.check-update-btn:hover {
  background: #218838;
}

.check-update-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

#settings-close {
  margin-top: 20px;
  width: 100%;
  padding: 10px;
  background: #007bff;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

#settings-close:hover {
  background: #0056b3;
}

.view-config-btn {
  padding: 6px 12px;
  background: #17a2b8;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.view-config-btn:hover {
  background: #138496;
}

.view-config-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>

