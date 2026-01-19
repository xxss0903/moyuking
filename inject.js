// 注意：这个脚本是在抖音网页环境中运行的
// 我们无法直接修改抖音的源码，只能通过 preload 注入监听和 DOM 操作

// 创建一个自定义顶部 toolbar，用于拖动窗口和控制最小化/关闭
function createToolbar() {
  if (!window.electronAPI) return;

  // 如果已经有了就不重复创建
  if (document.getElementById('pindouyin-toolbar')) return;

  const toolbar = document.createElement('div');
  toolbar.id = 'pindouyin-toolbar';

  Object.assign(toolbar.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '32px',
    background: 'rgba(0, 0, 0, 0.6)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '0 8px',
    boxSizing: 'border-box',
    zIndex: '999999',
    WebkitAppRegion: 'drag', // 可拖动区域
    userSelect: 'none'
  });

  const btnContainer = document.createElement('div');
  Object.assign(btnContainer.style, {
    display: 'flex',
    gap: '8px',
    WebkitAppRegion: 'no-drag' // 按钮区域不能拖动，否则点击不了
  });

  const makeButton = (text, bgColor, hoverBg) => {
    const btn = document.createElement('div');
    btn.innerText = text;
    Object.assign(btn.style, {
      width: '24px',
      height: '24px',
      lineHeight: '24px',
      textAlign: 'center',
      borderRadius: '4px',
      cursor: 'pointer',
      background: bgColor,
      transition: 'background 0.15s'
    });
    btn.addEventListener('mouseenter', () => {
      btn.style.background = hoverBg;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = bgColor;
    });
    return btn;
  };

  const minimizeBtn = makeButton('—', 'transparent', 'rgba(255,255,255,0.15)');
  minimizeBtn.title = '最小化';
  minimizeBtn.onclick = () => {
    window.electronAPI.minimizeWindow();
  };

  const closeBtn = makeButton('×', 'transparent', 'rgba(255,0,0,0.6)');
  closeBtn.title = '关闭';
  closeBtn.onclick = () => {
    window.electronAPI.closeWindow();
  };

  btnContainer.appendChild(minimizeBtn);
  btnContainer.appendChild(closeBtn);
  toolbar.appendChild(btnContainer);

  document.body.appendChild(toolbar);
}

// 因为是远程站点，DOMContentLoaded 可能已经触发，所以用 readyState 判断
function setupMouseEventsAndToolbar() {
  if (!window.electronAPI) return;

  // 整个窗口范围监听即可
  window.addEventListener('mouseenter', () => {
    window.electronAPI.mouseEnter();
  });

  window.addEventListener('mouseleave', () => {
    window.electronAPI.mouseLeave();
  });

  createToolbar();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupMouseEventsAndToolbar);
} else {
  setupMouseEventsAndToolbar();
}



