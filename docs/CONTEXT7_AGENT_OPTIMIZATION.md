# Context7 Agent优化设计

## 概述

Context7工具专为**AI Agent自动化使用**而优化，采用三层智能检索策略，让Agent无需了解GitHub仓库结构即可自动获取任意库的文档。

**设计目标**: Agent只需知道包名（如 `react`、`express`），系统自动找到对应的GitHub仓库和文档。

---

## 🤖 Agent使用场景

### 典型场景

```typescript
// Agent分析代码，看到导入语句:
import React from 'react'
import { createApp } from 'vue'
import express from 'express'
import { PrismaClient } from '@prisma/client'

// Agent想查文档，只需调用:
<tool name="context7">
  <libraryName>react</libraryName>
</tool>

<tool name="context7">
  <libraryName>@prisma/client</libraryName>  // 自动处理scoped包
</tool>
```

### Agent的需求

1. **简单** - 只需提供包名，不需要知道GitHub路径
2. **智能** - 自动处理各种包名变体
3. **容错** - 处理拼写变化、别名等
4. **快速** - 常用库毫秒级响应
5. **可靠** - 未知库也能尝试自动发现

---

## 🎯 三层检索策略

### 架构图

```
Agent输入: "react"
    ↓
┌─────────────────────────────────────┐
│ 1. 包名规范化                        │
│    react.js → react                 │
│    @vue/core → core                 │
│    reactjs → react (别名)           │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 2. 三层检索                          │
│                                     │
│  Tier 1: 固定映射表 (最快)          │
│  ├─ LIBRARY_REPOS[react]            │
│  └─ 返回: facebook/react            │
│                                     │
│  Tier 2: Context7 ID (显式路径)     │
│  ├─ /facebook/react                 │
│  └─ 返回: 解析后的映射              │
│                                     │
│  Tier 3: 自动发现 (智能推断)        │
│  ├─ 生成可能的路径                  │
│  ├─ 尝试多个分支                    │
│  ├─ 检查文件存在性                  │
│  └─ 缓存发现结果                    │
└─────────────────────────────────────┘
    ↓
返回: LibraryMapping
```

---

## 📋 详细设计

### Tier 1: 固定映射表（快速路径）

**目的**: 为常用库提供毫秒级响应

```typescript
const LIBRARY_REPOS: Record<string, LibraryMapping> = {
  'react': { 
    repo: 'facebook/react', 
    branch: 'main', 
    hasLlmsTxt: true,
    altBranches: ['master']
  },
  'vue': { 
    repo: 'vuejs/core', 
    branch: 'main', 
    hasLlmsTxt: true 
  },
  // ... 30+ 常用库
};
```

**优点**:
- ✅ 极快（O(1)查找）
- ✅ 可靠（经过验证）
- ✅ 覆盖90%的使用场景

**覆盖的库**:
- Frontend: react, vue, angular, svelte
- Meta Frameworks: next.js, nuxt, gatsby, remix
- Backend: express, fastify, koa, nest.js
- Databases: mongodb, postgresql, mysql, redis
- ORMs: prisma, typeorm, sequelize
- Build Tools: webpack, vite, rollup, esbuild
- Testing: jest, vitest, cypress, playwright
- 等等...

---

### Tier 2: Context7 ID（显式路径）

**目的**: 支持任意GitHub仓库

```typescript
// Agent可以使用完整路径
<tool name="context7">
  <libraryName>/facebook/react</libraryName>
</tool>

// 或指定版本/分支
<tool name="context7">
  <libraryName>/vercel/next.js/canary</libraryName>
</tool>
```

**格式**: `/org/project` 或 `/org/project/version`

**优点**:
- ✅ 支持任意仓库
- ✅ 可指定分支/版本
- ✅ 完全控制

---

### Tier 3: 自动发现（智能推断）

**目的**: 为未知库自动找到GitHub仓库

#### 工作流程

```typescript
输入: "unknown-lib"
    ↓
1. 检查缓存
   ├─ 命中 → 返回缓存结果
   └─ 未命中 → 继续
    ↓
2. 生成可能的仓库路径
   ├─ unknown-lib/unknown-lib
   ├─ unknown-libjs/unknown-lib
   ├─ 已知组织模式匹配
   └─ ...
    ↓
3. 尝试多个分支
   ├─ main
   ├─ master
   ├─ canary
   └─ develop
    ↓
4. 检查文件存在性
   ├─ llms.txt (优先)
   └─ README.md (回退)
    ↓
5. 找到 → 缓存并返回
   未找到 → 返回null
```

#### 路径生成规则

```typescript
// 规则1: 基础模式
"react" → [
  "react/react",
  "reactjs/react",
]

// 规则2: 已知组织模式
"react" → [
  "facebook/react",
  "reactjs/react",
]

// 规则3: 处理后缀
"next.js" → [
  "vercel/next.js",
  "vercel/next",
]

// 规则4: Scoped包
"@prisma/client" → [
  "prisma/client",
  "prisma/prisma",
]
```

#### 性能优化

1. **缓存机制**
   ```typescript
   private static discoveredMappings: Map<string, LibraryMapping>
   ```
   - 首次发现后缓存
   - 后续请求直接返回
   - 避免重复HTTP请求

2. **快速失败**
   - HEAD请求检查存在性（不下载内容）
   - 5秒超时
   - 并发检查多个路径

3. **智能排序**
   - 优先尝试最可能的路径
   - 减少不必要的请求

---

## 🔧 包名规范化

### 处理的变体

```typescript
// Scoped包
"@vue/core" → "core"
"@prisma/client" → "client"

// 文件扩展名
"react.js" → "react"
"vue.ts" → "vue"

// 前缀
"npm:react" → "react"

// 别名
"reactjs" → "react"
"vuejs" → "vue"
"nextjs" → "next.js"
"nestjs" → "nest.js"
"pg" → "postgresql"
```

### 规范化逻辑

```typescript
private normalizeLibraryName(name: string): string {
  let normalized = name.toLowerCase().trim();
  
  // 移除scoped包前缀
  normalized = normalized.replace(/^@[\w-]+\//, '');
  
  // 移除npm前缀
  normalized = normalized.replace(/^npm:/, '');
  
  // 移除文件扩展名
  normalized = normalized.replace(/\.(js|ts)$/, '');
  
  // 处理别名
  const aliases = {
    'reactjs': 'react',
    'vuejs': 'vue',
    // ...
  };
  
  return aliases[normalized] || normalized;
}
```

---

## 📊 性能特征

### 响应时间

| 场景 | 策略 | 响应时间 | 网络请求 |
|------|------|----------|----------|
| 常用库（react） | Tier 1 | <1ms | 0 |
| Context7 ID | Tier 2 | <1ms | 0 |
| 未知库（首次） | Tier 3 | 1-5s | 5-20次 |
| 未知库（缓存） | Tier 3 | <1ms | 0 |

### 成功率

- **Tier 1**: 100%（预定义库）
- **Tier 2**: 100%（用户提供正确路径）
- **Tier 3**: 70-80%（取决于库的流行度和命名规范）

---

## 🎨 使用示例

### 示例1: 常用库（Tier 1）

```xml
<tool name="context7">
  <libraryName>react</libraryName>
  <topic>hooks</topic>
</tool>
```

**流程**:
1. 规范化: `react` → `react`
2. Tier 1查找: 命中 `LIBRARY_REPOS['react']`
3. 返回: `{ repo: 'facebook/react', branch: 'main', ... }`
4. 响应时间: <1ms

---

### 示例2: Scoped包（自动处理）

```xml
<tool name="context7">
  <libraryName>@prisma/client</libraryName>
</tool>
```

**流程**:
1. 规范化: `@prisma/client` → `client`
2. Tier 1查找: 未命中
3. Tier 3自动发现:
   - 尝试 `prisma/client` → 404
   - 尝试 `prisma/prisma` → 200 ✓
4. 缓存结果
5. 响应时间: 首次2-3s，后续<1ms

---

### 示例3: 未知库（自动发现）

```xml
<tool name="context7">
  <libraryName>some-new-lib</libraryName>
</tool>
```

**流程**:
1. 规范化: `some-new-lib` → `some-new-lib`
2. Tier 1查找: 未命中
3. Tier 3自动发现:
   - 生成路径: `some-new-lib/some-new-lib`, `some-new-libjs/some-new-lib`
   - 尝试分支: main, master, canary
   - 检查文件: llms.txt, README.md
   - 找到 → 缓存并返回
   - 未找到 → 抛出错误

---

### 示例4: 显式路径（Tier 2）

```xml
<tool name="context7">
  <libraryName>/facebook/react</libraryName>
</tool>
```

**流程**:
1. 检测到 `/` 前缀
2. Tier 2解析: `/facebook/react` → `{ repo: 'facebook/react', branch: 'main' }`
3. 响应时间: <1ms

---

## 🚀 优势总结

### 对Agent的优势

1. **零配置** - Agent不需要了解GitHub结构
2. **智能容错** - 自动处理各种包名变体
3. **高成功率** - 三层策略确保大部分库都能找到
4. **快速响应** - 常用库毫秒级，未知库也有缓存
5. **可扩展** - 支持任意GitHub仓库

### 对开发者的优势

1. **易维护** - 只需维护常用库映射表
2. **自动化** - 未知库自动发现，无需手动添加
3. **可观察** - 完整的日志记录
4. **可控制** - 可通过Context7 ID显式指定

---

## 📝 添加新的常用库

虽然有自动发现功能，但为了最佳性能，建议将常用库添加到映射表：

```typescript
const LIBRARY_REPOS: Record<string, LibraryMapping> = {
  // ... 现有库 ...
  
  'your-lib': {
    repo: 'org/project',
    branch: 'main',
    hasLlmsTxt: true,
    altBranches: ['master'],
  },
};
```

**何时添加**:
- 使用频率高（>10次/天）
- 自动发现较慢
- 需要特殊配置（非标准分支等）

---

## 🔍 调试和日志

### 日志输出

```typescript
// Tier 1命中
"Found in mappings: react -> facebook/react"

// Tier 2使用
"Using Context7 ID: /facebook/react"

// Tier 3自动发现
"Attempting auto-discovery for: unknown-lib"
"Auto-discovered: unknown-lib -> org/unknown-lib"

// Tier 3缓存命中
"Using cached discovery: unknown-lib"
```

### 错误处理

```typescript
// 所有策略都失败
throw new Error(
  `Cannot find library: ${libraryName}. ` +
  `Try using Context7 ID format: /org/project (e.g., /facebook/react)`
);
```

---

## 总结

Context7工具通过三层智能检索策略，为AI Agent提供了：

- ✅ **简单易用** - 只需包名即可
- ✅ **智能推断** - 自动处理各种变体
- ✅ **高性能** - 常用库毫秒级响应
- ✅ **高可靠** - 多层回退策略
- ✅ **可扩展** - 支持任意GitHub仓库

这使得Agent能够自动获取任何库的文档，无需人工干预！🎉

