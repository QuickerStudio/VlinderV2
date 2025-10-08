# 🚀 快速开始指南

本指南帮助你快速配置和使用 GitHub Actions 自动发布 Vlinder 扩展。

## 📦 基础发布（仅 GitHub Release）

如果你只想发布到 GitHub Release，无需任何额外配置！

### 步骤 1: 更新版本号

编辑 `extension/package.json`：

```json
{
  "version": "3.7.22"
}
```

### 步骤 2: 提交并创建标签

```bash
git add extension/package.json
git commit -m "chore: bump version to 3.7.22"
git tag v3.7.22
git push origin main
git push origin v3.7.22
```

### 步骤 3: 等待构建完成

1. 访问 GitHub 仓库的 **Actions** 页面
2. 查看 "Release VSIX" 工作流运行状态
3. 构建完成后，在 **Releases** 页面可以看到新版本
4. 下载 VSIX 文件并手动安装

✅ **完成！** 你的扩展已发布到 GitHub Release。

---

## 🌐 高级发布（包含 Marketplace）

如果你想自动发布到 VS Code Marketplace 和 Open VSX Registry，需要额外配置。

### 前置要求

- [ ] Microsoft 账号（用于 Azure DevOps）
- [ ] GitHub 账号（用于 Open VSX）
- [ ] 10 分钟时间

### 步骤 1: 获取 VS Code Marketplace Token

#### 1.1 创建 Azure DevOps PAT

1. 访问 https://dev.azure.com/
2. 登录并创建组织
3. 点击右上角用户图标 → **Personal access tokens**
4. 点击 **+ New Token**
5. 配置：
   - Name: `vscode-marketplace`
   - Scopes: **Custom defined** → 勾选 **Marketplace** (Manage)
   - Expiration: 1 年
6. 点击 **Create** 并**立即复制** Token

#### 1.2 创建 Publisher 账号

1. 访问 https://marketplace.visualstudio.com/manage
2. 登录（使用相同的 Microsoft 账号）
3. 点击 **Create publisher**
4. Publisher ID: `QuickerStudio`（必须与 package.json 一致）
5. 点击 **Create**

### 步骤 2: 获取 Open VSX Token

1. 访问 https://open-vsx.org/
2. 使用 GitHub 账号登录
3. 点击用户名 → **Access Tokens**
4. 点击 **Generate New Token**
5. Description: `GitHub Actions`
6. Scopes: 勾选 **Publish extensions**
7. 点击 **Generate Token** 并**立即复制**

### 步骤 3: 配置 GitHub Secrets

1. 访问你的 GitHub 仓库
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 添加两个 Secret：

   **Secret 1:**
   - Name: `VSCE_TOKEN`
   - Value: 粘贴步骤 1.1 中的 Azure DevOps PAT

   **Secret 2:**
   - Name: `OVSX_TOKEN`
   - Value: 粘贴步骤 2 中的 Open VSX Token

### 步骤 4: 发布到 Marketplace

现在你有两种方式发布：

#### 方式 A: 自动发布（推荐）

推送正式版本标签会自动发布到 Marketplace：

```bash
git tag v3.7.22
git push origin v3.7.22
```

#### 方式 B: 手动发布

1. 访问 **Actions** 页面
2. 选择 **Release VSIX** 工作流
3. 点击 **Run workflow**
4. ✅ 勾选 **Publish to VS Code Marketplace**
5. 点击 **Run workflow**

✅ **完成！** 你的扩展将自动发布到：
- GitHub Release
- VS Code Marketplace
- Open VSX Registry

---

## 🧪 测试版本发布

如果你想发布测试版本（不发布到 Marketplace）：

```bash
# Beta 版本
git tag v3.7.22-beta.1
git push origin v3.7.22-beta.1

# Alpha 版本
git tag v3.7.22-alpha.1
git push origin v3.7.22-alpha.1
```

这些版本只会发布到 GitHub Release，不会发布到 Marketplace。

---

## 📋 发布检查清单

每次发布前，请确认：

- [ ] 已更新 `extension/package.json` 中的版本号
- [ ] 已更新 `CHANGELOG.md`
- [ ] 本地测试通过：`cd extension && pnpm run build`
- [ ] CI 构建通过（查看 Actions 页面）
- [ ] 如需发布到 Marketplace，确认已配置 `VSCE_TOKEN` 和 `OVSX_TOKEN`

---

## ❓ 常见问题

### Q: 如何查看发布状态？

**A:** 访问 GitHub 仓库的 **Actions** 页面，查看工作流运行状态。

### Q: 发布失败了怎么办？

**A:** 
1. 查看 Actions 页面的错误日志
2. 常见问题：
   - Token 过期或配置错误
   - Publisher ID 不匹配
   - 版本号已存在

### Q: 如何撤回已发布的版本？

**A:**
- **GitHub Release:** 在 Releases 页面删除
- **Marketplace:** 访问 https://marketplace.visualstudio.com/manage 撤回
- **Open VSX:** 无法撤回，只能发布新版本

### Q: 如何只发布到 GitHub，不发布到 Marketplace？

**A:** 使用 beta 或 alpha 标签：

```bash
git tag v3.7.22-beta.1
git push origin v3.7.22-beta.1
```

### Q: Token 多久过期？

**A:**
- **VSCE_TOKEN:** 根据你设置的有效期（建议 1 年）
- **OVSX_TOKEN:** 默认不过期，但建议定期更换

---

## 🔗 更多信息

- **详细配置指南:** [MARKETPLACE_SETUP.md](MARKETPLACE_SETUP.md)
- **工作流说明:** [workflows/README.md](workflows/README.md)
- **VS Code 发布文档:** https://code.visualstudio.com/api/working-with-extensions/publishing-extension

---

## 💡 提示

1. **首次发布建议使用 beta 版本测试**
   ```bash
   git tag v3.7.22-beta.1
   git push origin v3.7.22-beta.1
   ```

2. **定期检查 Token 有效期**
   - 在日历中设置提醒
   - Token 过期前 1 个月更新

3. **保持 CHANGELOG 更新**
   - 每次发布前更新变更日志
   - 用户可以清楚了解新功能和修复

4. **监控发布状态**
   - 关注 GitHub Actions 通知
   - 检查 Marketplace 页面是否正常显示

---

**祝你发布顺利！** 🎉

如有问题，请查看 [详细配置指南](MARKETPLACE_SETUP.md) 或提交 Issue。

