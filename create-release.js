const fs = require('fs');
const path = require('path');
const https = require('https');

// 从 package.json 读取版本信息
const packageJson = require('./package.json');
const version = packageJson.version;
const repo = 'xxss0903/moyuking';

// 检查 GitHub token
const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('错误: 请设置 GITHUB_TOKEN 环境变量');
  console.log('提示: 在 GitHub 设置中创建 Personal Access Token (需要 repo 权限)');
  console.log('然后运行: $env:GITHUB_TOKEN="your_token"; node create-release.js');
  process.exit(1);
}

// 读取 release 目录中的文件
const releaseDir = path.join(__dirname, 'release');
const files = fs.readdirSync(releaseDir).filter(file => {
  const filePath = path.join(releaseDir, file);
  const stat = fs.statSync(filePath);
  return stat.isFile() && (file.endsWith('.exe') || file.endsWith('.blockmap') || file.endsWith('.yml'));
});

console.log('找到以下文件:');
files.forEach(f => console.log(`  - ${f}`));

// 创建 Release
const releaseData = JSON.stringify({
  tag_name: `v${version}`,
  name: `摸鱼王 v${version}`,
  body: `## 摸鱼王 v${version}

### 新功能
- ✨ 支持抖音、小红书、浏览器、网络小说、本地小说模块
- ✨ 支持窗口固定、透明度调节
- ✨ 支持多种解锁方式（鼠标中键、鼠标进入/离开、键盘快捷键）
- ✨ 本地小说支持自动滚动、分页、字体设置
- ✨ 浏览器支持手机/桌面模式切换和设备模拟

### 下载
- **安装版**: 摸鱼王 Setup ${version}.exe (推荐)
- **便携版**: 摸鱼王 ${version}.exe

### 安装说明
1. 下载安装版或便携版
2. 安装版：运行安装程序，按提示安装
3. 便携版：直接运行 exe 文件即可使用

### 使用说明
详见 [README.md](https://github.com/${repo}/blob/master/README.md)
`,
  draft: false,
  prerelease: false
});

// 创建 Release
function createRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${repo}/releases`,
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'moyu-king-release',
        'Content-Type': 'application/json',
        'Content-Length': releaseData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 201) {
          const release = JSON.parse(data);
          console.log(`✅ Release 创建成功: ${release.html_url}`);
          resolve(release);
        } else {
          console.error(`❌ 创建 Release 失败: ${res.statusCode}`);
          console.error(data);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (e) => {
      console.error(`❌ 请求错误: ${e.message}`);
      reject(e);
    });

    req.write(releaseData);
    req.end();
  });
}

// 上传文件
function uploadAsset(releaseId, filePath, fileName) {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath);
    const fileSize = fileContent.length;

    const options = {
      hostname: 'uploads.github.com',
      path: `/repos/${repo}/releases/${releaseId}/assets?name=${encodeURIComponent(fileName)}`,
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'moyu-king-release',
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileSize
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 201) {
          const asset = JSON.parse(data);
          console.log(`✅ 上传成功: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
          resolve(asset);
        } else {
          console.error(`❌ 上传失败: ${fileName} - ${res.statusCode}`);
          console.error(data);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (e) => {
      console.error(`❌ 上传错误: ${e.message}`);
      reject(e);
    });

    req.write(fileContent);
    req.end();
  });
}

// 主函数
async function main() {
  try {
    console.log(`🚀 开始创建 Release v${version}...\n`);
    
    // 创建 Release
    const release = await createRelease();
    
    // 上传文件
    console.log('\n📤 开始上传文件...\n');
    for (const file of files) {
      const filePath = path.join(releaseDir, file);
      await uploadAsset(release.id, filePath, file);
    }
    
    console.log(`\n🎉 完成! Release 地址: ${release.html_url}`);
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  }
}

main();

