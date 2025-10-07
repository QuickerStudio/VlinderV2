# 工具移植详细示例

本文档提供完整的工具移植示例代码，可直接复制使用。

---

## 📝 示例 1: GetErrors Tool

### 源代码分析

VSCode Copilot 的 GetErrors 工具特点：
- 使用 `ILanguageDiagnosticsService` 获取诊断信息
- 支持指定文件路径或获取所有错误
- 使用 Prompt-TSX 渲染结果
- 提供 `provideInput()` 自动从上下文获取文件

### 完整移植代码

#### 1. Schema (`extension/src/agent/v1/tools/schema/get-errors.ts`)

```typescript
import { z } from "zod"

/**
 * @tool get_errors
 * @description Gets compilation errors, linting issues, and warnings from the workspace. Can check specific files or all files with problems. Returns detailed diagnostic information including severity, message, location, and related information.
 * @schema
 * {
 *   filePaths?: string[]; // Optional array of file paths to check. If not provided, checks all files with diagnostics.
 * }
 * @example
 * ```xml
 * <tool name="get_errors">
 *   <filePaths>
 *     <path>/path/to/file1.ts</path>
 *     <path>/path/to/file2.ts</path>
 *   </filePaths>
 * </tool>
 * ```
 * @example
 * ```xml
 * <tool name="get_errors">
 * </tool>
 * ```
 */
const schema = z.object({
  filePaths: z
    .array(z.string())
    .optional()
    .describe("Optional array of file paths to check for errors. If not provided, checks all files with diagnostics."),
})

const examples = [
  `<tool name="get_errors">
  <filePaths>
    <path>/path/to/file1.ts</path>
    <path>/path/to/file2.ts</path>
  </filePaths>
</tool>`,

  `<tool name="get_errors">
</tool>`,
]

export const getErrorsTool = {
  schema: {
    name: "get_errors",
    schema,
  },
  examples,
}

export type GetErrorsParams = {
  name: "get_errors"
  input: z.infer<typeof schema>
}
```

#### 2. Runner (`extension/src/agent/v1/tools/runners/get-errors.tool.ts`)

```typescript
import { BaseAgentTool } from "../base-agent.tool"
import { GetErrorsParams } from "../schema/get-errors"
import { ToolResponseV2 } from "../../types"
import * as vscode from "vscode"
import * as path from "path"

export class GetErrorsTool extends BaseAgentTool<GetErrorsParams> {
  async execute(): Promise<ToolResponseV2> {
    const { input, say } = this.params
    const { filePaths } = input

    try {
      // 获取诊断信息
      const diagnosticsData = await this.getDiagnostics(filePaths)

      if (diagnosticsData.length === 0) {
        const message = filePaths?.length
          ? `No errors or warnings found in the specified files.`
          : `No errors or warnings found in the workspace.`

        await say("text", message)
        return this.toolResponse("success", `<get_errors_response>
  <status>success</status>
  <message>${message}</message>
  <diagnostics_count>0</diagnostics_count>
</get_errors_response>`)
      }

      // 格式化诊断信息
      const formattedDiagnostics = this.formatDiagnostics(diagnosticsData)
      const totalCount = diagnosticsData.reduce((sum, d) => sum + d.diagnostics.length, 0)

      const result = `<get_errors_response>
  <status>success</status>
  <diagnostics_count>${totalCount}</diagnostics_count>
  <files_count>${diagnosticsData.length}</files_count>
  <diagnostics>
${formattedDiagnostics}
  </diagnostics>
</get_errors_response>`

      return this.toolResponse("success", result)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      await say("error", `Failed to get errors: ${errorMessage}`)
      return this.toolResponse("error", this.formatToolError(errorMessage))
    }
  }

  private async getDiagnostics(filePaths?: string[]): Promise<
    Array<{
      uri: vscode.Uri
      filePath: string
      diagnostics: vscode.Diagnostic[]
    }>
  > {
    if (filePaths && filePaths.length > 0) {
      // 获取指定文件的诊断信息
      const results: Array<{
        uri: vscode.Uri
        filePath: string
        diagnostics: vscode.Diagnostic[]
      }> = []

      for (const filePath of filePaths) {
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(this.cwd, filePath)
        const uri = vscode.Uri.file(absolutePath)

        // 获取该文件的诊断信息
        const diagnostics = vscode.languages.getDiagnostics(uri)

        // 只包含错误和警告
        const filtered = diagnostics.filter(
          (d) => d.severity === vscode.DiagnosticSeverity.Error || d.severity === vscode.DiagnosticSeverity.Warning
        )

        if (filtered.length > 0) {
          results.push({
            uri,
            filePath,
            diagnostics: filtered,
          })
        }
      }

      return results
    } else {
      // 获取所有文件的诊断信息
      const allDiagnostics = vscode.languages.getDiagnostics()
      const results: Array<{
        uri: vscode.Uri
        filePath: string
        diagnostics: vscode.Diagnostic[]
      }> = []

      for (const [uri, diagnostics] of allDiagnostics) {
        // 只包含错误和警告
        const filtered = diagnostics.filter(
          (d) => d.severity === vscode.DiagnosticSeverity.Error || d.severity === vscode.DiagnosticSeverity.Warning
        )

        if (filtered.length > 0) {
          results.push({
            uri,
            filePath: uri.fsPath,
            diagnostics: filtered,
          })
        }
      }

      return results
    }
  }

  private formatDiagnostics(
    diagnosticsData: Array<{
      uri: vscode.Uri
      filePath: string
      diagnostics: vscode.Diagnostic[]
    }>
  ): string {
    return diagnosticsData
      .map((fileData) => {
        const diagnosticsXml = fileData.diagnostics
          .map((diagnostic) => {
            const severity = this.getSeverityString(diagnostic.severity)
            const range = diagnostic.range
            const source = diagnostic.source ? `<source>${this.escapeXml(diagnostic.source)}</source>` : ""
            const code = diagnostic.code ? `<code>${this.escapeXml(String(diagnostic.code))}</code>` : ""

            return `      <diagnostic>
        <severity>${severity}</severity>
        <message>${this.escapeXml(diagnostic.message)}</message>
        <range>
          <start>
            <line>${range.start.line}</line>
            <character>${range.start.character}</character>
          </start>
          <end>
            <line>${range.end.line}</line>
            <character>${range.end.character}</character>
          </end>
        </range>
        ${source}
        ${code}
      </diagnostic>`
          })
          .join("\n")

        return `    <file>
      <path>${this.escapeXml(fileData.filePath)}</path>
      <diagnostics_count>${fileData.diagnostics.length}</diagnostics_count>
      <diagnostics>
${diagnosticsXml}
      </diagnostics>
    </file>`
      })
      .join("\n")
  }

  private getSeverityString(severity: vscode.DiagnosticSeverity): string {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return "error"
      case vscode.DiagnosticSeverity.Warning:
        return "warning"
      case vscode.DiagnosticSeverity.Information:
        return "information"
      case vscode.DiagnosticSeverity.Hint:
        return "hint"
      default:
        return "unknown"
    }
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
  }
}
```

#### 3. UI Component (`extension/webview-ui-vite/src/components/chat-row/tools/get-errors-tool.tsx`)

```typescript
import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, FileText } from "lucide-react"
import { ToolBlock } from "../chat-tools"

export interface GetErrorsTool {
  tool: "get_errors"
  filePaths?: string[]
  diagnosticsCount?: number
  filesCount?: number
  diagnostics?: Array<{
    filePath: string
    diagnosticsCount: number
    diagnostics: Array<{
      severity: "error" | "warning" | "information" | "hint"
      message: string
      range: {
        start: { line: number; character: number }
        end: { line: number; character: number }
      }
      source?: string
      code?: string
    }>
  }>
  approvalState?: "pending" | "approved" | "rejected" | "error"
  ts: number
}

export const GetErrorsBlock: React.FC<GetErrorsTool & { isSubMsg?: boolean }> = ({
  filePaths,
  diagnosticsCount,
  filesCount,
  diagnostics,
  approvalState,
  ts,
  isSubMsg,
}) => {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())

  const toggleFile = (filePath: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(filePath)) {
        next.delete(filePath)
      } else {
        next.add(filePath)
      }
      return next
    })
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-blue-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "text-red-600"
      case "warning":
        return "text-yellow-600"
      default:
        return "text-blue-600"
    }
  }

  return (
    <ToolBlock
      icon={FileText}
      title="Get Errors"
      variant={diagnosticsCount === 0 ? "success" : "info"}
      approvalState={approvalState}
      isSubMsg={isSubMsg}
      ts={ts}
      tool="get_errors"
      summary={
        diagnosticsCount !== undefined
          ? `${diagnosticsCount} problem${diagnosticsCount !== 1 ? "s" : ""} in ${filesCount} file${filesCount !== 1 ? "s" : ""}`
          : undefined
      }
    >
      <div className="space-y-3">
        {/* Summary */}
        {diagnosticsCount !== undefined && (
          <div className="flex items-center space-x-2">
            {diagnosticsCount === 0 ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600">No errors or warnings found</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">
                  Found {diagnosticsCount} problem{diagnosticsCount !== 1 ? "s" : ""} in {filesCount} file
                  {filesCount !== 1 ? "s" : ""}
                </span>
              </>
            )}
          </div>
        )}

        {/* Diagnostics by file */}
        {diagnostics && diagnostics.length > 0 && (
          <div className="space-y-2">
            {diagnostics.map((fileData, fileIndex) => {
              const isExpanded = expandedFiles.has(fileData.filePath)

              return (
                <div key={fileIndex} className="border rounded-md overflow-hidden">
                  {/* File header */}
                  <button
                    onClick={() => toggleFile(fileData.filePath)}
                    className="w-full flex items-center justify-between p-2 bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">{fileData.filePath}</span>
                      <span className="text-xs text-muted-foreground">
                        ({fileData.diagnosticsCount} problem{fileData.diagnosticsCount !== 1 ? "s" : ""})
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {/* Diagnostics list */}
                  {isExpanded && (
                    <div className="p-2 space-y-2">
                      {fileData.diagnostics.map((diagnostic, diagIndex) => (
                        <div key={diagIndex} className="flex items-start space-x-2 p-2 bg-background rounded">
                          {getSeverityIcon(diagnostic.severity)}
                          <div className="flex-1 space-y-1">
                            <p className={`text-sm font-medium ${getSeverityColor(diagnostic.severity)}`}>
                              {diagnostic.message}
                            </p>
                            <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                              <span>
                                Line {diagnostic.range.start.line + 1}:{diagnostic.range.start.character}
                              </span>
                              {diagnostic.source && <span>Source: {diagnostic.source}</span>}
                              {diagnostic.code && <span>Code: {diagnostic.code}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Checked files info */}
        {filePaths && filePaths.length > 0 && (
          <div className="text-xs text-muted-foreground">
            <p>Checked files:</p>
            <ul className="list-disc list-inside ml-2">
              {filePaths.map((filePath, index) => (
                <li key={index}>{filePath}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ToolBlock>
  )
}
```

#### 4. 注册工具

**Schema 注册** (`extension/src/agent/v1/tools/schema/index.ts`):
```typescript
import { getErrorsTool } from "./get-errors"

export const tools = [
  // ... existing tools
  getErrorsTool,
]
```

**Runner 导出** (`extension/src/agent/v1/tools/index.ts`):
```typescript
export { GetErrorsTool } from "./runners/get-errors.tool"
```

**Tool Executor** (`extension/src/agent/v1/tools/tool-executor.ts`):
```typescript
import { GetErrorsTool } from "."

private createTool(params: FullToolParams<any>) {
  const toolMap = {
    // ... existing tools
    get_errors: GetErrorsTool,
  } as const
  // ...
}
```

**UI 注册** (`extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx`):
```typescript
import { GetErrorsBlock, GetErrorsTool } from "./tools/get-errors-tool"

export type ChatTool =
  | // ... existing tools
  | GetErrorsTool

export const ToolRenderer: React.FC<{
  tool: ChatTool
  hasNextMessage?: boolean
}> = ({ tool }) => {
  switch (tool.tool) {
    // ... existing tools
    case "get_errors":
      return <GetErrorsBlock {...tool} />
    default:
      return null
  }
}
```

---

## 🎯 关键实现要点

### 1. 诊断信息获取
```typescript
// VSCode API 提供两种方式获取诊断信息：
// 1. 获取特定文件的诊断
const diagnostics = vscode.languages.getDiagnostics(uri)

// 2. 获取所有文件的诊断
const allDiagnostics = vscode.languages.getDiagnostics()
```

### 2. 严重级别过滤
```typescript
// 只包含错误和警告
const filtered = diagnostics.filter(
  (d) => 
    d.severity === vscode.DiagnosticSeverity.Error || 
    d.severity === vscode.DiagnosticSeverity.Warning
)
```

### 3. XML 转义
```typescript
private escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
```

### 4. UI 状态管理
```typescript
// 使用 useState 管理展开/折叠状态
const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())

const toggleFile = (filePath: string) => {
  setExpandedFiles((prev) => {
    const next = new Set(prev)
    if (next.has(filePath)) {
      next.delete(filePath)
    } else {
      next.add(filePath)
    }
    return next
  })
}
```

---

## 📊 测试用例

### 测试 1: 获取所有错误
```xml
<tool name="get_errors">
</tool>
```

**预期结果**:
- 返回工作区中所有文件的错误和警告
- 按文件分组显示
- 包含错误位置、消息、来源等信息

### 测试 2: 获取特定文件错误
```xml
<tool name="get_errors">
  <filePaths>
    <path>/path/to/file.ts</path>
  </filePaths>
</tool>
```

**预期结果**:
- 只返回指定文件的错误和警告
- 如果文件没有错误，返回成功消息

### 测试 3: 无错误情况
```xml
<tool name="get_errors">
</tool>
```

**预期结果** (当没有错误时):
```xml
<get_errors_response>
  <status>success</status>
  <message>No errors or warnings found in the workspace.</message>
  <diagnostics_count>0</diagnostics_count>
</get_errors_response>
```

---

## 🔍 与 VSCode Copilot 的差异

| 特性 | VSCode Copilot | Vlinder |
|------|----------------|---------|
| 诊断服务 | `ILanguageDiagnosticsService` | `vscode.languages.getDiagnostics()` |
| 结果渲染 | Prompt-TSX | React 组件 |
| 自动输入 | `provideInput()` | 手动实现 |
| 范围支持 | 支持 `ranges` 参数 | 简化版，只支持文件路径 |
| 上下文集成 | 自动从 `promptContext` 获取 | 需要手动传递 |

---

## 💡 优化建议

1. **性能优化**: 对于大型工作区，考虑限制返回的诊断数量
2. **缓存**: 可以缓存诊断结果，避免重复查询
3. **过滤选项**: 添加按严重级别过滤的选项
4. **排序**: 按严重级别或文件名排序
5. **上下文感知**: 自动检测当前打开的文件并优先显示其错误

---

**下一步**: 继续移植其他工具，如 `InstallExtension`、`VSCodeAPI` 等。

