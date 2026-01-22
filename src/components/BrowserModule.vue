<template>
  <div class="browser-container">
    <div class="browser-toolbar">
      <div class="address-group">
        <input
          v-model="urlInput"
          type="text"
          class="address-input"
          placeholder="输入网址或搜索关键字，例如：https://www.baidu.com 或 关键词"
          @keyup.enter="openCurrentUrl"
        />
        <button class="btn primary" @click="openCurrentUrl">打开</button>
        <button class="btn secondary" @click="saveCurrentToPresets">保存为常用</button>
      </div>
      <div v-if="presets.length" class="presets">
        <span class="presets-label">常用地址：</span>
        <button
          v-for="item in presets"
          :key="item.id"
          class="preset-btn"
          :title="item.url"
          @click="openPreset(item)"
        >
          {{ item.name }}
        </button>
      </div>
    </div>

    <div class="browser-webview-wrapper">
      <webview
        id="browser-webview"
        class="browser-webview"
        :src="initialUrl"
        allowpopups
        webpreferences="nodeIntegration=no,contextIsolation=yes,javascript=yes"
        :useragent="userAgent"
      ></webview>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useElectronAPI } from '../composables/useElectronAPI';

const electronAPI = useElectronAPI();

const DEFAULT_HOME = 'https://www.baidu.com/';

const urlInput = ref('');
const initialUrl = ref(DEFAULT_HOME);
const presets = ref([]);

// 与其它模块保持一致的 UA
const userAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

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
    window.alert('请输入有效的网址或搜索内容');
    return;
  }

  urlInput.value = finalUrl;

  // 通过主进程统一跳转当前 webview
  if (electronAPI && electronAPI.navigateWebview) {
    electronAPI.navigateWebview(finalUrl);
  } else {
    // 兜底：直接操作当前模块内的 webview
    const webview = document.querySelector('#browser-webview');
    if (webview) {
      webview.src = finalUrl;
    }
  }
}

function openCurrentUrl() {
  openUrl(urlInput.value);
}

function openPreset(item) {
  if (!item || !item.url) return;
  openUrl(item.url);
}

async function saveCurrentToPresets() {
  const finalUrl = normalizeUrl(urlInput.value || initialUrl.value);
  if (!finalUrl) {
    window.alert('请输入有效的网址后再保存');
    return;
  }

  const name = prompt('请输入名称（例如：公司后台、常用站点名称）', finalUrl);
  if (!name) return;

  const id = Date.now();
  const newPreset = { id, name, url: finalUrl };

  presets.value = [...presets.value, newPreset];

  if (electronAPI && electronAPI.setConfig) {
    try {
      await electronAPI.setConfig('browserPresets', presets.value);
      console.log('[BrowserModule] Presets saved:', presets.value);
    } catch (e) {
      console.error('[BrowserModule] Failed to save presets:', e);
    }
  }
}

onMounted(async () => {
  // 加载常用地址列表
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
      } else {
        initialUrl.value = DEFAULT_HOME;
        urlInput.value = DEFAULT_HOME;
      }
    } catch (e) {
      console.log('[BrowserModule] Failed to load presets or home url:', e && e.message);
      initialUrl.value = DEFAULT_HOME;
      urlInput.value = DEFAULT_HOME;
    }
  } else {
    initialUrl.value = DEFAULT_HOME;
    urlInput.value = DEFAULT_HOME;
  }
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

.presets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
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
}
</style>


