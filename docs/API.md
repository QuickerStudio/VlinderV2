# Vlinder V2 API Reference

## Table of Contents

- [Agent API](#agent-api)
- [Engine API](#engine-api)
- [Tool API](#tool-api)
- [Provider API](#provider-api)
- [Integration API](#integration-api)

---

## Agent API

### MainAgent

The main entry point for the agent system.

```typescript
import { MainAgent } from './agent/v2';

// Create MainAgent
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
  tools: [],
  bees: [],
});

// Initialize
await agent.initialize();

// Start
await agent.start();

// Run
const response = await agent.run([
  { id: '1', role: 'user', content: 'Create a hello world program', timestamp: Date.now() }
]);

// Stop
await agent.stop();
```

#### Methods

| Method | Description |
|--------|-------------|
| `initialize()` | Initialize the agent |
| `start()` | Start the agent |
| `stop()` | Stop the agent |
| `pause()` | Pause the agent |
| `resume()` | Resume the agent |
| `run(messages, context?, options?)` | Run with messages |
| `runStream(messages, context?, options?)` | Run with streaming |
| `registerBee(bee)` | Register a Bee agent |
| `unregisterBee(beeId)` | Unregister a Bee agent |
| `setProvider(provider)` | Set the LLM provider |
| `getContext()` | Get context variables |
| `updateContext(updates)` | Update context variables |
| `getMetrics()` | Get agent metrics |
| `getState()` | Get current state |

### Bee Agent

Worker agent configuration.

```typescript
import { BeeConfig, BeeCapability, BeePriority } from './agent/v2';

const codeBee: BeeConfig = {
  id: 'bee-code',
  name: 'Code Editor',
  description: 'Handles code editing tasks',
  instructions: 'You are a code editing specialist...',
  tools: [editFileTool, readFileTool],
  capabilities: [BeeCapability.CODE_EDITING],
  priority: BeePriority.HIGH,
  maxConcurrentTasks: 3,
  handoffs: [
    {
      targetBee: 'bee-test',
      condition: 'task involves testing',
      transferContext: true,
    }
  ],
};
```

---

## Engine API

### ApplyEngine

Multi-round tool execution engine.

```typescript
import { ApplyEngine, ExecutionMode } from './agent/v2/Engines/ApplyEngine';

const engine = new ApplyEngine({
  execution: {
    defaultMode: ExecutionMode.ADAPTIVE,
    maxParallel: 5,
    defaultTimeout: 30000,
  },
  permissions: {
    defaultLevel: PermissionLevel.EXECUTE,
    autoApproveSafe: true,
  },
  rollback: {
    enabled: true,
    autoRollback: true,
  },
});

await engine.initialize();

// Create session
const session = await engine.createSession({
  workingDirectory: '/path/to/project',
});

// Create plan
const plan = await engine.createPlan(session.id, [
  {
    name: 'Edit File',
    toolId: 'edit_file',
    toolName: 'edit_file',
    input: { path: 'test.ts', content: '...' },
    priority: 1,
    dependencies: [],
  },
]);

// Execute plan
await engine.executePlan(plan.id);
```

### RalphLoop

Autonomous execution loop.

```typescript
import { RalphLoop } from './agent/v2/Engines/ApplyEngine';

const ralph = new RalphLoop('/path/to/project', {
  maxIterations: 10,
  tool: 'vlinder',
  qualityChecks: ['typecheck', 'lint', 'test'],
  autoCommit: true,
  autoArchive: true,
});

// Start loop
await ralph.start();

// Get state
const state = ralph.getState();

// Stop loop
await ralph.stop();
```

### PRDManager

PRD document management.

```typescript
import { PRDManager } from './agent/v2/Engines/ApplyEngine';

const prdManager = new PRDManager('/path/to/project');

// Create PRD
const prd = await prdManager.createPRD({
  project: 'MyApp',
  branchName: 'ralph/my-feature',
  description: 'Feature description',
  userStories: [
    {
      title: 'Add feature X',
      description: 'As a user, I want X so that Y',
      acceptanceCriteria: ['Criteria 1', 'Criteria 2'],
      priority: 1,
    },
  ],
});

// Save PRD
await prdManager.savePRD(prd);

// Get next story
const nextStory = prdManager.getNextStory(prd);

// Mark story complete
await prdManager.markStoryComplete(prd, 'US-001');
```

---

## Tool API

### Tool Definition

```typescript
import { ToolDefinition, ToolPermission } from './agent/v2';
import { z } from 'zod';

const editFileTool: ToolDefinition = {
  name: 'edit_file',
  description: 'Edit a file with specified changes',
  inputSchema: z.object({
    path: z.string().describe('File path'),
    content: z.string().describe('New content'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  permissions: [ToolPermission.WRITE],
  handler: async (args, context) => {
    // Implementation
    return {
      value: 'File edited successfully',
    };
  },
};
```

### Tool Result

```typescript
interface ToolResult {
  value: string;                    // Result value
  agent?: BeeConfig;                // For handoffs
  contextVariables?: Partial<ContextVariables>;  // Context updates
  metadata?: Record<string, unknown>;
}
```

---

## Provider API

### Provider Configuration

```typescript
import { ProviderConfig, ProviderType } from './agent/v2';

const anthropicConfig: ProviderConfig = {
  name: 'anthropic',
  type: ProviderType.ANTHROPIC,
  apiKey: process.env.ANTHROPIC_API_KEY,
  models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
  defaultModel: 'claude-3-5-sonnet-20241022',
};
```

### Completion Request

```typescript
interface CompletionRequest {
  messages: Message[];
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'required' | 'none';
  model: ModelConfig;
  contextVariables?: ContextVariables;
}
```

### Completion Response

```typescript
interface CompletionResponse {
  id: string;
  message: Message;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
}
```

---

## Integration API

### LSP Integration

```typescript
import { LSPManager } from './integrations/lsp';

const lsp = new LSPManager();

// Initialize
await lsp.initialize();

// Get diagnostics
const diagnostics = await lsp.getDiagnostics('/path/to/file.ts');

// Get hover
const hover = await lsp.getHover('/path/to/file.ts', { line: 10, character: 5 });

// Get definition
const definition = await lsp.getDefinition('/path/to/file.ts', { line: 10, character: 5 });
```

### MCP Integration

```typescript
import { MCPClient } from './integrations/mcp';

const mcp = new MCPClient({
  serverPath: '/path/to/mcp-server',
});

// Connect
await mcp.connect();

// List tools
const tools = await mcp.listTools();

// Call tool
const result = await mcp.callTool('tool_name', { arg1: 'value1' });

// Disconnect
await mcp.disconnect();
```

### Skill System

```typescript
import { SkillManager } from './integrations/skill';

const skills = new SkillManager();

// Discover skills
const discovered = await skills.discover('/path/to/project');

// Get skill
const skill = skills.get('skill-name');

// Execute skill
const result = await skills.execute('skill-name', { input: '...' });
```

---

## Events

### Agent Events

```typescript
agent.on('initialized', () => {
  console.log('Agent initialized');
});

agent.on('started', () => {
  console.log('Agent started');
});

agent.on('stopped', () => {
  console.log('Agent stopped');
});

agent.on('error', (error) => {
  console.error('Agent error:', error);
});

agent.on('beeRegistered', (bee) => {
  console.log('Bee registered:', bee.name);
});
```

### Engine Events

```typescript
engine.on('plan:created', (plan) => {
  console.log('Plan created:', plan.id);
});

engine.on('step:started', (step) => {
  console.log('Step started:', step.id);
});

engine.on('step:completed', (result) => {
  console.log('Step completed:', result);
});

engine.on('plan:completed', (plan) => {
  console.log('Plan completed:', plan.id);
});
```

---

## Error Handling

```typescript
try {
  await agent.run(messages);
} catch (error) {
  if (error instanceof ConfigError) {
    // Handle configuration error
  } else if (error instanceof PermissionError) {
    // Handle permission error
  } else if (error instanceof ToolExecutionError) {
    // Handle tool execution error
  } else {
    // Handle unknown error
  }
}
```
