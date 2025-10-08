@echo off
REM Vlinder 扩展发布脚本 (Windows)
REM 用法: scripts\release.bat [版本号] [类型]
REM 示例: scripts\release.bat 3.7.22 release
REM       scripts\release.bat 3.7.22 beta
REM       scripts\release.bat 3.7.22 alpha

setlocal enabledelayedexpansion

REM 检查参数
if "%~1"=="" (
    echo [错误] 请提供版本号
    echo 用法: %~nx0 ^<版本号^> [类型]
    echo 示例: %~nx0 3.7.22 release
    echo       %~nx0 3.7.22 beta
    echo       %~nx0 3.7.22 alpha
    exit /b 1
)

set VERSION=%~1
set RELEASE_TYPE=%~2
if "%RELEASE_TYPE%"=="" set RELEASE_TYPE=release

REM 根据类型设置标签
if "%RELEASE_TYPE%"=="release" (
    set TAG=v%VERSION%
    set PUBLISH_TO_MARKETPLACE=true
) else if "%RELEASE_TYPE%"=="beta" (
    set TAG=v%VERSION%-beta.1
    set PUBLISH_TO_MARKETPLACE=false
) else if "%RELEASE_TYPE%"=="alpha" (
    set TAG=v%VERSION%-alpha.1
    set PUBLISH_TO_MARKETPLACE=false
) else (
    echo [错误] 未知的发布类型: %RELEASE_TYPE%
    echo 支持的类型: release, beta, alpha
    exit /b 1
)

echo.
echo =========================================
echo   Vlinder 扩展发布脚本
echo =========================================
echo.
echo 版本号: %VERSION%
echo 发布类型: %RELEASE_TYPE%
echo Git 标签: %TAG%
echo 发布到 Marketplace: %PUBLISH_TO_MARKETPLACE%
echo.

REM 确认
set /p CONFIRM="是否继续？[y/N]: "
if /i not "%CONFIRM%"=="y" (
    echo [警告] 已取消
    exit /b 0
)

REM 检查是否在 git 仓库中
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo [错误] 当前目录不是 Git 仓库
    exit /b 1
)

REM 检查是否有未提交的更改
git diff-index --quiet HEAD -- >nul 2>&1
if errorlevel 1 (
    echo [错误] 存在未提交的更改，请先提交或暂存
    git status --short
    exit /b 1
)

REM 获取当前分支
for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set CURRENT_BRANCH=%%i
echo [信息] 当前分支: %CURRENT_BRANCH%

REM 更新 package.json 版本号
echo [信息] 更新 package.json 版本号...
set PACKAGE_JSON=extension\package.json

if not exist "%PACKAGE_JSON%" (
    echo [错误] 找不到 %PACKAGE_JSON%
    exit /b 1
)

REM 使用 node 更新版本号
node -e "const fs = require('fs'); const pkg = JSON.parse(fs.readFileSync('%PACKAGE_JSON%', 'utf8')); pkg.version = '%VERSION%'; fs.writeFileSync('%PACKAGE_JSON%', JSON.stringify(pkg, null, '\t') + '\n');"

if errorlevel 1 (
    echo [错误] 更新版本号失败
    exit /b 1
)

echo [成功] 版本号已更新为 %VERSION%

REM 提交更改
echo [信息] 提交更改...
git add "%PACKAGE_JSON%"
git commit -m "chore: bump version to %VERSION%"

if errorlevel 1 (
    echo [错误] 提交失败
    exit /b 1
)

echo [成功] 更改已提交

REM 创建标签
echo [信息] 创建 Git 标签: %TAG%...
git rev-parse "%TAG%" >nul 2>&1
if not errorlevel 1 (
    echo [错误] 标签 %TAG% 已存在
    exit /b 1
)

git tag -a "%TAG%" -m "Release %TAG%"

if errorlevel 1 (
    echo [错误] 创建标签失败
    exit /b 1
)

echo [成功] 标签已创建

REM 推送到远程
echo [信息] 推送到远程仓库...
echo.
echo [警告] 即将执行以下操作：
echo   1. git push origin %CURRENT_BRANCH%
echo   2. git push origin %TAG%
echo.
set /p CONFIRM_PUSH="确认推送？[y/N]: "

if /i not "%CONFIRM_PUSH%"=="y" (
    echo [警告] 已取消推送
    echo [信息] 你可以稍后手动推送：
    echo   git push origin %CURRENT_BRANCH%
    echo   git push origin %TAG%
    exit /b 0
)

git push origin "%CURRENT_BRANCH%"
if errorlevel 1 (
    echo [错误] 推送分支失败
    exit /b 1
)

git push origin "%TAG%"
if errorlevel 1 (
    echo [错误] 推送标签失败
    exit /b 1
)

echo [成功] 推送完成！
echo.
echo =========================================
echo [成功] 发布流程已启动！
echo =========================================
echo.
echo [信息] 接下来：
echo 1. 访问 GitHub Actions 页面查看构建状态
echo    https://github.com/QuickerStudio/Vlinder/actions
echo.
echo 2. 构建完成后，在 Releases 页面查看发布
echo    https://github.com/QuickerStudio/Vlinder/releases
echo.

if "%PUBLISH_TO_MARKETPLACE%"=="true" (
    echo 3. 扩展将自动发布到：
    echo    - VS Code Marketplace
    echo    - Open VSX Registry
    echo.
    echo [警告] 注意: 确保已配置 VSCE_TOKEN 和 OVSX_TOKEN
) else (
    echo 3. 这是一个 %RELEASE_TYPE% 版本，不会发布到 Marketplace
)

echo.
echo [成功] 完成！🎉

endlocal

