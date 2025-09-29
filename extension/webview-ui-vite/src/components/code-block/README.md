# Code Block 代码块组件

专门用于显示和处理代码内容的组件，提供语法高亮、代码复制、格式化等功能。

## 📋 组件清单

| 组件 | 文件 | 描述 |
|------|------|------|
| CodeBlock | `code-block.tsx` | 代码块主组件 |
| Utils | `utils.ts` | 代码处理相关工具函数 |

## 🎯 主要功能

### 🎨 语法高亮
- **多语言支持** - 支持100+编程语言
- **主题切换** - 多种代码高亮主题
- **自动检测** - 自动检测代码语言类型
- **自定义样式** - 可自定义高亮颜色方案

### 📋 代码操作
- **一键复制** - 快速复制代码到剪贴板
- **格式化** - 自动格式化代码结构
- **行号显示** - 可选的行号显示
- **代码折叠** - 长代码的折叠展开功能

### 🔍 代码分析
- **错误检测** - 基础的语法错误检测
- **关键词高亮** - 特殊关键词的突出显示
- **注释处理** - 注释内容的特殊样式
- **字符串识别** - 字符串内容的区分显示

### 🎛️ 交互功能
- **选择复制** - 选择特定行进行复制
- **搜索功能** - 在代码中搜索关键词
- **缩放控制** - 调整代码字体大小
- **全屏查看** - 全屏模式查看代码

## 🏗️ 架构设计

### 组件结构
```
CodeBlock
├── Header (头部)
│   ├── LanguageLabel (语言标签)
│   ├── CopyButton (复制按钮)
│   └── MoreActions (更多操作)
├── Content (内容区域)
│   ├── LineNumbers (行号)
│   ├── SyntaxHighlighter (语法高亮)
│   └── SelectionHandler (选择处理)
└── Footer (底部)
    ├── StatusInfo (状态信息)
    └── ActionButtons (操作按钮)
```

### 语法高亮引擎
- 基于 `react-syntax-highlighter`
- 支持 Prism.js 和 highlight.js
- 自定义语法规则扩展

## 🎨 支持的语言

### 主流编程语言
- **JavaScript/TypeScript** - 完整支持
- **Python** - 完整支持
- **Java** - 完整支持
- **C/C++** - 完整支持
- **C#** - 完整支持
- **Go** - 完整支持
- **Rust** - 完整支持
- **PHP** - 完整支持

### 标记语言
- **HTML** - 完整支持
- **CSS/SCSS** - 完整支持
- **Markdown** - 完整支持
- **XML** - 完整支持
- **JSON** - 完整支持
- **YAML** - 完整支持

### 脚本语言
- **Bash/Shell** - 完整支持
- **PowerShell** - 完整支持
- **SQL** - 完整支持
- **Docker** - 完整支持

## 🎨 主题支持

### 内置主题
- **VS Code Dark** - 深色主题
- **VS Code Light** - 浅色主题
- **GitHub** - GitHub风格
- **Monokai** - 经典深色
- **Solarized** - 护眼主题
- **Dracula** - 流行深色主题

### 自定义主题
```css
.code-block-custom {
  --code-bg: #1e1e1e;
  --code-fg: #d4d4d4;
  --code-keyword: #569cd6;
  --code-string: #ce9178;
  --code-comment: #6a9955;
  --code-number: #b5cea8;
}
```

## 🔧 开发指南

### 基础使用
```tsx
import { CodeBlock } from './code-block'

function Example() {
  const code = `
function hello(name: string) {
  console.log(\`Hello, \${name}!\`)
}
  `
  
  return (
    <CodeBlock
      language="typescript"
      code={code}
      showLineNumbers={true}
      theme="vscode-dark"
    />
  )
}
```

### 高级配置
```tsx
<CodeBlock
  language="python"
  code={pythonCode}
  showLineNumbers={true}
  showCopyButton={true}
  showLanguageLabel={true}
  enableSearch={true}
  enableFolding={true}
  maxHeight="400px"
  theme="github"
  onCopy={(code) => console.log('复制了代码:', code)}
  onLanguageDetect={(lang) => console.log('检测到语言:', lang)}
/>
```

### 自定义语言支持
```tsx
// 添加新的语言定义
const customLanguage = {
  name: 'mylang',
  aliases: ['ml'],
  keywords: ['func', 'var', 'if', 'else'],
  operators: ['+', '-', '*', '/', '='],
  strings: ['"', "'"],
  comments: ['//', '/*', '*/']
}

// 注册自定义语言
registerLanguage('mylang', customLanguage)
```

### 扩展功能
```tsx
// 添加自定义操作按钮
function CustomCodeBlock({ code, language }: CodeBlockProps) {
  const handleFormat = () => {
    // 格式化代码逻辑
  }
  
  const handleAnalyze = () => {
    // 代码分析逻辑
  }
  
  return (
    <CodeBlock
      code={code}
      language={language}
      customActions={[
        { label: '格式化', onClick: handleFormat },
        { label: '分析', onClick: handleAnalyze }
      ]}
    />
  )
}
```

## 📊 性能优化

### 大文件处理
- **虚拟滚动** - 处理大型代码文件
- **懒加载** - 按需加载语法高亮
- **缓存机制** - 缓存高亮结果
- **分块渲染** - 分块渲染大型代码

### 内存管理
- **组件卸载** - 及时清理资源
- **事件监听** - 正确移除事件监听器
- **语法缓存** - 智能缓存语法规则

## 🎯 使用场景

### 聊天消息中的代码
```tsx
// 在聊天消息中显示代码
function ChatMessage({ message }: { message: Message }) {
  if (message.type === 'code') {
    return (
      <CodeBlock
        code={message.content}
        language={message.language}
        compact={true}
        showCopyButton={true}
      />
    )
  }
  // 其他消息类型...
}
```

### 文档中的代码示例
```tsx
// 在文档中显示代码示例
function DocumentationCode({ example }: { example: CodeExample }) {
  return (
    <div className="code-example">
      <h3>{example.title}</h3>
      <CodeBlock
        code={example.code}
        language={example.language}
        showLineNumbers={true}
        showLanguageLabel={true}
      />
      <p>{example.description}</p>
    </div>
  )
}
```

## 🔗 相关组件
- [chat-row/](../chat-row/) - 聊天消息中的代码显示
- [prompt-editor/](../prompt-editor/) - 编辑器中的代码高亮
- [ui/](../ui/) - 基础UI组件

## 🚀 功能特性
- ✅ 100+ 语言支持
- ✅ 多主题切换
- ✅ 一键复制
- ✅ 行号显示
- ✅ 搜索功能
- ✅ 代码折叠
- ✅ 自动检测语言
- ✅ 性能优化
- ✅ 响应式设计
- ✅ 无障碍支持
