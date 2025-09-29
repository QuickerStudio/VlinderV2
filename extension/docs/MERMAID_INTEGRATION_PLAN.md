# Mermaid 集成到空白面板方案

## 技术栈选择
- **Mermaid**: 直接 npm 包集成 (`mermaid`)
- **构建工具**: Vite (保持与插件统一)
- **编辑器**: 原生 textarea 或集成现有的 Monaco Editor
- **集成位置**: 现有的空白面板 (`book-panel.tsx`)

## 成员名设计原则
基于项目现有命名规范，尽量使用原生成员名：

### 新增成员名 (必要时创建)
- `mermaidCode` - 图表代码内容
- `renderedDiagram` - 渲染后的 SVG
- `diagramError` - 渲染错误信息
- `isRendering` - 渲染状态
- `diagramTheme` - 图表主题 (跟随 VSCode 主题)

### 复用现有成员名
- `isOpen` - 面板开关状态 (已存在)
- `onClose` - 关闭回调 (已存在)
- `className` - 样式类名 (已存在)

## 实现方案

### 1. 依赖安装
```bash
npm install mermaid
npm install @types/mermaid --save-dev
```

### 2. 组件结构设计
```
BookPanel
├── Header (标题 + 关闭按钮)
├── Editor Section (代码编辑区)
│   ├── Textarea/Monaco Editor
│   └── Render Button
├── Preview Section (图表预览区)
│   ├── SVG 渲染区域
│   └── Error Display
└── Footer (可选：导出/复制功能)
```

### 3. 状态管理
```typescript
// 使用 useState 管理本地状态
const [mermaidCode, setMermaidCode] = useState('')
const [renderedDiagram, setRenderedDiagram] = useState('')
const [diagramError, setDiagramError] = useState('')
const [isRendering, setIsRendering] = useState(false)
```

### 4. Mermaid 配置
```typescript
// 初始化配置，适配 VSCode 主题
mermaid.initialize({
  startOnLoad: false,
  theme: vscodeTheme === 'dark' ? 'dark' : 'default',
  securityLevel: 'loose', // VSCode webview 需要
  fontFamily: 'var(--vscode-font-family)',
})
```

### 5. 核心功能实现

#### 渲染函数
```typescript
const renderDiagram = async () => {
  if (!mermaidCode.trim()) return
  
  setIsRendering(true)
  setDiagramError('')
  
  try {
    const { svg } = await mermaid.render('mermaid-diagram', mermaidCode)
    setRenderedDiagram(svg)
  } catch (error) {
    setDiagramError(error.message)
    setRenderedDiagram('')
  } finally {
    setIsRendering(false)
  }
}
```

#### 主题适配
```typescript
// 监听 VSCode 主题变化
useEffect(() => {
  mermaid.initialize({
    theme: vscodeTheme === 'dark' ? 'dark' : 'default'
  })
  if (renderedDiagram) {
    renderDiagram() // 重新渲染以应用新主题
  }
}, [vscodeTheme])
```

### 6. UI 布局设计
```typescript
// 分割布局：上半部分编辑，下半部分预览
<div className="flex flex-col h-full">
  {/* 编辑区 - 固定高度 */}
  <div className="h-1/2 border-b">
    <textarea 
      value={mermaidCode}
      onChange={(e) => setMermaidCode(e.target.value)}
      className="w-full h-full p-4 resize-none"
      placeholder="输入 Mermaid 图表代码..."
    />
  </div>
  
  {/* 预览区 - 剩余空间 */}
  <div className="flex-1 overflow-auto p-4">
    {renderedDiagram && (
      <div dangerouslySetInnerHTML={{ __html: renderedDiagram }} />
    )}
  </div>
</div>
```

### 7. 错误处理
- 语法错误显示
- 渲染失败提示
- 空内容处理
- CSP 兼容性处理

### 8. 性能优化
- 防抖渲染 (debounce)
- 大图表懒加载
- SVG 缓存机制

### 9. 扩展功能 (可选)
- 导出 SVG/PNG
- 复制到剪贴板
- 预设模板
- 实时预览 (输入时自动渲染)

## 文件修改清单

### 需要修改的文件
1. `webview-ui-vite/package.json` - 添加 mermaid 依赖
2. `webview-ui-vite/src/components/book-panel/book-panel.tsx` - 主要实现
3. `webview-ui-vite/vite.config.ts` - 可能需要 CSP 配置

### 新增文件 (如果需要)
1. `webview-ui-vite/src/hooks/use-mermaid.tsx` - Mermaid 相关逻辑封装
2. `webview-ui-vite/src/utils/mermaid-config.ts` - Mermaid 配置管理

## 实现步骤
1. 安装依赖包
2. 修改 book-panel.tsx 基础结构
3. 集成 Mermaid 渲染逻辑
4. 添加错误处理和状态管理
5. 优化 UI 和用户体验
6. 测试和调试

## 技术考虑
- **CSP 兼容**: VSCode webview 的内容安全策略
- **主题适配**: 自动跟随 VSCode 主题切换
- **性能**: 大型图表的渲染性能
- **可访问性**: 键盘导航和屏幕阅读器支持

这个方案保持了与现有项目的一致性，使用原生成员名，并充分利用了空白面板的设计。你觉得哪些地方需要调整？
