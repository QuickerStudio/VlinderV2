# Timer 工具类型重构 - 干净的工具类型设计

## 重构目标

优化 timer.tool.ts 的切换逻辑，不是先传输 timer 再解析本地时间，而是在 timer.tool.ts 中完成判断后再调用 chat-tools.tsx 中的 2 种独立的样式 Local Time 或 timer，chat-tools.tsx 接受到干净的指令才会避免闪烁。

## 核心思想

**之前的问题：**
```
timer.tool.ts
    ↓ 发送 tool: 'timer' + showLocalTime: true
前端 ToolRenderer
    ↓ 检查 showLocalTime 参数
    ↓ 路由到 LocalTimeToolBlock
    ❌ 问题：前端需要判断，可能导致闪烁
```

**现在的解决方案：**
```
timer.tool.ts
    ↓ 判断 showLocalTime
    ├─ true  → 发送 tool: 'local_time' ✅
    └─ false → 发送 tool: 'timer' ✅
前端 ToolRenderer
    ├─ case 'local_time' → LocalTimeToolBlock ✅
    └─ case 'timer' → TimerToolBlock ✅
    ✅ 无需判断，直接渲染正确组件
```

## 架构设计

### 1. 新增工具类型

#### LocalTimeTool 类型定义
```typescript
// extension/src/shared/new-tools.ts

export type LocalTimeTool = {
  tool: 'local_time';        // ✅ 独立的工具类型
  note?: string;             // 可选备注
  localTime: number;         // 时间戳（必需）
};
```

#### 添加到 ChatTool 联合类型
```typescript
export type ChatTool = (
  | ExitAgentTool
  | SpawnAgentTool
  // ... 其他工具
  | TimerTool
  | LocalTimeTool  // ✅ 新增
) & {
  ts: number;
  approvalState?: ToolStatus;
  // ...
};
```

### 2. 后端逻辑优化

#### timer.tool.ts 的判断逻辑
```typescript
// extension/src/agent/v1/tools/runners/timer.tool.ts

async execute() {
  const { duration = 0, note, showLocalTime } = this.params;

  // ✅ 在后端完成判断，发送干净的工具类型
  if (showLocalTime) {
    const currentTime = Date.now();
    
    // 发送 local_time 工具类型（不是 timer）
    await updateAsk('tool', {
      tool: {
        tool: 'local_time',  // ✅ 干净的工具类型
        note,
        localTime: currentTime,
        approvalState: 'approved',
        ts: this.ts,
      },
    }, this.ts);

    return this.toolResponse('success', `Current local time: ...`);
  }

  // 倒计时模式
  const startTime = Date.now();
  const endTime = startTime + duration * 1000;

  await updateAsk('tool', {
    tool: {
      tool: 'timer',  // ✅ 干净的工具类型
      duration,
      note,
      startTime,
      endTime,
      timerStatus: 'running',
      approvalState: 'loading',
      ts: this.ts,
    },
  }, this.ts);

  // 等待倒计时完成...
}
```

### 3. 前端组件优化

#### LocalTimeToolBlock 接收干净的类型
```typescript
// extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx

interface LocalTimeToolProps extends LocalTimeTool {
  ts: number;
  approvalState?: ToolStatus;
  tool: 'local_time';  // ✅ 明确的工具类型
}

const LocalTimeToolBlock: React.FC<LocalTimeToolProps> = ({
  note,
  localTime,  // ✅ 使用 localTime 而不是 startTime
  approvalState,
}) => {
  const displayTime = formatLocalDateTime(localTime);
  
  return (
    <div className='border-l-4 border-l-blue-500'>
      <h3>Local Time</h3>
      <span>{displayTime}</span>
    </div>
  );
};
```

#### ToolRenderer 的干净路由
```typescript
export const ToolRenderer: React.FC<{
  tool: ChatTool;
}> = ({ tool }) => {
  switch (tool.tool) {
    // ... 其他工具
    
    case 'local_time':
      // ✅ 直接渲染，无需判断
      return <LocalTimeToolBlock {...tool} />;
    
    case 'timer':
      // ✅ 直接渲染，无需判断
      return <TimerToolBlock {...tool} />;
    
    default:
      return null;
  }
};
```

## 工作流程对比

### 之前的流程（有闪烁风险）

```
1. AI 调用 timer 工具
   └─ showLocalTime: true

2. timer.tool.ts 处理
   └─ 发送 { tool: 'timer', showLocalTime: true, ... }

3. 前端接收数据
   ├─ 初始渲染可能显示 Timer 组件
   ├─ 检测到 showLocalTime=true
   └─ 切换到 LocalTimeToolBlock
   ❌ 可能闪烁

4. 最终显示
   └─ Local Time
```

### 现在的流程（无闪烁）

```
1. AI 调用 timer 工具
   └─ showLocalTime: true

2. timer.tool.ts 处理
   ├─ 判断 showLocalTime=true
   └─ 发送 { tool: 'local_time', localTime: xxx, ... }
   ✅ 干净的工具类型

3. 前端接收数据
   ├─ ToolRenderer 检测 tool.tool === 'local_time'
   └─ 直接渲染 LocalTimeToolBlock
   ✅ 无判断，无切换

4. 最终显示
   └─ Local Time
   ✅ 无闪烁
```

## 代码变更摘要

### 1. 类型定义（extension/src/shared/new-tools.ts）

```typescript
// ✅ 新增 LocalTimeTool 类型
export type LocalTimeTool = {
  tool: 'local_time';
  note?: string;
  localTime: number;
};

// ✅ 添加到 ChatTool 联合类型
export type ChatTool = (
  // ...
  | TimerTool
  | LocalTimeTool
) & { /* ... */ };
```

### 2. 后端逻辑（extension/src/agent/v1/tools/runners/timer.tool.ts）

```typescript
// ✅ 在后端完成判断
if (showLocalTime) {
  await updateAsk('tool', {
    tool: {
      tool: 'local_time',  // 发送 local_time 类型
      note,
      localTime: currentTime,
      // ...
    },
  }, this.ts);
}
```

### 3. 前端组件（extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx）

```typescript
// ✅ 导入 LocalTimeTool 类型
import { LocalTimeTool } from 'extension/shared/new-tools';

// ✅ 更新 LocalTimeToolBlock props
interface LocalTimeToolProps extends LocalTimeTool {
  ts: number;
  approvalState?: ToolStatus;
  tool: 'local_time';
}

// ✅ 使用 localTime 属性
const LocalTimeToolBlock: React.FC<LocalTimeToolProps> = ({
  note,
  localTime,  // 不是 startTime
  approvalState,
}) => {
  const displayTime = formatLocalDateTime(localTime);
  // ...
};

// ✅ 干净的路由逻辑
case 'local_time':
  return <LocalTimeToolBlock {...tool} />;
case 'timer':
  return <TimerToolBlock {...tool} />;
```

### 4. 消息处理器（extension/webview-ui-vite/src/hooks/use-message-handler.ts）

```typescript
// ✅ 添加 local_time 到 toolButtonMap
const toolButtonMap: Record<ChatTool['tool'], Partial<ChatState>> = {
  // ...
  timer: {
    ...baseState,
    primaryButtonText: 'Wait',
    secondaryButtonText: 'Cancel',
  },
  local_time: {
    ...baseState,
    primaryButtonText: undefined,
    secondaryButtonText: undefined,
    enableButtons: false,
  },
};
```

## 优势总结

### 1. 无闪烁问题
- ✅ 后端发送明确的工具类型
- ✅ 前端直接渲染正确组件
- ✅ 无状态切换
- ✅ 无标题栏变化

### 2. 职责分离
- ✅ 后端负责判断逻辑
- ✅ 前端只负责渲染
- ✅ 符合单一职责原则

### 3. 类型安全
- ✅ `LocalTimeTool` 有明确的类型定义
- ✅ `localTime` 是必需属性
- ✅ TypeScript 编译时检查

### 4. 代码清晰
- ✅ 工具类型一目了然
- ✅ 无复杂的条件判断
- ✅ 易于理解和维护

### 5. 易于扩展
- ✅ 可以独立修改每个工具类型
- ✅ 不影响其他工具
- ✅ 易于添加新功能

## 测试验证

### 测试用例 1：本地时间显示

**AI 调用：**
```xml
<tool name="timer">
  <showLocalTime>true</showLocalTime>
  <note>任务开始时间</note>
</tool>
```

**后端发送：**
```json
{
  "tool": "local_time",
  "localTime": 1728234045000,
  "note": "任务开始时间",
  "approvalState": "approved",
  "ts": 1728234045000
}
```

**前端渲染：**
```
ToolRenderer 接收 tool.tool === 'local_time'
    ↓
直接渲染 LocalTimeToolBlock
    ↓
显示 "Local Time • 2025-10-06 14:30:45 • 任务开始时间"
    ↓
✅ 无闪烁！
```

### 测试用例 2：倒计时

**AI 调用：**
```xml
<tool name="timer">
  <duration>60</duration>
  <note>等待 1 分钟</note>
</tool>
```

**后端发送：**
```json
{
  "tool": "timer",
  "duration": 60,
  "startTime": 1728234045000,
  "endTime": 1728234105000,
  "timerStatus": "running",
  "note": "等待 1 分钟",
  "approvalState": "loading",
  "ts": 1728234045000
}
```

**前端渲染：**
```
ToolRenderer 接收 tool.tool === 'timer'
    ↓
直接渲染 TimerToolBlock
    ↓
显示 "Timer • 00:00:59:xxx • 50% • 等待 1 分钟"
    ↓
✅ 正常倒计时！
```

## 文件变更列表

- ✅ `extension/src/shared/new-tools.ts`
  - 新增 `LocalTimeTool` 类型
  - 添加到 `ChatTool` 联合类型

- ✅ `extension/src/agent/v1/tools/runners/timer.tool.ts`
  - 优化判断逻辑
  - 发送 `local_time` 工具类型

- ✅ `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx`
  - 导入 `LocalTimeTool` 类型
  - 更新 `LocalTimeToolBlock` props
  - 优化 `ToolRenderer` 路由逻辑

- ✅ `extension/webview-ui-vite/src/hooks/use-message-handler.ts`
  - 添加 `local_time` 到 `toolButtonMap`

- ✅ `docs/TIMER_CLEAN_TOOL_TYPE_REFACTOR.md`
  - 重构文档

## 构建验证

```bash
cd extension && pnpm run build
```

**结果：**
```
✓ built in 17.15s
✓ check-types passed
✓ lint passed
✓ build finished
✓ VSIX packaged successfully
```

## 总结

通过在后端完成判断并发送干净的工具类型（`local_time` 或 `timer`），前端可以直接渲染正确的组件，彻底避免了闪烁问题。这种设计符合职责分离原则，提高了代码的可维护性和可扩展性。

**关键改进：**
1. ✅ 后端判断 → 发送干净的工具类型
2. ✅ 前端接收 → 直接渲染正确组件
3. ✅ 无状态切换 → 无闪烁问题
4. ✅ 类型安全 → TypeScript 编译时检查
5. ✅ 代码清晰 → 易于理解和维护

