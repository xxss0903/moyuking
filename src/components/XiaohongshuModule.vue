<template>
  <div class="xhs-container">
    <webview
      id="xiaohongshu-webview"
      class="xhs-webview"
      src="https://www.xiaohongshu.com/"
      allowpopups
      webpreferences="nodeIntegration=no,contextIsolation=yes,javascript=yes"
      :useragent="userAgent"
    ></webview>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';

// 使用桌面 Chrome 的 UA，尽量避免被识别为 Electron
const userAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

onMounted(() => {
  const webview = document.querySelector('#xiaohongshu-webview');
  if (webview) {
    console.log('[XhsVue] Webview mounted, UA set for better compatibility');
  }
});
</script>

<style scoped>
.xhs-container {
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
}

.xhs-webview {
  width: 100%;
  height: 100%;
  display: flex;
}
</style>


