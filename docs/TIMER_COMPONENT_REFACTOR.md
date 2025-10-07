# Timer 组件重构 - 独立样式设计

## 重构目标

将 Timer 工具拆分为两个完全独立的组件，避免共用样式导致的闪烁问题。

## 架构设计

### 之前的设计（单一组件）

```
TimerToolBlock (单一组件)
├─ 根据 showLocalTime 参数切换显示模式
├─ 共用状态管理
├─ 共用样式逻辑
└─ 问题：初始渲染时可能显示错误的模式，导致闪烁
```

**问题：**
- 组件需要根据 `showLocalTime` 参数动态切换显示模式
- 初始状态可能不正确，导致先显示倒计时模式，然后切换到本地时间模式
- 标题栏闪烁：`Timer` → `Local Time`

### 重构后的设计（双组件）

```
ToolRenderer
├─ 根据 showLocalTime 参数路由到不同组件
├─ LocalTimeToolBlock (本地时间组件)
│   ├─ 独立的样式
│   ├─ 独立的状态管理
│   ├─ 静态时间显示
│   └─ 无倒计时逻辑
└─ TimerToolBlock (倒计时组件)
    ├─ 独立的样式
    ├─ 独立的状态管理
    ├─ 倒计时逻辑
    └─ 进度条显示
```

**优势：**
- ✅ 两个组件完全独立，不共用任何逻辑
- ✅ 根据参数直接渲染正确的组件
- ✅ 无状态切换，无闪烁问题
- ✅ 代码更清晰，易于维护

## 组件详细设计

### 1. LocalTimeToolBlock（本地时间组件）

**用途：** 显示调用工具时的本地时间快照

**Props：**
```typescript
interface LocalTimeToolProps {
  note?: string;          // 可选备注
  startTime: number;      // 时间戳（必需）
  ts: number;             // 工具调用时间戳
  approvalState?: ToolStatus;  // 审批状态
}
```

**特点：**
- ✅ 静态显示（不实时更新）
- ✅ 显示格式：`YYYY-MM-DD HH:MM:SS`
- ✅ 无倒计时逻辑
- ✅ 无进度条
- ✅ 无停止按钮
- ✅ 蓝色边框和图标

**UI 结构：**
```
┌─────────────────────────────────────────────┐
│ 🕐 Local Time                               │
│ 2025-10-06 14:30:45 • 备注信息             │
│                                             │
│ [展开后]                                    │
│                                             │
│          Local Time                         │
│     2025-10-06 14:30:45                    │
│                                             │
│     Note: 备注信息                          │
└─────────────────────────────────────────────┘
```

### 2. TimerToolBlock（倒计时组件）

**用途：** 显示倒计时器

**Props：**
```typescript
interface TimerToolProps extends TimerTool {
  approvalState?: ToolStatus;
  ts: number;
  tool: 'timer';
}
```

**特点：**
- ✅ 实时倒计时（每 100ms 更新）
- ✅ 显示格式：`HH:MM:SS:mmm`
- ✅ 进度条显示
- ✅ 停止按钮
- ✅ 状态管理（running/completed/stopped/error）
- ✅ 蓝色/绿色/黄色/红色边框（根据状态）

**UI 结构：**
```
┌─────────────────────────────────────────────┐
│ 🕐 Timer                              [X]   │
│ 00:00:45:230 • 75% • 备注信息              │
│                                             │
│ [展开后]                                    │
│                                             │
│ Time Remaining:        00:00:45:230        │
│ ████████████████░░░░░░░░ 75%               │
│                                             │
│ Total Duration: 60s (0h 1m 0s)             │
│ Start Time: 2025-10-06 14:30:00            │
│ Expected End Time: 2025-10-06 14:31:00     │
│ Note: 备注信息                              │
└─────────────────────────────────────────────┘
```

## 路由逻辑

### ToolRenderer 中的路由

```typescript
case 'timer':
  // Route to appropriate component based on showLocalTime flag
  if (tool.showLocalTime && tool.startTime) {
    return <LocalTimeToolBlock 
      note={tool.note}
      startTime={tool.startTime}
      ts={tool.ts}
      approvalState={tool.approvalState}
    />;
  }
  return <TimerToolBlock {...tool} />;
```

**路由规则：**
1. 如果 `showLocalTime=true` 且 `startTime` 存在 → 渲染 `LocalTimeToolBlock`
2. 否则 → 渲染 `TimerToolBlock`

## 后端集成

### timer.tool.ts 的调用流程

```typescript
// 本地时间模式
if (showLocalTime) {
  await updateAsk('tool', {
    tool: {
      tool: 'timer',
      duration: 0,
      note,
      startTime: currentTime,      // 提供时间戳
      endTime: currentTime,
      timerStatus: 'completed',
      approvalState: 'approved',
      ts: this.ts,
      showLocalTime: true,          // 标记为本地时间模式
    },
  }, this.ts);
}

// 倒计时模式
else {
  await updateAsk('tool', {
    tool: {
      tool: 'timer',
      duration,
      note,
      startTime,
      endTime,
      timerStatus: 'running',
      approvalState: 'loading',
      ts: this.ts,
      // showLocalTime 未设置或为 false
    },
  }, this.ts);
}
```

## 工作流程

### 本地时间模式流程

```
1. AI 调用 timer 工具
   └─ showLocalTime: true

2. timer.tool.ts 处理
   ├─ 获取当前时间戳
   ├─ 设置 showLocalTime: true
   ├─ 设置 startTime: currentTime
   └─ 发送到前端

3. ToolRenderer 接收数据
   ├─ 检测到 showLocalTime=true
   └─ 路由到 LocalTimeToolBlock

4. LocalTimeToolBlock 渲染
   ├─ 标题：Local Time
   ├─ 时间：2025-10-06 14:30:45
   └─ 无闪烁 ✅
```

### 倒计时模式流程

```
1. AI 调用 timer 工具
   └─ duration: 60

2. timer.tool.ts 处理
   ├─ 计算 startTime 和 endTime
   ├─ showLocalTime 未设置
   └─ 发送到前端

3. ToolRenderer 接收数据
   ├─ showLocalTime 为 false 或未设置
   └─ 路由到 TimerToolBlock

4. TimerToolBlock 渲染
   ├─ 标题：Timer
   ├─ 倒计时：00:00:59:xxx
   ├─ 进度条：50%
   └─ 正常倒计时 ✅
```

## 代码变更摘要

### 新增组件

```typescript
// LocalTimeToolBlock - 本地时间组件
const LocalTimeToolBlock: React.FC<LocalTimeToolProps> = ({
  note,
  startTime,
  approvalState,
}) => {
  // 静态时间显示
  const displayTime = formatLocalDateTime(startTime);
  
  return (
    <div className='border-l-4 border-l-blue-500'>
      {/* 本地时间 UI */}
    </div>
  );
};
```

### 简化组件

```typescript
// TimerToolBlock - 移除所有 showLocalTime 相关逻辑
const TimerToolBlock: React.FC<TimerToolProps> = ({
  duration,
  note,
  startTime,
  endTime,
  // 移除了 showLocalTime 参数
}) => {
  // 只处理倒计时逻辑
  return (
    <div className='border-l-4 border-l-blue-500'>
      {/* 倒计时 UI */}
    </div>
  );
};
```

### 路由逻辑

```typescript
// ToolRenderer - 根据 showLocalTime 路由
case 'timer':
  if (tool.showLocalTime && tool.startTime) {
    return <LocalTimeToolBlock {...} />;
  }
  return <TimerToolBlock {...tool} />;
```

## 优势总结

### 1. 无闪烁问题
- ✅ 直接渲染正确的组件
- ✅ 无状态切换
- ✅ 无标题栏变化

### 2. 代码清晰
- ✅ 两个组件职责单一
- ✅ 无复杂的条件渲染
- ✅ 易于理解和维护

### 3. 性能优化
- ✅ LocalTimeToolBlock 无定时器
- ✅ TimerToolBlock 只在需要时运行定时器
- ✅ 无不必要的状态更新

### 4. 易于扩展
- ✅ 可以独立修改每个组件
- ✅ 不影响另一个组件
- ✅ 易于添加新功能

## 测试验证

### 测试用例 1：本地时间显示

```xml
<tool name="timer">
  <showLocalTime>true</showLocalTime>
  <note>测试本地时间</note>
</tool>
```

**期望结果：**
- ✅ 直接渲染 LocalTimeToolBlock
- ✅ 标题显示 "Local Time"
- ✅ 无闪烁
- ✅ 显示静态时间

### 测试用例 2：倒计时

```xml
<tool name="timer">
  <duration>60</duration>
  <note>等待 1 分钟</note>
</tool>
```

**期望结果：**
- ✅ 直接渲染 TimerToolBlock
- ✅ 标题显示 "Timer"
- ✅ 无闪烁
- ✅ 正常倒计时

## 文件变更

- ✅ `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx`
  - 新增 `LocalTimeToolBlock` 组件
  - 简化 `TimerToolBlock` 组件
  - 更新 `ToolRenderer` 路由逻辑

## 总结

通过将 Timer 工具拆分为两个完全独立的组件：
1. **LocalTimeToolBlock** - 专门显示本地时间
2. **TimerToolBlock** - 专门显示倒计时

彻底解决了标题栏闪烁问题，同时提高了代码的可维护性和可扩展性！

