# Icon 图标组件

统一的图标组件，提供一致的图标显示和管理。

## 📋 组件清单

| 组件 | 文件 | 描述 |
|------|------|------|
| Icon | `icon.tsx` | 图标主组件 |

## 🎯 主要功能

### 🎨 图标显示
- **多种图标库** - 支持Lucide、Heroicons等图标库
- **尺寸控制** - 灵活的尺寸调整
- **颜色主题** - 支持主题色彩系统
- **状态变体** - 不同状态的图标样式

### 🔧 功能特性
- **懒加载** - 按需加载图标资源
- **缓存机制** - 智能缓存常用图标
- **SVG优化** - 优化的SVG渲染
- **无障碍** - 完整的可访问性支持

## 🔧 开发指南

### 基础使用
```tsx
import { Icon } from './icon'

function Example() {
  return (
    <div>
      <Icon name="heart" size="md" />
      <Icon name="star" size="lg" color="yellow" />
      <Icon name="settings" size="sm" variant="outline" />
    </div>
  )
}
```

### 支持的图标
- **UI图标** - 常用界面图标
- **操作图标** - 操作相关图标
- **状态图标** - 状态指示图标
- **品牌图标** - 品牌和社交图标

## 🔗 相关组件
- [ui/button](../ui/) - 按钮中的图标使用
- [tab-navbar/](../tab-navbar/) - 导航中的图标使用
