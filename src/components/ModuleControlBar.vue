<template>
  <div id="module-control-bar" :class="{ show: showControlBar }">
    <!-- 抖音模块控制栏 -->
    <template v-if="moduleId === 'douyin'">
      <button class="module-control-btn" @click="goHome">🏠 主页</button>
      <button class="module-control-btn" @click="triggerPageFullscreen">⛶ 页面全屏</button>
      <button class="module-control-btn" @click="refresh">🔄 刷新</button>
    </template>
    
    <!-- 小说模块控制栏 -->
    <template v-else-if="moduleId === 'novel'">
      <button class="module-control-btn" @click="refresh">🔄 刷新</button>
      <button class="module-control-btn" @click="goBack">← 返回</button>
      <button class="module-control-btn" @click="goForward">→ 前进</button>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useElectronAPI } from '../composables/useElectronAPI';

const props = defineProps({
  moduleId: {
    type: String,
    default: null
  }
});

const electronAPI = useElectronAPI();

const showControlBar = computed(() => {
  return props.moduleId === 'douyin' || props.moduleId === 'novel';
});

const goHome = () => {
  if (electronAPI) {
    electronAPI.navigateWebview('https://www.douyin.com/');
  }
};

const triggerPageFullscreen = () => {
  if (!electronAPI) return;
  
  console.log('[Douyin Control] Page fullscreen button clicked');
  
  const script = `
    (function() {
      console.log('[Webview Script] Starting to find fullscreen button');
      
      // 方法1: 查找 xgplayer-page-full-screen 按钮
      console.log('[Webview Script] Method 1: Looking for .xgplayer-page-full-screen');
      const fullscreenBtn1 = document.querySelector('.xgplayer-page-full-screen');
      if (fullscreenBtn1) {
        console.log('[Webview Script] Found .xgplayer-page-full-screen button, clicking...');
        fullscreenBtn1.click();
        return { success: true, method: 'xgplayer-page-full-screen', element: fullscreenBtn1.className };
      }
      
      // 方法2: 查找包含 xgplayer-page-full-screen 的类
      console.log('[Webview Script] Method 2: Looking for elements with xgplayer-page-full-screen in class');
      const fullscreenBtn2 = document.querySelector('[class*="xgplayer-page-full-screen"]');
      if (fullscreenBtn2) {
        console.log('[Webview Script] Found element with xgplayer-page-full-screen in class, clicking...');
        fullscreenBtn2.click();
        return { success: true, method: 'class-contains-xgplayer-page-full-screen', element: fullscreenBtn2.className };
      }
      
      // 方法3: 查找包含 page-full-screen 的类
      console.log('[Webview Script] Method 3: Looking for elements with page-full-screen in class');
      const fullscreenBtn3 = document.querySelector('[class*="page-full-screen"]');
      if (fullscreenBtn3) {
        console.log('[Webview Script] Found element with page-full-screen in class, clicking...');
        fullscreenBtn3.click();
        return { success: true, method: 'class-contains-page-full-screen', element: fullscreenBtn3.className };
      }
      
      // 方法4: 查找所有包含 fullscreen 的按钮
      console.log('[Webview Script] Method 4: Looking for all buttons/divs with fullscreen in class');
      const buttons = document.querySelectorAll('button, div[role="button"], .xgplayer-controls-item');
      console.log('[Webview Script] Found ' + buttons.length + ' potential buttons');
      
      for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        const className = btn.className || '';
        const classList = Array.from(btn.classList || []);
        
        if (className.includes('full-screen') || className.includes('fullscreen') || className.includes('page-full')) {
          console.log('[Webview Script] Found button with fullscreen-related class:', className);
          console.log('[Webview Script] Button classList:', classList);
          console.log('[Webview Script] Clicking button...');
          btn.click();
          return { success: true, method: 'search-all-buttons', element: className, index: i };
        }
      }
      
      // 方法5: 查找所有 xgplayer 相关的控制项
      console.log('[Webview Script] Method 5: Looking for xgplayer-controls-item elements');
      const xgplayerItems = document.querySelectorAll('.xgplayer-controls-item');
      console.log('[Webview Script] Found ' + xgplayerItems.length + ' xgplayer-controls-item elements');
      
      for (let i = 0; i < xgplayerItems.length; i++) {
        const item = xgplayerItems[i];
        const className = item.className || '';
        const ariaLabel = item.getAttribute('aria-label') || '';
        const title = item.getAttribute('title') || '';
        
        console.log('[Webview Script] Item ' + i + ' - className:', className, 'aria-label:', ariaLabel, 'title:', title);
        
        if (className.includes('full') || ariaLabel.includes('全屏') || ariaLabel.includes('fullscreen') || title.includes('全屏') || title.includes('fullscreen')) {
          console.log('[Webview Script] Found xgplayer-controls-item with fullscreen-related content, clicking...');
          item.click();
          return { success: true, method: 'xgplayer-controls-item', element: className, ariaLabel: ariaLabel, title: title };
        }
      }
      
      // 方法6: 尝试查找所有可能的全屏相关元素
      console.log('[Webview Script] Method 6: Looking for any element with fullscreen-related attributes');
      const allElements = document.querySelectorAll('*');
      console.log('[Webview Script] Total elements found:', allElements.length);
      
      for (let i = 0; i < Math.min(allElements.length, 1000); i++) {
        const el = allElements[i];
        const className = el.className || '';
        const ariaLabel = el.getAttribute('aria-label') || '';
        const title = el.getAttribute('title') || '';
        const id = el.id || '';
        
        if (className.includes('full') && (className.includes('screen') || className.includes('Screen'))) {
          console.log('[Webview Script] Found element with fullscreen in className:', className);
          console.log('[Webview Script] Element tag:', el.tagName, 'id:', id, 'aria-label:', ariaLabel);
          el.click();
          return { success: true, method: 'search-all-elements', element: className, tag: el.tagName, id: id };
        }
      }
      
      console.log('[Webview Script] Could not find fullscreen button');
      return { success: false, error: 'No fullscreen button found' };
    })();
  `;
  
  electronAPI.executeWebviewScript(script).then((result) => {
    console.log('[Douyin Control] Webview script execution result:', result);
    if (result && result.success) {
      console.log('[Douyin Control] Fullscreen button clicked successfully via method:', result.method);
    } else {
      console.error('[Douyin Control] Failed to click fullscreen button:', result);
    }
  }).catch((error) => {
    console.error('[Douyin Control] Error executing webview script:', error);
  });
};

const refresh = () => {
  if (electronAPI) {
    electronAPI.executeWebviewScript('location.reload();');
  }
};

const goBack = () => {
  if (electronAPI) {
    electronAPI.executeWebviewScript('window.history.back();');
  }
};

const goForward = () => {
  if (electronAPI) {
    electronAPI.executeWebviewScript('window.history.forward();');
  }
};
</script>

<style scoped>
#module-control-bar {
  position: absolute;
  top: 36px;
  left: 0;
  right: 0;
  height: 32px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  display: none;
  align-items: center;
  padding: 0 12px;
  box-sizing: border-box;
  z-index: 9;
  -webkit-app-region: no-drag;
  font-size: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

#module-control-bar.show {
  display: flex;
}

.module-control-btn {
  padding: 4px 12px;
  margin-right: 8px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.15s;
  white-space: nowrap;
}

.module-control-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.module-control-btn:active {
  background: rgba(255, 255, 255, 0.35);
}
</style>

