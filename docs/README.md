# Vlinder 技术文档

本目录包含 Vlinder AI 编程助手的技术文档和研究报告。

## 📚 文档列表

### [上下文引擎技术研究报告](./context-engine-research-report.md)

**完整的上下文引擎技术指南**，涵盖：

**完整的上下文引擎技术指南**，涵盖：

- ✅ **核心概念**：Token 限制、上下文类型、生命周期
- ✅ **业界最佳实践**：Cursor、Continue.dev、GitHub Copilot、Windsurf 的实现分析
- ✅ **技术架构**：完整的系统架构设计和核心组件详解
- ✅ **具体实现方案**：可直接使用的代码示例和实现步骤
- ✅ **技术难点**：常见问题和解决方案
- ✅ **实施路线图**：分 4 个阶段的详细实施计划

**适合人群**：
- 想要理解上下文引擎工作原理的开发者
- 需要实现上下文管理系统的团队
- 对 AI 编程助手技术感兴趣的研究者

**关键亮点**：
- 📖 **1500+ 行**详细技术文档
- 💻 **完整代码示例**，可直接参考实现
- 🏗️ **系统架构图**，清晰展示组件关系
- 🎯 **实施路线图**，分阶段逐步实现
- 🔍 **业界对比**，学习最佳实践

### [Workspace 管理器和文件标签栏功能](./features/workspace-and-file-tabs.md)

**已实现但暂时禁用的 UI 功能**，包含：

- ✅ **功能设计**：Workspace 管理器和文件标签栏的完整设计
- ✅ **当前实现**：已完成的前端组件和后端消息处理
- ✅ **问题分析**：为什么暂时禁用以及正确的实现方向
- ✅ **启用计划**：何时以及如何启用这些功能

**状态**：🚧 等待上下文引擎完成后启用

**适合人群**：
- 想要了解这些功能设计的开发者
- 需要在 Phase 1 完成后启用功能的团队成员
- 对 UI 集成感兴趣的前端开发者

---

## 🚀 快速开始

### 阅读顺序建议

1. **如果你是第一次接触上下文引擎**：
   - 先阅读 [第 1 章：概述](./context-engine-research-report.md#1-概述)
   - 然后阅读 [第 2 章：核心概念](./context-engine-research-report.md#2-核心概念)

2. **如果你想了解业界如何实现**：
   - 直接跳到 [第 3 章：业界最佳实践](./context-engine-research-report.md#3-业界最佳实践)

3. **如果你准备开始实现**：
   - 阅读 [第 4 章：技术架构](./context-engine-research-report.md#4-技术架构)
   - 然后阅读 [第 5 章：具体实现方案](./context-engine-research-report.md#5-具体实现方案)
   - 最后参考 [第 7 章：实施路线图](./context-engine-research-report.md#7-实施路线图)

4. **如果你遇到了技术难题**：
   - 查看 [第 6 章：技术难点与解决方案](./context-engine-research-report.md#6-技术难点与解决方案)

---

## 📊 报告概览

### 第 1 章：概述
- 什么是上下文引擎
- 为什么需要上下文引擎
- 上下文引擎的核心目标

### 第 2 章：核心概念
- Token 限制与上下文窗口
- 上下文的类型（静态、动态、检索）
- 上下文的生命周期

### 第 3 章：业界最佳实践
- **Cursor IDE**：代码索引、智能上下文选择
- **Continue.dev**：Rules 系统、MCP 协议
- **GitHub Copilot**：轻量级上下文策略
- **Windsurf**：Cascade 多步骤规划

### 第 4 章：技术架构
- 整体架构设计
- **Context Manager**：上下文管理器
- **Context Retriever**：上下文检索器
- **Context Compressor**：上下文压缩器
- **Context Prioritizer**：上下文优先级管理器

### 第 5 章：具体实现方案
- **Phase 1**：InterestedFiles 系统（基础）
- **Phase 2**：智能压缩系统（重要）
- **Phase 3**：语义检索系统（高级）

### 第 6 章：技术难点与解决方案
- Token 计数的准确性
- 压缩质量保证
- 性能优化
- 用户体验

### 第 7 章：实施路线图
- **Phase 1**：基础上下文管理（2-3 周）
- **Phase 2**：智能压缩（2-3 周）
- **Phase 3**：语义检索（3-4 周）
- **Phase 4**：高级功能（2-3 周）

### 第 8 章：参考资料
- 开源项目
- 技术文档
- 学术论文
- 博客文章

---

## 💡 核心要点

### 上下文引擎的三大支柱

1. **InterestedFiles 系统**
   - 让 AI 明确知道哪些文件是相关的
   - 用户可以控制 AI 的上下文
   - 为后续智能功能打基础

2. **智能压缩**
   - 使用 LLM 进行对话摘要
   - 保留关键信息而不是简单截断
   - 显著提升长对话的质量

3. **语义检索**
   - 基于向量的代码搜索
   - 理解代码语义而不只是文本匹配
   - 自动找到相关代码

### 实施建议

```
Phase 1 (必须) → Phase 2 (重要) → Phase 3 (高级) → Phase 4 (未来)
   ↓                ↓                ↓                ↓
基础功能         智能优化         语义理解         完善体验
2-3 周           2-3 周           3-4 周           2-3 周
```

**总计**：约 9-13 周完成完整的上下文引擎

---

## 🔧 技术栈

### 后端（Extension）
- **TypeScript**：主要开发语言
- **VSCode API**：编辑器集成
- **Tree-sitter**：代码解析
- **Ripgrep**：快速文本搜索

### 前端（Webview）
- **React**：UI 框架
- **Jotai**：状态管理
- **shadcn/ui**：组件库
- **Tailwind CSS**：样式

### AI 和检索
- **Claude 3.5 Sonnet**：主要 LLM
- **OpenAI Embeddings**：代码嵌入
- **ChromaDB / LanceDB**：向量数据库

---

## 📖 相关资源

### 开源项目
- [Continue.dev](https://github.com/continuedev/continue) - 开源 AI 编程助手
- [Cody](https://github.com/sourcegraph/cody) - Sourcegraph 的 AI 助手
- [LangChain](https://github.com/langchain-ai/langchain) - LLM 应用框架

### 技术文档
- [Anthropic Claude Docs](https://docs.anthropic.com/)
- [OpenAI Platform](https://platform.openai.com/docs)
- [ChromaDB Docs](https://docs.trychroma.com/)

### 学习资源
- [RAG 论文](https://arxiv.org/abs/2005.11401)
- [CodeBERT 论文](https://arxiv.org/abs/2002.08155)
- [Context Engineering 博客](https://www.anthropic.com/engineering)

---

## 🤝 贡献

如果您发现文档中有错误或有改进建议，欢迎：

1. 提交 Issue
2. 创建 Pull Request
3. 联系开发团队

---

## 📝 更新日志

### v1.0 (2025-10-07)
- ✅ 完成上下文引擎技术研究报告
- ✅ 包含完整的技术架构设计
- ✅ 提供详细的实现方案和代码示例
- ✅ 添加实施路线图和参考资料

---

## 📧 联系方式

如有问题或建议，请通过以下方式联系：

- **GitHub Issues**：提交技术问题
- **Email**：技术讨论
- **Discord**：社区交流

---

**祝您实现成功！** 🚀

