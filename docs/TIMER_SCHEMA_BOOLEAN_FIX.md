# Timer Schema Boolean 类型转换修复

## 问题描述

在使用 timer 工具时，后端报告了验证错误：

```
Error: Validation error: [
  {
    "code": "invalid_type",
    "expected": "boolean",
    "received": "string",
    "path": ["showLocalTime"],
    "message": "Expected boolean, received string"
  }
]
```

## 根本原因

### XML 解析行为

当 AI 使用 XML 格式调用工具时：

```xml
<tool name="timer">
  <showLocalTime>true</showLocalTime>
  <note>Display current local time</note>
</tool>
```

XML 解析器会将所有值解析为**字符串**：
- `<showLocalTime>true</showLocalTime>` → `showLocalTime: "true"` (字符串)
- 而不是 `showLocalTime: true` (布尔值)

### Schema 验证失败

原始的 Zod schema 定义：

```typescript
showLocalTime: z
  .boolean()  // ❌ 只接受 boolean 类型
  .optional()
  .default(false)
  .describe('Optional: If true, displays local time instead of countdown timer.')
```

这个 schema 只接受布尔值，当接收到字符串 `"true"` 时会抛出验证错误。

## 解决方案

### 使用 Zod 的 union 和 transform

修改 schema 以接受字符串或布尔值，并自动转换为布尔值：

```typescript
showLocalTime: z
  .union([z.boolean(), z.string()])  // ✅ 接受 boolean 或 string
  .optional()
  .default(false)
  .transform((val) => {
    // 将字符串 "true"/"false" 转换为布尔值
    if (typeof val === 'string') {
      return val.toLowerCase() === 'true';
    }
    return val;
  })
  .describe('Optional: If true, displays local time instead of countdown timer.')
```

### 工作原理

1. **接受多种类型**：`z.union([z.boolean(), z.string()])` 允许接受布尔值或字符串
2. **类型转换**：`.transform()` 将字符串转换为布尔值
   - `"true"` → `true`
   - `"True"` → `true`
   - `"TRUE"` → `true`
   - `"false"` → `false`
   - `"anything else"` → `false`
   - `true` → `true` (已经是布尔值，直接返回)
   - `false` → `false` (已经是布尔值，直接返回)

## 代码变更

### 修改文件：extension/src/agent/v1/tools/schema/timer.ts

```typescript
// 修改前
const schema = z.object({
  duration: z
    .number()
    .nonnegative()
    .max(86400)
    .optional()
    .default(0)
    .describe('Duration in seconds. Maximum: 86400 seconds (24 hours). Use 0 or omit for local time display.'),
  note: z
    .string()
    .optional()
    .describe('Optional: Note/description for this timer.'),
  showLocalTime: z
    .boolean()  // ❌ 只接受 boolean
    .optional()
    .default(false)
    .describe('Optional: If true, displays local time instead of countdown timer.'),
});

// 修改后
const schema = z.object({
  duration: z
    .number()
    .nonnegative()
    .max(86400)
    .optional()
    .default(0)
    .describe('Duration in seconds. Maximum: 86400 seconds (24 hours). Use 0 or omit for local time display.'),
  note: z
    .string()
    .optional()
    .describe('Optional: Note/description for this timer.'),
  showLocalTime: z
    .union([z.boolean(), z.string()])  // ✅ 接受 boolean 或 string
    .optional()
    .default(false)
    .transform((val) => {
      // 将字符串 "true"/"false" 转换为布尔值
      if (typeof val === 'string') {
        return val.toLowerCase() === 'true';
      }
      return val;
    })
    .describe('Optional: If true, displays local time instead of countdown timer.'),
});
```

## 测试验证

### 测试用例 1：XML 格式（字符串）

**输入：**
```xml
<tool name="timer">
  <showLocalTime>true</showLocalTime>
  <note>Display current local time</note>
</tool>
```

**解析结果：**
```javascript
{
  showLocalTime: "true",  // 字符串
  note: "Display current local time"
}
```

**Schema 验证后：**
```javascript
{
  showLocalTime: true,  // ✅ 转换为布尔值
  note: "Display current local time"
}
```

### 测试用例 2：JSON 格式（布尔值）

**输入：**
```json
{
  "showLocalTime": true,
  "note": "Display current local time"
}
```

**解析结果：**
```javascript
{
  showLocalTime: true,  // 布尔值
  note: "Display current local time"
}
```

**Schema 验证后：**
```javascript
{
  showLocalTime: true,  // ✅ 保持布尔值
  note: "Display current local time"
}
```

### 测试用例 3：字符串 "false"

**输入：**
```xml
<tool name="timer">
  <showLocalTime>false</showLocalTime>
  <duration>60</duration>
</tool>
```

**解析结果：**
```javascript
{
  showLocalTime: "false",  // 字符串
  duration: 60
}
```

**Schema 验证后：**
```javascript
{
  showLocalTime: false,  // ✅ 转换为布尔值
  duration: 60
}
```

## 其他可能需要类似修复的地方

如果项目中有其他工具使用布尔参数，也可能需要类似的修复。常见的布尔参数包括：

- `enabled`
- `disabled`
- `force`
- `recursive`
- `verbose`
- `dryRun`
- 等等

建议检查所有 Zod schema 定义，确保布尔类型参数都能正确处理字符串输入。

## 通用解决方案

可以创建一个辅助函数来处理布尔类型转换：

```typescript
// 辅助函数
const booleanSchema = () => z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((val) => {
    if (typeof val === 'string') {
      return val.toLowerCase() === 'true';
    }
    return val;
  });

// 使用
const schema = z.object({
  showLocalTime: booleanSchema()
    .default(false)
    .describe('Optional: If true, displays local time instead of countdown timer.'),
});
```

## 构建验证

```bash
cd extension && pnpm run build
```

**结果：**
```
✓ built in 17.96s
✓ check-types passed
✓ lint passed
✓ build finished
✓ VSIX packaged successfully (35.81 MB)
```

## 总结

### 问题
- XML 解析器将 `<showLocalTime>true</showLocalTime>` 解析为字符串 `"true"`
- Zod schema 只接受布尔值，导致验证失败

### 解决方案
- 使用 `z.union([z.boolean(), z.string()])` 接受两种类型
- 使用 `.transform()` 将字符串转换为布尔值
- 支持大小写不敏感的转换（`"True"`, `"TRUE"`, `"true"` 都转换为 `true`）

### 优势
- ✅ 兼容 XML 和 JSON 格式
- ✅ 自动类型转换
- ✅ 大小写不敏感
- ✅ 向后兼容
- ✅ 无需修改 AI 调用方式

### 文件变更
- ✅ `extension/src/agent/v1/tools/schema/timer.ts` - 修复 showLocalTime 类型验证
- ✅ `docs/TIMER_SCHEMA_BOOLEAN_FIX.md` - 修复文档

现在 timer 工具可以正确处理 XML 格式的布尔参数了！

