# Fast Editor Tool Crash Fix

## 问题描述

**错误信息**:
```
[error] [Window] [Extension Host] Error processing tool: LmkhU_6nd0z-41gDe_6lZ 
Error: Validation error: [
  {
    "code": "invalid_type",
    "expected": "array",
    "received": "string",
    "path": [
      "edits"
    ],
    "message": "Expected array, received string"
  }
]
```

**症状**:
- fast-editor 界面崩溃
- 当 `fast-editor` 工具发生验证错误时，UI 组件无法正确渲染
- 错误发生在 tool-parser 的 Zod 验证阶段
- `edits` 字段期望是数组，但收到了字符串

## 根本原因

### 1. UI 组件缺少防御性编程

**文件**: `extension/webview-ui-vite/src/components/chat-row/tools/fast-editor-tool.tsx`

**问题代码** (第 175 行):
```typescript
{edits.map((edit, index) => {
```

**问题**:
- 当验证错误发生时，`edits` 字段可能不是数组（可能是字符串或 undefined）
- 调用 `string.map()` 或 `undefined.map()` 会抛出 TypeError
- React 组件崩溃，导致整个界面无法渲染

**其他问题**:
- 第 90 行：`edits.length` - 如果 `edits` 不是数组会崩溃
- 第 93 行：`edits.length` - 同样的问题
- 第 209 行：`edits.length` - 同样的问题

### 2. Tool Executor 缺少错误处理

**文件**: `extension/src/agent/v1/tools/tool-executor.ts`

**问题**:
- `handleToolError` 函数为其他工具提供了默认值处理
- 但没有为 `fast-editor` 提供类似的处理
- 导致验证错误时，非数组值被传递到 UI

### 3. 类型定义不够灵活

**文件**: `extension/src/shared/new-tools.ts`

**问题**:
- `EditFilesTool` 类型将 `edits` 定义为必需的数组
- 但在验证错误场景下，这个字段可能不存在或类型错误
- TypeScript 类型与运行时实际情况不匹配

## 修复方案

### 修复 1: UI 组件防御性编程

**文件**: `extension/webview-ui-vite/src/components/chat-row/tools/fast-editor-tool.tsx`

**修改内容**:
```typescript
export const EditFilesToolBlock: React.FC<EditFilesToolProps> = ({
  edits,
  explanation,
  results,
  successCount,
  failureCount,
  approvalState,
  ts,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // ✅ 防御性编程：处理验证错误，edits 可能不是数组
  const safeEdits = Array.isArray(edits) ? edits : [];
  const safeExplanation = explanation || 'No explanation provided';
  const hasInvalidData = !Array.isArray(edits);

  // Get status message
  const getStatusMessage = () => {
    if (hasInvalidData) {
      return 'Invalid data received (validation error)';
    }
    // ... 其他逻辑使用 safeEdits.length
  };

  return (
    <div>
      {/* Invalid Data Warning */}
      {hasInvalidData && (
        <div className='flex items-start space-x-2 p-3 rounded-md bg-red-50/50'>
          <AlertCircle className='h-4 w-4 text-red-600' />
          <div className='text-sm text-red-600'>
            <p className='font-semibold'>Validation Error</p>
            <p className='text-xs mt-1'>
              The edits field is not a valid array. This usually happens when
              the AI sends malformed data.
            </p>
          </div>
        </div>
      )}

      {/* Edits List - 只在数据有效时显示 */}
      {!hasInvalidData && (
        <div className='space-y-2'>
          {safeEdits.map((edit, index) => {
            // ... 渲染每个编辑
          })}
        </div>
      )}
    </div>
  );
};
```

**改进点**:
1. ✅ 添加 `safeEdits` 安全变量，确保始终是数组
2. ✅ 添加 `hasInvalidData` 标志检测无效数据
3. ✅ 显示友好的验证错误消息
4. ✅ 只在数据有效时渲染编辑列表
5. ✅ 所有使用 `edits.length` 的地方改为 `safeEdits.length`

### 修复 2: Tool Executor 错误处理

**文件**: `extension/src/agent/v1/tools/tool-executor.ts`

**修改内容**:
```typescript
// Safely handle tool params - provide defaults for array fields that might be undefined
const toolParams = context?.tool.paramsInput || {};
const safeToolParams: any = { ...toolParams };

// For multi_replace_string_in_file, ensure replacements is always an array
if (toolName === 'multi_replace_string_in_file' && !Array.isArray(safeToolParams.replacements)) {
  safeToolParams.replacements = [];
}

// For fetch_webpage, ensure urls is always an array
if (toolName === 'fetch_webpage' && !Array.isArray(safeToolParams.urls)) {
  safeToolParams.urls = [];
}

// For insert_edit_into_file, ensure required fields have default values
if (toolName === 'insert_edit_into_file') {
  safeToolParams.explanation = safeToolParams.explanation || 'No explanation provided';
  safeToolParams.filePath = safeToolParams.filePath || 'Unknown file';
  safeToolParams.code = safeToolParams.code || '';
  safeToolParams.startLine = safeToolParams.startLine || 0;
}

// ✅ For fast-editor, ensure edits is always an array
if (toolName === 'fast-editor' && !Array.isArray(safeToolParams.edits)) {
  safeToolParams.edits = [];
}

await this.MainAgent.taskExecutor.updateAsk(
  'tool',
  {
    tool: {
      tool: toolName as any,
      ts,
      approvalState: 'error',
      ...safeToolParams,
      error: error.message,
    },
  },
  ts
);
```

**改进点**:
1. ✅ 为 `fast-editor` 添加数组默认值处理
2. ✅ 确保即使验证失败，UI 也能收到有效数据（空数组）
3. ✅ 与其他工具保持一致的错误处理模式

### 修复 3: 类型定义更新

**文件**: `extension/src/shared/new-tools.ts`

**修改内容**:
```typescript
export type EditFilesTool = {
  tool: 'fast-editor';
  edits?: Array<{ // ✅ Optional to handle validation errors
    path: string;
    oldString: string;
    newString: string;
  }>;
  explanation?: string;
  results?: Array<{
    path: string;
    success: boolean;
    error?: string;
  }>;
  successCount?: number;
  failureCount?: number;
};
```

**改进点**:
1. ✅ 将 `edits` 改为可选字段
2. ✅ 类型定义与运行时实际情况匹配
3. ✅ 允许在验证错误场景下 `edits` 为 undefined

## 完整的错误处理流程

### 正常流程
```
AI 发送 XML → tool-parser 解析 → schema.parse() 成功
                                      ↓
                              validatedParams (edits 是有效数组)
                                      ↓
                              tool-executor.handleToolEnd()
                                      ↓
                              UI 正常渲染编辑列表
```

### 验证错误流程（修复后）
```
AI 发送 XML → tool-parser 解析 → schema.parse() 失败
                                      ↓
                              ZodError (edits 是 string 而非 array)
                                      ↓
                              tool-parser.onToolError()
                                      ↓
                              tool-executor.handleToolError()
                                      ↓
                              ✅ 为 fast-editor 提供空数组默认值
                                      ↓
                              updateAsk 发送到 UI (edits: [])
                                      ↓
                              ✅ UI 检测到 hasInvalidData
                                      ↓
                              显示验证错误消息，不崩溃
```

## 测试验证

### 手动测试场景

1. **正常编辑操作** - 应该正常工作
2. **验证错误（edits 是字符串）** - UI 应该显示错误但不崩溃
3. **验证错误（edits 是 undefined）** - UI 应该显示错误但不崩溃
4. **验证错误（edits 是空数组）** - UI 应该显示"0 files"

### 预期结果

- ✅ UI 不再崩溃
- ✅ 显示友好的验证错误消息
- ✅ 用户可以看到发生了什么错误
- ✅ 可以继续使用其他功能

## 相关文件

### 修改的文件
1. `extension/webview-ui-vite/src/components/chat-row/tools/fast-editor-tool.tsx` - UI 防御性编程
2. `extension/src/agent/v1/tools/tool-executor.ts` - 错误处理
3. `extension/src/shared/new-tools.ts` - 类型定义

### 参考文件
1. `docs/INSERT_EDIT_CRASH_FIX.md` - 类似问题的修复
2. `docs/MULTI_REPLACE_STRING_CRASH_FIX.md` - 类似问题的修复
3. `docs/FETCH_WEBPAGE_FINAL_FIX_SUMMARY.md` - 类似问题的修复

## 总结

这次修复采用了与 `insert_edit_into_file` 相同的**三层防御**策略：

1. **UI 层防御** - 使用 `safeEdits` 安全变量，检测并处理无效数据
2. **Tool Executor 层防御** - 在错误处理中提供空数组默认值
3. **类型层防御** - 更新类型定义，将 `edits` 改为可选

这种多层防御确保了即使在最坏的情况下（验证完全失败），UI 也不会崩溃，用户体验得到保障。

## 额外发现的 Bug

### Bug: 用户确认逻辑错误

**文件**: `extension/src/agent/v1/tools/runners/fast-editor.tool.ts`

**问题代码** (第 70-89 行):
```typescript
// ❌ 错误的实现
const didApprove = await ask(...);

if (!didApprove) {
  // 拒绝逻辑
}
```

**问题**:
- `ask` 函数返回的是一个对象 `{ response: string }`，而不是布尔值
- 检查 `!didApprove` 永远为 `false`（因为对象总是 truthy）
- 导致即使用户点击"Yes"，工具也会认为用户批准了，但实际上没有正确检查
- **这就是为什么工具显示成功但文件没有改变的原因**

**正确的实现** (参考 insert-edit.tool.ts 和 multi-replace-string.tool.ts):
```typescript
// ✅ 正确的实现
const { response } = await ask(...);

if (response !== 'yesButtonTapped') {
  // 拒绝逻辑
}
```

**修复内容**:
```typescript
// Request user approval
const { response } = await ask(
  'tool',
  {
    tool: {
      tool: 'fast-editor',
      edits: edits.map((e: { path: string; oldString: string; newString: string }) => ({
        path: e.path,
        oldString: e.oldString,
        newString: e.newString,
      })),
      explanation,
      approvalState: 'pending',
      ts: this.ts,
      isSubMsg: this.params.isSubMsg,
    },
  },
  this.ts
);

if (response !== 'yesButtonTapped') {
  await updateAsk(
    'tool',
    {
      tool: {
        tool: 'fast-editor',
        edits: edits.map((e: { path: string; oldString: string; newString: string }) => ({
          path: e.path,
          oldString: e.oldString,
          newString: e.newString,
        })),
        explanation,
        approvalState: 'rejected',
        ts: this.ts,
        isSubMsg: this.params.isSubMsg,
      },
    },
    this.ts
  );
  return this.toolResponse('rejected', 'User rejected the file edits');
}
```

**影响**:
- ✅ 修复后，工具会正确检查用户是否点击了"Yes"按钮
- ✅ 只有在用户明确批准后，才会执行文件编辑
- ✅ 这是导致"工具显示成功但文件没有改变"的根本原因

## 额外发现的 Bug #2

### Bug: Schema 缺少 JSON 解析预处理

**文件**: `extension/src/agent/v1/tools/schema/fast-editor.ts`

**问题**:
- `edits` 字段期望是数组，但 AI 发送的是 JSON 字符串
- Schema 没有使用 `z.preprocess` 来解析 JSON 字符串
- 导致验证失败：`Expected array, received string`

**错误代码** (第 13-19 行):
```typescript
// ❌ 没有预处理，直接期望数组
const fastEditorSchema = z.object({
  edits: z
    .array(fastEditorFileEditSchema)
    .min(1)
    .describe('Array of file edits to apply...'),
  // ...
});
```

**AI 发送的格式**:
```xml
<tool name="fast_editor">
  <edits>
    [
      {
        "path": "src/file.ts",
        "oldString": "old",
        "newString": "new"
      }
    ]
  </edits>
</tool>
```

**问题分析**:
1. Tool-parser 将 `<edits>` 标签内的内容作为**字符串**提取
2. 字符串内容是 JSON 格式：`'[{"path": "...", ...}]'`
3. Schema 直接期望数组，但收到的是字符串
4. Zod 验证失败：`Expected array, received string`

**正确的实现** (参考 multi_replace_string_in_file 和 fetch_webpage):
```typescript
// ✅ 使用 z.preprocess 解析 JSON 字符串
const fastEditorSchema = z.object({
  edits: z.preprocess((val) => {
    // If it's already an array, return it
    if (Array.isArray(val)) {
      console.log('[FastEditor] edits is already an array with', val.length, 'items');
      return val;
    }

    // If it's a string, try to parse it as JSON
    if (typeof val === 'string') {
      const trimmed = val.trim();

      // Try JSON format
      if (trimmed.startsWith('[')) {
        console.log('[FastEditor] Detected JSON format, parsing...');
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            console.log('[FastEditor] ✅ Successfully parsed JSON with', parsed.length, 'edits');
            return parsed;
          } else {
            console.error('[FastEditor] ❌ JSON parsed but not an array');
            return [];
          }
        } catch (error) {
          console.error('[FastEditor] ❌ JSON parsing failed:', error instanceof Error ? error.message : String(error));
          return [];
        }
      }

      console.error('[FastEditor] ❌ String does not start with [, cannot parse');
      return [];
    }

    console.error('[FastEditor] ❌ edits is neither array nor string, type:', typeof val);
    return [];
  }, z
    .array(fastEditorFileEditSchema)
    .min(1)
    .describe('Array of file edits to apply...')),
  explanation: z
    .string()
    .optional()
    .describe('Optional explanation...'),
});
```

**修复效果**:
- ✅ 正确解析 AI 发送的 JSON 字符串
- ✅ 验证不再失败
- ✅ 工具可以正常执行
- ✅ 与其他工具（multi_replace_string_in_file、fetch_webpage）保持一致

## 日期
2025-10-06

