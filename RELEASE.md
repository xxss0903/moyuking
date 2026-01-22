# 发布说明

## 创建 GitHub Release

### 方法 1: 使用 PowerShell 脚本（推荐）

1. 在 GitHub 创建 Personal Access Token:
   - 访问 https://github.com/settings/tokens
   - 点击 "Generate new token (classic)"
   - 勾选 `repo` 权限
   - 生成并复制 token

2. 运行 PowerShell 脚本:
```powershell
.\create-release.ps1 -Token "your_github_token"
```

### 方法 2: 使用 Node.js 脚本

1. 设置环境变量:
```powershell
$env:GITHUB_TOKEN="your_github_token"
```

2. 运行脚本:
```bash
node create-release.js
```

### 方法 3: 手动创建（如果脚本不可用）

1. 访问 https://github.com/xxss0903/moyuking/releases/new

2. 填写信息:
   - Tag: `v1.0.0`
   - Title: `摸鱼王 v1.0.0`
   - Description: 复制下面的内容

3. 上传文件（从 `release` 目录）:
   - `摸鱼王 Setup 1.0.0.exe` (安装版)
   - `摸鱼王 1.0.0.exe` (便携版)
   - `摸鱼王 Setup 1.0.0.exe.blockmap` (可选)
   - `latest.yml` (可选)

4. 点击 "Publish release"

## Release 说明模板

```markdown
## 摸鱼王 v1.0.0

### 新功能
- ✨ 支持抖音、小红书、浏览器、网络小说、本地小说模块
- ✨ 支持窗口固定、透明度调节
- ✨ 支持多种解锁方式（鼠标中键、鼠标进入/离开、键盘快捷键）
- ✨ 本地小说支持自动滚动、分页、字体设置
- ✨ 浏览器支持手机/桌面模式切换和设备模拟

### 下载
- **安装版**: 摸鱼王 Setup 1.0.0.exe (推荐)
- **便携版**: 摸鱼王 1.0.0.exe

### 安装说明
1. 下载安装版或便携版
2. 安装版：运行安装程序，按提示安装
3. 便携版：直接运行 exe 文件即可使用

### 使用说明
详见 [README.md](https://github.com/xxss0903/moyuking/blob/master/README.md)
```

