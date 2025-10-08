# 🚀 快速开始 - 自动发布 Vlinder

## ⚡ 5 分钟设置指南

### 第一步：设置 API Tokens（只需做一次）

#### 1. VS Code Marketplace Token

```
1. 访问：https://marketplace.visualstudio.com/manage/publishers/quickerstudio
2. 点击右上角用户名 → "Personal Access Tokens"
3. 点击 "+ New Token"
4. 设置：
   - Name: GitHub Actions
   - Organization: All accessible organizations
   - Scopes: ✅ Marketplace (Publish)
5. 点击 "Create" 并复制 token
```

#### 2. Open VSX Token

```
1. 访问：https://open-vsx.org/user-settings/tokens
2. 点击 "Generate New Token"
3. 输入描述：GitHub Actions
4. 点击 "Generate" 并复制 token
```

#### 3. 添加到 GitHub Secrets

```
1. 打开：https://github.com/QuickerStudio/Vlinder/settings/secrets/actions
2. 点击 "New repository secret"
3. 添加两个 secrets：
   - Name: VSCE_TOKEN → Value: (粘贴 VS Code token)
   - Name: OVSX_TOKEN → Value: (粘贴 Open VSX token)
```

### 第二步：发布新版本

#### 方法 A：命令行发布（推荐）

```bash
# 1. 更新版本号（编辑 extension/package.json）
# 例如：从 "3.7.21" 改为 "3.7.22"

# 2. 提交并推送
git add extension/package.json
git commit -m "chore: bump version to 3.7.22"
git push origin main

# 3. 创建标签并推送
git tag v3.7.22
git push origin v3.7.22

# 完成！GitHub Actions 会自动完成剩余工作
```

#### 方法 B：GitHub 网页手动触发

```
1. 打开：https://github.com/QuickerStudio/Vlinder/actions
2. 点击 "Release Extension"
3. 点击 "Run workflow"
4. 选择 "main" 分支
5. 点击绿色的 "Run workflow" 按钮
```

### 第三步：验证发布

等待 5-10 分钟后，检查：

```
✅ GitHub Release: https://github.com/QuickerStudio/Vlinder/releases
✅ VS Code 市场: https://marketplace.visualstudio.com/items?itemName=QuickerStudio.vlinder
✅ Open VSX: https://open-vsx.org/extension/QuickerStudio/vlinder
```

## 🎯 自动化流程说明

当你推送标签后，GitHub Actions 会自动：

```
1. ⚙️  安装依赖
2. 🔨 构建 webview
3. 📦 打包扩展 (.vsix)
4. 🎉 创建 GitHub Release
5. ⬆️  上传 .vsix 到 Release
6. 🛒 发布到 VS Code Marketplace
7. 🌐 发布到 Open VSX Registry
8. ✅ 完成！
```

整个过程大约需要 **5-10 分钟**，完全自动化，无需人工干预。

## 📋 版本号规则

当前版本：`3.7.21`

更新规则：
- **Bug 修复**：`3.7.21` → `3.7.22` (最后一位 +1)
- **新功能**：`3.7.21` → `3.8.0` (中间一位 +1)
- **重大更新**：`3.7.21` → `4.0.0` (第一位 +1)

## 🔥 常见问题

### Q: Token 过期了怎么办？

```
A: 重新生成 token，然后更新 GitHub Secrets：
   1. 生成新的 token（按照上面的步骤）
   2. 打开 GitHub Secrets 页面
   3. 点击对应 secret 的 "Update" 按钮
   4. 粘贴新的 token
```

### Q: 发布失败了怎么办？

```
A: 查看 Actions 日志：
   1. 打开：https://github.com/QuickerStudio/Vlinder/actions
   2. 点击失败的工作流
   3. 查看红色 ❌ 的步骤
   4. 根据错误信息修复问题
```

### Q: 如何撤销发布？

```
A: 发布后无法撤销，但可以发布新版本：
   1. 修复问题
   2. 增加版本号（例如 3.7.22 → 3.7.23）
   3. 重新发布
```

### Q: 可以发布测试版本吗？

```
A: 可以！使用预发布版本号：
   1. 版本号格式：3.7.22-beta.1
   2. 标签格式：v3.7.22-beta.1
   3. 会标记为 "Pre-release"
```

## 💡 专业提示

### 提示 1：发布前检查清单

```
✅ 本地测试通过
✅ 更新了 CHANGELOG.md
✅ 版本号正确递增
✅ 提交信息清晰明确
```

### 提示 2：监控发布进度

```
实时查看：https://github.com/QuickerStudio/Vlinder/actions
- 绿色 ✅ = 成功
- 黄色 🟡 = 进行中
- 红色 ❌ = 失败
```

### 提示 3：充分利用 Copilot 免费额度

你每月有 50 次免费 Copilot 使用次数，建议：

```
1. 用于审查发布前的代码质量
2. 用于生成 CHANGELOG 内容
3. 用于编写 Release Notes
4. 用于优化 GitHub Actions 配置
5. 保留一些用于紧急 bug 修复
```

## 🎊 完成！

现在你已经设置好了全自动发布流程！

每次发布只需要：
1. 更新版本号
2. 推送标签
3. 等待 5-10 分钟
4. 完成！🎉

---

**需要帮助？** 查看详细文档：[RELEASE_GUIDE.md](./RELEASE_GUIDE.md)

**🦋 让 Vlinder 飞向世界！**

