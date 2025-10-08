# GitHub Actions 工作流说明

本目录包含 Vlinder 扩展的自动化工作流配置。

## 工作流列表

### 1. CI 工作流 (`ci.yml`)

**触发条件：**
- 推送到 `main`、`master` 或 `develop` 分支
- 针对这些分支的 Pull Request

**功能：**
- 安装依赖
- 构建 webview
- 类型检查
- 代码检查（Lint）
- 运行测试
- 打包扩展
- 构建 VSIX 文件
- 上传 VSIX 作为构建产物（保留 30 天）

**用途：**
确保每次代码变更都能成功构建，并且通过所有检查和测试。

---

### 2. Release 工作流 (`release.yml`)

**触发条件：**
1. **自动触发：** 推送以 `v` 开头的标签（如 `v3.7.21`）
2. **手动触发：** 在 GitHub Actions 页面手动运行，可选择指定版本号和是否发布到 Marketplace

**功能：**
- 安装依赖
- 构建 webview
- 类型检查
- 代码检查（Lint）
- 打包扩展
- 构建 VSIX 文件
- 创建 GitHub Release
- 上传 VSIX 到 Release
- 上传 VSIX 作为构建产物（保留 90 天）
- **自动发布到 VS Code Marketplace**（正式版本）
- **自动发布到 Open VSX Registry**（正式版本）

**用途：**
自动化发布流程，创建 GitHub Release 并附带 VSIX 安装包，可选自动发布到扩展市场。

---

## 使用方法

### 发布新版本

#### 方法 1: 使用 Git 标签（推荐）

1. 更新 `extension/package.json` 中的版本号
2. 提交更改：
   ```bash
   git add extension/package.json
   git commit -m "chore: bump version to 3.7.22"
   ```
3. 创建并推送标签：
   ```bash
   git tag v3.7.22
   git push origin v3.7.22
   ```
4. GitHub Actions 会自动触发，创建 Release 并上传 VSIX

#### 方法 2: 手动触发

1. 访问 GitHub 仓库的 Actions 页面
2. 选择 "Release VSIX" 工作流
3. 点击 "Run workflow"
4. （可选）输入版本号，或留空使用 package.json 中的版本
5. （可选）勾选 "Publish to VS Code Marketplace" 以发布到扩展市场
6. 点击 "Run workflow" 确认

---

## 发布到 VS Code Marketplace

### 自动发布规则

工作流会在以下情况下**自动发布**到 VS Code Marketplace 和 Open VSX Registry：

1. ✅ 推送正式版本标签（如 `v3.7.22`）
2. ❌ **不会**发布 beta 版本（如 `v3.7.22-beta.1`）
3. ❌ **不会**发布 alpha 版本（如 `v3.7.22-alpha.1`）
4. ✅ 手动触发时勾选了 "Publish to VS Code Marketplace"

### 配置 Marketplace 发布

**首次使用前，需要配置发布令牌：**

1. 获取 **VS Code Marketplace Token** (VSCE_TOKEN)
2. 获取 **Open VSX Token** (OVSX_TOKEN)
3. 在 GitHub 仓库的 Settings → Secrets 中添加这两个 Token

**详细配置步骤请参考：** [MARKETPLACE_SETUP.md](../MARKETPLACE_SETUP.md)

### 发布测试版本

如果你想发布测试版本到 GitHub Release，但**不发布到 Marketplace**：

```bash
# 使用 beta 或 alpha 标签
git tag v3.7.22-beta.1
git push origin v3.7.22-beta.1
```

这样会创建 GitHub Release，但不会发布到 Marketplace。

---

## 工作流详细说明

### 环境要求

- **Node.js:** 20.x
- **包管理器:** pnpm 8.x
- **操作系统:** Ubuntu Latest

### 构建步骤

1. **依赖安装：** 使用 `pnpm install:all` 安装主扩展和 webview 的依赖
2. **Webview 构建：** 使用 Vite 构建 React webview UI
3. **类型检查：** 使用 TypeScript 编译器检查类型
4. **代码检查：** 使用 ESLint 检查代码质量
5. **打包：** 使用 esbuild 打包扩展代码
6. **构建 VSIX：** 使用 vsce 创建 VSIX 安装包

### 缓存策略

工作流使用 pnpm store 缓存来加速依赖安装：
- 缓存键基于 `pnpm-lock.yaml` 的哈希值
- 当依赖未变更时，可以显著减少构建时间

---

## Release 说明

每个 Release 包含：

1. **标签：** 格式为 `vX.Y.Z`（如 `v3.7.21`）
2. **Release 标题：** "Release X.Y.Z"
3. **VSIX 文件：** 可直接下载安装的扩展包
4. **安装说明：** 如何在 VS Code 中安装 VSIX
5. **变更日志链接：** 指向 CHANGELOG.md

---

## 故障排查

### 构建失败

1. **检查日志：** 在 Actions 页面查看详细的构建日志
2. **本地测试：** 在本地运行相同的命令：
   ```bash
   cd extension
   pnpm install:all
   pnpm run build:webview
   pnpm run check-types
   pnpm run lint
   pnpm run package
   pnpm run build
   ```

### Release 创建失败

1. **检查权限：** 确保 `GITHUB_TOKEN` 有足够的权限
2. **检查标签：** 确保标签格式正确（`v` + 版本号）
3. **检查版本号：** 确保版本号在 package.json 中已更新

### VSIX 文件未找到

1. **检查构建步骤：** 确保 `pnpm run build` 成功执行
2. **检查文件名：** VSIX 文件名格式应为 `vlinder-X.Y.Z.vsix`

---

## 自定义配置

### 修改触发分支

编辑 `ci.yml` 中的 `on.push.branches` 和 `on.pull_request.branches`：

```yaml
on:
  push:
    branches:
      - main
      - your-branch
```

### 修改 Node.js 版本

编辑工作流中的 `node-version`：

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'  # 修改为所需版本
```

### 修改产物保留时间

编辑 `retention-days`：

```yaml
- name: Upload VSIX as artifact
  uses: actions/upload-artifact@v4
  with:
    retention-days: 90  # 修改为所需天数
```

---

## 安全注意事项

1. **GITHUB_TOKEN：** 由 GitHub 自动提供，无需手动配置
2. **敏感信息：** 不要在工作流中硬编码 API 密钥或密码
3. **依赖安全：** 定期更新依赖以修复安全漏洞

---

## 相关链接

- [Marketplace 发布配置指南](../MARKETPLACE_SETUP.md) - **配置自动发布到 Marketplace**
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [pnpm 文档](https://pnpm.io/)
- [vsce 文档](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [VS Code 扩展开发](https://code.visualstudio.com/api)
- [Open VSX Registry](https://open-vsx.org/)

