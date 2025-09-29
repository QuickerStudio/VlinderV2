# Announcement Banner 公告横幅组件

用于显示重要通知、版本更新、系统公告等信息的横幅组件。

## 📋 组件清单

| 组件 | 文件 | 描述 |
|------|------|------|
| AnnouncementBanner | `index.tsx` | 公告横幅主组件 |

## 🎯 主要功能

### 📢 公告显示
- **版本更新通知** - 新版本发布时的通知
- **重要公告** - 系统维护、功能变更等通知
- **临时消息** - 临时性的重要信息
- **用户引导** - 新功能的使用引导

### 🎨 显示控制
- **可折叠** - 支持展开/收起内容
- **可关闭** - 用户可以关闭不需要的公告
- **自动隐藏** - 设定时间后自动隐藏
- **持久化** - 记住用户的关闭状态

### 🔧 交互功能
- **点击展开** - 点击查看详细内容
- **操作按钮** - 支持自定义操作按钮
- **链接跳转** - 支持外部链接跳转
- **反馈收集** - 收集用户对公告的反馈

## 🏗️ 架构设计

### 组件结构
```
AnnouncementBanner
├── Header (头部)
│   ├── Icon (图标)
│   ├── Title (标题)
│   └── CloseButton (关闭按钮)
├── Content (内容)
│   ├── Summary (摘要)
│   └── Details (详细内容)
└── Actions (操作区域)
    ├── ActionButton (操作按钮)
    └── ExpandButton (展开按钮)
```

### 状态管理
- 使用本地存储记住关闭状态
- 版本检测逻辑
- 公告内容的动态加载

## 🎨 样式变体

### 公告类型
- **info** - 信息类公告 (蓝色)
- **warning** - 警告类公告 (黄色)
- **success** - 成功类公告 (绿色)
- **error** - 错误类公告 (红色)
- **update** - 更新类公告 (紫色)

### 显示位置
- **top** - 页面顶部
- **bottom** - 页面底部
- **floating** - 浮动显示
- **inline** - 内联显示

## 🔧 开发指南

### 基础使用
```tsx
import AnnouncementBanner from './announcement-banner'

function App() {
  return (
    <div>
      <AnnouncementBanner
        type="update"
        title="新版本发布"
        content="我们发布了新版本，包含多项改进和新功能。"
        actions={[
          { label: '查看详情', onClick: () => {} },
          { label: '立即更新', onClick: () => {} }
        ]}
      />
      {/* 其他内容 */}
    </div>
  )
}
```

### 高级配置
```tsx
<AnnouncementBanner
  id="announcement-2024-01"
  type="info"
  title="重要通知"
  content="系统将于今晚进行维护，预计持续2小时。"
  expandable={true}
  dismissible={true}
  autoHide={false}
  position="top"
  priority="high"
  expiresAt={new Date('2024-01-31')}
  onDismiss={(id) => console.log('关闭公告:', id)}
  onExpand={(expanded) => console.log('展开状态:', expanded)}
/>
```

### 动态公告
```tsx
// 从API获取公告内容
function DynamicAnnouncement() {
  const [announcements, setAnnouncements] = useState([])
  
  useEffect(() => {
    fetchAnnouncements().then(setAnnouncements)
  }, [])
  
  return (
    <div>
      {announcements.map(announcement => (
        <AnnouncementBanner
          key={announcement.id}
          {...announcement}
        />
      ))}
    </div>
  )
}
```

## 📊 数据结构

### 公告配置
```typescript
interface AnnouncementConfig {
  id: string
  type: 'info' | 'warning' | 'success' | 'error' | 'update'
  title: string
  content: string
  expandedContent?: string
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary'
  }>
  dismissible?: boolean
  expandable?: boolean
  autoHide?: boolean
  autoHideDelay?: number
  priority?: 'low' | 'medium' | 'high'
  expiresAt?: Date
  targetVersion?: string
}
```

## 🎯 使用场景

### 版本更新通知
```tsx
<AnnouncementBanner
  type="update"
  title="Augment AI v2.0 发布"
  content="全新的AI助手体验，更智能的代码分析和更快的响应速度。"
  actions={[
    { label: '查看更新日志', onClick: openChangelog },
    { label: '立即体验', onClick: startTour }
  ]}
/>
```

### 系统维护通知
```tsx
<AnnouncementBanner
  type="warning"
  title="系统维护通知"
  content="系统将于今晚23:00-01:00进行维护升级，期间服务可能中断。"
  dismissible={false}
  autoHide={false}
/>
```

### 新功能介绍
```tsx
<AnnouncementBanner
  type="info"
  title="新功能：智能代码建议"
  content="现在AI可以为您提供更智能的代码建议和优化方案。"
  expandable={true}
  expandedContent="详细了解如何使用智能代码建议功能..."
  actions={[
    { label: '了解更多', onClick: showFeatureGuide }
  ]}
/>
```

## 🔗 相关组件
- [ui/alert](../ui/) - 基础警告组件
- [ui/card](../ui/) - 卡片容器组件
- [ui/button](../ui/) - 操作按钮组件

## 🚀 功能特性
- ✅ 多种公告类型
- ✅ 可展开/收起
- ✅ 可关闭/持久化
- ✅ 自动隐藏
- ✅ 版本检测
- ✅ 响应式设计
- ✅ 动画效果
- ✅ 无障碍支持
