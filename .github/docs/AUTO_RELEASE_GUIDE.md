# 🚀 自动发布指南 - 无需手动改版本号

## 🎯 核心特性

✅ **完全自动化** - 无需手动修改 `package.json`  
✅ **一键发布** - 只需点击按钮选择更新类型  
✅ **智能版本号** - 自动计算新版本号  
✅ **自动提交** - 自动提交版本更新到 Git  
✅ **多平台发布** - 同时发布到 3 个平台  

## 📋 前置准备（只需做一次）

### 设置 API Tokens

你需要在 GitHub 仓库中设置两个 Secrets：

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

## 🚀 三种发布方式

### 方式 1: 🎯 一键发布（最简单，推荐）

这是最简单的方式，完全自动化，无需任何手动操作！

**步骤：**

1. **打开 GitHub Actions**
   ```
   访问: https://github.com/QuickerStudio/Vlinder/actions
   ```

2. **选择工作流**
   ```
   点击左侧: "🚀 一键发布"
   ```

3. **运行工作流**
   ```
   点击右侧: "Run workflow" 按钮
   选择分支: main
   选择更新类型:
     - patch  (Bug 修复: 3.7.21 → 3.7.22)
     - minor  (新功能: 3.7.21 → 3.8.0)
     - major  (重大更新: 3.7.21 → 4.0.0)
   点击: "Run workflow"
   ```

4. **等待完成**
   ```
   等待 5-10 分钟
   查看进度和日志
   ```

5. **完成！** 🎉
   ```
   ✅ 版本号自动更新
   ✅ 自动提交到 Git
   ✅ 自动创建标签
   ✅ 自动打包扩展
   ✅ 自动创建 GitHub Release
   ✅ 自动发布到 VS Code Marketplace
   ✅ 自动发布到 Open VSX Registry
   ```

### 方式 2: Release Extension（标准方式）

这个工作流提供更多控制选项。

**步骤：**

1. 访问: https://github.com/QuickerStudio/Vlinder/actions
2. 点击: "Release Extension"
3. 点击: "Run workflow"
4. 选择更新类型或输入自定义版本号
5. 点击: "Run workflow"

### 方式 3: Release with Copilot（智能方式）

这个工作流可以使用 GitHub Copilot 生成更智能的 Release Notes。

**步骤：**

1. 访问: https://github.com/QuickerStudio/Vlinder/actions
2. 点击: "Release with Copilot (Smart)"
3. 点击: "Run workflow"
4. 选择更新类型
5. 选择是否使用 Copilot 生成 Release Notes
6. 点击: "Run workflow"

## 📊 版本号规则

### 自动计算规则

| 更新类型 | 当前版本 | 新版本 | 说明 |
|---------|---------|--------|------|
| **patch** | 3.7.21 | 3.7.22 | Bug 修复、小改进 |
| **minor** | 3.7.21 | 3.8.0 | 新功能、向后兼容 |
| **major** | 3.7.21 | 4.0.0 | 重大更新、可能不兼容 |

### 选择建议

**使用 patch 当：**
- 修复 bug
- 小的改进
- 文档更新
- 性能优化

**使用 minor 当：**
- 添加新功能
- 向后兼容的更改
- 新的 API

**使用 major 当：**
- 重大架构变更
- 不兼容的 API 变更
- 重大功能重写

## 🎬 完整发布流程演示

### 场景：修复了一个 Bug，需要发布新版本

```
当前版本: 3.7.21
目标: 发布 Bug 修复版本

步骤:
1. 打开 https://github.com/QuickerStudio/Vlinder/actions
2. 点击 "🚀 一键发布"
3. 点击 "Run workflow"
4. 选择 "patch" (因为是 Bug 修复)
5. 点击绿色的 "Run workflow" 按钮
6. 等待 5-10 分钟

结果:
✅ 版本自动更新为 3.7.22
✅ 自动发布到所有平台
✅ 完成！
```

## 📈 工作流执行过程

```
┌─────────────────────────────────────────────────────────────┐
│  1. 📥 检出代码                                              │
│     从 GitHub 拉取最新代码                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. 🔢 自动计算新版本号                                      │
│     当前: 3.7.21                                            │
│     类型: patch                                             │
│     新版本: 3.7.22 ✅                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. 📝 生成更新日志                                          │
│     收集自上次发布以来的所有提交                             │
│     生成 Release Notes                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. 💾 自动更新 package.json                                 │
│     将版本号从 3.7.21 改为 3.7.22                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. 🏷️ 自动提交和打标签                                      │
│     git commit -m "chore: bump version to 3.7.22"           │
│     git tag v3.7.22                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  6. ⬆️ 推送到 GitHub                                         │
│     git push origin main                                    │
│     git push origin v3.7.22                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  7. 📦 安装依赖和构建                                        │
│     pnpm install                                            │
│     pnpm run build:webview                                  │
│     pnpm run build                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  8. 🎉 创建 GitHub Release                                   │
│     创建 v3.7.22 Release                                    │
│     上传 .vsix 文件                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  9. 🛒 发布到 VS Code Marketplace                            │
│     使用 VSCE_TOKEN 发布                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  10. 🌐 发布到 Open VSX Registry                             │
│      使用 OVSX_TOKEN 发布                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  11. ✅ 完成！                                               │
│      生成发布摘要                                            │
│      显示所有链接                                            │
└─────────────────────────────────────────────────────────────┘
```

## 🎊 发布后验证

发布完成后，自动生成的摘要会显示所有链接：

```
✅ GitHub Release
   https://github.com/QuickerStudio/Vlinder/releases/tag/v3.7.22

✅ VS Code Marketplace
   https://marketplace.visualstudio.com/items?itemName=QuickerStudio.vlinder

✅ Open VSX Registry
   https://open-vsx.org/extension/QuickerStudio/vlinder
```

## 💡 最佳实践

### 发布频率建议

- **patch**: 随时发布（Bug 修复）
- **minor**: 每 1-2 周（新功能）
- **major**: 每 1-3 个月（重大更新）

### 发布前检查

虽然是自动化的，但建议：

1. ✅ 确保本地测试通过
2. ✅ 确保 CI 构建通过
3. ✅ 检查是否有未合并的 PR
4. ✅ 确认要发布的更改

### 充分利用 Copilot 额度

你每月有 50 次免费 Copilot 使用，建议：

- 使用 "Release with Copilot" 工作流时才启用 Copilot
- 对重要版本使用 Copilot 生成更好的 Release Notes
- 保留额度用于代码审查和开发

## 🐛 故障排除

### 问题 1: 工作流失败

**症状**: 工作流运行失败，显示红色 ❌

**解决方案**:
1. 点击失败的工作流查看详细日志
2. 查看具体哪一步失败
3. 根据错误信息修复问题
4. 重新运行工作流

### 问题 2: Token 过期

**症状**: 发布到 Marketplace 或 Open VSX 失败

**解决方案**:
1. 重新生成 token
2. 更新 GitHub Secrets
3. 重新运行工作流

### 问题 3: 版本号冲突

**症状**: 提示版本号已存在

**解决方案**:
1. 检查是否已经发布了该版本
2. 如果是误操作，选择更高的版本号
3. 或者删除错误的标签后重试

## 📞 获取帮助

- **快速指南**: [QUICK_START_CN.md](./QUICK_START_CN.md)
- **详细指南**: [RELEASE_GUIDE.md](./RELEASE_GUIDE.md)
- **GitHub Issues**: https://github.com/QuickerStudio/Vlinder/issues
- **官方网站**: https://vlinders.org

---

**🦋 现在你可以轻松发布 Vlinder，无需手动改版本号！**

