# 工具使用场景明确化

## 修改日期
2025-01-04

## 问题描述

Multi Replace String 工具和 Replace String 工具名称过于相似，导致大模型在选择工具时容易混淆。需要在工具提示词中强化区分它们的使用场景。

---

## 解决方案

### 原则
- 不使用表情符号（这是语言大模型，必须遵循标准的文本提示）
- 强调使用场景，而不是工具对比
- 专门的工具对应专门的场景
- 清晰的场景描述，帮助大模型做出正确选择

---

## 修改内容

### 1. replace_string_in_file 工具

**修改文件**: `extension/src/agent/v1/tools/schema/replace-string.ts`

**新的描述**:
```typescript
/**
 * @tool replace_string_in_file
 * @description Replace an exact string in a single file. All occurrences of the string will be replaced.
 * 
 * USE THIS TOOL FOR:
 * Single-file editing scenarios:
 * - Fixing a typo in one file
 * - Updating a constant value in one file
 * - Changing a function implementation in one file
 * - Modifying a configuration in one file
 * - Quick single-file corrections
 * 
 * DO NOT USE THIS TOOL FOR:
 * Multi-file scenarios (use multi_replace_string_in_file instead):
 * - Renaming a function used across multiple files
 * - Updating the same constant in multiple files
 * - Refactoring that affects multiple files
 * - Batch updates across the codebase
 */
```

**关键改进**:
- 明确说明"单文件"使用场景
- 列出具体的适用场景（修复拼写错误、更新常量等）
- 明确说明不适用的场景（多文件重构等）
- 引导大模型在多文件场景下使用正确的工具

---

### 2. multi_replace_string_in_file 工具

**修改文件**: `extension/src/agent/v1/tools/schema/multi-replace-string.ts`

**新的描述**:
```typescript
/**
 * @tool multi_replace_string_in_file
 * @description Perform multiple string replacements across multiple files in a single batch operation.
 * 
 * USE THIS TOOL FOR:
 * Multi-file batch editing scenarios:
 * - Renaming a function or variable used across multiple files
 * - Updating the same constant or configuration in multiple files
 * - Refactoring that requires changes in multiple files
 * - Batch updates across the codebase (e.g., updating API endpoints)
 * - Consistent changes across multiple files in one operation
 * - Cross-file dependency updates
 * 
 * DO NOT USE THIS TOOL FOR:
 * Single-file scenarios (use replace_string_in_file instead):
 * - Editing only one file
 * - Quick single-file fixes
 * - Simple one-time replacements
 * 
 * SPECIAL CHARACTER HANDLING:
 * - Windows paths: Use directly without escaping (e.g., C:\Users\Test\file.txt)
 * - Newlines: Use XML numeric entity &#10; or &#xA;
 * - Tabs: Use XML numeric entity &#9; or &#x9;
 * - Carriage return: Use XML numeric entity &#13; or &#xD;
 * - Double backslash: Use \\ to represent a single backslash
 * - XML special chars: Use &lt; &gt; &amp; &quot; &apos;
 */
```

**关键改进**:
- 明确说明"多文件批量"使用场景
- 列出具体的适用场景（跨文件重命名、批量更新等）
- 明确说明不适用的场景（单文件编辑等）
- 添加特殊字符处理说明（Windows 路径、换行符等）
- 引导大模型在单文件场景下使用正确的工具

---

## 场景对照表

| 场景 | 使用工具 | 原因 |
|------|----------|------|
| 修复一个文件中的拼写错误 | replace_string_in_file | 单文件操作 |
| 更新一个文件中的常量值 | replace_string_in_file | 单文件操作 |
| 修改一个文件中的函数实现 | replace_string_in_file | 单文件操作 |
| 重命名跨多个文件使用的函数 | multi_replace_string_in_file | 多文件操作 |
| 更新多个文件中的 API 端点 | multi_replace_string_in_file | 多文件批量操作 |
| 跨文件重构（如更改类名） | multi_replace_string_in_file | 多文件操作 |
| 批量更新配置文件 | multi_replace_string_in_file | 多文件批量操作 |
| 修复单个配置文件 | replace_string_in_file | 单文件操作 |

---

## 决策树

```
需要编辑文件？
    ↓
只需要编辑一个文件？
    ↓ 是
    使用 replace_string_in_file
    
    ↓ 否
需要编辑多个文件？
    ↓ 是
    使用 multi_replace_string_in_file
```

---

## 示例对比

### 场景 1: 修复单个文件中的拼写错误

**正确选择**: replace_string_in_file
```xml
<tool name="replace_string_in_file">
  <explanation>Fix typo in function name</explanation>
  <filePath>src/utils.ts</filePath>
  <oldString>function calcualteTotal() {</oldString>
  <newString>function calculateTotal() {</newString>
</tool>
```

### 场景 2: 重命名跨多个文件使用的函数

**正确选择**: multi_replace_string_in_file
```xml
<tool name="multi_replace_string_in_file">
  <explanation>Rename getUserData to fetchUserData across the codebase</explanation>
  <replacements>
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
  </replacements>
</tool>
```

### 场景 3: 更新单个配置文件

**正确选择**: replace_string_in_file
```xml
<tool name="replace_string_in_file">
  <explanation>Update API endpoint URL</explanation>
  <filePath>src/config.ts</filePath>
  <oldString>const API_URL = "http://localhost:3000"</oldString>
  <newString>const API_URL = "https://api.production.com"</newString>
</tool>
```

### 场景 4: 批量更新多个文件中的 API 端点

**正确选择**: multi_replace_string_in_file
```xml
<tool name="multi_replace_string_in_file">
  <explanation>Update API endpoints across multiple files</explanation>
  <replacements>
    <replacement>
      <filePath>src/config/api.ts</filePath>
      <oldString>const API_URL = 'http://localhost:3000'</oldString>
      <newString>const API_URL = 'https://api.production.com'</newString>
    </replacement>
    <replacement>
      <filePath>src/services/auth.ts</filePath>
      <oldString>const API_URL = 'http://localhost:3000'</oldString>
      <newString>const API_URL = 'https://api.production.com'</newString>
    </replacement>
  </replacements>
</tool>
```

---

## 编译验证

```bash
TypeScript 类型检查通过
ESLint 检查通过
构建成功
```

---

## 总结

### 修改的文件
1. `extension/src/agent/v1/tools/schema/replace-string.ts`
2. `extension/src/agent/v1/tools/schema/multi-replace-string.ts`

### 关键改进
1. 移除所有表情符号，使用标准文本提示
2. 明确每个工具的使用场景
3. 列出具体的适用和不适用场景
4. 添加场景引导，帮助大模型选择正确的工具
5. 为 multi_replace_string_in_file 添加特殊字符处理说明

### 预期效果
- 大模型能够根据场景清晰地区分两个工具
- 单文件编辑场景自动选择 replace_string_in_file
- 多文件批量编辑场景自动选择 multi_replace_string_in_file
- 减少工具选择错误，提高编辑效率

