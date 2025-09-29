# Tab Navbar 标签导航栏组件

应用程序的主要导航组件，提供不同功能模块之间的切换导航。

## 📋 组件清单

| 组件 | 文件 | 描述 |
|------|------|------|
| TabNavbar | `tab-navbar.tsx` | 标签导航栏主组件 |
| NavButton | `nav-button.tsx` | 导航按钮组件 |
| Tooltip | `tooltip.tsx` | 工具提示组件 |

## 🎯 主要功能

### 🧭 导航功能
- **多标签切换** - 在不同功能模块间切换
- **活动状态** - 高亮显示当前活动标签
- **快捷键支持** - 键盘快捷键导航
- **路由集成** - 与路由系统集成

### 🎨 视觉效果
- **图标显示** - 每个标签配有对应图标
- **状态指示** - 显示各模块的状态信息
- **动画过渡** - 平滑的切换动画
- **主题适配** - 支持深色/浅色主题

### 💡 交互体验
- **悬停提示** - 显示详细的功能说明
- **点击反馈** - 清晰的点击反馈效果
- **拖拽排序** - 支持标签顺序调整
- **右键菜单** - 丰富的右键操作

## 🏗️ 架构设计

### 组件结构
```
TabNavbar
├── NavContainer (导航容器)
│   ├── NavButton[] (导航按钮)
│   │   ├── Icon (图标)
│   │   ├── Label (标签)
│   │   └── Badge (状态徽章)
│   └── Tooltip (工具提示)
└── Separator (分隔线)
```

### 导航配置
```typescript
interface NavItem {
  id: string
  label: string
  icon: React.ComponentType
  path: string
  badge?: string | number
  disabled?: boolean
  tooltip?: string
}
```

## 🎯 导航项目

### 主要功能模块
- **💬 聊天** - 主要的AI对话界面
- **📚 历史** - 对话历史记录查看
- **⚙️ 设置** - 应用程序设置配置
- **📊 统计** - 使用统计和分析
- **🔧 工具** - 各种辅助工具

### 状态指示
- **未读消息** - 显示未读消息数量
- **任务进度** - 显示当前任务状态
- **连接状态** - API连接状态指示
- **错误提示** - 错误和警告状态

## 🔧 开发指南

### 基础使用
```tsx
import { TabNavbar } from './tab-navbar'

const navItems = [
  {
    id: 'chat',
    label: '聊天',
    icon: MessageCircle,
    path: '/chat',
    tooltip: '与AI助手对话'
  },
  {
    id: 'history',
    label: '历史',
    icon: History,
    path: '/history',
    badge: 5,
    tooltip: '查看对话历史'
  },
  {
    id: 'settings',
    label: '设置',
    icon: Settings,
    path: '/settings',
    tooltip: '应用程序设置'
  }
]

function App() {
  return (
    <div>
      <TabNavbar
        items={navItems}
        activeId="chat"
        onItemClick={(item) => navigate(item.path)}
      />
      {/* 主要内容区域 */}
    </div>
  )
}
```

### 高级配置
```tsx
<TabNavbar
  items={navItems}
  activeId={activeTab}
  orientation="horizontal"
  variant="pills"
  size="medium"
  showLabels={true}
  showTooltips={true}
  allowReorder={true}
  onItemClick={handleTabClick}
  onItemReorder={handleTabReorder}
  onItemContextMenu={handleContextMenu}
/>
```

### 自定义导航按钮
```tsx
function CustomNavButton({ item, isActive, onClick }: NavButtonProps) {
  return (
    <button
      className={cn(
        "nav-button",
        isActive && "nav-button-active"
      )}
      onClick={() => onClick(item)}
    >
      <item.icon className="w-5 h-5" />
      <span>{item.label}</span>
      {item.badge && (
        <Badge variant="secondary">{item.badge}</Badge>
      )}
    </button>
  )
}
```

### 动态导航项
```tsx
function DynamicNavbar() {
  const [navItems, setNavItems] = useState(defaultNavItems)
  
  // 根据用户权限动态显示导航项
  useEffect(() => {
    const userRole = getCurrentUserRole()
    const filteredItems = defaultNavItems.filter(item => 
      hasPermission(userRole, item.id)
    )
    setNavItems(filteredItems)
  }, [])
  
  return <TabNavbar items={navItems} />
}
```

## 🎨 样式变体

### 布局方向
- **horizontal** - 水平布局 (默认)
- **vertical** - 垂直布局

### 视觉样式
- **tabs** - 标签页样式
- **pills** - 胶囊样式
- **buttons** - 按钮样式
- **minimal** - 极简样式

### 尺寸选项
- **small** - 小尺寸
- **medium** - 中等尺寸 (默认)
- **large** - 大尺寸

## 📱 响应式设计

### 移动端适配
```tsx
// 移动端显示简化版导航
function ResponsiveNavbar() {
  const isMobile = useMediaQuery('(max-width: 768px)')
  
  return (
    <TabNavbar
      items={navItems}
      showLabels={!isMobile}
      size={isMobile ? 'small' : 'medium'}
      orientation={isMobile ? 'horizontal' : 'vertical'}
    />
  )
}
```

### 折叠菜单
```tsx
// 空间不足时显示折叠菜单
function CollapsibleNavbar() {
  const [collapsed, setCollapsed] = useState(false)
  
  return (
    <div className={cn("navbar", collapsed && "navbar-collapsed")}>
      <TabNavbar
        items={navItems}
        showLabels={!collapsed}
        showTooltips={collapsed}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight /> : <ChevronLeft />}
      </Button>
    </div>
  )
}
```

## 🔗 相关组件
- [ui/tabs](../ui/) - 基础标签页组件
- [ui/button](../ui/) - 按钮组件
- [ui/tooltip](../ui/) - 工具提示组件

## 🚀 功能特性
- ✅ 多标签导航
- ✅ 图标和文字
- ✅ 状态徽章
- ✅ 工具提示
- ✅ 键盘导航
- ✅ 拖拽排序
- ✅ 响应式设计
- ✅ 主题支持
- ✅ 动画效果
- ✅ 无障碍支持
