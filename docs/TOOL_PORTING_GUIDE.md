# 工具移植学习指南 (Tool Porting Guide)

本文档详细说明如何从 vscode-copilot-chat 移植工具到我们的系统中。

## 📋 目标工具清单

需要移植的编辑工具（4个核心工具）：

1. ✅ **FetchWebPage** (`fetch_webpage`) - 已完成
2. ⏳ **VSCodeAPI** (`get_vscode_api`) - 待移植
3. ⏳ **InstallExtension** (`install_extension`) - 待移植  
4. ⏳ **MultiReplaceString** (`multi_replace_string_in_file`) - 待移植
5. ⏳ **ReplaceString** (`replace_string_in_file`) - 待移植
6. ⏳ **GetErrors** (`get_errors`) - 待移植
7. ⏳ **EditFilesPlaceholder** (`fast-editor`) - 待移植
8. ⏳ **CoreGetTerminalOutput** (`get_terminal_output`) - 待移植
9. ⏳ **CoreTerminalLastCommand** (`terminal_last_command`) - 待移植
10. ⏳ **EditFile** (`insert_edit_into_file`) - 待移植

## 🗂️ 相关目录结构

### 源代码（vscode-copilot-chat）
```
vscode-copilot-chat-main/src/extension/tools/
├── common/
│   ├── toolNames.ts              # 工具名称枚举定义
│   ├── toolsRegistry.ts          # 工具注册系统
│   └── toolsService.ts           # 工具服务
├── node/                         # Node.js 环境工具实现
│   ├── replaceStringTool.tsx
│   ├── multiReplaceStringTool.tsx
│   ├── insertEditTool.tsx
│   ├── getErrorsTool.tsx
│   ├── installExtensionTool.tsx
│   └── vscodeAPITool.ts
└── vscode-node/                  # VSCode 特定工具
    └── fetchWebPageTool.tsx
```

### 目标系统
```
extension/src/agent/v1/tools/
├── schema/                       # Zod 模式定义
│   ├── index.ts                 # 工具注册中心
│   └── [tool-name].ts           # 各工具的 schema
├── runners/                      # 工具执行器
│   ├── coders/                  # 代码编辑相关工具
│   └── [tool-name].tool.ts      # 各工具的执行逻辑
└── types/
    └── index.ts                 # 类型定义

extension/webview-ui-vite/src/components/chat-row/tools/
└── [tool-name]-tool.tsx         # UI 组件
```

## 🔄 工具架构对比

### vscode-copilot-chat 架构
```typescript
// 1. 工具名称定义
export enum ToolName {
    ReplaceString = 'replace_string_in_file',
    GetErrors = 'get_errors',
}

// 2. 工具接口
interface ICopilotTool<TParams> {
    invoke(options: LanguageModelToolInvocationOptions<TParams>, token: CancellationToken): Promise<LanguageModelToolResult>
    prepareInvocation?(options: LanguageModelToolInvocationPrepareOptions<TParams>, token: CancellationToken): ProviderResult<PreparedToolInvocation>
}

// 3. 工具注册
ToolRegistry.registerTool(ReplaceStringTool);
```

### 我们的系统架构
```typescript
// 1. Schema 定义 (Zod)
export const replaceStringToolSchema = z.object({
    name: z.literal("replace_string_in_file"),
    params: z.object({
        filePath: z.string().describe("文件路径"),
        oldString: z.string().describe("要替换的旧字符串"),
        newString: z.string().describe("新字符串"),
    })
})

// 2. 工具执行器 (BaseAgentTool)
export class ReplaceStringTool extends BaseAgentTool<ReplaceStringToolParams> {
    async execute(params: AgentToolParams): Promise<ToolResponseV2> {
        // 实现逻辑
    }
}

// 3. 工具注册 (多处)
// - schema/index.ts: 添加到 tools 数组
// - tool-executor.ts: 添加到 toolMap
// - prompts/tools/index.ts: 添加 prompt 定义
```

## 📝 完整移植步骤

### 步骤 1: 创建 Schema 定义

**文件**: `extension/src/agent/v1/tools/schema/[tool-name].ts`

```typescript
import { z } from "zod"

/**
 * @tool replace_string_in_file
 * @description 在文件中查找并替换字符串
 */
export const replaceStringToolSchema = z.object({
    name: z.literal("replace_string_in_file"),
    params: z.object({
        explanation: z.string().describe("解释为什么要进行此替换"),
        filePath: z.string().describe("要编辑的文件路径"),
        oldString: z.string().describe("要查找的精确字符串"),
        newString: z.string().describe("替换后的新字符串"),
    })
})

export type ReplaceStringToolParams = z.infer<typeof replaceStringToolSchema>

export const replaceStringTool = {
    schema: replaceStringToolSchema,
    examples: [
        {
            description: "替换函数名称",
            output: `<replace_string_in_file>
<explanation>将旧的函数名更新为新的命名约定</explanation>
<file_path>src/utils.ts</file_path>
<old_string>function oldName() {</old_string>
<new_string>function newName() {</new_string>
</replace_string_in_file>`
        }
    ]
} as const
```

### 步骤 2: 创建工具执行器

**文件**: `extension/src/agent/v1/tools/runners/replace-string.tool.ts`

```typescript
import { BaseAgentTool } from "../base-agent.tool"
import { AgentToolParams, ToolResponseV2 } from "../types"
import { ReplaceStringToolParams } from "../schema/replace-string"
import * as fs from "fs/promises"
import * as path from "path"

export class ReplaceStringTool extends BaseAgentTool<ReplaceStringToolParams> {
    async execute(params: AgentToolParams): Promise<ToolResponseV2> {
        const { filePath, oldString, newString, explanation } = params.input as ReplaceStringToolParams["params"]
        
        try {
            // 1. 解析文件路径
            const absolutePath = path.resolve(this.cwd, filePath)
            
            // 2. 读取文件内容
            const content = await fs.readFile(absolutePath, "utf-8")
            
            // 3. 检查是否包含要替换的字符串
            if (!content.includes(oldString)) {
                return this.toolResponse(
                    `错误：在文件 ${filePath} 中未找到字符串 "${oldString}"`,
                    false
                )
            }
            
            // 4. 执行替换
            const newContent = content.replace(oldString, newString)
            
            // 5. 写入文件
            await fs.writeFile(absolutePath, newContent, "utf-8")
            
            // 6. 返回成功结果
            return this.toolResponse(
                `成功替换：${explanation}\n文件：${filePath}\n旧字符串：${oldString}\n新字符串：${newString}`,
                true
            )
            
        } catch (error) {
            return this.toolResponse(
                this.formatToolError(error instanceof Error ? error.message : String(error)),
                false
            )
        }
    }
}
```

### 步骤 3: 创建 Prompt 定义

**文件**: `extension/src/agent/v1/prompts/tools/replace-string.ts`

```typescript
import { ToolPromptSchema } from "./types"

export const replaceStringPrompt: ToolPromptSchema = {
    name: "replace_string_in_file",
    description: "在文件中查找并精确替换字符串。适用于简单的文本替换操作。",
    parameters: {
        explanation: {
            type: "string",
            description: "解释为什么要进行此替换",
            required: true
        },
        filePath: {
            type: "string", 
            description: "要编辑的文件路径（相对于工作区根目录）",
            required: true
        },
        oldString: {
            type: "string",
            description: "要查找的精确字符串（必须完全匹配，包括空格和换行）",
            required: true
        },
        newString: {
            type: "string",
            description: "替换后的新字符串",
            required: true
        }
    },
    capabilities: [
        "精确字符串匹配和替换",
        "保留文件的其他内容不变",
        "支持多行字符串替换",
        "LIMITATIONS: 只替换第一次出现的匹配，如需替换多处请使用 multi_replace_string_in_file"
    ],
    examples: [
        {
            description: "更新函数名称",
            output: `<replace_string_in_file>
<explanation>重命名函数以符合新的命名约定</explanation>
<file_path>src/utils.ts</file_path>
<old_string>export function calculateTotal(items: Item[]) {</old_string>
<new_string>export function computeTotal(items: Item[]) {</new_string>
</replace_string_in_file>`
        }
    ]
}
```

### 步骤 4: 注册工具到系统

#### A. 更新 Schema 注册 (`schema/index.ts`)

```typescript
import { replaceStringTool } from "./replace-string"

export const tools = [
    // ... 其他工具
    replaceStringTool,
] as const
```

#### B. 更新类型定义 (`tools/types/index.ts`)

```typescript
import { ReplaceStringToolParams } from "../schema/replace-string"

export type ToolParams =
    | ReplaceStringToolParams
    // ... 其他工具类型
```

#### C. 更新工具执行器映射 (`tool-executor.ts`)

```typescript
import { ReplaceStringTool } from "./runners/replace-string.tool"

const toolMap = {
    replace_string_in_file: ReplaceStringTool,
    // ... 其他工具
}
```

#### D. 注册 Prompt (`prompts/tools/index.ts`)

```typescript
import { replaceStringPrompt } from "./replace-string"

export const toolPrompts = [
    replaceStringPrompt,
    // ... 其他 prompts
]
```

#### E. 导出工具 (`tools/index.ts`)

```typescript
export * from "./runners/replace-string.tool"
```

### 步骤 5: 创建 UI 组件

**文件**: `webview-ui-vite/src/components/chat-row/tools/replace-string-tool.tsx`

```typescript
import React from "react"
import { ReplaceStringTool } from "extension/shared/new-tools"
import { ToolBlock } from "./tool-block"
import { FileEdit } from "lucide-react"

type ToolAddons = {
    isExpanded?: boolean
    onToggleExpand?: () => void
}

export const ReplaceStringBlock: React.FC<ReplaceStringTool & ToolAddons> = (props) => {
    const { path, oldString, newString, explanation, isExpanded, onToggleExpand } = props

    return (
        <ToolBlock
            tool="replace_string_in_file"
            variant={props.status === "error" ? "error" : "default"}
            icon={FileEdit}
            summary={`替换字符串: ${path}`}
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
        >
            <div className="space-y-2">
                <div>
                    <strong>文件:</strong> {path}
                </div>
                <div>
                    <strong>说明:</strong> {explanation}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <strong>旧字符串:</strong>
                        <pre className="mt-1 p-2 bg-red-50 rounded">{oldString}</pre>
                    </div>
                    <div>
                        <strong>新字符串:</strong>
                        <pre className="mt-1 p-2 bg-green-50 rounded">{newString}</pre>
                    </div>
                </div>
            </div>
        </ToolBlock>
    )
}
```

### 步骤 6: 注册 UI 组件

#### A. 更新工具渲染器 (`chat-tools.tsx`)

```typescript
import { ReplaceStringTool } from "extension/shared/new-tools"
import { ReplaceStringBlock } from "./tools/replace-string-tool"

const ToolRenderer: React.FC<ChatTool> = (tool) => {
    switch (tool.tool) {
        case "replace_string_in_file":
            return <ReplaceStringBlock {...(tool as ReplaceStringTool)} />
        // ... 其他工具
    }
}
```

#### B. 更新类型定义 (`shared/new-tools.ts`)

```typescript
export interface ReplaceStringTool {
    tool: "replace_string_in_file"
    path: string
    oldString: string
    newString: string
    explanation: string
    status?: "pending" | "success" | "error"
}

export type ChatTool =
    | ReplaceStringTool
    // ... 其他工具类型
```

## 🎯 各工具移植要点

### 1. ReplaceString & MultiReplaceString

**核心功能**: 字符串查找和替换

**关键代码**:
```typescript
// vscode-copilot-chat 实现
protected override urisForInput(input: IReplaceStringToolParams): readonly URI[] {
    return [resolveToolInputPath(input.filePath, this.promptPathRepresentationService)]
}

async invoke(options: vscode.LanguageModelToolInvocationOptions<IReplaceStringToolParams>, token: vscode.CancellationToken) {
    const prepared = await this.prepareEditsForFile(options, options.input, token)
    return this.applyAllEdits(options, [prepared], token)
}
```

**移植要点**:
- 使用 `fs.readFile` 和 `fs.writeFile` 替代 VSCode API
- 实现精确字符串匹配逻辑
- MultiReplace 需要处理多个替换操作的合并和排序
- 注意处理文件编码问题

### 2. GetErrors

**核心功能**: 获取工作区诊断错误

**关键代码**:
```typescript
// vscode-copilot-chat 实现
const getAll = () => this.languageDiagnosticsService.getAllDiagnostics()
    .map(d => ({ uri: d[0], diagnostics: d[1].filter(e => e.severity <= DiagnosticSeverity.Warning) }))
    .filter(d => d.diagnostics.length > 0)
```

**移植要点**:
- 需要集成 VSCode 的诊断 API
- 过滤错误和警告级别
- 支持按文件路径和范围过滤
- 格式化诊断信息为可读文本

### 3. VSCodeAPI

**核心功能**: 搜索 VSCode API 文档

**关键代码**:
```typescript
// vscode-copilot-chat 实现
async invoke(options: vscode.LanguageModelToolInvocationOptions<IVSCodeAPIToolParams>, token: CancellationToken) {
    return new LanguageModelToolResult([
        new LanguageModelPromptTsxPart(
            await renderPromptElementJSON(this.instantiationService, VSCodeAPIContextElement,
                { query: options.input.query }, options.tokenizationOptions, token))
    ])
}
```

**移植要点**:
- 需要 VSCode API 文档数据源
- 实现语义搜索功能
- 返回相关 API 文档片段
- 可能需要本地索引或在线查询

### 4. InstallExtension

**核心功能**: 安装 VSCode 扩展

**关键代码**:
```typescript
// vscode-copilot-chat 实现
const args = [extensionId, { enable: true, installPreReleaseVersion: insiders ? true : false }]
const exe = this._commandService.executeCommand('workbench.extensions.installExtension', ...args)
await this.waitForExtensionInstall(exe, extensionId)
```

**移植要点**:
- 使用 VSCode 扩展 API
- 需要用户确认机制
- 等待扩展安装完成
- 处理安装失败情况

### 5. EditFile (insert_edit_into_file)

**核心功能**: 在文件中插入或编辑代码块

**关键代码**:
```typescript
// vscode-copilot-chat 实现
const internalOptions = {
    ...options,
    input: {
        ...options.input,
        uri
    }
}
await this.toolsService.invokeTool(InternalEditToolId, internalOptions, token)
```

**移植要点**:
- 需要代码映射服务 (code mapper)
- 智能定位插入位置
- 处理缩进和格式化
- 支持 Notebook 文件编辑

### 6. Terminal 相关工具

**CoreGetTerminalOutput** 和 **CoreTerminalLastCommand**

**移植要点**:
- 集成终端 API
- 捕获终端输出
- 解析最后执行的命令
- 处理多个终端实例

## 🔍 关键差异对比

| 特性 | vscode-copilot-chat | 我们的系统 |
|------|---------------------|-----------|
| Schema 定义 | TypeScript Interface | Zod Schema |
| 工具注册 | ToolRegistry.registerTool() | 多处注册（schema/index.ts, tool-executor.ts 等） |
| 依赖注入 | @IInstantiationService | 构造函数参数 |
| 返回类型 | LanguageModelToolResult | ToolResponseV2 |
| UI 渲染 | PromptElement (TSX) | React 组件 |
| 确认机制 | prepareInvocation() | ask() 方法 |

## ✅ 移植检查清单

每个工具移植完成后，确保完成以下所有步骤：

### 后端实现
- [ ] 创建 Schema 定义文件 (`schema/[tool-name].ts`)
- [ ] 创建 Runner 执行器文件 (`runners/[tool-name].tool.ts`)
- [ ] 创建 Prompt 定义文件 (`prompts/tools/[tool-name].ts`)
- [ ] 更新后端类型定义 (`tools/types/index.ts`)
- [ ] 更新前端类型定义 (`shared/new-tools.ts`)
- [ ] 注册 Schema (`schema/index.ts`)
- [ ] 注册执行器 (`tools/index.ts`, `tool-executor.ts`)
- [ ] 注册 Prompts (`prompts/tools/index.ts`)

### 前端实现
- [ ] 创建 UI 组件 (`webview-ui-vite/src/components/chat-row/tools/[tool-name]-tool.tsx`)
- [ ] 注册 UI 组件 (`chat-tools.tsx`)
- [ ] 配置按钮映射 (`use-message-handler.ts`)

### 验证测试
- [ ] 运行类型检查 (`pnpm run check-types`)
- [ ] 运行代码检查 (`pnpm run lint`)
- [ ] 运行完整构建 (`pnpm run build`)
- [ ] 测试工具功能和 UI 显示

## 📚 参考资源

### 已完成的工具示例
- `web_fetch.ts` - 完整实现示例（推荐参考）
- `file-editor.tool.ts` - 文件编辑工具
- `execute-command.tool.ts` - 复杂交互示例

### 源代码参考
- `vscode-copilot-chat-main/src/extension/tools/` - 原始工具实现
- `extension/src/agent/v1/tools/` - 我们的工具系统

## 🚀 下一步行动

建议按以下优先级移植工具：

1. **高优先级** (核心编辑功能):
   - ReplaceString
   - MultiReplaceString
   - GetErrors

2. **中优先级** (辅助功能):
   - EditFile (insert_edit_into_file)
   - VSCodeAPI

3. **低优先级** (扩展功能):
   - InstallExtension
   - Terminal 相关工具
   - EditFilesPlaceholder

每完成一个工具，更新本文档中的状态标记（⏳ → ✅）。

