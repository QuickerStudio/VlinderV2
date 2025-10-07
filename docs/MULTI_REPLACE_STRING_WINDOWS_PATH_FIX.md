# Multi Replace String 工具 - Windows 路径修复报告

## 修复日期
2025-01-04

## 🔥 严重问题发现

感谢你的详细测试！你发现了一个**致命的设计缺陷**：

### 问题描述
```
用户输入: C:\Users\Test\file.txt
工具处理后: C:\Users\Te<TAB>ile.txt
结果: 匹配失败！❌
```

**根本原因**：我们的 `processEscapeSequences()` 函数过于激进，自动将所有 `\t`, `\n` 等转换为控制字符，导致 Windows 路径被破坏。

---

## 🎯 修复方案

### 设计决策：禁用自动转义字符处理

**之前的错误设计**：
```typescript
// ❌ 自动处理所有转义序列
function processEscapeSequences(str: string): string {
	return str
		.replace(/\\n/g, '\n')   // 将 \n 转换为换行符
		.replace(/\\t/g, '\t')   // 将 \t 转换为制表符
		// ...
}
```

**问题**：
- `C:\new\test` → `C:<换行符>ew<制表符>est` ❌
- `C:\test\temp` → `C:<制表符>est<制表符>emp` ❌

**新的正确设计**：
```typescript
// ✅ 只处理双反斜杠，保留单反斜杠
function processEscapeSequences(str: string): string {
	// Only process \\ → \ (double backslash to single backslash)
	return str.replace(/\\\\/g, '\\');
}
```

**效果**：
- `C:\new\test` → `C:\new\test` ✅ (保持不变)
- `C:\test\temp` → `C:\test\temp` ✅ (保持不变)
- `C:\\Users\\Test` → `C:\Users\Test` ✅ (双反斜杠转单反斜杠)

---

## 📝 如何使用特殊字符

### 方法：使用 XML 数字实体

**换行符**：
```xml
<!-- 使用十进制 -->
<oldString>line1&#10;line2</oldString>

<!-- 使用十六进制 -->
<oldString>line1&#xA;line2</oldString>
```

**制表符**：
```xml
<!-- 使用十进制 -->
<oldString>col1&#9;col2</oldString>

<!-- 使用十六进制 -->
<oldString>col1&#x9;col2</oldString>
```

**回车符**：
```xml
<!-- 使用十进制 -->
<oldString>line1&#13;line2</oldString>

<!-- 使用十六进制 -->
<oldString>line1&#xD;line2</oldString>
```

### 常用 XML 数字实体对照表

| 字符 | 十进制 | 十六进制 | 说明 |
|------|--------|----------|------|
| 换行符 (LF) | `&#10;` | `&#xA;` | Unix/Linux 换行 |
| 回车符 (CR) | `&#13;` | `&#xD;` | Mac 旧版换行 |
| 制表符 (Tab) | `&#9;` | `&#x9;` | 水平制表符 |
| 空格 | `&#32;` | `&#x20;` | 普通空格 |

---

## 🧪 测试验证

### ✅ Test 1: Windows 路径（单反斜杠）
```javascript
Input: "C:\\Users\\Test\\file.txt"
Output: "C:\\Users\\Test\\file.txt"
✅ 通过 - 保持不变
```

### ✅ Test 2: Windows 路径（双反斜杠）
```javascript
Input: "C:\\\\Users\\\\Test\\\\file.txt"
Output: "C:\\Users\\Test\\file.txt"
✅ 通过 - 转换为单反斜杠
```

### ✅ Test 3: 换行符（XML 实体）
```javascript
Input: "line1&#10;line2"
Output: "line1\nline2"
✅ 通过 - 正确转换为换行符
```

### ✅ Test 4: 制表符（XML 实体）
```javascript
Input: "col1&#9;col2"
Output: "col1\tcol2"
✅ 通过 - 正确转换为制表符
```

### ✅ Test 5: 混合场景
```javascript
Input: "C:\\Users\\Test&#10;D:\\Projects\\App"
Output: "C:\\Users\\Test\nD:\\Projects\\App"
✅ 通过 - Windows 路径 + 换行符
```

### ✅ Test 6: 字面 \n 不转换
```javascript
Input: "C:\\new\\test"
Output: "C:\\new\\test"
✅ 通过 - \n 保持为字面字符，不转换为换行符
```

### ✅ Test 7: 字面 \t 不转换
```javascript
Input: "C:\\test\\temp"
Output: "C:\\test\\temp"
✅ 通过 - \t 保持为字面字符，不转换为制表符
```

---

## 📊 修复前后对比

### 修复前
| 输入 | 输出 | 结果 |
|------|------|------|
| `C:\Users\Test\file.txt` | `C:\Users\Te<TAB>ile.txt` | ❌ 错误 |
| `C:\new\test` | `C:<换行符>ew<制表符>est` | ❌ 错误 |
| `line1\nline2` | `line1<换行符>line2` | ⚠️ 意外工作 |

### 修复后
| 输入 | 输出 | 结果 |
|------|------|------|
| `C:\Users\Test\file.txt` | `C:\Users\Test\file.txt` | ✅ 正确 |
| `C:\new\test` | `C:\new\test` | ✅ 正确 |
| `line1&#10;line2` | `line1<换行符>line2` | ✅ 正确 |
| `C:\\Users\\Test` | `C:\Users\Test` | ✅ 正确 |

---

## 🔧 技术实现

### 修改的函数

#### 1. `processEscapeSequences()` - 简化处理
```typescript
/**
 * Process escape sequences in strings - DISABLED BY DEFAULT
 * 
 * We DO NOT automatically process \n, \t, etc. because it causes problems:
 * - User input: "C:\Users\Test\file.txt"
 * - If we process \t: "C:\Users\Te<TAB>ile.txt" ❌ WRONG!
 * 
 * This function now ONLY processes:
 * - \\ → \ (double backslash to single backslash)
 */
function processEscapeSequences(str: string): string {
	return str.replace(/\\\\/g, '\\');
}
```

#### 2. `unescapeXml()` - 增强支持
```typescript
/**
 * Unescape XML entities and numeric character references
 * 
 * Supports:
 * - Named entities: &lt; &gt; &amp; &quot; &apos;
 * - Decimal entities: &#10; (newline), &#9; (tab), &#13; (CR)
 * - Hex entities: &#xA; (newline), &#x9; (tab), &#xD; (CR)
 */
function unescapeXml(str: string): string {
	return str
		// Process numeric character references (decimal)
		.replace(/&#(\d+);/g, (_match, dec) => 
			String.fromCharCode(parseInt(dec, 10)))
		// Process numeric character references (hexadecimal)
		.replace(/&#x([0-9A-Fa-f]+);/g, (_match, hex) => 
			String.fromCharCode(parseInt(hex, 16)))
		// Process named entities
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, '&');
}
```

---

## 📚 使用示例

### 示例 1: 替换 Windows 路径
```xml
<tool name="multi_replace_string_in_file">
  <explanation>Replace Windows path</explanation>
  <replacements>
    <replacement>
      <filePath>config.txt</filePath>
      <oldString>C:\Users\Test\file.txt</oldString>
      <newString>D:\Projects\App\file.txt</newString>
    </replacement>
  </replacements>
</tool>
```

### 示例 2: 替换多行文本
```xml
<tool name="multi_replace_string_in_file">
  <explanation>Replace multi-line text</explanation>
  <replacements>
    <replacement>
      <filePath>data.txt</filePath>
      <oldString>line1&#10;line2&#10;line3</oldString>
      <newString>single line</newString>
    </replacement>
  </replacements>
</tool>
```

### 示例 3: 替换制表符分隔的数据
```xml
<tool name="multi_replace_string_in_file">
  <explanation>Replace tab-separated values</explanation>
  <replacements>
    <replacement>
      <filePath>data.tsv</filePath>
      <oldString>col1&#9;col2&#9;col3</oldString>
      <newString>col1&#9;col2_new&#9;col3</newString>
    </replacement>
  </replacements>
</tool>
```

### 示例 4: 混合场景
```xml
<tool name="multi_replace_string_in_file">
  <explanation>Replace paths with newlines</explanation>
  <replacements>
    <replacement>
      <filePath>paths.txt</filePath>
      <oldString>C:\Users\Test&#10;D:\Projects\App</oldString>
      <newString>E:\NewLocation&#10;F:\NewProject</newString>
    </replacement>
  </replacements>
</tool>
```

---

## ✅ 编译验证

```bash
✅ TypeScript 类型检查通过
✅ ESLint 检查通过
✅ 构建成功
✅ 所有测试通过
```

---

## 🎯 总结

### 修复的问题
1. ✅ **Windows 路径处理** - 不再错误转换 `\t`, `\n` 等
2. ✅ **特殊字符支持** - 通过 XML 数字实体支持换行符、制表符等
3. ✅ **双反斜杠处理** - 正确转换 `\\` 为 `\`
4. ✅ **混合场景** - 支持路径 + 特殊字符的组合

### 关键改进
- **更安全**：不会意外破坏 Windows 路径
- **更明确**：用户必须显式使用 XML 实体来表示特殊字符
- **更标准**：遵循 XML 规范，使用数字实体表示控制字符
- **更可靠**：所有测试场景都通过

### 用户指南
- **Windows 路径**：直接使用 `C:\Users\Test\file.txt`
- **换行符**：使用 `&#10;` 或 `&#xA;`
- **制表符**：使用 `&#9;` 或 `&#x9;`
- **双反斜杠**：使用 `\\` 会被转换为单个 `\`

**工具现在可以安全地处理 Windows 路径和特殊字符！** 🎉

