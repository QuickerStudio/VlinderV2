# Timer 类型对比：等待型 vs 任务型

## 核心区别

| 特性 | 等待型 Timer | 任务型 Timer |
|------|-------------|-------------|
| **参数** | `reason`（等待原因） | `mission`（待办任务） |
| **用途** | 等待条件满足 | 定时执行任务 |
| **AI 行为** | **不立即调用 `attempt_completion`** | **立即调用 `attempt_completion`** |
| **检查频率** | 定期检查（通过 `timeout_duration`） | 一次性等待（`timeout_duration` = `total_duration`） |
| **典型场景** | 等待服务器启动、观察文件变化 | 定时重启服务器、定时提醒 |

---

## 等待型 Timer（Waiting Timer）

### 特点

1. **参数**：`reason`（等待原因）
2. **AI 不立即调用 `attempt_completion`**
3. **定期检查**：AI 每隔 `timeout_duration` 秒检查一次状态
4. **自主判断**：AI 根据检查结果决定下一步操作

### 工作流程

```
1. AI 调用 Timer(total=300s, timeout=60s, reason="等待服务器启动")
   ↓
2. AI 进入待机 60 秒
   ↓
3. 超时退出，AI 检查服务器状态
   ↓
4. 如果服务器已启动 → Stop Timer
   如果服务器未启动 → Timer(total=240s, timeout=60s, timer_id)
   ↓
5. 重复步骤 2-4，直到服务器启动或时间用完
```

### 示例代码

```xml
<!-- 创建等待型计时器 -->
<tool name="timer">
  <total_duration>300</total_duration>
  <timeout_duration>60</timeout_duration>
  <reason>Waiting for server to start</reason>
</tool>

<!-- AI 进入待机 60 秒 -->
<!-- 超时退出后，AI 检查状态 -->

<tool name="launch-process">
  <command>curl http://localhost:3000</command>
  ...
</tool>

<!-- 如果服务器已启动 -->
<tool name="stop_timer">
  <timer_id>timer_001</timer_id>
  <reason>Server has started</reason>
</tool>

<!-- 如果服务器未启动，继续等待 -->
<tool name="timer">
  <total_duration>240</total_duration>
  <timeout_duration>60</timeout_duration>
  <timer_id>timer_001</timer_id>
  <reason>Continue waiting for server</reason>
</tool>
```

### 适用场景

- ✅ 等待服务器启动
- ✅ 观察文件系统变化
- ✅ 等待构建/部署完成
- ✅ 监控进程状态
- ✅ 等待网络连接恢复

---

## 任务型 Timer（Mission Timer）

### 特点

1. **参数**：`mission`（待办任务）
2. **AI 立即调用 `attempt_completion`**
3. **一次性等待**：`timeout_duration` 通常等于 `total_duration`
4. **定时执行**：计时器完成后，系统消息激活 AI 执行任务

### 工作流程

```
1. AI 调用 Timer(total=1800s, timeout=1800s, mission="重启服务器")
   ↓
2. AI 立即调用 attempt_completion("已设定 30 分钟后重启服务器")
   ↓
3. AI 进入待机状态 30 分钟
   ↓
4. 30 分钟后，系统发送消息激活 AI
   ↓
5. AI 执行任务：重启服务器
   ↓
6. AI 调用 attempt_completion("服务器已重启")
```

### 示例代码

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
[System Message]
Timer 'timer_001' has completed.
Mission: Restart the server after 30 minutes
Duration: 1800 seconds
Elapsed: 1800 seconds

<!-- 4. AI 被激活，执行任务 -->
<tool name="launch-process">
  <command>systemctl restart myserver</command>
  <wait>true</wait>
  <max_wait_seconds>60</max_wait_seconds>
  <cwd>/home/user</cwd>
</tool>

<!-- 5. 报告结果 -->
<tool name="attempt_completion">
  <result>
    Server has been restarted successfully as scheduled.
  </result>
</tool>
```

### 适用场景

- ✅ 定时重启服务器
- ✅ 定时检查日志
- ✅ 定时备份数据
- ✅ 定时提醒用户
- ✅ 定时执行脚本
- ✅ 定时清理缓存

---

## 决策树：选择哪种 Timer？

```
用户的需求是什么？
│
├─ 等待某个条件满足
│  （如：等待服务器启动、等待文件生成）
│  └─> 使用 等待型 Timer
│      - 参数：reason
│      - AI 不立即调用 attempt_completion
│      - 定期检查状态
│
└─ 在指定时间后执行某个任务
   （如：30 分钟后重启服务器、1 小时后检查日志）
   └─> 使用 任务型 Timer
       - 参数：mission
       - AI 立即调用 attempt_completion
       - 计时器完成后激活 AI
```

---

## 参数对比

### 等待型 Timer

```typescript
{
  total_duration: number;      // 总时长
  timeout_duration: number;    // 超时时长（通常 < total_duration）
  reason: string;              // 等待原因（必填）
  timer_id?: string;           // 可选：继续已有计时器
}
```

**示例：**
```xml
<tool name="timer">
  <total_duration>300</total_duration>
  <timeout_duration>60</timeout_duration>
  <reason>Waiting for server to start</reason>
</tool>
```

### 任务型 Timer

```typescript
{
  total_duration: number;      // 总时长
  timeout_duration: number;    // 超时时长（通常 = total_duration）
  mission: string;             // 待办任务（必填）
  timer_id?: string;           // 可选：继续已有计时器
}
```

**示例：**
```xml
<tool name="timer">
  <total_duration>1800</total_duration>
  <timeout_duration>1800</timeout_duration>
  <mission>Restart the server after 30 minutes</mission>
</tool>
```

---

## 常见错误

### ❌ 错误 1：混淆参数

```xml
<!-- 错误：同时使用 reason 和 mission -->
<tool name="timer">
  <total_duration>300</total_duration>
  <timeout_duration>60</timeout_duration>
  <reason>Waiting for server</reason>
  <mission>Restart server</mission>
</tool>
```

**正确做法**：只使用一个参数
- 等待型 → 只用 `reason`
- 任务型 → 只用 `mission`

### ❌ 错误 2：任务型 Timer 不调用 attempt_completion

```xml
<!-- 错误：创建任务型计时器后不调用 attempt_completion -->
<tool name="timer">
  <total_duration>1800</total_duration>
  <timeout_duration>1800</timeout_duration>
  <mission>Restart server</mission>
</tool>

<!-- 缺少 attempt_completion -->
```

**正确做法**：立即调用 `attempt_completion`

```xml
<tool name="timer">
  <total_duration>1800</total_duration>
  <timeout_duration>1800</timeout_duration>
  <mission>Restart server</mission>
</tool>

<tool name="attempt_completion">
  <result>Timer set for 30 minutes...</result>
</tool>
```

### ❌ 错误 3：等待型 Timer 立即调用 attempt_completion

```xml
<!-- 错误：等待型计时器不应该立即调用 attempt_completion -->
<tool name="timer">
  <total_duration>300</total_duration>
  <timeout_duration>60</timeout_duration>
  <reason>Waiting for server</reason>
</tool>

<tool name="attempt_completion">
  <result>Waiting for server...</result>
</tool>
```

**正确做法**：不调用 `attempt_completion`，等待超时后检查状态

---

## 总结

| 特性 | 等待型 Timer | 任务型 Timer |
|------|-------------|-------------|
| **关键词** | 等待、观察、监控 | 定时、计划、提醒 |
| **AI 行为** | 定期检查 | 一次性等待 |
| **`attempt_completion`** | ❌ 不立即调用 | ✅ 立即调用 |
| **`timeout_duration`** | < `total_duration` | = `total_duration` |
| **典型用语** | "等待..."、"观察..."、"监控..." | "X 分钟后..."、"定时..."、"提醒..." |

