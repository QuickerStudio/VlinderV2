# History Preview 历史记录预览组件

历史对话的快速预览组件，提供对话内容的概览和快速访问。

## 📋 组件清单

| 组件 | 文件 | 描述 |
|------|------|------|
| HistoryPreview | `history-preview.tsx` | 历史预览主组件 |
| TaskCard | `task-card.tsx` | 任务卡片组件 |
| Utils | `utils.ts` | 预览相关工具函数 |

## 🎯 主要功能

### 📋 预览显示
- **对话摘要** - 显示对话的关键信息
- **任务卡片** - 以卡片形式展示任务
- **状态指示** - 显示任务完成状态
- **时间信息** - 显示创建和更新时间

### 🔍 快速操作
- **快速查看** - 悬停显示详细信息
- **一键恢复** - 快速恢复历史对话
- **分享功能** - 分享对话链接
- **删除操作** - 删除不需要的历史

### 🎨 视觉设计
- **卡片布局** - 清晰的卡片式布局
- **状态色彩** - 不同状态使用不同颜色
- **动画效果** - 平滑的交互动画
- **响应式** - 适配不同屏幕尺寸

## 🔧 开发指南

### 基础使用
```tsx
import { HistoryPreview, TaskCard } from './history-preview'

function HistoryPanel() {
  const historyItems = [
    {
      id: '1',
      title: '代码重构任务',
      summary: '重构React组件代码',
      status: 'completed',
      createdAt: new Date(),
      messageCount: 15
    }
  ]
  
  return (
    <HistoryPreview>
      {historyItems.map(item => (
        <TaskCard
          key={item.id}
          task={item}
          onRestore={() => restoreTask(item.id)}
          onDelete={() => deleteTask(item.id)}
        />
      ))}
    </HistoryPreview>
  )
}
```

## 🔗 相关组件
- [history-view/](../history-view/) - 完整的历史记录视图
- [task-header/](../task-header/) - 任务头部信息
- [ui/](../ui/) - 基础UI组件
