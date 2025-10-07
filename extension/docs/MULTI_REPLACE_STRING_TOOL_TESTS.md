# Multi Replace String Tool - Unit Tests

## 概述

为 Multi Replace String Tool 创建了全面的单元测试套件，覆盖所有核心功能、边缘情况和错误处理场景。

**测试文件**: `extension/src/agent/v1/tools/runners/multi-replace-string.tool.test.ts`  
**测试框架**: Jest  
**总测试用例数**: 30+

## 测试覆盖范围

### 1. 输入验证 (Input Validation)
- ✅ 空替换数组检测
- ✅ null 替换数组检测
- ✅ 确保必需参数存在

### 2. 用户审批流程 (User Approval Flow)
- ✅ 处理前请求用户批准
- ✅ 用户拒绝时返回 rejected 状态
- ✅ 批准后更新为 loading 状态
- ✅ 正确的审批状态转换

### 3. 单文件替换 (Single File Replacements)
- ✅ 单个文件中的单次替换
- ✅ 单个文件中的多次出现替换
- ✅ 同一文件中的多个不同替换
- ✅ 正确计算替换次数

### 4. 多文件替换 (Multiple Files Replacements)
- ✅ 跨多个文件替换相同字符串
- ✅ 不同文件中的不同替换
- ✅ 正确的文件分组和处理
- ✅ 跨文件的原子操作

### 5. 错误处理 (Error Handling)
- ✅ 文件不存在错误
- ✅ 文件中未找到字符串
- ✅ 混合成功和失败场景
- ✅ 文件读取错误（权限拒绝等）
- ✅ 工作区编辑应用失败
- ✅ 详细的错误消息报告

### 6. 边缘情况 (Edge Cases)
- ✅ 空字符串替换（删除文本）
- ✅ 特殊字符处理
- ✅ Unicode 字符支持
- ✅ 超长字符串处理
- ✅ 重叠出现的正确处理

### 7. 路径解析 (Path Resolution)
- ✅ 使用 cwd 解析相对路径
- ✅ 绝对路径处理
- ✅ 正确的 URI 构建

### 8. 原子操作 (Atomic Operations)
- ✅ 按文件分组替换
- ✅ 使用 WorkspaceEdit 原子应用所有编辑
- ✅ 事务性行为（全部成功或部分失败）

### 9. 摘要和报告 (Summary and Reporting)
- ✅ 单文件的正确摘要
- ✅ 多文件的正确摘要
- ✅ 成功状态的 UI 更新
- ✅ 错误状态的 UI 更新
- ✅ 详细的成功/失败统计

## 运行测试

### 方法 1: 使用 npm/pnpm
```bash
cd extension
npx jest src/agent/v1/tools/runners/multi-replace-string.tool.test.ts --verbose
```

### 方法 2: 使用 pnpm
```bash
cd extension
pnpm exec jest src/agent/v1/tools/runners/multi-replace-string.tool.test.ts --verbose
```

### 方法 3: 运行所有测试
```bash
cd extension
npx jest
```

### 方法 4: 使用批处理文件 (Windows)
```bash
cd extension
run-test.bat
```

### 方法 5: 带覆盖率报告
```bash
cd extension
npx jest src/agent/v1/tools/runners/multi-replace-string.tool.test.ts --coverage
```

## 测试结构

### Mock 设置
测试使用 Jest 模拟 VSCode API:
- `vscode.Uri.file` - 文件 URI 创建
- `vscode.workspace.fs.stat` - 文件存在检查
- `vscode.workspace.openTextDocument` - 文档打开
- `vscode.workspace.applyEdit` - 编辑应用
- `vscode.WorkspaceEdit` - 工作区编辑
- `vscode.TextEdit` - 文本编辑
- `vscode.Range` - 范围对象
- `vscode.Position` - 位置对象

### 测试模式
每个测试遵循 AAA 模式:
1. **Arrange** - 设置测试数据和 mock
2. **Act** - 执行工具
3. **Assert** - 验证结果

## 关键测试用例示例

### 示例 1: 基本替换测试
```typescript
it("should successfully replace single occurrence in one file", async () => {
    const params: MultiReplaceStringToolParams = {
        name: "multi_replace_string_in_file",
        input: {
            explanation: "Replace old with new",
            replacements: [
                {
                    filePath: "test.txt",
                    oldString: "old",
                    newString: "new",
                },
            ],
        },
    }

    mockDocument.getText.mockReturnValue("This is old text")

    const tool = new MultiReplaceStringTool(
        { ...params, ask: mockAsk, updateAsk: mockUpdateAsk, ts: Date.now() },
        mockOptions
    )

    const result = await tool.execute()

    expect(result.status).toBe("success")
    expect(result.text).toContain("Successfully applied 1 replacement")
})
```

### 示例 2: 错误处理测试
```typescript
it("should handle file not found error", async () => {
    ;(vscode.workspace.fs.stat as jest.Mock).mockRejectedValue(new Error("File not found"))

    const params: MultiReplaceStringToolParams = {
        name: "multi_replace_string_in_file",
        input: {
            explanation: "Test",
            replacements: [
                {
                    filePath: "nonexistent.txt",
                    oldString: "old",
                    newString: "new",
                },
            ],
        },
    }

    const tool = new MultiReplaceStringTool(
        { ...params, ask: mockAsk, updateAsk: mockUpdateAsk, ts: Date.now() },
        mockOptions
    )

    const result = await tool.execute()

    expect(result.status).toBe("error")
    expect(result.text).toContain("File does not exist")
})
```

### 示例 3: 多文件测试
```typescript
it("should replace same string across multiple files", async () => {
    const params: MultiReplaceStringToolParams = {
        name: "multi_replace_string_in_file",
        input: {
            explanation: "Rename function across files",
            replacements: [
                {
                    filePath: "file1.ts",
                    oldString: "getUserData",
                    newString: "fetchUserData",
                },
                {
                    filePath: "file2.ts",
                    oldString: "getUserData",
                    newString: "fetchUserData",
                },
                {
                    filePath: "file3.ts",
                    oldString: "getUserData",
                    newString: "fetchUserData",
                },
            ],
        },
    }

    mockDocument.getText.mockReturnValue("function getUserData() {}")

    const tool = new MultiReplaceStringTool(
        { ...params, ask: mockAsk, updateAsk: mockUpdateAsk, ts: Date.now() },
        mockOptions
    )

    const result = await tool.execute()

    expect(result.status).toBe("success")
    expect(result.text).toContain("Successfully applied 3 replacement")
    expect(result.text).toContain("across 3 file")
})
```

## 测试价值

这些单元测试提供了以下价值:

1. **质量保证**: 确保工具在各种场景下正确工作
2. **回归预防**: 防止未来的更改破坏现有功能
3. **文档作用**: 测试本身就是工具行为的活文档
4. **重构信心**: 在重构时提供安全网
5. **边缘情况覆盖**: 确保处理所有边缘情况和错误条件
6. **性能验证**: 验证原子操作和批处理逻辑

## 测试最佳实践

测试遵循以下最佳实践:

1. **描述性测试名称**: 每个测试都有清晰的描述
2. **单一职责**: 每个测试只验证一个方面
3. **全面覆盖**: 覆盖所有重要的功能和边缘情况
4. **可维护性**: 测试代码清晰易懂
5. **独立性**: 测试之间相互独立
6. **Mock 隔离**: 使用 mock 隔离外部依赖
7. **快速执行**: 所有测试应快速完成

## 已知问题和限制

1. **VSCode API Mock**: 测试使用 mock 的 VSCode API，可能与实际行为略有不同
2. **异步操作**: 某些异步操作可能需要额外的等待时间
3. **文件系统**: 测试不涉及实际的文件系统操作

## 未来改进

可以考虑的未来改进:

1. **集成测试**: 添加使用实际 VSCode 环境的集成测试
2. **性能测试**: 添加大规模替换的性能测试
3. **快照测试**: 为 UI 更新添加快照测试
4. **参数化测试**: 使用 Jest 的 `test.each` 进行参数化测试
5. **覆盖率目标**: 设置并维护 90%+ 的代码覆盖率

## 相关文件

- **工具实现**: `extension/src/agent/v1/tools/runners/multi-replace-string.tool.ts`
- **Schema 定义**: `extension/src/agent/v1/tools/schema/multi-replace-string.ts`
- **Prompt 定义**: `extension/src/agent/v1/prompts/tools/multi-replace-string.ts`
- **UI 组件**: `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx`
- **实现文档**: `docs/MULTI_REPLACE_STRING_TOOL_IMPLEMENTATION.md`

## 总结

Multi Replace String Tool 的单元测试套件提供了全面的测试覆盖，确保工具在各种场景下都能正确、稳定地工作。测试涵盖了从基本功能到复杂边缘情况的所有方面，为工具的质量和可靠性提供了强有力的保证。

