# VSCode Mock 使用指南

## 概述

项目已经配置了完整的 VSCode API mock，可以在不依赖真实 VSCode 环境的情况下测试扩展代码。

## 已安装的包

- ✅ `jest` - 测试框架
- ✅ `ts-jest` - TypeScript 支持
- ✅ `@jest/globals` - Jest 全局 API
- ✅ `@types/jest` - Jest 类型定义
- ✅ `@vscode/test-web` - VSCode Web 测试工具
- ✅ `jest-mock` - Jest mock 工具

## 快速开始

### 1. 创建测试文件

在 `test/extension/` 目录下创建 `.test.ts` 文件：

```typescript
import { describe, it, expect } from '@jest/globals';
import * as vscode from 'vscode';

describe('My Feature', () => {
  it('should work', () => {
    const uri = vscode.Uri.file('/test/file.ts');
    expect(uri.fsPath).toBe('/test/file.ts');
  });
});
```

### 2. 运行测试

```bash
cd extension
pnpm test                           # 运行所有测试
pnpm test my-feature.test.ts        # 运行特定测试
pnpm test -- --coverage             # 查看覆盖率
pnpm test -- --watch                # 监视模式
```

## 常用 Mock 模式

### Mock 消息提示

```typescript
it('should show message', async () => {
  const mockShow = vscode.window.showInformationMessage as any;
  mockShow.mockResolvedValue('Yes');
  
  const result = await vscode.window.showInformationMessage(
    'Continue?', 
    'Yes', 
    'No'
  );
  
  expect(result).toBe('Yes');
  expect(mockShow).toHaveBeenCalledWith('Continue?', 'Yes', 'No');
});
```

### Mock 文件系统

```typescript
it('should read file', async () => {
  const mockRead = vscode.workspace.fs.readFile as any;
  mockRead.mockResolvedValue(Buffer.from('content'));
  
  const uri = vscode.Uri.file('/test/file.txt');
  const content = await vscode.workspace.fs.readFile(uri);
  
  expect(content.toString()).toBe('content');
});
```

### Mock 配置

```typescript
it('should read config', () => {
  const config = vscode.workspace.getConfiguration('myExt');
  const mockGet = config.get as any;
  mockGet.mockReturnValue(true);
  
  expect(config.get('enabled')).toBe(true);
});
```

### Mock 命令

```typescript
it('should execute command', async () => {
  const mockExecute = vscode.commands.executeCommand as any;
  mockExecute.mockResolvedValue({ success: true });
  
  const result = await vscode.commands.executeCommand('my.command');
  expect(result.success).toBe(true);
});
```

### Mock 输入框

```typescript
it('should get user input', async () => {
  const mockInput = vscode.window.showInputBox as any;
  mockInput.mockResolvedValue('user input');
  
  const input = await vscode.window.showInputBox({
    prompt: 'Enter name'
  });
  
  expect(input).toBe('user input');
});
```

### Mock 快速选择

```typescript
it('should show quick pick', async () => {
  const mockPick = vscode.window.showQuickPick as any;
  mockPick.mockResolvedValue({ label: 'Option 1' });
  
  const items = [
    { label: 'Option 1' },
    { label: 'Option 2' }
  ];
  
  const selected = await vscode.window.showQuickPick(items);
  expect(selected?.label).toBe('Option 1');
});
```

### Mock 进度提示

```typescript
it('should show progress', async () => {
  const result = await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification },
    async (progress) => {
      progress.report({ message: 'Working...' });
      return 'done';
    }
  );
  
  expect(result).toBe('done');
});
```

### 测试事件

```typescript
it('should handle events', () => {
  const emitter = new vscode.EventEmitter<string>();
  const listener = jest.fn();
  
  const disposable = emitter.event(listener);
  
  emitter.fire('event1');
  emitter.fire('event2');
  
  expect(listener).toHaveBeenCalledTimes(2);
  expect(listener).toHaveBeenCalledWith('event1');
  
  disposable.dispose();
  emitter.fire('event3');
  expect(listener).toHaveBeenCalledTimes(2); // 不再调用
});
```

### 测试诊断

```typescript
it('should create diagnostics', () => {
  const collection = vscode.languages.createDiagnosticCollection('test');
  
  const uri = vscode.Uri.file('/test/file.ts');
  const diagnostic = new vscode.Diagnostic(
    new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(0, 5)
    ),
    'Error message',
    vscode.DiagnosticSeverity.Error
  );
  
  collection.set(uri, [diagnostic]);
  expect(collection.set).toHaveBeenCalled();
});
```

## 高级用法

### 自定义 Mock 实现

```typescript
it('should use custom implementation', () => {
  const mockFn = vscode.workspace.findFiles as any;
  
  mockFn.mockImplementation(async (pattern: string) => {
    if (pattern === '**/*.ts') {
      return [
        vscode.Uri.file('/test/file1.ts'),
        vscode.Uri.file('/test/file2.ts')
      ];
    }
    return [];
  });
  
  const files = await vscode.workspace.findFiles('**/*.ts');
  expect(files).toHaveLength(2);
});
```

### 验证调用次数

```typescript
it('should call function multiple times', () => {
  const mockShow = vscode.window.showInformationMessage as any;
  
  vscode.window.showInformationMessage('Message 1');
  vscode.window.showInformationMessage('Message 2');
  
  expect(mockShow).toHaveBeenCalledTimes(2);
  expect(mockShow.mock.calls[0][0]).toBe('Message 1');
  expect(mockShow.mock.calls[1][0]).toBe('Message 2');
});
```

### 清理 Mock

```typescript
describe('My Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // 清除所有 mock 的调用记录
  });
  
  it('test 1', () => {
    // ...
  });
  
  it('test 2', () => {
    // 每个测试都有干净的 mock 状态
  });
});
```

### Mock 链式调用

```typescript
it('should chain mock calls', () => {
  const mockGet = vscode.workspace.getConfiguration as any;
  
  mockGet.mockReturnValue({
    get: jest.fn()
      .mockReturnValueOnce('value1')
      .mockReturnValueOnce('value2')
  });
  
  const config = vscode.workspace.getConfiguration('test');
  expect(config.get('key')).toBe('value1');
  expect(config.get('key')).toBe('value2');
});
```

## 测试最佳实践

### 1. 使用描述性的测试名称

```typescript
// ❌ 不好
it('test 1', () => { ... });

// ✅ 好
it('should show error message when file not found', () => { ... });
```

### 2. 每个测试只测试一件事

```typescript
// ❌ 不好
it('should do everything', () => {
  // 测试多个不相关的功能
});

// ✅ 好
it('should validate input', () => { ... });
it('should save to file', () => { ... });
it('should show success message', () => { ... });
```

### 3. 使用 beforeEach 设置通用状态

```typescript
describe('File Operations', () => {
  let mockUri: vscode.Uri;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockUri = vscode.Uri.file('/test/file.ts');
  });
  
  it('should read file', () => {
    // 使用 mockUri
  });
  
  it('should write file', () => {
    // 使用 mockUri
  });
});
```

### 4. 测试错误情况

```typescript
it('should handle file read error', async () => {
  const mockRead = vscode.workspace.fs.readFile as any;
  mockRead.mockRejectedValue(new Error('File not found'));
  
  await expect(
    vscode.workspace.fs.readFile(uri)
  ).rejects.toThrow('File not found');
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
  console.log('Result:', result); // 会在测试输出中显示
  expect(result).toBe(expected);
});
```

### 只运行特定测试

```typescript
// 只运行这个测试
it.only('should run only this test', () => {
  // ...
});

// 跳过这个测试
it.skip('should skip this test', () => {
  // ...
});
```

## 示例文件

查看以下文件获取完整示例：

- `test/extension/example-vscode-mock.test.ts` - 完整的使用示例
- `test/extension/__mocks__/vscode.ts` - Mock 实现
- `test/extension/__mocks__/README.md` - 详细文档

## 常见问题

### Q: Mock 函数没有被识别为 mock？

A: 确保使用类型断言：
```typescript
const mockFn = vscode.window.showInformationMessage as any;
mockFn.mockResolvedValue('result');
```

### Q: 如何 mock 工作区文件夹？

A: 直接修改 `workspace.workspaceFolders`：
```typescript
vscode.workspace.workspaceFolders = [
  {
    uri: vscode.Uri.file('/custom/path'),
    name: 'my-workspace',
    index: 0
  }
];
```

### Q: 如何测试异步代码？

A: 使用 async/await：
```typescript
it('should handle async', async () => {
  const result = await asyncFunction();
  expect(result).toBe(expected);
});
```

## 相关资源

- [Jest 文档](https://jestjs.io/)
- [VSCode API 文档](https://code.visualstudio.com/api/references/vscode-api)
- [VSCode 扩展测试](https://code.visualstudio.com/api/working-with-extensions/testing-extension)

