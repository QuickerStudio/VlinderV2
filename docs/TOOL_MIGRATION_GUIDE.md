# VSCode Copilot Chat 工具移植指南

## 📋 目标工具清单

从 VSCode Copilot Chat 移植到 Vlinder 系统的工具：

### 🎯 优先级 1 - 编辑工具 (4个)
- ✅ **ReplaceString** - 精确字符串替换
- ✅ **MultiReplaceString** - 批量字符串替换
- ✅ **InsertEdit** - 插入编辑到文件
- ✅ **ApplyPatch** - 应用补丁

### 🎯 优先级 2 - 诊断与网络工具 (4个)
- ✅ **GetErrors** - 获取编译/lint错误
- ✅ **FetchWebPage** - 网页抓取
- ✅ **VSCodeAPI** - VSCode API文档
- ✅ **InstallExtension** - 安装扩展

### 🎯 优先级 3 - 终端工具 (3个)
- ✅ **GetTerminalOutput** - 获取终端输出
- ✅ **TerminalLastCommand** - 终端最后命令
- ✅ **EditFilesPlaceholder** - 编辑文件占位符

---

## 🏗️ 系统架构对比

### VSCode Copilot Chat 架构
```
LanguageModelTool (VSCode API)
    ↓
ICopilotTool (扩展接口)
    ├── invoke() - 工具执行
    ├── prepareInvocation() - 准备调用
    ├── provideInput() - 提供输入
    └── resolveInput() - 解析输入
    ↓
ToolsService (工具服务)
    ├── 工具注册
    ├── 输入验证 (AJV)
    └── 工具调用
    ↓
Prompt-TSX (结果渲染)
```

### Vlinder 系统架构
```
BaseAgentTool (基础工具类)
    ↓
具体工具实现
    └── execute() - 工具执行
    ↓
ToolExecutor (工具执行器)
    ├── 工具注册
    ├── 队列管理
    └── 工具调用
    ↓
React UI (结果渲染)
```

---

## 🔄 核心概念映射

| VSCode Copilot | Vlinder | 说明 |
|----------------|---------|------|
| `ICopilotTool<T>` | `BaseAgentTool<T>` | 工具基类 |
| `invoke()` | `execute()` | 工具执行方法 |
| `prepareInvocation()` | `ask()` 中的 pending 状态 | 准备调用 |
| `LanguageModelToolResult` | `ToolResponseV2` | 工具返回类型 |
| `Prompt-TSX` | React 组件 | UI 渲染 |
| `ToolsService` | `ToolExecutor` | 工具管理 |
| `ToolRegistry` | `toolMap` in `createTool()` | 工具注册 |
| `package.json` contributions | `schema/*.ts` | 工具定义 |

---

## 📝 移植步骤模板

### Step 1: 创建 Schema 文件
**位置**: `extension/src/agent/v1/tools/schema/[tool-name].ts`

```typescript
import { z } from "zod"

/**
 * @tool tool_name
 * @description 工具描述
 * @schema
 * {
 *   param1: string;
 *   param2?: number;
 * }
 * @example
 * ```xml
 * <tool name="tool_name">
 *   <param1>value</param1>
 * </tool>
 * ```
 */
const schema = z.object({
  param1: z.string().describe("参数1描述"),
  param2: z.number().optional().describe("参数2描述"),
})

const examples = [
  `<tool name="tool_name">
  <param1>value</param1>
</tool>`,
]

export const toolNameTool = {
  schema: {
    name: "tool_name",
    schema,
  },
  examples,
}

export type ToolNameParams = {
  name: "tool_name"
  input: z.infer<typeof schema>
}
```

### Step 2: 创建 Runner 文件
**位置**: `extension/src/agent/v1/tools/runners/[tool-name].tool.ts`

```typescript
import { BaseAgentTool } from "../base-agent.tool"
import { ToolNameParams } from "../schema/tool-name"
import { ToolResponseV2 } from "../../types"

export class ToolNameTool extends BaseAgentTool<ToolNameParams> {
  async execute(): Promise<ToolResponseV2> {
    const { input, ask, say, updateAsk } = this.params
    
    // 1. 验证输入
    if (!input.param1) {
      await say("error", "Missing required parameter")
      return this.toolResponse("error", "Error: param1 is required")
    }
    
    // 2. 请求用户批准
    const { response, text, images } = await ask(
      "tool",
      {
        tool: {
          tool: "tool_name",
          param1: input.param1,
          approvalState: "pending",
          ts: this.ts,
        },
      },
      this.ts
    )
    
    // 3. 处理拒绝
    if (response !== "yesButtonTapped") {
      await updateAsk(
        "tool",
        {
          tool: {
            tool: "tool_name",
            approvalState: "rejected",
            userFeedback: text,
            ts: this.ts,
          },
        },
        this.ts
      )
      await say("user_feedback", text ?? "The user denied this operation.", images)
      return this.toolResponse("feedback", this.formatToolDenied(), images)
    }
    
    // 4. 执行工具逻辑
    try {
      const result = await this.performToolAction(input)
      
      // 5. 更新为成功状态
      await updateAsk(
        "tool",
        {
          tool: {
            tool: "tool_name",
            approvalState: "approved",
            result: result,
            ts: this.ts,
          },
        },
        this.ts
      )
      
      return this.toolResponse("success", result)
    } catch (error) {
      // 6. 处理错误
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      await updateAsk(
        "tool",
        {
          tool: {
            tool: "tool_name",
            approvalState: "error",
            error: errorMessage,
            ts: this.ts,
          },
        },
        this.ts
      )
      
      return this.toolResponse("error", this.formatToolError(errorMessage))
    }
  }
  
  private async performToolAction(input: any): Promise<string> {
    // 实现具体的工具逻辑
    return "Tool execution result"
  }
}
```

### Step 3: 注册工具
**文件**: `extension/src/agent/v1/tools/schema/index.ts`

```typescript
import { toolNameTool } from "./tool-name"

export const tools = [
  // ... 现有工具
  toolNameTool,
]
```

**文件**: `extension/src/agent/v1/tools/index.ts`

```typescript
export { ToolNameTool } from "./runners/tool-name.tool"
```

**文件**: `extension/src/agent/v1/tools/tool-executor.ts`

```typescript
import { ToolNameTool } from "."

private createTool(params: FullToolParams<any>) {
  const toolMap = {
    // ... 现有工具
    tool_name: ToolNameTool,
  } as const
  // ...
}
```

### Step 4: 创建 UI 组件
**位置**: `extension/webview-ui-vite/src/components/chat-row/tools/[tool-name]-tool.tsx`

```typescript
import React from "react"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"

export interface ToolNameTool {
  tool: "tool_name"
  param1: string
  param2?: number
  result?: string
  error?: string
  approvalState?: "pending" | "approved" | "rejected" | "error"
  ts: number
}

export const ToolNameBlock: React.FC<ToolNameTool & { isSubMsg?: boolean }> = ({
  param1,
  param2,
  result,
  error,
  approvalState,
  ts,
  isSubMsg,
}) => {
  // 渲染操作按钮
  const renderActionButtons = () => {
    if (approvalState === "pending") {
      return (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="default"
            className="h-8 w-8 p-0"
            onClick={() => {
              vscode.postMessage({
                type: "askResponse",
                askResponse: "yesButtonTapped",
                text: "",
                images: []
              })
            }}
            title="Approve"
          >
            <Check className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => {
              vscode.postMessage({
                type: "askResponse",
                askResponse: "noButtonTapped",
                text: "",
                images: []
              })
            }}
            title="Reject"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )
    }
    return null
  }
  
  return (
    <ToolBlock
      icon={YourIcon}
      title="Tool Name"
      variant={approvalState === "approved" ? "success" : approvalState === "error" ? "destructive" : "info"}
      approvalState={approvalState}
      isSubMsg={isSubMsg}
      ts={ts}
      tool="tool_name"
      customActions={renderActionButtons()}
    >
      <div className="space-y-3">
        <p className="text-xs">
          <span className="font-semibold">Param1:</span> {param1}
        </p>
        
        {result && (
          <div className="bg-background p-2 rounded text-xs">
            {result}
          </div>
        )}
        
        {error && (
          <div className="bg-destructive/20 p-2 rounded text-xs text-destructive">
            {error}
          </div>
        )}
      </div>
    </ToolBlock>
  )
}
```

### Step 5: 注册 UI 组件
**文件**: `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx`

```typescript
import { ToolNameBlock, ToolNameTool } from "./tools/tool-name-tool"

// 添加到类型定义
export type ChatTool =
  | // ... 现有工具
  | ToolNameTool

// 添加到 ToolRenderer
export const ToolRenderer: React.FC<{
  tool: ChatTool
  hasNextMessage?: boolean
}> = ({ tool }) => {
  switch (tool.tool) {
    // ... 现有工具
    case "tool_name":
      return <ToolNameBlock {...tool} />
    default:
      return null
  }
}
```

---

## 🎯 具体工具移植示例

### 示例 1: ReplaceString Tool

#### 源代码分析 (VSCode Copilot)
<augment_code_snippet path="vscode-copilot-chat-main/src/extension/tools/node/replaceStringTool.tsx" mode="EXCERPT">
````typescript
export interface IReplaceStringToolParams {
  explanation: string;
  filePath: string;
  oldString: string;
  newString: string;
}

export class ReplaceStringTool extends AbstractReplaceStringTool<IReplaceStringToolParams> {
  async invoke(options: vscode.LanguageModelToolInvocationOptions<IReplaceStringToolParams>, token: vscode.CancellationToken) {
    const prepared = await this.prepareEditsForFile(options, options.input, token);
    return this.applyAllEdits(options, [prepared], token);
  }
}
````
</augment_code_snippet>

#### 移植到 Vlinder

**Schema** (`extension/src/agent/v1/tools/schema/replace-string.ts`):
```typescript
import { z } from "zod"

const schema = z.object({
  filePath: z.string().describe("The absolute path to the file to edit"),
  oldString: z.string().describe("The exact string to replace (must match exactly including whitespace)"),
  newString: z.string().describe("The new string to replace with"),
  explanation: z.string().describe("Brief explanation of why this replacement is being made"),
})

const examples = [
  `<tool name="replace_string_in_file">
  <filePath>/absolute/path/to/file.ts</filePath>
  <oldString>    function oldName() {
        return 42;
    }</oldString>
  <newString>    function newName() {
        return 42;
    }</newString>
  <explanation>Rename function to match new naming convention</explanation>
</tool>`,
]

export const replaceStringTool = {
  schema: {
    name: "replace_string_in_file",
    schema,
  },
  examples,
}

export type ReplaceStringParams = {
  name: "replace_string_in_file"
  input: z.infer<typeof schema>
}
```

**Runner** (`extension/src/agent/v1/tools/runners/replace-string.tool.ts`):
```typescript
import { BaseAgentTool } from "../base-agent.tool"
import { ReplaceStringParams } from "../schema/replace-string"
import { ToolResponseV2 } from "../../types"
import * as vscode from "vscode"
import * as path from "path"

export class ReplaceStringTool extends BaseAgentTool<ReplaceStringParams> {
  async execute(): Promise<ToolResponseV2> {
    const { input, ask, say, updateAsk } = this.params
    const { filePath, oldString, newString, explanation } = input
    
    // 1. 验证输入
    if (!filePath || oldString === undefined || newString === undefined) {
      await say("error", "Missing required parameters")
      return this.toolResponse("error", "Error: filePath, oldString, and newString are required")
    }
    
    // 2. 检查文件是否存在
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(this.cwd, filePath)
    const uri = vscode.Uri.file(absolutePath)
    
    try {
      await vscode.workspace.fs.stat(uri)
    } catch (error) {
      await say("error", `File not found: ${filePath}`)
      return this.toolResponse("error", `Error: File does not exist: ${filePath}`)
    }
    
    // 3. 读取文件内容
    const document = await vscode.workspace.openTextDocument(uri)
    const content = document.getText()
    
    // 4. 检查 oldString 是否存在
    const index = content.indexOf(oldString)
    if (index === -1) {
      await say("error", "String not found in file")
      return this.toolResponse(
        "error",
        `Error: The oldString was not found in the file. Make sure it matches exactly, including whitespace and line breaks.`
      )
    }
    
    // 5. 检查是否有多个匹配
    const lastIndex = content.lastIndexOf(oldString)
    if (index !== lastIndex) {
      await say("error", "Multiple matches found")
      return this.toolResponse(
        "error",
        `Error: The oldString appears multiple times in the file. Please provide more context to make it unique.`
      )
    }
    
    // 6. 请求用户批准
    const { response, text, images } = await ask(
      "tool",
      {
        tool: {
          tool: "replace_string_in_file",
          filePath,
          oldString,
          newString,
          explanation,
          approvalState: "pending",
          ts: this.ts,
        },
      },
      this.ts
    )
    
    // 7. 处理拒绝
    if (response !== "yesButtonTapped") {
      await updateAsk(
        "tool",
        {
          tool: {
            tool: "replace_string_in_file",
            approvalState: "rejected",
            userFeedback: text,
            ts: this.ts,
          },
        },
        this.ts
      )
      await say("user_feedback", text ?? "The user denied this operation.", images)
      return this.toolResponse("feedback", this.formatToolDenied(), images)
    }
    
    // 8. 执行替换
    try {
      const edit = new vscode.WorkspaceEdit()
      const startPos = document.positionAt(index)
      const endPos = document.positionAt(index + oldString.length)
      const range = new vscode.Range(startPos, endPos)
      
      edit.replace(uri, range, newString)
      const success = await vscode.workspace.applyEdit(edit)
      
      if (!success) {
        throw new Error("Failed to apply edit")
      }
      
      // 9. 保存文件
      await document.save()
      
      // 10. 更新为成功状态
      await updateAsk(
        "tool",
        {
          tool: {
            tool: "replace_string_in_file",
            approvalState: "approved",
            filePath,
            oldString,
            newString,
            explanation,
            ts: this.ts,
          },
        },
        this.ts
      )
      
      const result = `<replace_string_response>
  <status>success</status>
  <file>${filePath}</file>
  <explanation>${explanation}</explanation>
  <changes>
    <old_length>${oldString.length}</old_length>
    <new_length>${newString.length}</new_length>
  </changes>
</replace_string_response>`
      
      return this.toolResponse("success", result)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      await updateAsk(
        "tool",
        {
          tool: {
            tool: "replace_string_in_file",
            approvalState: "error",
            error: errorMessage,
            ts: this.ts,
          },
        },
        this.ts
      )
      
      return this.toolResponse("error", this.formatToolError(errorMessage))
    }
  }
}
```

---

## 📊 移植进度追踪

| 工具名称 | Schema | Runner | UI | 测试 | 状态 |
|---------|--------|--------|----|----|------|
| ReplaceString | ⬜ | ⬜ | ⬜ | ⬜ | 待开始 |
| MultiReplaceString | ⬜ | ⬜ | ⬜ | ⬜ | 待开始 |
| InsertEdit | ⬜ | ⬜ | ⬜ | ⬜ | 待开始 |
| ApplyPatch | ⬜ | ⬜ | ⬜ | ⬜ | 待开始 |
| GetErrors | ⬜ | ⬜ | ⬜ | ⬜ | 待开始 |
| FetchWebPage | ✅ | ✅ | ✅ | ⬜ | 已完成 |
| VSCodeAPI | ⬜ | ⬜ | ⬜ | ⬜ | 待开始 |
| InstallExtension | ⬜ | ⬜ | ⬜ | ⬜ | 待开始 |
| GetTerminalOutput | ⬜ | ⬜ | ⬜ | ⬜ | 待开始 |
| TerminalLastCommand | ⬜ | ⬜ | ⬜ | ⬜ | 待开始 |
| EditFilesPlaceholder | ⬜ | ⬜ | ⬜ | ⬜ | 待开始 |

---

## 🔍 关键差异点

### 1. 工具返回格式
- **VSCode**: 使用 `LanguageModelToolResult` 和 Prompt-TSX
- **Vlinder**: 使用 `ToolResponseV2` 和 XML 格式字符串

### 2. 用户批准流程
- **VSCode**: `prepareInvocation()` → `invoke()`
- **Vlinder**: `ask("tool", { approvalState: "pending" })` → `updateAsk({ approvalState: "approved" })`

### 3. 依赖注入
- **VSCode**: 构造函数注入 `@IServiceName`
- **Vlinder**: 通过 `this.MainAgent` 和 `options` 访问服务

### 4. UI 渲染
- **VSCode**: Prompt-TSX 组件
- **Vlinder**: React 组件 + ToolBlock 包装器

---

## ⚠️ 注意事项

1. **路径处理**: Vlinder 使用 `this.cwd` 作为工作目录，需要正确处理相对路径
2. **错误处理**: 必须使用 `try-catch` 并更新 `approvalState` 为 "error"
3. **用户反馈**: 拒绝时必须调用 `say("user_feedback", ...)` 传递用户输入
4. **XML 格式**: 返回结果应使用 XML 格式以便 LLM 解析
5. **状态同步**: `ask` 和 `updateAsk` 必须配对使用，确保 UI 状态正确

---

## 📚 参考资源

- [Vlinder 工具创建指南](./TOOL_CREATION_GUIDE.md)
- [VSCode Copilot 工具分析](./vscode-copilot-chat-tools-analysis.md)
- [VSCode Copilot 快速参考](./vscode-copilot-tools-quick-reference.md)
- [Kill Bash 工具分析](./KILL_BASH_TOOL_ANALYSIS.md)

---

**下一步**: 选择一个工具开始移植，建议从 `ReplaceString` 开始，因为它相对简单且有完整的参考实现。

