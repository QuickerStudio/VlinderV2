# Multi Replace String 崩溃修复 - 快速参考

## 问题
Multi Replace String 工具导致界面崩溃，变成空白。

## 原因
`replacements` 字段在 XML 解析失败时变成 `undefined`，导致 React 组件崩溃。

## 修复文件

### 1. UI 组件 (chat-tools.tsx)
```typescript
// 添加安全处理
const safeReplacements = Array.isArray(replacements) ? replacements : [];
const hasInvalidData = !Array.isArray(replacements);

// 使用 safeReplacements 替代 replacements
const fileGroups = React.useMemo(() => {
  const groups = new Map<string, typeof safeReplacements>();
  for (const replacement of safeReplacements) {
    // ...
  }
  return groups;
}, [safeReplacements]);
```

### 2. 类型定义 (new-tools.ts)
```typescript
export type MultiReplaceStringTool = {
  tool: 'multi_replace_string_in_file';
  explanation: string;
  replacements?: MultiReplaceStringReplacement[]; // 改为可选
  // ...
};
```

### 3. 错误处理 (tool-executor.ts)
```typescript
// 在 handleToolError 中添加
const safeToolParams = { ...toolParams };
if (toolName === 'multi_replace_string_in_file' && !Array.isArray(safeToolParams.replacements)) {
  safeToolParams.replacements = [];
}
```

### 4. 调试日志 (multi-replace-string.ts)
```typescript
// 添加日志记录
console.log('[MultiReplaceString] Parsing XML:', ...);
console.log(`[MultiReplaceString] Parsed ${replacements.length} replacements`);
```

## 验证

1. 编译: `cd extension && npm run compile`
2. 重新加载扩展 (F5)
3. 测试工具调用
4. 检查界面是否崩溃

## 结果

✅ 界面不再崩溃
✅ 显示友好的错误消息
✅ 用户可以继续操作
✅ 详细的调试日志

## 修改的文件

- `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx`
- `extension/src/shared/new-tools.ts`
- `extension/src/agent/v1/tools/tool-executor.ts`
- `extension/src/agent/v1/tools/schema/multi-replace-string.ts`

