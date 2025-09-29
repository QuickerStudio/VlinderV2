# UI 基础组件库

基于 Radix UI 和 shadcn/ui 构建的基础UI组件库，提供统一的设计系统和用户体验。

## 📋 组件清单

### 🔘 表单组件
| 组件 | 文件 | 描述 |
|------|------|------|
| Button | `button.tsx` | 按钮组件，支持多种样式变体和尺寸 |
| Input | `input.tsx` | 文本输入框，支持各种输入类型 |
| Textarea | `textarea.tsx` | 多行文本输入区域 |
| Checkbox | `checkbox.tsx` | 复选框，支持选中/未选中/不确定状态 |
| Switch | `switch.tsx` | 开关切换组件 |
| RadioGroup | `radio-group.tsx` | 单选按钮组 |
| Select | `select.tsx` | 下拉选择器 |
| Slider | `slider.tsx` | 滑块输入组件 |
| RangeInput | `range-input.tsx` | 范围输入组件 |
| InputOtp | `input-otp.tsx` | 一次性密码输入组件 |
| AutosizeTextarea | `autosize-textarea.tsx` | 自适应高度的文本域 |

### 🗂️ 布局组件
| 组件 | 文件 | 描述 |
|------|------|------|
| Card | `card.tsx` | 卡片容器，包含头部、内容、底部 |
| Separator | `separator.tsx` | 分隔线组件 |
| AspectRatio | `aspect-ratio.tsx` | 宽高比容器 |
| Resizable | `resizable.tsx` | 可调整大小的面板 |
| ScrollArea | `scroll-area.tsx` | 自定义滚动区域 |

### 🎛️ 导航组件
| 组件 | 文件 | 描述 |
|------|------|------|
| Tabs | `tabs.tsx` | 标签页组件 |
| NavigationMenu | `navigation-menu.tsx` | 导航菜单 |
| Breadcrumb | `breadcrumb.tsx` | 面包屑导航 |
| Pagination | `pagination.tsx` | 分页组件 |
| Menubar | `menubar.tsx` | 菜单栏 |

### 💬 交互组件
| 组件 | 文件 | 描述 |
|------|------|------|
| Dialog | `dialog.tsx` | 模态对话框 |
| AlertDialog | `alert-dialog.tsx` | 警告对话框 |
| Sheet | `sheet.tsx` | 侧边抽屉 |
| Drawer | `drawer.tsx` | 底部抽屉 |
| Popover | `popover.tsx` | 弹出层 |
| HoverCard | `hover-card.tsx` | 悬停卡片 |
| Tooltip | `tooltip.tsx` | 工具提示 |
| ContextMenu | `context-menu.tsx` | 右键菜单 |
| DropdownMenu | `dropdown-menu.tsx` | 下拉菜单 |

### 📊 数据展示
| 组件 | 文件 | 描述 |
|------|------|------|
| Table | `table.tsx` | 表格组件 |
| Badge | `badge.tsx` | 徽章标签 |
| Avatar | `avatar.tsx` | 头像组件 |
| Progress | `progress.tsx` | 进度条 |
| Skeleton | `skeleton.tsx` | 骨架屏加载 |
| Chart | `chart.tsx` | 图表组件 |

### 🎨 视觉组件
| 组件 | 文件 | 描述 |
|------|------|------|
| Alert | `alert.tsx` | 警告提示 |
| BorderBeam | `border-beam.tsx` | 边框光效动画 |
| Calendar | `calendar.tsx` | 日历组件 |
| Carousel | `carousel.tsx` | 轮播图组件 |

### 🔧 工具组件
| 组件 | 文件 | 描述 |
|------|------|------|
| Command | `command.tsx` | 命令面板 |
| Collapsible | `collapsible.tsx` | 可折叠容器 |
| Accordion | `accordion.tsx` | 手风琴折叠面板 |
| Toggle | `toggle.tsx` | 切换按钮 |
| ToggleGroup | `toggle-group.tsx` | 切换按钮组 |
| Label | `label.tsx` | 标签组件 |
| Form | `form.tsx` | 表单容器和验证 |

### 🌐 特殊组件
| 组件 | 文件 | 描述 |
|------|------|------|
| FileTree | `file-tree.tsx` | 文件树组件 |
| TreeViewApi | `tree-view-api.tsx` | 树形视图API |
| Toast | `toast.tsx` | 消息提示 |
| Toaster | `toaster.tsx` | 消息提示容器 |
| Sonner | `sonner.tsx` | 高级消息提示 |

## 🎨 设计系统

### 颜色主题
- **Primary** - 主要品牌色
- **Secondary** - 次要色彩
- **Destructive** - 危险操作色
- **Muted** - 静音/禁用色
- **Accent** - 强调色

### 尺寸规范
- **sm** - 小尺寸 (适用于紧凑布局)
- **default** - 默认尺寸 (常规使用)
- **lg** - 大尺寸 (重要操作)
- **icon** - 图标尺寸 (正方形按钮)

### 样式变体
- **default** - 默认样式
- **outline** - 轮廓样式
- **ghost** - 幽灵样式 (透明背景)
- **link** - 链接样式

## 🚀 使用示例

### 基础表单
```tsx
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { Card, CardContent, CardHeader, CardTitle } from './card'

function LoginForm() {
  return (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>登录</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="email">邮箱</Label>
          <Input id="email" type="email" placeholder="输入邮箱" />
        </div>
        <div>
          <Label htmlFor="password">密码</Label>
          <Input id="password" type="password" placeholder="输入密码" />
        </div>
        <Button className="w-full">登录</Button>
      </CardContent>
    </Card>
  )
}
```

### 数据展示
```tsx
import { Badge } from './badge'
import { Avatar, AvatarImage, AvatarFallback } from './avatar'
import { Progress } from './progress'

function UserProfile() {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Avatar>
          <AvatarImage src="/avatar.jpg" />
          <AvatarFallback>用户</AvatarFallback>
        </Avatar>
        <div>
          <h3>用户名</h3>
          <Badge variant="secondary">活跃用户</Badge>
        </div>
      </div>
      <div>
        <p>完成度</p>
        <Progress value={75} />
      </div>
    </div>
  )
}
```

## 🔧 开发指南

### 组件开发规范
1. 使用 `React.forwardRef` 支持 ref 传递
2. 继承原生HTML属性接口
3. 使用 `cn()` 函数合并className
4. 支持 `asChild` 模式 (适用时)
5. 提供完整的TypeScript类型

### 样式约定
- 使用Tailwind CSS类名
- 支持深色模式变量
- 遵循设计系统规范
- 保持组件样式一致性

### 可访问性
- 支持键盘导航
- 提供ARIA属性
- 兼容屏幕阅读器
- 符合WCAG标准
