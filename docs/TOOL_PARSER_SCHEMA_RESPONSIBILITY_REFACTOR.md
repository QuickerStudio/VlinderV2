# Tool Parser & Schema Responsibility Refactor

## 问题背景

在修复 `pattern-search` 工具崩溃时，发现代码库中存在**职责不明确**的问题：

1. **tool-parser.ts** 中有 `preprocessMultiReplaceStringParams` 函数，但实际上只是检查格式，不做转换
2. **schema 文件**中使用 `z.preprocess` 做 JSON/XML 解析
3. 两者职责重叠，导致混乱

## 职责划分原则

### ✅ Tool-Parser 的职责（通用转换）

**文件**: `extension/src/agent/v1/tools/tool-parser/tool-parser.ts`

**职责**:
1. 解析 XML 标签，提取参数字符串
2. **通用的原始类型转换**（适用于所有工具）
   - 字符串数字 → 数字（`"42"` → `42`）
   - 字符串布尔值 → 布尔值（`"true"` → `true`）

**不应该做**:
- ❌ 工具特定的数据转换（如 JSON 解析、XML 解析）
- ❌ 复杂的数据结构转换

### ✅ Schema (z.preprocess) 的职责（工具特定转换）

**文件**: `extension/src/agent/v1/tools/schema/*.ts`

**职责**:
1. **工具特定的数据转换**
   - JSON 字符串 → 数组/对象
   - XML 字符串 → 数组/对象
   - 自定义格式解析
2. 参数验证
3. 类型强制转换（工具特定的）

**示例**:
- `multi_replace_string_in_file` - JSON + XML 解析
- `fetch_webpage` - JSON + XML 解析
- `fast-editor` - JSON 解析
- `pattern-search` - JSON 解析

## 修改内容

### 1. Tool-Parser 重构

**文件**: `extension/src/agent/v1/tools/tool-parser/tool-parser.ts`

#### 删除的内容
- ❌ `preprocessMultiReplaceStringParams()` - 多余的函数，实际解析在 schema 中
- ❌ `convertNumericParams()` - 改名为 `convertPrimitiveParams()`

#### 新增的内容
- ✅ `convertPrimitiveParams()` - 统一处理原始类型转换
- ✅ `isBooleanSchema()` - 检查是否为布尔类型
- ✅ `isBooleanString()` - 检查字符串是否为布尔值

#### 修改后的代码

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

/**
 * Convert primitive type string parameters to their actual types based on schema
 * This handles:
 * - String numbers to actual numbers (e.g., "42" -> 42)
 * - String booleans to actual booleans (e.g., "true" -> true)
 * 
 * Note: Complex conversions like JSON parsing should be done in the schema's z.preprocess
 */
private convertPrimitiveParams(params: Record<string, any>, toolSchema: ToolSchema): Record<string, any> {
    const converted: Record<string, any> = { ...params };

    // Get the underlying schema (unwrap ZodEffects if needed)
    let schema = toolSchema.schema;
    if (schema instanceof z.ZodEffects) {
        schema = schema._def.schema;
    }

    // Only process ZodObject schemas
    if (!(schema instanceof z.ZodObject)) {
        return converted;
    }

    const shape = schema.shape;

    // Convert each parameter based on its schema type
    for (const [key, value] of Object.entries(params)) {
        if (typeof value !== 'string') {
            continue;
        }

        const fieldSchema = shape[key];
        if (!fieldSchema) {
            continue;
        }

        // Check if the field is a number type
        const isNumber = this.isNumberSchema(fieldSchema);
        if (isNumber && this.isNumericString(value)) {
            converted[key] = parseFloat(value);
            continue;
        }

        // Check if the field is a boolean type
        const isBoolean = this.isBooleanSchema(fieldSchema);
        if (isBoolean && this.isBooleanString(value)) {
            converted[key] = value.toLowerCase() === 'true';
            continue;
        }
    }

    return converted;
}

/**
 * Check if a schema expects a boolean type
 */
private isBooleanSchema(schema: any): boolean {
    if (schema instanceof z.ZodBoolean) {
        return true;
    }
    if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
        return this.isBooleanSchema(schema._def.innerType);
    }
    if (schema instanceof z.ZodDefault) {
        return this.isBooleanSchema(schema._def.innerType);
    }
    if (schema instanceof z.ZodEffects) {
        return this.isBooleanSchema(schema._def.schema);
    }
    return false;
}

/**
 * Check if a string represents a valid boolean
 */
private isBooleanString(value: string): boolean {
    const trimmed = value.trim().toLowerCase();
    return trimmed === 'true' || trimmed === 'false';
}
```

### 2. Pattern-Search Schema 修复

**文件**: `extension/src/agent/v1/tools/schema/pattern-search.ts`

#### 修改内容
- ✅ 为 `files` 字段添加 `z.preprocess` 来解析 JSON 字符串
- ✅ 移除 `caseSensitive` 的 `z.preprocess`（现在由 tool-parser 统一处理）

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
2. ✅ `extension/src/agent/v1/tools/schema/pattern-search.ts` - 添加 JSON 解析，移除布尔值转换
3. ✅ `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx` - UI 防御性编程
4. ✅ `extension/src/agent/v1/tools/tool-executor.ts` - 错误处理
5. ✅ `extension/src/shared/new-tools.ts` - 类型定义更新

## 优势

### 1. 职责清晰
- Tool-Parser: 通用的原始类型转换
- Schema: 工具特定的复杂转换

### 2. 代码复用
- 布尔值转换现在在 tool-parser 中统一处理
- 不需要在每个 schema 中重复实现

### 3. 易于维护
- 新工具只需要在 schema 中添加工具特定的转换
- 原始类型转换自动处理

### 4. 一致性
- 所有工具使用相同的模式
- 减少了代码重复

## 为什么不创建统一的 Preprocessor 工具？

### 考虑过的方案

创建一个 `preprocessors.ts` 文件，提供可复用的预处理函数：
```typescript
export function parseJsonArray(val: unknown, toolName: string, fieldName: string): any[]
export function parseJsonOrXmlArray(val: unknown, toolName: string, fieldName: string, xmlElementName?: string): any[]
```

### 为什么不采用这个方案

#### 1. 代码重复不严重
- 只有 4 个工具使用 JSON 解析（约 120 行重复代码）
- 每个工具的逻辑略有不同
- 强行统一可能降低灵活性

#### 2. 引入新的风险
- **新的依赖关系** - 所有 schema 文件依赖 preprocessors
- **增加复杂度** - 开发者需要学习新的 API
- **Breaking changes** - preprocessor 的 bug 会影响所有工具
- **测试成本** - 需要额外的测试
- **维护成本** - 多一个文件需要维护

#### 3. 当前设计已经足够好
- Tool-Parser 处理通用转换（数字、布尔值）
- Schema 处理工具特定转换（JSON、XML）
- 职责清晰，易于理解

#### 4. 遵循 YAGNI 原则
- You Aren't Gonna Need It
- 不要为了"完美"而过度设计
- 保持简单，避免过早优化

### 设计决策

**保持现状**：
- ✅ 每个 schema 文件独立实现 JSON/XML 解析
- ✅ 代码重复可接受（约 30 行 × 4 个文件）
- ✅ 灵活性高，每个工具可以自定义逻辑
- ✅ 降低耦合，减少风险

**未来考虑**：
- 如果有 10+ 个工具使用相同的解析逻辑，再考虑提取
- 如果发现解析逻辑有 bug，统一修复后再考虑提取

## 日期
2025-10-07

