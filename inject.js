// 注意：这个脚本是在抖音网页环境中运行的
// 我们无法直接修改抖音的源码，只能通过 preload 注入监听和 DOM 操作

// 创建一个自定义顶部 toolbar，用于拖动窗口和控制最小化/关闭
function createToolbar() {
  // 如果已经有了就不重复创建
  if (document.getElementById('pindouyin-toolbar')) return;

  const toolbar = document.createElement('div');
  toolbar.id = 'pindouyin-toolbar';

  Object.assign(toolbar.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '36px',
    background: 'rgba(0, 0, 0, 0.6)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    boxSizing: 'border-box',
    zIndex: '999999',
    WebkitAppRegion: 'drag', // 可拖动区域
    userSelect: 'none'
  });

  // 左侧标题区域（同样可拖动）
  const title = document.createElement('div');
  title.innerText = '抖音悬浮窗';
  Object.assign(title.style, {
    fontSize: '12px',
    opacity: '0.85'
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
    if (window.electronAPI && window.electronAPI.minimizeWindow) {
      window.electronAPI.minimizeWindow();
    }
  };

  const closeBtn = makeButton('×', 'transparent', 'rgba(255,0,0,0.6)');
  closeBtn.title = '关闭';
  closeBtn.onclick = () => {
    if (window.electronAPI && window.electronAPI.closeWindow) {
      window.electronAPI.closeWindow();
    }
  };

  // 预留一个“设置”按钮（目前占位，将来可以打开设置面板）
  const settingsBtn = makeButton('⚙', 'transparent', 'rgba(255,255,255,0.15)');
  settingsBtn.title = '设置';
  settingsBtn.onclick = () => {
    // 目前先简单提示，将来可以在这里打开你自己的设置 UI
    console.log('打开设置面板（待实现）');
  };

  btnContainer.appendChild(settingsBtn);
  btnContainer.appendChild(minimizeBtn);
  btnContainer.appendChild(closeBtn);
  toolbar.appendChild(title);
  toolbar.appendChild(btnContainer);

  document.body.appendChild(toolbar);
}

// 因为是远程站点，DOMContentLoaded 可能已经触发，所以用 readyState 判断
function setupMouseEventsAndToolbar() {
  createToolbar();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupMouseEventsAndToolbar);
} else {
  setupMouseEventsAndToolbar();
}



