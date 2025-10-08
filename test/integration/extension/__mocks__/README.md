# VSCode Mock for Testing

这个目录包含了用于测试 VSCode 扩展的 mock 实现。

## 概述

`vscode.ts` 文件提供了 VSCode API 的 mock 实现，允许你在不依赖真实 VSCode 环境的情况下测试扩展代码。

## 已实现的 Mock

### 核心类

- **Uri**: 文件路径和 URI 处理
  - `Uri.file(path)` - 从文件路径创建 URI
  - `Uri.parse(value)` - 解析 URI 字符串
  - `with()` - 创建修改后的 URI 副本
  - `toString()` - 转换为字符串

- **Position**: 文档中的位置（行和字符）
  - `compareTo()` - 比较两个位置
  - `isEqual()`, `isBefore()`, `isAfter()` - 位置比较
  - `translate()` - 平移位置
  - `with()` - 创建新位置

- **Range**: 文档中的范围
  - `contains()` - 检查是否包含位置或范围
  - `isEqual()` - 比较范围
  - `isEmpty()` - 检查是否为空范围

- **Selection**: 选择范围（继承自 Range）
  - `isReversed()` - 检查选择方向

- **TextEdit**: 文本编辑操作
  - `TextEdit.replace()` - 替换文本
  - `TextEdit.insert()` - 插入文本
  - `TextEdit.delete()` - 删除文本

- **WorkspaceEdit**: 工作区编辑集合
  - `set()`, `get()`, `has()`, `delete()` - 管理编辑
  - `entries()` - 获取所有编辑

- **Diagnostic**: 诊断信息（错误、警告等）

- **EventEmitter**: 事件发射器
  - `event()` - 注册事件监听器
  - `fire()` - 触发事件
  - `dispose()` - 清理监听器

### 命名空间和枚举

- **workspace**: 工作区操作
  - `fs` - 文件系统操作（stat, readFile, writeFile, delete 等）
  - `openTextDocument()` - 打开文档
  - `applyEdit()` - 应用编辑
  - `findFiles()` - 查找文件
  - `getConfiguration()` - 获取配置
  - `workspaceFolders` - 工作区文件夹列表
  - `asRelativePath()` - 转换为相对路径
  - `createFileSystemWatcher()` - 创建文件监视器
  - 各种事件监听器（onDidChange*, onDidSave* 等）

- **window**: 窗口操作
  - `showInformationMessage()` - 显示信息消息
  - `showWarningMessage()` - 显示警告消息
  - `showErrorMessage()` - 显示错误消息
  - `showQuickPick()` - 显示快速选择
  - `showInputBox()` - 显示输入框
  - `createOutputChannel()` - 创建输出通道
  - `createStatusBarItem()` - 创建状态栏项
  - `showTextDocument()` - 显示文档
  - `createWebviewPanel()` - 创建 webview 面板
  - `withProgress()` - 显示进度
  - 各种事件监听器

- **commands**: 命令操作
  - `registerCommand()` - 注册命令
  - `executeCommand()` - 执行命令
  - `getCommands()` - 获取所有命令

- **languages**: 语言功能
  - `createDiagnosticCollection()` - 创建诊断集合
  - `registerCodeActionsProvider()` - 注册代码操作提供者
  - `registerCompletionItemProvider()` - 注册补全提供者
  - `registerHoverProvider()` - 注册悬停提供者
  - `registerDefinitionProvider()` - 注册定义提供者

- **env**: 环境信息
  - `appName`, `appRoot`, `language` - 应用信息
  - `clipboard` - 剪贴板操作
  - `openExternal()` - 打开外部链接
  - `asExternalUri()` - 转换为外部 URI

- **extensions**: 扩展管理
  - `getExtension()` - 获取扩展
  - `all` - 所有扩展列表
  - `onDidChange` - 扩展变化事件

- **debug**: 调试功能
  - `startDebugging()`, `stopDebugging()` - 调试控制
  - 调试会话事件

- **tasks**: 任务功能
  - `executeTask()`, `fetchTasks()` - 任务操作
  - 任务事件

### 枚举

- `DiagnosticSeverity` - 诊断严重程度
- `TextDocumentSaveReason` - 文档保存原因
- `ViewColumn` - 视图列
- `StatusBarAlignment` - 状态栏对齐方式
- `QuickPickItemKind` - 快速选择项类型
- `ProgressLocation` - 进度位置
- `ConfigurationTarget` - 配置目标
- `FileType` - 文件类型
- `OverviewRulerLane` - 概览标尺通道
- `DecorationRangeBehavior` - 装饰范围行为

## 使用方法

### 1. 基本测试

```typescript
import { describe, it, expect } from '@jest/globals';
import * as vscode from 'vscode';

describe('My Extension', () => {
  it('should create a URI', () => {
    const uri = vscode.Uri.file('/path/to/file.ts');
    expect(uri.fsPath).toBe('/path/to/file.ts');
  });
});
```

### 2. Mock 函数返回值

```typescript
it('should show message', async () => {
  const mockShow = vscode.window.showInformationMessage as any;
  mockShow.mockResolvedValue('OK');
  
  const result = await vscode.window.showInformationMessage('Test', 'OK');
  expect(result).toBe('OK');
});
```

### 3. Mock 配置

```typescript
it('should read configuration', () => {
  const config = vscode.workspace.getConfiguration('myExt');
  const mockGet = config.get as any;
  mockGet.mockReturnValue('testValue');
  
  expect(config.get('setting')).toBe('testValue');
});
```

### 4. Mock 文件系统操作

```typescript
it('should read file', async () => {
  const mockRead = vscode.workspace.fs.readFile as any;
  mockRead.mockResolvedValue(Buffer.from('file content'));
  
  const content = await vscode.workspace.fs.readFile(uri);
  expect(content.toString()).toBe('file content');
});
```

### 5. 测试事件

```typescript
it('should handle events', () => {
  const emitter = new vscode.EventEmitter<string>();
  const listener = jest.fn();
  
  emitter.event(listener);
  emitter.fire('test');
  
  expect(listener).toHaveBeenCalledWith('test');
});
```

### 6. 测试命令

```typescript
it('should register command', () => {
  const callback = jest.fn();
  vscode.commands.registerCommand('my.command', callback);
  
  expect(vscode.commands.registerCommand).toHaveBeenCalled();
});
```

## Mock 函数 API

每个 mock 函数都支持以下方法：

- `mockReturnValue(value)` - 设置返回值
- `mockResolvedValue(value)` - 设置 Promise 解析值
- `mockRejectedValue(error)` - 设置 Promise 拒绝值
- `mockImplementation(fn)` - 设置自定义实现
- `mockClear()` - 清除调用记录

## 运行测试

```bash
# 在 extension 目录下运行所有测试
cd extension
pnpm test

# 运行特定测试文件
pnpm test example-vscode-mock.test.ts

# 运行测试并查看覆盖率
pnpm test --coverage
```

## 示例

查看 `test/extension/example-vscode-mock.test.ts` 获取完整的使用示例。

## 扩展 Mock

如果需要添加更多 VSCode API 的 mock：

1. 在 `vscode.ts` 中添加相应的类或函数
2. 使用 `mockFn()` 创建可 mock 的函数
3. 为复杂对象提供合理的默认值
4. 在示例测试中添加使用示例

## 注意事项

- 这个 mock 实现了 VSCode API 的核心功能，但不是完整实现
- 某些复杂的 API 可能需要根据具体需求进行扩展
- Mock 函数默认返回 `undefined`，需要在测试中设置期望的返回值
- 使用 `jest.clearAllMocks()` 在每个测试前清理 mock 状态

## 相关资源

- [VSCode API 文档](https://code.visualstudio.com/api/references/vscode-api)
- [Jest 文档](https://jestjs.io/)
- [VSCode 扩展测试指南](https://code.visualstudio.com/api/working-with-extensions/testing-extension)

