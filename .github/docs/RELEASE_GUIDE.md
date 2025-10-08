# 🚀 Vlinder 发布指南

本指南将帮助你使用 GitHub Actions 自动发布 Vlinder 扩展。

## 📋 前置准备

### 1. 设置 GitHub Secrets

你需要在 GitHub 仓库中设置以下 secrets：

1. **VSCE_TOKEN** - VS Code Marketplace 发布令牌
   - 访问：https://marketplace.visualstudio.com/manage/publishers/quickerstudio
   - 创建新的 Personal Access Token (PAT)
   - 权限：`Marketplace (Publish)`
   - 将生成的 token 添加到 GitHub Secrets

2. **OVSX_TOKEN** - Open VSX Registry 发布令牌
   - 访问：https://open-vsx.org/user-settings/tokens
   - 创建新的 Access Token
   - 将生成的 token 添加到 GitHub Secrets

#### 如何添加 GitHub Secrets：

1. 进入你的 GitHub 仓库
2. 点击 `Settings` → `Secrets and variables` → `Actions`
3. 点击 `New repository secret`
4. 添加以下 secrets：
   - Name: `VSCE_TOKEN`, Value: `你的 VS Code Marketplace token`
   - Name: `OVSX_TOKEN`, Value: `你的 Open VSX token`

### 2. 获取 VS Code Marketplace Token

1. 访问 https://marketplace.visualstudio.com/manage/publishers/quickerstudio
2. 登录你的 Microsoft 账户
3. 点击右上角的用户名 → `Personal Access Tokens`
4. 点击 `+ New Token`
5. 配置：
   - Name: `GitHub Actions Release`
   - Organization: `All accessible organizations`
   - Expiration: 选择合适的过期时间（建议 90 天或自定义）
   - Scopes: 选择 `Marketplace (Publish)`
6. 点击 `Create`
7. **重要**：立即复制生成的 token（只会显示一次）
8. 将 token 添加到 GitHub Secrets 中

### 3. 获取 Open VSX Token

1. 访问 https://open-vsx.org/
2. 使用 GitHub 账户登录
3. 点击右上角头像 → `Settings` → `Access Tokens`
4. 点击 `Generate New Token`
5. 输入描述：`GitHub Actions Release`
6. 点击 `Generate`
7. 复制生成的 token
8. 将 token 添加到 GitHub Secrets 中

## 🎯 发布流程

### 方法 1: 使用 Git 标签发布（推荐）

这是最标准的发布方式：

```bash
# 1. 确保你在主分支上
git checkout main
git pull origin main

# 2. 更新 extension/package.json 中的版本号
# 例如：从 "3.7.21" 改为 "3.7.22"

# 3. 提交版本更新
git add extension/package.json
git commit -m "chore: bump version to 3.7.22"

# 4. 创建并推送标签
git tag v3.7.22
git push origin main
git push origin v3.7.22
```

推送标签后，GitHub Actions 会自动：
1. ✅ 构建扩展
2. ✅ 创建 GitHub Release
3. ✅ 上传 .vsix 文件到 Release
4. ✅ 发布到 VS Code Marketplace
5. ✅ 发布到 Open VSX Registry

### 方法 2: 手动触发发布

如果你想手动触发发布：

1. 进入 GitHub 仓库
2. 点击 `Actions` 标签
3. 选择 `Release Extension` 工作流
4. 点击 `Run workflow` 按钮
5. 选择分支（通常是 `main`）
6. 点击 `Run workflow`

这将使用 `package.json` 中的当前版本号进行发布。

## 📦 发布后检查

发布完成后，请检查以下内容：

### 1. GitHub Release
- 访问：https://github.com/QuickerStudio/Vlinder/releases
- 确认新版本已创建
- 确认 .vsix 文件已上传

### 2. VS Code Marketplace
- 访问：https://marketplace.visualstudio.com/items?itemName=QuickerStudio.vlinder
- 确认版本号已更新
- 确认描述和截图正确显示

### 3. Open VSX Registry
- 访问：https://open-vsx.org/extension/QuickerStudio/vlinder
- 确认版本号已更新

## 🔧 版本号规范

Vlinder 使用语义化版本号：`MAJOR.MINOR.PATCH`

- **MAJOR** (主版本号): 重大更新，可能包含不兼容的 API 变更
- **MINOR** (次版本号): 新功能，向后兼容
- **PATCH** (补丁版本号): Bug 修复，向后兼容

当前版本策略：
- `3.7.21` - 当前版本
- `3` - 代表和谐与平衡
- `7` - 代表完美与和平
- `21` - 代表 21 世纪的共享梦想

## 🐛 故障排除

### 问题 1: GitHub Actions 失败

**症状**：工作流运行失败

**解决方案**：
1. 检查 Actions 日志，查看具体错误信息
2. 确认所有 secrets 已正确设置
3. 确认 `package.json` 中的版本号格式正确
4. 确认依赖安装成功

### 问题 2: VS Code Marketplace 发布失败

**症状**：`VSCE_PAT` 相关错误

**解决方案**：
1. 检查 `VSCE_TOKEN` 是否已过期
2. 重新生成 token 并更新 GitHub Secret
3. 确认 token 有 `Marketplace (Publish)` 权限
4. 确认 publisher 名称为 `QuickerStudio`

### 问题 3: Open VSX 发布失败

**症状**：`OVSX_PAT` 相关错误

**解决方案**：
1. 检查 `OVSX_TOKEN` 是否有效
2. 重新生成 token 并更新 GitHub Secret
3. 确认已在 Open VSX 上注册 namespace

### 问题 4: 版本号冲突

**症状**：提示版本号已存在

**解决方案**：
1. 确认 `package.json` 中的版本号大于已发布的版本
2. 删除错误的 Git 标签：
   ```bash
   git tag -d v3.7.22
   git push origin :refs/tags/v3.7.22
   ```
3. 更新版本号后重新发布

## 📊 工作流说明

### Release Workflow (release.yml)

触发条件：
- 推送 `v*.*.*` 格式的标签
- 手动触发

主要步骤：
1. 检出代码
2. 设置 Node.js 和 pnpm
3. 安装依赖
4. 构建 webview
5. 打包扩展
6. 创建 GitHub Release
7. 上传 .vsix 文件
8. 发布到 VS Code Marketplace
9. 发布到 Open VSX Registry

### Build and Test Workflow (build-test.yml)

触发条件：
- 推送到 main/master/develop 分支
- Pull Request 到 main/master/develop 分支
- 手动触发

主要步骤：
1. 检出代码
2. 设置 Node.js 和 pnpm
3. 安装依赖
4. 类型检查
5. 代码检查 (Lint)
6. 构建 webview
7. 构建扩展
8. 运行测试
9. 打包扩展
10. 上传构建产物

## 💡 最佳实践

1. **版本更新前**：
   - 更新 CHANGELOG.md
   - 运行本地测试
   - 确认所有功能正常

2. **发布时**：
   - 使用清晰的提交信息
   - 遵循语义化版本号规范
   - 在 Release Notes 中详细说明更新内容

3. **发布后**：
   - 检查所有平台的发布状态
   - 测试从 Marketplace 安装
   - 监控用户反馈

## 🎉 快速发布检查清单

- [ ] 更新 `extension/package.json` 版本号
- [ ] 更新 `CHANGELOG.md`
- [ ] 本地测试通过
- [ ] 提交代码到 main 分支
- [ ] 创建并推送 Git 标签
- [ ] 等待 GitHub Actions 完成
- [ ] 检查 GitHub Release
- [ ] 检查 VS Code Marketplace
- [ ] 检查 Open VSX Registry
- [ ] 测试安装新版本
- [ ] 通知用户更新

## 📞 获取帮助

如果遇到问题：
1. 查看 GitHub Actions 日志
2. 查看本文档的故障排除部分
3. 访问 https://vlinders.org 获取更多信息
4. 在 GitHub Issues 中提问

---

**🦋 让我们一起让 Vlinder 飞得更高！**

