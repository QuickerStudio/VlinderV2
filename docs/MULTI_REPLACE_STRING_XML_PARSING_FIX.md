# Multi Replace String Tool - XML Parsing Fix

## 问题描述

`multi_replace_string_in_file` 工具在使用时会导致界面崩溃，但后台程序仍然正常运行。错误信息显示：

```
Error: Validation error: [
  {
    "code": "invalid_type",
    "expected": "array",
    "received": "string",
    "path": [
      "replacements"
    ],
    "message": "Expected array, received string"
  }
]
```

## 根本原因

### XML 解析器的工作原理

1. **工具解析器** (`tool-parser.ts`) 将 XML 标签内的内容作为**字符串**存储
2. 当遇到 `<replacements>` 标签时，解析器会将其内部的所有内容（包括嵌套的 `<replacement>` 标签）作为字符串存储在 `context.params.replacements` 中
3. Zod schema 期望 `replacements` 是一个数组，但实际收到的是包含 XML 的字符串

### 示例

AI 生成的 XML：
```xml
<multi_replace_string_in_file>
  <explanation>更新版本号</explanation>
  <replacements>
    <replacement>
      <filePath>package.json</filePath>
      <oldString>"version": "1.0.0"</oldString>
      <newString>"version": "1.1.0"</newString>
    </replacement>
    <replacement>
      <filePath>README.md</filePath>
      <oldString>Version 1.0.0</oldString>
      <newString>Version 1.1.0</newString>
    </replacement>
  </replacements>
</multi_replace_string_in_file>
```

解析器提供给 schema 的数据：
```javascript
{
  explanation: "更新版本号",
  replacements: `
    <replacement>
      <filePath>package.json</filePath>
      <oldString>"version": "1.0.0"</oldString>
      <newString>"version": "1.1.0"</newString>
    </replacement>
    <replacement>
      <filePath>README.md</filePath>
      <oldString>Version 1.0.0</oldString>
      <newString>Version 1.1.0</newString>
    </replacement>
  `  // 这是一个字符串，不是数组！
}
```

## 解决方案

### 使用 `z.preprocess` 进行 XML 解析

在 schema 定义中添加预处理步骤，将 XML 字符串转换为数组：

```typescript
/**
 * Helper function to parse XML string containing replacement elements into an array
 */
function parseReplacementsXml(xmlString: string): any[] {
	const replacements: any[] = []
	
	// Match all <replacement>...</replacement> blocks
	const replacementRegex = /<replacement>([\s\S]*?)<\/replacement>/g
	let match: RegExpExecArray | null
	
	while ((match = replacementRegex.exec(xmlString)) !== null) {
		const replacementContent = match[1]
		
		// Extract filePath, oldString, and newString from each replacement block
		const filePathMatch = replacementContent.match(/<filePath>([\s\S]*?)<\/filePath>/)
		const oldStringMatch = replacementContent.match(/<oldString>([\s\S]*?)<\/oldString>/)
		const newStringMatch = replacementContent.match(/<newString>([\s\S]*?)<\/newString>/)
		
		if (filePathMatch && oldStringMatch && newStringMatch) {
			replacements.push({
				filePath: filePathMatch[1].trim(),
				oldString: oldStringMatch[1],
				newString: newStringMatch[1],
			})
		}
	}
	
	return replacements
}

const schema = z.object({
	explanation: z.string().describe("Brief explanation of why these replacements are being made"),
	replacements: z.preprocess(
		(val) => {
			// If it's already an array, return it as-is (for testing or direct API calls)
			if (Array.isArray(val)) {
				return val
			}
			// If it's a string (XML format from tool parser), parse it
			if (typeof val === "string") {
				const parsed = parseReplacementsXml(val)
				// If parsing failed or returned empty array, return undefined to trigger validation error
				return parsed.length > 0 ? parsed : undefined
			}
			// Otherwise, return undefined to trigger validation error
			return undefined
		},
		z
			.array(replacementSchema)
			.min(1)
			.describe("Array of replacement operations to perform")
	),
})
```

## 修改的文件

### 1. `extension/src/agent/v1/tools/schema/multi-replace-string.ts`

- 添加了 `parseReplacementsXml` 函数来解析 XML 字符串
- 使用 `z.preprocess` 包装 `replacements` 字段
- 支持三种输入格式：
  1. 已经是数组（用于测试）
  2. XML 字符串（来自工具解析器）
  3. 其他类型（触发验证错误）

### 2. `test/extension/agent/v1/tools/runners/multi-replace-string.tool.test.ts`

- 添加了测试用例验证 XML 解析功能

## 测试验证

创建了简单的测试脚本验证 XML 解析逻辑：

```javascript
const testXml = `
    <replacement>
      <filePath>src/api/users.ts</filePath>
      <oldString>getUserData</oldString>
      <newString>fetchUserData</newString>
    </replacement>
    <replacement>
      <filePath>src/components/UserProfile.tsx</filePath>
      <oldString>getUserData</oldString>
      <newString>fetchUserData</newString>
    </replacement>
`;

const result = parseReplacementsXml(testXml);
// 结果：
// [
//   {
//     "filePath": "src/api/users.ts",
//     "oldString": "getUserData",
//     "newString": "fetchUserData"
//   },
//   {
//     "filePath": "src/components/UserProfile.tsx",
//     "oldString": "getUserData",
//     "newString": "fetchUserData"
//   }
// ]
```

✅ 测试通过！

## 类似问题的工具

这个问题也影响了其他使用嵌套 XML 结构的工具：

1. **`fast-editor`** - 使用 JSON 格式而不是嵌套 XML（也需要修复）
2. **`fetch_webpage`** - 使用 `<urls><url>...</url></urls>` 格式（可能也需要类似的修复）

## 最佳实践

### 对于新工具

当创建需要数组参数的工具时，有两种选择：

#### 选项 1：使用嵌套 XML（推荐）

```xml
<tool_name>
  <items>
    <item>
      <field1>value1</field1>
      <field2>value2</field2>
    </item>
    <item>
      <field1>value3</field1>
      <field2>value4</field2>
    </item>
  </items>
</tool_name>
```

需要在 schema 中添加 `z.preprocess` 来解析 XML。

#### 选项 2：使用 JSON 格式

```xml
<tool_name>
  <items>
    [
      { "field1": "value1", "field2": "value2" },
      { "field1": "value3", "field2": "value4" }
    ]
  </items>
</tool_name>
```

需要在 schema 中添加 `z.preprocess` 来解析 JSON。

### 推荐使用嵌套 XML 的原因

1. **更符合 XML 语义** - XML 本身就是为嵌套结构设计的
2. **更易于 AI 生成** - AI 模型更容易生成正确的 XML 结构
3. **更好的错误处理** - 可以逐个验证每个元素
4. **更清晰的结构** - 人类更容易阅读和理解

## 编译结果

```bash
> pnpm run compile

✓ Type checking passed
✓ Linting passed (13 warnings, 0 errors)
✓ Build successful
```

## 总结

通过在 Zod schema 中添加 `z.preprocess` 预处理步骤，成功解决了 XML 字符串到数组的转换问题。这个修复：

1. ✅ 修复了界面崩溃问题
2. ✅ 保持了后台功能正常
3. ✅ 支持多种输入格式
4. ✅ 添加了适当的错误处理
5. ✅ 通过了测试验证

这个解决方案可以作为其他类似工具的参考模板。

