# Timer Local Time Bug Fix

## 问题描述

当使用 `showLocalTime=true` 时，界面显示 `NaN:NaN:NaN:NaN` 而不是正确的时间。

### 错误截图
```
Local Time  NaN:NaN:NaN:NaN • 测试获取当前时间
```

## 根本原因

1. **类型不匹配**：`TimerTool` 类型中 `duration` 是必需的（`duration: number`），但在 schema 中是可选的
2. **逻辑错误**：当 `showLocalTime=true` 且 `startTime` 未定义时，会尝试格式化倒计时时间，导致 `NaN`
3. **默认值问题**：`getRemainingTime()` 返回 `duration`，但当 `duration` 是 `undefined` 时会导致计算错误

## 修复内容

### 1. 修复类型定义 (`extension/src/shared/new-tools.ts`)

**修改前：**
```typescript
export type TimerTool = {
  tool: 'timer';
  duration: number;  // 必需
  // ...
};
```

**修改后：**
```typescript
export type TimerTool = {
  tool: 'timer';
  duration?: number;  // 可选
  // ...
};
```

### 2. 修复显示逻辑 (`extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx`)

**修改前：**
```typescript
const remainingSeconds = getRemainingTime();
const displayTime = showLocalTime && startTime
  ? formatLocalDateTime(startTime)
  : formatTime(remainingSeconds);
```

**问题：** 当 `showLocalTime=true` 但 `startTime` 是 `undefined` 时，会调用 `formatTime(remainingSeconds)`，而 `remainingSeconds` 可能是 `undefined`。

**修改后：**
```typescript
const displayTime = React.useMemo(() => {
  if (showLocalTime) {
    // For local time mode, use startTime if available, otherwise use current time
    const timeToDisplay = startTime || Date.now();
    return formatLocalDateTime(timeToDisplay);
  } else {
    // For countdown mode, show remaining time
    const remainingSeconds = getRemainingTime();
    return formatTime(remainingSeconds);
  }
}, [showLocalTime, startTime, timerState, currentTime, endTime, duration]);
```

**改进：**
- 使用 `React.useMemo` 优化性能
- 当 `showLocalTime=true` 时，如果 `startTime` 未定义，使用当前时间作为后备
- 明确分离两种模式的逻辑

### 3. 修复 getRemainingTime 函数

**修改前：**
```typescript
const getRemainingTime = (): number => {
  if (!startTime || !endTime) return duration;  // duration 可能是 undefined
  // ...
};
```

**修改后：**
```typescript
const getRemainingTime = (): number => {
  if (!startTime || !endTime) return duration || 0;  // 提供默认值 0
  // ...
};
```

### 4. 修复 Total Duration 显示

**修改前：**
```typescript
<p className='text-xs'>
  <span className='font-semibold'>Total Duration:</span> {duration}s ...
</p>
```

**修改后：**
```typescript
{duration !== undefined && duration > 0 && (
  <p className='text-xs'>
    <span className='font-semibold'>Total Duration:</span> {duration}s ...
  </p>
)}
```

**改进：** 只在 `duration` 有效时才显示

## 测试验证

### 测试用例 1：显示当地时间（基本）

```xml
<tool name="timer">
  <showLocalTime>true</showLocalTime>
</tool>
```

**期望结果：**
- 标题栏显示：`Local Time • 2025-10-06 14:30:45`
- 展开后显示：大号时间 `2025-10-06 14:30:45`
- ✅ 不显示 `NaN`

### 测试用例 2：显示当地时间（带备注）

```xml
<tool name="timer">
  <showLocalTime>true</showLocalTime>
  <note>测试获取当前时间</note>
</tool>
```

**期望结果：**
- 标题栏显示：`Local Time • 2025-10-06 14:30:45 • 测试获取当前时间`
- 展开后显示：
  - 大号时间 `2025-10-06 14:30:45`
  - 备注：`Note: 测试获取当前时间`
- ✅ 不显示 `NaN`

### 测试用例 3：倒计时模式（确保不受影响）

```xml
<tool name="timer">
  <duration>60</duration>
  <note>Wait 1 minute</note>
</tool>
```

**期望结果：**
- 标题栏显示：`Timer • 00:00:59:xxx • 50% • Wait 1 minute`
- 展开后显示：倒计时、进度条、开始时间、结束时间
- ✅ 正常倒计时

### 测试用例 4：边界情况 - duration 为 0

```xml
<tool name="timer">
  <showLocalTime>true</showLocalTime>
  <duration>0</duration>
</tool>
```

**期望结果：**
- 显示当地时间
- ✅ 不显示 Total Duration（因为 duration 为 0）

## 修复文件列表

1. ✅ `extension/src/shared/new-tools.ts` - 修复类型定义
2. ✅ `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx` - 修复显示逻辑

## 验证清单

- [x] 类型定义正确（duration 可选）
- [x] 显示逻辑正确（使用 useMemo 和后备值）
- [x] getRemainingTime 处理 undefined
- [x] Total Duration 条件渲染
- [x] 无编译错误
- [x] 向后兼容（倒计时模式不受影响）

## 预期行为

### 当地时间模式 (`showLocalTime=true`)
- ✅ 显示格式：`YYYY-MM-DD HH:MM:SS`
- ✅ 静态显示（不实时更新）
- ✅ 如果 `startTime` 未定义，使用当前时间作为后备
- ✅ 不显示进度条和停止按钮
- ✅ 不显示 Total Duration

### 倒计时模式（默认）
- ✅ 显示格式：`HH:MM:SS:mmm`
- ✅ 实时倒计时
- ✅ 显示进度条和停止按钮
- ✅ 显示 Total Duration、Start Time、End Time

## 总结

修复了以下问题：
1. ✅ 类型不匹配导致的 `duration` 必需性问题
2. ✅ 显示逻辑中的 `NaN` 问题
3. ✅ 边界情况处理（undefined 值）
4. ✅ 条件渲染优化

现在 Timer 工具的当地时间显示功能应该可以正常工作了！

