# Vlinder V2 - Next Generation Agent Architecture

🦋 **Vlinder V2** 是基于2026年前沿Agent技术的下一代架构升级版本。

## 🌟 核心概念

### MainAgent - 最高全局领导人
MainAgent是整个自主编程系统的最高全局领导人，负责：
- 编排所有Bee代理
- 管理全局上下文和状态
- 处理任务委派和路由
- 维护系统级记忆
- 协调代理切换

### Bee - 工作代理（蜜蜂）
Bee是专门执行特定任务的工作代理，像蜂巢中的蜜蜂一样：
- 执行特定类型的任务
- 可以将工作交接给其他Bee
- 支持多种能力（代码编辑、终端、测试等）

### AgentSwarm - 蜂群编排系统
AgentSwarm管理和编排多个Bee代理：
- 任务分发和负载均衡
- 故障容错和熔断
- 健康监控
- 代理切换协调

## 🚀 核心特性

### 基于OpenAI Swarm设计
- 简洁的Agent类型定义
- Context Variables上下文传递
- Agent切换机制
- 工具调用处理

### 基于Goose设计
- Session会话管理
- Retry重试配置
- Provider抽象
- MCP支持

### 基于Claude Agent SDK
- 完整的TypeScript类型
- 流式响应支持
- 工具定义系统

## 📁 项目结构

```
extension/src/agent/
├── v1/                          # V1架构（保留）
│   ├── main-agent.ts
│   ├── state-manager/
│   ├── tools/
│   └── ...
│
└── v2/                          # V2架构（新增）
    ├── core/                    # 核心模块
    │   ├── types.ts             # 完整类型定义
    │   └── main-agent.ts        # MainAgent实现
    │
    ├── AgentSwarm/              # 蜂群编排
    │   ├── swarm.ts             # AgentSwarm实现
    │   └── bee.ts               # Bee工作代理
    │
    ├── runtime/                 # 运行时（计划中）
    ├── memory/                  # 记忆引擎（计划中）
    ├── thinking/                # 思维引擎（计划中）
    ├── tools/                   # 工具引擎（计划中）
    ├── context/                 # 上下文引擎（计划中）
    ├── shared/                  # 共享中间件（计划中）
    │
    └── index.ts                 # 主入口
```

## 🔧 快速开始

```typescript
import { quickStart } from './agent/v2';

// 快速启动
const mainAgent = await quickStart({
  name: 'My Agent',
});

// 运行对话
const response = await mainAgent.run([
  {
    id: '1',
    role: 'user',
    content: 'Hello, Vlinder!',
    timestamp: Date.now(),
  },
]);

console.log(response.messages);
```

## 🐝 Bee工作代理

### 预定义Bee类型

```typescript
import { BeeFactory, BeeCapability } from './agent/v2';

// 创建代码编辑Bee
const codeEditor = BeeFactory.createCodeEditor('bee_editor', tools);

// 创建终端Bee
const terminal = BeeFactory.createTerminal('bee_terminal', tools);

// 创建测试Bee
const tester = BeeFactory.createTester('bee_tester', tools);

// 创建文档Bee
const documenter = BeeFactory.createDocumenter('bee_docs', tools);

// 创建分析Bee
const analyst = BeeFactory.createAnalyst('bee_analyst', tools);
```

### 自定义Bee

```typescript
import { Bee, BeeCapability, BeePriority } from './agent/v2';

const customBee = new Bee({
  id: 'bee_custom',
  name: 'Custom Bee',
  description: 'A custom worker bee',
  instructions: 'You are a custom specialist.',
  tools: [/* ToolDefinition[] */],
  capabilities: [BeeCapability.CODE_EDITING],
  handoffs: [
    {
      targetBee: 'bee_tester',
      condition: 'context.needsTesting',
      transferContext: true,
    },
  ],
  priority: BeePriority.HIGH,
  maxConcurrentTasks: 3,
});
```

## 🔄 Agent切换

基于OpenAI Swarm的设计，工具可以返回Agent对象来触发切换：

```typescript
const handoffTool: ToolDefinition = {
  name: 'handoff_to_tester',
  description: 'Handoff to testing specialist',
  inputSchema: z.object({}),
  permissions: [],
  handler: async (args, context) => ({
    value: 'Handing off to tester',
    agent: testerBee, // 返回Bee配置触发切换
    contextVariables: { needsTesting: true },
  }),
};
```

## 📊 架构对比

| 特性 | V1 | V2 |
|------|----|----|
| Agent模式 | 单Agent | MainAgent + Bee多代理 |
| 编排方式 | 同步队列 | AgentSwarm编排 |
| 上下文传递 | 无 | Context Variables |
| Agent切换 | 不支持 | 支持Handoff |
| 故障容错 | 基础重试 | 熔断器 + 重试 |
| 健康监控 | 无 | 完整健康检查 |

## 📖 参考资料

本架构设计参考了以下开源项目：

- [OpenAI Swarm](https://github.com/openai/swarm) - 多Agent编排
- [Goose](https://github.com/block/goose) - Agent Runtime
- [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk-typescript) - TypeScript Agent SDK
- [OpenAI Agents Python](https://github.com/openai/openai-agents-python) - Python Agent框架
- [OpenCode](https://github.com/anomalyco/opencode) - 开源IDE
- [Ralph](https://github.com/snarktank/ralph) - Agent框架
- [Auto-Claude](https://github.com/AndyMik90/Auto-Claude) - 自动化Claude

## 📜 License

MIT License

## 🙏 致谢

基于 [Vlinder](https://github.com/QuickerStudio/Vlinder) 项目升级迭代

---

**Vlinder V2** - A Dream for Everyone 🦋
