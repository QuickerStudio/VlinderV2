# History View 历史记录视图

历史对话记录的查看和管理组件，提供对话历史的浏览、搜索、分类和管理功能。

## 📋 组件清单

| 组件 | 文件 | 描述 |
|------|------|------|
| HistoryView | `history-view.tsx` | 历史记录主视图组件 |
| HistoryItem | `history-item.tsx` | 单个历史记录项组件 |
| Utils | `utils.tsx` | 历史记录相关工具函数 |

## 🎯 主要功能

### 📚 历史记录管理
- **对话列表** - 显示所有历史对话
- **时间排序** - 按时间顺序组织对话
- **分类标签** - 按主题或类型分类
- **收藏功能** - 标记重要对话

### 🔍 搜索和筛选
- **全文搜索** - 在对话内容中搜索关键词
- **日期筛选** - 按日期范围筛选对话
- **标签筛选** - 按标签分类筛选
- **状态筛选** - 按完成状态筛选

### 📊 数据展示
- **对话摘要** - 显示对话的关键信息
- **统计信息** - 对话数量、时长等统计
- **进度指示** - 任务完成进度显示
- **缩略图预览** - 对话内容的快速预览

### 🔧 操作功能
- **删除对话** - 删除不需要的历史记录
- **导出对话** - 导出对话为文件
- **复制内容** - 复制对话内容
- **恢复对话** - 从历史记录恢复对话

## 🏗️ 架构设计

### 组件结构
```
HistoryView
├── SearchBar (搜索栏)
├── FilterPanel (筛选面板)
│   ├── DateFilter (日期筛选)
│   ├── TagFilter (标签筛选)
│   └── StatusFilter (状态筛选)
├── HistoryList (历史列表)
│   └── HistoryItem[] (历史项)
│       ├── ItemHeader (项头部)
│       ├── ItemPreview (预览)
│       └── ItemActions (操作按钮)
└── Pagination (分页)
```

### 数据流
```
历史数据 → 筛选处理 → 排序 → 分页 → 渲染显示
```

## 🎨 用户体验

### 视觉设计
- **卡片布局** - 清晰的卡片式布局
- **状态指示** - 不同状态的视觉区分
- **加载状态** - 优雅的加载动画
- **空状态** - 友好的空状态提示

### 交互设计
- **快速预览** - 悬停显示详细信息
- **批量操作** - 支持多选批量操作
- **拖拽排序** - 拖拽调整顺序
- **右键菜单** - 丰富的右键操作

### 性能优化
- **虚拟滚动** - 大量数据的性能优化
- **懒加载** - 按需加载历史内容
- **缓存机制** - 智能缓存策略

## 🔧 开发指南

### 添加新的筛选条件
```tsx
// 扩展筛选器
interface FilterOptions {
  dateRange?: [Date, Date]
  tags?: string[]
  status?: 'completed' | 'pending' | 'failed'
  // 新增筛选条件
  priority?: 'high' | 'medium' | 'low'
}

function PriorityFilter({ value, onChange }: FilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectItem value="high">高优先级</SelectItem>
      <SelectItem value="medium">中优先级</SelectItem>
      <SelectItem value="low">低优先级</SelectItem>
    </Select>
  )
}
```

### 自定义历史项显示
```tsx
// 自定义历史项组件
function CustomHistoryItem({ item }: { item: HistoryItem }) {
  return (
    <Card className="history-item">
      <CardHeader>
        <div className="flex justify-between">
          <h3>{item.title}</h3>
          <Badge variant={item.status}>{item.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p>{item.summary}</p>
        <div className="flex justify-between mt-4">
          <span>{formatDate(item.createdAt)}</span>
          <HistoryItemActions item={item} />
        </div>
      </CardContent>
    </Card>
  )
}
```

### 搜索功能扩展
```tsx
// 高级搜索功能
function AdvancedSearch() {
  const [searchOptions, setSearchOptions] = useState({
    query: '',
    searchIn: ['title', 'content'],
    caseSensitive: false,
    useRegex: false
  })
  
  return (
    <div className="advanced-search">
      <Input 
        placeholder="搜索关键词..."
        value={searchOptions.query}
        onChange={(e) => setSearchOptions(prev => ({
          ...prev,
          query: e.target.value
        }))}
      />
      {/* 搜索选项 */}
    </div>
  )
}
```

## 📊 数据结构

### 历史记录项
```typescript
interface HistoryItem {
  id: string
  title: string
  summary: string
  content: string
  createdAt: Date
  updatedAt: Date
  status: 'completed' | 'pending' | 'failed'
  tags: string[]
  messageCount: number
  duration?: number
  isFavorite: boolean
}
```

### 筛选选项
```typescript
interface FilterOptions {
  dateRange?: [Date, Date]
  tags?: string[]
  status?: string[]
  searchQuery?: string
  sortBy: 'date' | 'title' | 'status'
  sortOrder: 'asc' | 'desc'
}
```

## 🔗 相关组件
- [history-preview/](../history-preview/) - 历史记录预览
- [chat-view/](../chat-view/) - 聊天界面
- [ui/](../ui/) - 基础UI组件

## 📈 功能路线图
- [ ] 高级搜索功能
- [ ] 对话分析统计
- [ ] 智能分类建议
- [ ] 云端同步支持
- [ ] 导出多种格式
- [ ] 对话合并功能
