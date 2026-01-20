// 配置文件：存储用户设置
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');

// 默认配置
const defaultConfig = {
  // 模块相关
  currentModule: 'douyin', // 当前选中的摸鱼模块
  
  // 窗口相关
  windowBounds: null, // 窗口位置和大小（用于恢复）
  isWindowPinned: false, // 窗口是否固定（固定后鼠标移出不会隐藏）
  autoHideOnMouseLeave: true, // 鼠标移出窗口时是否自动隐藏（与 isWindowPinned 相反，但保留用于兼容）
  
  // 解锁相关
  unlockMethod: 'middle-button', // 解锁方式：'middle-button' (鼠标中键长按)
  middleButtonHoldTime: 1000, // 鼠标中键长按时间（毫秒）
  
  // 启动相关
  showWindowOnStartup: true, // 启动时是否显示窗口（用于指示位置）
  startupDisplayDuration: 3000, // 启动时窗口显示时长（毫秒）
  
  // 窗口行为相关
  hideDelayOnMouseLeave: 0, // 鼠标移出后隐藏窗口的延迟时间（毫秒），0表示立刻隐藏
  defaultPinned: false, // 默认是否固定窗口
  
  // 界面位置相关
  windowPosition: 'top-right', // 窗口位置：'top-left', 'top-right', 'bottom-left', 'bottom-right'
  
  // 鼠标进入/离开解锁相关
  mouseEnterLeaveWindow: 3000, // 鼠标进入/离开的时间窗口（毫秒），默认3秒
  mouseEnterLeaveThreshold: 3 // 鼠标进入/离开的次数阈值，默认3次
};

// 读取配置
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const loadedConfig = JSON.parse(data);
      // 合并默认配置，确保新添加的配置项有默认值
      return { ...defaultConfig, ...loadedConfig };
    }
  } catch (error) {
    console.error('[Config] Failed to load config:', error);
  }
  return { ...defaultConfig };
}

// 保存配置
function saveConfig(config) {
  try {
    // 确保目录存在
    const configDir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`[Config] Config saved to: ${CONFIG_FILE}`);
  } catch (error) {
    console.error('[Config] Failed to save config:', error);
  }
}

// 更新配置
function updateConfig(updates) {
  const config = loadConfig();
  const newConfig = { ...config, ...updates };
  saveConfig(newConfig);
  return newConfig;
}

// 获取单个配置项
function getConfig(key) {
  const config = loadConfig();
  return config[key];
}

// 设置单个配置项
function setConfig(key, value) {
  const config = loadConfig();
  config[key] = value;
  saveConfig(config);
  return config;
}

module.exports = {
  loadConfig,
  saveConfig,
  updateConfig,
  getConfig,
  setConfig,
  defaultConfig
};

