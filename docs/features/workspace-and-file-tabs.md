# Workspace 管理器和文件标签栏功能

> **状态**: 🚧 已实现但暂时禁用  
> **原因**: 等待上下文引擎完成后再启用  
> **创建日期**: 2025-10-07  
> **预计启用**: Phase 1 完成后（InterestedFiles 系统）

---

## 概述

Workspace 管理器和文件标签栏是为 Vlinder 设计的 UI 增强功能，旨在提供更好的工作区管理和文件上下文可视化。

**核心目标**：
- 让用户清楚地看到当前工作区
- 显示 AI 正在"关注"的文件
- 提供快速的文件管理操作

**为什么暂时禁用**：
- 这些功能依赖于完善的上下文引擎
- 当前的实现使用 VSCode 的 `tabGroups` API，但应该显示 AI 跟踪的文件（InterestedFiles）
- 需要先完成 Phase 1（InterestedFiles 系统）才能正确实现

---

## 功能设计

### 1. Workspace 管理器

**位置**: Auto/Manual 开关右侧

**功能**：
- 显示当前工作区名称
- 支持多工作区项目的切换
- 提供工作区上下文信息

**UI 设计**：
```
┌─────────────────────────┐
│ 📁 Vlinder              │  ← 当前工作区名称
│   ▼                     │  ← 下拉箭头（多工作区时）
└─────────────────────────┘
```

**实现文件**：
- `extension/webview-ui-vite/src/components/chat-view/workspace-manager.tsx`
- `extension/webview-ui-vite/src/hooks/use-workspace.tsx`

### 2. 文件标签栏

**位置**: Workspace 管理器右侧

**功能**：
- 显示 AI 当前关注的文件
- 每个标签包含：
  - 📌 Pin 按钮（固定文件）
  - 📄 文件名
  - ❌ 关闭按钮
- 支持横向滚动（文件多时）

**UI 设计**：
```
┌──────────────────────────────────────────────────────────┐
│ 📌 main.ts ❌  │ 📌 types.ts ❌  │ 📄 utils.ts ❌  │ ... │
└──────────────────────────────────────────────────────────┘
```

**实现文件**：
- `extension/webview-ui-vite/src/components/chat-view/file-tabs.tsx`
- `extension/webview-ui-vite/src/hooks/use-open-files.tsx`

---

## 当前实现

### 前端组件

#### WorkspaceManager 组件

```typescript
// extension/webview-ui-vite/src/components/chat-view/workspace-manager.tsx
export function WorkspaceManager() {
  const { currentWorkspace, workspaces, selectWorkspace } = useWorkspace();
  
  return (
    <div className="flex items-center gap-2">
      <FolderIcon className="h-4 w-4" />
      {workspaces.length > 1 ? (
        <Select value={currentWorkspace} onValueChange={selectWorkspace}>
          {/* 多工作区选择器 */}
        </Select>
      ) : (
        <span>{currentWorkspace}</span>
      )}
    </div>
  );
}
```

#### FileTabs 组件

```typescript
// extension/webview-ui-vite/src/components/chat-view/file-tabs.tsx
export function FileTabs() {
  const { openFiles, closeFile, togglePin, openFile } = useOpenFiles();
  
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {openFiles.map(file => (
        <div key={file.uri} className="file-tab">
          <Button onClick={() => togglePin(file.uri)}>
            {file.isPinned ? <PinIcon /> : <PinOffIcon />}
          </Button>
          <span onClick={() => openFile(file.uri)}>{file.name}</span>
          <Button onClick={() => closeFile(file.uri)}>
            <XIcon />
          </Button>
        </div>
      ))}
    </div>
  );
}
```

### 后端消息处理

```typescript
// extension/src/providers/webview/webview-manager.ts

// Workspace 相关
private handleGetWorkspaceInfo() {
  const workspaces = vscode.workspace.workspaceFolders;
  // 返回工作区信息
}

private handleSelectWorkspaceFolder(folderUri: string) {
  // 切换工作区
}

// 文件标签相关
private handleGetOpenFiles() {
  const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs);
  // 返回打开的文件列表
}

private handleCloseFile(fileUri: string) {
  // 关闭指定文件
}

private handleTogglePinFile(fileUri: string) {
  // 切换文件的固定状态
}

private handleOpenFile(fileUri: string) {
  // 打开指定文件
}
```

### 消息类型定义

```typescript
// extension/src/types/client-message.ts
export type ClientMessage =
  | { type: 'getWorkspaceInfo' }
  | { type: 'selectWorkspaceFolder'; folderUri: string }
  | { type: 'getOpenFiles' }
  | { type: 'closeFile'; fileUri: string }
  | { type: 'togglePinFile'; fileUri: string }
  | { type: 'openFile'; fileUri: string }
  // ... 其他消息类型

// extension/src/types/extension-message.ts
export type ExtensionMessage =
  | { type: 'workspaceInfo'; workspaces: WorkspaceInfo[]; current: string }
  | { type: 'openFiles'; files: OpenFileInfo[] }
  // ... 其他消息类型
```

---

## 问题分析

### 当前实现的问题

1. **数据源错误**
   - 使用 VSCode 的 `tabGroups` API 获取打开的编辑器标签
   - 但应该显示 AI 跟踪的文件（InterestedFiles）

2. **缺少核心概念**
   - 没有 InterestedFiles 系统
   - 没有与 AI 上下文的集成

3. **功能不完整**
   - 关闭文件只是关闭编辑器标签
   - 没有从 AI 上下文中移除文件
   - Pin 功能没有实际作用

### 正确的实现方向

**应该显示的是**：AI 标记为相关的文件（InterestedFiles），而不是 VSCode 打开的标签。

```typescript
// 正确的数据流
AI 使用 add_interested_file 工具
    ↓
StateManager 存储 InterestedFile
    ↓
IOManager 持久化
    ↓
WebviewManager 发送给前端
    ↓
FileTabs 组件显示
```

---

## 正确的实现方案

### Phase 1: InterestedFiles 系统（必须先完成）

参考 `docs/context-engine-research-report.md` 第 5.1 节。

**核心数据结构**：
```typescript
interface InterestedFile {
  path: string;           // 文件的绝对路径
  why: string;            // 为什么这个文件重要
  createdAt: number;      // 添加时间
  priority: number;       // 优先级（0-100）
  isPinned: boolean;      // 是否被用户固定
  lastAccessTime: number; // 最后访问时间
}
```

**实现步骤**：
1. ✅ 扩展 `AgentState` 添加 `interestedFiles`
2. ✅ 实现 `StateManager` 的 add/remove/get 方法
3. ✅ 实现 `IOManager` 的持久化方法
4. ✅ 实现 `AddInterestedFileTool` runner
5. ✅ 实现 `WebviewManager` 消息处理
6. ✅ 实现前端 `use-interested-files` hook
7. ✅ 更新 `FileTabs` 组件使用 InterestedFiles
8. ✅ 集成到系统提示

### Phase 2: 更新 UI 组件

**更新 FileTabs 组件**：
```typescript
// 使用 InterestedFiles 而不是 VSCode tabs
export function FileTabs() {
  const { interestedFiles, removeFile, togglePin } = useInterestedFiles();
  
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {interestedFiles.map(file => (
        <div key={file.path} className="file-tab">
          <Button onClick={() => togglePin(file.path)}>
            {file.isPinned ? <PinIcon /> : <PinOffIcon />}
          </Button>
          <span title={file.why}>{path.basename(file.path)}</span>
          <Button onClick={() => removeFile(file.path)}>
            <XIcon />
          </Button>
        </div>
      ))}
    </div>
  );
}
```

**添加用户手动添加文件功能**：
```typescript
// 右键菜单：Add to AI Context
vscode.commands.registerCommand('vlinder.addToContext', async (uri) => {
  const why = await vscode.window.showInputBox({
    prompt: 'Why is this file relevant?',
    placeHolder: 'e.g., Contains authentication logic'
  });
  
  if (why) {
    stateManager.addInterestedFile({
      path: uri.fsPath,
      why,
      priority: 50,
      isPinned: false
    });
  }
});
```

---

## 启用计划

### 前置条件

- ✅ Phase 1 完成（InterestedFiles 系统）
- ✅ 系统提示集成 InterestedFiles
- ✅ AI 可以使用 `add_interested_file` 工具
- ✅ 用户可以手动添加文件到上下文

### 启用步骤

1. **取消注释代码**
   ```typescript
   // extension/webview-ui-vite/src/components/chat-view/input-area.tsx
   import { WorkspaceManager } from './workspace-manager';
   import { FileTabs } from './file-tabs';
   
   // 在 JSX 中
   <WorkspaceManager />
   <FileTabs />
   ```

2. **更新组件实现**
   - 修改 `FileTabs` 使用 `useInterestedFiles` hook
   - 添加文件详情 tooltip（显示 `why`）
   - 实现 Pin 功能（固定文件不会被压缩删除）

3. **测试功能**
   - AI 添加文件到上下文
   - 用户手动添加文件
   - Pin/Unpin 功能
   - 关闭文件（从上下文移除）
   - 文件列表持久化

4. **文档更新**
   - 用户文档：如何使用文件标签栏
   - 开发文档：InterestedFiles 系统架构

---

## 相关文件

### 前端文件
- `extension/webview-ui-vite/src/components/chat-view/workspace-manager.tsx`
- `extension/webview-ui-vite/src/components/chat-view/file-tabs.tsx`
- `extension/webview-ui-vite/src/hooks/use-workspace.tsx`
- `extension/webview-ui-vite/src/hooks/use-open-files.tsx`
- `extension/webview-ui-vite/src/components/chat-view/input-area.tsx`

### 后端文件
- `extension/src/providers/webview/webview-manager.ts`
- `extension/src/types/client-message.ts`
- `extension/src/types/extension-message.ts`

### 待创建文件（Phase 1）
- `extension/src/agent/v1/tools/runners/add-interested-file.tool.ts`
- `extension/webview-ui-vite/src/hooks/use-interested-files.tsx`

---

## 参考资料

- [上下文引擎技术研究报告](../context-engine-research-report.md)
  - 第 5.1 节：InterestedFiles 系统实现方案
  - 第 7 节：实施路线图
- [Context.ai 文档](https://docs.context.ai/)
  - Main Interface 设计
  - Knowledge Base 系统

---

## 总结

Workspace 管理器和文件标签栏是很有价值的功能，但需要建立在完善的上下文引擎之上。

**当前状态**：
- ✅ UI 组件已实现
- ✅ 基本的消息处理已完成
- ❌ 缺少 InterestedFiles 系统
- ❌ 没有与 AI 上下文集成

**下一步**：
1. 完成 Phase 1（InterestedFiles 系统）
2. 更新组件使用正确的数据源
3. 测试和优化
4. 启用功能

**预计时间**：Phase 1 完成后 1-2 周内可以启用这些功能。

