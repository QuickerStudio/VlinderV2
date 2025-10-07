# Fast Editor JSON Parsing Fix

## 问题描述

**错误信息**:
```
[error] [Window] [Extension Host] Error processing tool: pXfjmabrq_KfDMPprMGYw 
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
- fast-editor 工具无法保存已经编辑好的内容
- 调用工具时报错：`Expected array, received string`
- UI 显示验证错误消息
- 工具无法执行

## 根本原因

### Schema 缺少 JSON 解析预处理

**文件**: `extension/src/agent/v1/tools/schema/fast-editor.ts`

**错误代码** (修复前):
```typescript
const fastEditorSchema = z.object({
  edits: z
    .array(fastEditorFileEditSchema)  // ❌ 直接期望数组
    .min(1)
    .describe('Array of file edits to apply...'),
  explanation: z
    .string()
    .optional()
    .describe('Optional explanation...'),
});
```

### 问题分析

#### 1. AI 发送的格式

AI 按照 schema 示例发送 XML：

```xml
<tool name="fast_editor">
  <edits>
    [
      {
        "path": "src/components/Header.tsx",
        "oldString": "import { Button } from './Button'",
        "newString": "import { Button } from '@/components/ui/button'"
      },
      {
        "path": "src/components/Footer.tsx",
        "oldString": "import { Button } from './Button'",
        "newString": "import { Button } from '@/components/ui/button'"
      }
    ]
  </edits>
  <explanation>
  Update all Button imports to use the new centralized UI component path
  </explanation>
</tool>
```

#### 2. Tool-Parser 的处理

Tool-parser 提取 `<edits>` 标签内的内容作为**字符串**：

```typescript
// tool-parser 提取的结果
params.edits = `[
  {
    "path": "src/components/Header.tsx",
    "oldString": "import { Button } from './Button'",
    "newString": "import { Button } from '@/components/ui/button'"
  },
  {
    "path": "src/components/Footer.tsx",
    "oldString": "import { Button } from './Button'",
    "newString": "import { Button } from '@/components/ui/button'"
  }
]`;
```

**类型**: `string`（JSON 格式的字符串）

#### 3. Schema 验证失败

Schema 期望 `edits` 是一个**数组对象**，但收到的是**字符串**：

```typescript
// Schema 期望
edits: Array<{
  path: string;
  oldString: string;
  newString: string;
}>

// 实际收到
edits: string  // '[{"path": "...", ...}]'

// 结果
❌ Validation error: Expected array, received string
```

### 为什么其他工具没有这个问题？

其他类似的工具（`multi_replace_string_in_file`、`fetch_webpage`）使用了 `z.preprocess` 来解析 JSON 字符串：

#### multi_replace_string_in_file (正确实现)

<augment_code_snippet path="extension/src/agent/v1/tools/schema/multi-replace-string.ts" mode="EXCERPT">
```typescript
replacements: z.preprocess((val) => {
  // Try JSON format first
  const trimmed = val.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed;  // ✅ 返回解析后的数组
      }
    } catch (error) {
      // Handle error
    }
  }
  // Fallback to XML format...
}, z.array(...))
```
</augment_code_snippet>

#### fetch_webpage (正确实现)

<augment_code_snippet path="extension/src/agent/v1/tools/schema/fetch-webpage.ts" mode="EXCERPT">
```typescript
urls: z.preprocess((val) => {
  // Try JSON format first
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed;  // ✅ 返回解析后的数组
      }
    } catch (error) {
      // Handle error
    }
  }
  // Fallback to XML format...
}, z.array(z.string().url()))
```
</augment_code_snippet>

#### fast-editor (修复前 - 错误实现)

```typescript
edits: z
  .array(fastEditorFileEditSchema)  // ❌ 没有 preprocess
  .min(1)
```

## 修复方案

### 添加 JSON 解析预处理

**文件**: `extension/src/agent/v1/tools/schema/fast-editor.ts`

**修改内容**:
```typescript
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
      
      // Try JSON format (recommended format: [{"path": "...", "oldString": "...", "newString": "..."}])
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
          console.error('[FastEditor] Received string:', trimmed.substring(0, 200));
          return [];
        }
      }

      console.error('[FastEditor] ❌ String does not start with [, cannot parse');
      console.error('[FastEditor] Received string:', trimmed.substring(0, 200));
      return [];
    }

    console.error('[FastEditor] ❌ edits is neither array nor string, type:', typeof val);
    return [];
  }, z
    .array(fastEditorFileEditSchema)
    .min(1)
    .describe(
      'Array of file edits to apply. Each edit specifies a file path and a string replacement to make in that file.'
    )),
  explanation: z
    .string()
    .optional()
    .describe('Optional explanation of what these edits accomplish together'),
});
```

### 修复逻辑

1. **检查是否已经是数组** - 如果已经是数组，直接返回
2. **检查是否是字符串** - 如果是字符串，尝试解析
3. **检查是否是 JSON 格式** - 如果以 `[` 开头，尝试 JSON.parse
4. **解析成功** - 返回解析后的数组
5. **解析失败** - 返回空数组，触发 `.min(1)` 验证错误
6. **记录日志** - 帮助调试问题

## 修复效果

### 修复前
```
AI 发送 XML → tool-parser 提取字符串 → schema 验证
                                          ↓
                                    edits: string
                                          ↓
                                    ❌ Expected array, received string
                                          ↓
                                    验证失败，工具无法执行
```

### 修复后
```
AI 发送 XML → tool-parser 提取字符串 → z.preprocess 解析
                                          ↓
                                    edits: string '[{...}]'
                                          ↓
                                    JSON.parse(edits)
                                          ↓
                                    edits: Array<{...}>
                                          ↓
                                    ✅ schema 验证通过
                                          ↓
                                    工具正常执行
```

## 测试验证

### 测试场景

1. **正常 JSON 格式** - AI 发送标准 JSON 数组
   - ✅ 应该成功解析
   - ✅ 工具应该正常执行

2. **格式错误** - AI 发送无效 JSON
   - ✅ 应该返回空数组
   - ✅ 触发 `.min(1)` 验证错误
   - ✅ UI 显示友好的错误消息

3. **已经是数组** - 某些情况下已经是数组对象
   - ✅ 应该直接返回
   - ✅ 不进行额外处理

### 预期结果

- ✅ AI 发送的 JSON 字符串被正确解析
- ✅ 验证不再失败
- ✅ 工具可以正常执行文件编辑
- ✅ 与其他工具保持一致的实现模式

## 相关工具对比

### 使用 z.preprocess 的工具（正确）

1. ✅ `multi_replace_string_in_file` - 解析 JSON 或 XML 格式的 replacements
2. ✅ `fetch_webpage` - 解析 JSON 或 XML 格式的 urls
3. ✅ `fast-editor` - 解析 JSON 格式的 edits（修复后）

### 不需要 z.preprocess 的工具

1. `insert_edit_into_file` - 所有字段都是简单类型（string、number）
2. `file_editor` - 所有字段都是简单类型
3. `execute_command` - 所有字段都是简单类型

## 总结

这个问题是由于 **schema 定义不完整** 导致的：

1. **问题**: Schema 直接期望数组，但 tool-parser 提取的是 JSON 字符串
2. **原因**: 缺少 `z.preprocess` 来解析 JSON 字符串
3. **影响**: 工具无法执行，用户无法使用 fast-editor
4. **修复**: 添加 `z.preprocess` 解析逻辑，与其他工具保持一致

修复后：
- ✅ 正确解析 AI 发送的 JSON 字符串
- ✅ 工具可以正常执行
- ✅ 与其他工具保持一致的实现模式
- ✅ 提供详细的日志帮助调试

## 日期
2025-10-06

