# 📋 Vlinder 发布检查清单

使用此检查清单确保每次发布都顺利进行。

## 🎯 发布版本信息

- **版本号**: `v______` (例如：v3.7.22)
- **发布日期**: `____-__-__`
- **发布类型**: [ ] Bug 修复 [ ] 新功能 [ ] 重大更新
- **发布负责人**: `________`

---

## 📝 发布前准备

### 代码准备

- [ ] 所有计划的功能已完成
- [ ] 所有已知 bug 已修复
- [ ] 代码已合并到 `main` 分支
- [ ] 本地代码与远程同步

### 测试验证

- [ ] 单元测试通过 (`pnpm run test`)
- [ ] 类型检查通过 (`pnpm run check-types`)
- [ ] 代码检查通过 (`pnpm run lint`)
- [ ] 本地构建成功 (`pnpm run build`)
- [ ] 扩展在 VS Code 中正常运行
- [ ] 核心功能手动测试通过

### 文档更新

- [ ] 更新 `CHANGELOG.md`
  - [ ] 添加新版本号和日期
  - [ ] 列出所有新功能
  - [ ] 列出所有 bug 修复
  - [ ] 列出所有破坏性变更（如有）
- [ ] 更新 `README.md`（如需要）
- [ ] 更新 `extension/README.md`（如需要）
- [ ] 更新相关文档

### 版本号更新

- [ ] 更新 `extension/package.json` 中的 `version` 字段
  - 当前版本：`________`
  - 新版本：`________`
- [ ] 版本号遵循语义化版本规范
  - [ ] PATCH (x.x.X): Bug 修复
  - [ ] MINOR (x.X.0): 新功能
  - [ ] MAJOR (X.0.0): 重大更新

---

## 🚀 发布流程

### 1. 提交代码

```bash
# 检查状态
git status

# 添加更改
git add extension/package.json CHANGELOG.md

# 提交
git commit -m "chore: bump version to X.X.X"

# 推送到远程
git push origin main
```

- [ ] 代码已提交
- [ ] 代码已推送到 GitHub

### 2. 创建标签

```bash
# 创建标签
git tag vX.X.X

# 推送标签
git push origin vX.X.X
```

- [ ] Git 标签已创建
- [ ] Git 标签已推送到 GitHub

### 3. 监控 GitHub Actions

- [ ] 打开 Actions 页面：https://github.com/QuickerStudio/Vlinder/actions
- [ ] 确认 "Release Extension" 工作流已触发
- [ ] 等待工作流完成（约 5-10 分钟）
- [ ] 所有步骤显示绿色 ✅

---

## ✅ 发布后验证

### GitHub Release

- [ ] 访问：https://github.com/QuickerStudio/Vlinder/releases
- [ ] 确认新版本已创建
- [ ] 确认版本号正确
- [ ] 确认 Release Notes 内容正确
- [ ] 确认 .vsix 文件已上传
- [ ] 下载 .vsix 文件测试安装

### VS Code Marketplace

- [ ] 访问：https://marketplace.visualstudio.com/items?itemName=QuickerStudio.vlinder
- [ ] 确认版本号已更新
- [ ] 确认更新时间正确
- [ ] 确认描述和截图正确
- [ ] 确认下载链接有效
- [ ] 测试从 Marketplace 安装

### Open VSX Registry

- [ ] 访问：https://open-vsx.org/extension/QuickerStudio/vlinder
- [ ] 确认版本号已更新
- [ ] 确认更新时间正确
- [ ] 确认描述正确
- [ ] 测试从 Open VSX 安装

### 功能测试

- [ ] 从 Marketplace 安装新版本
- [ ] 测试核心功能
- [ ] 测试新增功能
- [ ] 确认 bug 修复生效
- [ ] 检查是否有新的问题

---

## 📢 发布后通知

### 社区通知

- [ ] 更新官网：https://vlinders.org
- [ ] 发布 GitHub Discussions 公告
- [ ] 更新社交媒体（如适用）
- [ ] 通知贡献者和测试者

### 文档更新

- [ ] 更新在线文档（如有）
- [ ] 更新 Wiki（如有）
- [ ] 更新教程（如有）

---

## 🐛 问题追踪

### 发布过程中遇到的问题

| 问题描述 | 解决方案 | 状态 |
|---------|---------|------|
|         |         |      |
|         |         |      |

### 发布后发现的问题

| 问题描述 | 严重程度 | 计划修复版本 |
|---------|---------|-------------|
|         |         |             |
|         |         |             |

---

## 📊 发布统计

### 构建信息

- **构建时间**: `____` 分钟
- **包大小**: `____` MB
- **依赖数量**: `____`

### 发布平台

- **GitHub Release**: [ ] 成功 [ ] 失败
- **VS Code Marketplace**: [ ] 成功 [ ] 失败
- **Open VSX Registry**: [ ] 成功 [ ] 失败

### 时间记录

- **开始时间**: `____:____`
- **完成时间**: `____:____`
- **总耗时**: `____` 分钟

---

## 💡 改进建议

记录本次发布过程中的改进建议：

1. 
2. 
3. 

---

## ✍️ 签名确认

- **发布负责人**: `________`
- **审核人**: `________`
- **日期**: `____-__-__`

---

## 📎 附加说明

其他需要记录的信息：

---

**🦋 发布完成！感谢你让 Vlinder 变得更好！**

---

## 🔗 快速链接

- **Actions**: https://github.com/QuickerStudio/Vlinder/actions
- **Releases**: https://github.com/QuickerStudio/Vlinder/releases
- **Marketplace**: https://marketplace.visualstudio.com/items?itemName=QuickerStudio.vlinder
- **Open VSX**: https://open-vsx.org/extension/QuickerStudio/vlinder
- **Website**: https://vlinders.org

