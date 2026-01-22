# 摸鱼王 (Moyu King)

一个功能强大的桌面悬浮窗应用，支持多种摸鱼方式，让你在工作之余轻松享受娱乐内容。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Electron](https://img.shields.io/badge/Electron-32.1.0-brightgreen.svg)
![Vue](https://img.shields.io/badge/Vue-3.4.0-4FC08D.svg)

## 📥 下载

最新版本请前往 [Releases](https://github.com/xxss0903/moyuking/releases) 页面下载。

- **安装版** (推荐): `摸鱼王 Setup 1.0.0.exe` - 完整的安装程序
- **便携版**: `摸鱼王 1.0.0.exe` - 无需安装，直接运行

## ✨ 特性

### 🎯 核心功能
- **悬浮窗设计** - 小巧精致，不占用过多屏幕空间
- **智能隐藏** - 鼠标移出自动隐藏，保护隐私
- **多种解锁方式** - 支持鼠标中键长按或鼠标进入/离开次数解锁
- **窗口固定** - 可设置窗口固定，鼠标移出不会隐藏
- **透明度调节** - 可自定义窗口透明度（0.2 ~ 1.0）

### 📱 支持的模块

#### 1. 抖音模块
- 完整的抖音网页版体验
- 支持页面全屏功能
- 主页、返回、刷新等导航控制

#### 2. 小红书模块
- 浏览小红书笔记
- 完整的导航控制（主页、返回、前进、刷新）

#### 3. 浏览器模块
- 支持输入任意网址或搜索关键词
- **手机/桌面模式切换** - 一键切换移动端和桌面端显示
- **多种设备尺寸模拟** - 支持 iPhone、Android、iPad 等多种设备尺寸
- 常用地址管理 - 保存常用网站，快速访问
- 完整的浏览器控制（前进、后退、刷新、主页）

#### 4. 网络小说模块
- 支持多个在线小说网站
- 自定义网站 URL
- 浏览器式导航控制

#### 5. 本地小说模块 ⭐
- **文件导入** - 支持 txt、md 等文本文件
- **编码支持** - 支持 UTF-8 和 GBK 编码，解决中文乱码问题
- **自动滚动** - 10 级速度调节，流畅的阅读体验
- **分页阅读** - 支持自定义每页字数（1000-3000字）
- **字体设置** - 可调节字体大小、加粗、字体族
- **阅读进度保存** - 自动保存阅读位置，下次打开继续阅读
- **设置持久化** - 所有字体和阅读设置自动保存

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 启动 Vite 开发服务器和 Electron
npm run dev:electron

# 或者分别启动
npm run dev        # 启动 Vite 开发服务器
npm start          # 启动 Electron（在另一个终端）
```

### 构建应用

```bash
# 构建前端资源
npm run build

# 构建 Electron 应用（Windows）
npm run build:electron
```

构建产物将输出到 `release` 目录。

## 📖 使用说明

### 首次启动

1. 启动应用后，窗口会短暂显示以提示位置，然后自动隐藏
2. 使用以下方式解锁显示窗口：
   - **鼠标中键长按**：在窗口位置长按鼠标中键 1 秒（可配置）
   - **鼠标进入/离开**：在窗口位置快速进入/离开 5 次（可配置）

### 窗口控制

- **拖动窗口**：点击顶部工具栏拖动
- **关闭窗口**：点击右上角关闭按钮
- **最小化**：点击右上角最小化按钮
- **固定窗口**：在设置中开启"默认固定窗口"，或通过界面固定按钮

### 模块切换

点击顶部工具栏的当前模块名称，打开模块选择面板，选择要使用的模块。

### 设置面板

点击顶部工具栏的设置按钮，打开设置面板，可以配置：
- 窗口位置（左上、右上、左下、右下）
- 窗口透明度
- 默认固定窗口
- 启动时显示位置提示
- 隐藏时自动暂停视频
- 隐藏延迟时间
- 解锁相关设置

## 🛠️ 技术栈

- **Electron** - 跨平台桌面应用框架
- **Vue 3** - 渐进式 JavaScript 框架
- **Vite** - 下一代前端构建工具
- **iconv-lite** - 字符编码转换库

## 📁 项目结构

```
pindouyin/
├── main.js                 # Electron 主进程
├── preload.js              # 预加载脚本
├── config.js               # 配置管理
├── vite.config.js          # Vite 配置
├── package.json            # 项目配置
├── src/
│   ├── App.vue            # 根组件
│   ├── main.js            # Vue 入口
│   ├── components/        # Vue 组件
│   │   ├── Toolbar.vue           # 顶部工具栏
│   │   ├── ModulePanel.vue       # 模块选择面板
│   │   ├── SettingsPanel.vue     # 设置面板
│   │   ├── ModuleControlBar.vue  # 模块控制栏
│   │   ├── DouyinModule.vue      # 抖音模块
│   │   ├── XiaohongshuModule.vue # 小红书模块
│   │   ├── BrowserModule.vue     # 浏览器模块
│   │   ├── WebNovelModule.vue    # 网络小说模块
│   │   └── LocalNovelModule.vue # 本地小说模块
│   ├── composables/       # Vue Composables
│   │   ├── useElectronAPI.js     # Electron API 封装
│   │   └── useModules.js         # 模块管理
│   └── styles/            # 样式文件
└── modules/               # 传统模块（逐步迁移到 Vue）
    └── novel.js           # 网络小说模块（旧版）
```

## ⚙️ 配置说明

应用配置文件位于用户数据目录的 `moyu_config.json`：
- Windows: `%APPDATA%/moyu-king/moyu_config.json`
- macOS: `~/Library/Application Support/moyu-king/moyu_config.json`
- Linux: `~/.config/moyu-king/moyu_config.json`

主要配置项：
- `windowPosition` - 窗口位置
- `windowOpacity` - 窗口透明度
- `defaultPinned` - 默认是否固定窗口
- `showWindowOnStartup` - 启动时是否显示位置提示
- `autoPauseOnHide` - 隐藏时是否自动暂停视频
- `localNovelSettings` - 本地小说设置（字体、速度等）
- `localNovelLastState` - 本地小说阅读进度
- `browserPresets` - 浏览器常用地址
- `browserPhoneMode` - 浏览器手机模式开关
- `browserDeviceSize` - 浏览器设备尺寸

## 🎨 功能亮点

### 浏览器模块
- **设备模拟**：支持 iPhone SE、iPhone 14、iPhone 14 Pro Max、Android 手机、iPad、iPad Pro 等多种设备尺寸
- **User Agent 切换**：自动根据设备类型切换对应的 User Agent
- **常用地址管理**：保存常用网站，支持快速访问和删除

### 本地小说模块
- **智能分页**：根据每页字数自动分页，支持快速跳转
- **流畅滚动**：使用 `requestAnimationFrame` 实现流畅的自动滚动
- **编码识别**：自动识别文件编码，支持 UTF-8 和 GBK
- **状态恢复**：自动保存和恢复阅读进度、字体设置等

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📝 更新日志

### v1.0.0
- ✨ 初始版本发布
- ✨ 支持抖音、小红书、浏览器、网络小说、本地小说模块
- ✨ 支持窗口固定、透明度调节
- ✨ 支持多种解锁方式
- ✨ 本地小说支持自动滚动、分页、字体设置
- ✨ 浏览器支持手机/桌面模式切换和设备模拟

## 📄 许可证

本项目采用 [MIT License](LICENSE) 许可证。

## 🙏 致谢

感谢所有开源项目的贡献者！

---

**注意**：本应用仅供学习和个人使用，请遵守相关网站的使用条款。

