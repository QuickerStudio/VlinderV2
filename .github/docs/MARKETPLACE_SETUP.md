# VS Code Marketplace 自动发布配置指南

本指南将帮助你配置自动发布到 VS Code Marketplace 和 Open VSX Registry。

## 📋 目录

1. [获取 VS Code Marketplace Token](#1-获取-vs-code-marketplace-token)
2. [获取 Open VSX Token](#2-获取-open-vsx-token)
3. [配置 GitHub Secrets](#3-配置-github-secrets)
4. [测试发布流程](#4-测试发布流程)
5. [常见问题](#5-常见问题)

---

## 1. 获取 VS Code Marketplace Token

### 步骤 1: 创建 Azure DevOps 账号

1. 访问 [Azure DevOps](https://dev.azure.com/)
2. 使用 Microsoft 账号登录（如果没有，需要先注册）
3. 创建一个新的组织（Organization）

### 步骤 2: 创建 Personal Access Token (PAT)

1. 点击右上角的用户图标
2. 选择 **"Personal access tokens"**（个人访问令牌）
3. 点击 **"+ New Token"**（新建令牌）
4. 配置令牌：
   - **Name**: `vscode-marketplace-publish`（或任意名称）
   - **Organization**: 选择你的组织
   - **Expiration**: 建议选择 **Custom defined**，设置较长的有效期（如 1 年）
   - **Scopes**: 选择 **Custom defined**
     - 勾选 **Marketplace** 下的：
       - ✅ **Acquire** (Read)
       - ✅ **Publish** (Read & Publish)
       - ✅ **Manage** (Read, Publish & Manage)
5. 点击 **"Create"**
6. **重要：** 立即复制生成的 Token，它只会显示一次！

### 步骤 3: 注册发布者账号

1. 访问 [Visual Studio Marketplace Publisher Management](https://marketplace.visualstudio.com/manage)
2. 使用相同的 Microsoft 账号登录
3. 点击 **"Create publisher"**
4. 填写信息：
   - **Publisher ID**: `QuickerStudio`（必须与 package.json 中的 publisher 一致）
   - **Display name**: `Quicker Studio`
   - **Description**: 简短描述
5. 点击 **"Create"**

---

## 2. 获取 Open VSX Token

Open VSX 是一个开源的扩展市场，用于非 Microsoft 的 VS Code 发行版（如 VSCodium、Eclipse Theia 等）。

### 步骤 1: 注册 Open VSX 账号

1. 访问 [Open VSX Registry](https://open-vsx.org/)
2. 点击右上角的 **"Sign In"**
3. 使用 GitHub 账号登录

### 步骤 2: 创建 Access Token

1. 登录后，点击右上角的用户名
2. 选择 **"Access Tokens"**
3. 点击 **"Generate New Token"**
4. 配置令牌：
   - **Description**: `GitHub Actions Auto Publish`
   - **Scopes**: 勾选 **Publish extensions**
5. 点击 **"Generate Token"**
6. **重要：** 立即复制生成的 Token！

### 步骤 3: 创建命名空间（如果需要）

1. 访问 [Open VSX Namespaces](https://open-vsx.org/user-settings/namespaces)
2. 如果 `QuickerStudio` 命名空间不存在，点击 **"Create Namespace"**
3. 填写 `QuickerStudio` 并提交

---

## 3. 配置 GitHub Secrets

### 步骤 1: 添加 Secrets

1. 访问你的 GitHub 仓库
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **"New repository secret"**

### 步骤 2: 添加 VSCE_TOKEN

1. **Name**: `VSCE_TOKEN`
2. **Secret**: 粘贴你在步骤 1 中获取的 Azure DevOps PAT
3. 点击 **"Add secret"**

### 步骤 3: 添加 OVSX_TOKEN

1. **Name**: `OVSX_TOKEN`
2. **Secret**: 粘贴你在步骤 2 中获取的 Open VSX Token
3. 点击 **"Add secret"**

### 验证配置

你的 Secrets 列表应该包含：
- ✅ `VSCE_TOKEN` - VS Code Marketplace 发布令牌
- ✅ `OVSX_TOKEN` - Open VSX Registry 发布令牌

---

## 4. 测试发布流程

### 方法 1: 手动触发测试

1. 访问 **Actions** 页面
2. 选择 **"Release VSIX"** 工作流
3. 点击 **"Run workflow"**
4. 勾选 **"Publish to VS Code Marketplace"**
5. 点击 **"Run workflow"** 确认
6. 观察工作流执行情况

### 方法 2: 使用标签触发

```bash
# 创建测试标签（不会自动发布到 Marketplace）
git tag v3.7.21-beta.1
git push origin v3.7.21-beta.1

# 创建正式版本标签（会自动发布到 Marketplace）
git tag v3.7.22
git push origin v3.7.22
```

### 自动发布规则

工作流会在以下情况下自动发布到 Marketplace：

1. ✅ 推送正式版本标签（如 `v3.7.22`）
2. ❌ 不会发布 beta 版本（如 `v3.7.22-beta.1`）
3. ❌ 不会发布 alpha 版本（如 `v3.7.22-alpha.1`）
4. ✅ 手动触发时勾选了 "Publish to VS Code Marketplace"

---

## 5. 常见问题

### Q1: 发布失败，提示 "Publisher not found"

**解决方案：**
1. 确认 `package.json` 中的 `publisher` 字段与 Marketplace 上的 Publisher ID 完全一致
2. 确认已在 [Marketplace Publisher Management](https://marketplace.visualstudio.com/manage) 创建了发布者账号

### Q2: 发布失败，提示 "Authentication failed"

**解决方案：**
1. 检查 `VSCE_TOKEN` 是否正确配置
2. 检查 Token 是否过期
3. 确认 Token 的权限包含 Marketplace Publish

### Q3: Open VSX 发布失败

**解决方案：**
1. 检查 `OVSX_TOKEN` 是否正确配置
2. 确认已创建 `QuickerStudio` 命名空间
3. 注意：Open VSX 发布失败不会影响整个工作流（设置了 `continue-on-error: true`）

### Q4: 如何只发布到 GitHub Release，不发布到 Marketplace？

**解决方案：**
1. 使用 beta 或 alpha 标签：`v3.7.22-beta.1`
2. 或者手动触发时不勾选 "Publish to VS Code Marketplace"

### Q5: 如何撤回已发布的版本？

**VS Code Marketplace：**
1. 访问 [Marketplace Publisher Management](https://marketplace.visualstudio.com/manage)
2. 找到你的扩展
3. 点击 **"..."** → **"Unpublish"**

**Open VSX：**
- Open VSX 目前不支持撤回版本，只能发布新版本覆盖

### Q6: Token 过期了怎么办？

**解决方案：**
1. 重新生成新的 Token（参考步骤 1 或 2）
2. 在 GitHub Secrets 中更新对应的 Token
3. 不需要修改工作流文件

---

## 📝 发布检查清单

在发布新版本前，请确认：

- [ ] 已更新 `extension/package.json` 中的版本号
- [ ] 已更新 `CHANGELOG.md`
- [ ] 本地测试通过
- [ ] CI 构建通过
- [ ] `VSCE_TOKEN` 和 `OVSX_TOKEN` 已正确配置
- [ ] Publisher ID 与 package.json 一致
- [ ] 决定是否发布到 Marketplace（正式版 vs beta 版）

---

## 🔗 相关链接

- [VS Code Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Azure DevOps Personal Access Tokens](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate)
- [Open VSX Registry](https://open-vsx.org/)
- [vsce CLI Documentation](https://github.com/microsoft/vscode-vsce)
- [ovsx CLI Documentation](https://github.com/eclipse/openvsx/wiki/Publishing-Extensions)

---

## 🎯 快速参考

### 发布命令（本地）

```bash
# 发布到 VS Code Marketplace
cd extension
pnpm vsce publish --no-dependencies

# 发布到 Open VSX
cd extension
pnpm ovsx publish vlinder-3.7.22.vsix -p YOUR_TOKEN
```

### 环境变量

```bash
# VS Code Marketplace
export VSCE_TOKEN="your-azure-devops-pat"

# Open VSX
export OVSX_TOKEN="your-openvsx-token"
```

---

## 💡 最佳实践

1. **Token 安全**
   - 永远不要在代码中硬编码 Token
   - 定期更换 Token（建议每 6-12 个月）
   - 使用最小权限原则

2. **版本管理**
   - 使用语义化版本（Semantic Versioning）
   - Beta 版本使用 `-beta.x` 后缀
   - Alpha 版本使用 `-alpha.x` 后缀

3. **发布流程**
   - 先在 beta 版本测试
   - 确认无误后再发布正式版
   - 保持 CHANGELOG 更新

4. **监控**
   - 定期检查 Marketplace 下载量和评分
   - 关注用户反馈
   - 及时修复问题

---

如有问题，请查看 [GitHub Actions 日志](../../actions) 或提交 Issue。

