# Multi Replace String 工具 - 手动测试指南

## 问题描述

Multi Replace String 工具报告执行成功并显示替换统计信息，但实际上文件内容没有被修改。

## 根本原因

工具在应用 `WorkspaceEdit` 后**没有调用 `document.save()`**，导致更改只存在于内存中，没有持久化到磁盘。

## 修复内容

在 `multi-replace-string.tool.ts` 的第 214-226 行添加了文件保存逻辑：

```typescript
// Save all modified documents
for (const fileEdits of fileEditsMap.values()) {
  if (fileEdits.edits.length > 0) {
    try {
      const document = await vscode.workspace.openTextDocument(fileEdits.uri);
      await document.save();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to save ${fileEdits.uri.fsPath}: ${errorMessage}`);
      // Continue saving other files even if one fails
    }
  }
}
```

## 手动测试步骤

### 测试 1: 单文件单次替换

1. **创建测试文件**
   ```bash
   echo "Hello old world" > test1.txt
   ```

2. **使用工具替换**
   - 调用 Multi Replace String 工具
   - 参数:
     ```xml
     <tool name="multi_replace_string_in_file">
       <explanation>Replace old with new</explanation>
       <replacements>
         <replacement>
           <filePath>test1.txt</filePath>
           <oldString>old</oldString>
           <newString>new</newString>
         </replacement>
       </replacements>
     </tool>
     ```

3. **验证结果**
   ```bash
   cat test1.txt
   # 应该输出: Hello new world
   ```

4. **检查点**
   - ✅ 工具报告成功
   - ✅ 文件内容实际被修改
   - ✅ 修改持久化到磁盘

### 测试 2: 单文件多次替换

1. **创建测试文件**
   ```bash
   echo "foo bar foo baz foo" > test2.txt
   ```

2. **使用工具替换**
   ```xml
   <tool name="multi_replace_string_in_file">
     <explanation>Replace all foo with qux</explanation>
     <replacements>
       <replacement>
         <filePath>test2.txt</filePath>
         <oldString>foo</oldString>
         <newString>qux</newString>
       </replacement>
     </replacements>
   </tool>
   ```

3. **验证结果**
   ```bash
   cat test2.txt
   # 应该输出: qux bar qux baz qux
   ```

4. **检查点**
   - ✅ 所有 3 个 "foo" 都被替换
   - ✅ 文件保存成功

### 测试 3: 多文件替换

1. **创建测试文件**
   ```bash
   echo "File 1 with old content" > file1.txt
   echo "File 2 with old content" > file2.txt
   echo "File 3 with old content" > file3.txt
   ```

2. **使用工具替换**
   ```xml
   <tool name="multi_replace_string_in_file">
     <explanation>Replace old with new across multiple files</explanation>
     <replacements>
       <replacement>
         <filePath>file1.txt</filePath>
         <oldString>old</oldString>
         <newString>new</newString>
       </replacement>
       <replacement>
         <filePath>file2.txt</filePath>
         <oldString>old</oldString>
         <newString>new</newString>
       </replacement>
       <replacement>
         <filePath>file3.txt</filePath>
         <oldString>old</oldString>
         <newString>new</newString>
       </replacement>
     </replacements>
   </tool>
   ```

3. **验证结果**
   ```bash
   cat file1.txt  # File 1 with new content
   cat file2.txt  # File 2 with new content
   cat file3.txt  # File 3 with new content
   ```

4. **检查点**
   - ✅ 所有 3 个文件都被修改
   - ✅ 所有文件都保存成功
   - ✅ 工具报告 "3 replacements across 3 files"

### 测试 4: 同一文件的多个不同替换

1. **创建测试文件**
   ```bash
   echo "Hello world, goodbye world" > test4.txt
   ```

2. **使用工具替换**
   ```xml
   <tool name="multi_replace_string_in_file">
     <explanation>Multiple different replacements in same file</explanation>
     <replacements>
       <replacement>
         <filePath>test4.txt</filePath>
         <oldString>Hello</oldString>
         <newString>Hi</newString>
       </replacement>
       <replacement>
         <filePath>test4.txt</filePath>
         <oldString>goodbye</oldString>
         <newString>farewell</newString>
       </replacement>
     </replacements>
   </tool>
   ```

3. **验证结果**
   ```bash
   cat test4.txt
   # 应该输出: Hi world, farewell world
   ```

4. **检查点**
   - ✅ 两个不同的替换都应用了
   - ✅ 文件只保存一次（原子操作）

### 测试 5: 部分失败场景

1. **创建测试文件**
   ```bash
   echo "valid content" > valid.txt
   # 不创建 invalid.txt
   ```

2. **使用工具替换**
   ```xml
   <tool name="multi_replace_string_in_file">
     <explanation>Test partial failure</explanation>
     <replacements>
       <replacement>
         <filePath>valid.txt</filePath>
         <oldString>valid</oldString>
         <newString>modified</newString>
       </replacement>
       <replacement>
         <filePath>invalid.txt</filePath>
         <oldString>old</oldString>
         <newString>new</newString>
       </replacement>
     </replacements>
   </tool>
   ```

3. **验证结果**
   ```bash
   cat valid.txt
   # 应该输出: modified content
   ```

4. **检查点**
   - ✅ 工具报告错误（因为 invalid.txt 不存在）
   - ✅ valid.txt 仍然被成功修改和保存
   - ✅ 错误消息清晰说明哪个文件失败

## 对比测试

### 修复前 ❌

```bash
# 创建文件
echo "old content" > test.txt

# 使用工具
# ... 工具报告成功 ...

# 检查文件
cat test.txt
# 输出: old content  <-- 没有变化！
```

### 修复后 ✅

```bash
# 创建文件
echo "old content" > test.txt

# 使用工具
# ... 工具报告成功 ...

# 检查文件
cat test.txt
# 输出: new content  <-- 成功修改！
```

## 自动化测试

运行单元测试：

```bash
cd extension
npm test -- test-multi-replace-file-save.test.ts
```

## 验证清单

- [ ] 单文件单次替换成功
- [ ] 单文件多次替换成功
- [ ] 多文件替换成功
- [ ] 同一文件多个不同替换成功
- [ ] 部分失败时成功的文件仍被保存
- [ ] 文件内容实际持久化到磁盘
- [ ] 工具报告的统计信息准确
- [ ] 错误处理正确

## 相关文件

- `extension/src/agent/v1/tools/runners/multi-replace-string.tool.ts` - 主要修复
- `extension/test-multi-replace-file-save.test.ts` - 集成测试
- `MULTI_REPLACE_STRING_FILE_SAVE_FIX.md` - 详细修复文档

## 注意事项

1. 修复确保每个修改的文件都调用 `document.save()`
2. 即使某个文件保存失败，其他文件仍会继续保存
3. 保存错误会记录到控制台但不会中断整个操作
4. 这与 `replace-string.tool.ts` 和 `edit-files.tool.ts` 的行为一致

