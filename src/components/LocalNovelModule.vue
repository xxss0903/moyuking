<template>
  <div
    id="local-novel-container"
    class="local-novel-container"
  >
    <div class="local-novel-toolbar">
      <div class="title">本地小说阅读器</div>
      <button class="primary-btn" @click="onImportClick">📂 导入本地小说文件</button>
      <span class="file-name" :title="filePath || '未选择文件'">
        {{ fileName || '未选择文件' }}
      </span>
      <div class="spacer"></div>
      <div class="toolbar-group">
        <span>编码</span>
        <select v-model="encoding" class="encoding-select" @change="onEncodingChange">
          <option value="utf-8">UTF-8</option>
          <option value="gbk">GBK(简体中文常见)</option>
        </select>
      </div>
      <div class="toolbar-group">
        <span>自动滚动</span>
        <button
          class="toggle-btn"
          :class="{ active: autoScrollEnabled }"
          @click="toggleAutoScroll"
        >
          {{ autoScrollEnabled ? '暂停' : '开始' }}
        </button>
      </div>
      <div class="toolbar-group">
        <span>速度</span>
        <input
          v-model.number="speed"
          type="range"
          min="1"
          max="10"
          class="speed-range"
        />
        <span class="speed-label">{{ speed }}</span>
      </div>
      <div class="toolbar-group">
        <span>字号</span>
        <input
          v-model.number="fontSize"
          type="number"
          min="10"
          max="28"
          class="font-size-input"
        />
        <span class="unit-label">px</span>
      </div>
      <div class="toolbar-group">
        <label class="bold-toggle">
          <input type="checkbox" v-model="isBold" />
          加粗
        </label>
      </div>
      <div class="toolbar-group">
        <span>字体</span>
        <select v-model="fontFamily" class="font-family-select">
          <option value="'Microsoft YaHei', sans-serif">雅黑</option>
          <option value="'PingFang SC', sans-serif">苹方</option>
          <option value="'SimSun', serif">宋体</option>
          <option value="'SimHei', sans-serif">黑体</option>
          <option value="system">系统默认</option>
        </select>
      </div>
    </div>

    <div class="local-novel-reader" ref="readerRef">
      <div v-if="!pages.length" class="placeholder">
        <p>📂 点击上方「导入本地小说文件」按钮，选择本地 txt 等文本文件开始阅读</p>
        <p>支持常见文本格式：txt、md、log、text 等，可切换 UTF-8 / GBK 编码</p>
      </div>
      <div
        v-else
        class="novel-content"
        :style="contentStyle"
      >
        {{ currentPageContent }}
      </div>

      <div v-if="pages.length" class="pager">
        <button
          class="pager-btn"
          :disabled="currentPageIndex <= 0"
          @click="goPrevPage"
        >
          上一页
        </button>

        <span class="page-info">
          第 {{ currentPageIndex + 1 }} / {{ totalPages }} 页
        </span>

        <select
          v-model.number="currentPageIndex"
          class="page-select"
          @change="onPageSelect"
        >
          <option
            v-for="(p, idx) in pages"
            :key="idx"
            :value="idx"
          >
            第 {{ idx + 1 }} 页
          </option>
        </select>

        <button
          class="pager-btn"
          :disabled="currentPageIndex >= totalPages - 1"
          @click="goNextPage"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useElectronAPI } from '../composables/useElectronAPI';

const electronAPI = useElectronAPI();

const readerRef = ref(null);

const filePath = ref('');
const fileName = computed(() => {
  if (!filePath.value) return '';
  const parts = filePath.value.split(/[/\\]/);
  return parts[parts.length - 1] || '';
});

const encoding = ref('utf-8');
const fullText = ref('');
const pages = ref([]);
const pageSize = ref(2000);
const currentPageIndex = ref(0);

const autoScrollEnabled = ref(false);
let autoScrollTimer = null; // 用于保存 requestAnimationFrame 的 id
let lastTimestamp = null;
let saveStateTimer = null;
let wasAutoBeforeHide = false;

const speed = ref(3);
const fontSize = ref(14);
const isBold = ref(false);
const fontFamily = ref('system');

const totalPages = computed(() => pages.value.length);
const currentPageContent = computed(() => {
  if (!pages.value.length) return '';
  const idx = Math.min(Math.max(currentPageIndex.value, 0), pages.value.length - 1);
  return pages.value[idx];
});

const contentStyle = computed(() => {
  const family =
    fontFamily.value === 'system'
      ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
      : fontFamily.value;

  return {
    fontSize: `${fontSize.value || 14}px`,
    fontWeight: isBold.value ? '600' : '400',
    fontFamily: family
  };
});

function buildPages(text) {
  fullText.value = text || '';
  pages.value = [];
  currentPageIndex.value = 0;

  if (!text) return;

  const size = pageSize.value;
  for (let i = 0; i < text.length; i += size) {
    pages.value.push(text.slice(i, i + size));
  }
}

async function renderPage() {
  if (!pages.value.length) return;

  if (currentPageIndex.value < 0) currentPageIndex.value = 0;
  if (currentPageIndex.value >= pages.value.length) {
    currentPageIndex.value = pages.value.length - 1;
  }

  await nextTick();
  if (readerRef.value) {
    readerRef.value.scrollTop = 0;
  }
}

function scheduleSaveState() {
  if (!electronAPI || !electronAPI.setConfig) return;
  if (saveStateTimer) {
    clearTimeout(saveStateTimer);
  }
  saveStateTimer = setTimeout(async () => {
    try {
      if (!filePath.value) return;
      const payload = {
        filePath: filePath.value,
        encoding: encoding.value,
        currentPage: currentPageIndex.value,
        scrollTop: readerRef.value ? readerRef.value.scrollTop : 0
      };
      await electronAPI.setConfig('localNovelLastState', payload);
      console.log('[LocalNovelVue] Reading state saved:', payload);
    } catch (e) {
      console.log('[LocalNovelVue] Failed to save reading state:', e && e.message);
    }
  }, 500);
}

function stopAutoScroll() {
  if (autoScrollTimer) {
    cancelAnimationFrame(autoScrollTimer);
    autoScrollTimer = null;
  }
  lastTimestamp = null;
  autoScrollEnabled.value = false;
}

function internalStartAutoScroll() {
  if (!readerRef.value || !pages.value.length) return;

  stopAutoScroll();

  // 使用基于时间的速度映射，保证低速也能平顺滚动
  // 速度单位：像素/秒，1 档约 20px/s，10 档约 200px/s
  const baseSpeed = 20;
  const speedFactor = 20;

  let speedValue = speed.value || 3;
  if (speedValue < 1) speedValue = 1;
  if (speedValue > 10) speedValue = 10;

  const speedPerSecond = baseSpeed + (speedValue - 1) * speedFactor;
  console.log('[LocalNovelVue] Start auto scroll, speed level:', speedValue, 'speed(px/s):', speedPerSecond);

  autoScrollEnabled.value = true;

  const stepFrame = (timestamp) => {
    if (!autoScrollEnabled.value || !readerRef.value) {
      lastTimestamp = null;
      return;
    }

    if (lastTimestamp == null) {
      lastTimestamp = timestamp;
    }
    const deltaSec = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    const maxScroll = readerRef.value.scrollHeight - readerRef.value.clientHeight;

    if (readerRef.value.scrollTop >= maxScroll) {
      // 到达当前页底部：如果还有下一页，自动翻页并继续滚动；否则停止
      if (currentPageIndex.value < pages.value.length - 1) {
        const wasAuto = autoScrollEnabled.value;
        currentPageIndex.value += 1;
        console.log('[LocalNovelVue] Reached bottom, auto go to next page:', currentPageIndex.value + 1);
        stopAutoScroll();
        renderPage().then(() => {
          scheduleSaveState();
          if (wasAuto) {
            setTimeout(() => {
              internalStartAutoScroll();
            }, 1000);
          }
        });
      } else {
        console.log('[LocalNovelVue] Reached last page bottom, stop auto scroll');
        stopAutoScroll();
      }
      return;
    }

    const delta = speedPerSecond * deltaSec;
    readerRef.value.scrollTop += delta;

    autoScrollTimer = requestAnimationFrame(stepFrame);
  };

  autoScrollTimer = requestAnimationFrame(stepFrame);
}

function toggleAutoScroll() {
  if (autoScrollEnabled.value) {
    stopAutoScroll();
  } else {
    internalStartAutoScroll();
  }
}

async function loadFileWithEncoding(options) {
  if (!electronAPI || !electronAPI.openLocalNovelFile) return;

  try {
    const result = await electronAPI.openLocalNovelFile(options);
    console.log('[LocalNovelVue] openLocalNovelFile result:', result);

    if (!result || !result.success) {
      if (result && result.error) {
        console.error('[LocalNovelVue] Failed to open file:', result.error);
      }
      return;
    }

    const path = result.filePath || (options && options.filePath) || '';
    const content = result.content || '';
    const enc = result.encoding || (options && options.encoding) || 'utf-8';

    if (!content) {
      window.alert('文件内容为空或读取失败');
      return;
    }

    filePath.value = path;
    encoding.value = enc;

    buildPages(content);
    await renderPage();
    stopAutoScroll();
    scheduleSaveState();
  } catch (error) {
    console.error('[LocalNovelVue] Error while loading local novel:', error);
    window.alert('读取本地小说文件时出错：' + (error && error.message ? error.message : String(error)));
  }
}

function onImportClick() {
  const enc = encoding.value || 'utf-8';
  loadFileWithEncoding({ encoding: enc });
}

function onEncodingChange() {
  if (!filePath.value) return;
  const enc = encoding.value || 'utf-8';
  console.log('[LocalNovelVue] Encoding changed, reload file with encoding:', enc);
  loadFileWithEncoding({ encoding: enc, filePath: filePath.value });
}

function goPrevPage() {
  if (!pages.value.length) return;
  if (currentPageIndex.value <= 0) return;
  const wasAuto = autoScrollEnabled.value;
  stopAutoScroll();
  currentPageIndex.value -= 1;
  renderPage().then(() => {
    scheduleSaveState();
    if (wasAuto) {
      setTimeout(() => {
        internalStartAutoScroll();
      }, 1000);
    }
  });
}

function goNextPage() {
  if (!pages.value.length) return;
  if (currentPageIndex.value >= pages.value.length - 1) return;
  const wasAuto = autoScrollEnabled.value;
  stopAutoScroll();
  currentPageIndex.value += 1;
  renderPage().then(() => {
    scheduleSaveState();
    if (wasAuto) {
      setTimeout(() => {
        internalStartAutoScroll();
      }, 1000);
    }
  });
}

function onPageSelect() {
  if (!pages.value.length) return;
  if (currentPageIndex.value < 0) currentPageIndex.value = 0;
  if (currentPageIndex.value >= pages.value.length) {
    currentPageIndex.value = pages.value.length - 1;
  }
  const wasAuto = autoScrollEnabled.value;
  stopAutoScroll();
  renderPage().then(() => {
    scheduleSaveState();
    if (wasAuto) {
      setTimeout(() => {
        internalStartAutoScroll();
      }, 1000);
    }
  });
}

onMounted(async () => {
  // 尝试恢复上次阅读进度
  try {
    if (electronAPI && electronAPI.getConfig) {
      const saved = await electronAPI.getConfig('localNovelLastState');
      if (saved && saved.filePath) {
        console.log('[LocalNovelVue] Restoring last reading state:', saved);
        encoding.value = saved.encoding || 'utf-8';
        await loadFileWithEncoding({ encoding: encoding.value, filePath: saved.filePath });
        if (pages.value.length && typeof saved.currentPage === 'number') {
          if (saved.currentPage >= 0 && saved.currentPage < pages.value.length) {
            currentPageIndex.value = saved.currentPage;
            await renderPage();
          }
        }
        if (readerRef.value && typeof saved.scrollTop === 'number') {
          readerRef.value.scrollTop = saved.scrollTop;
        }
      }
    }
  } catch (e) {
    console.log('[LocalNovelVue] Failed to restore last reading state:', e && e.message);
  }

  // 监听应用隐藏/显示事件
  window.addEventListener('app-hidden', () => {
    if (autoScrollEnabled.value) {
      console.log('[LocalNovelVue] App hidden, pause auto scroll');
      wasAutoBeforeHide = true;
      stopAutoScroll();
    } else {
      wasAutoBeforeHide = false;
    }
  });

  window.addEventListener('app-shown', () => {
    if (wasAutoBeforeHide) {
      console.log('[LocalNovelVue] App shown, will resume auto scroll after 1s');
      wasAutoBeforeHide = false;
      setTimeout(() => {
        internalStartAutoScroll();
      }, 1000);
    }
  });
});

onBeforeUnmount(() => {
  stopAutoScroll();
  if (saveStateTimer) {
    clearTimeout(saveStateTimer);
    saveStateTimer = null;
  }
});
</script>

<style scoped>
.local-novel-container {
  width: 100%;
  height: 100%;
  background: #f5f5f5;
  overflow: hidden;
  padding: 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.local-novel-toolbar {
  flex: 0 0 auto;
  max-width: 900px;
  width: 100%;
  margin: 0 auto 8px auto;
  background: #fff;
  padding: 10px 14px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #444;
}

.title {
  font-weight: 600;
  margin-right: 8px;
}

.primary-btn {
  padding: 6px 12px;
  border-radius: 4px;
  border: none;
  background: #007bff;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
}

.file-name {
  margin-left: 4px;
  color: #666;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spacer {
  flex: 1 1 auto;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.encoding-select {
  padding: 2px 6px;
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.toggle-btn {
  padding: 4px 10px;
  border-radius: 4px;
  border: none;
  background: #28a745;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
}

.toggle-btn.active {
  background: #dc3545;
}

.speed-range {
  width: 120px;
}

.speed-label {
  min-width: 16px;
  text-align: center;
}

.font-size-input {
  width: 52px;
  padding: 2px 4px;
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.unit-label {
  font-size: 12px;
  color: #666;
}

.bold-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  cursor: pointer;
}

.font-family-select {
  padding: 2px 6px;
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.local-novel-reader {
  flex: 1 1 auto;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  overflow-y: auto;
  padding: 20px;
  box-sizing: border-box;
  line-height: 1.7;
  font-size: 14px;
  color: #333;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

.placeholder {
  text-align: center;
  color: #999;
  padding: 40px 0;
  font-size: 13px;
}

.novel-content {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  font-size: 12px;
  color: #666;
}

.pager-btn {
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: #f8f9fa;
  cursor: pointer;
}

.pager-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.page-info {
  margin: 0 4px;
}

.page-select {
  padding: 2px 6px;
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid #ddd;
}
</style>


