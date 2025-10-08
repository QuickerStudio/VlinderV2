# Context7 替代方案 - 无需API账号访问文档

## 问题分析

Context7 API (`https://api.context7.com`) 可能：
1. 不是公开的REST API
2. 是一个MCP (Model Context Protocol) 服务器
3. 需要通过特定方式访问

## 发现：Context7是MCP服务器

根据研究，**Context7是由Upstash开发的MCP服务器**，而不是传统的REST API。

- **GitHub**: https://github.com/upstash/context7
- **博客**: https://upstash.com/blog/context7-llmtxt-cursor
- **工作原理**: 从GitHub仓库抓取`llms.txt`文件

---

## 解决方案1：直接访问llms.txt文件 ✅ 推荐

### 什么是llms.txt？

`llms.txt` 是一个标准格式，用于为LLM提供文档。许多项目在其仓库中包含此文件。

### 访问方式

直接从GitHub仓库获取文档：

```
https://raw.githubusercontent.com/{org}/{repo}/main/llms.txt
```

### 示例

**React**:
```
https://raw.githubusercontent.com/facebook/react/main/llms.txt
```

**Next.js**:
```
https://raw.githubusercontent.com/vercel/next.js/canary/llms.txt
```

**Supabase**:
```
https://raw.githubusercontent.com/supabase/supabase/master/llms.txt
```

### 优点

✅ 无需API密钥  
✅ 直接访问  
✅ 免费  
✅ 实时更新  
✅ 标准格式  

### 缺点

❌ 不是所有项目都有llms.txt  
❌ 需要知道仓库路径  
❌ 没有主题过滤  

---

## 解决方案2：使用GitHub API ✅ 推荐

### 访问文档文件

许多项目在GitHub上有完整的文档：

```
https://api.github.com/repos/{org}/{repo}/contents/docs
```

### 示例：获取React文档

```bash
# 列出文档目录
curl https://api.github.com/repos/facebook/react/contents/docs

# 获取特定文档文件
curl https://raw.githubusercontent.com/facebook/react/main/docs/hooks-intro.md
```

### 优点

✅ 免费（有速率限制）  
✅ 官方API  
✅ 完整文档  
✅ 可以浏览目录结构  

### 缺点

❌ 速率限制（未认证：60次/小时）  
❌ 需要知道文档路径  
❌ 需要自己解析Markdown  

---

## 解决方案3：使用项目官方文档网站 ✅ 推荐

### 直接抓取官方文档

大多数流行库都有官方文档网站：

| 库 | 文档URL |
|----|---------|
| React | https://react.dev |
| Next.js | https://nextjs.org/docs |
| Express | https://expressjs.com |
| TypeScript | https://www.typescriptlang.org/docs |
| MongoDB | https://www.mongodb.com/docs |

### 实现方式

使用现有的`fetch-webpage`工具：

```xml
<tool name="fetch_webpage">
  <url>https://react.dev/reference/react/useState</url>
</tool>
```

### 优点

✅ 最新文档  
✅ 格式化良好  
✅ 包含示例  
✅ 无需API密钥  

### 缺点

❌ 需要知道具体URL  
❌ 可能包含导航等无关内容  
❌ 需要解析HTML  

---

## 解决方案4：修改Context7工具使用替代数据源 ✅ 最佳方案

### 建议实现

修改Context7工具以使用以下数据源：

#### 4.1 llms.txt文件

```typescript
// 库名到GitHub仓库的映射
const LIBRARY_REPOS = {
  'react': 'facebook/react',
  'next.js': 'vercel/next.js',
  'express': 'expressjs/express',
  'typescript': 'microsoft/TypeScript',
  // ... 更多库
};

async function fetchFromLlmsTxt(libraryName: string) {
  const repo = LIBRARY_REPOS[libraryName];
  if (!repo) {
    throw new Error(`Unknown library: ${libraryName}`);
  }
  
  const url = `https://raw.githubusercontent.com/${repo}/main/llms.txt`;
  const response = await fetch(url);
  
  if (!response.ok) {
    // 尝试其他分支
    const altUrl = `https://raw.githubusercontent.com/${repo}/master/llms.txt`;
    const altResponse = await fetch(altUrl);
    if (!altResponse.ok) {
      throw new Error(`llms.txt not found for ${libraryName}`);
    }
    return await altResponse.text();
  }
  
  return await response.text();
}
```

#### 4.2 官方文档API

某些项目提供文档API：

```typescript
const DOC_APIS = {
  'react': 'https://react.dev/api/docs',
  'next.js': 'https://nextjs.org/api/docs',
  // ... 更多
};
```

#### 4.3 文档聚合服务

使用现有的文档聚合服务：

- **DevDocs**: https://devdocs.io (有API)
- **MDN**: https://developer.mozilla.org/api/v1/
- **npm docs**: https://docs.npmjs.com

---

## 解决方案5：使用DevDocs API ✅ 推荐

### DevDocs简介

DevDocs.io 提供了大量库的文档，并有API访问。

### API端点

```
https://devdocs.io/docs/{library}/index.json
```

### 示例

**React**:
```bash
curl https://devdocs.io/docs/react/index.json
```

**Express**:
```bash
curl https://devdocs.io/docs/express/index.json
```

### 优点

✅ 免费  
✅ 无需API密钥  
✅ 支持大量库  
✅ 结构化数据  
✅ 定期更新  

### 缺点

❌ 可能不是最新版本  
❌ 不是所有库都支持  

---

## 推荐实施方案

### 方案A：多数据源混合策略（最佳）

```typescript
async function fetchDocumentation(libraryName: string, topic?: string) {
  // 1. 尝试llms.txt
  try {
    return await fetchFromLlmsTxt(libraryName);
  } catch (e) {
    // 继续下一个方案
  }
  
  // 2. 尝试DevDocs
  try {
    return await fetchFromDevDocs(libraryName, topic);
  } catch (e) {
    // 继续下一个方案
  }
  
  // 3. 尝试GitHub README
  try {
    return await fetchFromGitHubReadme(libraryName);
  } catch (e) {
    // 继续下一个方案
  }
  
  // 4. 失败
  throw new Error(`Documentation not found for ${libraryName}`);
}
```

### 方案B：简化版（快速实现）

只使用llms.txt + GitHub README：

```typescript
async function fetchDocumentation(libraryName: string) {
  const repo = LIBRARY_REPOS[libraryName];
  
  // 尝试llms.txt
  const llmsTxtUrl = `https://raw.githubusercontent.com/${repo}/main/llms.txt`;
  let response = await fetch(llmsTxtUrl);
  
  if (response.ok) {
    return await response.text();
  }
  
  // 回退到README
  const readmeUrl = `https://raw.githubusercontent.com/${repo}/main/README.md`;
  response = await fetch(readmeUrl);
  
  if (response.ok) {
    return await response.text();
  }
  
  throw new Error(`Documentation not found for ${libraryName}`);
}
```

---

## 实施步骤

### 步骤1：创建库映射表

创建一个文件 `extension/src/agent/v1/tools/data/library-repos.ts`:

```typescript
export const LIBRARY_REPOS: Record<string, string> = {
  // Frontend
  'react': 'facebook/react',
  'vue': 'vuejs/core',
  'angular': 'angular/angular',
  'svelte': 'sveltejs/svelte',
  'next.js': 'vercel/next.js',
  'nuxt': 'nuxt/nuxt',
  
  // Backend
  'express': 'expressjs/express',
  'fastify': 'fastify/fastify',
  'koa': 'koajs/koa',
  'nest.js': 'nestjs/nest',
  
  // Databases
  'mongodb': 'mongodb/docs',
  'postgresql': 'postgres/postgres',
  'redis': 'redis/redis',
  
  // Tools
  'typescript': 'microsoft/TypeScript',
  'webpack': 'webpack/webpack',
  'vite': 'vitejs/vite',
  'eslint': 'eslint/eslint',
  'jest': 'jestjs/jest',
  
  // ... 更多库
};
```

### 步骤2：修改Context7Tool

更新 `extension/src/agent/v1/tools/runners/context7.tool.ts`:

```typescript
import { LIBRARY_REPOS } from '../data/library-repos';

export class Context7Tool extends BaseAgentTool<Context7ToolParams> {
  private async fetchDocumentation(libraryName: string): Promise<string> {
    const repo = LIBRARY_REPOS[libraryName.toLowerCase()];
    
    if (!repo) {
      throw new Error(`Unknown library: ${libraryName}. Please add it to LIBRARY_REPOS.`);
    }
    
    // 尝试多个来源
    const sources = [
      `https://raw.githubusercontent.com/${repo}/main/llms.txt`,
      `https://raw.githubusercontent.com/${repo}/master/llms.txt`,
      `https://raw.githubusercontent.com/${repo}/main/README.md`,
      `https://raw.githubusercontent.com/${repo}/master/README.md`,
    ];
    
    for (const url of sources) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          this.logger(`Fetched documentation from: ${url}`);
          return await response.text();
        }
      } catch (e) {
        // 继续尝试下一个
      }
    }
    
    throw new Error(`Documentation not found for ${libraryName}`);
  }
}
```

### 步骤3：测试

```bash
cd extension && npm test -- context7-integration.test.ts
```

---

## 总结

### 最佳方案：混合策略

1. **优先使用llms.txt** - 标准格式，专为LLM设计
2. **回退到README.md** - 几乎所有项目都有
3. **可选：集成DevDocs** - 作为第三选择

### 优点

✅ **无需API密钥** - 完全免费  
✅ **实时更新** - 直接从GitHub获取  
✅ **可靠** - 多个回退选项  
✅ **简单** - 只需HTTP请求  
✅ **可扩展** - 易于添加新库  

### 下一步

1. 创建库映射表
2. 修改Context7Tool实现
3. 更新测试
4. 测试真实场景
5. 添加更多库支持

---

## 示例代码

我可以帮你实现这个方案。需要我现在就修改Context7工具以使用这些替代数据源吗？

