# Vlinder V2

<div align="center">

**下一代自主编程代理**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6)](https://www.typescriptlang.org/)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.85+-007ACC)](https://code.visualstudio.com/)

[English](#overview) | [中文](#概述)

</div>

---

## Overview

Vlinder V2 is a next-generation autonomous programming agent built as a VS Code extension. It leverages advanced AI models to automate complex development tasks, from code generation to debugging and deployment.

### Key Features

- 🤖 **Autonomous Agent Architecture** - MainAgent orchestrates multiple Bee agents for complex tasks
- 🔄 **Ralph Integration** - Autonomous loop execution until PRD tasks complete
- 🧠 **Multi-Engine System** - Context, Memory, Thinking, Tools, and Apply engines
- 🔌 **MCP Support** - Model Context Protocol for extensible tool integration
- 🎯 **LSP Integration** - Language Server Protocol for code intelligence
- 📝 **Skill System** - Reusable skill definitions for common tasks

---

## 概述

Vlinder V2 是一个作为 VS Code 扩展构建的下一代自主编程代理。它利用先进的 AI 模型自动化复杂的开发任务，从代码生成到调试和部署。

### 核心特性

- 🤖 **自主代理架构** - MainAgent 协调多个 Bee 代理处理复杂任务
- 🔄 **Ralph 集成** - 自主循环执行直到 PRD 任务完成
- 🧠 **多引擎系统** - 上下文、内存、思维、工具和执行引擎
- 🔌 **MCP 支持** - 模型上下文协议实现可扩展的工具集成
- 🎯 **LSP 集成** - 语言服务器协议实现代码智能
- 📝 **技能系统** - 可复用的技能定义用于常见任务

---

## Architecture / 架构

```
extension/src/
├── agent/v2/                    # V2 Agent System
│   ├── types/                   # Core type definitions
│   ├── AgentSwarm/              # Agent swarm orchestration
│   │   ├── swarm.ts             # Swarm coordinator
│   │   └── bee.ts               # Worker agent
│   ├── Engines/                 # Engine system
│   │   ├── ApplyEngine/         # Execution engine (Ralph integrated)
│   │   ├── ContextEngine/       # Context management
│   │   ├── MemoryEngine/        # Memory management
│   │   ├── ThinkingEngine/      # Reasoning engine
│   │   └── ToolsEngine/         # Tool execution
│   ├── main-agent.ts            # MainAgent - Supreme leader
│   └── index.ts                 # Module exports
│
├── api/                         # API layer
│   ├── providers/               # LLM providers
│   │   ├── config/              # Provider configurations
│   │   └── custom-provider.ts   # Custom provider support
│   └── api-handler.ts           # API request handling
│
├── db/                          # Database layer
│   ├── schema.ts                # Drizzle ORM schema
│   └── index.ts                 # Database instance
│
├── integrations/                # External integrations
│   ├── lsp/                     # Language Server Protocol
│   ├── mcp/                     # Model Context Protocol
│   ├── skill/                   # Skill system
│   └── terminal/                # Terminal management
│
├── providers/                   # VS Code providers
│   ├── webview/                 # Webview management
│   └── state/                   # State management
│
└── shared/                      # Shared utilities
    ├── messages/                # Message types
    └── format-tools.ts          # Tool formatting
```

---

## Installation / 安装

### Prerequisites / 前置要求

- Node.js 18+
- pnpm 8+
- VS Code 1.85+

### Build from Source / 从源码构建

```bash
# Clone the repository
git clone https://github.com/QuickerStudio/VlinderV2.git
cd VlinderV2/extension

# Install dependencies
pnpm install

# Build the extension
pnpm run build

# Package for VS Code
pnpm run package
```

### Install in VS Code / 在 VS Code 中安装

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Click "..." menu → "Install from VSIX..."
4. Select the packaged `.vsix` file

---

## Quick Start / 快速开始

### 1. Configure API Key / 配置 API 密钥

```bash
# Set your API key
export ANTHROPIC_API_KEY=your_api_key
```

### 2. Start the Extension / 启动扩展

1. Open a project in VS Code
2. Open the Vlinder panel from the sidebar
3. Enter your task description
4. Watch Vlinder autonomously complete your task

---

## Agent System / 代理系统

### MainAgent

The supreme global leader that orchestrates all operations:

```typescript
const agent = new MainAgent({
  id: 'vlinder-main',
  name: 'Vlinder',
  version: '2.0.0',
  model: {
    provider: ModelProvider.ANTHROPIC,
    modelId: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    maxTokens: 4096,
  },
  instructions: 'You are an autonomous programming agent...',
  tools: [...],
  bees: [...],
});
```

### Bee Agents

Worker agents that execute specific tasks:

```typescript
const codeBee: BeeConfig = {
  id: 'bee-code',
  name: 'Code Editor',
  instructions: 'You handle code editing tasks...',
  tools: [editFileTool, readFileTool],
  capabilities: [BeeCapability.CODE_EDITING],
  priority: BeePriority.HIGH,
};
```

### Ralph Loop

Autonomous execution until PRD completion:

```typescript
const ralph = new RalphLoop(workingDir, {
  maxIterations: 10,
  tool: 'vlinder',
  qualityChecks: ['typecheck', 'lint', 'test'],
  autoCommit: true,
});

await ralph.start();
```

---

## Engines / 引擎

| Engine | Description |
|--------|-------------|
| **ApplyEngine** | Multi-round tool execution with dependency resolution |
| **ContextEngine** | Context management and agentic search |
| **MemoryEngine** | Persistent memory storage and retrieval |
| **ThinkingEngine** | Reasoning and decision making |
| **ToolsEngine** | Tool registration and execution |

---

## Supported Providers / 支持的提供者

| Provider | Models | Status |
|----------|--------|--------|
| Anthropic | Claude 3.5 Sonnet, Claude 3 Opus | ✅ Supported |
| OpenAI | GPT-4o, GPT-4 Turbo, o1 | ✅ Supported |
| Google | Gemini 2.0, Gemini 1.5 Pro | ✅ Supported |
| DeepSeek | DeepSeek Chat, DeepSeek Coder | ✅ Supported |
| Moonshot | Moonshot v1 | ✅ Supported |
| Custom | Any OpenAI-compatible API | ✅ Supported |

---

## Development / 开发

### Project Structure / 项目结构

```
extension/
├── src/                 # Source code
├── webview-ui-vite/     # Webview UI (React + Vite)
├── bundler/             # Build configuration
├── assets/              # Static assets
├── package.json         # Extension manifest
└── tsconfig.json        # TypeScript configuration
```

### Scripts / 脚本

```bash
pnpm run dev       # Development mode
pnpm run build     # Production build
pnpm run test      # Run tests
pnpm run lint      # Lint code
pnpm run package   # Package extension
```

---

## Contributing / 贡献

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解指南。

---

## License / 许可证

Apache License 2.0 - see [LICENSE](LICENSE) for details.

---

## Acknowledgments / 致谢

This project draws inspiration from:

- [OpenAI Swarm](https://github.com/openai/swarm) - Agent orchestration patterns
- [Goose](https://github.com/block/goose) - Agent architecture
- [Ralph](https://github.com/snarktank/ralph) - Autonomous loop design
- [OpenCode](https://github.com/opencode-ai/opencode) - Tool integration patterns

---

<div align="center">

**Built with ❤️ by QuickerStudio**

</div>
