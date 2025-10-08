# 🎉 GitHub Actions 自动发布系统配置完成

恭喜！Vlinder 扩展的自动化发布系统已经配置完成。

## 📦 已创建的文件

### GitHub Actions 工作流

```
.github/
├── workflows/
│   ├── ci.yml              # 持续集成工作流
│   ├── release.yml         # 发布工作流
│   └── README.md           # 工作流说明文档
├── MARKETPLACE_SETUP.md    # Marketplace 配置详细指南
├── QUICKSTART.md           # 快速开始指南
└── README.md               # 总览文档
```

### 发布脚本

```
scripts/
├── release.sh              # Linux/macOS 发布脚本
├── release.bat             # Windows 发布脚本
└── README.md               # 脚本使用说明
```

---

## ✨ 功能特性

### 🔄 持续集成 (CI)

**触发条件：**
- 推送到 `main`、`master` 或 `develop` 分支
- Pull Request

**功能：**
- ✅ 自动安装依赖
- ✅ 构建 webview
- ✅ 类型检查
- ✅ 代码检查（Lint）
- ✅ 运行测试
- ✅ 构建 VSIX
- ✅ 保存构建产物（30 天）

### 🚀 自动发布 (Release)

**触发条件：**
- 推送 `v*` 标签（如 `v3.7.22`）
- 手动触发

**功能：**
- ✅ 完整的 CI 流程
- ✅ 创建 GitHub Release
- ✅ 上传 VSIX 到 Release
- ✅ 自动发布到 VS Code Marketplace（正式版）
- ✅ 自动发布到 Open VSX Registry（正式版）
- ✅ 保存构建产物（90 天）

---

## 🚀 快速开始

### 方式 1: 使用发布脚本（推荐）

**Linux/macOS:**
```bash
./scripts/release.sh 3.7.22 release
```

**Windows:**
```cmd
scripts\release.bat 3.7.22 release
```

### 方式 2: 手动发布

```bash
# 1. 更新版本号
vim extension/package.json  # 修改 version 字段

# 2. 提交并创建标签
git add extension/package.json
git commit -m "chore: bump version to 3.7.22"
git tag v3.7.22
git push origin main
git push origin v3.7.22
```

### 方式 3: GitHub Actions 手动触发

1. 访问 GitHub 仓库的 **Actions** 页面
2. 选择 **"Release VSIX"** 工作流
3. 点击 **"Run workflow"**
4. 配置选项并运行

---

## 🌐 发布到 Marketplace

### 首次配置（仅需一次）

#### 步骤 1: 获取 VS Code Marketplace Token

1. 访问 https://dev.azure.com/
2. 创建 Personal Access Token
3. 权限：Marketplace (Manage)

#### 步骤 2: 获取 Open VSX Token

1. 访问 https://open-vsx.org/
2. 使用 GitHub 登录
3. 创建 Access Token

#### 步骤 3: 配置 GitHub Secrets

在 GitHub 仓库的 **Settings → Secrets** 中添加：

- `VSCE_TOKEN` - VS Code Marketplace Token
- `OVSX_TOKEN` - Open VSX Token

**详细步骤请参考：** [.github/MARKETPLACE_SETUP.md](.github/MARKETPLACE_SETUP.md)

### 自动发布规则

| 标签格式 | 示例 | 发布到 Marketplace |
|---------|------|-------------------|
| `vX.Y.Z` | `v3.7.22` | ✅ 是 |
| `vX.Y.Z-beta.N` | `v3.7.22-beta.1` | ❌ 否 |
| `vX.Y.Z-alpha.N` | `v3.7.22-alpha.1` | ❌ 否 |

---

## 📚 文档导航

### 🚀 [快速开始指南](.github/QUICKSTART.md)
适合第一次使用的用户，包含：
- 基础发布流程
- Marketplace 配置
- 常见问题解答

### 🔧 [Marketplace 配置指南](.github/MARKETPLACE_SETUP.md)
详细的 Marketplace 配置步骤，包含：
- 获取 Token 的详细步骤
- 配置 GitHub Secrets
- 测试发布流程
- 故障排查

### 📖 [工作流说明文档](.github/workflows/README.md)
工作流的技术细节，包含：
- CI/CD 流程说明
- 构建步骤详解
- 自定义配置
- 缓存策略

### 🛠️ [发布脚本说明](scripts/README.md)
发布脚本的使用方法，包含：
- 脚本参数说明
- 执行流程
- 故障排查
- 最佳实践

---

## 🎯 发布流程图

```
开发者
  │
  ├─ 更新代码
  │
  ├─ 运行发布脚本 / 创建标签
  │
  ▼
GitHub Actions
  │
  ├─ CI 工作流
  │   ├─ 安装依赖
  │   ├─ 类型检查
  │   ├─ 代码检查
  │   ├─ 运行测试
  │   └─ 构建 VSIX
  │
  ├─ Release 工作流
  │   ├─ 完整 CI 流程
  │   ├─ 创建 GitHub Release
  │   ├─ 上传 VSIX
  │   ├─ 发布到 VS Code Marketplace (正式版)
  │   └─ 发布到 Open VSX Registry (正式版)
  │
  ▼
发布完成
  │
  ├─ GitHub Release ✅
  ├─ VS Code Marketplace ✅ (正式版)
  └─ Open VSX Registry ✅ (正式版)
```

---

## 📋 发布检查清单

每次发布前，请确认：

- [ ] 已更新 `extension/package.json` 中的版本号
- [ ] 已更新 `CHANGELOG.md`
- [ ] 本地测试通过
- [ ] CI 构建通过
- [ ] 如需发布到 Marketplace，确认已配置 Secrets
- [ ] 选择正确的发布类型（release/beta/alpha）

---

## 🔍 监控发布状态

### 查看构建状态

访问 GitHub Actions 页面：
```
https://github.com/QuickerStudio/Vlinder/actions
```

### 查看 Release

访问 Releases 页面：
```
https://github.com/QuickerStudio/Vlinder/releases
```

### 查看 Marketplace

**VS Code Marketplace:**
```
https://marketplace.visualstudio.com/items?itemName=QuickerStudio.vlinder
```

**Open VSX:**
```
https://open-vsx.org/extension/QuickerStudio/vlinder
```

---

## 💡 最佳实践

### 1. 版本管理

遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范：

- **Bug 修复：** `3.7.22` → `3.7.23`
- **新功能：** `3.7.22` → `3.8.0`
- **重大更新：** `3.7.22` → `4.0.0`

### 2. 发布流程

1. **开发阶段：** 在功能分支开发
2. **测试阶段：** 发布 beta 版本测试
3. **正式发布：** 确认无误后发布正式版

```bash
# 开发完成后，先发布 beta 版本
./scripts/release.sh 3.8.0 beta

# 测试通过后，发布正式版
./scripts/release.sh 3.8.0 release
```

### 3. CHANGELOG 维护

每次发布前更新 `CHANGELOG.md`：

```markdown
## [3.8.0] - 2024-01-15

### Added
- 新功能 A
- 新功能 B

### Fixed
- 修复问题 X
- 修复问题 Y

### Changed
- 改进 Z
```

### 4. Token 安全

- ✅ 定期更换 Token（建议每 6-12 个月）
- ✅ 使用最小权限原则
- ✅ 永远不要在代码中硬编码 Token
- ✅ 在日历中设置 Token 过期提醒

---

## ❓ 常见问题

### Q: 如何只发布到 GitHub，不发布到 Marketplace？

**A:** 使用 beta 或 alpha 标签：
```bash
./scripts/release.sh 3.7.22 beta
```

### Q: 如何撤回已发布的版本？

**A:**
- **GitHub Release:** 在 Releases 页面删除
- **Marketplace:** 访问 https://marketplace.visualstudio.com/manage 撤回
- **Open VSX:** 无法撤回，只能发布新版本

### Q: Token 过期了怎么办？

**A:** 重新生成 Token 并在 GitHub Secrets 中更新，无需修改工作流文件。

### Q: 发布失败了怎么办？

**A:**
1. 查看 Actions 页面的错误日志
2. 参考 [故障排查文档](.github/MARKETPLACE_SETUP.md#5-常见问题)
3. 提交 Issue 寻求帮助

---

## 🔗 相关链接

- [VS Code 扩展发布指南](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [语义化版本规范](https://semver.org/lang/zh-CN/)
- [pnpm 文档](https://pnpm.io/)

---

## 🎉 下一步

1. **阅读快速开始指南**
   👉 [.github/QUICKSTART.md](.github/QUICKSTART.md)

2. **配置 Marketplace 发布**（可选）
   👉 [.github/MARKETPLACE_SETUP.md](.github/MARKETPLACE_SETUP.md)

3. **发布你的第一个版本**
   ```bash
   ./scripts/release.sh 3.7.22 beta
   ```

---

**祝你发布顺利！** 🚀

如有问题，请查看文档或提交 Issue。

