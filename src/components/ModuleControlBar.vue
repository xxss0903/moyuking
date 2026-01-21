<template>
  <div id="module-control-bar" :class="{ show: showControlBar }">
    <!-- 抖音模块控制栏 -->
    <template v-if="moduleId === 'douyin'">
      <button class="module-control-btn" @click="goHome">🏠 主页</button>
      <button class="module-control-btn" @click="goBack">← 返回</button>
      <button class="module-control-btn" @click="triggerPageFullscreen">⛶ 页面全屏</button>
      <button class="module-control-btn" @click="refresh">🔄 刷新</button>
    </template>

    <!-- 小红书模块控制栏 -->
    <template v-else-if="moduleId === 'xiaohongshu'">
      <button class="module-control-btn" @click="goHomeXhs">🏠 主页</button>
      <button class="module-control-btn" @click="goBack">← 返回</button>
      <button class="module-control-btn" @click="goForward">→ 前进</button>
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
  return props.moduleId === 'douyin' || props.moduleId === 'xiaohongshu' || props.moduleId === 'novel';
});

const goHome = () => {
  if (electronAPI) {
    electronAPI.navigateWebview('https://www.douyin.com/');
  }
};

const goHomeXhs = () => {
  if (electronAPI) {
    electronAPI.navigateWebview('https://www.xiaohongshu.com/');
  }
};

const triggerPageFullscreen = async () => {
  console.log('[Douyin Control] triggerPageFullscreen called');
  if (!electronAPI) {
    console.error('[Douyin Control] electronAPI is not available');
    return;
  }
  
  console.log('[Douyin Control] Page fullscreen button clicked');
  
  // 先测试一个简单的脚本，确保脚本执行功能正常
  console.log('[Douyin Control] Testing simple script execution first...');
  try {
    const testScript = `
      (function() {
        return { test: true, message: "Script execution works" };
      })();
    `.trim();
    const testResult = await electronAPI.executeWebviewScript(testScript);
    console.log('[Douyin Control] Test script result:', testResult);
    console.log('[Douyin Control] Test result type:', typeof testResult);
    console.log('[Douyin Control] Test result keys:', testResult ? Object.keys(testResult) : 'null');
    
    // 检查结果格式 - 可能是 { success: true, result: { test: true, ... } } 或直接是 { test: true, ... }
    const actualResult = testResult && testResult.result ? testResult.result : testResult;
    if (!actualResult || actualResult.test !== true) {
      console.error('[Douyin Control] Test script failed or returned unexpected result:', actualResult);
      console.error('[Douyin Control] Full test result:', testResult);
      // 不直接返回，继续执行主脚本，看看是否能找到按钮
    } else {
      console.log('[Douyin Control] Test script passed!');
    }
  } catch (testError) {
    console.error('[Douyin Control] Test script failed with error:', testError);
    console.error('[Douyin Control] Error details:', {
      message: testError.message,
      stack: testError.stack
    });
    // 不直接返回，继续执行主脚本
  }
  
  // 简化脚本：只查找 xgplayer-page-full-screen 组件
  const script = `
    (function() {
      console.log('[Webview Script] Starting to find xgplayer-page-full-screen button');
      
      // 方法1: 精确查找 .xgplayer-page-full-screen
      const btn1 = document.querySelector('.xgplayer-page-full-screen');
      if (btn1) {
        console.log('[Webview Script] Found .xgplayer-page-full-screen');
        console.log('[Webview Script] Element tag:', btn1.tagName);
        console.log('[Webview Script] Element className:', btn1.className);
        console.log('[Webview Script] Element id:', btn1.id || 'no id');
        
        // 尝试多种点击方式（针对 xg-icon 自定义元素）
        console.log('[Webview Script] Attempting multiple click methods...');
        
        let clickSuccess = false;
        let successfulMethod = '';
        
        // 方式1: 点击内部的 .xgplayer-icon div（根据提供的 HTML 结构）
        try {
          const iconDiv = btn1.querySelector('.xgplayer-icon');
          if (iconDiv && typeof iconDiv.click === 'function') {
            iconDiv.click();
            console.log('[Webview Script] Method 1: Clicked .xgplayer-icon div');
            clickSuccess = true;
            successfulMethod = 'xgplayer-icon-div';
          } else if (iconDiv) {
            // 如果 div 没有 click 方法，尝试触发事件
            iconDiv.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            console.log('[Webview Script] Method 1: Dispatched click event on .xgplayer-icon div');
            clickSuccess = true;
            successfulMethod = 'xgplayer-icon-div-event';
          }
        } catch (e) {
          console.log('[Webview Script] Method 1 failed:', e.message);
        }
        
        // 方式2: 直接点击 xg-icon 元素本身
        if (!clickSuccess) {
          try {
            if (typeof btn1.click === 'function') {
              btn1.click();
              console.log('[Webview Script] Method 2: Direct click() on xg-icon');
              clickSuccess = true;
              successfulMethod = 'xg-icon-direct';
            } else {
              btn1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, detail: 1 }));
              console.log('[Webview Script] Method 2: Dispatched click event on xg-icon');
              clickSuccess = true;
              successfulMethod = 'xg-icon-event';
            }
          } catch (e) {
            console.log('[Webview Script] Method 2 failed:', e.message);
          }
        }
        
        // 方式3: 查找父元素 xgplayer-controls-item 并点击
        if (!clickSuccess) {
          try {
            let parent = btn1.parentElement;
            let attempts = 0;
            while (parent && attempts < 5) {
              if (parent.classList && parent.classList.contains('xgplayer-controls-item')) {
                console.log('[Webview Script] Method 3: Found xgplayer-controls-item parent, clicking...');
                if (typeof parent.click === 'function') {
                  parent.click();
                  clickSuccess = true;
                  successfulMethod = 'parent-controls-item';
                } else {
                  parent.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                  clickSuccess = true;
                  successfulMethod = 'parent-controls-item-event';
                }
                break;
              }
              parent = parent.parentElement;
              attempts++;
            }
          } catch (e) {
            console.log('[Webview Script] Method 3 failed:', e.message);
          }
        }
        
        // 方式4: 触发完整的鼠标事件序列（mousedown -> mouseup -> click）
        if (!clickSuccess) {
          try {
            const events = [
              new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, buttons: 1 }),
              new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window, buttons: 1 }),
              new MouseEvent('click', { bubbles: true, cancelable: true, view: window, detail: 1 })
            ];
            events.forEach(event => btn1.dispatchEvent(event));
            console.log('[Webview Script] Method 4: Dispatched full mouse event sequence');
            clickSuccess = true;
            successfulMethod = 'mouse-event-sequence';
          } catch (e) {
            console.log('[Webview Script] Method 4 failed:', e.message);
          }
        }
        
        // 方式5: 点击内部的 SVG 元素
        if (!clickSuccess) {
          try {
            const svg = btn1.querySelector('svg');
            if (svg && typeof svg.click === 'function') {
              svg.click();
              console.log('[Webview Script] Method 5: Clicked SVG element');
              clickSuccess = true;
              successfulMethod = 'svg-element';
            } else if (svg) {
              svg.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              console.log('[Webview Script] Method 5: Dispatched click on SVG');
              clickSuccess = true;
              successfulMethod = 'svg-element-event';
            }
          } catch (e) {
            console.log('[Webview Script] Method 5 failed:', e.message);
          }
        }
        
        // 方式6: 尝试查找并点击任何可点击的内部元素（只对真正可点击的元素调用）
        if (!clickSuccess) {
          try {
            const innerClickable = btn1.querySelector('button, [role="button"], a');
            if (innerClickable) {
              if (typeof innerClickable.click === 'function') {
                innerClickable.click();
                console.log('[Webview Script] Method 6: Clicked inner clickable element');
                clickSuccess = true;
                successfulMethod = 'inner-clickable';
              } else {
                innerClickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                console.log('[Webview Script] Method 6: Dispatched click on inner element');
                clickSuccess = true;
                successfulMethod = 'inner-clickable-event';
              }
            }
          } catch (e) {
            console.log('[Webview Script] Method 6 failed:', e.message);
          }
        }
        
        return { 
          success: true, 
          method: 'xgplayer-page-full-screen',
          tagName: String(btn1.tagName || ''),
          className: String(btn1.className || ''),
          id: String(btn1.id || ''),
          found: true,
          clickAttempted: true,
          clickSuccess: clickSuccess,
          successfulMethod: successfulMethod || 'none'
        };
      }
      
      // 方法2: 查找包含 xgplayer-page-full-screen 的类
      const btn2 = document.querySelector('[class*="xgplayer-page-full-screen"]');
      if (btn2) {
        console.log('[Webview Script] Found element with xgplayer-page-full-screen in class');
        console.log('[Webview Script] Element tag:', btn2.tagName);
        console.log('[Webview Script] Element className:', btn2.className);
        btn2.click();
        return { 
          success: true, 
          method: 'class-contains-xgplayer-page-full-screen',
          tagName: btn2.tagName || '',
          className: String(btn2.className || ''),
          found: true
        };
      }
      
      // 方法3: 查找所有包含 page-full-screen 的元素
      const btn3 = document.querySelector('[class*="page-full-screen"]');
      if (btn3) {
        console.log('[Webview Script] Found element with page-full-screen in class');
        console.log('[Webview Script] Element tag:', btn3.tagName);
        console.log('[Webview Script] Element className:', btn3.className);
        btn3.click();
        return { 
          success: true, 
          method: 'class-contains-page-full-screen',
          tagName: btn3.tagName || '',
          className: String(btn3.className || ''),
          found: true
        };
      }
      
      // 如果都没找到，返回详细信息用于调试
      console.log('[Webview Script] Not found, searching for xgplayer elements...');
      const xgplayerElements = document.querySelectorAll('[class*="xgplayer"]');
      console.log('[Webview Script] Found', xgplayerElements.length, 'xgplayer elements');
      
      const xgplayerInfo = [];
      for (let i = 0; i < Math.min(xgplayerElements.length, 10); i++) {
        const el = xgplayerElements[i];
        xgplayerInfo.push({
          tag: String(el.tagName || ''),
          className: String(el.className || ''),
          id: String(el.id || '')
        });
      }
      
      return { 
        success: false, 
        error: 'No xgplayer-page-full-screen button found',
        xgplayerElementsCount: xgplayerElements.length,
        sampleElements: xgplayerInfo
      };
    })();
  `.trim();
  
  console.log('[Douyin Control] Script prepared, length:', script.length);
  console.log('[Douyin Control] Calling executeWebviewScript...');
  
  try {
    const result = await electronAPI.executeWebviewScript(script);
    console.log('[Douyin Control] Webview script execution result:', result);
    
    if (result && result.success) {
      console.log('[Douyin Control] Fullscreen button clicked successfully via method:', result.method);
      console.log('[Douyin Control] Element info:', {
        tagName: result.tagName,
        className: result.className,
        id: result.id
      });
    } else {
      console.error('[Douyin Control] Failed to click fullscreen button:', result);
      if (result && result.xgplayerElementsCount !== undefined) {
        console.log('[Douyin Control] Found', result.xgplayerElementsCount, 'xgplayer elements');
        console.log('[Douyin Control] Sample elements:', result.sampleElements);
      }
    }
  } catch (error) {
    console.error('[Douyin Control] Error executing webview script:', error);
    console.error('[Douyin Control] Error details:', {
      message: error.message,
      stack: error.stack
    });
  }
};

const refresh = () => {
  if (electronAPI) {
    electronAPI.executeWebviewScript('location.reload(); return { success: true };');
  }
};

const goBack = () => {
  if (electronAPI) {
    electronAPI.executeWebviewScript('window.history.back(); return { success: true };');
  }
};

const goForward = () => {
  if (electronAPI) {
    electronAPI.executeWebviewScript('window.history.forward(); return { success: true };');
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

