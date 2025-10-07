# Timer 工具重新设计 - 执行摘要

## 问题陈述

当前的 Timer 工具存在以下限制：
1. **阻塞式设计**：AI 在等待期间无法执行其他操作
2. **无法继续**：退出后计时器停止，无法继续等待
3. **缺少状态管理**：无法查询、停止或取消计时器

## 解决方案

### 核心创新：双时长设计

```
┌─────────────────────────────────────────────────┐
│  设定时长 (Total Duration): 300 秒              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                 │
│  超时时长 (Timeout): 60 秒                      │
│  ━━━━━━━━━━━━                                  │
│  ↑                                              │
│  AI 待机期间                                    │
│  (不消耗 API 请求)                              │
└─────────────────────────────────────────────────┘
```

### 工作原理

1. **AI 调用 Timer**：设定总时长 300s，超时时长 60s
2. **AI 进入待机**：60 秒内不消耗 API 请求
3. **超时退出**：60 秒后 AI 退出工具，系统计时器继续运行（剩余 240s）
4. **AI 检查状态**：调用 Read Timer 查询剩余时间
5. **AI 决策**：
   - 继续等待 → 再次调用 Timer（传入 timer_id）
   - 任务完成 → 调用 Stop Timer
   - 放弃等待 → 调用 Cancel Timer

## 新工具集合

### 1. Timer（重构）
- **参数**：`total_duration`, `timeout_duration`, `timer_id?`, `reason?`
- **功能**：创建或继续计时器，AI 进入待机状态

### 2. Read Timer（新增）
- **参数**：`timer_id?`
- **功能**：查询计时器状态和剩余时间

### 3. Stop Timer（新增）
- **参数**：`timer_id`, `reason?`
- **功能**：**直接杀掉计时器进程**（任务完成，不需要继续计时）

### 4. Cancel Timer（新增）
- **参数**：`timer_id`, `reason?`
- **功能**：**AI 取消等待，计时器后台继续运行，完成后发送系统消息通知 AI**

### 5. Pause Timer（新增）
- **参数**：`timer_id`, `pause_duration`, `reason?`
- **功能**：暂停计时器指定时长

### 6. Resume Timer（新增）
- **参数**：`timer_id`, `reason?`
- **功能**：提前恢复已暂停的计时器

## 状态机

```
Created → Running ⇄ AI Check (timeout/continue)
              ↓
              ├─→ Paused (暂停) → Resume → Running
              ├─→ Running Background (后台运行) → Completed + Notify
              ├─→ Completed (时间到)
              └─→ Stopped (杀掉进程)
```

## Stop vs Cancel 的关键区别

| 操作 | Stop Timer | Cancel Timer |
|------|-----------|--------------|
| **行为** | 直接杀掉计时器进程 | AI 取消等待，计时器后台继续运行 |
| **计时器状态** | Stopped（终止） | Running Background（后台运行） |
| **用途** | 任务已完成，不需要继续计时 | AI 去做其他任务，等完成后回来 |
| **通知** | 无 | 完成后发送系统消息通知 AI |
| **示例** | 服务器已启动，停止计时 | 构建还在进行，先去做其他事 |

## 使用示例

### 场景：等待服务器启动

```xml
<!-- 1. 创建计时器 -->
<tool name="timer">
  <total_duration>300</total_duration>
  <timeout_duration>60</timeout_duration>
  <reason>Waiting for server to start</reason>
</tool>
<!-- 返回：timer_id = "timer_001", timeout = true -->

<!-- 2. 检查服务器 -->
<tool name="launch-process">
  <command>curl http://localhost:3000</command>
  ...
</tool>
<!-- 服务器还未启动 -->

<!-- 3. 查询剩余时间 -->
<tool name="read_timer">
  <timer_id>timer_001</timer_id>
</tool>
<!-- 返回：remaining_time = 240s -->

<!-- 4. 继续等待 -->
<tool name="timer">
  <total_duration>240</total_duration>
  <timeout_duration>60</timeout_duration>
  <timer_id>timer_001</timer_id>
</tool>

<!-- 5. 再次检查 -->
<tool name="launch-process">
  <command>curl http://localhost:3000</command>
  ...
</tool>
<!-- 服务器已启动！ -->

<!-- 6. 停止计时器 -->
<tool name="stop_timer">
  <timer_id>timer_001</timer_id>
  <reason>Server started successfully</reason>
</tool>
```

## 优势

### 1. API 请求优化
- ✅ AI 在超时期间进入待机状态
- ✅ 不消耗 API 请求配额
- ✅ 节省成本

### 2. 灵活性
- ✅ AI 可以在等待期间执行其他操作
- ✅ 可以调整检查频率（通过超时时长）
- ✅ 可以随时停止或取消

### 3. 状态管理
- ✅ 4 种清晰的状态
- ✅ 完整的生命周期管理
- ✅ 可查询、可控制

### 4. 用户体验
- ✅ AI 可以主动报告进度
- ✅ 清晰的等待原因说明
- ✅ 透明的状态反馈

## 实施计划

### 阶段 1：核心功能（优先）
- [ ] 创建 TimerManager 和 TimerContext
- [ ] 重构 Timer 工具支持双时长
- [ ] 实现 Read Timer 工具
- [ ] 实现 Stop Timer 工具
- [ ] 实现 Cancel Timer 工具
- [ ] 更新 UI 组件

### 阶段 2：UI 增强
- [ ] 计时器列表视图
- [ ] 手动控制按钮
- [ ] 历史记录

### 阶段 3：高级功能
- [ ] 多计时器并行
- [ ] 暂停/恢复
- [ ] 事件通知

## 技术架构

```
┌─────────────────────────────────────────┐
│         TimerManager (单例)             │
│  ┌───────────────────────────────────┐  │
│  │  timers: Map<id, TimerContext>    │  │
│  │  - runTimer()                     │  │
│  │  - getTimerInfo()                 │  │
│  │  - stopTimer()                    │  │
│  │  - cancelTimer()                  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │   TimerContext        │
        │  - waitWithTimeout()  │
        │  - getRemainingTime() │
        │  - stop()             │
        │  - cancel()           │
        └───────────────────────┘
```

## 文件结构

```
extension/src/agent/v1/tools/
├── managers/
│   ├── timer-manager.ts      (新增)
│   └── timer-context.ts      (新增)
├── runners/
│   ├── timer.tool.ts         (重构)
│   ├── read-timer.tool.ts    (新增)
│   ├── stop-timer.tool.ts    (新增)
│   └── cancel-timer.tool.ts  (新增)
├── schema/
│   ├── timer.ts              (重构)
│   ├── read-timer.ts         (新增)
│   ├── stop-timer.ts         (新增)
│   └── cancel-timer.ts       (新增)
└── prompts/tools/
    ├── timer.ts              (重构)
    ├── read-timer.ts         (新增)
    ├── stop-timer.ts         (新增)
    └── cancel-timer.ts       (新增)

extension/webview-ui-vite/src/components/chat-row/tools/
├── timer-tool.tsx            (重构)
├── read-timer-tool.tsx       (新增)
├── stop-timer-tool.tsx       (新增)
└── cancel-timer-tool.tsx     (新增)
```

## 下一步

1. 审查设计文档：`docs/TIMER_TOOL_IMPROVEMENT.md`
2. 确认技术方案
3. 开始实施阶段 1
4. 测试核心功能
5. 迭代优化

## 参考文档

- 完整设计文档：`docs/TIMER_TOOL_IMPROVEMENT.md`
- 当前 Timer 实现：`extension/src/agent/v1/tools/runners/timer.tool.ts`

