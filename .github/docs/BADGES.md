# 📊 徽章和统计信息说明

本文档说明 Vlinder 项目中使用的各种徽章（Badges）及其含义。

## 🎯 徽章概览

Vlinder 项目使用以下徽章来展示项目的状态和统计信息：

### 1. VS Code Marketplace 版本

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/QuickerStudio.vlinder?label=VS%20Code%20Marketplace&logo=visual-studio-code&color=blue)](https://marketplace.visualstudio.com/items?itemName=QuickerStudio.vlinder)

**含义：** 显示当前在 VS Code Marketplace 上发布的最新版本号

**链接：** 点击跳转到 VS Code Marketplace 扩展页面

---

### 2. 下载量

[![Downloads](https://img.shields.io/visual-studio-marketplace/d/QuickerStudio.vlinder?label=Downloads&logo=visual-studio-code&color=green)](https://marketplace.visualstudio.com/items?itemName=QuickerStudio.vlinder)

**含义：** 显示扩展的总下载次数

**更新频率：** 实时更新

**链接：** 点击跳转到 VS Code Marketplace 扩展页面

---

### 3. 评分

[![Rating](https://img.shields.io/visual-studio-marketplace/r/QuickerStudio.vlinder?label=Rating&logo=visual-studio-code&color=yellow)](https://marketplace.visualstudio.com/items?itemName=QuickerStudio.vlinder)

**含义：** 显示用户评分（1-5 星）

**更新频率：** 实时更新

**链接：** 点击跳转到 VS Code Marketplace 扩展页面

---

### 4. GitHub Stars

[![GitHub Stars](https://img.shields.io/github/stars/QuickerStudio/Vlinder?style=social)](https://github.com/QuickerStudio/Vlinder)

**含义：** 显示 GitHub 仓库的星标数量

**更新频率：** 实时更新

**链接：** 点击跳转到 GitHub 仓库

---

### 5. 许可证

[![License](https://img.shields.io/github/license/QuickerStudio/Vlinder?color=purple)](https://github.com/QuickerStudio/Vlinder/blob/main/LICENSE)

**含义：** 显示项目使用的开源许可证类型（AGPL-3.0）

**链接：** 点击查看完整许可证文本

---

### 6. 官方网站

[![Website](https://img.shields.io/badge/Website-vlinders.org-orange)](https://vlinders.org/)

**含义：** 项目官方网站链接

**链接：** 点击访问 https://vlinders.org/

---

### 7. CI 状态（可选）

[![CI](https://github.com/QuickerStudio/Vlinder/actions/workflows/ci.yml/badge.svg)](https://github.com/QuickerStudio/Vlinder/actions/workflows/ci.yml)

**含义：** 显示持续集成（CI）的构建状态

**状态：**
- ✅ 绿色（passing）- 构建成功
- ❌ 红色（failing）- 构建失败
- 🟡 黄色（pending）- 构建中

**链接：** 点击查看 GitHub Actions 构建详情

---

### 8. Release 状态（可选）

[![Release](https://github.com/QuickerStudio/Vlinder/actions/workflows/release.yml/badge.svg)](https://github.com/QuickerStudio/Vlinder/actions/workflows/release.yml)

**含义：** 显示发布工作流的状态

**链接：** 点击查看 GitHub Actions 发布详情

---

## 📍 徽章位置

### README.md

徽章显示在 README.md 的顶部，紧跟在 banner 图片之后：

```markdown
# 🦋 Vlinder - A Dream for Everyone

<p align="center">
  <img src="assets/banner.png" alt="Vlinder Banner" width="100%">
</p>

<p align="center">
  [徽章显示在这里]
</p>
```

### package.json

徽章配置在 `package.json` 的 `badges` 字段中：

```json
{
  "badges": [
    {
      "url": "徽章图片 URL",
      "href": "点击跳转链接",
      "description": "徽章描述"
    }
  ]
}
```

这些徽章会显示在：
- VS Code Marketplace 扩展页面
- Open VSX Registry 扩展页面

### GitHub Release

徽章也会自动添加到每个 GitHub Release 的发布说明中。

---

## 🔧 徽章技术说明

### Shields.io

所有徽章都使用 [Shields.io](https://shields.io/) 服务生成。

**优点：**
- ✅ 实时更新
- ✅ 高可用性
- ✅ 支持自定义样式
- ✅ 免费使用

### 徽章 URL 格式

#### VS Code Marketplace 徽章

```
https://img.shields.io/visual-studio-marketplace/{metric}/QuickerStudio.vlinder
```

**可用的 metrics：**
- `v` - 版本号
- `d` - 下载量
- `i` - 安装量
- `r` - 评分
- `rating` - 评分（带星星）

#### GitHub 徽章

```
https://img.shields.io/github/{metric}/QuickerStudio/Vlinder
```

**可用的 metrics：**
- `stars` - 星标数
- `forks` - Fork 数
- `issues` - Issue 数
- `license` - 许可证
- `last-commit` - 最后提交时间

### 自定义样式参数

可以通过 URL 参数自定义徽章样式：

```
?label=标签文本
&logo=图标名称
&color=颜色
&style=样式
```

**示例：**
```
https://img.shields.io/visual-studio-marketplace/d/QuickerStudio.vlinder?label=Downloads&logo=visual-studio-code&color=green
```

---

## 📊 统计数据来源

### VS Code Marketplace

- **来源：** https://marketplace.visualstudio.com/
- **API：** Visual Studio Marketplace API
- **更新频率：** 实时

### GitHub

- **来源：** https://github.com/
- **API：** GitHub API
- **更新频率：** 实时

### Open VSX Registry

- **来源：** https://open-vsx.org/
- **API：** Open VSX API
- **更新频率：** 实时

---

## 🎨 徽章颜色方案

| 徽章类型 | 颜色 | 含义 |
|---------|------|------|
| Marketplace 版本 | 蓝色 (blue) | 官方版本信息 |
| 下载量 | 绿色 (green) | 积极的增长指标 |
| 评分 | 黄色 (yellow) | 用户反馈 |
| GitHub Stars | 社交样式 | 社区支持 |
| 许可证 | 紫色 (purple) | 法律信息 |
| 网站 | 橙色 (orange) | 品牌色 |

---

## 🔄 如何更新徽章

### 自动更新

大部分徽章会自动更新，无需手动操作：
- ✅ 版本号 - 发布新版本后自动更新
- ✅ 下载量 - 实时更新
- ✅ 评分 - 实时更新
- ✅ Stars - 实时更新

### 手动更新

如果需要修改徽章样式或添加新徽章：

1. **修改 README.md**
   ```bash
   vim extension/README.md
   # 编辑徽章部分
   ```

2. **修改 package.json**
   ```bash
   vim extension/package.json
   # 编辑 badges 字段
   ```

3. **修改 Release 模板**
   ```bash
   vim .github/workflows/release.yml
   # 编辑 body 部分
   ```

---

## 💡 最佳实践

### 1. 保持简洁

不要添加太多徽章，建议最多 6-8 个。

### 2. 优先级排序

将最重要的徽章放在前面：
1. 版本号
2. 下载量
3. 评分
4. Stars
5. 其他

### 3. 保持一致

在所有文档中使用相同的徽章样式和颜色。

### 4. 定期检查

确保所有徽章链接正常工作。

---

## 🔗 相关链接

- [Shields.io 官方文档](https://shields.io/)
- [VS Code Marketplace API](https://docs.microsoft.com/en-us/azure/devops/extend/develop/work-with-urls)
- [GitHub Badges](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes#adding-a-badge-to-your-readme)

---

## ❓ 常见问题

### Q: 徽章不显示怎么办？

**A:** 检查：
1. URL 是否正确
2. 扩展是否已发布到 Marketplace
3. 网络连接是否正常

### Q: 如何自定义徽章颜色？

**A:** 在 URL 中添加 `?color=颜色名称` 参数。

### Q: 徽章数据多久更新一次？

**A:** 大部分徽章是实时更新的，但可能有 5-10 分钟的缓存延迟。

### Q: 可以添加自定义徽章吗？

**A:** 可以！使用 Shields.io 的自定义徽章功能：
```
https://img.shields.io/badge/标签-内容-颜色
```

---

**提示：** 徽章不仅美观，还能提供有价值的项目信息，帮助用户快速了解项目状态！

