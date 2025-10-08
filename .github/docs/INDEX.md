# 📚 Vlinder 自动发布系统 - 文档索引

欢迎使用 Vlinder 自动发布系统！这里是所有文档的导航页面。

## 🚀 快速开始

### 我是新手，从哪里开始？

**推荐阅读顺序：**

1. **[自动发布指南](./AUTO_RELEASE_GUIDE.md)** ⭐ 必读
   - 5 分钟了解如何无需手动改版本号就能发布
   - 一键发布的完整流程
   - 版本号自动计算规则

2. **[快速开始指南](./QUICK_START_CN.md)**
   - 首次设置 API Tokens
   - 三种发布方式对比
   - 常见问题解答

3. **[最终总结](./FINAL_SUMMARY.md)**
   - 系统功能总览
   - 已创建文件清单
   - 完整使用示例

## 📖 详细文档

### 发布相关

- **[详细发布指南](./RELEASE_GUIDE.md)**
  - 完整的发布流程
  - 故障排除指南
  - Token 获取和设置
  - 版本号规范

- **[工作流程图](./WORKFLOW_DIAGRAM.md)**
  - 可视化发布流程
  - 三种工作流对比
  - 时间线和最佳实践

- **[发布检查清单](../RELEASE_CHECKLIST.md)**
  - 发布前准备
  - 发布流程
  - 发布后验证
  - 问题追踪

### 设置相关

- **[设置完成说明](./SETUP_COMPLETE.md)**
  - 已创建的文件
  - 下一步操作
  - 首次使用指南

## 🎯 按使用场景查找

### 场景 1: 我想快速发布一个 Bug 修复

**推荐文档：**
1. [自动发布指南](./AUTO_RELEASE_GUIDE.md) - 查看"一键发布"部分
2. [快速开始指南](./QUICK_START_CN.md) - 查看"方法 A"

**快速步骤：**
```
1. 访问 Actions 页面
2. 点击 "🚀 一键发布"
3. 选择 "patch"
4. 点击 "Run workflow"
5. 等待完成
```

### 场景 2: 我想发布一个新功能

**推荐文档：**
1. [自动发布指南](./AUTO_RELEASE_GUIDE.md) - 查看版本号规则
2. [工作流程图](./WORKFLOW_DIAGRAM.md) - 了解完整流程

**快速步骤：**
```
1. 访问 Actions 页面
2. 点击 "🚀 一键发布"
3. 选择 "minor"
4. 点击 "Run workflow"
5. 等待完成
```

### 场景 3: 我想发布一个重大更新

**推荐文档：**
1. [详细发布指南](./RELEASE_GUIDE.md) - 了解重大更新注意事项
2. [发布检查清单](../RELEASE_CHECKLIST.md) - 确保质量

**快速步骤：**
```
1. 完成所有测试
2. 更新 CHANGELOG.md
3. 访问 Actions 页面
4. 点击 "🚀 一键发布"
5. 选择 "major"
6. 点击 "Run workflow"
7. 等待完成
8. 验证所有平台
```

### 场景 4: 我想使用 Copilot 生成专业的 Release Notes

**推荐文档：**
1. [自动发布指南](./AUTO_RELEASE_GUIDE.md) - 查看 Copilot 使用建议
2. [详细发布指南](./RELEASE_GUIDE.md) - 了解 Release Notes 最佳实践

**快速步骤：**
```
1. 访问 Actions 页面
2. 点击 "Release with Copilot (Smart)"
3. 选择版本类型
4. 勾选 "使用 GitHub Copilot"
5. 点击 "Run workflow"
6. 等待完成
```

### 场景 5: 发布失败了，我该怎么办？

**推荐文档：**
1. [详细发布指南](./RELEASE_GUIDE.md) - 查看"故障排除"部分
2. [快速开始指南](./QUICK_START_CN.md) - 查看"常见问题"

**排查步骤：**
```
1. 查看 Actions 日志
2. 找到失败的步骤
3. 根据错误信息修复
4. 重新运行工作流
```

### 场景 6: 我是第一次使用，需要设置什么？

**推荐文档：**
1. [快速开始指南](./QUICK_START_CN.md) - 查看"第一步"
2. [设置完成说明](./SETUP_COMPLETE.md) - 查看"首次使用前的准备"

**设置步骤：**
```
1. 获取 VS Code Marketplace Token
2. 获取 Open VSX Token
3. 添加到 GitHub Secrets
4. 完成！可以开始发布了
```

## 📊 文档对比

| 文档 | 长度 | 难度 | 适合人群 | 推荐指数 |
|------|------|------|---------|---------|
| [自动发布指南](./AUTO_RELEASE_GUIDE.md) | 中等 | ⭐ 简单 | 所有人 | ⭐⭐⭐⭐⭐ |
| [快速开始指南](./QUICK_START_CN.md) | 短 | ⭐ 简单 | 新手 | ⭐⭐⭐⭐⭐ |
| [详细发布指南](./RELEASE_GUIDE.md) | 长 | ⭐⭐ 中等 | 需要深入了解 | ⭐⭐⭐⭐ |
| [工作流程图](./WORKFLOW_DIAGRAM.md) | 中等 | ⭐ 简单 | 视觉学习者 | ⭐⭐⭐⭐ |
| [最终总结](./FINAL_SUMMARY.md) | 长 | ⭐ 简单 | 所有人 | ⭐⭐⭐⭐⭐ |
| [设置完成说明](./SETUP_COMPLETE.md) | 中等 | ⭐ 简单 | 新手 | ⭐⭐⭐⭐ |
| [发布检查清单](../RELEASE_CHECKLIST.md) | 中等 | ⭐⭐ 中等 | 追求质量 | ⭐⭐⭐ |

## 🎓 学习路径

### 路径 1: 快速上手（15 分钟）

```
1. 阅读 [快速开始指南](./QUICK_START_CN.md) (5 分钟)
2. 设置 API Tokens (5 分钟)
3. 尝试一次发布 (5 分钟)
```

### 路径 2: 深入理解（30 分钟）

```
1. 阅读 [自动发布指南](./AUTO_RELEASE_GUIDE.md) (10 分钟)
2. 阅读 [工作流程图](./WORKFLOW_DIAGRAM.md) (10 分钟)
3. 阅读 [详细发布指南](./RELEASE_GUIDE.md) (10 分钟)
```

### 路径 3: 完全掌握（1 小时）

```
1. 阅读所有文档 (40 分钟)
2. 实践发布流程 (15 分钟)
3. 尝试故障排除 (5 分钟)
```

## 🔍 按关键词查找

### 版本号
- [自动发布指南](./AUTO_RELEASE_GUIDE.md) - 版本号自动计算
- [工作流程图](./WORKFLOW_DIAGRAM.md) - 版本号计算逻辑
- [详细发布指南](./RELEASE_GUIDE.md) - 版本号规范

### Token 设置
- [快速开始指南](./QUICK_START_CN.md) - Token 获取步骤
- [详细发布指南](./RELEASE_GUIDE.md) - Token 详细说明
- [设置完成说明](./SETUP_COMPLETE.md) - Token 设置指南

### 故障排除
- [详细发布指南](./RELEASE_GUIDE.md) - 完整故障排除
- [快速开始指南](./QUICK_START_CN.md) - 常见问题
- [自动发布指南](./AUTO_RELEASE_GUIDE.md) - 常见问题

### Copilot
- [自动发布指南](./AUTO_RELEASE_GUIDE.md) - Copilot 使用建议
- [工作流程图](./WORKFLOW_DIAGRAM.md) - Copilot 额度分配
- [最终总结](./FINAL_SUMMARY.md) - Copilot 最佳实践

### 工作流
- [工作流程图](./WORKFLOW_DIAGRAM.md) - 可视化流程
- [自动发布指南](./AUTO_RELEASE_GUIDE.md) - 三种工作流对比
- [GitHub Actions 总览](../README.md) - 工作流说明

## 📞 获取帮助

### 文档没有解决我的问题

1. **查看 GitHub Issues**
   - https://github.com/QuickerStudio/Vlinder/issues
   - 搜索类似问题
   - 提交新 Issue

2. **查看 Actions 日志**
   - https://github.com/QuickerStudio/Vlinder/actions
   - 查看详细错误信息

3. **访问官方网站**
   - https://vlinders.org
   - 获取更多信息

### 我想贡献文档

欢迎贡献！请：

1. Fork 仓库
2. 编辑或添加文档
3. 提交 Pull Request
4. 等待审核

## 🎊 快速链接

### 常用链接

- **GitHub Actions**: https://github.com/QuickerStudio/Vlinder/actions
- **Releases**: https://github.com/QuickerStudio/Vlinder/releases
- **VS Code Marketplace**: https://marketplace.visualstudio.com/items?itemName=QuickerStudio.vlinder
- **Open VSX**: https://open-vsx.org/extension/QuickerStudio/vlinder
- **官方网站**: https://vlinders.org

### Token 管理

- **VS Code Marketplace**: https://marketplace.visualstudio.com/manage/publishers/quickerstudio
- **Open VSX**: https://open-vsx.org/user-settings/tokens
- **GitHub Secrets**: https://github.com/QuickerStudio/Vlinder/settings/secrets/actions

## 📝 文档更新日志

- **2024-01-XX**: 创建自动发布系统文档
  - 添加自动发布指南
  - 添加工作流程图
  - 添加最终总结
  - 添加文档索引

## 🌟 推荐阅读

**如果你只有 5 分钟：**
- 阅读 [快速开始指南](./QUICK_START_CN.md)

**如果你有 15 分钟：**
- 阅读 [自动发布指南](./AUTO_RELEASE_GUIDE.md)
- 阅读 [快速开始指南](./QUICK_START_CN.md)

**如果你有 30 分钟：**
- 阅读 [最终总结](./FINAL_SUMMARY.md)
- 阅读 [自动发布指南](./AUTO_RELEASE_GUIDE.md)
- 阅读 [工作流程图](./WORKFLOW_DIAGRAM.md)

**如果你想完全掌握：**
- 阅读所有文档 📚

---

**🦋 开始你的 Vlinder 发布之旅吧！**

**有问题？从 [快速开始指南](./QUICK_START_CN.md) 开始！**

