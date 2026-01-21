<template>
  <div
    id="novel-container"
    style="width: 100%; height: 100%; background: #f5f5f5; overflow-y: auto; padding: 20px; box-sizing: border-box;"
  >
    <div
      style="max-width: 800px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
    >
      <h2
        style="margin-top: 0; color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; font-size: 18px;"
      >
        小说阅读器
      </h2>

      <div style="margin-bottom: 16px;">
        <label
          style="display: block; margin-bottom: 8px; color: #666; font-size: 14px;"
        >
          选择小说网站：
        </label>
        <select
          v-model="selectedSite"
          style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;"
        >
          <option value="qidian">起点中文网</option>
          <option value="zongheng">纵横中文网</option>
          <option value="17k">17K小说网</option>
          <option value="custom">自定义网址</option>
        </select>
      </div>

      <div
        v-if="selectedSite === 'custom'"
        style="margin-bottom: 16px;"
      >
        <label
          style="display: block; margin-bottom: 8px; color: #666; font-size: 14px;"
        >
          输入网址：
        </label>
        <input
          v-model="customUrl"
          type="text"
          placeholder="https://..."
          style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;"
        />
      </div>

      <button
        style="width: 100%; padding: 10px; background: #007bff; color: #fff; border: none; border-radius: 4px; font-size: 14px; cursor: pointer; margin-bottom: 16px;"
        @click="loadNovel"
      >
        加载小说
      </button>

      <div
        v-if="webviewVisible"
        id="novel-webview-container"
        style="width: 100%; height: 600px; border: 1px solid #ddd; border-radius: 4px; overflow: hidden;"
      >
        <webview
          id="novel-webview"
          :src="currentUrl"
          allowpopups
          :useragent="userAgent"
          style="width: 100%; height: 100%; display: flex;"
        ></webview>
      </div>

      <div
        v-else
        id="novel-placeholder"
        style="text-align: center; color: #999; padding: 40px 0;"
      >
        <p>👆 选择小说网站并点击「加载小说」开始阅读</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const selectedSite = ref('qidian');
const customUrl = ref('');
const webviewVisible = ref(false);
const currentUrl = ref('');

const novelSites = {
  qidian: 'https://www.qidian.com/',
  zongheng: 'http://www.zongheng.com/',
  '17k': 'https://www.17k.com/',
  custom: null
};

// 与原模块保持一致的 UA，防止被识别为 Electron
const userAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const loadNovel = () => {
  let url = '';

  if (selectedSite.value === 'custom') {
    url = (customUrl.value || '').trim();
  } else {
    url = novelSites[selectedSite.value] || '';
  }

  if (!url) {
    window.alert('请输入有效的网址');
    return;
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  currentUrl.value = url;
  webviewVisible.value = true;
};
</script>


