# Timer 工具重新设计方案

## 核心理念

**Timer 工具的真正目的**：控制 AI 的 API 请求状态，让 AI 可以"暂停"并在后台等待，而不是一直占用 API 请求。

## 快速对比

| 特性 | 当前设计 | 新设计 |
|------|---------|--------|
| 时长类型 | 单一时长 | 双时长（总时长 + 超时时长） |
| 后台运行 | ❌ 退出即停止 | ✅ 退出后继续运行 |
| 状态查询 | ❌ 无 | ✅ Read Timer 工具 |
| 主动终止 | ❌ 无 | ✅ Stop Timer 工具 |
| 取消计时器 | ❌ 无 | ✅ Cancel Timer 工具 |
| 继续等待 | ❌ 无法继续 | ✅ 传入 timer_id 继续 |
| API 节省 | ❌ 持续占用 | ✅ 超时期间待机 |
| 状态数量 | 2 种 | 4 种（running/completed/stopped/cancelled） |

## Timer 类型对比

| 类型 | 参数 | AI 行为 | 用途 | 示例 |
|------|------|---------|------|------|
| **等待型** | `reason` | 不立即调用 `attempt_completion` | 等待条件满足 | 等待服务器启动 |
| **任务型** | `mission` | **立即调用 `attempt_completion`** | 定时执行任务 | 30 分钟后重启服务器 |

## 工具对比

| 工具 | 用途 | 行为 | 何时使用 |
|------|------|------|---------|
| **Timer** | 创建/继续计时器 | AI 进入待机状态 | 需要等待或设定定时任务 |
| **Read Timer** | 查询计时器状态 | 返回剩余时间和状态 | 检查剩余时间 |
| **Stop Timer** | 停止计时器 | **直接杀掉进程** | 任务完成，不需要继续计时 |
| **Cancel Timer** | 取消等待 | **后台继续运行，完成后通知 AI** | AI 去做其他任务，等完成后回来 |
| **Pause Timer** | 暂停计时器 | 暂停倒计时 | 临时暂停，稍后恢复 |
| **Resume Timer** | 恢复计时器 | 恢复倒计时 | 提前恢复暂停的计时器 |

## 设计概念

### 两种时长

1. **设定时长（Total Duration）**
   - 系统级计时器，在后台持续运行
   - 即使 AI 超时退出工具，计时器仍然继续运行
   - 代表整个等待任务的总时长

2. **超时时长（Timeout Duration）**
   - AI 每次进入待机状态的时长
   - 超时后 AI 退出工具，可以执行其他操作
   - 通常 ≤ 设定时长
   - 用于控制 AI 的检查频率

### 工作流程示例

```
场景：等待服务器启动（预计需要 5 分钟）

1. AI: Timer(total=300s, timeout=60s, reason="等待服务器启动")
   → AI 进入待机状态（不消耗 API 请求）
   → 60秒后超时退出
   → 系统计时器继续运行（剩余 240s）

2. AI: Read Timer
   → 返回：剩余 240s，状态：运行中

3. AI: 检查服务器状态（执行其他工具）
   → 服务器还未启动

4. AI: Timer(total=240s, timeout=60s, reason="继续等待服务器")
   → AI 再次进入待机状态
   → 60秒后再次超时退出
   → 系统计时器继续运行（剩余 180s）

5. AI: Read Timer
   → 返回：剩余 180s，状态：运行中

6. AI: 检查服务器状态
   → 服务器已启动！

7. AI: Cancel Timer
   → 停止系统计时器
   → 继续后续任务
```

## 当前问题分析

### 1. 缺少双时长设计
- ❌ 只有单一时长，无法区分总时长和超时时长
- ❌ AI 无法在等待期间退出检查状态

### 2. 缺少后台计时器
- ❌ Timer 退出后计时器停止
- ❌ 无法保持系统级计时状态

### 3. 缺少状态查询
- ❌ 无法查询计时器剩余时间
- ❌ 无法查询计时器运行状态

### 4. 缺少计时器管理
- ❌ 无法取消正在运行的计时器
- ❌ 无法暂停/恢复计时器

## 新设计方案

### 工具集合

#### 1. Timer 工具（重新设计）

**两种类型：**

##### 类型 1: 等待型 Timer（Waiting Timer）

**参数：**
```typescript
{
  total_duration: number;      // 设定时长（系统计时器总时长）
  timeout_duration: number;    // 超时时长（AI 待机时长）
  reason: string;              // 等待原因（必填）
  timer_id?: string;           // 可选：继续已有计时器
}
```

**行为：**
- 用于等待某个条件满足（如服务器启动、文件生成）
- AI **不立即调用 `attempt_completion`**
- AI 进入待机状态 `timeout_duration` 秒
- 超时后退出工具，AI 自主判断情况
- 系统计时器继续运行

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
  <timer_id>timer_abc123</timer_id>
  <reason>Continue waiting for server</reason>
</tool>
```

##### 类型 2: 任务型 Timer（Mission Timer）

**参数：**
```typescript
{
  total_duration: number;      // 设定时长（系统计时器总时长）
  timeout_duration: number;    // 超时时长（AI 待机时长，通常等于 total_duration）
  mission: string;             // 待办任务（必填）
  timer_id?: string;           // 可选：继续已有计时器
}
```

**行为：**
- 用于设定定时任务（如 30 分钟后重启服务器）
- AI 设定后**立即调用 `attempt_completion`**
- 计时器保持运行
- 倒计时结束后，发送系统消息激活 AI
- AI 收到通知后执行计划内容

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
    Timer set for 30 minutes. I will restart the server when the timer completes.
  </result>
</tool>

<!-- 30 分钟后，系统消息激活 AI -->
[System] Timer 'timer_001' completed.
Mission: Restart the server after 30 minutes
Duration: 1800 seconds

<!-- AI 被激活，执行任务 -->
<tool name="launch-process">
  <command>systemctl restart myserver</command>
  ...
</tool>
```

**区分规则：**
- 如果有 `reason` 参数 → 等待型 Timer
- 如果有 `mission` 参数 → 任务型 Timer
- 不能同时有 `reason` 和 `mission`

#### 2. Read Timer 工具（新增）

**参数：**
```typescript
{
  timer_id?: string;  // 可选：查询特定计时器，为空则返回所有
}
```

**返回：**
```typescript
{
  timer_id: string;
  timer_type: 'waiting' | 'mission';  // 计时器类型
  total_duration: number;             // 总时长
  elapsed_time: number;               // 已运行时间
  remaining_time: number;             // 剩余时间
  status: 'running' | 'paused' | 'running_background' | 'completed' | 'stopped';
  reason?: string;                    // 等待原因（等待型）
  mission?: string;                   // 待办任务（任务型）
  stop_reason?: string;               // 停止/暂停/恢复原因
  created_at: number;                 // 创建时间戳
  last_check_at: number;              // 最后检查时间戳
  pause_until?: number;               // 暂停结束时间戳（如果暂停中）
}
```

**示例：**
```xml
<tool name="read_timer">
  <timer_id>timer_abc123</timer_id>
</tool>
```

#### 3. Stop Timer 工具（新增）

**参数：**
```typescript
{
  timer_id: string;  // 要停止的计时器 ID
  reason?: string;   // 停止原因
}
```

**行为：**
- **直接杀掉计时器进程**
- 标记状态为 'stopped'
- AI 主动判断任务已完成，不需要继续计时
- 立即清理资源

**用途：**
- 任务已完成，不需要继续计时
- 例如：服务器已启动，不需要继续等待

**示例：**
```xml
<tool name="stop_timer">
  <timer_id>timer_abc123</timer_id>
  <reason>Server has started successfully, no need to continue timing</reason>
</tool>
```

#### 4. Cancel Timer 工具（新增）

**参数：**
```typescript
{
  timer_id: string;  // 要取消等待的计时器 ID
  reason?: string;   // 取消等待原因
}
```

**行为：**
- **AI 取消等待，但计时器继续在后台运行**
- 标记状态为 'running_background'（后台运行）
- 计时器倒计时完成后，发送**系统消息**通知 AI
- AI 可以继续执行其他任务

**用途：**
- AI 需要去做其他任务，但仍然关心计时器完成
- 例如：等待构建完成，但先去做其他事情

**示例：**
```xml
<tool name="cancel_timer">
  <timer_id>timer_abc123</timer_id>
  <reason>Going to work on other tasks, will check back when timer completes</reason>
</tool>
```

**系统消息示例：**
```
[System] Timer 'timer_abc123' has completed.
Reason: Waiting for build to complete
Elapsed time: 300 seconds
```

#### 5. Pause Timer 工具（新增）

**参数：**
```typescript
{
  timer_id: string;      // 要暂停的计时器 ID
  pause_duration: number; // 暂停时长（秒）
  reason?: string;       // 暂停原因
}
```

**行为：**
- 暂停设定时长的倒计时
- 暂停期间，计时器不倒计时
- 暂停时长结束后，自动恢复倒计时
- 标记状态为 'paused'

**用途：**
- 临时暂停计时器
- 例如：等待过程中发现需要先完成其他任务

**示例：**
```xml
<tool name="pause_timer">
  <timer_id>timer_abc123</timer_id>
  <pause_duration>120</pause_duration>
  <reason>Need to fix a bug first, pause for 2 minutes</reason>
</tool>
```

#### 6. Resume Timer 工具（新增）

**参数：**
```typescript
{
  timer_id: string;  // 要恢复的计时器 ID
  reason?: string;   // 恢复原因
}
```

**行为：**
- 提前恢复已暂停的计时器
- 标记状态为 'running'
- 继续倒计时

**用途：**
- 提前恢复暂停的计时器
- 例如：任务提前完成，可以继续等待

**示例：**
```xml
<tool name="resume_timer">
  <timer_id>timer_abc123</timer_id>
  <reason>Bug fixed, resume waiting</reason>
</tool>
```

### 计时器状态机

```
┌─────────┐
│ Created │ (创建)
└────┬────┘
     │
     ▼
┌─────────┐    timeout     ┌──────────┐
│ Running │ ◄──────────────┤ AI Check │ (AI 检查状态)
└────┬────┘                └────┬─────┘
     │                          │
     │ continue timer           │
     └──────────────────────────┘
     │
     ├─── pause ──────► ┌───────────┐
     │                  │  Paused   │ (暂停)
     │                  └─────┬─────┘
     │                        │
     │                        │ resume / auto-resume
     │ ◄──────────────────────┘
     │
     ├─── cancel ─────► ┌────────────────────┐
     │                  │ Running Background │ (后台运行)
     │                  └──────────┬─────────┘
     │                             │
     │                             │ time up
     │                             ▼
     │                  ┌───────────────────┐
     │                  │ Completed + Notify│ (完成并通知 AI)
     │                  └───────────────────┘
     │
     ├─── time up ────► ┌───────────┐
     │                  │ Completed │ (自然完成)
     │                  └───────────┘
     │
     └─── stop ───────► ┌───────────┐
                        │  Stopped  │ (AI 主动终止 - 杀掉进程)
                        └───────────┘

状态说明：
- Running: 计时器正在运行，AI 在等待
- Paused: 计时器暂停，不倒计时
- Running Background: AI 取消等待，计时器在后台继续运行
- Completed: 计时器自然完成（时间到）
- Completed + Notify: 后台计时器完成，发送系统消息通知 AI
- Stopped: AI 主动停止（直接杀掉计时器进程）
```

### 使用场景

#### 场景 1: 等待型 Timer - 等待服务器启动

```xml
<!-- 第 1 次：创建计时器，等待 60 秒 -->
<tool name="timer">
  <total_duration>300</total_duration>
  <timeout_duration>60</timeout_duration>
  <reason>Waiting for server to start (5 minutes total)</reason>
</tool>
<!-- 返回：timer_id = "timer_001" -->

<!-- AI 超时退出，检查服务器状态 -->
<tool name="launch-process">
  <command>curl http://localhost:3000</command>
  ...
</tool>
<!-- 服务器还未启动 -->

<!-- 查询计时器剩余时间 -->
<tool name="read_timer">
  <timer_id>timer_001</timer_id>
</tool>
<!-- 返回：remaining_time = 240s -->

<!-- 第 2 次：继续等待 60 秒 -->
<tool name="timer">
  <total_duration>240</total_duration>
  <timeout_duration>60</timeout_duration>
  <timer_id>timer_001</timer_id>
  <reason>Continue waiting for server (4 minutes remaining)</reason>
</tool>

<!-- AI 超时退出，再次检查 -->
<tool name="launch-process">
  <command>curl http://localhost:3000</command>
  ...
</tool>
<!-- 服务器已启动！ -->

<!-- 停止计时器（任务完成） -->
<tool name="stop_timer">
  <timer_id>timer_001</timer_id>
  <reason>Server has started successfully</reason>
</tool>
```

#### 场景 2: 等待型 Timer - 观察文件系统变化

```xml
<!-- 创建 10 分钟计时器，每 30 秒检查一次 -->
<tool name="timer">
  <total_duration>600</total_duration>
  <timeout_duration>30</timeout_duration>
  <reason>Observing file system changes</reason>
</tool>
<!-- 返回：timer_id = "timer_002" -->

<!-- 超时后检查文件 -->
<tool name="view">
  <path>output/build.log</path>
</tool>
<!-- 文件还未生成 -->

<!-- 继续等待 -->
<tool name="read_timer">
  <timer_id>timer_002</timer_id>
</tool>
<!-- 剩余 570s -->

<tool name="timer">
  <total_duration>570</total_duration>
  <timeout_duration>30</timeout_duration>
  <timer_id>timer_002</timer_id>
</tool>

<!-- 再次检查 -->
<tool name="view">
  <path>output/build.log</path>
</tool>
<!-- 文件已生成！ -->

<!-- 停止计时器（任务完成） -->
<tool name="stop_timer">
  <timer_id>timer_002</timer_id>
  <reason>Build log file has been generated</reason>
</tool>
```

#### 场景 3: Stop vs Cancel 的区别

**使用 Stop（任务成功完成 - 杀掉进程）：**
```xml
<!-- 等待服务器启动 -->
<tool name="timer">
  <total_duration>300</total_duration>
  <timeout_duration>60</timeout_duration>
  <reason>Waiting for server to start</reason>
</tool>

<!-- 检查服务器状态 -->
<tool name="launch-process">
  <command>curl http://localhost:3000</command>
  ...
</tool>
<!-- 服务器已启动！ -->

<!-- 停止计时器 - 直接杀掉进程，不需要继续计时 -->
<tool name="stop_timer">
  <timer_id>timer_003</timer_id>
  <reason>Server has started successfully, no need to continue timing</reason>
</tool>
```

**使用 Cancel（AI 去做其他任务 - 后台继续运行）：**
```xml
<!-- 等待构建完成（预计 10 分钟） -->
<tool name="timer">
  <total_duration>600</total_duration>
  <timeout_duration>60</timeout_duration>
  <reason>Waiting for build to complete</reason>
</tool>
<!-- 返回：timer_id = "timer_004" -->

<!-- 超时退出，检查构建状态 -->
<tool name="launch-process">
  <command>npm run build</command>
  ...
</tool>
<!-- 构建还在进行中 -->

<!-- AI 决定：先去做其他任务，等构建完成后再回来 -->
<tool name="cancel_timer">
  <timer_id>timer_004</timer_id>
  <reason>Build is still running, will work on other tasks and check back when timer completes</reason>
</tool>

<!-- AI 继续执行其他任务 -->
<tool name="view">
  <path>src/components/header.tsx</path>
</tool>
<!-- ... 做其他事情 ... -->

<!-- 9 分钟后，计时器完成，系统发送消息 -->
[System Message]
Timer 'timer_004' has completed.
Reason: Waiting for build to complete
Total duration: 600 seconds
Elapsed time: 600 seconds

<!-- AI 收到通知，检查构建结果 -->
<tool name="launch-process">
  <command>npm run build</command>
  ...
</tool>
<!-- 构建成功！ -->
```

#### 场景 4: 使用 Pause/Resume

**暂停计时器：**
```xml
<!-- 等待部署完成（预计 30 分钟） -->
<tool name="timer">
  <total_duration>1800</total_duration>
  <timeout_duration>300</timeout_duration>
  <reason>Waiting for deployment to complete</reason>
</tool>
<!-- 返回：timer_id = "timer_005" -->

<!-- 5 分钟后超时退出 -->
<!-- 用户说："发现一个紧急 bug，需要先修复" -->

<!-- 暂停计时器 10 分钟 -->
<tool name="pause_timer">
  <timer_id>timer_005</timer_id>
  <pause_duration>600</pause_duration>
  <reason>Need to fix urgent bug first, pause for 10 minutes</reason>
</tool>

<!-- AI 去修复 bug -->
<tool name="str-replace-editor">...</tool>

<!-- 5 分钟后 bug 修复完成 -->
<!-- 提前恢复计时器 -->
<tool name="resume_timer">
  <timer_id>timer_005</timer_id>
  <reason>Bug fixed, resume waiting for deployment</reason>
</tool>

<!-- 继续等待部署 -->
<tool name="timer">
  <total_duration>1500</total_duration>
  <timeout_duration>300</timeout_duration>
  <timer_id>timer_005</timer_id>
</tool>
```

#### 场景 5: 任务型 Timer - 定时重启服务器

```xml
<!-- 用户说："30 分钟后重启服务器" -->

<!-- AI 创建任务型计时器 -->
<tool name="timer">
  <total_duration>1800</total_duration>
  <timeout_duration>1800</timeout_duration>
  <mission>Restart the server after 30 minutes</mission>
</tool>
<!-- 返回：timer_id = "timer_006" -->

<!-- AI 立即调用 attempt_completion -->
<tool name="attempt_completion">
  <result>
    I've set a timer for 30 minutes. I will restart the server when the timer completes.
    Timer ID: timer_006
  </result>
</tool>

<!-- ===== AI 进入待机状态 ===== -->
<!-- 30 分钟后，计时器完成 -->

<!-- 系统发送消息激活 AI -->
[System Message]
Timer 'timer_006' has completed.
Mission: Restart the server after 30 minutes
Duration: 1800 seconds
Elapsed: 1800 seconds

<!-- AI 被激活，执行任务 -->
<tool name="launch-process">
  <command>systemctl restart myserver</command>
  <wait>true</wait>
  <max_wait_seconds>60</max_wait_seconds>
  <cwd>/home/user</cwd>
</tool>

<!-- 检查服务器状态 -->
<tool name="launch-process">
  <command>systemctl status myserver</command>
  <wait>true</wait>
  <max_wait_seconds>10</max_wait_seconds>
  <cwd>/home/user</cwd>
</tool>

<!-- 报告结果 -->
<tool name="attempt_completion">
  <result>
    Server has been restarted successfully as scheduled.
  </result>
</tool>
```

#### 场景 6: 任务型 Timer - 定时检查日志

```xml
<!-- 用户说："1 小时后检查错误日志" -->

<!-- AI 创建任务型计时器 -->
<tool name="timer">
  <total_duration>3600</total_duration>
  <timeout_duration>3600</timeout_duration>
  <mission>Check error logs after 1 hour</mission>
</tool>

<!-- AI 立即调用 attempt_completion -->
<tool name="attempt_completion">
  <result>
    I've set a timer for 1 hour. I will check the error logs when the timer completes.
  </result>
</tool>

<!-- ===== 1 小时后 ===== -->

[System] Timer completed.
Mission: Check error logs after 1 hour

<!-- AI 被激活，执行任务 -->
<tool name="view">
  <path>logs/error.log</path>
  <type>file</type>
</tool>

<!-- 分析日志并报告 -->
<tool name="attempt_completion">
  <result>
    I've checked the error logs as scheduled. Found 3 new errors in the past hour:
    1. Connection timeout at 14:23
    2. Database query failed at 14:45
    3. Memory warning at 15:10
  </result>
</tool>
```

#### 场景 7: 任务型 Timer - 定时提醒

```xml
<!-- 用户说："10 分钟后提醒我开会" -->

<!-- AI 创建任务型计时器 -->
<tool name="timer">
  <total_duration>600</total_duration>
  <timeout_duration>600</timeout_duration>
  <mission>Remind user about the meeting in 10 minutes</mission>
</tool>

<!-- AI 立即调用 attempt_completion -->
<tool name="attempt_completion">
  <result>
    I've set a reminder for 10 minutes. I will notify you when it's time for the meeting.
  </result>
</tool>

<!-- ===== 10 分钟后 ===== -->

[System] Timer completed.
Mission: Remind user about the meeting in 10 minutes

<!-- AI 被激活，发送提醒 -->
<tool name="attempt_completion">
  <result>
    ⏰ Reminder: It's time for your meeting!
  </result>
</tool>
```

## 技术实现

### 后端架构

#### 1. Timer 管理器（单例）

```typescript
// extension/src/agent/v1/tools/managers/timer-manager.ts

export type TimerStatus = 'running' | 'completed' | 'stopped' | 'cancelled';

export interface TimerInfo {
  timer_id: string;
  total_duration: number;
  elapsed_time: number;
  remaining_time: number;
  status: TimerStatus;
  reason?: string;
  stop_reason?: string;
  created_at: number;
  last_check_at: number;
}

class TimerManager {
  private static instance: TimerManager;
  private timers: Map<string, TimerContext> = new Map();

  static getInstance(): TimerManager {
    if (!TimerManager.instance) {
      TimerManager.instance = new TimerManager();
    }
    return TimerManager.instance;
  }

  // 创建或继续计时器
  async runTimer(
    totalDuration: number,
    timeoutDuration: number,
    reason?: string,
    timerId?: string
  ): Promise<{ timer_id: string; timeout: boolean }> {
    let timer: TimerContext;

    if (timerId && this.timers.has(timerId)) {
      // 继续已有计时器
      timer = this.timers.get(timerId)!;
      timer.updateDuration(totalDuration);
    } else {
      // 创建新计时器
      const newTimerId = timerId || `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      timer = new TimerContext(newTimerId, totalDuration, reason);
      this.timers.set(newTimerId, timer);
    }

    // AI 进入待机状态（超时时长）
    const timeout = await timer.waitWithTimeout(timeoutDuration);

    return {
      timer_id: timer.getId(),
      timeout, // true = 超时退出, false = 计时器完成
    };
  }

  // 查询计时器状态
  getTimerInfo(timerId?: string): TimerInfo[] {
    if (timerId) {
      const timer = this.timers.get(timerId);
      return timer ? [timer.getInfo()] : [];
    }
    return Array.from(this.timers.values()).map(t => t.getInfo());
  }

  // 停止计时器（直接杀掉进程）
  stopTimer(timerId: string, reason?: string): boolean {
    const timer = this.timers.get(timerId);
    if (timer) {
      timer.stop(reason);
      this.timers.delete(timerId); // 清理资源
      return true;
    }
    return false;
  }

  // 取消等待（后台继续运行）
  cancelTimer(timerId: string, reason?: string): boolean {
    const timer = this.timers.get(timerId);
    if (timer) {
      timer.cancelWaiting(reason);
      // 不删除 timer，让它在后台继续运行
      // 完成后会发送系统消息
      return true;
    }
    return false;
  }

  // 暂停计时器
  pauseTimer(timerId: string, pauseDuration: number, reason?: string): boolean {
    const timer = this.timers.get(timerId);
    if (timer) {
      timer.pause(pauseDuration, reason);
      return true;
    }
    return false;
  }

  // 恢复计时器
  resumeTimer(timerId: string, reason?: string): boolean {
    const timer = this.timers.get(timerId);
    if (timer) {
      timer.resume(reason);
      return true;
    }
    return false;
  }

  // 清理已完成的计时器
  cleanup(): void {
    for (const [id, timer] of this.timers.entries()) {
      if (timer.getStatus() !== 'running') {
        this.timers.delete(id);
      }
    }
  }
}
```

#### 2. Timer 上下文

```typescript
// extension/src/agent/v1/tools/managers/timer-context.ts

class TimerContext {
  private timerId: string;
  private totalDuration: number;
  private startTime: number;
  private endTime: number;
  private status: TimerStatus = 'running';
  private reason?: string;
  private stopReason?: string;
  private lastCheckAt: number;
  private timeoutHandle?: NodeJS.Timeout;
  private pauseUntil?: number;
  private pausedTime: number = 0; // 累计暂停时间
  private onComplete?: (timerId: string, reason?: string) => void; // 完成回调

  constructor(
    timerId: string,
    totalDuration: number,
    reason?: string,
    onComplete?: (timerId: string, reason?: string) => void
  ) {
    this.timerId = timerId;
    this.totalDuration = totalDuration;
    this.reason = reason;
    this.onComplete = onComplete;
    this.startTime = Date.now();
    this.endTime = this.startTime + totalDuration * 1000;
    this.lastCheckAt = this.startTime;
  }

  // 等待指定超时时长
  async waitWithTimeout(timeoutDuration: number): Promise<boolean> {
    this.lastCheckAt = Date.now();

    // 检查是否暂停
    if (this.status === 'paused') {
      return true; // 暂停中，立即返回超时
    }

    const remaining = this.getRemainingTime();
    const waitTime = Math.min(timeoutDuration, remaining);

    if (waitTime <= 0) {
      this.status = 'completed';
      this.triggerComplete();
      return false; // 计时器已完成
    }

    return new Promise((resolve) => {
      this.timeoutHandle = setTimeout(() => {
        const remaining = this.getRemainingTime();
        if (remaining <= 0) {
          this.status = 'completed';
          this.triggerComplete();
          resolve(false); // 计时器完成
        } else {
          resolve(true); // 超时退出
        }
      }, waitTime * 1000);
    });
  }

  // 触发完成回调
  private triggerComplete(): void {
    if (this.onComplete) {
      this.onComplete(this.timerId, this.reason);
    }
  }

  updateDuration(newDuration: number): void {
    this.totalDuration = newDuration;
    this.endTime = Date.now() + newDuration * 1000;
  }

  getRemainingTime(): number {
    if (this.status === 'stopped') return 0;
    if (this.status === 'paused' && this.pauseUntil) {
      // 暂停中，返回暂停前的剩余时间
      return Math.ceil((this.endTime - this.pauseUntil + this.pausedTime * 1000) / 1000);
    }
    const remaining = Math.max(0, this.endTime - Date.now() + this.pausedTime * 1000);
    return Math.ceil(remaining / 1000);
  }

  getElapsedTime(): number {
    const elapsed = Math.floor((Date.now() - this.startTime - this.pausedTime * 1000) / 1000);
    return Math.max(0, elapsed);
  }

  stop(reason?: string): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
    }
    this.status = 'stopped';
    this.stopReason = reason;
  }

  cancelWaiting(reason?: string): void {
    // AI 取消等待，但计时器继续在后台运行
    this.status = 'running_background';
    this.stopReason = reason;

    // 设置后台完成监听
    const remaining = this.getRemainingTime();
    if (remaining > 0) {
      setTimeout(() => {
        if (this.status === 'running_background') {
          this.status = 'completed';
          this.triggerComplete(); // 发送系统消息
        }
      }, remaining * 1000);
    }
  }

  pause(pauseDuration: number, reason?: string): void {
    if (this.status !== 'running') return;

    this.status = 'paused';
    this.stopReason = reason;
    this.pauseUntil = Date.now() + pauseDuration * 1000;

    // 清除当前的超时
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
    }

    // 设置自动恢复
    setTimeout(() => {
      if (this.status === 'paused') {
        this.resume('Auto-resume after pause duration');
      }
    }, pauseDuration * 1000);
  }

  resume(reason?: string): void {
    if (this.status !== 'paused') return;

    // 计算暂停时长
    if (this.pauseUntil) {
      const pausedDuration = Math.floor((this.pauseUntil - Date.now()) / 1000);
      this.pausedTime += Math.max(0, pausedDuration);
    }

    this.status = 'running';
    this.stopReason = reason;
    this.pauseUntil = undefined;
  }

  getId(): string {
    return this.timerId;
  }

  getStatus(): TimerStatus {
    return this.status;
  }

  getInfo(): TimerInfo {
    return {
      timer_id: this.timerId,
      total_duration: this.totalDuration,
      elapsed_time: this.getElapsedTime(),
      remaining_time: this.getRemainingTime(),
      status: this.status,
      reason: this.reason,
      stop_reason: this.stopReason,
      created_at: this.startTime,
      last_check_at: this.lastCheckAt,
      pause_until: this.pauseUntil,
    };
  }
}
```

#### 3. 系统消息通知

```typescript
// extension/src/agent/v1/tools/managers/timer-notification.ts

export interface TimerNotification {
  type: 'timer_completed';
  timer_id: string;
  reason?: string;
  total_duration: number;
  elapsed_time: number;
}

// 在 TimerManager 中注册完成回调
class TimerManager {
  private notificationHandler?: (notification: TimerNotification) => void;

  setNotificationHandler(handler: (notification: TimerNotification) => void): void {
    this.notificationHandler = handler;
  }

  private handleTimerComplete(timerId: string, reason?: string): void {
    const timer = this.timers.get(timerId);
    if (timer && this.notificationHandler) {
      const info = timer.getInfo();
      this.notificationHandler({
        type: 'timer_completed',
        timer_id: timerId,
        reason: info.reason,
        total_duration: info.total_duration,
        elapsed_time: info.elapsed_time,
      });
    }

    // 清理已完成的计时器
    this.timers.delete(timerId);
  }

  async runTimer(...): Promise<{ timer_id: string; timeout: boolean }> {
    // ...
    const timer = new TimerContext(
      newTimerId,
      totalDuration,
      reason,
      (id, r) => this.handleTimerComplete(id, r) // 传入完成回调
    );
    // ...
  }
}

// 在 tool-executor.ts 中注册通知处理器
TimerManager.getInstance().setNotificationHandler((notification) => {
  // 发送系统消息给 AI
  this.sendSystemMessage({
    type: 'say',
    say: 'system',
    text: `[Timer Completed] Timer '${notification.timer_id}' has finished.\n` +
          `Reason: ${notification.reason || 'N/A'}\n` +
          `Duration: ${notification.total_duration} seconds\n` +
          `Elapsed: ${notification.elapsed_time} seconds`,
  });
});
```
```

### 前端改进

#### Timer 工具 UI

```typescript
// extension/webview-ui-vite/src/components/chat-row/tools/timer-tool.tsx

interface TimerToolProps {
  timer_id: string;
  total_duration: number;
  timeout_duration: number;
  elapsed_time: number;
  remaining_time: number;
  status: TimerStatus;
  reason?: string;
  stop_reason?: string;
}

// 显示：
// - 双时长显示（总时长 / 超时时长）
// - 进度条（基于总时长）
// - 状态指示器
// - 停止/取消按钮
```

#### Read Timer 工具 UI

```typescript
// extension/webview-ui-vite/src/components/chat-row/tools/read-timer-tool.tsx

// 显示计时器信息表格
// - Timer ID
// - 剩余时间
// - 状态
// - 创建原因
```

## 实施计划

### 阶段 1: 核心功能（优先实施）

**后端：**
- [ ] 创建 `TimerManager` 单例类
- [ ] 创建 `TimerContext` 类（支持暂停/恢复）
- [ ] 创建 `timer-notification.ts`（系统消息通知）
- [ ] 重构 `timer.tool.ts` 支持双时长
- [ ] 创建 `read-timer.tool.ts`
- [ ] 创建 `stop-timer.tool.ts`（杀掉进程）
- [ ] 创建 `cancel-timer.tool.ts`（后台运行 + 通知）
- [ ] 创建 `pause-timer.tool.ts`
- [ ] 创建 `resume-timer.tool.ts`
- [ ] 更新 Schema 定义
- [ ] 更新 Prompt 说明
- [ ] 在 `tool-executor.ts` 中注册通知处理器

**前端：**
- [ ] 更新 `timer-tool.tsx` UI（显示双时长、暂停状态）
- [ ] 创建 `read-timer-tool.tsx`
- [ ] 创建 `stop-timer-tool.tsx`
- [ ] 创建 `cancel-timer-tool.tsx`
- [ ] 创建 `pause-timer-tool.tsx`
- [ ] 创建 `resume-timer-tool.tsx`
- [ ] 注册新工具到 `chat-tools.tsx`
- [ ] 添加系统消息显示组件

**测试场景：**
- [ ] 创建计时器并超时退出
- [ ] 查询计时器状态
- [ ] 继续已有计时器
- [ ] 停止计时器（直接杀掉进程）
- [ ] 取消等待（后台运行 + 系统消息通知）
- [ ] 暂停计时器
- [ ] 恢复计时器（手动 + 自动）
- [ ] 后台计时器完成后收到系统消息

### 阶段 2: UI 增强（后续优化）

- [ ] 添加计时器列表视图
- [ ] 添加手动停止/取消按钮
- [ ] 添加计时器历史记录
- [ ] 改进进度条动画

### 阶段 3: 高级功能（未来扩展）

- [ ] 支持多个并行计时器
- [ ] 计时器暂停/恢复
- [ ] 计时器事件通知
- [ ] 计时器统计分析

## 文件清单

### 需要创建的文件

**后端：**
```
extension/src/agent/v1/tools/managers/
├── timer-manager.ts          (Timer 管理器)
├── timer-context.ts          (Timer 上下文)
└── timer-notification.ts     (系统消息通知)

extension/src/agent/v1/tools/runners/
├── timer.tool.ts             (重构 - 双时长)
├── read-timer.tool.ts        (新增 - 查询状态)
├── stop-timer.tool.ts        (新增 - 杀掉进程)
├── cancel-timer.tool.ts      (新增 - 后台运行)
├── pause-timer.tool.ts       (新增 - 暂停)
└── resume-timer.tool.ts      (新增 - 恢复)

extension/src/agent/v1/tools/schema/
├── timer.ts                  (重构)
├── read-timer.ts             (新增)
├── stop-timer.ts             (新增)
├── cancel-timer.ts           (新增)
├── pause-timer.ts            (新增)
└── resume-timer.ts           (新增)

extension/src/agent/v1/prompts/tools/
├── timer.ts                  (重构)
├── read-timer.ts             (新增)
├── stop-timer.ts             (新增)
├── cancel-timer.ts           (新增)
├── pause-timer.ts            (新增)
└── resume-timer.ts           (新增)
```

**前端：**
```
extension/webview-ui-vite/src/components/chat-row/tools/
├── timer-tool.tsx            (重构 - 显示双时长、暂停状态)
├── read-timer-tool.tsx       (新增)
├── stop-timer-tool.tsx       (新增)
├── cancel-timer-tool.tsx     (新增)
├── pause-timer-tool.tsx      (新增)
└── resume-timer-tool.tsx     (新增)

extension/webview-ui-vite/src/components/chat-row/
└── system-message.tsx        (新增 - 显示系统消息)
```

### 需要修改的文件

```
extension/src/agent/v1/tools/index.ts
extension/src/agent/v1/tools/schema/index.ts
extension/src/agent/v1/tools/tool-executor.ts
extension/src/agent/v1/tools/types/index.ts
extension/src/agent/v1/prompts/tools/index.ts
extension/src/shared/new-tools.ts
extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx
```

## 总结

### 核心改进

1. **双时长设计**：区分系统计时器（总时长）和 AI 超时时长
2. **后台运行**：计时器在 AI 超时退出后继续运行
3. **状态管理**：5 种状态（running, paused, running_background, completed, stopped）
4. **工具集合**：6 个工具
   - Timer（创建/继续）
   - Read Timer（查询状态）
   - Stop Timer（杀掉进程）
   - Cancel Timer（后台运行 + 通知）
   - Pause Timer（暂停）
   - Resume Timer（恢复）
5. **系统消息通知**：后台计时器完成后自动通知 AI

### 优势

- ✅ AI 可以在等待期间执行其他操作
- ✅ 节省 API 请求（AI 进入待机状态）
- ✅ 灵活的检查频率（通过超时时长控制）
- ✅ 清晰的状态管理和生命周期
- ✅ 后台运行 + 自动通知（Cancel Timer）
- ✅ 暂停/恢复功能（临时中断）
- ✅ 直接终止（Stop Timer）vs 后台继续（Cancel Timer）

### 使用场景

- **等待服务器启动**：定期检查，启动后 Stop
- **观察文件系统变化**：定期检查，发现变化后 Stop
- **等待构建/部署完成**：Cancel 后台运行，完成后收到通知
- **监控长时间运行的任务**：Pause 暂停，Resume 恢复
- **临时中断等待**：Pause 去做其他事，稍后 Resume

