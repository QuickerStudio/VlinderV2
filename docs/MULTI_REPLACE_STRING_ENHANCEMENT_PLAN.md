# Multi Replace String 工具增强计划

## 修复日期
2025-01-04

## 📋 当前限制和问题

根据用户测试反馈，工具存在以下限制：

### ⚠️ 主要限制

1. **字符串匹配过于严格**
   - 需要完全精确匹配，包括空格和标点符号
   - 无法处理轻微的格式差异

2. **无正则表达式支持**
   - 只能进行精确字符串匹配
   - 不支持模式匹配
   - 无法批量替换相似模式

3. **无大小写不敏感选项**
   - 所有匹配都是大小写敏感的
   - 无法忽略大小写进行替换

4. **替换顺序不可控**
   - 无法指定替换的执行顺序
   - 可能导致意外的替换结果

5. **无回滚机制**
   - 如果部分替换失败，已成功的替换无法自动回滚
   - 可能导致文件处于不一致状态

6. **内容插入需要技巧**
   - 不能直接在特定行号插入内容
   - 需要通过替换相邻行来实现

7. **链式替换问题** ⚠️ 严重
   - 问题：在同一个 multi_replace 操作中，无法处理依赖性的链式替换
   - 示例：先替换 A→B，再替换 B→C，第二个替换会失败
   - 错误信息："String not found in file"
   - 原因：所有替换都基于原始文件内容，不会看到前面替换的结果

---

## 🎯 改进方案

### 优先级 1: 链式替换支持（立即实现）

**问题**：
```typescript
// 当前实现（第 404 行）
const occurrences = this.findOccurrences(content, oldString);
// 所有替换都基于原始 content，看不到前面的替换结果
```

**解决方案**：
```typescript
// 方案 A: 顺序应用替换（推荐）
// 每次替换后更新 content，下一个替换基于更新后的内容

// 方案 B: 提供 "independent" 模式
// 允许用户选择是否要链式替换
```

**实现**：
- 添加 `mode` 参数：`"independent"` | `"sequential"`
- `independent`：所有替换基于原始内容（当前行为）
- `sequential`：每次替换后更新内容，支持链式替换

### 优先级 2: 大小写不敏感选项（容易实现）

**当前实现**：
```typescript
const foundIndex = content.indexOf(searchString, index);
```

**改进**：
```typescript
// 添加 caseInsensitive 选项
if (caseInsensitive) {
  const lowerContent = content.toLowerCase();
  const lowerSearch = searchString.toLowerCase();
  foundIndex = lowerContent.indexOf(lowerSearch, index);
  // 然后从原始 content 中提取实际匹配的文本
} else {
  foundIndex = content.indexOf(searchString, index);
}
```

**Schema 更新**：
```xml
<replacement>
  <filePath>file.txt</filePath>
  <oldString>hello</oldString>
  <newString>hi</newString>
  <caseInsensitive>true</caseInsensitive>  <!-- 新增 -->
</replacement>
```

### 优先级 3: 正则表达式支持（中等难度）

**Schema 更新**：
```xml
<replacement>
  <filePath>file.txt</filePath>
  <oldString>user_\d+</oldString>
  <newString>customer_$1</newString>
  <useRegex>true</useRegex>  <!-- 新增 -->
</replacement>
```

**实现**：
```typescript
private findOccurrences(
  content: string,
  searchString: string,
  useRegex: boolean = false
): Array<...> {
  if (useRegex) {
    const regex = new RegExp(searchString, 'g');
    let match;
    while ((match = regex.exec(content)) !== null) {
      occurrences.push({
        start: match.index,
        end: match.index + match[0].length,
        // ...
      });
    }
  } else {
    // 现有的 indexOf 逻辑
  }
}
```

### 优先级 4: 回滚机制（高难度）

**当前问题**：
- 使用 `vscode.WorkspaceEdit` 一次性应用所有编辑
- 如果部分失败，无法回滚

**解决方案**：
```typescript
// 方案 A: 事务性编辑
// 1. 保存所有文件的原始内容
// 2. 应用编辑
// 3. 如果失败，恢复原始内容

// 方案 B: 全部成功或全部失败
// 当前已部分实现（第 154 行）
if (totalFailures > 0 && totalSuccesses === 0) {
  // 不应用任何更改
}

// 改进：即使部分成功，也提供回滚选项
```

### 优先级 5: 替换顺序控制（低优先级）

**Schema 更新**：
```xml
<replacement order="1">
  <filePath>file.txt</filePath>
  <oldString>A</oldString>
  <newString>B</newString>
</replacement>
<replacement order="2">
  <filePath>file.txt</filePath>
  <oldString>B</oldString>
  <newString>C</newString>
</replacement>
```

**实现**：
```typescript
// 按 order 排序
replacements.sort((a, b) => (a.order || 0) - (b.order || 0));
```

---

## 🚀 立即实现：链式替换支持

这是最严重的问题，我们应该立即修复。

### 实现方案

**添加 `mode` 参数**：

```typescript
// Schema 定义
const replacementSchema = z.object({
  filePath: z.string(),
  oldString: z.string(),
  newString: z.string(),
  mode: z.enum(['independent', 'sequential']).optional().default('independent'),
});
```

**修改 `processFileReplacements` 方法**：

```typescript
private async processFileReplacements(
  filePath: string,
  replacements: ReplacementOperation[]
): Promise<FileEdits> {
  // ...
  
  // 读取文件内容
  let content = document.getText();
  let currentContent = content; // 用于 sequential 模式
  
  // 处理每个替换
  for (const replacement of replacements) {
    const { oldString, newString, mode = 'independent' } = replacement;
    
    // 选择基于哪个内容进行查找
    const searchContent = mode === 'sequential' ? currentContent : content;
    
    const occurrences = this.findOccurrences(searchContent, oldString);
    
    if (occurrences.length > 0) {
      // 创建编辑
      for (const occ of occurrences) {
        const range = new vscode.Range(
          document.positionAt(occ.start),
          document.positionAt(occ.end)
        );
        allEdits.push(vscode.TextEdit.replace(range, newString));
      }
      
      // 如果是 sequential 模式，更新 currentContent
      if (mode === 'sequential') {
        // 应用替换到 currentContent
        currentContent = this.applyReplacementToString(
          currentContent,
          oldString,
          newString
        );
      }
      
      results.push({ success: true, ... });
    }
  }
  
  return { uri, edits: allEdits, results };
}

// 辅助方法：在字符串中应用替换
private applyReplacementToString(
  content: string,
  oldString: string,
  newString: string
): string {
  return content.split(oldString).join(newString);
}
```

---

## 📝 使用示例

### 示例 1: 链式替换（Sequential 模式）

```xml
<tool name="multi_replace_string_in_file">
  <explanation>Chain replacements: A→B→C</explanation>
  <replacements>
    <replacement>
      <filePath>test.txt</filePath>
      <oldString>A</oldString>
      <newString>B</newString>
      <mode>sequential</mode>
    </replacement>
    <replacement>
      <filePath>test.txt</filePath>
      <oldString>B</oldString>
      <newString>C</newString>
      <mode>sequential</mode>
    </replacement>
  </replacements>
</tool>
```

### 示例 2: 大小写不敏感（未来）

```xml
<replacement>
  <filePath>file.txt</filePath>
  <oldString>hello</oldString>
  <newString>hi</newString>
  <caseInsensitive>true</caseInsensitive>
</replacement>
```

### 示例 3: 正则表达式（未来）

```xml
<replacement>
  <filePath>file.txt</filePath>
  <oldString>user_(\d+)</oldString>
  <newString>customer_$1</newString>
  <useRegex>true</useRegex>
</replacement>
```

---

## 🎯 实施计划

### 阶段 1: 立即修复（本次）
- ✅ 链式替换支持（`mode` 参数）
- ✅ 更新文档和示例

### 阶段 2: 短期改进（1-2周）
- ⏳ 大小写不敏感选项
- ⏳ 更好的错误消息

### 阶段 3: 中期改进（1个月）
- ⏳ 正则表达式支持
- ⏳ 替换顺序控制

### 阶段 4: 长期改进（2-3个月）
- ⏳ 回滚机制
- ⏳ 行号插入功能
- ⏳ 预览模式

---

## 🔧 技术考虑

### 性能影响
- Sequential 模式可能稍慢（需要多次字符串操作）
- 但对于大多数用例，性能影响可以忽略

### 向后兼容性
- 所有新参数都是可选的
- 默认行为保持不变（`mode: 'independent'`）
- 现有代码无需修改

### 测试需求
- 单元测试：链式替换逻辑
- 集成测试：多文件链式替换
- 边缘情况：循环替换检测

---

## 📚 文档更新

需要更新以下文档：
1. 工具使用指南
2. API 参考
3. 示例代码
4. 最佳实践

**工具现在将支持链式替换，解决最严重的限制！** 🎉

