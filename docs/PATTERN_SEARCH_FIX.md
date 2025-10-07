# Pattern Search Tool Fix

## 问题描述

**错误信息**:
```
[error] [Window] [Extension Host] Error processing tool: zb_S8dE5DxPWGxl1xZNb1 
Error: Validation error: [
  {
    "code": "invalid_type",
    "expected": "array",
    "received": "string",
    "path": ["files"],
    "message": "Expected array, received string"
  },
  {
    "code": "invalid_type",
    "expected": "boolean",
    "received": "string",
    "path": ["caseSensitive"],
    "message": "Expected boolean, received string"
  }
]
```

**症状**:
- pattern-search 工具导致界面崩溃
- 两个验证错误：
  1. `files` 字段期望数组，收到字符串
  2. `caseSensitive` 字段期望布尔值，收到字符串

## 根本原因

### 问题 1: files 字段缺少 JSON 解析

**AI 发送的格式**:
```xml
<tool name="pattern_search">
  <searchPattern>TODO</searchPattern>
  <files>["src/components/Button.tsx"]</files>
  <caseSensitive>true</caseSensitive>
</tool>
```

**Tool-Parser 提取的结果**:
```javascript
{
  searchPattern: "TODO",
  files: '["src/components/Button.tsx"]',  // ❌ 字符串
  caseSensitive: "true"                     // ❌ 字符串
}
```

**Schema 期望的类型**:
```typescript
{
  searchPattern: string,
  files: string[],      // ❌ 期望数组
  caseSensitive: boolean // ❌ 期望布尔值
}
```

### 问题 2: 职责不明确

在修复过程中发现代码库存在职责不明确的问题：
- Tool-Parser 中有 `preprocessMultiReplaceStringParams` 函数，但实际上只是检查格式
- Schema 中使用 `z.preprocess` 做 JSON/XML 解析
- 两者职责重叠，导致混乱

## 修复方案

### 方案：统一职责划分

#### Tool-Parser 职责（通用转换）
- 解析 XML 标签，提取参数字符串
- **通用的原始类型转换**（适用于所有工具）
  - 字符串数字 → 数字（`"42"` → `42`）
  - 字符串布尔值 → 布尔值（`"true"` → `true`）

#### Schema 职责（工具特定转换）
- **工具特定的数据转换**
  - JSON 字符串 → 数组/对象
  - XML 字符串 → 数组/对象
  - 自定义格式解析
- 参数验证
- 类型强制转换（工具特定的）

## 修改内容

### 1. Tool-Parser 重构

**文件**: `extension/src/agent/v1/tools/tool-parser/tool-parser.ts`

#### 删除的内容
- ❌ `preprocessMultiReplaceStringParams()` - 多余的函数
- ❌ `convertNumericParams()` - 改名为 `convertPrimitiveParams()`

#### 新增的内容
- ✅ `convertPrimitiveParams()` - 统一处理原始类型转换（数字、布尔值）
- ✅ `isBooleanSchema()` - 检查是否为布尔类型
- ✅ `isBooleanString()` - 检查字符串是否为布尔值

**关键代码**:
```typescript
private finalizeTool(context: Context): void {
    try {
        // Convert primitive types (numbers, booleans) from strings for all tools
        // This is a generic conversion that applies to all tools
        // Tool-specific conversions (like JSON parsing) should be done in the schema's z.preprocess
        context.params = this.convertPrimitiveParams(context.params, toolSchema);

        const validatedParams = toolSchema.schema.parse(context.params);
        this.onToolEnd?.(context.id, context.toolName, validatedParams, context.ts);
    } catch (error) {
        // Error handling...
    }
}
```

### 2. Pattern-Search Schema 修复

**文件**: `extension/src/agent/v1/tools/schema/pattern-search.ts`

#### 修改内容
- ✅ 为 `files` 字段添加 `z.preprocess` 来解析 JSON 字符串
- ✅ 移除 `caseSensitive` 的 `z.preprocess`（现在由 tool-parser 统一处理）

**关键代码**:
```typescript
const patternSearchSchema = z.object({
    searchPattern: z.string().min(1).describe('...'),
    
    // ✅ 添加 JSON 解析预处理
    files: z.preprocess((val) => {
        // If it's already an array, return it
        if (Array.isArray(val)) {
            console.log('[PatternSearch] files is already an array with', val.length, 'items');
            return val;
        }

        // If it's a string, try to parse it as JSON
        if (typeof val === 'string') {
            const trimmed = val.trim();
            
            // Try JSON format (recommended format: ["file1.ts", "file2.ts"])
            if (trimmed.startsWith('[')) {
                console.log('[PatternSearch] Detected JSON format, parsing...');
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        console.log('[PatternSearch] ✅ Successfully parsed JSON with', parsed.length, 'files');
                        return parsed;
                    } else {
                        console.error('[PatternSearch] ❌ JSON parsed but not an array');
                        return [];
                    }
                } catch (error) {
                    console.error('[PatternSearch] ❌ JSON parsing failed:', error instanceof Error ? error.message : String(error));
                    return [];
                }
            }

            console.error('[PatternSearch] ❌ String does not start with [, cannot parse');
            return [];
        }

        console.error('[PatternSearch] ❌ files is neither array nor string, type:', typeof val);
        return [];
    }, z.array(z.string()).min(1).describe('...')),
    
    // ✅ 移除 z.preprocess，由 tool-parser 统一处理布尔值转换
    caseSensitive: z.boolean().optional().default(false).describe('...'),
    
    contextLinesBefore: z.number().int().min(0).max(20).optional().default(5).describe('...'),
    contextLinesAfter: z.number().int().min(0).max(20).optional().default(5).describe('...'),
});
```

### 3. UI 防御性编程

**文件**: `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx`

**修改内容**:
```typescript
const PatternSearchBlock: React.FC<PatternSearchTool & ToolAddons> = ({
  searchPattern,
  files,
  // ...
}) => {
  // Defensive programming: ensure files is always an array
  const safeFiles = Array.isArray(files) ? files : [];
  const safeSearchPattern = searchPattern || 'No pattern provided';
  const hasInvalidData = !Array.isArray(files);

  return (
    <ToolBlock>
      <div className='space-y-3'>
        {/* Validation Error */}
        {hasInvalidData && (
          <div className='space-y-2'>
            <span className='text-sm font-medium text-destructive'>Validation Error:</span>
            <div className='bg-destructive/5 border border-destructive/20 rounded-md p-3'>
              <p className='text-xs text-destructive font-mono'>
                Invalid data received. The 'files' parameter should be an array but received: {typeof files}
              </p>
            </div>
          </div>
        )}
        
        {/* Files */}
        <div className='flex items-start space-x-2'>
          <span className='text-sm font-medium text-muted-foreground min-w-[120px]'>
            Files:
          </span>
          <span className='text-sm'>{safeFiles.length} file{safeFiles.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </ToolBlock>
  );
};
```

### 4. Tool Executor 错误处理

**文件**: `extension/src/agent/v1/tools/tool-executor.ts`

**修改内容**:
```typescript
private async handleToolError(id: string, toolName: string, error: Error, ts: number): Promise<void> {
    // ...
    
    // For pattern_search, ensure files is always an array
    if (toolName === 'pattern_search' && !Array.isArray(safeToolParams.files)) {
        safeToolParams.files = [];
    }
    
    // ...
}
```

### 5. 类型定义更新

**文件**: `extension/src/shared/new-tools.ts`

**修改内容**:
```typescript
export type PatternSearchTool = {
    tool: 'pattern_search';
    searchPattern: string;
    files?: string[]; // Optional to handle validation errors
    caseSensitive?: boolean;
    contextLinesBefore?: number;
    contextLinesAfter?: number;
    results?: string;
    totalMatches?: number;
    filesSearched?: number;
    error?: string;
};
```

## 修改的文件总结

1. ✅ `extension/src/agent/v1/tools/tool-parser/tool-parser.ts` - 重构职责，统一处理原始类型转换
2. ✅ `extension/src/agent/v1/tools/schema/pattern-search.ts` - 添加 JSON 解析
3. ✅ `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx` - UI 防御性编程
4. ✅ `extension/src/agent/v1/tools/tool-executor.ts` - 错误处理
5. ✅ `extension/src/shared/new-tools.ts` - 类型定义更新

## 三层防御策略

### 1. Schema 层（第一道防线）
- 使用 `z.preprocess` 解析 JSON 字符串
- 验证数据格式
- 返回空数组作为默认值

### 2. Tool Executor 层（第二道防线）
- 在 `handleToolError` 中提供默认值
- 确保 UI 收到有效数据

### 3. UI 层（第三道防线）
- 使用安全变量（`safeFiles`）
- 检测并显示验证错误
- 防止运行时崩溃

## 修复效果

**修复前**:
- ❌ 验证失败导致界面崩溃
- ❌ 用户看不到错误信息
- ❌ 工具无法执行

**修复后**:
- ✅ 正确解析 JSON 字符串
- ✅ 正确转换布尔值
- ✅ UI 不会崩溃
- ✅ 显示友好的错误消息
- ✅ 工具可以正常执行

## 编译结果

```bash
> pnpm run compile

✓ Type checking passed
✓ Linting passed (1 warning, 0 errors)
✓ Build successful
```

## 相关文档

- [Tool Parser & Schema Responsibility Refactor](./TOOL_PARSER_SCHEMA_RESPONSIBILITY_REFACTOR.md) - 详细的职责划分说明
- [Fast Editor JSON Parsing Fix](./FAST_EDITOR_JSON_PARSING_FIX.md) - 类似问题的修复
- [Tool Crash Fixes Summary](./TOOL_CRASH_FIXES_SUMMARY.md) - 所有工具崩溃修复的总结

## 日期
2025-10-07

