# Timer Local Time Display Feature

## 概述

Timer 工具现在支持显示当地时间功能。当设置 `showLocalTime` 参数为 `true` 时，Timer 工具将显示获取时的当地时间（静态显示），而不是倒计时。

## 功能特点

- **静态时间显示**：显示调用工具时获取到的当地时间（不实时更新）
- **完整日期时间**：显示格式为 `YYYY-MM-DD HH:MM:SS`（年-月-日 时:分:秒）
- **无倒计时**：不显示倒计时秒表，只显示获取到的时间
- **无停止按钮**：当地时间模式下不显示停止按钮
- **简洁界面**：只显示时间和日期信息，不显示进度条和持续时间

## 使用方法

### 显示当地时间

```xml
<tool name="timer">
  <showLocalTime>true</showLocalTime>
  <note>Current local time</note>
</tool>
```

### 传统倒计时模式（保持不变）

```xml
<tool name="timer">
  <duration>300</duration>
  <note>Wait for 5 minutes</note>
</tool>
```

## 参数说明

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `showLocalTime` | boolean | 否 | false | 如果为 true，显示当地时间而不是倒计时 |
| `duration` | number | 否 | 0 | 倒计时持续时间（秒）。当 showLocalTime=true 时可以省略或设为 0 |
| `note` | string | 否 | - | 可选的备注说明 |

## UI 显示

### 当地时间模式

**标题栏：**
- 图标：蓝色时钟图标
- 标题：显示 "Local Time"
- 时间：显示格式为 `YYYY-MM-DD HH:MM:SS`（年-月-日 时:分:秒）
- 备注：如果提供了 note 参数

**展开详情：**
- **Local Time**：居中显示大号的日期时间（YYYY-MM-DD HH:MM:SS）
- **Note**：显示备注信息（如果有）

### 倒计时模式（传统）

**标题栏：**
- 图标：蓝色时钟图标
- 标题：显示 "Timer"
- 时间：显示剩余时间 `HH:MM:SS:mmm`
- 进度：显示完成百分比
- 停止按钮：可以停止计时器

**展开详情：**
- **Time Remaining**：剩余时间
- **Progress Bar**：进度条
- **Total Duration**：总持续时间
- **Start Time**：开始时间
- **Expected End Time**：预计结束时间
- **Note**：备注信息

## 技术实现

### 后端（timer.tool.ts）

当 `showLocalTime` 为 `true` 时：
1. 获取当前时间戳
2. 格式化为本地时间字符串
3. 立即返回，不进行倒计时
4. 设置 `timerStatus` 为 `'completed'`

```typescript
if (showLocalTime) {
  const currentTime = Date.now();
  const localTimeString = new Date(currentTime).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  await updateAsk('tool', {
    tool: {
      tool: 'timer',
      duration: 0,
      note,
      startTime: currentTime,
      endTime: currentTime,
      timerStatus: 'completed',
      approvalState: 'approved',
      ts: this.ts,
      showLocalTime: true,
    },
  }, this.ts);

  return this.toolResponse('success', `Current local time: ${localTimeString}${note ? ` (${note})` : ''}`);
}
```

### 前端（chat-tools.tsx）

1. **静态显示**：当 `showLocalTime` 为 `true` 时，显示 `startTime`（获取时的时间戳），不实时更新
2. **条件渲染**：根据 `showLocalTime` 参数决定显示内容
3. **格式化函数**：
   - `formatLocalDateTime()`：格式化为 YYYY-MM-DD HH:MM:SS

```typescript
// Display time logic
const displayTime = showLocalTime && startTime
  ? formatLocalDateTime(startTime)  // Static display of captured time
  : formatTime(remainingSeconds);   // Countdown timer

// Update current time every 100ms ONLY for countdown timer (NOT for local time)
React.useEffect(() => {
  // Only update for countdown timer, not for local time display
  if (!showLocalTime && timerState === 'running' && startTime && endTime) {
    const interval = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);

      // Check if timer naturally completed
      if (endTime && now >= endTime) {
        setTimerState('completed');
      }
    }, 100);
    return () => clearInterval(interval);
  }
}, [timerState, startTime, endTime, showLocalTime]);
```

## 使用场景

1. **记录时间点**：记录某个操作执行时的时间
2. **时间参考**：在执行任务时提供时间参考点
3. **时区显示**：显示本地时区的时间
4. **任务开始时间**：标记任务开始的时间点

## 示例

### 示例 1：简单显示当地时间

```xml
<tool name="timer">
  <showLocalTime>true</showLocalTime>
</tool>
```

返回：
```
Current local time: 2025-10-06 14:30:45
```

### 示例 2：带备注的当地时间

```xml
<tool name="timer">
  <showLocalTime>true</showLocalTime>
  <note>Task started at this time</note>
</tool>
```

返回：
```
Current local time: 2025-10-06 14:30:45 (Task started at this time)
```

### 示例 3：传统倒计时（对比）

```xml
<tool name="timer">
  <duration>60</duration>
  <note>Wait 1 minute</note>
</tool>
```

返回：
```
Timer completed. Waited for 60 seconds. Note: Wait 1 minute
```

## 注意事项

1. **时区**：显示的是运行环境的本地时区时间
2. **精度**：时间精确到秒
3. **静态显示**：显示的是调用工具时获取到的时间，不会实时更新
4. **兼容性**：完全向后兼容，不影响现有的倒计时功能

## 更新文件列表

1. `extension/src/agent/v1/tools/schema/timer.ts` - 添加 showLocalTime 参数
2. `extension/src/agent/v1/tools/runners/timer.tool.ts` - 实现当地时间逻辑
3. `extension/src/shared/new-tools.ts` - 更新 TimerTool 类型定义
4. `extension/src/agent/v1/prompts/tools/timer.ts` - 更新工具提示
5. `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx` - 更新 UI 组件

