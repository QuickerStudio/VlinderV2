# VSCode Copilot Chat 工具系统详细分析

## 目录
1. [架构概览](#架构概览)
2. [核心组件](#核心组件)
3. [工具分类](#工具分类)
4. [工具实现模式](#工具实现模式)
5. [虚拟工具系统](#虚拟工具系统)
6. [工具注册与管理](#工具注册与管理)
7. [关键设计模式](#关键设计模式)

---

## 架构概览

VSCode Copilot Chat 的工具系统是一个复杂的、可扩展的架构，允许 LLM (大语言模型) 通过调用工具来执行各种操作。

### 核心架构层次

```
┌─────────────────────────────────────────────────────────┐
│                    LLM (Language Model)                  │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              Tool Selection & Invocation                 │
│  (ToolsService, ToolGrouping, VirtualTools)             │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  Tool Registry                           │
│  (ToolRegistry, ICopilotTool, LanguageModelTool)        │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              Individual Tool Implementations             │
│  (ReadFile, CodebaseTool, EditFile, etc.)               │
└─────────────────────────────────────────────────────────┘
```

---

## 核心组件

### 1. **ToolNames.ts** - 工具命名系统

定义了两套命名约定：

#### ToolName (模型面向的名称)
```typescript
export enum ToolName {
    ApplyPatch = 'apply_patch',
    Codebase = 'semantic_search',
    ReadFile = 'read_file',
    FindFiles = 'file_search',
    FindTextInFiles = 'grep_search',
    EditFile = 'insert_edit_into_file',
    CreateFile = 'create_file',
    // ... 更多工具
}
```

#### ContributedToolName (VSCode 扩展名称)
```typescript
export enum ContributedToolName {
    ApplyPatch = 'copilot_applyPatch',
    Codebase = 'copilot_searchCodebase',
    ReadFile = 'copilot_readFile',
    FindFiles = 'copilot_findFiles',
    // ... 更多工具
}
```

**设计理念**：
- `ToolName`: 简洁、描述性强，便于 LLM 理解
- `ContributedToolName`: 带 `copilot_` 前缀，避免命名冲突
- 双向映射函数：`getContributedToolName()` 和 `getToolName()`

### 2. **ToolsRegistry.ts** - 工具注册中心

#### ICopilotTool 接口
扩展了标准的 `vscode.LanguageModelTool`，提供额外功能：

```typescript
export interface ICopilotTool<T> extends vscode.LanguageModelTool<T> {
    // 编辑过滤 - 在应用编辑前显示确认
    filterEdits?(resource: URI): Promise<IEditFilterData | undefined>;
    
    // 输入提供 - 当工具被引用时提供输入
    provideInput?(promptContext: IBuildPromptContext): Promise<T | undefined>;
    
    // 输入解析 - 在工具调用前修改/增强输入
    resolveInput?(input: T, promptContext: IBuildPromptContext, mode: CopilotToolMode): Promise<T>;
    
    // 替代定义 - 通过实验功能动态修改工具定义
    alternativeDefinition?(): vscode.LanguageModelToolInformation | undefined;
}
```

#### 工具模式
```typescript
export enum CopilotToolMode {
    PartialContext,  // 部分上下文 - 代理可以再次调用获取更多
    FullContext,     // 完整上下文 - 一次性获取所有信息
}
```

### 3. **ToolsService.ts** - 工具服务

核心职责：
- **工具验证**：使用 AJV (JSON Schema 验证器) 验证工具输入
- **工具调用**：协调工具的调用流程
- **工具发现**：管理所有已注册的工具
- **智能修复**：自动解析嵌套的 JSON 字符串

```typescript
export interface IToolsService {
    tools: ReadonlyArray<vscode.LanguageModelToolInformation>;
    copilotTools: ReadonlyMap<ToolName, ICopilotTool<any>>;
    
    invokeTool(name: string, options: vscode.LanguageModelToolInvocationOptions<unknown>, token: vscode.CancellationToken): Thenable<vscode.LanguageModelToolResult2>;
    
    validateToolInput(name: string, input: string): IToolValidationResult;
    
    getEnabledTools(request: vscode.ChatRequest, filter?: (tool: vscode.LanguageModelToolInformation) => boolean | undefined): vscode.LanguageModelToolInformation[];
}
```

---

## 工具分类

### 1. **代码搜索工具** (Code Search Tools)

#### Codebase Tool (`semantic_search`)
- **功能**：语义搜索代码库
- **特点**：
  - 支持自然语言查询
  - 可选包含文件结构
  - 可限定搜索目录范围
  - 匿名用户自动启用代理模式

#### Find Files Tool (`file_search`)
- **功能**：通过 glob 模式搜索文件
- **特点**：
  - 支持通配符模式
  - 可限制结果数量
  - 自动补全 glob 模式（添加 `**/` 前缀）

#### Find Text In Files Tool (`grep_search`)
- **功能**：快速文本/正则搜索
- **特点**：
  - 支持正则表达式
  - 支持包含/排除模式
  - 大小写不敏感

#### Search Workspace Symbols Tool (`search_workspace_symbols`)
- **功能**：使用语言服务搜索符号
- **用例**：查找类、函数、变量等

#### Usages Tool (`list_code_usages`)
- **功能**：列出符号的所有用法
- **用例**：
  - 查找接口实现
  - 检查函数使用情况
  - 更新所有引用

### 2. **文件操作工具** (File Operation Tools)

#### Read File Tool (`read_file`)
- **功能**：读取文件内容
- **特点**：
  - 支持行范围读取（V1: startLine/endLine, V2: offset/limit）
  - 自动截断大文件（最大 2000 行）
  - 支持 Notebook 文件
  - 使用 Prompt-TSX 渲染结果
- **V2 改进**：
  - 更灵活的分页机制
  - 自动提示如何读取更多内容

#### List Directory Tool (`list_dir`)
- **功能**：列出目录内容
- **输出格式**：文件夹名称以 `/` 结尾

#### Create File Tool (`create_file`)
- **功能**：创建新文件
- **特点**：
  - 自动创建父目录
  - 需要用户确认
  - 不能覆盖已存在文件

#### Create Directory Tool (`create_directory`)
- **功能**：递归创建目录结构
- **等价于**：`mkdir -p`

### 3. **编辑工具** (Editing Tools)

#### Apply Patch Tool (`apply_patch`)
- **功能**：应用 V4A diff 格式补丁
- **格式示例**：
```
*** Begin Patch
*** Update File: /path/to/file.py
@@class BaseClass
@@    def search():
-        pass
+        raise NotImplementedError()
*** End Patch
```
- **特点**：
  - 不使用行号
  - 支持 Add/Update/Delete 操作
  - 上下文匹配

#### Insert Edit Tool (`insert_edit_into_file`)
- **功能**：向现有文件插入代码
- **智能特性**：
  - 系统能理解如何应用编辑
  - 使用注释表示未更改区域
  - 一次性处理多个更改
- **示例**：
```typescript
class Person {
    // ...existing code...
    age: number;
    // ...existing code...
    getAge() {
        return this.age;
    }
}
```

#### Replace String Tool (`replace_string_in_file`)
- **功能**：精确字符串替换
- **关键要求**：
  - `oldString` 必须完全匹配（包括空格、缩进、换行）
  - 至少包含前后 3 行上下文
  - 每次调用替换一个位置
  - 不能使用省略标记（如 `...existing code...`）

#### Multi Replace String Tool (`multi_replace_string_in_file`)
- **功能**：批量替换操作
- **优势**：比多次调用 `replace_string` 更高效

### 4. **诊断与测试工具** (Diagnostic & Testing Tools)

#### Get Errors Tool (`get_errors`)
- **功能**：获取编译/lint 错误
- **用例**：
  - 查看用户看到的错误
  - 编辑后验证更改
  - 分析所有错误

#### Test Failure Tool (`test_failure`)
- **功能**：包含测试失败信息
- **标签**：启用其他工具（readFile, listDirectory, findFiles, runTests）

#### Find Test Files Tool (`test_search`)
- **功能**：查找测试文件
- **双向查找**：
  - 源文件 → 测试文件
  - 测试文件 → 源文件

### 5. **Notebook 工具** (Notebook Tools)

#### Create New Jupyter Notebook (`create_new_jupyter_notebook`)
- **用途**：生成新的 .ipynb 文件
- **适用场景**：数据探索、分析、可视化

#### Edit Notebook Tool (`edit_notebook_file`)
- **操作类型**：
  - 插入单元格（TOP/BOTTOM/after cellId）
  - 更新单元格内容
  - 删除单元格
- **注意**：保留精确的空格和缩进

#### Run Notebook Cell Tool (`run_notebook_cell`)
- **功能**：直接在编辑器中运行代码单元
- **最佳实践**：添加/编辑单元后立即运行

#### Get Notebook Summary Tool (`copilot_getNotebookSummary`)
- **返回信息**：
  - 单元格 ID
  - 单元格类型
  - 行范围
  - 执行信息
  - 输出 MIME 类型

#### Read Notebook Cell Output Tool (`read_notebook_cell_output`)
- **功能**：检索单元格输出
- **特点**：比 runNotebookCell 有更高的 token 限制

### 6. **版本控制工具** (Version Control Tools)

#### Get SCM Changes Tool (`get_changed_files`)
- **功能**：获取 git diff
- **参数**：
  - repositoryPath（可选）
  - sourceControlState（工作区/暂存区）

### 7. **项目管理工具** (Project Management Tools)

#### Create New Workspace Tool (`create_new_workspace`)
- **用途**：完整项目初始化
- **适用场景**：
  - TypeScript 项目
  - React 应用
  - MCP 服务器
  - VSCode 扩展
  - Next.js/Vite 项目
- **不适用**：单个文件创建、现有项目修改

#### Get Project Setup Info Tool (`get_project_setup_info`)
- **前置条件**：必须先调用 create_new_workspace
- **支持的项目类型**：
  - python-script/python-project
  - mcp-server
  - vscode-extension
  - next-js/vite
  - other

#### Install Extension Tool (`install_extension`)
- **用途**：安装 VSCode 扩展
- **限制**：仅用于新工作区创建流程

#### Run VSCode Command Tool (`run_vscode_command`)
- **功能**：执行 VSCode 命令
- **限制**：仅用于新工作区创建流程

### 8. **文档与参考工具** (Documentation & Reference Tools)

#### VSCode API Tool (`get_vscode_api`)
- **功能**：获取 VSCode API 文档
- **范围**：
  - 稳定 API
  - 提议 API
  - 贡献点
  - 最佳实践
- **关键用途**：仅用于扩展开发，不用于一般编程

#### Doc Info Tool (`get_doc_info`)
- **功能**：查找如何为符号编写文档
- **用例**：生成文档注释

#### GitHub Repo Tool (`github_repo`)
- **功能**：搜索 GitHub 仓库代码片段
- **限制**：不用于已在工作区打开的仓库

### 9. **浏览器与网络工具** (Browser & Web Tools)

#### Simple Browser Tool (`open_simple_browser`)
- **功能**：在编辑器内打开 URL
- **用途**：预览本地网站、演示

#### Fetch Web Page Tool (`fetch_webpage`)
- **功能**：获取网页主要内容
- **用途**：总结或分析网页内容

### 10. **元工具** (Meta Tools)

#### Think Tool (`think`)
- **功能**：深度思考和组织想法
- **用例**：
  - 探索仓库问题
  - 分析测试结果
  - 规划复杂重构
  - 设计新功能
  - 组织调试假设
- **特点**：记录思考过程但不执行代码

#### Execute Prompt Tool (`execute_prompt`)
- **功能**：启动新代理处理复杂任务
- **特点**：
  - 无状态
  - 单次返回结果
  - 适合多步骤搜索任务
- **注意**：需明确告知代理是写代码还是做研究

#### Update User Preferences Tool (`update_user_preferences`)
- **功能**：更新用户偏好文件
- **输入**：基于聊天历史的偏好数组

#### Tool Replay Tool (`tool_replay`)
- **功能**：重放之前的工具调用结果
- **用途**：调试和测试

---

## 工具实现模式

### 标准工具实现结构

```typescript
export class ExampleTool implements ICopilotTool<IExampleParams> {
    public static toolName = ToolName.Example;

    constructor(
        @IServiceA private readonly serviceA: IServiceA,
        @IServiceB private readonly serviceB: IServiceB,
    ) { }

    // 核心调用方法
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IExampleParams>,
        token: vscode.CancellationToken
    ): Promise<LanguageModelToolResult> {
        // 1. 验证输入
        // 2. 执行操作
        // 3. 返回结果（通常使用 Prompt-TSX）
    }

    // 准备调用 - 显示 UI 消息和确认
    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<IExampleParams>,
        token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        return {
            invocationMessage: new MarkdownString('正在执行...'),
            pastTenseMessage: new MarkdownString('已执行'),
            confirmationMessages: { /* 如需确认 */ }
        };
    }

    // 可选：输入解析
    async resolveInput(
        input: IExampleParams,
        promptContext: IBuildPromptContext,
        mode: CopilotToolMode
    ): Promise<IExampleParams> {
        // 修改或增强输入
        return input;
    }
}

// 注册工具
ToolRegistry.registerTool(ExampleTool);
```

### 使用 Prompt-TSX 渲染结果

许多工具使用 Prompt-TSX 来构建结构化、可组合的结果：

```typescript
class ReadFileResult extends PromptElement<ReadFileResultProps> {
    override async render() {
        return <>
            File: `{this.props.filePath}`. Lines {start} to {end}:
            <CodeBlock
                uri={this.props.uri}
                code={contents}
                languageId={documentSnapshot.languageId}
                references={[new PromptReference(this.props.uri)]}
            />
        </>;
    }
}
```

---

## 虚拟工具系统

当工具数量超过阈值时，VSCode Copilot 使用**虚拟工具**（Virtual Tools）系统来组织和分组工具。

### 核心概念

#### VirtualTool 类
```typescript
export class VirtualTool {
    public isExpanded = false;

    constructor(
        public readonly name: string,        // 以 'activate_' 开头
        public readonly description: string,  // 组摘要
        public lastUsedOnTurn: number,
        public readonly metadata: IVirtualToolMetadata,
        public contents: (LanguageModelToolInformation | VirtualTool)[] = [],
    ) { }

    // 查找工具
    public find(name: string): { tool: VirtualTool | LanguageModelToolInformation; path: VirtualTool[]; } | undefined

    // 获取所有工具（递归展开）
    public *tools(): Generator<LanguageModelToolInformation>
}
```

### 工具分组策略

1. **按来源分组**：
   - 内置工具（Built-in）
   - 扩展工具（Extension）
   - MCP 工具（Model Context Protocol）

2. **智能分类**：
   - 使用 LLM 将工具分类到语义组
   - 缓存分类结果
   - 支持增量更新

3. **嵌入排名**（Embedding Ranking）：
   - 基于查询相似度排名工具
   - 将相关工具提升到顶层
   - 仅对扩展和 MCP 工具应用

### 工具分组服务

```typescript
export interface IToolGroupingService {
    threshold: IObservable<number>;  // 分组阈值

    create(
        sessionId: string,
        tools: readonly LanguageModelToolInformation[]
    ): IToolGrouping;
}

export interface IToolGrouping {
    tools: readonly LanguageModelToolInformation[];
    isEnabled: boolean;

    // 处理工具调用
    didCall(localTurnNumber: number, toolCallName: string): LanguageModelToolResult | undefined;

    // 计算可用工具
    compute(query: string, token: CancellationToken): Promise<LanguageModelToolInformation[]>;
}
```

### 分组缓存

```typescript
export interface IToolGroupingCache {
    clear(): Promise<void>;
    flush(): Promise<void>;

    getOrInsert(
        tools: LanguageModelToolInformation[],
        factory: () => Promise<ISummarizedToolCategory[] | undefined>
    ): Promise<ISummarizedToolCategory[] | undefined>;
}
```

---

## 工具注册与管理

### 注册流程

1. **定义工具类**：实现 `ICopilotTool<T>` 或 `vscode.LanguageModelTool<T>`
2. **注册到 ToolRegistry**：
```typescript
ToolRegistry.registerTool(YourTool);
```
3. **导入到 allTools.ts**：
```typescript
import './yourTool';
```
4. **在 package.json 中声明**：
```json
{
  "contributes": {
    "languageModelTools": [{
      "name": "copilot_yourTool",
      "toolReferenceName": "yourTool",
      "modelDescription": "详细描述...",
      "inputSchema": { /* JSON Schema */ }
    }]
  }
}
```

### 工具发现

```typescript
// 获取所有工具
const tools = toolsService.tools;

// 获取 Copilot 工具实现
const copilotTool = toolsService.getCopilotTool(ToolName.ReadFile);

// 按引用名称查找
const tool = toolsService.getToolByToolReferenceName('readFile');

// 获取启用的工具
const enabledTools = toolsService.getEnabledTools(request, filter);
```

---

## 关键设计模式

### 1. **依赖注入**
所有工具使用构造函数注入服务：
```typescript
constructor(
    @IWorkspaceService private readonly workspaceService: IWorkspaceService,
    @INotebookService private readonly notebookService: INotebookService,
) { }
```

### 2. **策略模式**
工具模式（PartialContext vs FullContext）允许不同的执行策略。

### 3. **装饰器模式**
`ICopilotTool` 扩展 `vscode.LanguageModelTool` 添加额外功能。

### 4. **工厂模式**
`IInstantiationService` 用于创建工具实例。

### 5. **观察者模式**
`onWillInvokeTool` 事件允许监听工具调用。

### 6. **缓存模式**
- Schema 验证缓存（LRUCache）
- 工具分组缓存（持久化）

### 7. **组合模式**
虚拟工具可以包含其他虚拟工具或真实工具，形成树状结构。

---

## 最佳实践

### 工具开发指南

1. **模型描述**（modelDescription）：
   - 非常详细
   - 说明工具的功能
   - 说明返回的信息类型
   - 说明使用场景
   - 不要本地化

2. **输入验证**：
   - 依赖 JSON Schema 验证
   - 使用 `IPromptPathRepresentationService` 处理路径
   - 必需属性要仔细考虑

3. **错误处理**：
   - 抛出对 LLM 有意义的错误消息
   - 指导模型下一步操作

4. **确认消息**：
   - 危险操作必须请求确认
   - 提供足够上下文
   - 使用 Markdown 格式

5. **UI 消息**：
   - 填写 `invocationMessage` 和 `pastTenseMessage`
   - 不要添加 `...` 后缀
   - 使用 `toolResultMessage` 响应结果
   - 使用 `toolResultDetails` 显示可展开列表

6. **使用 Prompt-TSX**：
   - 复杂结果使用 Prompt-TSX
   - 可组合和重用组件
   - 支持优先级和 token 预算

7. **测试**：
   - 编写单元测试
   - 使用快照测试
   - 在模拟器/swebench 场景中测试

8. **阅读提示**：
   - 大量使用工具
   - 阅读完整提示
   - 检查工具结果格式一致性

---

## 总结

VSCode Copilot Chat 的工具系统是一个精心设计的、可扩展的架构，具有以下特点：

✅ **模块化**：每个工具都是独立的、可测试的单元
✅ **可扩展**：通过注册表轻松添加新工具
✅ **智能分组**：虚拟工具系统处理大量工具
✅ **类型安全**：TypeScript 和 JSON Schema 验证
✅ **用户友好**：确认消息、进度指示、错误处理
✅ **性能优化**：缓存、分页、token 预算管理
✅ **灵活配置**：实验功能、替代定义、工具集

这个系统为 LLM 提供了强大的能力，使其能够执行从简单的文件读取到复杂的项目创建等各种任务。

