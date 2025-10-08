# Context7 自托管版本 - 使用指南

## 概述

我们已经实现了一个完全免费的Context7替代方案，直接从GitHub抓取llms.txt文件和文档，无需API密钥。

## 核心优势

✅ **完全免费** - 无需Context7 API订阅  
✅ **无需API密钥** - 直接从GitHub抓取  
✅ **实时更新** - 获取最新的文档内容  
✅ **支持回退** - llms.txt → README.md → 其他文档  
✅ **主题过滤** - 支持按主题筛选内容  
✅ **Token限制** - 控制返回内容大小  

---

## 使用方法

### 基本用法

```xml
<tool name="context7">
  <libraryName>react</libraryName>
</tool>
```

### 带主题过滤

```xml
<tool name="context7">
  <libraryName>react</libraryName>
  <topic>hooks</topic>
</tool>
```

### 带Token限制

```xml
<tool name="context7">
  <libraryName>react</libraryName>
  <topic>hooks</topic>
  <tokens>3000</tokens>
</tool>
```

### 使用Context7 ID格式

```xml
<tool name="context7">
  <libraryName>/facebook/react</libraryName>
  <topic>hooks</topic>
</tool>
```

---

## 支持的库

### 前端框架
- `react` - React (facebook/react)
- `vue` - Vue.js (vuejs/core)
- `angular` - Angular (angular/angular)
- `svelte` - Svelte (sveltejs/svelte)

### 元框架
- `next.js` - Next.js (vercel/next.js)
- `nuxt` - Nuxt (nuxt/nuxt)
- `gatsby` - Gatsby (gatsbyjs/gatsby)
- `remix` - Remix (remix-run/remix)

### 状态管理
- `redux` - Redux (reduxjs/redux)
- `mobx` - MobX (mobxjs/mobx)
- `zustand` - Zustand (pmndrs/zustand)

### 后端框架
- `express` - Express (expressjs/express)
- `fastify` - Fastify (fastify/fastify)
- `koa` - Koa (koajs/koa)
- `nest.js` - NestJS (nestjs/nest)

### 数据库
- `mongodb` - MongoDB (mongodb/docs)
- `postgresql` - PostgreSQL (postgres/postgres)
- `redis` - Redis (redis/redis)

### 构建工具
- `webpack` - Webpack (webpack/webpack)
- `vite` - Vite (vitejs/vite)
- `rollup` - Rollup (rollup/rollup)
- `esbuild` - esbuild (evanw/esbuild)

### 语言和编译器
- `typescript` - TypeScript (microsoft/TypeScript)
- `babel` - Babel (babel/babel)

### 测试工具
- `jest` - Jest (jestjs/jest)
- `vitest` - Vitest (vitest-dev/vitest)
- `cypress` - Cypress (cypress-io/cypress)
- `playwright` - Playwright (microsoft/playwright)

### 代码质量
- `eslint` - ESLint (eslint/eslint)
- `prettier` - Prettier (prettier/prettier)

### 云服务
- `aws-sdk` - AWS SDK (aws/aws-sdk-js-v3)
- `supabase` - Supabase (supabase/supabase)
- `firebase` - Firebase (firebase/firebase-js-sdk)

---

## 工作原理

### 1. 库名解析

```
用户输入: "react"
     ↓
查找映射表: LIBRARY_REPOS
     ↓
获取仓库信息: { repo: "facebook/react", branch: "main", hasLlmsTxt: true }
```

### 2. 文档抓取

```
尝试顺序:
1. https://raw.githubusercontent.com/facebook/react/main/llms.txt
2. https://raw.githubusercontent.com/facebook/react/master/llms.txt
3. https://raw.githubusercontent.com/facebook/react/main/README.md
4. https://raw.githubusercontent.com/facebook/react/master/README.md
```

### 3. 内容处理

```
原始内容
    ↓
主题过滤 (如果指定topic)
    ↓
Token截断 (如果指定maxTokens)
    ↓
XML格式化
    ↓
返回给用户
```

---

## 输出格式

```xml
<context7_documentation>
  <library_name>react</library_name>
  <library_id>/react</library_id>
  <topic>hooks</topic>
  <source>https://raw.githubusercontent.com/facebook/react/main/llms.txt</source>
  <documentation>
    # React Hooks
    
    Hooks are a new addition in React 16.8...
    
    ## useState
    ...
  </documentation>
</context7_documentation>
```

---

## 添加新库

如果需要添加新的库支持，编辑 `extension/src/agent/v1/tools/data/library-repos.ts`:

```typescript
export const LIBRARY_REPOS: Record<string, LibraryMapping> = {
  // ... 现有库 ...
  
  'your-library': {
    repo: 'org/project',           // GitHub仓库路径
    branch: 'main',                // 默认分支
    hasLlmsTxt: true,              // 是否有llms.txt
    docsPath: 'README.md',         // 备用文档路径(可选)
    altBranches: ['master']        // 备用分支(可选)
  },
};
```

---

## 主题过滤示例

### React Hooks

```xml
<tool name="context7">
  <libraryName>react</libraryName>
  <topic>hooks</topic>
</tool>
```

返回内容将聚焦于:
- useState
- useEffect
- useContext
- 自定义Hooks

### Express Routing

```xml
<tool name="context7">
  <libraryName>express</libraryName>
  <topic>routing</topic>
</tool>
```

返回内容将聚焦于:
- app.get()
- app.post()
- Router
- 路由参数

### MongoDB Aggregation

```xml
<tool name="context7">
  <libraryName>mongodb</libraryName>
  <topic>aggregation</topic>
</tool>
```

返回内容将聚焦于:
- $match
- $group
- $project
- Pipeline stages

---

## Token限制说明

### Token估算

- 1 token ≈ 4 个字符
- 5000 tokens ≈ 20,000 字符 ≈ 3,000-4,000 词

### 推荐设置

| 用途 | 推荐Token数 | 说明 |
|------|------------|------|
| 快速参考 | 2000-3000 | 获取核心信息 |
| 一般文档 | 5000 (默认) | 平衡的覆盖范围 |
| 详细指南 | 7000-10000 | 全面的文档 |
| 特定主题 | 3000-5000 | 聚焦单一主题 |

---

## 错误处理

### 库不存在

```
Error: Unknown library: xyz. Please add it to LIBRARY_REPOS or use Context7 ID format (/org/project).
```

**解决方案**: 
1. 检查库名拼写
2. 使用Context7 ID格式: `/org/project`
3. 添加库到映射表

### 文档未找到

```
Error: Documentation not found for react. Tried 4 sources.
```

**解决方案**:
1. 检查GitHub仓库是否存在
2. 检查分支名是否正确
3. 检查网络连接

### 无效的库ID

```
Error: Invalid library ID: /invalid. Expected format: /org/project or /org/project/version
```

**解决方案**:
使用正确格式: `/org/project` 或 `/org/project/version`

---

## 性能优化

### 缓存建议

虽然当前实现没有缓存，但可以考虑:

1. **浏览器缓存**: GitHub的raw内容有缓存头
2. **本地缓存**: 可以添加本地文件缓存
3. **Redis缓存**: 生产环境可使用Redis

### 速率限制

GitHub API限制:
- 未认证: 60次/小时
- 使用Token: 5000次/小时

我们使用raw.githubusercontent.com，限制更宽松。

---

## 测试

运行测试:

```bash
cd extension
npm test -- context7-self-hosted.test.ts
```

测试覆盖:
- ✅ 库映射查找
- ✅ 文档抓取
- ✅ Context7 ID格式
- ✅ 主题过滤
- ✅ Token限制
- ✅ 回退机制
- ✅ 错误处理

---

## 与官方Context7对比

| 特性 | 自托管版本 | 官方Context7 |
|------|-----------|-------------|
| 成本 | ✅ 免费 | ❌ 付费 |
| API密钥 | ✅ 不需要 | ❌ 需要 |
| 速度 | ⚠️ 取决于GitHub | ✅ 快速 |
| 可靠性 | ⚠️ 依赖GitHub | ✅ 高可用 |
| 定制化 | ✅ 完全控制 | ❌ 受限 |
| 维护 | ❌ 需要维护 | ✅ 无需维护 |
| 库支持 | ⚠️ 需手动添加 | ✅ 自动更新 |

---

## 最佳实践

### 1. 优先使用主题过滤

❌ **不推荐**:
```xml
<tool name="context7">
  <libraryName>react</libraryName>
</tool>
```

✅ **推荐**:
```xml
<tool name="context7">
  <libraryName>react</libraryName>
  <topic>hooks</topic>
</tool>
```

### 2. 合理设置Token限制

❌ **不推荐**:
```xml
<tool name="context7">
  <libraryName>react</libraryName>
  <tokens>10000</tokens>  <!-- 太大 -->
</tool>
```

✅ **推荐**:
```xml
<tool name="context7">
  <libraryName>react</libraryName>
  <topic>hooks</topic>
  <tokens>3000</tokens>  <!-- 适中 -->
</tool>
```

### 3. 使用精确的库ID

❌ **不推荐**:
```xml
<tool name="context7">
  <libraryName>next</libraryName>  <!-- 模糊 -->
</tool>
```

✅ **推荐**:
```xml
<tool name="context7">
  <libraryName>/vercel/next.js</libraryName>  <!-- 精确 -->
</tool>
```

---

## 总结

自托管Context7实现提供了一个完全免费、无需API密钥的文档获取方案。虽然在速度和可靠性上可能不如官方服务，但对于不想付费的开发者来说是一个很好的选择。

**核心文件**:
- `extension/src/agent/v1/tools/data/library-repos.ts` - 库映射表
- `extension/src/agent/v1/tools/utils/llms-txt-fetcher.ts` - 文档抓取器
- `extension/src/agent/v1/tools/runners/context7.tool.ts` - Context7工具
- `test/extension/context7-self-hosted.test.ts` - 测试套件

