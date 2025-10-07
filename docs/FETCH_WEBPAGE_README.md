# Fetch Webpage Tool - 使用指南

## 简介

fetch-webpage是Vlinder扩展中的一个强大工具，用于获取和提取网页内容。它支持多URL并行获取、智能内容过滤、HTML到Markdown转换等功能。

## 快速开始

### 基本用法

```xml
<tool name="fetch_webpage">
  <urls>
    <url>https://example.com</url>
  </urls>
</tool>
```

### 带查询过滤

```xml
<tool name="fetch_webpage">
  <urls>
    <url>https://docs.python.org/3/library/asyncio.html</url>
  </urls>
  <query>event loop</query>
</tool>
```

### 多URL获取

```xml
<tool name="fetch_webpage">
  <urls>
    <url>https://nodejs.org/api/fs.html</url>
    <url>https://nodejs.org/api/path.html</url>
  </urls>
  <query>readFile</query>
</tool>
```

## 功能特性

### ✅ 核心功能

1. **多URL支持**
   - 一次最多获取10个URL
   - 并行处理，提高效率
   - 部分失败不影响其他URL

2. **智能内容提取**
   - HTML自动转换为Markdown
   - 移除script、style等无关标签
   - 优先提取main/article内容

3. **查询过滤**
   - 基于关键词过滤内容
   - 相关性评分排序
   - 包含上下文窗口

4. **安全保护**
   - 只允许HTTP/HTTPS协议
   - 拒绝私有IP地址
   - 内容大小限制(50KB/URL)
   - 30秒超时保护

### ✅ 输出格式

工具返回结构化的XML格式：

```xml
<fetch_webpage_results>
  <summary>
    <total_urls>2</total_urls>
    <successful>2</successful>
    <failed>0</failed>
    <query>readFile</query>
  </summary>
  
  <successful_fetches>
    <page>
      <url>https://nodejs.org/api/fs.html</url>
      <content_type>text/html</content_type>
      <content>
        # File System
        
        The fs module provides...
      </content>
    </page>
  </successful_fetches>
</fetch_webpage_results>
```

## 使用场景

### 1. 获取文档

```xml
<tool name="fetch_webpage">
  <urls>
    <url>https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array</url>
  </urls>
  <query>map filter reduce</query>
</tool>
```

**适用于**: 查找API文档、学习资料

### 2. 读取GitHub README

```xml
<tool name="fetch_webpage">
  <urls>
    <url>https://raw.githubusercontent.com/microsoft/vscode/main/README.md</url>
  </urls>
</tool>
```

**适用于**: 了解项目信息、安装说明

### 3. 比较多个页面

```xml
<tool name="fetch_webpage">
  <urls>
    <url>https://react.dev/learn</url>
    <url>https://vuejs.org/guide/introduction.html</url>
    <url>https://angular.io/guide/what-is-angular</url>
  </urls>
  <query>component</query>
</tool>
```

**适用于**: 技术选型、对比分析

### 4. 提取特定信息

```xml
<tool name="fetch_webpage">
  <urls>
    <url>https://www.npmjs.com/package/react</url>
  </urls>
  <query>installation version</query>
</tool>
```

**适用于**: 快速查找特定信息

## 参数说明

### urls (必需)
- **类型**: 字符串数组
- **限制**: 1-10个URL
- **格式**: 必须是有效的HTTP/HTTPS URL
- **示例**: `["https://example.com"]`

### query (可选)
- **类型**: 字符串
- **作用**: 过滤和高亮相关内容
- **示例**: `"installation guide"`

## 限制和约束

### URL限制
- ✅ 允许: HTTP和HTTPS协议
- ❌ 拒绝: FTP、File等其他协议
- ❌ 拒绝: 私有IP地址(127.x.x.x, 192.168.x.x, 10.x.x.x等)
- ❌ 拒绝: localhost

### 内容限制
- 最多10个URL
- 每个URL最多50KB内容
- 30秒超时

### 支持的内容类型
- ✅ text/html
- ✅ text/plain
- ✅ application/xhtml+xml
- ❌ application/pdf
- ❌ image/*
- ❌ video/*

## 错误处理

### 常见错误

#### 1. 无效URL
```
Error: Invalid URL: not-a-valid-url
```
**解决**: 确保URL格式正确，包含协议(http://或https://)

#### 2. 私有IP地址
```
Error: Access to private IP addresses is not allowed: 192.168.1.1
```
**解决**: 使用公网可访问的URL

#### 3. 超时
```
Error: Request timed out after 30 seconds
```
**解决**: 检查网络连接，或尝试更快的URL

#### 4. 404错误
```
Error: HTTP 404: Not Found
```
**解决**: 检查URL是否正确，页面是否存在

#### 5. 太多URL
```
Error: Too many URLs. Maximum 10 URLs allowed, got 15
```
**解决**: 减少URL数量到10个以内

## 最佳实践

### 1. 使用查询参数
```xml
<!-- 好的做法 -->
<tool name="fetch_webpage">
  <urls>
    <url>https://docs.python.org/3/library/asyncio.html</url>
  </urls>
  <query>async await</query>
</tool>

<!-- 避免 -->
<tool name="fetch_webpage">
  <urls>
    <url>https://docs.python.org/3/library/asyncio.html</url>
  </urls>
  <!-- 没有query，返回全部内容 -->
</tool>
```

### 2. 合理使用多URL
```xml
<!-- 好的做法 - 相关的页面 -->
<tool name="fetch_webpage">
  <urls>
    <url>https://nodejs.org/api/fs.html</url>
    <url>https://nodejs.org/api/path.html</url>
  </urls>
  <query>file operations</query>
</tool>

<!-- 避免 - 不相关的页面 -->
<tool name="fetch_webpage">
  <urls>
    <url>https://nodejs.org/api/fs.html</url>
    <url>https://react.dev/learn</url>
    <url>https://www.python.org</url>
  </urls>
</tool>
```

### 3. 使用原始内容URL
```xml
<!-- 好的做法 - GitHub raw URL -->
<tool name="fetch_webpage">
  <urls>
    <url>https://raw.githubusercontent.com/user/repo/main/README.md</url>
  </urls>
</tool>

<!-- 可以但不推荐 - GitHub页面URL -->
<tool name="fetch_webpage">
  <urls>
    <url>https://github.com/user/repo/blob/main/README.md</url>
  </urls>
</tool>
```

## 性能提示

### 1. 并行获取
工具自动并行获取多个URL，无需手动优化。

### 2. 内容过滤
使用query参数可以减少返回的内容量，提高处理速度。

### 3. 避免大页面
如果页面内容超过50KB，会被自动截断。选择内容精简的页面。

## 安全注意事项

### 1. 不要访问内网
工具会自动拒绝私有IP地址，保护内网安全。

### 2. 内容清理
工具会自动移除script和style标签，防止XSS攻击。

### 3. 超时保护
30秒超时可以防止长时间等待。

## 故障排除

### 问题: 获取失败
1. 检查URL是否正确
2. 检查网络连接
3. 检查URL是否可公开访问
4. 尝试在浏览器中打开URL

### 问题: 内容不完整
1. 检查是否被截断(50KB限制)
2. 使用query参数过滤相关内容
3. 考虑分多次获取

### 问题: 查询无结果
1. 检查query拼写
2. 尝试更通用的关键词
3. 不使用query获取全部内容

## 测试

### 运行单元测试
```bash
cd extension
npx jest fetch-webpage.tool.test.ts
```

### 运行集成测试
```bash
cd extension
npx jest fetch-webpage.integration.test.ts
```

## 相关文档

- [实现文档](./FETCH_WEBPAGE_TOOL_IMPLEMENTATION.md)
- [测试计划](./FETCH_WEBPAGE_TESTING_PLAN.md)
- [改进方案](./FETCH_WEBPAGE_IMPROVEMENTS.md)
- [测试报告](./FETCH_WEBPAGE_TEST_REPORT.md)
- [项目总结](./FETCH_WEBPAGE_SUMMARY.md)

## 支持

如有问题或建议，请：
1. 查看相关文档
2. 检查测试用例
3. 提交Issue

## 更新日志

### v1.0.0 (2025-10-04)
- ✅ 初始版本发布
- ✅ 支持多URL并行获取
- ✅ 智能内容过滤
- ✅ 安全性增强
- ✅ 完整测试覆盖

---

**最后更新**: 2025-10-04  
**版本**: 1.0.0  
**状态**: ✅ 生产就绪

