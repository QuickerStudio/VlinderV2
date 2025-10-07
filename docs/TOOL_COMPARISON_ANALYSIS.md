# 工具对比分析 (Tool Comparison Analysis)

本文档详细对比 vscode-copilot-chat 和我们系统的工具实现差异。

## 📊 工具实现对比表

| 工具名称 | vscode-copilot-chat | 我们的系统 | 复杂度 | 依赖 VSCode API |
|---------|---------------------|-----------|--------|----------------|
| ReplaceString | ✅ | ⏳ | ⭐⭐ | 部分 |
| MultiReplaceString | ✅ | ⏳ | ⭐⭐⭐ | 部分 |
| GetErrors | ✅ | ⏳ | ⭐⭐⭐⭐ | 是 |
| VSCodeAPI | ✅ | ⏳ | ⭐⭐⭐ | 是 |
| InstallExtension | ✅ | ⏳ | ⭐⭐⭐ | 是 |
| EditFile | ✅ | ⏳ | ⭐⭐⭐⭐⭐ | 是 |
| FetchWebPage | ✅ | ✅ | ⭐⭐⭐ | 否 |
| GetTerminalOutput | ✅ | ⏳ | ⭐⭐⭐ | 是 |
| TerminalLastCommand | ✅ | ⏳ | ⭐⭐ | 是 |

## 🔍 详细工具分析

### 1. ReplaceString (replace_string_in_file)

#### vscode-copilot-chat 实现

**文件**: `vscode-copilot-chat-main/src/extension/tools/node/replaceStringTool.tsx`

```typescript
export interface IReplaceStringToolParams {
    explanation: string;
    filePath: string;
    oldString: string;
    newString: string;
}

export class ReplaceStringTool extends AbstractReplaceStringTool<IReplaceStringToolParams> {
    public static toolName = ToolName.ReplaceString;

    protected override urisForInput(input: IReplaceStringToolParams): readonly URI[] {
        return [resolveToolInputPath(input.filePath, this.promptPathRepresentationService)];
    }

    async invoke(options: vscode.LanguageModelToolInvocationOptions<IReplaceStringToolParams>, token: vscode.CancellationToken) {
        const prepared = await this.prepareEditsForFile(options, options.input, token);
        return this.applyAllEdits(options, [prepared], token);
    }

    protected override toolName(): ToolName {
        return ReplaceStringTool.toolName;
    }
}
```

**关键依赖**:
- `AbstractReplaceStringTool` - 抽象基类，处理编辑逻辑
- `IPromptPathRepresentationService` - 路径解析服务
- `resolveToolInputPath` - 路径解析工具函数

#### 我们系统的实现建议

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
            
            // 2. 检查文件是否存在
            try {
                await fs.access(absolutePath)
            } catch {
                return this.toolResponse(
                    `错误：文件不存在 ${filePath}`,
                    false
                )
            }
            
            // 3. 读取文件内容
            const content = await fs.readFile(absolutePath, "utf-8")
            
            // 4. 检查是否包含要替换的字符串
            if (!content.includes(oldString)) {
                return this.toolResponse(
                    `错误：在文件 ${filePath} 中未找到字符串\n期望找到：\n${oldString}`,
                    false
                )
            }
            
            // 5. 计算替换次数
            const occurrences = (content.match(new RegExp(escapeRegExp(oldString), 'g')) || []).length
            
            // 6. 执行替换（只替换第一次出现）
            const newContent = content.replace(oldString, newString)
            
            // 7. 写入文件
            await fs.writeFile(absolutePath, newContent, "utf-8")
            
            // 8. 返回成功结果
            const message = [
                `✅ 成功替换字符串`,
                `文件: ${filePath}`,
                `说明: ${explanation}`,
                `替换次数: 1/${occurrences}`,
                occurrences > 1 ? `⚠️ 注意：文件中还有 ${occurrences - 1} 处相同的字符串未替换` : ''
            ].filter(Boolean).join('\n')
            
            return this.toolResponse(message, true)
            
        } catch (error) {
            return this.toolResponse(
                this.formatToolError(error instanceof Error ? error.message : String(error)),
                false
            )
        }
    }
}

// 辅助函数：转义正则表达式特殊字符
function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
```

**关键差异**:
1. **路径解析**: vscode-copilot-chat 使用服务，我们使用 `path.resolve`
2. **文件操作**: vscode-copilot-chat 使用 VSCode API，我们使用 Node.js `fs` 模块
3. **错误处理**: 我们需要更详细的错误信息
4. **替换逻辑**: 需要明确只替换第一次出现

---

### 2. MultiReplaceString (multi_replace_string_in_file)

#### vscode-copilot-chat 实现

**文件**: `vscode-copilot-chat-main/src/extension/tools/node/multiReplaceStringTool.tsx`

```typescript
export interface IMultiReplaceStringToolParams {
    explanation: string;
    replacements: IReplaceStringToolParams[];
}

export class MultiReplaceStringTool extends AbstractReplaceStringTool<IMultiReplaceStringToolParams> {
    async invoke(options: vscode.LanguageModelToolInvocationOptions<IMultiReplaceStringToolParams>, token: vscode.CancellationToken) {
        if (!options.input.replacements || !Array.isArray(options.input.replacements)) {
            throw new Error('Invalid input, no replacements array');
        }

        const prepared = await Promise.all(options.input.replacements.map(r => this.prepareEditsForFile(options, r, token)));

        // 统计成功和失败
        let successes = 0;
        let failures = 0;
        let individualEdits = 0;
        const uniqueUris = new ResourceSet();
        
        for (const edit of prepared) {
            uniqueUris.add(edit.uri);
            if (edit.generatedEdit.success) {
                successes++;
                individualEdits += edit.generatedEdit.textEdits.length;
            } else {
                failures++;
            }
        }

        // 合并同一文件的编辑
        for (let i = 0; i < prepared.length; i++) {
            const e1 = prepared[i];
            if (!e1.generatedEdit.success) continue;
            
            for (let k = i + 1; k < prepared.length; k++) {
                const e2 = prepared[k];
                // 合并相同 URI 的编辑
                if (!e2.generatedEdit.success || e2.uri.toString() !== e1.uri.toString()) {
                    continue;
                }
                
                prepared.splice(k, 1);
                k--;
                
                // 合并文本编辑并排序
                e1.generatedEdit.textEdits = e1.generatedEdit.textEdits.concat(e2.generatedEdit.textEdits);
                e1.generatedEdit.textEdits.sort(textEditSorter);
            }
        }

        return this.applyAllEdits(options, prepared, token);
    }
}

function textEditSorter(a: vscode.TextEdit, b: vscode.TextEdit) {
    // 按文件位置倒序排序（从后往前），避免位置偏移
    return b.range.end.compareTo(a.range.end) || b.range.start.compareTo(a.range.start);
}
```

**关键特性**:
1. **批量处理**: 支持多个替换操作
2. **智能合并**: 同一文件的多个编辑会合并
3. **位置排序**: 从后往前应用编辑，避免位置偏移
4. **统计信息**: 跟踪成功/失败次数

#### 我们系统的实现建议

```typescript
export class MultiReplaceStringTool extends BaseAgentTool<MultiReplaceStringToolParams> {
    async execute(params: AgentToolParams): Promise<ToolResponseV2> {
        const { explanation, replacements } = params.input as MultiReplaceStringToolParams["params"]
        
        if (!replacements || !Array.isArray(replacements) || replacements.length === 0) {
            return this.toolResponse("错误：没有提供替换操作", false)
        }
        
        try {
            // 1. 按文件分组替换操作
            const replacementsByFile = new Map<string, typeof replacements>()
            for (const replacement of replacements) {
                const existing = replacementsByFile.get(replacement.filePath) || []
                existing.push(replacement)
                replacementsByFile.set(replacement.filePath, existing)
            }
            
            // 2. 处理每个文件
            const results: Array<{ file: string; success: boolean; message: string }> = []
            
            for (const [filePath, fileReplacements] of replacementsByFile) {
                const absolutePath = path.resolve(this.cwd, filePath)
                
                try {
                    // 读取文件
                    let content = await fs.readFile(absolutePath, "utf-8")
                    let appliedCount = 0
                    
                    // 应用所有替换（从后往前，避免位置偏移）
                    for (const replacement of fileReplacements) {
                        if (content.includes(replacement.oldString)) {
                            content = content.replace(replacement.oldString, replacement.newString)
                            appliedCount++
                        }
                    }
                    
                    // 写回文件
                    if (appliedCount > 0) {
                        await fs.writeFile(absolutePath, content, "utf-8")
                        results.push({
                            file: filePath,
                            success: true,
                            message: `✅ 应用了 ${appliedCount}/${fileReplacements.length} 个替换`
                        })
                    } else {
                        results.push({
                            file: filePath,
                            success: false,
                            message: `⚠️ 未找到任何匹配的字符串`
                        })
                    }
                    
                } catch (error) {
                    results.push({
                        file: filePath,
                        success: false,
                        message: `❌ 错误: ${error instanceof Error ? error.message : String(error)}`
                    })
                }
            }
            
            // 3. 生成汇总报告
            const successCount = results.filter(r => r.success).length
            const failureCount = results.filter(r => !r.success).length
            
            const summary = [
                `多文件字符串替换完成`,
                `说明: ${explanation}`,
                `总计: ${results.length} 个文件`,
                `成功: ${successCount} 个`,
                `失败: ${failureCount} 个`,
                '',
                '详细结果:',
                ...results.map(r => `  ${r.file}: ${r.message}`)
            ].join('\n')
            
            return this.toolResponse(summary, failureCount === 0)
            
        } catch (error) {
            return this.toolResponse(
                this.formatToolError(error instanceof Error ? error.message : String(error)),
                false
            )
        }
    }
}
```

**实现要点**:
1. **分组处理**: 按文件路径分组
2. **顺序应用**: 在同一文件内按顺序应用替换
3. **错误隔离**: 一个文件失败不影响其他文件
4. **详细报告**: 提供每个文件的处理结果

---

### 3. GetErrors (get_errors)

#### vscode-copilot-chat 实现

**文件**: `vscode-copilot-chat-main/src/extension/tools/node/getErrorsTool.tsx`

```typescript
interface IGetErrorsParams {
    filePaths?: string[];
    ranges?: ([a: number, b: number, c: number, d: number] | undefined)[];
}

class GetErrorsTool extends Disposable implements ICopilotTool<IGetErrorsParams> {
    async invoke(options: vscode.LanguageModelToolInvocationOptions<IGetErrorsParams>, token: CancellationToken) {
        // 获取所有诊断或特定文件的诊断
        const getAll = () => this.languageDiagnosticsService.getAllDiagnostics()
            .map(d => ({ uri: d[0], diagnostics: d[1].filter(e => e.severity <= DiagnosticSeverity.Warning) }))
            .filter(d => d.diagnostics.length > 0);

        const getSome = (filePaths: string[]) => filePaths.map((filePath, i) => {
            const uri = resolveToolInputPath(filePath, this.promptPathRepresentationService);
            const range = options.input.ranges?.[i];
            
            let diagnostics = range
                ? findDiagnosticForSelectionAndPrompt(this.languageDiagnosticsService, uri, new Range(...range), undefined)
                : this.languageDiagnosticsService.getDiagnostics(uri);

            diagnostics = diagnostics.filter(d => d.severity <= DiagnosticSeverity.Warning);

            return { diagnostics, uri };
        });

        const ds = options.input.filePaths?.length ? getSome(options.input.filePaths) : getAll();

        // 打开文档并获取上下文
        const diagnostics = coalesce(await Promise.all(ds.map((async ({ uri, diagnostics }) => {
            try {
                const document = await this.workspaceService.openTextDocumentAndSnapshot(uri);
                return {
                    uri,
                    diagnostics,
                    context: { document, language: getLanguage(document) }
                };
            } catch (e) {
                return undefined;
            }
        }))));

        // 渲染结果
        const result = new ExtendedLanguageModelToolResult([
            new LanguageModelPromptTsxPart(
                await renderPromptElementJSON(this.instantiationService, DiagnosticToolOutput, 
                    { diagnosticsGroups: diagnostics, maxDiagnostics: 50 }, 
                    options.tokenizationOptions, token)
            )
        ]);

        // 设置工具结果消息
        const numDiagnostics = diagnostics.reduce((acc, { diagnostics }) => acc + diagnostics.length, 0);
        result.toolResultMessage = numDiagnostics === 0 ?
            new MarkdownString(l10n.t`Checked workspace, no problems found`) :
            new MarkdownString(l10n.t`Checked workspace, ${numDiagnostics} problems found`);

        return result;
    }
}
```

**关键特性**:
1. **灵活查询**: 支持全工作区或特定文件
2. **范围过滤**: 支持按代码范围过滤
3. **严重性过滤**: 只返回错误和警告
4. **上下文信息**: 包含文档和语言信息
5. **限制数量**: 最多返回 50 个诊断

#### 我们系统的实现建议

```typescript
import * as vscode from "vscode"

export class GetErrorsTool extends BaseAgentTool<GetErrorsToolParams> {
    async execute(params: AgentToolParams): Promise<ToolResponseV2> {
        const { filePaths, ranges } = params.input as GetErrorsToolParams["params"]

        try {
            let diagnosticsGroups: Array<{
                file: string
                diagnostics: Array<{
                    severity: string
                    message: string
                    line: number
                    column: number
                    source?: string
                }>
            }> = []

            if (filePaths && filePaths.length > 0) {
                // 获取特定文件的诊断
                for (let i = 0; i < filePaths.length; i++) {
                    const filePath = filePaths[i]
                    const absolutePath = path.resolve(this.cwd, filePath)
                    const uri = vscode.Uri.file(absolutePath)

                    // 获取诊断
                    let diagnostics = vscode.languages.getDiagnostics(uri)

                    // 过滤严重性（只保留错误和警告）
                    diagnostics = diagnostics.filter(d =>
                        d.severity === vscode.DiagnosticSeverity.Error ||
                        d.severity === vscode.DiagnosticSeverity.Warning
                    )

                    // 如果指定了范围，进一步过滤
                    if (ranges && ranges[i]) {
                        const [startLine, startChar, endLine, endChar] = ranges[i]!
                        const range = new vscode.Range(startLine, startChar, endLine, endChar)
                        diagnostics = diagnostics.filter(d => d.range.intersection(range))
                    }

                    if (diagnostics.length > 0) {
                        diagnosticsGroups.push({
                            file: filePath,
                            diagnostics: diagnostics.map(d => ({
                                severity: d.severity === vscode.DiagnosticSeverity.Error ? 'Error' : 'Warning',
                                message: d.message,
                                line: d.range.start.line + 1,
                                column: d.range.start.character + 1,
                                source: d.source
                            }))
                        })
                    }
                }
            } else {
                // 获取所有文件的诊断
                const allDiagnostics = vscode.languages.getDiagnostics()

                for (const [uri, diagnostics] of allDiagnostics) {
                    const filtered = diagnostics.filter(d =>
                        d.severity === vscode.DiagnosticSeverity.Error ||
                        d.severity === vscode.DiagnosticSeverity.Warning
                    )

                    if (filtered.length > 0) {
                        const relativePath = path.relative(this.cwd, uri.fsPath)
                        diagnosticsGroups.push({
                            file: relativePath,
                            diagnostics: filtered.map(d => ({
                                severity: d.severity === vscode.DiagnosticSeverity.Error ? 'Error' : 'Warning',
                                message: d.message,
                                line: d.range.start.line + 1,
                                column: d.range.start.character + 1,
                                source: d.source
                            }))
                        })
                    }
                }
            }

            // 限制诊断数量
            const maxDiagnostics = 50
            let totalDiagnostics = diagnosticsGroups.reduce((sum, g) => sum + g.diagnostics.length, 0)

            if (totalDiagnostics > maxDiagnostics) {
                let remaining = maxDiagnostics
                diagnosticsGroups = diagnosticsGroups.map(group => {
                    if (remaining <= 0) {
                        return { ...group, diagnostics: [] }
                    }
                    const take = Math.min(group.diagnostics.length, remaining)
                    remaining -= take
                    return { ...group, diagnostics: group.diagnostics.slice(0, take) }
                }).filter(g => g.diagnostics.length > 0)
            }

            // 格式化输出
            if (diagnosticsGroups.length === 0) {
                return this.toolResponse("✅ 未发现任何问题", true)
            }

            const output = [
                `发现 ${totalDiagnostics} 个问题${totalDiagnostics > maxDiagnostics ? ` (显示前 ${maxDiagnostics} 个)` : ''}:`,
                '',
                ...diagnosticsGroups.flatMap(group => [
                    `📄 ${group.file}:`,
                    ...group.diagnostics.map(d =>
                        `  ${d.severity === 'Error' ? '❌' : '⚠️'} [${d.line}:${d.column}] ${d.message}${d.source ? ` (${d.source})` : ''}`
                    ),
                    ''
                ])
            ].join('\n')

            return this.toolResponse(output, true)

        } catch (error) {
            return this.toolResponse(
                this.formatToolError(error instanceof Error ? error.message : String(error)),
                false
            )
        }
    }
}
```

**实现要点**:
1. **VSCode API**: 使用 `vscode.languages.getDiagnostics()`
2. **严重性过滤**: 只保留 Error 和 Warning
3. **范围支持**: 支持按代码范围过滤诊断
4. **数量限制**: 最多返回 50 个诊断
5. **友好格式**: 使用 emoji 和清晰的格式

---

### 4. VSCodeAPI (get_vscode_api)

#### vscode-copilot-chat 实现

**文件**: `vscode-copilot-chat-main/src/extension/tools/node/vscodeAPITool.ts`

```typescript
interface IVSCodeAPIToolParams {
    query: string;
}

class VSCodeAPITool implements vscode.LanguageModelTool<IVSCodeAPIToolParams> {
    async invoke(options: vscode.LanguageModelToolInvocationOptions<IVSCodeAPIToolParams>, token: CancellationToken) {
        return new LanguageModelToolResult([
            new LanguageModelPromptTsxPart(
                await renderPromptElementJSON(
                    this.instantiationService,
                    VSCodeAPIContextElement,
                    { query: options.input.query },
                    options.tokenizationOptions,
                    token
                )
            )
        ]);
    }

    prepareInvocation(options: vscode.LanguageModelToolInvocationPrepareOptions<IVSCodeAPIToolParams>, token: vscode.CancellationToken) {
        const query = `"${options.input.query}"`;
        return {
            invocationMessage: l10n.t`Searching VS Code API for ${query}`,
            pastTenseMessage: l10n.t`Searched VS Code API for ${query}`
        };
    }
}
```

**关键依赖**:
- `VSCodeAPIContextElement` - 渲染 API 文档的组件
- API 文档数据源（可能是本地索引或在线查询）

#### 我们系统的实现建议

```typescript
export class VSCodeAPITool extends BaseAgentTool<VSCodeAPIToolParams> {
    // VSCode API 文档数据（简化版，实际应该从文件或 API 加载）
    private static API_DOCS = {
        "window.showInformationMessage": {
            signature: "window.showInformationMessage(message: string, ...items: string[]): Thenable<string | undefined>",
            description: "显示信息消息给用户",
            example: `vscode.window.showInformationMessage('Hello World!');`
        },
        "workspace.openTextDocument": {
            signature: "workspace.openTextDocument(uri: Uri): Thenable<TextDocument>",
            description: "打开文本文档",
            example: `const doc = await vscode.workspace.openTextDocument(uri);`
        },
        // ... 更多 API
    }

    async execute(params: AgentToolParams): Promise<ToolResponseV2> {
        const { query } = params.input as VSCodeAPIToolParams["params"]

        try {
            // 1. 搜索相关 API
            const results = this.searchAPI(query)

            if (results.length === 0) {
                return this.toolResponse(
                    `未找到与 "${query}" 相关的 VSCode API`,
                    true
                )
            }

            // 2. 格式化结果
            const output = [
                `找到 ${results.length} 个相关的 VSCode API:`,
                '',
                ...results.map((result, index) => [
                    `${index + 1}. ${result.name}`,
                    `   签名: ${result.signature}`,
                    `   描述: ${result.description}`,
                    `   示例:`,
                    `   \`\`\`typescript`,
                    `   ${result.example}`,
                    `   \`\`\``,
                    ''
                ].join('\n'))
            ].join('\n')

            return this.toolResponse(output, true)

        } catch (error) {
            return this.toolResponse(
                this.formatToolError(error instanceof Error ? error.message : String(error)),
                false
            )
        }
    }

    private searchAPI(query: string): Array<{
        name: string
        signature: string
        description: string
        example: string
    }> {
        const lowerQuery = query.toLowerCase()
        const results: Array<any> = []

        for (const [name, doc] of Object.entries(VSCodeAPITool.API_DOCS)) {
            // 简单的关键词匹配
            if (name.toLowerCase().includes(lowerQuery) ||
                doc.description.toLowerCase().includes(lowerQuery)) {
                results.push({
                    name,
                    ...doc
                })
            }
        }

        return results.slice(0, 10) // 最多返回 10 个结果
    }
}
```

**实现要点**:
1. **API 数据源**: 需要 VSCode API 文档数据
2. **搜索算法**: 简单的关键词匹配或更复杂的语义搜索
3. **结果格式**: 包含签名、描述和示例
4. **数量限制**: 避免返回过多结果

**数据源选项**:
- 从 `@types/vscode` 包解析类型定义
- 使用 VSCode API 文档的 JSON 数据
- 在线查询 VSCode 官方文档

---

### 5. InstallExtension (install_extension)

#### vscode-copilot-chat 实现

**文件**: `vscode-copilot-chat-main/src/extension/tools/node/installExtensionTool.tsx`

```typescript
export interface IInstallExtensionToolInput {
    id: string;
    name: string;
}

class InstallExtensionTool implements vscode.LanguageModelTool<IInstallExtensionToolInput> {
    async invoke(options: vscode.LanguageModelToolInvocationOptions<IInstallExtensionToolInput>, token: CancellationToken) {
        const extensionId = options.input.id;

        // 检查是否已安装
        const existingExtension = this._extensionsService.getExtension(extensionId);
        if (existingExtension) {
            return new LanguageModelToolResult([
                new LanguageModelTextPart(`${options.input.name} extension is already installed`)
            ]);
        }

        // 安装扩展
        const insiders = this.envService.getEditorInfo().version.includes('insider');
        const args = [extensionId, {
            enable: true,
            installPreReleaseVersion: insiders ? true : false
        }];

        const exe = this._commandService.executeCommand('workbench.extensions.installExtension', ...args);

        try {
            await this.waitForExtensionInstall(exe, extensionId);
            return new LanguageModelToolResult([
                new LanguageModelTextPart(`Installed ${options.input.name} extension successfully`)
            ]);
        } catch (error) {
            return new LanguageModelToolResult([
                new LanguageModelTextPart(`Failed to install ${options.input.name} extension.`)
            ]);
        }
    }

    private async waitForExtensionInstall(prom: Promise<void>, extensionId: string) {
        await prom;
        let extension: vscode.Extension<any> | undefined;
        const maxTime = 2_000;
        const stopWatch = new StopWatch();

        do {
            extension = this._extensionsService.getExtension(extensionId);
            if (extension) {
                // 如果扩展贡献了工具，等待工具注册
                const languageModelTools = extension.packageJSON.contributes?.languageModelTools;
                if (languageModelTools && Array.isArray(languageModelTools) && languageModelTools.length) {
                    if (languageModelTools.every((tool) => this.toolsService.getTool(tool.name))) {
                        return;
                    }
                } else {
                    return;
                }
            }
            await timeout(100);
        } while (stopWatch.elapsed() < maxTime);

        if (!extension) {
            throw new Error(`Failed to install extension ${extensionId}.`);
        }
    }

    async prepareInvocation(options: vscode.LanguageModelToolInvocationPrepareOptions<IInstallExtensionToolInput>) {
        const extensionId = options.input.id;
        const existingExtension = this._extensionsService.getExtension(extensionId);

        if (existingExtension) {
            return {
                invocationMessage: l10n.t`${options.input.name} extension is already installed`
            };
        }

        const query = encodeURIComponent(JSON.stringify([[extensionId]]));
        const markdownString = new MarkdownString(
            l10n.t(`Copilot will install the extension [{0}](command:workbench.extensions.action.showExtensionsWithIds?{1}) and its dependencies.`,
            options.input.name, query)
        );
        markdownString.isTrusted = { enabledCommands: ['workbench.extensions.action.showExtensionsWithIds'] };

        return {
            invocationMessage: l10n.t`Installing extension \`${options.input.name}\``,
            confirmationMessages: {
                title: l10n.t`Install Extension \`${options.input.name}\`?`,
                message: markdownString,
            },
        };
    }
}
```


