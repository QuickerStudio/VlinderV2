# Vlinder V2 - Engines System

🦋 **Vlinder V2 Engines** 是完整的Agent引擎系统，包含五大核心引擎。

## 📦 核心引擎

### 1. MemoryEngine - 持久化记忆系统

基于时间线的重要信息存入向量数据库ChromaDB的检索式记忆系统引擎。

**核心功能：**
- 时间线管理 (Timeline Management)
- 向量语义搜索 (Semantic Search)
- 记忆整合与衰减 (Consolidation & Decay)
- ChromaDB集成

```typescript
import { MemoryEngine } from './Engines/MemoryEngine';

const memory = new MemoryEngine();
await memory.initialize();

// 存储记忆
await memory.store('重要信息', {
  source: MemorySource.USER,
  sessionId: 'session-1',
}, { tags: ['important'] });

// 搜索记忆
const results = await memory.search('关键词');
```

### 2. ThinkingEngine - 思维链推理引擎

实现多种推理模式的思维链引擎。

**支持的推理模式：**
- 演绎推理 (Deductive)
- 归纳推理 (Inductive)
- 溯因推理 (Abductive)
- 类比推理 (Analogical)
- 因果推理 (Causal)

```typescript
import { ThinkingEngine, ReasoningPattern } from './Engines/ThinkingEngine';

const thinking = new ThinkingEngine();
await thinking.initialize();

// 创建思维链
const chain = await thinking.createChain('task-1', {
  input: '问题输入',
}, ReasoningPattern.DEDDUCTIVE);

// 添加思维步骤
await thinking.addStep(chain.id, {
  type: ThinkingStepType.OBSERVATION,
  content: '观察到的信息',
});

// 执行推理
const result = await thinking.executeChain(chain.id, { input: '...' });
```

### 3. ToolsEngine - 工具调用引擎

完整的工具注册、执行和权限管理系统。

**核心功能：**
- 工具注册与生命周期管理
- 权限控制与风险等级
- 重试策略
- 执行缓存

```typescript
import { ToolsEngine, ToolCategory, ToolRiskLevel } from './Engines/ToolsEngine';

const tools = new ToolsEngine();
await tools.initialize();

// 注册工具
await tools.registerTool({
  id: 'my-tool',
  name: 'My Tool',
  description: '工具描述',
  category: ToolCategory.SYSTEM,
  inputSchema: z.object({ message: z.string() }),
  permissions: [],
  riskLevel: ToolRiskLevel.SAFE,
  timeout: 5000,
  version: '1.0.0',
  handler: async (input) => ({ success: true, output: input.message }),
});

// 执行工具
const result = await tools.execute({
  toolId: 'my-tool',
  input: { message: 'Hello' },
  context: { ... },
});
```

### 4. ContextEngine - 上下文管理引擎

代码库索引和语义搜索的上下文管理系统。

**核心功能：**
- 代码库索引
- 符号提取
- 语义代码搜索
- 上下文窗口管理

```typescript
import { ContextEngine, SearchType } from './Engines/ContextEngine';

const context = new ContextEngine();
await context.initialize('/path/to/project');

// 搜索代码
const results = await context.search({
  query: 'function definition',
  type: SearchType.HYBRID,
  topK: 10,
});

// 索引文件
await context.indexFile('/path/to/file.ts');
```

### 5. ApplyEngine - 多轮工具执行引擎

支持依赖解析和并行执行的多轮工具执行引擎。

**核心功能：**
- 执行计划管理
- 依赖图解析
- 并行执行
- 回滚支持

```typescript
import { ApplyEngine, ExecutionMode } from './Engines/ApplyEngine';

const apply = new ApplyEngine();
await apply.initialize();

// 创建会话
const session = await apply.createSession({
  workingDirectory: '/tmp',
  agentId: 'agent-1',
  taskId: 'task-1',
  variables: {},
});

// 创建执行计划
const plan = await apply.createPlan(session.id, [
  { toolId: 'tool-1', toolName: 'Tool 1', input: {}, dependencies: [], priority: 1 },
  { toolId: 'tool-2', toolName: 'Tool 2', input: {}, dependencies: ['step_0'], priority: 2 },
], { mode: ExecutionMode.ADAPTIVE });

// 执行计划
await apply.executePlan(plan.id);
```

## 🔗 集成使用

### IntegratedAgent - 统一Agent系统

将所有引擎整合到统一的Agent系统中：

```typescript
import { createIntegratedAgent } from './Engines/integration';

const agent = await createIntegratedAgent({
  mainAgent: {
    id: 'main',
    name: 'Vlinder Agent',
    version: '2.0.0',
    model: {
      provider: ModelProvider.ANTHROPIC,
      modelId: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 4096,
    },
    instructions: 'You are a helpful assistant.',
    capabilities: [],
    tools: [],
    behavior: { ... },
    session: { id: 'session-1', persistenceEnabled: true },
    bees: [],
  },
});

// 增强执行
const result = await agent.runEnhanced(
  [{ id: '1', role: 'user', content: 'Hello!', timestamp: Date.now() }],
  {
    useMemory: true,
    useContext: true,
    useThinking: true,
  }
);

// 获取统计信息
const stats = agent.getStatistics();
```

## 📊 架构统计

| 模块 | 文件数 | 代码行数 |
|------|--------|----------|
| MemoryEngine | 3 | ~1,500 |
| ThinkingEngine | 3 | ~1,200 |
| ToolsEngine | 3 | ~1,300 |
| ContextEngine | 3 | ~1,400 |
| ApplyEngine | 3 | ~1,500 |
| Integration | 1 | ~400 |
| Tests | 5 | ~900 |
| **总计** | **27** | **~11,700** |

## 🧪 测试

```bash
# 运行所有测试
npm test

# 运行特定引擎测试
npm test -- memory-engine.test.ts
npm test -- thinking-engine.test.ts
npm test -- tools-engine.test.ts
npm test -- context-engine.test.ts
npm test -- apply-engine.test.ts
```

## 📚 设计参考

本架构设计参考了以下开源项目：

- [OpenAI Swarm](https://github.com/openai/swarm) - 多Agent编排
- [Goose](https://github.com/block/goose) - Agent Runtime
- [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk-typescript) - TypeScript Agent SDK
- [ChromaDB](https://github.com/chroma-core/chroma) - 向量数据库
- [Mem0](https://github.com/mem0ai/mem0) - 记忆系统

## 📜 License

MIT License

---

**Vlinder V2** - A Dream for Everyone 🦋
