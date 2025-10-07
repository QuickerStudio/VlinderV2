# VSCode Copilot Chat 工具快速参考

## 工具分类总览

| 类别 | 工具数量 | 主要用途 |
|------|---------|---------|
| 代码搜索 | 5 | 查找代码、文件、符号 |
| 文件操作 | 4 | 读取、列出、创建文件/目录 |
| 编辑工具 | 4 | 应用补丁、插入编辑、替换字符串 |
| Notebook | 5 | 创建、编辑、运行 Jupyter Notebook |
| 诊断测试 | 3 | 获取错误、测试失败信息 |
| 版本控制 | 1 | Git 变更 |
| 项目管理 | 4 | 创建工作区、安装扩展 |
| 文档参考 | 3 | VSCode API、文档信息、GitHub 仓库 |
| 浏览器网络 | 2 | 简单浏览器、网页抓取 |
| 元工具 | 4 | 思考、执行提示、用户偏好 |

---

## 代码搜索工具

### 1. Codebase Tool
- **工具名**: `semantic_search` / `copilot_searchCodebase`
- **引用名**: `codebase`
- **用途**: 语义搜索代码库
- **参数**:
  ```json
  {
    "query": "自然语言查询",
    "includeFileStructure": false,  // 可选
    "scopedDirectories": []         // 可选
  }
  ```
- **标签**: `codesearch`, `vscode_codesearch`

### 2. Find Files Tool
- **工具名**: `file_search` / `copilot_findFiles`
- **引用名**: `fileSearch`
- **用途**: 通过 glob 模式搜索文件
- **参数**:
  ```json
  {
    "query": "**/*.ts",
    "maxResults": 20  // 可选
  }
  ```
- **示例模式**:
  - `**/*.{js,ts}` - 所有 JS/TS 文件
  - `src/**` - src 下所有文件
  - `**/foo/**/*.js` - 任何 foo 文件夹下的 JS 文件

### 3. Find Text In Files Tool
- **工具名**: `grep_search` / `copilot_findTextInFiles`
- **引用名**: `textSearch`
- **用途**: 快速文本/正则搜索
- **参数**:
  ```json
  {
    "query": "function|method|procedure",
    "isRegexp": true,
    "includePattern": "src/**/*.ts",  // 可选
    "excludePattern": "**/node_modules/**",  // 可选
    "maxResults": 100  // 可选
  }
  ```
- **提示**: 使用正则交替 `|` 一次搜索多个词

### 4. Search Workspace Symbols Tool
- **工具名**: `search_workspace_symbols` / `copilot_searchWorkspaceSymbols`
- **引用名**: `symbols`
- **用途**: 使用语言服务搜索符号
- **参数**:
  ```json
  {
    "symbolName": "MyClass"
  }
  ```

### 5. Usages Tool
- **工具名**: `list_code_usages` / `copilot_listCodeUsages`
- **引用名**: `usages`
- **用途**: 列出符号的所有用法
- **参数**:
  ```json
  {
    "symbolName": "myFunction",
    "filePaths": ["/path/to/file.ts"]  // 可选
  }
  ```
- **用例**:
  - 查找接口实现
  - 检查函数使用
  - 更新所有引用

---

## 文件操作工具

### 6. Read File Tool
- **工具名**: `read_file` / `copilot_readFile`
- **引用名**: `readFile`
- **用途**: 读取文件内容
- **参数 V1**:
  ```json
  {
    "filePath": "/absolute/path/to/file.ts",
    "startLine": 1,
    "endLine": 100
  }
  ```
- **参数 V2**:
  ```json
  {
    "filePath": "/absolute/path/to/file.ts",
    "offset": 1,     // 可选，起始行
    "limit": 2000    // 可选，最大行数
  }
  ```
- **限制**: 最大 2000 行/次

### 7. List Directory Tool
- **工具名**: `list_dir` / `copilot_listDirectory`
- **引用名**: `listDirectory`
- **用途**: 列出目录内容
- **参数**:
  ```json
  {
    "path": "/absolute/path/to/directory"
  }
  ```
- **输出**: 文件夹名称以 `/` 结尾

### 8. Create File Tool
- **工具名**: `create_file` / `copilot_createFile`
- **引用名**: `createFile`
- **用途**: 创建新文件
- **参数**:
  ```json
  {
    "filePath": "/absolute/path/to/new/file.ts",
    "content": "文件内容"
  }
  ```
- **注意**: 不能覆盖已存在文件

### 9. Create Directory Tool
- **工具名**: `create_directory` / `copilot_createDirectory`
- **引用名**: `createDirectory`
- **用途**: 递归创建目录
- **参数**:
  ```json
  {
    "dirPath": "/absolute/path/to/new/directory"
  }
  ```

---

## 编辑工具

### 10. Apply Patch Tool
- **工具名**: `apply_patch` / `copilot_applyPatch`
- **引用名**: `applyPatch`
- **用途**: 应用 V4A diff 格式补丁
- **参数**:
  ```json
  {
    "input": "*** Begin Patch\n*** Update File: /path/to/file.py\n@@class BaseClass\n@@    def search():\n-        pass\n+        raise NotImplementedError()\n*** End Patch",
    "explanation": "实现抽象方法"
  }
  ```
- **操作**: Add, Update, Delete

### 11. Insert Edit Tool
- **工具名**: `insert_edit_into_file` / `copilot_insertEdit`
- **引用名**: `insertEdit`
- **用途**: 向现有文件插入代码
- **参数**:
  ```json
  {
    "explanation": "添加 age 属性和 getter",
    "filePath": "/path/to/Person.ts",
    "code": "class Person {\n    // ...existing code...\n    age: number;\n    // ...existing code...\n    getAge() {\n        return this.age;\n    }\n}"
  }
  ```
- **提示**: 使用 `// ...existing code...` 表示未更改区域

### 12. Replace String Tool
- **工具名**: `replace_string_in_file` / `copilot_replaceString`
- **引用名**: `replaceString`
- **用途**: 精确字符串替换
- **参数**:
  ```json
  {
    "filePath": "/path/to/file.ts",
    "oldString": "    function oldName() {\n        return 42;\n    }",
    "newString": "    function newName() {\n        return 42;\n    }",
    "explanation": "重命名函数"
  }
  ```
- **关键要求**:
  - `oldString` 必须完全匹配（包括空格、缩进、换行）
  - 至少包含前后 3 行上下文
  - 每次替换一个位置

### 13. Multi Replace String Tool
- **工具名**: `multi_replace_string_in_file` / `copilot_multiReplaceString`
- **引用名**: `multiReplaceString`
- **用途**: 批量替换操作
- **参数**:
  ```json
  {
    "explanation": "批量重命名",
    "replacements": [
      {
        "filePath": "/path/to/file1.ts",
        "oldString": "...",
        "newString": "...",
        "explanation": "..."
      },
      {
        "filePath": "/path/to/file2.ts",
        "oldString": "...",
        "newString": "...",
        "explanation": "..."
      }
    ]
  }
  ```

---

## Notebook 工具

### 14. Create New Jupyter Notebook
- **工具名**: `create_new_jupyter_notebook` / `copilot_createNewJupyterNotebook`
- **引用名**: `newJupyterNotebook`
- **用途**: 生成新的 .ipynb 文件
- **参数**:
  ```json
  {
    "query": "数据分析 notebook，包含 pandas 和 matplotlib"
  }
  ```

### 15. Edit Notebook Tool
- **工具名**: `edit_notebook_file` / `copilot_editNotebook`
- **引用名**: `editNotebook`
- **用途**: 编辑 Notebook 文件
- **参数**:
  ```json
  {
    "filePath": "/path/to/notebook.ipynb",
    "cellId": "cell-123",  // 或 "TOP", "BOTTOM"
    "editType": "insert",  // insert, update, delete
    "newCode": "import pandas as pd",
    "explanation": "添加 pandas 导入"
  }
  ```

### 16. Run Notebook Cell Tool
- **工具名**: `run_notebook_cell` / `copilot_runNotebookCell`
- **引用名**: `runCell`
- **用途**: 运行代码单元
- **参数**:
  ```json
  {
    "filePath": "/path/to/notebook.ipynb",
    "cellId": "cell-123",
    "reason": "测试数据加载"
  }
  ```

### 17. Get Notebook Summary Tool
- **工具名**: `copilot_getNotebookSummary`
- **引用名**: `getNotebookSummary`
- **用途**: 获取 Notebook 结构
- **参数**:
  ```json
  {
    "filePath": "/path/to/notebook.ipynb"
  }
  ```
- **返回**: 单元格 ID、类型、行范围、执行信息

### 18. Read Notebook Cell Output Tool
- **工具名**: `read_notebook_cell_output` / `copilot_readNotebookCellOutput`
- **引用名**: `readNotebookCellOutput`
- **用途**: 检索单元格输出
- **参数**:
  ```json
  {
    "filePath": "/path/to/notebook.ipynb",
    "cellId": "cell-123"
  }
  ```

---

## 诊断与测试工具

### 19. Get Errors Tool
- **工具名**: `get_errors` / `copilot_getErrors`
- **引用名**: `problems`
- **用途**: 获取编译/lint 错误
- **参数**:
  ```json
  {
    "filePaths": ["/path/to/file.ts"]  // 可选，省略则获取所有错误
  }
  ```

### 20. Test Failure Tool
- **工具名**: `test_failure` / `copilot_testFailure`
- **引用名**: `testFailure`
- **用途**: 包含测试失败信息
- **参数**: `{}`
- **标签**: 启用 readFile, listDirectory, findFiles, runTests

### 21. Find Test Files Tool
- **工具名**: `test_search` / `copilot_findTestFiles`
- **引用名**: `findTestFiles`
- **用途**: 查找测试文件
- **参数**:
  ```json
  {
    "filePaths": ["/path/to/source.ts"]
  }
  ```

---

## 版本控制工具

### 22. Get SCM Changes Tool
- **工具名**: `get_changed_files` / `copilot_getChangedFiles`
- **引用名**: `changes`
- **用途**: 获取 git diff
- **参数**:
  ```json
  {
    "repositoryPath": "/path/to/repo",  // 可选
    "sourceControlState": "working"     // working 或 staged
  }
  ```

---

## 项目管理工具

### 23. Create New Workspace Tool
- **工具名**: `create_new_workspace` / `copilot_createNewWorkspace`
- **引用名**: `newWorkspace`
- **用途**: 完整项目初始化
- **参数**:
  ```json
  {
    "query": "创建一个 TypeScript + React 项目，使用 Vite"
  }
  ```
- **适用**: 完整项目框架
- **不适用**: 单个文件、现有项目修改

### 24. Get Project Setup Info Tool
- **工具名**: `get_project_setup_info` / `copilot_getProjectSetupInfo`
- **引用名**: `getProjectSetupInfo`
- **用途**: 获取项目设置信息
- **参数**:
  ```json
  {
    "projectType": "vscode-extension"
  }
  ```
- **支持类型**: python-script, python-project, mcp-server, vscode-extension, next-js, vite, other

### 25. Install Extension Tool
- **工具名**: `install_extension` / `copilot_installExtension`
- **引用名**: `installExtension`
- **用途**: 安装 VSCode 扩展
- **参数**:
  ```json
  {
    "id": "ms-python.python",
    "name": "Python"
  }
  ```

### 26. Run VSCode Command Tool
- **工具名**: `run_vscode_command` / `copilot_runVscodeCommand`
- **引用名**: `runVscodeCommand`
- **用途**: 执行 VSCode 命令
- **参数**:
  ```json
  {
    "commandId": "workbench.action.files.save",
    "name": "保存文件",
    "args": []
  }
  ```

---

## 文档与参考工具

### 27. VSCode API Tool
- **工具名**: `get_vscode_api` / `copilot_getVSCodeAPI`
- **引用名**: `vscodeAPI`
- **用途**: 获取 VSCode API 文档
- **参数**:
  ```json
  {
    "query": "如何创建 TreeView"
  }
  ```
- **范围**: 仅用于扩展开发

### 28. Doc Info Tool
- **工具名**: `get_doc_info` / `copilot_getDocInfo`
- **引用名**: `docInfo`
- **用途**: 查找如何为符号编写文档
- **参数**:
  ```json
  {
    "filePaths": ["/path/to/file.ts"]
  }
  ```

### 29. GitHub Repo Tool
- **工具名**: `github_repo` / `copilot_githubRepo`
- **引用名**: `githubRepo`
- **用途**: 搜索 GitHub 仓库代码
- **参数**:
  ```json
  {
    "repo": "microsoft/vscode",
    "query": "TreeView implementation"
  }
  ```

---

## 浏览器与网络工具

### 30. Simple Browser Tool
- **工具名**: `open_simple_browser` / `copilot_openSimpleBrowser`
- **引用名**: `openSimpleBrowser`
- **用途**: 在编辑器内打开 URL
- **参数**:
  ```json
  {
    "url": "http://localhost:3000"
  }
  ```

### 31. Fetch Web Page Tool
- **工具名**: `fetch_webpage` / `copilot_fetchWebPage`
- **引用名**: `fetch`
- **用途**: 获取网页内容
- **参数**:
  ```json
  {
    "urls": ["https://example.com"]
  }
  ```

---

## 元工具

### 32. Think Tool
- **工具名**: `think` / `copilot_think`
- **引用名**: `think`
- **用途**: 深度思考和组织想法
- **参数**:
  ```json
  {
    "thoughts": "我需要先分析错误日志，然后检查相关代码..."
  }
  ```
- **用例**: 探索问题、分析测试、规划重构

### 33. Execute Prompt Tool
- **工具名**: `execute_prompt`
- **引用名**: `executePrompt`
- **用途**: 启动新代理处理任务
- **参数**:
  ```json
  {
    "prompt": "搜索所有使用 deprecated API 的地方，并列出文件和行号",
    "description": "查找 deprecated API"
  }
  ```
- **特点**: 无状态、单次返回

### 34. Update User Preferences Tool
- **工具名**: `update_user_preferences` / `copilot_updateUserPreferences`
- **引用名**: `updateUserPreferences`
- **用途**: 更新用户偏好
- **参数**:
  ```json
  {
    "facts": [
      "用户喜欢使用 TypeScript",
      "用户偏好函数式编程风格"
    ]
  }
  ```

### 35. Tool Replay Tool
- **工具名**: `tool_replay` / `copilot_toolReplay`
- **引用名**: 无
- **用途**: 重放工具调用结果
- **参数**:
  ```json
  {
    "toolCallId": "call-123"
  }
  ```

---

## 工具标签系统

| 标签 | 含义 |
|------|------|
| `vscode_codesearch` | 代码搜索相关 |
| `vscode_editing_with_tests` | 编辑和测试 |
| `enable_other_tool_*` | 启用其他工具 |

---

## 工具选择指南

### 何时使用哪个搜索工具？

| 场景 | 推荐工具 |
|------|---------|
| 不确定代码在哪 | Codebase Tool |
| 知道文件名模式 | Find Files Tool |
| 搜索精确文本/正则 | Find Text In Files Tool |
| 查找类/函数定义 | Search Workspace Symbols Tool |
| 查找所有引用 | Usages Tool |

### 何时使用哪个编辑工具？

| 场景 | 推荐工具 |
|------|---------|
| 应用复杂补丁 | Apply Patch Tool |
| 插入新代码 | Insert Edit Tool |
| 精确替换 | Replace String Tool |
| 批量替换 | Multi Replace String Tool |

---

## 常见模式

### 读取大文件
```typescript
// 第一次调用
{ "filePath": "/path/to/large/file.ts", "offset": 1, "limit": 2000 }

// 第二次调用（如果需要）
{ "filePath": "/path/to/large/file.ts", "offset": 2001, "limit": 2000 }
```

### 搜索多个可能的词
```typescript
// 使用正则交替
{ "query": "function|method|procedure", "isRegexp": true }
```

### 编辑后验证
```typescript
// 1. 应用编辑
apply_patch(...)

// 2. 检查错误
get_errors({ "filePaths": ["/path/to/edited/file.ts"] })
```

---

## 工具限制

| 工具 | 限制 |
|------|------|
| Read File | 最大 2000 行/次 |
| Find Files | 默认 20 个结果 |
| Find Text In Files | 默认 100 个结果 |
| Replace String | 每次替换一个位置 |
| Create File | 不能覆盖已存在文件 |

---

## 工具组合示例

### 示例 1: 查找并修复所有 TODO
```
1. find_text_in_files({ query: "TODO", isRegexp: false })
2. read_file({ filePath: "...", startLine: ..., endLine: ... })
3. replace_string_in_file({ filePath: "...", oldString: "...", newString: "..." })
4. get_errors({ filePaths: ["..."] })
```

### 示例 2: 创建新功能
```
1. semantic_search({ query: "类似功能的实现" })
2. read_file({ filePath: "..." })
3. create_file({ filePath: "...", content: "..." })
4. insert_edit_into_file({ filePath: "...", code: "..." })
5. test_search({ filePaths: ["..."] })
```

### 示例 3: 调试测试失败
```
1. test_failure({})
2. read_file({ filePath: "..." })
3. get_errors({ filePaths: ["..."] })
4. think({ thoughts: "分析错误原因..." })
5. apply_patch({ input: "...", explanation: "..." })
```
