# 新文件支持和原子性操作测试

## 测试目的
验证 Multi Replace String 工具是否能正确处理新创建的文件和原子性操作。

---

## 测试 1: 新创建文件支持

### 场景
使用 `save-file` 工具创建新文件后，立即使用 `multi_replace_string_in_file` 进行替换。

### 测试步骤

1. **创建新文件** `test_new_file.txt`:
```xml
<tool name="save-file">
  <path>test_new_file.txt</path>
  <file_content>Hello World
This is a test file
Created by AI</file_content>
</tool>
```

2. **立即进行替换**（不手动保存）:
```xml
<tool name="multi_replace_string_in_file">
  <explanation>Test new file support</explanation>
  <replacements>
    <replacement>
      <filePath>test_new_file.txt</filePath>
      <oldString>Hello World</oldString>
      <newString>Hi Universe</newString>
    </replacement>
  </replacements>
</tool>
```

### 预期结果
- ✅ 工具不报错 "File not found"
- ✅ 替换成功应用
- ✅ 文件内容变为：
```
Hi Universe
This is a test file
Created by AI
```

### 实现原理
```typescript
// 在 processFileReplacements 中
try {
    const stat = await vscode.workspace.fs.stat(uri);
    // 文件存在于磁盘
} catch (error) {
    // 检查是否在打开的文档中
    const openDoc = vscode.workspace.textDocuments.find(
        doc => doc.uri.toString() === uri.toString()
    );
    
    if (!openDoc) {
        // 文件真的不存在
        return error;
    }
    // 文件在编辑器中打开，继续处理
}
```

---

## 测试 2: 原子性操作 - 全部失败场景

### 场景
所有替换都失败时，不应用任何更改。

### 测试步骤

1. **创建测试文件** `test_atomic.txt`:
```
original content
do not change this
```

2. **尝试替换不存在的字符串**:
```xml
<tool name="multi_replace_string_in_file">
  <explanation>Test atomicity - all failures</explanation>
  <replacements>
    <replacement>
      <filePath>test_atomic.txt</filePath>
      <oldString>nonexistent1</oldString>
      <newString>REPLACED1</newString>
    </replacement>
    <replacement>
      <filePath>test_atomic.txt</filePath>
      <oldString>nonexistent2</oldString>
      <newString>REPLACED2</newString>
    </replacement>
  </replacements>
</tool>
```

### 预期结果
- ✅ 文件内容完全未改变：
```
original content
do not change this
```
- ✅ 工具报告：`All replacements failed. No changes were applied`
- ✅ 显示详细错误信息

### 实现原理
```typescript
// 在 execute() 中
if (totalFailures > 0 && totalSuccesses === 0) {
    // 全部失败 - 不应用任何更改
    return this.toolResponse('error', 'All replacements failed. No changes were applied...');
}
```

---

## 测试 3: 原子性操作 - 部分失败场景

### 场景
部分替换失败时，成功的替换仍然被应用（优雅降级）。

### 测试步骤

1. **创建测试文件** `test_partial.txt`:
```
foo bar baz
```

2. **混合有效和无效的替换**:
```xml
<tool name="multi_replace_string_in_file">
  <explanation>Test partial failure handling</explanation>
  <replacements>
    <replacement>
      <filePath>test_partial.txt</filePath>
      <oldString>foo</oldString>
      <newString>FOO</newString>
    </replacement>
    <replacement>
      <filePath>test_partial.txt</filePath>
      <oldString>nonexistent</oldString>
      <newString>REPLACED</newString>
    </replacement>
    <replacement>
      <filePath>test_partial.txt</filePath>
      <oldString>bar</oldString>
      <newString>BAR</newString>
    </replacement>
  </replacements>
</tool>
```

### 预期结果
- ✅ 文件内容变为：
```
FOO BAR baz
```
- ✅ 工具报告：`⚠️ Applied 2 replacements across 1 file...`
- ✅ 显示警告：`Warning: 1 replacement failed`
- ✅ 详细错误信息：`String not found in file: "nonexistent"`

### 实现原理
```typescript
// 在 execute() 中
if (totalFailures > 0) {
    // 部分失败 - 应用成功的更改，显示警告
    partialFailureWarning = `\n\n⚠️ Warning: ${totalFailures} replacement(s) failed...`;
}

// 应用所有成功的编辑
const workspaceEdit = new vscode.WorkspaceEdit();
for (const fileEdits of fileEditsMap.values()) {
    if (fileEdits.edits.length > 0) {
        workspaceEdit.set(fileEdits.uri, fileEdits.edits);
    }
}
await vscode.workspace.applyEdit(workspaceEdit);
```

---

## 测试 4: 转义字符在实际文件中的应用

### 场景
验证转义字符处理在实际文件操作中是否正常工作。

### 测试步骤

1. **创建测试文件** `test_multiline.txt`:
```
line1
line2
line3
```

2. **使用转义字符进行替换**:
```xml
<tool name="multi_replace_string_in_file">
  <explanation>Test escape sequences in real file</explanation>
  <replacements>
    <replacement>
      <filePath>test_multiline.txt</filePath>
      <oldString>line1\nline2</oldString>
      <newString>single line</newString>
    </replacement>
  </replacements>
</tool>
```

### 预期结果
- ✅ 文件内容变为：
```
single line
line3
```
- ✅ 工具报告成功并显示位置信息
- ✅ `\n` 被正确识别为换行符

---

## 测试 5: 多文件操作的原子性

### 场景
跨多个文件的操作，验证部分文件失败时的行为。

### 测试步骤

1. **创建两个测试文件**:
   - `file1.txt`: `content1`
   - `file2.txt`: `content2`

2. **尝试在三个文件中替换**（其中一个不存在）:
```xml
<tool name="multi_replace_string_in_file">
  <explanation>Test multi-file atomicity</explanation>
  <replacements>
    <replacement>
      <filePath>file1.txt</filePath>
      <oldString>content1</oldString>
      <newString>CONTENT1</newString>
    </replacement>
    <replacement>
      <filePath>nonexistent.txt</filePath>
      <oldString>content</oldString>
      <newString>CONTENT</newString>
    </replacement>
    <replacement>
      <filePath>file2.txt</filePath>
      <oldString>content2</oldString>
      <newString>CONTENT2</newString>
    </replacement>
  </replacements>
</tool>
```

### 预期结果
- ✅ `file1.txt` 内容变为：`CONTENT1`
- ✅ `file2.txt` 内容变为：`CONTENT2`
- ✅ 工具报告：`⚠️ Applied 2 replacements...`
- ✅ 显示警告：`Warning: 1 replacement failed`
- ✅ 错误信息：`File not found: nonexistent.txt`

---

## 当前实现状态

### ✅ 已实现
1. **转义字符处理** - 在 schema 层面处理，通过 8/8 单元测试
2. **新文件支持** - 检查 `vscode.workspace.textDocuments`
3. **全部失败的原子性** - 不应用任何更改
4. **部分失败的优雅降级** - 应用成功的更改，显示警告
5. **详细错误信息** - 包含行号、列号和位置信息
6. **文件保存** - 在应用编辑后自动保存

### ⚠️ 需要验证
1. **新文件支持** - 需要实际测试确认
2. **跨文件原子性** - 需要验证多文件场景

### 📝 设计决策
- **不是严格的原子性**：部分失败时允许成功的操作继续
- **理由**：提供更好的用户体验，避免因一个错误导致所有操作失败
- **折中方案**：全部失败时保证原子性，部分失败时优雅降级

---

## 建议的手动测试流程

1. **测试转义字符** - 创建多行文件，使用 `\n` 进行替换
2. **测试新文件** - 使用 save-file 创建文件后立即替换
3. **测试全部失败** - 尝试替换不存在的字符串
4. **测试部分失败** - 混合有效和无效的替换
5. **测试多文件** - 跨多个文件进行替换

如果所有测试通过，工具即可投入使用！

