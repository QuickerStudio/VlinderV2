# Task Header 任务头部组件

任务相关的头部信息显示组件，提供任务状态、进度、操作按钮等功能。

## 📋 组件清单

| 组件 | 文件 | 描述 |
|------|------|------|
| TaskHeader | `task-header.tsx` | 任务头部主组件 |
| TaskText | `task-text.tsx` | 任务文本显示组件 |
| TokenInfo | `token-info.tsx` | 令牌使用信息组件 |
| BugReportDialog | `bug-report-dialog.tsx` | 错误报告对话框 |

## 🎯 主要功能

### 📋 任务信息显示
- **任务标题** - 显示当前任务的标题
- **任务描述** - 详细的任务描述信息
- **任务状态** - 进行中、已完成、失败等状态
- **进度指示** - 任务完成进度的可视化

### 📊 统计信息
- **令牌使用** - 显示API令牌的使用情况
- **时间统计** - 任务执行时间统计
- **消息计数** - 对话消息数量统计
- **成本估算** - API调用成本估算

### 🔧 操作功能
- **任务控制** - 暂停、继续、停止任务
- **错误报告** - 快速报告问题和错误
- **任务分享** - 分享任务链接或结果
- **设置访问** - 快速访问相关设置

### 🎨 状态指示
- **运行状态** - 实时显示任务运行状态
- **网络状态** - API连接状态指示
- **错误提示** - 错误和警告信息显示
- **成功反馈** - 任务完成的成功提示

## 🏗️ 架构设计

### 组件结构
```
TaskHeader
├── TaskInfo (任务信息)
│   ├── TaskText (任务文本)
│   ├── StatusBadge (状态徽章)
│   └── ProgressBar (进度条)
├── Statistics (统计信息)
│   ├── TokenInfo (令牌信息)
│   ├── TimeInfo (时间信息)
│   └── MessageCount (消息计数)
├── Actions (操作按钮)
│   ├── ControlButtons (控制按钮)
│   ├── ShareButton (分享按钮)
│   └── SettingsButton (设置按钮)
└── ErrorReporting (错误报告)
    └── BugReportDialog (报告对话框)
```

### 状态管理
- 任务状态通过全局状态管理
- 实时更新统计信息
- 错误状态的集中处理

## 🎨 用户体验

### 视觉设计
- **状态色彩** - 不同状态使用不同颜色
- **动画效果** - 平滑的状态转换动画
- **图标指示** - 直观的图标状态指示
- **响应式布局** - 适配不同屏幕尺寸

### 交互设计
- **一键操作** - 常用操作的快速访问
- **悬停提示** - 详细信息的悬停显示
- **快捷键** - 键盘快捷键支持
- **拖拽功能** - 支持拖拽调整布局

## 🔧 开发指南

### 添加新的统计信息
```tsx
// 扩展统计信息组件
function CustomStatistic({ label, value, icon }: StatisticProps) {
  return (
    <div className="flex items-center space-x-2">
      {icon}
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}

// 在TaskHeader中使用
<div className="statistics">
  <TokenInfo />
  <CustomStatistic 
    label="自定义指标"
    value="100"
    icon={<CustomIcon />}
  />
</div>
```

### 自定义任务状态
```tsx
// 定义新的任务状态
type TaskStatus = 
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'custom-status' // 新增状态

// 状态样式映射
const statusStyles = {
  'idle': 'bg-gray-100 text-gray-800',
  'running': 'bg-blue-100 text-blue-800',
  'completed': 'bg-green-100 text-green-800',
  'failed': 'bg-red-100 text-red-800',
  'custom-status': 'bg-purple-100 text-purple-800'
}
```

### 添加新的操作按钮
```tsx
function CustomActionButton({ onClick, disabled }: ActionButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
    >
      <CustomIcon className="w-4 h-4 mr-2" />
      自定义操作
    </Button>
  )
}
```

## 📊 数据结构

### 任务信息
```typescript
interface TaskInfo {
  id: string
  title: string
  description?: string
  status: TaskStatus
  progress: number // 0-100
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  estimatedDuration?: number
}
```

### 统计数据
```typescript
interface TaskStatistics {
  tokenUsage: {
    input: number
    output: number
    total: number
    cost?: number
  }
  timing: {
    duration: number
    estimatedRemaining?: number
  }
  messages: {
    total: number
    user: number
    assistant: number
  }
}
```

### 错误信息
```typescript
interface ErrorInfo {
  type: 'warning' | 'error' | 'info'
  message: string
  details?: string
  timestamp: Date
  canReport: boolean
}
```

## 🎯 使用示例

### 基础用法
```tsx
function App() {
  const taskInfo = {
    id: 'task-1',
    title: '代码重构任务',
    status: 'running',
    progress: 65
  }
  
  return (
    <div>
      <TaskHeader 
        task={taskInfo}
        onPause={() => console.log('暂停任务')}
        onStop={() => console.log('停止任务')}
        onReport={(error) => console.log('报告错误', error)}
      />
      {/* 其他内容 */}
    </div>
  )
}
```

### 自定义配置
```tsx
<TaskHeader
  task={taskInfo}
  showProgress={true}
  showTokenInfo={true}
  showActions={true}
  compact={false}
  theme="dark"
/>
```

## 🔗 相关组件
- [chat-view/](../chat-view/) - 聊天界面集成
- [ui/](../ui/) - 基础UI组件
- [timing-dashboard/](../timing-dashboard/) - 时间统计面板

## 🚀 功能特性
- ✅ 实时状态更新
- ✅ 令牌使用统计
- ✅ 错误报告功能
- ✅ 响应式设计
- ✅ 主题支持
- ✅ 键盘导航
- ✅ 无障碍支持
