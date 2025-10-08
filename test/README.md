<<<<<<< HEAD
# Vlinder 测试套件

## 概述

本目录包含 Vlinder 扩展的所有测试文件，包括单元测试、集成测试和示例测试。

## 测试结构

```
test/
├── extension/              # 扩展测试
│   ├── __mocks__/         # Mock 实现
│   │   ├── vscode.ts      # VSCode API mock
│   │   └── README.md      # Mock 使用文档
│   ├── context7-tool.test.ts              # Context7 单元测试
│   ├── context7-output-quality.test.ts    # Context7 输出质量测试
│   ├── context7-integration.test.ts       # Context7 集成测试
│   └── example-vscode-mock.test.ts        # VSCode Mock 示例
├── integration/           # 集成测试
├── manual/               # 手动测试
└── fixtures/             # 测试数据
```

## 快速开始

### 安装依赖

```bash
cd extension
pnpm install
```

### 运行所有测试

```bash
pnpm test
```

### 运行特定测试

```bash
# Context7 工具测试
pnpm test context7

# VSCode Mock 测试
pnpm test vscode-mock

# 特定文件
pnpm test context7-tool.test.ts
```

### 查看覆盖率

```bash
pnpm test --coverage
```

### 监视模式

```bash
pnpm test --watch
```

## 测试套件

### 1. Context7 工具测试 ✅

**测试文件**:
- `context7-tool.test.ts` - 单元测试 (12 tests)
- `context7-output-quality.test.ts` - 输出质量测试 (9 tests)
- `context7-integration.test.ts` - 集成测试 (10 tests)

**测试覆盖**:
- ✅ 参数验证
- ✅ 输出结构
- ✅ 内容质量
- ✅ Topic 过滤
- ✅ Token 限制
- ✅ 错误处理
- ✅ XML 格式

**运行测试**:
```bash
pnpm test context7
```

**测试结果**: 21/21 通过 ✅

### 2. VSCode Mock 测试 ✅

**测试文件**:
- `example-vscode-mock.test.ts` - Mock 示例和验证 (27 tests)

**测试覆盖**:
- ✅ Uri 类
- ✅ Position 和 Range
- ✅ TextEdit
- ✅ Workspace API
- ✅ Window API
- ✅ Commands API
- ✅ Languages API
- ✅ EventEmitter
- ✅ Environment API

**运行测试**:
```bash
pnpm test example-vscode-mock
```

**测试结果**: 27/27 通过 ✅

## 测试统计

### 总体统计

| 指标 | 数值 |
|------|------|
| 总测试数 | 48 |
| 通过测试 | 48 |
| 失败测试 | 0 |
| 成功率 | 100% ✅ |
| 总执行时间 | ~1.3s |
| 平均时间/测试 | ~27ms |

### 按类型统计

| 测试类型 | 测试数 | 通过 | 失败 | 状态 |
|---------|--------|------|------|------|
| 单元测试 | 12 | 12 | 0 | ✅ |
| 输出质量测试 | 9 | 9 | 0 | ✅ |
| Mock 测试 | 27 | 27 | 0 | ✅ |
| **总计** | **48** | **48** | **0** | **✅** |

## Mock 实现

### VSCode API Mock

完整的 VSCode API mock 实现，支持：

- **核心类**: Uri, Position, Range, Selection, TextEdit, WorkspaceEdit
- **命名空间**: workspace, window, commands, languages, env, extensions
- **枚举**: DiagnosticSeverity, ViewColumn, StatusBarAlignment 等
- **事件**: EventEmitter 实现

**使用示例**:

```typescript
import * as vscode from 'vscode';

// Mock 会自动应用
const uri = vscode.Uri.file('/test/file.ts');
const mockShow = vscode.window.showInformationMessage as any;
mockShow.mockResolvedValue('OK');
```

**文档**: `test/extension/__mocks__/README.md`

## 测试最佳实践

### 1. 编写测试

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('Feature Name', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = doSomething(input);
    
    // Assert
    expect(result).toBe('expected');
=======
# 🧪 Vlinder Test Suite

This directory contains all test files for the Vlinder extension.

## 📁 Directory Structure

```
test/
├── unit/              # Unit tests for individual components
├── integration/       # Integration tests for extension features
├── fixtures/          # Test data and mock files
├── docs/              # Test documentation and plans
├── manual/            # Manual testing scripts
└── README.md          # This file
```

## 🚀 Running Tests

### Run All Tests

```bash
cd extension
pnpm run test
```

### Run Specific Test Suite

```bash
# Unit tests
pnpm run test -- unit/

# Integration tests
pnpm run test -- integration/
```

### Run Single Test File

```bash
pnpm run test -- unit/fetch-webpage-block.test.tsx
```

## 📝 Test Categories

### Unit Tests (`unit/`)

Individual component and function tests:
- `fetch-webpage-block.test.tsx` - Webpage fetching functionality
- `test-tool-parser-replacements.js` - Tool parser logic
- `test-xml-parsing-debug.js` - XML parsing utilities
- `test-utils.ts` - Testing utilities

### Integration Tests (`integration/`)

End-to-end feature tests:
- `extension/` - Full extension integration tests
- Tool integration tests
- Workflow tests

### Fixtures (`fixtures/`)

Test data and results:
- `KILL_BASH_TOOL_TEST_RESULTS.json` - Bash tool test results
- `KILL_BASH_TOOL_ADVANCED_TEST_RESULTS.json` - Advanced test results

### Documentation (`docs/`)

Test plans and reports:
- `manual-test-multi-replace.md` - Multi-replace manual test guide
- `test-multi-replace-fix.md` - Multi-replace fix documentation
- `test-new-file-support.md` - New file support tests
- `*.mermaid` - Test flow diagrams

### Manual Tests (`manual/`)

Scripts for manual testing:
- `interactive-test.js` - Interactive testing script
- `run-test.bat` - Windows test runner

## 🔧 Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from '@jest/globals';
import { parseXML } from '../src/utils/xml-parser';

describe('XML Parser', () => {
  it('should parse valid XML', () => {
    const xml = '<root><item>test</item></root>';
    const result = parseXML(xml);
    expect(result).toBeDefined();
  });
});
```

### Integration Test Example

```typescript
import * as vscode from 'vscode';
import { activate } from '../src/extension';

describe('Extension Integration', () => {
  it('should activate successfully', async () => {
    const context = await activate();
    expect(context).toBeDefined();
>>>>>>> d2e5d0be381feac13dde12603dd01edbdb87c3ec
  });
});
```

<<<<<<< HEAD
### 2. 使用 Mock

```typescript
// Mock 函数
const mockFn = jest.fn();
mockFn.mockReturnValue('value');
mockFn.mockResolvedValue('async value');

// Mock VSCode API
const mockShow = vscode.window.showInformationMessage as any;
mockShow.mockResolvedValue('OK');
```

### 3. 测试异步代码

```typescript
it('should handle async', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});
```

### 4. 测试错误

```typescript
it('should throw error', () => {
  expect(() => {
    throwError();
  }).toThrow('Error message');
});

it('should reject promise', async () => {
  await expect(
    asyncFunction()
  ).rejects.toThrow('Error message');
});
```

## 调试测试

### 在 VSCode 中调试

1. 在测试文件中设置断点
2. 按 F5 或点击"运行和调试"
3. 选择 "Jest Tests" 配置
4. 测试将在断点处暂停

### 使用 console.log

```typescript
it('should debug', () => {
  const result = someFunction();
  console.log('Result:', result);
  expect(result).toBe(expected);
});
```

### 只运行特定测试

```typescript
// 只运行这个测试
it.only('should run only this', () => {
  // ...
});

// 跳过这个测试
it.skip('should skip this', () => {
  // ...
});
```

## 持续集成

### GitHub Actions

测试会在以下情况自动运行：
- Push 到主分支
- 创建 Pull Request
- 手动触发

### 本地 CI 模拟

```bash
# 运行所有检查
pnpm run lint
pnpm test
pnpm run build
```

## 测试报告

详细的测试报告和文档：

- [Context7 测试总结](../docs/CONTEXT7_TESTING_SUMMARY.md)
- [Context7 测试报告](../docs/CONTEXT7_TEST_REPORT.md)
- [VSCode Mock 指南](../docs/VSCODE_MOCK_GUIDE.md)

## 贡献指南

### 添加新测试

1. 在适当的目录创建测试文件
2. 使用描述性的测试名称
3. 遵循现有的测试模式
4. 确保测试独立且可重复
5. 添加必要的文档

### 测试命名规范

```typescript
// 好的命名
it('should return user when ID is valid', () => {});
it('should throw error when input is empty', () => {});

// 不好的命名
it('test 1', () => {});
it('works', () => {});
```

### 提交测试

1. 确保所有测试通过
2. 检查代码覆盖率
3. 更新相关文档
4. 提交 Pull Request

## 常见问题

### Q: 测试失败怎么办？

A: 
1. 检查错误消息
2. 确认测试环境正确
3. 清除 node_modules 并重新安装
4. 检查 mock 是否正确设置

### Q: 如何提高测试速度？

A:
1. 使用 `--maxWorkers=4` 限制并行数
2. 只运行相关测试
3. 使用 mock 避免真实 API 调用

### Q: 如何测试 VSCode 扩展？

A:
1. 使用提供的 VSCode mock
2. 参考 `example-vscode-mock.test.ts`
3. 查看 mock 文档

## 资源

- [Jest 文档](https://jestjs.io/)
- [VSCode 测试指南](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [TypeScript 测试](https://www.typescriptlang.org/docs/handbook/testing.html)

## 许可证

AGPL-3.0-or-later
=======
## 📊 Test Coverage

Run coverage report:

```bash
cd extension
pnpm run test:coverage
```

## 🐛 Debugging Tests

### VS Code Debugger

1. Open test file
2. Set breakpoints
3. Press F5 or use "Debug Test" CodeLens

### Command Line

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## 🤝 Contributing

When adding new features:
1. Write tests first (TDD)
2. Ensure all tests pass
3. Maintain >80% coverage
4. Document test cases

---

**Happy Testing! 🦋**
>>>>>>> d2e5d0be381feac13dde12603dd01edbdb87c3ec

