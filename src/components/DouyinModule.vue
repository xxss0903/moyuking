<template>
  <div class="douyin-container">
    <webview
      id="douyin-webview"
      class="douyin-webview"
      src="https://www.douyin.com/"
      allowpopups
      webpreferences="nodeIntegration=no,contextIsolation=yes,javascript=yes"
      :useragent="userAgent"
    ></webview>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';

// 与之前模块中保持一致的 UA，避免被识别为 Electron
const userAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

onMounted(() => {
  const webview = document.querySelector('#douyin-webview');
  if (webview) {
    console.log('[DouyinVue] Webview mounted, UA set for scrolling and fullscreen support');
  }
});
</script>

<style scoped>
.douyin-container {
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
}

.douyin-webview {
  width: 100%;
  height: 100%;
  display: flex;
}
</style>


