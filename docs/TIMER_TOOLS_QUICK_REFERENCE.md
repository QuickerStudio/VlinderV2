# Timer 工具快速参考

## 两种 Timer 类型

### 等待型 Timer（Waiting Timer）
- **参数**：`reason`（等待原因）
- **用途**：等待条件满足（如服务器启动、文件生成）
- **AI 行为**：**不立即调用 `attempt_completion`**，自主判断情况
- **示例**：等待服务器启动、观察文件变化

### 任务型 Timer（Mission Timer）
- **参数**：`mission`（待办任务）
- **用途**：设定定时任务（如 30 分钟后重启服务器）
- **AI 行为**：**立即调用 `attempt_completion`**，计时器保持运行
- **示例**：定时重启服务器、定时检查日志、定时提醒

---

## 6 个工具概览

| 工具 | 用途 | 关键行为 |
|------|------|---------|
| **Timer** | 创建/继续计时器 | AI 进入待机状态 |
| **Read Timer** | 查询状态 | 返回剩余时间和状态 |
| **Stop Timer** | 停止计时器 | ❌ **直接杀掉进程** |
| **Cancel Timer** | 取消等待 | ✅ **后台继续运行 + 完成后通知** |
| **Pause Timer** | 暂停计时器 | 暂停倒计时 |
| **Resume Timer** | 恢复计时器 | 恢复倒计时 |

---

## 1. Timer（创建/继续计时器）

### 类型 1: 等待型 Timer

**参数：**
```typescript
{
  total_duration: number;      // 总时长（秒）
  timeout_duration: number;    // 超时时长（秒）
  reason: string;              // 等待原因（必填）
  timer_id?: string;           // 可选：继续已有计时器
}
```

**示例：**
```xml
<!-- 创建等待型计时器 -->
<tool name="timer">
  <total_duration>300</total_duration>
  <timeout_duration>60</timeout_duration>
  <reason>Waiting for server to start</reason>
</tool>

<!-- 继续等待 -->
<tool name="timer">
  <total_duration>240</total_duration>
  <timeout_duration>60</timeout_duration>
  <timer_id>timer_001</timer_id>
  <reason>Continue waiting for server</reason>
</tool>
```

### 类型 2: 任务型 Timer

**参数：**
```typescript
{
  total_duration: number;      // 总时长（秒）
  timeout_duration: number;    // 超时时长（秒，通常等于 total_duration）
  mission: string;             // 待办任务（必填）
  timer_id?: string;           // 可选：继续已有计时器
}
```

**示例：**
```xml
<!-- 创建任务型计时器 -->
<tool name="timer">
  <total_duration>1800</total_duration>
  <timeout_duration>1800</timeout_duration>
  <mission>Restart the server after 30 minutes</mission>
</tool>

<!-- AI 立即调用 attempt_completion -->
<tool name="attempt_completion">
  <result>
    I've set a timer for 30 minutes. I will restart the server when the timer completes.
  </result>
</tool>
```

**区分规则：**
- 如果有 `reason` 参数 → 等待型 Timer
- 如果有 `mission` 参数 → 任务型 Timer
- 不能同时有 `reason` 和 `mission`

---

## 2. Read Timer（查询状态）

### 参数
```typescript
{
  timer_id?: string;  // 可选：查询特定计时器，为空则返回所有
}
```

### 返回
```typescript
{
  timer_id: string;
  total_duration: number;
  elapsed_time: number;
  remaining_time: number;
  status: 'running' | 'paused' | 'running_background' | 'completed' | 'stopped';
  reason?: string;
  stop_reason?: string;
  created_at: number;
  last_check_at: number;
  pause_until?: number;
}
```

### 示例
```xml
<tool name="read_timer">
  <timer_id>timer_001</timer_id>
</tool>
```

---

## 3. Stop Timer（停止计时器）

### 关键特性
- ❌ **直接杀掉计时器进程**
- 计时器立即终止
- 不再运行

### 何时使用
- ✅ 任务已完成，不需要继续计时
- ✅ 例如：服务器已启动，不需要继续等待

### 参数
```typescript
{
  timer_id: string;
  reason?: string;
}
```

### 示例
```xml
<tool name="stop_timer">
  <timer_id>timer_001</timer_id>
  <reason>Server has started successfully</reason>
</tool>
```

---

## 4. Cancel Timer（取消等待）

### 关键特性
- ✅ **AI 取消等待，但计时器后台继续运行**
- ✅ **完成后发送系统消息通知 AI**
- AI 可以去做其他任务

### 何时使用
- ✅ AI 需要去做其他任务，但仍然关心计时器完成
- ✅ 例如：等待构建完成，但先去做其他事情

### 参数
```typescript
{
  timer_id: string;
  reason?: string;
}
```

### 示例
```xml
<tool name="cancel_timer">
  <timer_id>timer_001</timer_id>
  <reason>Build is still running, will work on other tasks</reason>
</tool>
```

### 系统消息示例
```
[Timer Completed] Timer 'timer_001' has finished.
Reason: Waiting for build to complete
Duration: 600 seconds
Elapsed: 600 seconds
```

---

## 5. Pause Timer（暂停计时器）

### 关键特性
- 暂停设定时长的倒计时
- 暂停期间不倒计时
- 暂停时长结束后自动恢复

### 何时使用
- ✅ 临时暂停计时器
- ✅ 例如：等待过程中发现需要先完成其他任务

### 参数
```typescript
{
  timer_id: string;
  pause_duration: number;  // 暂停时长（秒）
  reason?: string;
}
```

### 示例
```xml
<tool name="pause_timer">
  <timer_id>timer_001</timer_id>
  <pause_duration>120</pause_duration>
  <reason>Need to fix a bug first, pause for 2 minutes</reason>
</tool>
```

---

## 6. Resume Timer（恢复计时器）

### 关键特性
- 提前恢复已暂停的计时器
- 继续倒计时

### 何时使用
- ✅ 提前恢复暂停的计时器
- ✅ 例如：任务提前完成，可以继续等待

### 参数
```typescript
{
  timer_id: string;
  reason?: string;
}
```

### 示例
```xml
<tool name="resume_timer">
  <timer_id>timer_001</timer_id>
  <reason>Bug fixed, resume waiting</reason>
</tool>
```

---

## Stop vs Cancel 决策树

```
任务已完成？
├─ 是 → 使用 Stop Timer（杀掉进程）
└─ 否 → 任务还在进行中
         ├─ AI 需要继续等待 → 使用 Timer（继续等待）
         └─ AI 需要去做其他任务 → 使用 Cancel Timer（后台运行 + 通知）
```

---

## 常见使用模式

### 模式 1：等待型 Timer - 定期检查直到完成

```xml
<!-- 1. 创建计时器 -->
<tool name="timer">
  <total_duration>300</total_duration>
  <timeout_duration>60</timeout_duration>
  <reason>Waiting for server</reason>
</tool>

<!-- 2. 超时退出，检查状态 -->
<tool name="check_server">...</tool>

<!-- 3a. 如果完成 → Stop -->
<tool name="stop_timer">
  <timer_id>...</timer_id>
  <reason>Server started</reason>
</tool>

<!-- 3b. 如果未完成 → 继续等待 -->
<tool name="timer">
  <total_duration>240</total_duration>
  <timeout_duration>60</timeout_duration>
  <timer_id>...</timer_id>
</tool>
```

### 模式 2：等待型 Timer - 后台运行 + 通知

```xml
<!-- 1. 创建计时器 -->
<tool name="timer">
  <total_duration>600</total_duration>
  <timeout_duration>60</timeout_duration>
  <reason>Waiting for build</reason>
</tool>

<!-- 2. 超时退出，检查状态 -->
<tool name="check_build">...</tool>

<!-- 3. 任务还在进行，去做其他事 -->
<tool name="cancel_timer">
  <timer_id>...</timer_id>
  <reason>Build still running, will work on other tasks</reason>
</tool>

<!-- 4. AI 去做其他任务 -->
<tool name="view">...</tool>

<!-- 5. 计时器完成后收到系统消息 -->
[System] Timer completed...

<!-- 6. 检查结果 -->
<tool name="check_build">...</tool>
```

### 模式 3：等待型 Timer - 暂停 + 恢复

```xml
<!-- 1. 创建计时器 -->
<tool name="timer">
  <total_duration>1800</total_duration>
  <timeout_duration>300</timeout_duration>
  <reason>Waiting for deployment</reason>
</tool>

<!-- 2. 需要暂停 -->
<tool name="pause_timer">
  <timer_id>...</timer_id>
  <pause_duration>600</pause_duration>
  <reason>Need to fix urgent bug</reason>
</tool>

<!-- 3. 修复 bug -->
<tool name="str-replace-editor">...</tool>

<!-- 4. 提前恢复 -->
<tool name="resume_timer">
  <timer_id>...</timer_id>
  <reason>Bug fixed</reason>
</tool>

<!-- 5. 继续等待 -->
<tool name="timer">
  <total_duration>1500</total_duration>
  <timeout_duration>300</timeout_duration>
  <timer_id>...</timer_id>
</tool>
```

### 模式 4：任务型 Timer - 定时执行任务

```xml
<!-- 用户说："30 分钟后重启服务器" -->

<!-- 1. 创建任务型计时器 -->
<tool name="timer">
  <total_duration>1800</total_duration>
  <timeout_duration>1800</timeout_duration>
  <mission>Restart the server after 30 minutes</mission>
</tool>

<!-- 2. AI 立即调用 attempt_completion -->
<tool name="attempt_completion">
  <result>
    I've set a timer for 30 minutes. I will restart the server when the timer completes.
    Timer ID: timer_001
  </result>
</tool>

<!-- ===== AI 进入待机状态 30 分钟 ===== -->

<!-- 3. 30 分钟后，系统消息激活 AI -->
[System] Timer 'timer_001' completed.
Mission: Restart the server after 30 minutes
Duration: 1800 seconds

<!-- 4. AI 被激活，执行任务 -->
<tool name="launch-process">
  <command>systemctl restart myserver</command>
  ...
</tool>

<!-- 5. 报告结果 -->
<tool name="attempt_completion">
  <result>
    Server has been restarted successfully as scheduled.
  </result>
</tool>
```

### 模式 5：任务型 Timer - 定时提醒

```xml
<!-- 用户说："10 分钟后提醒我开会" -->

<!-- 1. 创建任务型计时器 -->
<tool name="timer">
  <total_duration>600</total_duration>
  <timeout_duration>600</timeout_duration>
  <mission>Remind user about the meeting in 10 minutes</mission>
</tool>

<!-- 2. AI 立即调用 attempt_completion -->
<tool name="attempt_completion">
  <result>
    I've set a reminder for 10 minutes. I will notify you when it's time for the meeting.
  </result>
</tool>

<!-- ===== 10 分钟后 ===== -->

<!-- 3. 系统消息激活 AI -->
[System] Timer completed.
Mission: Remind user about the meeting in 10 minutes

<!-- 4. AI 发送提醒 -->
<tool name="attempt_completion">
  <result>
    ⏰ Reminder: It's time for your meeting!
  </result>
</tool>
```

---

## 5 种状态

| 状态 | 含义 | 如何进入 |
|------|------|---------|
| **running** | 运行中 | Timer 创建后 |
| **paused** | 暂停中 | Pause Timer |
| **running_background** | 后台运行 | Cancel Timer |
| **completed** | 完成 | 时间到 |
| **stopped** | 已停止 | Stop Timer |

---

## 最佳实践

1. **使用 Stop Timer**：任务完成后立即停止，节省资源
2. **使用 Cancel Timer**：长时间任务，AI 可以去做其他事
3. **使用 Pause Timer**：临时中断，稍后恢复
4. **合理设置超时时长**：平衡检查频率和 API 消耗
5. **提供清晰的原因**：帮助用户理解 AI 的行为

