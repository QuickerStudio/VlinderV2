# Fetch Webpage Tool - 使用示例

## 🎯 基础用法

### 示例 1: 抓取单个页面

```xml
<tool name="fetch_webpage">
  <urls>
    <url>https://www.example.com</url>
  </urls>
</tool>
```

**返回结果：**
```xml
<webpage_results>
  <total_urls>1</total_urls>
  <successful>1</successful>
  <failed>0</failed>
  <pages>
    <page>
      <url>https://www.example.com</url>
      <metadata>
        <title>Example Domain</title>
        <description>Example Domain for illustrative examples</description>
      </metadata>
      <content>
# Example Domain

This domain is for use in illustrative examples in documents...
      </content>
    </page>
  </pages>
</webpage_results>
```

---

### 示例 2: 带查询参数抓取（推荐）

```xml
<tool name="fetch_webpage">
  <urls>
    <url>https://docs.python.org/3/library/asyncio.html</url>
  </urls>
  <query>event loop</query>
</tool>
```

**效果：**
- ✅ 只返回包含 "event loop" 的相关段落
- ✅ 按TF-IDF相关性排序
- ✅ 减少无关内容，提高效率

**返回结果：**
```xml
<webpage_results>
  <query>event loop</query>
  <total_urls>1</total_urls>
  <successful>1</successful>
  <failed>0</failed>
  <pages>
    <page>
      <url>https://docs.python.org/3/library/asyncio.html</url>
      <metadata>
        <title>asyncio — Asynchronous I/O — Python 3.x documentation</title>
      </metadata>
      <relevant_sections count="5">
        <section score="2.45">
# Event Loop

The event loop is the core of every asyncio application...
        </section>
        <section score="1.89">
## Running an Event Loop

asyncio.run() is the main entry point for asyncio programs...
        </section>
        <!-- 更多相关片段 -->
      </relevant_sections>
    </page>
  </pages>
</webpage_results>
```

---

### 示例 3: 批量抓取多个页面

```xml
<tool name="fetch_webpage">
  <urls>
    <url>https://nodejs.org/api/fs.html</url>
    <url>https://nodejs.org/api/path.html</url>
    <url>https://nodejs.org/api/os.html</url>
  </urls>
  <query>readFile</query>
</tool>
```

**效果：**
- ✅ 并行抓取3个页面
- ✅ 每个页面独立过滤相关内容
- ✅ 自动应用频率限制（同域名5请求/10秒）

---

## 🔥 高级用法

### 示例 4: 抓取GitHub README

```xml
<tool name="fetch_webpage">
  <urls>
    <url>https://github.com/microsoft/vscode/blob/main/README.md</url>
  </urls>
</tool>
```

**特点：**
- ✅ 自动提取Markdown内容
- ✅ 保留代码块和链接
- ✅ 过滤GitHub导航栏

---

### 示例 5: 抓取技术博客

```xml
<tool name="fetch_webpage">
  <urls>
    <url>https://blog.example.com/how-to-use-react-hooks</url>
  </urls>
  <query>useState useEffect</query>
</tool>
```

**效果：**
- ✅ 自动过滤广告、侧边栏、评论区
- ✅ 只返回与 "useState useEffect" 相关的段落
- ✅ 保留代码示例

---

### 示例 6: 抓取API文档

```xml
<tool name="fetch_webpage">
  <urls>
    <url>https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API</url>
  </urls>
  <query>fetch request response</query>
</tool>
```

**特点：**
- ✅ 提取元数据（标题、描述）
- ✅ 保留代码块语言标识
- ✅ 保留重要的文档链接

---

## 🛡️ 安全特性示例

### 示例 7: SSRF防护

```xml
<!-- ❌ 这些请求会被拒绝 -->
<tool name="fetch_webpage">
  <urls>
    <url>http://127.0.0.1/admin</url>
  </urls>
</tool>
```

**返回错误：**
```xml
<webpage_results>
  <total_urls>1</total_urls>
  <successful>0</successful>
  <failed>1</failed>
  <errors>
    <error>
      <url>http://127.0.0.1/admin</url>
      <message>Access to private IP addresses is not allowed: 127.0.0.1</message>
    </error>
  </errors>
</webpage_results>
```

**被拦截的地址：**
- `127.0.0.1` (localhost)
- `10.x.x.x` (私有网络)
- `192.168.x.x` (私有网络)
- `172.16-31.x.x` (私有网络)
- `169.254.169.254` (云元数据服务)

---

### 示例 8: 协议限制

```xml
<!-- ❌ 只支持HTTP/HTTPS -->
<tool name="fetch_webpage">
  <urls>
    <url>file:///etc/passwd</url>
  </urls>
</tool>
```

**返回错误：**
```xml
<error>
  <url>file:///etc/passwd</url>
  <message>Unsupported protocol: file:. Only HTTP and HTTPS are supported.</message>
</error>
```

---

## ⚡ 性能优化示例

### 示例 9: 缓存机制

```xml
<!-- 第一次请求 -->
<tool name="fetch_webpage">
  <urls>
    <url>https://www.example.com</url>
  </urls>
</tool>
<!-- 耗时: 1500ms -->

<!-- 5分钟内再次请求 -->
<tool name="fetch_webpage">
  <urls>
    <url>https://www.example.com</url>
  </urls>
</tool>
<!-- 耗时: <10ms (从缓存读取) -->
```

**日志输出：**
```
[fetch_webpage] Using cached content for https://www.example.com
[fetch_webpage] Completed in 8ms: 1 succeeded, 0 failed | Cache: 1/1 hits (100.0%)
```

---

### 示例 10: 频率限制

```xml
<!-- 快速连续请求同一域名 -->
<tool name="fetch_webpage">
  <urls>
    <url>https://api.example.com/page1</url>
    <url>https://api.example.com/page2</url>
    <url>https://api.example.com/page3</url>
    <url>https://api.example.com/page4</url>
    <url>https://api.example.com/page5</url>
    <url>https://api.example.com/page6</url>
  </urls>
</tool>
```

**行为：**
- 前5个请求立即执行
- 第6个请求自动等待（频率限制：5请求/10秒）
- 避免对目标服务器造成压力

**日志输出：**
```
[RateLimiter] Rate limit for api.example.com, waiting 3500ms
```

---

## 🎨 内容质量示例

### 示例 11: 自动过滤噪音

**原始HTML：**
```html
<html>
  <nav>Home | About | Contact</nav>
  <aside>Advertisement</aside>
  <main>
    <h1>Main Article</h1>
    <p>This is the main content...</p>
  </main>
  <footer>© 2024 Company. Privacy Policy | Terms</footer>
</html>
```

**提取结果：**
```markdown
# Main Article

This is the main content...
```

**自动过滤的元素：**
- ✅ `<nav>` 导航栏
- ✅ `<aside>` 侧边栏
- ✅ `<footer>` 页脚
- ✅ `<header>` 页头
- ✅ 广告、Cookie提示等

---

### 示例 12: 智能内容评分

```xml
<tool name="fetch_webpage">
  <urls>
    <url>https://blog.example.com/technical-article</url>
  </urls>
</tool>
```

**内容质量评分机制：**

| 特征 | 加分 | 减分 |
|-----|------|------|
| 长段落 (>100词) | +40 | - |
| 完整句子 (>5句) | +25 | - |
| 代码块 ``` | +20 | - |
| 技术关键词 (API, async, function) | +15 | - |
| 标题结构 | +15 | - |
| 大量列表项 (>80%) | - | -40 |
| 短行无标点 (>70%) | - | -30 |
| 重复内容 (>50%) | - | -20 |
| 版权声明、Cookie提示 | - | -10 |

**结果：** 只返回高质量段落（评分 ≥ 0）

---

## 🔍 错误处理示例

### 示例 13: 网络错误

```xml
<tool name="fetch_webpage">
  <urls>
    <url>https://this-domain-does-not-exist-12345.com</url>
  </urls>
</tool>
```

**返回结果：**
```xml
<webpage_results>
  <total_urls>1</total_urls>
  <successful>0</successful>
  <failed>1</failed>
  <errors>
    <error>
      <url>https://this-domain-does-not-exist-12345.com</url>
      <message>DNS lookup failed - domain not found</message>
    </error>
  </errors>
</webpage_results>
```

---

### 示例 14: 超时重试

```xml
<tool name="fetch_webpage">
  <urls>
    <url>https://very-slow-server.com</url>
  </urls>
</tool>
```

**行为：**
1. 第1次尝试 → 30秒超时
2. 等待1秒
3. 第2次尝试 → 30秒超时
4. 等待2秒
5. 第3次尝试 → 30秒超时
6. 返回错误

**返回结果：**
```xml
<error>
  <url>https://very-slow-server.com</url>
  <message>Request timed out after 30 seconds (tried 3 times)</message>
</error>
```

---

### 示例 15: 部分成功

```xml
<tool name="fetch_webpage">
  <urls>
    <url>https://www.example.com</url>
    <url>https://invalid-domain-xyz.com</url>
    <url>https://www.google.com</url>
  </urls>
</tool>
```

**返回结果：**
```xml
<webpage_results>
  <total_urls>3</total_urls>
  <successful>2</successful>
  <failed>1</failed>
  <pages>
    <page>
      <url>https://www.example.com</url>
      <content>...</content>
    </page>
    <page>
      <url>https://www.google.com</url>
      <content>...</content>
    </page>
  </pages>
  <errors>
    <error>
      <url>https://invalid-domain-xyz.com</url>
      <message>DNS lookup failed - domain not found</message>
    </error>
  </errors>
</webpage_results>
```

---

## 📊 最佳实践

### ✅ DO（推荐做法）

1. **使用查询参数**
   ```xml
   <query>specific topic</query>
   ```
   减少无关内容，提高效率

2. **批量抓取相关页面**
   ```xml
   <urls>
     <url>https://docs.example.com/api</url>
     <url>https://docs.example.com/guide</url>
   </urls>
   ```
   利用并行抓取和缓存

3. **抓取静态内容**
   - 文档、博客、README
   - 新闻文章、技术教程

### ❌ DON'T（不推荐做法）

1. **不要抓取动态渲染的SPA**
   ```xml
   <!-- ❌ React/Vue应用可能无法正确抓取 -->
   <url>https://app.example.com/dashboard</url>
   ```
   → 使用专门的浏览器自动化工具

2. **不要抓取需要登录的页面**
   ```xml
   <!-- ❌ 无法处理登录状态 -->
   <url>https://example.com/private/data</url>
   ```
   → 使用API或专门的爬虫工具

3. **不要一次抓取过多URL**
   ```xml
   <!-- ❌ 超过10个会被拒绝 -->
   <urls>
     <url>...</url> × 20
   </urls>
   ```
   → 分批抓取

---

## 🎓 总结

Fetch Webpage Tool 最适合：
- ✅ 实时抓取文档和博客
- ✅ 提取页面核心内容供AI分析
- ✅ 小规模（1-10个页面）快速抓取
- ✅ 需要安全防护的企业环境

不适合：
- ❌ 大规模爬取（>100页面）
- ❌ JavaScript重度渲染的SPA
- ❌ 需要登录或Cookie管理
- ❌ 需要处理验证码

对于复杂场景，建议使用 Scrapy、Puppeteer 等专业工具。

