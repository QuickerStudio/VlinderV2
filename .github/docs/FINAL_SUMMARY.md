# ✅ Vlinder 自动发布系统 - 完成总结

## 🎉 恭喜！你现在拥有完全自动化的发布系统

### 核心特性

✅ **无需手动改版本号** - 系统自动计算和更新  
✅ **一键发布** - 只需点击按钮选择更新类型  
✅ **自动提交** - 自动提交版本更新到 Git  
✅ **自动打标签** - 自动创建 Git 标签  
✅ **多平台发布** - 同时发布到 GitHub、VS Code Marketplace、Open VSX  
✅ **智能 Release Notes** - 自动生成或使用 Copilot 生成  

## 📦 已创建的文件

### GitHub Actions 工作流（4 个）

1. **`.github/workflows/one-click-release.yml`** ⭐ 推荐
   - 一键发布，最简单
   - 自动计算版本号
   - 完全自动化

2. **`.github/workflows/release.yml`**
   - 标准发布工作流
   - 支持自定义版本号
   - 自动更新 package.json

3. **`.github/workflows/release-with-copilot.yml`**
   - 智能发布工作流
   - 可选使用 Copilot 生成 Release Notes
   - 适合重要版本发布

4. **`.github/workflows/build-test.yml`**
   - 持续集成测试
   - 自动构建验证

### 文档（6 个）

1. **`.github/README.md`** - GitHub Actions 总览
2. **`.github/RELEASE_CHECKLIST.md`** - 发布检查清单
3. **`.github/docs/AUTO_RELEASE_GUIDE.md`** ⭐ 自动发布指南（推荐阅读）
4. **`.github/docs/RELEASE_GUIDE.md`** - 详细发布指南
5. **`.github/docs/QUICK_START_CN.md`** - 快速开始指南
6. **`.github/docs/SETUP_COMPLETE.md`** - 设置完成说明

### 发布脚本（2 个）

1. **`scripts/release.sh`** - Linux/macOS 发布脚本
2. **`scripts/release.bat`** - Windows 发布脚本

### README 更新

- **`README.md`** - 已添加 Vlinders.org 链接

## 🚀 如何使用

### 最简单的方式：一键发布

```
1. 访问: https://github.com/QuickerStudio/Vlinder/actions
2. 点击: "🚀 一键发布"
3. 点击: "Run workflow"
4. 选择更新类型:
   - patch  (Bug 修复: 3.7.21 → 3.7.22)
   - minor  (新功能: 3.7.21 → 3.8.0)
   - major  (重大更新: 3.7.21 → 4.0.0)
5. 点击: "Run workflow"
6. 等待 5-10 分钟
7. 完成！✅
```

### 自动化流程

```
你点击按钮后，系统会自动：

1. ✅ 计算新版本号
2. ✅ 更新 extension/package.json
3. ✅ 提交到 Git
4. ✅ 创建标签
5. ✅ 推送到 GitHub
6. ✅ 安装依赖
7. ✅ 构建 webview
8. ✅ 打包扩展
9. ✅ 创建 GitHub Release
10. ✅ 上传 .vsix 文件
11. ✅ 发布到 VS Code Marketplace
12. ✅ 发布到 Open VSX Registry
13. ✅ 生成发布摘要

全程无需任何手动操作！
```

## 🎯 首次使用前的准备

### 设置 API Tokens（只需做一次）

#### 1. VS Code Marketplace Token

```
访问: https://marketplace.visualstudio.com/manage/publishers/quickerstudio

步骤:
1. 点击右上角用户名 → "Personal Access Tokens"
2. 点击 "+ New Token"
3. Name: GitHub Actions
4. Organization: All accessible organizations
5. Scopes: ✅ Marketplace (Publish)
6. 点击 "Create" 并复制 token
```

#### 2. Open VSX Token

```
访问: https://open-vsx.org/user-settings/tokens

步骤:
1. 点击 "Generate New Token"
2. Description: GitHub Actions
3. 点击 "Generate" 并复制 token
```

#### 3. 添加到 GitHub Secrets

```
访问: https://github.com/QuickerStudio/Vlinder/settings/secrets/actions

步骤:
1. 点击 "New repository secret"
2. 添加 VSCE_TOKEN (粘贴 VS Code token)
3. 添加 OVSX_TOKEN (粘贴 Open VSX token)
```

## 📊 三种工作流对比

| 特性 | 一键发布 | 标准发布 | Copilot 发布 |
|------|---------|---------|-------------|
| 自动版本号 | ✅ | ✅ | ✅ |
| 自定义版本号 | ❌ | ✅ | ✅ |
| 自动提交 | ✅ | ✅ | ✅ |
| 自动发布 | ✅ | ✅ | ✅ |
| Copilot Notes | ❌ | ❌ | ✅ (可选) |
| 使用难度 | ⭐ 最简单 | ⭐⭐ 简单 | ⭐⭐⭐ 中等 |
| 推荐场景 | 日常发布 | 需要特定版本号 | 重要版本 |

## 💡 版本号选择建议

### patch (3.7.21 → 3.7.22)

适用于：
- ✅ Bug 修复
- ✅ 小的改进
- ✅ 文档更新
- ✅ 性能优化
- ✅ 依赖更新

### minor (3.7.21 → 3.8.0)

适用于：
- ✅ 新功能
- ✅ 向后兼容的更改
- ✅ 新的 API
- ✅ 功能增强

### major (3.7.21 → 4.0.0)

适用于：
- ✅ 重大架构变更
- ✅ 不兼容的 API 变更
- ✅ 重大功能重写
- ✅ 破坏性更新

## 🎬 完整示例：发布一个 Bug 修复版本

### 场景

```
当前版本: 3.7.21
修复了一个 Bug
需要发布新版本
```

### 步骤

```
1. 打开浏览器
   访问: https://github.com/QuickerStudio/Vlinder/actions

2. 选择工作流
   点击左侧: "🚀 一键发布"

3. 运行工作流
   点击右侧: "Run workflow"
   选择分支: main
   选择类型: patch (因为是 Bug 修复)
   点击: "Run workflow"

4. 等待完成
   查看进度（约 5-10 分钟）
   
5. 验证发布
   ✅ GitHub Release: https://github.com/QuickerStudio/Vlinder/releases
   ✅ VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=QuickerStudio.vlinder
   ✅ Open VSX: https://open-vsx.org/extension/QuickerStudio/vlinder

6. 完成！
   新版本 3.7.22 已发布到所有平台
```

## 📈 发布后的验证清单

```
✅ GitHub Release 已创建
✅ .vsix 文件已上传
✅ VS Code Marketplace 版本已更新
✅ Open VSX Registry 版本已更新
✅ 从 Marketplace 安装测试通过
✅ 核心功能测试通过
```

## 🔥 常见问题

### Q: 我不想手动改版本号，可以吗？

**A: 可以！这正是我们的核心特性！**

使用 "🚀 一键发布" 工作流，只需选择更新类型（patch/minor/major），系统会自动计算和更新版本号。

### Q: 我可以指定特定的版本号吗？

**A: 可以！**

使用 "Release Extension" 工作流，选择 "custom" 类型，然后输入你想要的版本号。

### Q: 发布失败了怎么办？

**A: 查看日志并修复问题**

1. 点击失败的工作流查看详细日志
2. 根据错误信息修复问题
3. 重新运行工作流

常见问题：
- Token 过期 → 重新生成并更新 Secrets
- 版本冲突 → 使用更高的版本号
- 构建失败 → 检查代码和依赖

### Q: 如何使用 Copilot 生成 Release Notes？

**A: 使用 "Release with Copilot" 工作流**

1. 选择 "Release with Copilot (Smart)" 工作流
2. 勾选 "使用 GitHub Copilot 生成 Release Notes"
3. 运行工作流

注意：这会使用你的 Copilot 额度。

### Q: 我每月有 50 次 Copilot 额度，如何充分利用？

**A: 建议分配**

- 发布相关 (15 次):
  - 重要版本使用 Copilot 生成 Release Notes (5 次)
  - 审查发布前的代码质量 (5 次)
  - 优化 GitHub Actions 配置 (5 次)

- 开发相关 (25 次):
  - 代码审查和优化 (10 次)
  - Bug 修复 (8 次)
  - 新功能开发 (7 次)

- 紧急情况预留 (10 次)

## 📚 推荐阅读顺序

1. **[自动发布指南](./AUTO_RELEASE_GUIDE.md)** ⭐ 先读这个
2. **[快速开始指南](./QUICK_START_CN.md)** - 5 分钟上手
3. **[详细发布指南](./RELEASE_GUIDE.md)** - 深入了解
4. **[发布检查清单](../ RELEASE_CHECKLIST.md)** - 确保质量

## 🎊 总结

你现在拥有：

✅ **完全自动化的发布系统**
- 无需手动改版本号
- 一键发布到所有平台
- 自动生成 Release Notes

✅ **三种发布方式**
- 一键发布（最简单）
- 标准发布（灵活）
- Copilot 发布（智能）

✅ **完整的文档**
- 快速开始指南
- 详细发布指南
- 故障排除指南

✅ **便捷的脚本**
- Windows 脚本
- Linux/macOS 脚本

## 🚀 开始使用

现在就去试试吧！

1. 设置 API Tokens（如果还没有）
2. 访问 https://github.com/QuickerStudio/Vlinder/actions
3. 点击 "🚀 一键发布"
4. 选择 "patch"
5. 点击 "Run workflow"
6. 等待完成！

---

**🦋 让 Vlinder 的发布像蝴蝶一样优雅！**

**有问题？查看文档或提交 Issue！**

