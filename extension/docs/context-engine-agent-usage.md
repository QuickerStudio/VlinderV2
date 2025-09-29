# Context Engine Agent Tool - Usage Guide

## Overview

Context Engine Agent is an intelligent codebase analysis tool that runs as a subagent, providing advanced code search, structural analysis, and Git history insights.

## Features

### Four Search Types

1. **Semantic Search**
   - AI-powered code semantic understanding
   - Understands code intent and functionality
   - Suitable for conceptual queries

2. **Structural Search**
   - Code structure-based search
   - Find classes, functions, interfaces, etc.
   - Suitable for specific code element searches

3. **Historical Search**
   - Git commit history analysis
   - Code evolution tracking
   - Suitable for understanding change history

4. **Contextual Search**
   - Current work context-based search
   - Intelligent relevance recommendations
   - Suitable for current task-related searches

## 使用方法

### 基本语法

```xml
<tool name="context_engine_agent">
  <query>你的搜索查询</query>
  <searchType>semantic|structural|historical|contextual</searchType>
  <scope>可选的搜索范围</scope>
  <includeGitHistory>true|false</includeGitHistory>
  <maxResults>结果数量(1-50)</maxResults>
  <analysisDepth>shallow|deep|comprehensive</analysisDepth>
</tool>
```

### 实际使用示例

#### 1. 语义搜索 - 查找认证相关代码

```xml
<tool name="context_engine_agent">
  <query>user authentication and login functionality</query>
  <searchType>semantic</searchType>
  <includeGitHistory>true</includeGitHistory>
  <analysisDepth>deep</analysisDepth>
</tool>
```

**预期结果:**
- 找到认证服务、登录组件、JWT处理等相关代码
- 包含最近的认证相关提交历史
- 提供代码质量评估和改进建议

#### 2. 结构搜索 - 查找特定类的方法

```xml
<tool name="context_engine_agent">
  <query>UserService class methods</query>
  <searchType>structural</searchType>
  <scope>src/services</scope>
  <maxResults>15</maxResults>
</tool>
```

**预期结果:**
- UserService类的所有方法定义
- 方法参数、返回类型等元数据
- 使用模式和依赖关系分析

#### 3. 历史搜索 - 分析最近的bug修复

```xml
<tool name="context_engine_agent">
  <query>payment processing bug fixes</query>
  <searchType>historical</searchType>
  <scope>src/payment</scope>
  <maxResults>10</maxResults>
</tool>
```

**预期结果:**
- 相关的Git提交记录
- 修复的具体内容和影响的文件
- 代码变更模式分析

#### 4. 上下文搜索 - 获取相关建议

```xml
<tool name="context_engine_agent">
  <query>database connection handling</query>
  <searchType>contextual</searchType>
  <analysisDepth>comprehensive</analysisDepth>
</tool>
```

**预期结果:**
- 当前项目中的数据库连接实现
- 相关的配置和工具类
- 最佳实践建议

## 高级用法

### 范围限制

```xml
<!-- 限制到特定目录 -->
<scope>src/components</scope>

<!-- 限制到特定文件类型 -->
<scope>**/*.test.ts</scope>

<!-- 限制到特定文件 -->
<scope>src/services/auth.service.ts</scope>

<!-- 限制到特定语言 -->
<scope>typescript</scope>
```

### 分析深度控制

- **shallow**: 快速表面分析，适合快速查看
- **deep**: 详细分析，包含上下文和关系（默认）
- **comprehensive**: 全面分析，包含依赖、使用模式和演化历史

### 组合使用示例

```xml
<!-- 全面分析API端点实现 -->
<tool name="context_engine_agent">
  <query>REST API endpoint implementation patterns</query>
  <searchType>semantic</searchType>
  <scope>src/api</scope>
  <includeGitHistory>true</includeGitHistory>
  <maxResults>20</maxResults>
  <analysisDepth>comprehensive</analysisDepth>
</tool>
```

## 输出格式

工具返回结构化的分析结果，包括：

### 1. 执行摘要
- 查询信息和执行时间
- 找到的结果总数
- 高级摘要

### 2. 代码匹配结果
- 文件路径和行号
- 代码内容和语言
- 相关性评分
- 元数据（函数名、参数等）

### 3. Git历史结果（如果启用）
- 提交哈希和消息
- 作者和日期
- 影响的文件
- 变更分析

### 4. 分析洞察
- 检测到的模式
- 改进建议
- 相关概念
- 代码质量评估

## 最佳实践

### 1. 查询优化
- 使用具体的技术术语
- 包含上下文信息
- 避免过于宽泛的查询

### 2. 搜索类型选择
- **概念查找** → semantic
- **特定代码元素** → structural  
- **变更历史** → historical
- **相关建议** → contextual

### 3. 范围设置
- 大型项目中使用scope限制搜索范围
- 根据查询目的选择合适的目录或文件类型

### 4. 结果数量控制
- 探索性查询使用较大的maxResults
- 特定查找使用较小的maxResults
- 性能考虑：大量结果会增加处理时间

## 常见用例

### 代码理解
```xml
<tool name="context_engine_agent">
  <query>how does error handling work in this project</query>
  <searchType>semantic</searchType>
  <analysisDepth>comprehensive</analysisDepth>
</tool>
```

### 重构准备
```xml
<tool name="context_engine_agent">
  <query>UserController class usage</query>
  <searchType>structural</searchType>
  <includeGitHistory>true</includeGitHistory>
</tool>
```

### 问题诊断
```xml
<tool name="context_engine_agent">
  <query>memory leak issues</query>
  <searchType>historical</searchType>
  <maxResults>5</maxResults>
</tool>
```

### 学习代码库
```xml
<tool name="context_engine_agent">
  <query>main application entry points</query>
  <searchType>contextual</searchType>
  <analysisDepth>deep</analysisDepth>
</tool>
```

## 故障排除

### 常见问题

1. **没有找到结果**
   - 检查查询是否过于具体
   - 尝试不同的搜索类型
   - 扩大搜索范围

2. **结果不相关**
   - 使用更具体的查询词
   - 添加scope限制
   - 尝试structural搜索

3. **性能问题**
   - 减少maxResults
   - 使用shallow分析深度
   - 添加scope限制

### 调试技巧

- 从简单查询开始，逐步细化
- 使用不同搜索类型对比结果
- 查看执行时间来优化查询

## 与其他工具的配合

Context Engine Agent可以与其他工具配合使用：

1. **search_files** → 找到文件后用context_engine_agent深入分析
2. **read_file** → 读取文件后用context_engine_agent找相关代码
3. **file_editor** → 编辑前用context_engine_agent了解影响范围

这个工具特别适合作为代码探索和理解的起点，为后续的开发工作提供全面的上下文信息。
