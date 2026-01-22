# 创建 GitHub Release 的 PowerShell 脚本
# 使用方法: .\create-release.ps1 -Token "your_github_token"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$ErrorActionPreference = "Stop"

# 从 package.json 读取版本信息
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$version = $packageJson.version
$repo = "xxss0903/moyuking"

Write-Host "🚀 开始创建 Release v$version..." -ForegroundColor Green
Write-Host ""

# 读取 release 目录中的文件
$releaseDir = "release"
$files = Get-ChildItem $releaseDir -File | Where-Object { 
    $_.Extension -eq ".exe" -or $_.Extension -eq ".blockmap" -or $_.Extension -eq ".yml"
} | Select-Object -ExpandProperty Name

Write-Host "找到以下文件:" -ForegroundColor Yellow
$files | ForEach-Object { Write-Host "  - $_" }

# 创建 Release 数据
$releaseBody = @"
## 摸鱼王 v$version

### 新功能
- ✨ 支持抖音、小红书、浏览器、网络小说、本地小说模块
- ✨ 支持窗口固定、透明度调节
- ✨ 支持多种解锁方式（鼠标中键、鼠标进入/离开、键盘快捷键）
- ✨ 本地小说支持自动滚动、分页、字体设置
- ✨ 浏览器支持手机/桌面模式切换和设备模拟

### 下载
- **安装版**: 摸鱼王 Setup $version.exe (推荐)
- **便携版**: 摸鱼王 $version.exe

### 安装说明
1. 下载安装版或便携版
2. 安装版：运行安装程序，按提示安装
3. 便携版：直接运行 exe 文件即可使用

### 使用说明
详见 [README.md](https://github.com/$repo/blob/master/README.md)
"@

$releaseData = @{
    tag_name = "v$version"
    name = "摸鱼王 v$version"
    body = $releaseBody
    draft = $false
    prerelease = $false
} | ConvertTo-Json

# 创建 Release
Write-Host ""
Write-Host "📝 创建 Release..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "token $Token"
    "User-Agent" = "moyu-king-release"
    "Content-Type" = "application/json"
}

try {
    $releaseResponse = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases" `
        -Method Post `
        -Headers $headers `
        -Body $releaseData `
        -ContentType "application/json"
    
    Write-Host "✅ Release 创建成功: $($releaseResponse.html_url)" -ForegroundColor Green
    $releaseId = $releaseResponse.id
} catch {
    Write-Host "❌ 创建 Release 失败: $_" -ForegroundColor Red
    exit 1
}

# 上传文件
Write-Host ""
Write-Host "📤 开始上传文件..." -ForegroundColor Yellow
Write-Host ""

foreach ($file in $files) {
    $filePath = Join-Path $releaseDir $file
    $fileSize = (Get-Item $filePath).Length / 1MB
    
    Write-Host "上传: $file ($([math]::Round($fileSize, 2)) MB)..." -NoNewline
    
    try {
        $fileContent = [System.IO.File]::ReadAllBytes($filePath)
        $fileName = [System.Web.HttpUtility]::UrlEncode($file)
        
        $uploadHeaders = @{
            "Authorization" = "token $Token"
            "User-Agent" = "moyu-king-release"
            "Content-Type" = "application/octet-stream"
        }
        
        $uploadUrl = "https://uploads.github.com/repos/$repo/releases/$releaseId/assets?name=$fileName"
        
        Invoke-RestMethod -Uri $uploadUrl `
            -Method Post `
            -Headers $uploadHeaders `
            -Body $fileContent `
            -ContentType "application/octet-stream" | Out-Null
        
        Write-Host " ✅" -ForegroundColor Green
    } catch {
        Write-Host " ❌ $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🎉 完成! Release 地址: $($releaseResponse.html_url)" -ForegroundColor Green

