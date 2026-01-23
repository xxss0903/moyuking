<template>
  <div id="settings-panel" :class="{ show: visible }" @click.self="close">
    <div id="settings-content">
      <h2>系统设置</h2>
      <div id="settings-list">
        <!-- 版本信息（整行布局：标题 + 版本号 + 按钮） -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-label-text">版本号</span>
            <span style="color: #666; font-size: 12px; margin-left: 4px;">v{{ version }}</span>
            <div class="setting-control" style="margin-top: 0;">
              <button 
                class="check-update-btn" 
                :disabled="checkingUpdate"
                @click="checkUpdate"
              >
                {{ updateButtonText }}
              </button>
            </div>
          </div>
        </div>

        <!-- 窗口位置设置（整行：标题 + tip + 下拉框） -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-label-text">
              窗口位置
              <span 
                class="setting-help" 
                title="设置窗口在屏幕上的默认位置"
              >?</span>
            </span>
            <div class="setting-control" style="margin-top: 0;">
              <select class="select-control" v-model="config.windowPosition" @change="updateConfig('windowPosition', $event.target.value)">
                <option value="top-left">左上角</option>
                <option value="top-right">右上角</option>
                <option value="bottom-left">左下角</option>
                <option value="bottom-right">右下角</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 窗口透明度设置（整行：标题 + tip + 输入框） -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-label-text">
              窗口透明度
              <span 
                class="setting-help" 
                title="设置整个应用窗口的透明度，范围 0.2（较透明）~ 1.0（不透明）"
              >?</span>
            </span>
            <div class="setting-control" style="margin-top: 0;">
              <input 
                type="number" 
                class="input-control" 
                v-model.number="config.windowOpacity"
                min="0.2" 
                max="1" 
                step="0.05"
                @change="updateWindowOpacity"
              >
            </div>
          </div>
        </div>

        <!-- 默认固定状态 -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-label-text">
              默认固定窗口
              <span 
                class="setting-help" 
                title="启动时是否默认固定窗口（固定后鼠标移出不会隐藏）"
              >?</span>
            </span>
            <div 
              class="toggle-switch" 
              :class="{ active: config.defaultPinned }"
              @click="toggleDefaultPinned"
            ></div>
          </div>
        </div>

        <!-- 启动时显示位置提示 -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-label-text">
              启动时显示位置提示
              <span 
                class="setting-help" 
                title="启动应用时是否显示窗口位置提示，方便用户知道应用窗口的位置"
              >?</span>
            </span>
            <div 
              class="toggle-switch" 
              :class="{ active: config.showWindowOnStartup }"
              @click="toggleShowWindowOnStartup"
            ></div>
          </div>
        </div>

        <!-- 隐藏时自动暂停视频 -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-label-text">
              隐藏时自动暂停视频
              <span 
                class="setting-help" 
                title="隐藏应用窗口时自动暂停当前视频，重新显示窗口时自动继续播放"
              >?</span>
            </span>
            <div 
              class="toggle-switch" 
              :class="{ active: config.autoPauseOnHide }"
              @click="toggleAutoPauseOnHide"
            ></div>
          </div>
        </div>

        <!-- 隐藏延迟设置（整行：标题 + tip + 输入框） -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-label-text">
              隐藏延迟时间
              <span 
                class="setting-help" 
                title="鼠标移出窗口后延迟隐藏的时间（秒），0 表示立刻隐藏"
              >?</span>
            </span>
            <div class="setting-control" style="margin-top: 0;">
              <input 
                type="number" 
                class="input-control" 
                v-model.number="config.hideDelayOnMouseLeave"
                min="1" 
                max="10" 
                step="0.1"
                @change="updateHideDelay"
              >
              <span style="color: #666; font-size: 12px;">秒</span>
            </div>
          </div>
        </div>

        <!-- 进入/离开时间窗口（整行：标题 + tip + 输入框） -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-label-text">
              进入/离开时间窗口
              <span 
                class="setting-help" 
                title="鼠标进入/离开解锁的时间窗口（毫秒），在此时间内需要达到指定次数"
              >?</span>
            </span>
            <div class="setting-control" style="margin-top: 0;">
              <input 
                type="number" 
                class="input-control" 
                v-model.number="config.mouseEnterLeaveWindow"
                min="800" 
                max="10000" 
                step="100"
                @change="updateEnterLeaveWindow"
              >
              <span style="color: #666; font-size: 12px;">毫秒</span>
            </div>
          </div>
        </div>

        <!-- 进入/离开次数阈值（整行：标题 + tip + 输入框） -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-label-text">
              进入/离开次数阈值
              <span 
                class="setting-help" 
                title="在时间窗口内需要达到的鼠标进入/离开次数"
              >?</span>
            </span>
            <div class="setting-control" style="margin-top: 0;">
              <input 
                type="number" 
                class="input-control" 
                v-model.number="config.mouseEnterLeaveThreshold"
                min="2" 
                max="5" 
                step="1"
                @change="updateEnterLeaveThreshold"
              >
              <span style="color: #666; font-size: 12px;">次</span>
            </div>
          </div>
        </div>

        <!-- 键盘模式 -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-label-text">
              启用键盘模式
              <span 
                class="setting-help" 
                title="启用后使用键盘快捷键显示/隐藏窗口，鼠标模式将禁用"
              >?</span>
            </span>
            <div 
              class="toggle-switch" 
              :class="{ active: config.keyboardModeEnabled }"
              @click="toggleKeyboardMode"
            ></div>
          </div>
        </div>

        <!-- 键盘快捷键设置（仅在键盘模式启用时显示） -->
        <div v-if="config.keyboardModeEnabled" class="setting-item">
          <div class="setting-label">
            <span class="setting-label-text">
              快捷键组合
              <span 
                class="setting-help" 
                title="用于显示/隐藏窗口的快捷键组合，例如：CommandOrControl+Shift+M（Mac: Cmd+Shift+M, Windows: Ctrl+Shift+M）"
              >?</span>
            </span>
            <div class="setting-control" style="margin-top: 0;">
              <input 
                type="text" 
                class="input-control" 
                ref="shortcutInputRef"
                v-model="config.keyboardShortcut"
                placeholder="点击这里，然后按下快捷键组合"
                @keydown.prevent="captureShortcut"
                @focus="onShortcutInputFocus"
                @blur="onShortcutInputBlur"
                @change="updateKeyboardShortcut"
                style="width: 200px;"
              >
              <span style="color: #999; font-size: 11px; margin-left: 8px;">点击输入框后按快捷键</span>
            </div>
          </div>
        </div>

        <!-- 配置文件信息 -->
        <!-- <div class="setting-item">
          <div class="setting-label">
            <span class="setting-label-text">配置文件</span>
            <span 
              class="setting-help" 
              title="查看配置文件路径和内容"
            >?</span>
          </div>
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
        </div> -->
      </div>
      <div style="display: flex; gap: 10px; justify-content: flex-end; padding-top: 10px; border-top: 1px solid #eee;">
        <button id="settings-restart" @click="restartApp">重启应用</button>
        <button id="settings-close" @click="close">确定</button>
      </div>
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
  windowOpacity: 1,
  hideDelayOnMouseLeave: 1, // 默认1000ms（1秒）
  mouseEnterLeaveWindow: 3000,
  mouseEnterLeaveThreshold: 5,
  autoPauseOnHide: true,
  showWindowOnStartup: true,
  keyboardModeEnabled: false,
  keyboardShortcut: 'CommandOrControl+Shift+M'
});
const checkingUpdate = ref(false);
const updateButtonText = ref('检查更新');
const thresholdChanged = ref(false); // 跟踪是否修改了阈值
const initialThreshold = ref(5); // 记录初始阈值
const configFilePath = ref(''); // 配置文件路径
const viewingConfig = ref(false); // 是否正在查看配置
const shortcutInputRef = ref(null); // 快捷键输入框引用
const isCapturingShortcut = ref(false); // 是否正在捕获快捷键

// 重启应用
const restartApp = () => {
  if (electronAPI && electronAPI.restartApp) {
    if (confirm('确定要重启应用吗？')) {
      electronAPI.restartApp();
    }
  }
};

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
    // 将毫秒转换为秒显示
    config.value = {
      windowPosition: allConfig.windowPosition || 'top-right',
      defaultPinned: allConfig.defaultPinned || false,
      windowOpacity: typeof allConfig.windowOpacity === 'number' ? allConfig.windowOpacity : 1,
      hideDelayOnMouseLeave: (allConfig.hideDelayOnMouseLeave || 1000) / 1000, // 毫秒转秒，默认1000ms
      mouseEnterLeaveWindow: allConfig.mouseEnterLeaveWindow || 3000, // 毫秒
      mouseEnterLeaveThreshold: allConfig.mouseEnterLeaveThreshold || 5,
      autoPauseOnHide: allConfig.autoPauseOnHide !== false, // 默认开启
      showWindowOnStartup: allConfig.showWindowOnStartup !== false, // 默认开启
      keyboardModeEnabled: allConfig.keyboardModeEnabled === true, // 默认关闭
      keyboardShortcut: allConfig.keyboardShortcut || 'CommandOrControl+Shift+M'
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

const toggleShowWindowOnStartup = async () => {
  const newValue = !config.value.showWindowOnStartup;
  config.value.showWindowOnStartup = newValue;
  await updateConfig('showWindowOnStartup', newValue);
};

const toggleAutoPauseOnHide = async () => {
  const newValue = !config.value.autoPauseOnHide;
  config.value.autoPauseOnHide = newValue;
  await updateConfig('autoPauseOnHide', newValue);
};

const toggleKeyboardMode = async () => {
  const newValue = !config.value.keyboardModeEnabled;
  config.value.keyboardModeEnabled = newValue;
  await updateConfig('keyboardModeEnabled', newValue);
  // 提示用户需要重启应用才能完全生效
  if (newValue) {
    alert('键盘模式已启用！\n\n提示：如果鼠标模式正在运行，可能需要重启应用才能完全切换到键盘模式。');
  }
};

// 捕获快捷键组合
const captureShortcut = (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  const parts = [];
  
  // 检查修饰键（按 Electron 格式）
  if (e.ctrlKey || e.metaKey) {
    parts.push('CommandOrControl');
  }
  if (e.altKey) {
    parts.push('Alt');
  }
  if (e.shiftKey) {
    parts.push('Shift');
  }
  
  // 获取主键
  let key = '';
  
  // 忽略单独的修饰键按下
  if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
    return;
  }
  
  if (e.key) {
    // 处理特殊键
    const keyMap = {
      'Escape': 'Esc',
      ' ': 'Space',
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
      'Enter': 'Return',
      'Backspace': 'Backspace',
      'Delete': 'Delete',
      'Tab': 'Tab',
      'Home': 'Home',
      'End': 'End',
      'PageUp': 'PageUp',
      'PageDown': 'PageDown',
      'Insert': 'Insert',
      'Clear': 'Clear'
    };
    
    if (keyMap[e.key]) {
      key = keyMap[e.key];
    } else if (e.key.startsWith('F') && /^F\d{1,2}$/.test(e.key)) {
      // 功能键 F1-F24
      key = e.key;
    } else if (e.key.length === 1) {
      // 字母或数字，转为大写
      key = e.key.toUpperCase();
    } else {
      // 其他键，尝试使用原值
      key = e.key;
    }
  } else if (e.code) {
    // 如果 key 不可用，使用 code
    if (e.code.startsWith('Key')) {
      key = e.code.replace('Key', '');
    } else if (e.code.startsWith('Digit')) {
      key = e.code.replace('Digit', '');
    } else if (e.code.startsWith('Numpad')) {
      key = 'Num' + e.code.replace('Numpad', '');
    } else if (/^F\d{1,2}$/.test(e.code)) {
      key = e.code;
    } else {
      // 其他 code，尝试映射
      const codeMap = {
        'Space': 'Space',
        'Enter': 'Return',
        'Escape': 'Esc',
        'ArrowUp': 'Up',
        'ArrowDown': 'Down',
        'ArrowLeft': 'Left',
        'ArrowRight': 'Right'
      };
      key = codeMap[e.code] || e.code;
    }
  }
  
  // 如果只有修饰键没有主键，不更新
  if (!key) {
    return;
  }
  
  // 确保主键不在 parts 中（避免重复）
  if (!parts.includes(key)) {
    parts.push(key);
  }
  
  const shortcut = parts.join('+');
  
  if (shortcut) {
    config.value.keyboardShortcut = shortcut;
    // 自动保存
    updateConfig('keyboardShortcut', shortcut).catch(err => {
      console.error('Failed to save keyboard shortcut:', err);
    });
  }
};

// 快捷键输入框获得焦点
const onShortcutInputFocus = () => {
  isCapturingShortcut.value = true;
  if (shortcutInputRef.value) {
    shortcutInputRef.value.placeholder = '按下快捷键组合...';
  }
};

// 快捷键输入框失去焦点
const onShortcutInputBlur = () => {
  isCapturingShortcut.value = false;
  if (shortcutInputRef.value) {
    shortcutInputRef.value.placeholder = 'CommandOrControl+Shift+M';
  }
};

const updateKeyboardShortcut = async (e) => {
  const value = e.target.value.trim();
  if (!value) {
    config.value.keyboardShortcut = 'CommandOrControl+Shift+M';
    await updateConfig('keyboardShortcut', 'CommandOrControl+Shift+M');
    return;
  }
  config.value.keyboardShortcut = value;
  await updateConfig('keyboardShortcut', value);
};

const updateHideDelay = async (e) => {
  const valueInSeconds = parseFloat(e.target.value) || 1;
  // 确保最少1000ms（1秒）
  const minSeconds = 1;
  const finalSeconds = Math.max(valueInSeconds, minSeconds);
  config.value.hideDelayOnMouseLeave = finalSeconds;
  // 将秒转换为毫秒保存
  const valueInMs = Math.round(finalSeconds * 1000);
  await updateConfig('hideDelayOnMouseLeave', valueInMs);
};

const updateWindowOpacity = async (e) => {
  const value = parseFloat(e.target.value);
  // 默认值 1.0，并限制在 0.2 ~ 1.0 范围内
  const clamped = isNaN(value) ? 1.0 : Math.min(1.0, Math.max(0.2, value));
  config.value.windowOpacity = clamped;
  await updateConfig('windowOpacity', clamped);
};

const updateEnterLeaveWindow = async (e) => {
  const valueInMs = parseInt(e.target.value) || 3000;
  config.value.mouseEnterLeaveWindow = valueInMs;
  // 直接使用毫秒保存
  await updateConfig('mouseEnterLeaveWindow', valueInMs);
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
  display: inline-block;
  min-width: 110px; /* 固定标题宽度，方便对齐问号和控件 */
}

.setting-description {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.setting-help {
  margin-left: 6px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid #ccc;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #666;
  cursor: default;
  background: #f5f5f5;
}

.setting-help:hover {
  background: #e0e0e0;
}

.setting-note {
  font-size: 11px;
  color: #999;
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
  padding: 10px 20px;
  background: #007bff;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  flex: 1;
}

#settings-close:hover {
  background: #0056b3;
}

#settings-restart {
  padding: 10px 20px;
  background: #ff9800;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  flex: 1;
}

#settings-restart:hover {
  background: #f57c00;
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

