# Fast Editor Tool - 快速参考指南

## 🚀 快速开始

### 基本用法

```tsx
import { FastEditorToolBlock } from '@/components/chat-row/tools/fast-editor-tool';

<FastEditorToolBlock
  edits={[
    {
      path: 'src/file.tsx',
      oldString: 'old code',
      newString: 'new code'
    }
  ]}
  explanation="Why we're making these changes"
  approvalState="pending"
  ts={Date.now()}
/>
```

## 📋 Props 接口

```typescript
interface FastEditorToolProps {
  // 必需的 props
  edits: Array<{
    path: string;        // 文件路径
    oldString: string;   // 要查找的字符串
    newString: string;   // 替换的字符串
  }>;
  ts: number;           // 时间戳

  // 可选的 props
  explanation?: string;  // 编辑说明
  approvalState?: 'pending' | 'loading' | 'approved' | 'error' | 'rejected';
  results?: Array<{
    path: string;
    success: boolean;
    error?: string;
  }>;
  successCount?: number;
  failureCount?: number;
}
```

## 🎨 状态说明

### Pending（待审批）
```tsx
<FastEditorToolBlock
  edits={edits}
  approvalState="pending"
  ts={Date.now()}
/>
```
- 黄色边框
- 显示"Awaiting approval"
- 等待用户确认

### Loading（执行中）
```tsx
<FastEditorToolBlock
  edits={edits}
  approvalState="loading"
  ts={Date.now()}
/>
```
- 蓝色边框
- 显示加载动画
- 显示"Applying edits..."

### Approved（成功）
```tsx
<FastEditorToolBlock
  edits={edits}
  approvalState="approved"
  results={[
    { path: 'file1.tsx', success: true },
    { path: 'file2.tsx', success: true }
  ]}
  successCount={2}
  failureCount={0}
  ts={Date.now()}
/>
```
- 绿色边框
- 显示成功徽章
- 显示"Successfully edited X files"

### Error（失败）
```tsx
<FastEditorToolBlock
  edits={edits}
  approvalState="error"
  results={[
    { 
      path: 'file1.tsx', 
      success: false, 
      error: 'File not found' 
    }
  ]}
  successCount={0}
  failureCount={1}
  ts={Date.now()}
/>
```
- 红色边框
- 显示失败徽章
- 显示错误信息

### Rejected（拒绝）
```tsx
<FastEditorToolBlock
  edits={edits}
  approvalState="rejected"
  ts={Date.now()}
/>
```
- 红色边框
- 显示"Rejected by user"

## 💡 使用技巧

### 1. 添加说明文本
```tsx
<FastEditorToolBlock
  edits={edits}
  explanation="Update all imports to use the new path alias @/components"
  approvalState="pending"
  ts={Date.now()}
/>
```

### 2. 处理多个文件
```tsx
<FastEditorToolBlock
  edits={[
    {
      path: 'src/components/Header.tsx',
      oldString: "import { Button } from './Button'",
      newString: "import { Button } from '@/components/ui/button'"
    },
    {
      path: 'src/components/Footer.tsx',
      oldString: "import { Button } from './Button'",
      newString: "import { Button } from '@/components/ui/button'"
    },
    {
      path: 'src/pages/Home.tsx',
      oldString: "import { Button } from '../components/Button'",
      newString: "import { Button } from '@/components/ui/button'"
    }
  ]}
  explanation="Centralize Button component imports"
  approvalState="pending"
  ts={Date.now()}
/>
```

### 3. 显示执行结果
```tsx
<FastEditorToolBlock
  edits={edits}
  approvalState="approved"
  results={[
    { path: 'src/components/Header.tsx', success: true },
    { path: 'src/components/Footer.tsx', success: true },
    { 
      path: 'src/pages/Home.tsx', 
      success: false, 
      error: 'String not found in file' 
    }
  ]}
  successCount={2}
  failureCount={1}
  ts={Date.now()}
/>
```

## 🎯 交互功能

### 1. 展开/折叠整个工具块
- 点击顶部标题栏
- 显示/隐藏所有内容

### 2. 展开/折叠单个编辑项
- 点击编辑项的头部
- 显示/隐藏该编辑项的详细内容
- 默认所有编辑项都是折叠的

### 3. 复制代码
- 点击"Find"或"Replace With"旁边的复制按钮
- 代码会被复制到剪贴板
- 按钮会显示"Copied"确认（2秒）

### 4. 查看完整路径
- 鼠标悬停在文件路径上
- 显示完整的文件路径（如果被截断）

## 🎨 自定义样式

### 颜色主题
组件自动支持深色/浅色模式，无需额外配置。

### 浅色模式
- Find: 红色背景 `bg-red-50`
- Replace: 绿色背景 `bg-green-50`
- Explanation: 蓝色背景 `bg-blue-50`

### 深色模式
- Find: 深红色背景 `bg-red-950/30`
- Replace: 深绿色背景 `bg-green-950/30`
- Explanation: 深蓝色背景 `bg-blue-950/20`

## 🔍 常见场景

### 场景 1: 更新导入路径
```tsx
<FastEditorToolBlock
  edits={[
    {
      path: 'src/utils/helper.ts',
      oldString: "import { config } from '../config'",
      newString: "import { config } from '@/config'"
    }
  ]}
  explanation="Update import to use path alias"
  approvalState="pending"
  ts={Date.now()}
/>
```

### 场景 2: 批量重命名
```tsx
<FastEditorToolBlock
  edits={[
    {
      path: 'src/components/Button.tsx',
      oldString: 'className="btn"',
      newString: 'className="button"'
    },
    {
      path: 'src/components/Input.tsx',
      oldString: 'className="btn"',
      newString: 'className="button"'
    }
  ]}
  explanation="Rename CSS class from 'btn' to 'button'"
  approvalState="pending"
  ts={Date.now()}
/>
```

### 场景 3: 更新版本号
```tsx
<FastEditorToolBlock
  edits={[
    {
      path: 'package.json',
      oldString: '"version": "1.0.0"',
      newString: '"version": "1.1.0"'
    },
    {
      path: 'README.md',
      oldString: 'Version 1.0.0',
      newString: 'Version 1.1.0'
    }
  ]}
  explanation="Bump version to 1.1.0"
  approvalState="pending"
  ts={Date.now()}
/>
```

### 场景 4: 修复拼写错误
```tsx
<FastEditorToolBlock
  edits={[
    {
      path: 'src/utils/validation.ts',
      oldString: 'function validateEamil',
      newString: 'function validateEmail'
    },
    {
      path: 'src/types/user.ts',
      oldString: 'eamil: string',
      newString: 'email: string'
    }
  ]}
  explanation="Fix typo: 'eamil' -> 'email'"
  approvalState="pending"
  ts={Date.now()}
/>
```

## ⚠️ 注意事项

### 1. 字符串匹配
- `oldString` 必须完全匹配文件中的内容
- 包括空格、缩进、换行符等
- 区分大小写

### 2. 文件路径
- 使用相对于项目根目录的路径
- 使用正斜杠 `/` 而不是反斜杠 `\`
- 例如：`src/components/Button.tsx`

### 3. 长文本处理
- 超过 150 字符的文本会被截断
- 点击展开编辑项可查看完整内容
- 使用复制按钮复制完整文本

### 4. 错误处理
- 如果 `edits` 不是数组，会显示验证错误
- 组件会安全地处理无效数据
- 不会导致应用崩溃

## 🐛 故障排除

### 问题 1: 编辑项不显示
**原因**：`edits` 为空或未定义  
**解决**：确保传入有效的 `edits` 数组

### 问题 2: 复制功能不工作
**原因**：浏览器不支持 Clipboard API  
**解决**：使用现代浏览器（Chrome, Firefox, Edge）

### 问题 3: 样式显示异常
**原因**：Tailwind CSS 未正确加载  
**解决**：检查 Tailwind 配置和构建过程

### 问题 4: 深色模式颜色不对
**原因**：主题提供者未正确配置  
**解决**：确保使用了 `next-themes` 或类似的主题提供者

## 📚 相关资源

- [详细改进说明](./FAST_EDITOR_UI_IMPROVEMENTS.md)
- [视觉对比文档](./FAST_EDITOR_VISUAL_COMPARISON.md)
- [优化总结](./FAST_EDITOR_OPTIMIZATION_SUMMARY.md)

## 🎉 最佳实践

1. **提供清晰的说明**：使用 `explanation` 解释为什么要进行这些编辑
2. **合理分组**：将相关的编辑放在一起
3. **处理错误**：始终检查 `results` 并处理失败情况
4. **用户反馈**：使用适当的 `approvalState` 提供清晰的状态反馈
5. **测试边界情况**：测试空字符串、特殊字符、超长文本等

---

**最后更新**：2025-10-07  
**版本**：2.0（优化版）

