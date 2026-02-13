# Changelog

All notable changes to Vlinder V2 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-02-13

### Added

#### Agent System V2
- **MainAgent**: Supreme global leader for autonomous programming system
- **Bee Agents**: Worker agents for specific task execution
- **AgentSwarm**: Orchestration layer for multi-agent coordination
- **Handoff System**: Agent switching based on task requirements

#### Engine System
- **ApplyEngine**: Multi-round tool execution with dependency resolution
  - Sequential, parallel, adaptive, and priority execution modes
  - Permission management and rollback support
- **ContextEngine**: Context management and agentic search
  - AgenticResearchEngine for codebase understanding
  - AgenticSearchEngine for intelligent search
- **MemoryEngine**: Persistent memory storage and retrieval
- **ThinkingEngine**: Reasoning and decision making
- **ToolsEngine**: Tool registration and execution

#### Ralph Integration
- **RalphLoop**: Autonomous agent loop execution
  - Iterative execution until PRD tasks complete
  - Clean context per iteration
  - Priority-based story selection
- **PRDManager**: Product Requirements Document management
  - JSON-based PRD format
  - User stories with acceptance criteria
  - Markdown import/export support
- **Progress Tracking**: Persistent progress via progress.txt

#### Integrations
- **LSP Integration**: Language Server Protocol support
  - TypeScript, Python, Go, Rust language servers
  - Diagnostics, hover, definition, references
- **MCP Integration**: Model Context Protocol support
  - Client management and tool execution
  - Resource reading and authentication
- **Skill System**: Reusable skill definitions
  - SKILL.md parsing with frontmatter
  - Project-level skill discovery

#### Provider Support
- Anthropic (Claude 3.5 Sonnet, Claude 3 Opus)
- OpenAI (GPT-4o, GPT-4 Turbo, o1)
- Google (Gemini 2.0, Gemini 1.5 Pro)
- DeepSeek (DeepSeek Chat, DeepSeek Coder)
- Moonshot (Moonshot v1)
- Custom OpenAI-compatible providers

### Changed
- Complete architecture redesign for V2
- Migrated from single-agent to multi-agent system
- Enhanced tool execution with dependency resolution
- Improved context management with agentic search

### Technical Details

#### Type System
- Comprehensive type definitions based on OpenAI Swarm and Goose
- Zod schemas for runtime validation
- TypeScript 5.0+ with strict mode

#### Database
- Drizzle ORM with LibSQL (SQLite-compatible)
- Schema: tasks, taskAgents, messages, apiHistory, files, promptTemplates

#### Build System
- esbuild for fast bundling
- Vite for webview UI
- TypeScript compilation

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 2.0.0 | 2025-02-13 | Complete V2 architecture redesign |
| 1.x | 2024 | Initial development versions |

---

## Migration Guide

### From V1 to V2

V2 is a complete rewrite with a new architecture. Key changes:

1. **Agent System**: V1's single agent replaced by MainAgent + Bee architecture
2. **Engines**: New engine-based architecture for modularity
3. **Tools**: Enhanced tool system with permissions and rollback
4. **Context**: New agentic context management
5. **Memory**: Persistent memory across sessions

### Breaking Changes

- All V1 APIs are deprecated
- Configuration format changed
- Tool definitions require new schema
- Session format incompatible with V1

---

## Roadmap

### Phase 1: Core Stability (Q1 2025)
- [ ] Complete engine implementations
- [ ] Comprehensive test coverage
- [ ] Performance optimization

### Phase 2: Enhanced Features (Q2 2025)
- [ ] Multi-file editing
- [ ] Project scaffolding
- [ ] Test generation

### Phase 3: Enterprise Features (Q3 2025)
- [ ] Team collaboration
- [ ] Custom model fine-tuning
- [ ] Audit logging

---

[2.0.0]: https://github.com/QuickerStudio/VlinderV2/releases/tag/v2.0.0
