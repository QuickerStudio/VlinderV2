# Multi Replace String 工具测试指南

## 测试目的
验证所有修复是否正常工作，特别是转义字符处理和新文件支持。

---

## 测试 1: 转义字符处理 ✅

### 目标
验证工具能正确处理 `\n`, `\t`, `\r`, `\\` 等转义字符

### 测试步骤

1. **创建测试文件** `test_escape.txt`:
```
line1
line2
line3
```

2. **使用工具替换**:
```xml
<tool name="multi_replace_string_in_file">
  <explanation>Test escape character handling</explanation>
  <replacements>
    <replacement>
      <filePath>test_escape.txt</filePath>
      <oldString>line1\nline2</oldString>
      <newString>single line</newString>
    </replacement>
  </replacements>
</tool>
```

3. **预期结果**:
```
single line
line3
```

### 验证点
- ✅ `\n` 被识别为实际的换行符
- ✅ 多行文本被正确替换为单行
- ✅ 工具报告成功并显示位置信息

---

## 测试 2: 新创建文件支持 ✅

### 目标
验证工具能在新创建但未保存的文件上执行替换

### 测试步骤

1. **使用 save-file 工具创建新文件** `new_test.txt`:
```
Hello World
This is a test
```

2. **立即使用 multi_replace_string_in_file**（不手动保存）:
```xml
<tool name="multi_replace_string_in_file">
  <explanation>Test new file support</explanation>
  <replacements>
    <replacement>
      <filePath>new_test.txt</filePath>
      <oldString>Hello World</oldString>
      <newString>Hi Universe</newString>
    </replacement>
  </replacements>
</tool>
```

3. **预期结果**:
```
Hi Universe
This is a test
```

### 验证点
- ✅ 工具不报错 "File not found"
- ✅ 替换成功应用
- ✅ 文件被正确保存

---

## 测试 3: 部分失败处理 ✅

### 目标
验证当部分替换失败时，成功的替换仍然被应用

### 测试步骤

1. **创建测试文件** `test1.txt`:
```
foo bar
```

2. **使用工具，包含一个会失败的替换**:
```xml
<tool name="multi_replace_string_in_file">
  <explanation>Test partial failure handling</explanation>
  <replacements>
    <replacement>
      <filePath>test1.txt</filePath>
      <oldString>foo</oldString>
      <newString>FOO</newString>
    </replacement>
    <replacement>
      <filePath>test1.txt</filePath>
      <oldString>nonexistent</oldString>
      <newString>REPLACED</newString>
    </replacement>
    <replacement>
      <filePath>test1.txt</filePath>
      <oldString>bar</oldString>
      <newString>BAR</newString>
    </replacement>
  </replacements>
</tool>
```

3. **预期结果**:
- 文件内容: `FOO BAR`
- 工具报告: `⚠️ Applied 2 replacements... Warning: 1 replacement failed`
- 错误详细信息: `String not found in file: "nonexistent"`

### 验证点
- ✅ 成功的替换被应用（foo → FOO, bar → BAR）
- ✅ 失败的替换不影响其他替换
- ✅ 显示详细的警告信息

---

## 测试 4: 全部失败场景 ✅

### 目标
验证当所有替换都失败时，不应用任何更改

### 测试步骤

1. **创建测试文件** `test2.txt`:
```
original content
```

2. **使用工具，所有替换都会失败**:
```xml
<tool name="multi_replace_string_in_file">
  <explanation>Test all failures scenario</explanation>
  <replacements>
    <replacement>
      <filePath>test2.txt</filePath>
      <oldString>nonexistent1</oldString>
      <newString>REPLACED1</newString>
    </replacement>
    <replacement>
      <filePath>test2.txt</filePath>
      <oldString>nonexistent2</oldString>
      <newString>REPLACED2</newString>
    </replacement>
  </replacements>
</tool>
```

3. **预期结果**:
- 文件内容: `original content`（未改变）
- 工具报告: `All replacements failed. No changes were applied`

### 验证点
- ✅ 文件内容完全未改变
- ✅ 显示清晰的错误消息
- ✅ 列出所有失败的原因

---

## 测试 5: 详细错误信息 ✅

### 目标
验证错误信息包含行号和位置信息

### 测试步骤

1. **创建测试文件** `test3.txt`:
```
line 1: foo
line 2: bar
line 3: foo
line 4: baz
line 5: foo
```

2. **使用工具替换多次出现的字符串**:
```xml
<tool name="multi_replace_string_in_file">
  <explanation>Test detailed location info</explanation>
  <replacements>
    <replacement>
      <filePath>test3.txt</filePath>
      <oldString>foo</oldString>
      <newString>FOO</newString>
    </replacement>
  </replacements>
</tool>
```

3. **预期结果**:
- 工具报告: `3 × "foo" → "FOO" (Replaced at line 1:9, line 3:9, line 5:9)`

### 验证点
- ✅ 显示替换次数
- ✅ 显示前3个位置的行号和列号
- ✅ 如果超过3个，显示 "and N more"

---

## 测试 6: Tab 字符处理 ✅

### 目标
验证工具能正确处理 `\t` 制表符

### 测试步骤

1. **创建测试文件** `test_tab.txt`:
```
column1	column2	column3
```
（使用实际的 Tab 字符）

2. **使用工具替换**:
```xml
<tool name="multi_replace_string_in_file">
  <explanation>Test tab character handling</explanation>
  <replacements>
    <replacement>
      <filePath>test_tab.txt</filePath>
      <oldString>column1\tcolumn2</oldString>
      <newString>col1, col2</newString>
    </replacement>
  </replacements>
</tool>
```

3. **预期结果**:
```
col1, col2	column3
```

### 验证点
- ✅ `\t` 被识别为实际的制表符
- ✅ 包含 Tab 的文本被正确替换

---

## 测试 7: 反斜杠转义 ✅

### 目标
验证工具能正确处理 `\\` 反斜杠转义

### 测试步骤

1. **创建测试文件** `test_backslash.txt`:
```
path\to\file
```

2. **使用工具替换**:
```xml
<tool name="multi_replace_string_in_file">
  <explanation>Test backslash escaping</explanation>
  <replacements>
    <replacement>
      <filePath>test_backslash.txt</filePath>
      <oldString>path\\to\\file</oldString>
      <newString>path/to/file</newString>
    </replacement>
  </replacements>
</tool>
```

3. **预期结果**:
```
path/to/file
```

### 验证点
- ✅ `\\` 被识别为单个反斜杠
- ✅ Windows 路径格式被正确处理

---

## 测试 8: Task Completion 复制按钮 ✅

### 目标
验证 Task Completion 工具的复制按钮功能

### 测试步骤

1. **完成一个任务**，触发 `attempt_completion` 工具

2. **观察 Task Completion 块**:
- 右上角应该有一个 "Copy" 按钮

3. **点击 Copy 按钮**:
- 按钮文本应该变为 "Copied!"
- 2秒后恢复为 "Copy"
- 任务结果应该被复制到剪贴板

4. **粘贴到文本编辑器验证**

### 验证点
- ✅ 复制按钮可见且可点击
- ✅ 点击后显示 "Copied!" 反馈
- ✅ 完整的任务结果被复制到剪贴板
- ✅ 按钮样式与其他工具一致

---

## 快速测试脚本

### 创建测试文件
```bash
# 测试 1: 转义字符
echo -e "line1\nline2\nline3" > test_escape.txt

# 测试 3: 部分失败
echo "foo bar" > test1.txt

# 测试 4: 全部失败
echo "original content" > test2.txt

# 测试 5: 详细信息
echo -e "line 1: foo\nline 2: bar\nline 3: foo\nline 4: baz\nline 5: foo" > test3.txt

# 测试 6: Tab 字符
echo -e "column1\tcolumn2\tcolumn3" > test_tab.txt

# 测试 7: 反斜杠
echo "path\to\file" > test_backslash.txt
```

---

## 预期编译结果

```bash
✅ TypeScript 类型检查通过
✅ ESLint 检查通过
✅ 构建成功
✅ 扩展打包成功 (vlinder-3.7.21.vsix)
```

---

## 总结

所有测试应该通过，验证：
1. ✅ 转义字符正确处理
2. ✅ 新文件支持正常
3. ✅ 部分失败优雅处理
4. ✅ 全部失败不应用更改
5. ✅ 详细的位置信息
6. ✅ Tab 字符处理
7. ✅ 反斜杠转义
8. ✅ Task Completion 复制功能

如果所有测试通过，工具已完全修复并可以投入使用！

