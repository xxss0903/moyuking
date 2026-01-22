<template>
  <div class="browser-container">
    <div class="browser-toolbar">
      <div class="address-group">
        <div class="presets-dropdown-wrapper">
          <button 
            class="presets-dropdown-btn" 
            :class="{ 'has-presets': presets.length > 0 }"
            @click="showPresetsDropdown = !showPresetsDropdown"
            :title="presets.length > 0 ? '选择常用地址' : '暂无常用地址'"
          >
            📌 常用地址{{ presets.length > 0 ? ` (${presets.length})` : '' }}
            <span class="dropdown-arrow">{{ showPresetsDropdown ? '▲' : '▼' }}</span>
          </button>
          <div v-if="showPresetsDropdown" class="presets-dropdown">
            <div v-if="presets.length === 0" class="preset-item empty">
              暂无常用地址，点击"保存为常用"按钮添加
            </div>
            <div
              v-for="item in presets"
              :key="item.id"
              class="preset-item"
              :title="item.url"
              @click="selectPreset(item)"
            >
              <span class="preset-name">{{ item.name }}</span>
              <span class="preset-url">{{ item.url }}</span>
              <button 
                class="preset-delete-btn" 
                @click.stop="deletePreset(item.id)"
                title="删除"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
        <input
          v-model="urlInput"
          type="text"
          class="address-input"
          placeholder="输入网址或搜索关键字，例如：https://www.baidu.com 或 关键词"
          @keyup.enter="openCurrentUrl"
        />
        <button class="btn primary" @click="openCurrentUrl">打开</button>
        <button class="btn secondary" @click="saveCurrentToPresets">保存为常用</button>
        <button 
          class="btn mode-toggle" 
          :class="{ 'active': isPhoneMode }"
          @click="togglePhoneMode"
          :title="isPhoneMode ? '切换到桌面模式' : '切换到手机模式'"
        >
          {{ isPhoneMode ? '📱 手机模式' : '💻 桌面模式' }}
        </button>
        <div v-if="isPhoneMode" class="device-size-wrapper">
          <select 
            v-model="selectedDeviceSize" 
            class="device-size-select"
            @change="onDeviceSizeChange"
            title="选择设备尺寸"
          >
            <option 
              v-for="device in deviceSizes" 
              :key="device.id"
              :value="device.id"
            >
              {{ device.name }} ({{ device.width }}px)
            </option>
          </select>
        </div>
      </div>
      <div v-if="presets.length > 0" class="presets-quick">
        <span class="presets-label">快速访问：</span>
        <button
          v-for="item in presets.slice(0, 5)"
          :key="item.id"
          class="preset-btn"
          :title="item.url"
          @click="openPreset(item)"
        >
          {{ item.name }}
        </button>
        <span v-if="presets.length > 5" class="presets-more">...</span>
      </div>
    </div>

    <!-- 对话框 -->
    <div v-if="showDialog" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3 class="dialog-title">{{ dialogTitle }}</h3>
        </div>
        <div class="dialog-body">
          <div v-if="dialogType === 'confirm'" class="dialog-message">
            {{ dialogMessage }}
          </div>
          <div v-else-if="dialogType === 'prompt'" class="dialog-input-wrapper">
            <label class="dialog-label">{{ dialogMessage }}</label>
            <input
              v-model="dialogInputValue"
              type="text"
              class="dialog-input"
              @keyup.enter="confirmDialog"
              @keyup.esc="closeDialog"
              ref="dialogInputRef"
            />
          </div>
        </div>
        <div class="dialog-footer">
          <button class="dialog-btn dialog-btn-cancel" @click="closeDialog">取消</button>
          <button class="dialog-btn dialog-btn-confirm" @click="confirmDialog">确定</button>
        </div>
      </div>
    </div>

    <div class="browser-webview-wrapper">
      <webview
        id="browser-webview"
        ref="webviewRef"
        :key="`webview-${isPhoneMode ? 'phone' : 'desktop'}-${selectedDeviceSize}`"
        class="browser-webview"
        :class="{ 
          'phone-mode': isPhoneMode,
          [`device-${selectedDeviceSize}`]: isPhoneMode
        }"
        :style="isPhoneMode ? { maxWidth: currentDeviceWidth + 'px' } : {}"
        :src="currentWebviewUrl"
        allowpopups
        webpreferences="nodeIntegration=no,contextIsolation=yes,javascript=yes"
        :useragent="currentUserAgent"
      ></webview>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useElectronAPI } from '../composables/useElectronAPI';

const electronAPI = useElectronAPI();

const DEFAULT_HOME = 'https://www.baidu.com/';

const urlInput = ref('');
const initialUrl = ref(DEFAULT_HOME);
const currentWebviewUrl = ref(DEFAULT_HOME);
const presets = ref([]);
const showPresetsDropdown = ref(false);
const isPhoneMode = ref(false);
const selectedDeviceSize = ref('iphone-14');
const webviewRef = ref(null);

// 设备尺寸定义
const deviceSizes = [
  // iPhone 系列
  { id: 'iphone-se', name: 'iPhone SE', width: 375, type: 'phone', ua: 'iphone' },
  { id: 'iphone-12', name: 'iPhone 12/13', width: 390, type: 'phone', ua: 'iphone' },
  { id: 'iphone-14', name: 'iPhone 14', width: 390, type: 'phone', ua: 'iphone' },
  { id: 'iphone-14-pro', name: 'iPhone 14 Pro', width: 393, type: 'phone', ua: 'iphone' },
  { id: 'iphone-14-pro-max', name: 'iPhone 14 Pro Max', width: 430, type: 'phone', ua: 'iphone' },
  { id: 'iphone-15-pro-max', name: 'iPhone 15 Pro Max', width: 430, type: 'phone', ua: 'iphone' },
  // Android 手机
  { id: 'android-small', name: 'Android 小屏', width: 360, type: 'phone', ua: 'android' },
  { id: 'android-medium', name: 'Android 中屏', width: 412, type: 'phone', ua: 'android' },
  { id: 'android-large', name: 'Android 大屏', width: 480, type: 'phone', ua: 'android' },
  // iPad 系列
  { id: 'ipad', name: 'iPad', width: 768, type: 'tablet', ua: 'ipad' },
  { id: 'ipad-pro', name: 'iPad Pro', width: 1024, type: 'tablet', ua: 'ipad' },
  // Android 平板
  { id: 'android-tablet', name: 'Android 平板', width: 600, type: 'tablet', ua: 'android' },
  { id: 'android-tablet-large', name: 'Android 大平板', width: 800, type: 'tablet', ua: 'android' },
];

// 对话框相关
const showDialog = ref(false);
const dialogType = ref(''); // 'confirm' | 'prompt'
const dialogTitle = ref('');
const dialogMessage = ref('');
const dialogInputValue = ref('');
const dialogInputRef = ref(null);
const dialogResolve = ref(null);

// 桌面模式 UA
const desktopUserAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// 不同设备的 User Agent
const userAgents = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};

// 获取当前设备信息
const currentDevice = computed(() => {
  return deviceSizes.find(d => d.id === selectedDeviceSize.value) || deviceSizes[0];
});

// 当前设备宽度
const currentDeviceWidth = computed(() => {
  return currentDevice.value.width;
});

// 当前使用的 UA
const currentUserAgent = computed(() => {
  if (!isPhoneMode.value) {
    return desktopUserAgent;
  }
  const device = currentDevice.value;
  return userAgents[device.ua] || userAgents.iphone;
});

function normalizeUrl(raw) {
  const text = (raw || '').trim();
  if (!text) return '';

  // 简单判断是否像 URL
  if (text.startsWith('http://') || text.startsWith('https://')) {
    return text;
  }

  if (text.includes('.') && !text.includes(' ')) {
    return 'https://' + text;
  }

  // 否则当作搜索关键字，用百度搜索
  const encoded = encodeURIComponent(text);
  return `https://www.baidu.com/s?wd=${encoded}`;
}

async function openUrl(url) {
  const finalUrl = normalizeUrl(url);
  if (!finalUrl) {
    await showConfirmDialog('提示', '请输入有效的网址或搜索内容');
    return;
  }

  urlInput.value = finalUrl;
  currentWebviewUrl.value = finalUrl;

  // 直接操作浏览器模块自己的 webview
  const webview = document.querySelector('#browser-webview');
  if (webview) {
    webview.src = finalUrl;
    console.log('[BrowserModule] Navigating to:', finalUrl);
  } else {
    console.error('[BrowserModule] Browser webview not found');
    await showConfirmDialog('错误', '无法找到浏览器窗口，请刷新页面');
  }
}

// 切换手机/桌面模式
function togglePhoneMode() {
  // 保存当前 URL
  const webview = document.querySelector('#browser-webview');
  if (webview && webview.src && webview.src !== 'about:blank') {
    currentWebviewUrl.value = webview.src;
    urlInput.value = webview.src;
  }
  
  isPhoneMode.value = !isPhoneMode.value;
  
  // 保存模式设置
  if (electronAPI && electronAPI.setConfig) {
    electronAPI.setConfig('browserPhoneMode', isPhoneMode.value).catch(e => {
      console.error('[BrowserModule] Failed to save phone mode:', e);
    });
  }
  
  // 由于使用了 key 属性，Vue 会重新创建 webview，自动应用新的 user agent
  console.log('[BrowserModule] Switched to', isPhoneMode.value ? 'phone' : 'desktop', 'mode');
}

// 设备尺寸改变
function onDeviceSizeChange() {
  // 保存当前 URL
  const webview = document.querySelector('#browser-webview');
  if (webview && webview.src && webview.src !== 'about:blank') {
    currentWebviewUrl.value = webview.src;
    urlInput.value = webview.src;
  }
  
  // 保存设备尺寸设置
  if (electronAPI && electronAPI.setConfig) {
    electronAPI.setConfig('browserDeviceSize', selectedDeviceSize.value).catch(e => {
      console.error('[BrowserModule] Failed to save device size:', e);
    });
  }
  
  console.log('[BrowserModule] Device size changed to:', currentDevice.value.name, currentDevice.value.width + 'px');
}

function openCurrentUrl() {
  openUrl(urlInput.value);
}

function openPreset(item) {
  if (!item || !item.url) return;
  openUrl(item.url);
  showPresetsDropdown.value = false;
}

function selectPreset(item) {
  openPreset(item);
}

// 显示确认对话框
function showConfirmDialog(title, message) {
  return new Promise((resolve) => {
    dialogType.value = 'confirm';
    dialogTitle.value = title;
    dialogMessage.value = message;
    showDialog.value = true;
    dialogResolve.value = resolve;
  });
}

// 显示输入对话框
function showPromptDialog(title, message, defaultValue = '') {
  return new Promise((resolve) => {
    dialogType.value = 'prompt';
    dialogTitle.value = title;
    dialogMessage.value = message;
    dialogInputValue.value = defaultValue;
    showDialog.value = true;
    dialogResolve.value = resolve;
    // 等待 DOM 更新后聚焦输入框
    setTimeout(() => {
      if (dialogInputRef.value) {
        dialogInputRef.value.focus();
        dialogInputRef.value.select();
      }
    }, 100);
  });
}

// 关闭对话框
function closeDialog() {
  showDialog.value = false;
  if (dialogResolve.value) {
    dialogResolve.value(false);
    dialogResolve.value = null;
  }
}

// 确认对话框
function confirmDialog() {
  if (dialogType.value === 'prompt') {
    const value = dialogInputValue.value.trim();
    showDialog.value = false;
    if (dialogResolve.value) {
      dialogResolve.value(value || null);
      dialogResolve.value = null;
    }
  } else {
    showDialog.value = false;
    if (dialogResolve.value) {
      dialogResolve.value(true);
      dialogResolve.value = null;
    }
  }
}

async function deletePreset(id) {
  const confirmed = await showConfirmDialog('删除常用地址', '确定要删除这个常用地址吗？');
  if (!confirmed) return;
  
  presets.value = presets.value.filter(p => p.id !== id);
  
  if (electronAPI && electronAPI.setConfig) {
    try {
      // 转换为纯 JavaScript 对象，避免序列化错误
      const plainPresets = JSON.parse(JSON.stringify(presets.value));
      await electronAPI.setConfig('browserPresets', plainPresets);
      console.log('[BrowserModule] Preset deleted, remaining:', plainPresets);
    } catch (e) {
      console.error('[BrowserModule] Failed to delete preset:', e);
      // 使用对话框显示错误
      await showConfirmDialog('错误', '删除失败：' + (e.message || String(e)));
    }
  }
}

async function saveCurrentToPresets() {
  const finalUrl = normalizeUrl(urlInput.value || initialUrl.value);
  if (!finalUrl) {
    await showConfirmDialog('提示', '请输入有效的网址后再保存');
    return;
  }

  // 检查是否已经存在相同的 URL
  const existingIndex = presets.value.findIndex(p => p.url === finalUrl);
  if (existingIndex >= 0) {
    const update = await showConfirmDialog(
      '更新常用地址',
      `该地址已存在（${presets.value[existingIndex].name}），是否更新名称？`
    );
    if (!update) return;
    
    const name = await showPromptDialog(
      '更新名称',
      '请输入新名称（例如：公司后台、常用站点名称）',
      presets.value[existingIndex].name
    );
    if (!name) return;
    
    presets.value[existingIndex].name = name;
  } else {
    const name = await showPromptDialog(
      '保存常用地址',
      '请输入名称（例如：公司后台、常用站点名称）',
      finalUrl
    );
    if (!name) return;

    const id = Date.now();
    const newPreset = { id, name, url: finalUrl };
    presets.value = [...presets.value, newPreset];
  }

  if (electronAPI && electronAPI.setConfig) {
    try {
      // 转换为纯 JavaScript 对象，避免序列化错误
      const plainPresets = JSON.parse(JSON.stringify(presets.value));
      await electronAPI.setConfig('browserPresets', plainPresets);
      console.log('[BrowserModule] Presets saved:', plainPresets);
      await showConfirmDialog('成功', '保存成功！');
    } catch (e) {
      console.error('[BrowserModule] Failed to save presets:', e);
      await showConfirmDialog('错误', '保存失败：' + (e.message || String(e)));
    }
  }
}

// 点击外部关闭下拉菜单
function handleClickOutside(event) {
  const dropdown = event.target.closest('.presets-dropdown-wrapper');
  if (!dropdown && showPresetsDropdown.value) {
    showPresetsDropdown.value = false;
  }
}

onMounted(async () => {
  // 加载常用地址列表和设置
  if (electronAPI && electronAPI.getConfig) {
    try {
      const savedPresets = await electronAPI.getConfig('browserPresets');
      if (Array.isArray(savedPresets)) {
        presets.value = savedPresets;
      }
      const home = await electronAPI.getConfig('browserHomeUrl');
      if (home && typeof home === 'string') {
        initialUrl.value = home;
        urlInput.value = home;
        currentWebviewUrl.value = home;
      } else {
        initialUrl.value = DEFAULT_HOME;
        urlInput.value = DEFAULT_HOME;
        currentWebviewUrl.value = DEFAULT_HOME;
      }
      // 加载手机模式设置
      const savedPhoneMode = await electronAPI.getConfig('browserPhoneMode');
      if (typeof savedPhoneMode === 'boolean') {
        isPhoneMode.value = savedPhoneMode;
      }
      // 加载设备尺寸设置
      const savedDeviceSize = await electronAPI.getConfig('browserDeviceSize');
      if (typeof savedDeviceSize === 'string' && deviceSizes.find(d => d.id === savedDeviceSize)) {
        selectedDeviceSize.value = savedDeviceSize;
      }
    } catch (e) {
      console.log('[BrowserModule] Failed to load presets or home url:', e && e.message);
      initialUrl.value = DEFAULT_HOME;
      urlInput.value = DEFAULT_HOME;
      currentWebviewUrl.value = DEFAULT_HOME;
    }
  } else {
    initialUrl.value = DEFAULT_HOME;
    urlInput.value = DEFAULT_HOME;
    currentWebviewUrl.value = DEFAULT_HOME;
  }
  
  // 添加点击外部关闭下拉菜单的监听
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.browser-container {
  width: 100%;
  height: 100%;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.browser-toolbar {
  flex: 0 0 auto;
  padding: 8px 10px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.address-group {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.address-input {
  flex: 1;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
  font-size: 13px;
  box-sizing: border-box;
}

.btn {
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid transparent;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.btn.primary {
  background: #007bff;
  border-color: #007bff;
  color: #fff;
}

.btn.secondary {
  background: #f8f9fa;
  border-color: #ddd;
  color: #333;
}

.btn.mode-toggle {
  background: #f8f9fa;
  border-color: #ddd;
  color: #333;
  position: relative;
}

.btn.mode-toggle.active {
  background: #e3f2fd;
  border-color: #2196f3;
  color: #1976d2;
  font-weight: 500;
}

.btn.mode-toggle:hover {
  background: #e9ecef;
}

.btn.mode-toggle.active:hover {
  background: #bbdefb;
}

.device-size-wrapper {
  display: flex;
  align-items: center;
}

.device-size-select {
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
  color: #333;
  outline: none;
  transition: all 0.15s;
  min-width: 180px;
}

.device-size-select:hover {
  border-color: #2196f3;
}

.device-size-select:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.presets-dropdown-wrapper {
  position: relative;
}

.presets-dropdown-btn {
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: #f8f9fa;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
  color: #666;
}

.presets-dropdown-btn.has-presets {
  background: #e3f2fd;
  border-color: #2196f3;
  color: #1976d2;
}

.presets-dropdown-btn:hover {
  background: #e9ecef;
}

.presets-dropdown-btn.has-presets:hover {
  background: #bbdefb;
}

.dropdown-arrow {
  font-size: 10px;
  opacity: 0.7;
}

.presets-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  min-width: 300px;
  max-width: 400px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
}

.preset-item {
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.15s;
}

.preset-item:last-child {
  border-bottom: none;
}

.preset-item:hover {
  background: #f5f5f5;
}

.preset-item.empty {
  color: #999;
  cursor: default;
  justify-content: center;
  padding: 16px;
}

.preset-item.empty:hover {
  background: transparent;
}

.preset-name {
  flex: 0 0 auto;
  font-weight: 500;
  color: #333;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-url {
  flex: 1;
  font-size: 11px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-delete-btn {
  flex: 0 0 auto;
  padding: 2px 6px;
  border: none;
  background: transparent;
  color: #999;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  border-radius: 2px;
  transition: all 0.15s;
}

.preset-delete-btn:hover {
  background: #ffebee;
  color: #f44336;
}

.presets-quick {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}

.presets-label {
  font-size: 12px;
  color: #666;
}

.preset-btn {
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: #f8f9fa;
  font-size: 12px;
  cursor: pointer;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.15s;
}

.preset-btn:hover {
  background: #e3f2fd;
  border-color: #2196f3;
  color: #1976d2;
}

.presets-more {
  font-size: 12px;
  color: #999;
}

/* 对话框样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.dialog-content {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  min-width: 320px;
  max-width: 500px;
  overflow: hidden;
}

.dialog-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.dialog-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.dialog-body {
  padding: 20px;
}

.dialog-message {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.dialog-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dialog-label {
  font-size: 14px;
  color: #666;
}

.dialog-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

.dialog-input:focus {
  border-color: #007bff;
}

.dialog-footer {
  padding: 12px 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.dialog-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.dialog-btn-cancel {
  background: #f5f5f5;
  color: #333;
}

.dialog-btn-cancel:hover {
  background: #e0e0e0;
}

.dialog-btn-confirm {
  background: #007bff;
  color: #fff;
}

.dialog-btn-confirm:hover {
  background: #0056b3;
}

.browser-webview-wrapper {
  flex: 1 1 auto;
  background: #000;
  overflow: hidden;
}

.browser-webview {
  width: 100%;
  height: 100%;
  display: flex;
  transition: all 0.3s ease;
}

.browser-webview.phone-mode {
  margin: 0 auto;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
  border-left: 2px solid #333;
  border-right: 2px solid #333;
  transition: max-width 0.3s ease;
}

/* 不同设备尺寸的样式 */
.browser-webview.device-iphone-se {
  border-radius: 20px;
}

.browser-webview.device-iphone-12,
.browser-webview.device-iphone-14 {
  border-radius: 20px;
}

.browser-webview.device-iphone-14-pro,
.browser-webview.device-iphone-14-pro-max,
.browser-webview.device-iphone-15-pro-max {
  border-radius: 25px;
}

.browser-webview.device-android-small,
.browser-webview.device-android-medium,
.browser-webview.device-android-large {
  border-radius: 15px;
}

.browser-webview.device-ipad,
.browser-webview.device-ipad-pro {
  border-radius: 10px;
  border-left: 3px solid #333;
  border-right: 3px solid #333;
}

.browser-webview.device-android-tablet,
.browser-webview.device-android-tablet-large {
  border-radius: 10px;
}
</style>


