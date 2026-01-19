// 配置文件：存储用户设置
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');

// 默认配置
const defaultConfig = {
  currentModule: 'douyin', // 当前选中的摸鱼模块
  windowBounds: null // 窗口位置和大小（用于恢复）
};

// 读取配置
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return { ...defaultConfig, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('读取配置失败:', error);
  }
  return defaultConfig;
}

// 保存配置
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('保存配置失败:', error);
  }
}

// 更新配置
function updateConfig(updates) {
  const config = loadConfig();
  const newConfig = { ...config, ...updates };
  saveConfig(newConfig);
  return newConfig;
}

module.exports = {
  loadConfig,
  saveConfig,
  updateConfig
};

