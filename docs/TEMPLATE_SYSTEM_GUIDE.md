# 提示词模板系统使用指南

## 📚 模板系统概述

Vlinder 使用一个强大的模板系统来构建 agent 提示词，支持动态变量注入、条件块和工具集成。

---

## 🔧 核心组件

### 1. `promptTemplate()` 函数

用于定义提示词模板，提供两个参数：

```typescript
const template = promptTemplate(
  (b, h) => dedent`Your prompt content here...`
);
```

**参数说明：**
- `b` (builder): 包含所有可用的占位符变量
- `h` (helpers): 包含辅助函数（如 `block()`）

---

## 📝 可用的占位符变量

### 系统信息变量

| 变量 | 描述 | 示例值 |
|------|------|--------|
| `${b.agentName}` | Agent 名称 | "Tester", "Vlinder" |
| `${b.osName}` | 操作系统名称 | "Windows 10", "macOS 14.0" |
| `${b.defaultShell}` | 默认 Shell | "bash", "powershell" |
| `${b.homeDir}` | 用户主目录 | "/home/user", "C:/Users/User" |
| `${b.cwd}` | 当前工作目录 | "/workspace/project" |

**使用示例：**
```typescript
const template = promptTemplate(
  (b, h) => dedent`
    You are ${b.agentName}, running on ${b.osName}.
    
    Operating System: ${b.osName}
    Default Shell: ${b.defaultShell}
    Home Directory: ${b.homeDir}
    Current Working Directory: ${b.cwd}
  `
);
```

**实际输出：**
```
You are Tester, running on Windows 10.

Operating System: Windows 10
Default Shell: bash
Home Directory: C:/Users/User
Current Working Directory: C:/Users/User/Desktop/Vlinder
```

---

### 动态内容变量

| 变量 | 描述 | 内容来源 |
|------|------|----------|
| `${b.toolSection}` | 工具定义部分 | 自动生成所有已添加工具的文档 |
| `${b.capabilitiesSection}` | 能力列表部分 | 自动生成所有工具的能力列表 |
| `${b.rulesSection}` | 规则部分 | 自定义规则内容 |
| `${b.task}` | 当前任务 | 用户提供的任务描述 |

**使用示例：**
```typescript
const template = promptTemplate(
  (b, h) => dedent`
    # Available Tools
    
    ${b.toolSection}
    
    # Your Capabilities
    
    ${b.capabilitiesSection}
  `
);
```

**实际输出：**
```
# Available Tools

# read_file

Description: Read the contents of a file at the specified path...

Parameters:
- path: (required) The path of the file to read

## Examples:
...

# Your Capabilities

- Read files from the filesystem
- Execute shell commands
- Search for patterns in files
...
```

---

## 🎯 条件块功能

使用 `${h.block()}` 创建条件内容块，根据 agent 的特性动态显示/隐藏内容。

### 可用的条件块类型

| 类型 | 描述 | 启用条件 |
|------|------|----------|
| `vision` | 视觉/图像分析能力 | 模型支持图像输入 |
| `thinking` | 推理/思考能力 | Agent 启用推理模式 |

### 使用方法

```typescript
const template = promptTemplate(
  (b, h) => dedent`
    You are ${b.agentName}.
    
    ${h.block('vision', `
    # Image Analysis Capabilities
    
    You can analyze images and screenshots. When given an image:
    - Describe visual elements
    - Extract text (OCR)
    - Identify UI components
    `)}
    
    ${h.block('thinking', `
    # Reasoning Process
    
    Before taking action, use <thinking> tags to:
    - Analyze the problem
    - Consider alternatives
    - Plan your approach
    `)}
  `
);
```

**当 vision=true, thinking=false 时输出：**
```
You are Tester.

# Image Analysis Capabilities

You can analyze images and screenshots. When given an image:
- Describe visual elements
- Extract text (OCR)
- Identify UI components
```

**当 vision=false, thinking=false 时输出：**
```
You are Tester.
```

---

## 🛠️ PromptBuilder 配置

### 基本配置

```typescript
const config: PromptConfig = {
  agentName: 'Tester',
  osName: osName(),
  defaultShell: defaultShell,
  homeDir: os.homedir().replace(/\\/g, '/'),
  template: template,
  features: {
    vision: false,
    thinking: true,
  }
};

const builder = new PromptBuilder(config);
```

### 添加工具

```typescript
// 添加所有工具
builder.addTools(toolPrompts);

// 添加单个工具
builder.addTool(readFilePrompt);

// 添加过滤后的工具
const filteredTools = toolPrompts.filter(
  (tool) => tool.name !== 'spawn_agent'
);
builder.addTools(filteredTools);
```

### 添加自定义能力

```typescript
builder.addCapability('Custom capability description');
```

### 构建最终提示词

```typescript
const systemPrompt = builder.build();
```

---

## 💡 最佳实践

### 1. 使用系统信息约束行为

**❌ 不好的做法：**
```typescript
const template = promptTemplate(
  (b, h) => dedent`
    You are a testing agent.
    Run tests using npm test.
  `
);
```

**✅ 好的做法：**
```typescript
const template = promptTemplate(
  (b, h) => dedent`
    You are ${b.agentName}, a testing agent.
    
    Operating System: ${b.osName}
    Default Shell: ${b.defaultShell}
    Current Working Directory: ${b.cwd}
    
    When running tests:
    - Use shell commands appropriate for ${b.defaultShell}
    - All file paths are relative to ${b.cwd}
    - Consider OS-specific behaviors on ${b.osName}
  `
);
```

**效果：**
- ✅ Agent 知道当前操作系统，可以使用正确的命令
- ✅ Agent 知道默认 Shell，可以使用正确的语法
- ✅ Agent 知道工作目录，可以正确处理相对路径

---

### 2. 利用 ${b.cwd} 约束工作目录

**❌ 不好的做法：**
```typescript
const template = promptTemplate(
  (b, h) => dedent`
    Create test files in the test/ directory.
  `
);
```

**✅ 好的做法：**
```typescript
const template = promptTemplate(
  (b, h) => dedent`
    **Working Directory Constraints:**
    
    - Project root: ${b.cwd}
    - All test files MUST be created in: ${b.cwd}/test/
    - All file paths are relative to: ${b.cwd}
    
    Before creating files, verify you're working in the correct directory.
  `
);
```

**效果：**
- ✅ 明确的绝对路径约束
- ✅ Agent 知道项目根目录
- ✅ 防止在错误位置创建文件

---

### 3. 使用条件块适配不同能力

**❌ 不好的做法：**
```typescript
const template = promptTemplate(
  (b, h) => dedent`
    You can analyze images and extract text.
  `
);
```

**✅ 好的做法：**
```typescript
const template = promptTemplate(
  (b, h) => dedent`
    ${h.block('vision', `
    # Image Analysis
    
    You have vision capabilities. You can:
    - Analyze screenshots and images
    - Extract text via OCR
    - Identify UI components
    `)}
    
    ${h.block('vision', '', `
    # Note
    
    You do NOT have image analysis capabilities.
    Focus on text-based testing only.
    `)}
  `
);
```

**效果：**
- ✅ 根据模型能力动态调整提示词
- ✅ 避免让不支持图像的模型尝试图像分析
- ✅ 提供清晰的能力边界

---

### 4. 利用 ${b.toolSection} 自动生成工具文档

**❌ 不好的做法：**
```typescript
const template = promptTemplate(
  (b, h) => dedent`
    You have access to these tools:
    - read_file: Read file contents
    - write_file: Write file contents
    ...
  `
);
```

**✅ 好的做法：**
```typescript
const template = promptTemplate(
  (b, h) => dedent`
    # Available Tools
    
    ${b.toolSection}
    
    Use these tools to accomplish your testing tasks.
  `
);
```

**效果：**
- ✅ 自动生成完整的工具文档（描述、参数、示例）
- ✅ 工具更新时无需手动修改提示词
- ✅ 保持工具文档的一致性和准确性

---

## 🎯 Tester Agent 改进建议

基于模板系统，我建议在 tester.prompt.ts 中添加：

```typescript
const template = promptTemplate(
  (b, h) => dedent`
    You are ${b.agentName}, a specialized Testing Agent...
    
    <environment>
    Operating System: ${b.osName}
    Default Shell: ${b.defaultShell}
    Home Directory: ${b.homeDir}
    Project Root: ${b.cwd}
    </environment>
    
    <workspace_rules>
    **CRITICAL: Working Directory Constraints**
    
    - Project root directory: ${b.cwd}
    - Test directory: ${b.cwd}/test/
    - ALL test files MUST be created under ${b.cwd}/test/
    - Use paths relative to ${b.cwd}
    
    **Shell Commands:**
    - Your default shell is ${b.defaultShell}
    - Use ${b.defaultShell}-compatible syntax
    - On ${b.osName}, consider platform-specific behaviors
    </workspace_rules>
    
    <tools_and_capabilities>
    ${b.toolSection}
    
    ${b.capabilitiesSection}
    </tools_and_capabilities>
  `
);
```

---

## 📊 总结

| 功能 | 用途 | 优势 |
|------|------|------|
| `${b.cwd}` | 约束工作目录 | 防止文件创建错误 |
| `${b.osName}` | 适配操作系统 | 使用正确的命令 |
| `${b.defaultShell}` | 适配 Shell | 使用正确的语法 |
| `${b.toolSection}` | 自动工具文档 | 保持文档同步 |
| `${h.block()}` | 条件内容 | 根据能力调整 |

**关键价值：**
- ✅ 动态适配不同环境
- ✅ 自动生成工具文档
- ✅ 明确的路径约束
- ✅ 平台无关的提示词

