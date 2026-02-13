# Vlinder V2 Architecture

## Overview

Vlinder V2 is built on a multi-agent architecture inspired by OpenAI Swarm and Goose. The system consists of a MainAgent that orchestrates multiple Bee agents to accomplish complex programming tasks.

## Core Components

### 1. MainAgent

The MainAgent is the supreme global leader of the autonomous programming system.

**Responsibilities:**
- Orchestrate all Bee agents
- Manage global context and state
- Handle task delegation and routing
- Maintain system-wide memory
- Coordinate agent handoffs

**Key Properties:**
```typescript
interface MainAgentConfig {
  id: AgentId;
  name: string;
  version: string;
  model: ModelConfig;
  instructions: string | ((context: ContextVariables) => string);
  capabilities: Capability[];
  tools: ToolDefinition[];
  behavior: AgentBehaviorConfig;
  session: SessionConfig;
  bees: BeeConfig[];
}
```

### 2. Bee Agents

Bee agents are worker agents that execute specific tasks.

**Responsibilities:**
- Execute assigned tasks
- Use available tools
- Report results to MainAgent
- Handle handoffs to other Bees

**Key Properties:**
```typescript
interface BeeConfig {
  id: BeeId;
  name: string;
  description?: string;
  model?: Partial<ModelConfig>;
  instructions: string | ((context: ContextVariables) => string);
  tools: ToolDefinition[];
  capabilities: BeeCapability[];
  handoffs: HandoffConfig[];
  priority: BeePriority;
  maxConcurrentTasks: number;
}
```

### 3. AgentSwarm

The AgentSwarm coordinates multiple Bee agents.

**Responsibilities:**
- Register and unregister Bees
- Route tasks to appropriate Bees
- Manage Bee lifecycle
- Track Bee metrics

## Engine System

### ApplyEngine

Multi-round tool execution engine with:
- **Execution Modes**: Sequential, Parallel, Adaptive, Priority
- **Dependency Resolution**: Automatic dependency graph building
- **Permission Management**: Fine-grained permission control
- **Rollback Support**: Automatic rollback on failure

### ContextEngine

Context management with:
- **AgenticResearchEngine**: Codebase understanding
- **AgenticSearchEngine**: Intelligent search
- **AgenticContextEngine**: Context-aware operations

### MemoryEngine

Persistent memory with:
- **Storage**: Key-value storage with TTL
- **Retrieval**: Semantic search capabilities
- **Eviction**: LRU/LFU policies

### ThinkingEngine

Reasoning capabilities with:
- **Chain of Thought**: Step-by-step reasoning
- **Decision Making**: Action selection
- **Planning**: Task decomposition

### ToolsEngine

Tool management with:
- **Registration**: Dynamic tool registration
- **Execution**: Parallel and sequential execution
- **Validation**: Input/output validation

## Ralph Integration

### RalphLoop

Autonomous execution loop based on [Ralph](https://github.com/snarktank/ralph):

```
┌─────────────────────────────────────────────────────────────┐
│                    Ralph AgentLoop                          │
├─────────────────────────────────────────────────────────────┤
│  1. Read prd.json                                           │
│  2. Read progress.txt (check Codebase Patterns)             │
│  3. Check branch                                            │
│  4. Select highest priority incomplete story                │
│  5. Implement that single story                             │
│  6. Run quality checks                                      │
│  7. If passes, commit changes                               │
│  8. Update prd.json (passes: true)                          │
│  9. Append progress to progress.txt                         │
│  10. Repeat until all stories complete                      │
└─────────────────────────────────────────────────────────────┘
```

### PRDManager

Product Requirements Document management:
- JSON-based PRD format
- User stories with acceptance criteria
- Markdown import/export

## Data Flow

```
User Input
    │
    ▼
┌─────────────┐
│ MainAgent   │
└─────┬───────┘
      │
      ▼
┌─────────────┐     ┌─────────────┐
│ AgentSwarm  │────▶│   Bee #1    │
└─────┬───────┘     └─────────────┘
      │                   │
      │             ┌─────▼─────┐
      │             │  Engines  │
      │             └─────┬─────┘
      │                   │
      │             ┌─────▼─────┐
      │             │   Tools   │
      │             └─────┬─────┘
      │                   │
      ▼                   ▼
┌─────────────────────────────┐
│         Output              │
└─────────────────────────────┘
```

## Integrations

### LSP (Language Server Protocol)

- TypeScript, Python, Go, Rust support
- Diagnostics, hover, definition, references
- Document and workspace symbols

### MCP (Model Context Protocol)

- Client management
- Tool execution
- Resource reading
- Authentication

### Skill System

- SKILL.md parsing
- Project-level discovery
- Frontmatter metadata

## Extension Points

### Adding a New Provider

1. Create provider configuration in `api/providers/config/`
2. Implement provider interface
3. Register in provider index

### Adding a New Tool

1. Define tool schema with Zod
2. Implement tool handler
3. Register in ToolsEngine

### Adding a New Engine

1. Extend BaseEngine
2. Implement required methods
3. Register in Engines index

## Performance Considerations

- **Context Window**: Monitor token usage, use compaction
- **Parallel Execution**: Use adaptive mode for mixed workloads
- **Memory**: Implement eviction policies for long sessions
- **Caching**: Cache tool results when appropriate

## Security

- **API Keys**: Stored securely, never logged
- **Permissions**: Fine-grained control per tool
- **Sandboxing**: Isolate file operations
- **Audit**: Log all operations for review
