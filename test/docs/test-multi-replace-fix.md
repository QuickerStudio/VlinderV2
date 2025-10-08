# Multi Replace String 崩溃修复测试

## 问题描述
Multi Replace String 工具在被主代理调用时导致界面崩溃，变成空白。

## 错误信息
```
Error: Validation error: [
  {
    "code": "invalid_type",
    "expected": "array",
    "received": "undefined",
    "path": [
      "replacements"
    ],
    "message": "Required"
  }
]
```

## 修复内容

### 1. UI 组件防御性编程
**文件**: `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx`

- ✅ 添加 `safeReplacements` 来处理 `undefined`
- ✅ 添加 `hasInvalidData` 检查
- ✅ 显示友好的错误消息
- ✅ 防止 React 在遍历 `undefined` 时崩溃

### 2. 类型定义更新
**文件**: `extension/src/shared/new-tools.ts`

- ✅ 将 `replacements` 改为可选字段
- ✅ 添加注释说明这是为了处理 XML 解析失败

### 3. 错误处理改进
**文件**: `extension/src/agent/v1/tools/tool-executor.ts`

- ✅ 在 `handleToolError` 中添加安全检查
- ✅ 为 `multi_replace_string_in_file` 提供默认空数组
- ✅ 防止无效数据发送到 UI

### 4. 调试日志
**文件**: `extension/src/agent/v1/tools/schema/multi-replace-string.ts`

- ✅ 添加 XML 解析日志
- ✅ 记录解析的替换数量
- ✅ 警告不完整的替换块

## 测试场景

### 场景 1: 正常的 XML 格式
```xml
<tool name="multi_replace_string_in_file">
  <explanation>测试多文件字符串替换</explanation>
  <replacements>
    <replacement>
      <filePath>src/test.ts</filePath>
      <oldString>oldValue</oldString>
      <newString>newValue</newString>
    </replacement>
  </replacements>
</tool>
```
**期望结果**: ✅ 正常工作，显示替换预览

### 场景 2: 空的 replacements
```xml
<tool name="multi_replace_string_in_file">
  <explanation>测试空替换</explanation>
  <replacements>
  </replacements>
</tool>
```
**期望结果**: ✅ 显示错误消息，不崩溃

### 场景 3: 缺少 replacements 字段
```xml
<tool name="multi_replace_string_in_file">
  <explanation>测试缺少字段</explanation>
</tool>
```
**期望结果**: ✅ 显示错误消息，不崩溃

### 场景 4: 不完整的 replacement 块
```xml
<tool name="multi_replace_string_in_file">
  <explanation>测试不完整的块</explanation>
  <replacements>
    <replacement>
      <filePath>src/test.ts</filePath>
      <oldString>oldValue</oldString>
      <!-- 缺少 newString -->
    </replacement>
  </replacements>
</tool>
```
**期望结果**: ✅ 显示错误消息，不崩溃

## 验证步骤

1. **编译项目**
   ```bash
   cd extension
   npm run compile
   ```

2. **重新加载扩展**
   - 按 F5 或在 VSCode 中重新加载窗口

3. **测试工具调用**
   - 让主代理调用 Multi Replace String 工具
   - 观察界面是否崩溃
   - 检查控制台日志

4. **检查错误处理**
   - 验证错误消息是否友好显示
   - 确认界面不会变成空白
   - 确认后台程序继续正常运行

## 预期行为

### 修复前
- ❌ 界面崩溃，变成空白
- ❌ 后台程序继续运行但无法交互
- ❌ 控制台显示验证错误

### 修复后
- ✅ 界面显示友好的错误消息
- ✅ 用户可以继续使用其他功能
- ✅ 控制台显示详细的调试日志
- ✅ 错误状态正确显示在工具块中

## 日志输出示例

```
[MultiReplaceString] Parsing XML: <replacement>...
[MultiReplaceString] Parsed 0 replacements from 1 blocks
[MultiReplaceString] XML parsing failed or returned empty array
Error processing tool: ss0A2cWNpc4ZGxt9AOtPK Error: Validation error: ...
```

## 相关文件

- `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx` - UI 组件
- `extension/src/shared/new-tools.ts` - 类型定义
- `extension/src/agent/v1/tools/tool-executor.ts` - 错误处理
- `extension/src/agent/v1/tools/schema/multi-replace-string.ts` - Schema 和解析
- `extension/src/agent/v1/tools/runners/multi-replace-string.tool.ts` - 工具执行器

## 注意事项

1. 这个修复是**防御性的**，确保即使数据无效也不会导致崩溃
2. 添加的日志可以帮助诊断 XML 解析问题
3. 如果频繁出现解析失败，可能需要检查 AI 生成的 XML 格式
4. 类型定义的更改使得代码更符合实际运行时的情况

