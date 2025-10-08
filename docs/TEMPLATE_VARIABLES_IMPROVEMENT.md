# Tester Agent 模板变量改进报告

## 🎯 改进目标

充分利用 Vlinder 的模板系统（`${b.cwd}`, `${b.osName}`, `${b.defaultShell}` 等）来：
1. **约束 agent 行为** - 明确工作目录和文件路径
2. **适配运行环境** - 根据操作系统和 Shell 调整命令
3. **改进工作流** - 提供清晰的环境上下文

---

## ✨ 核心改进

### 1. 新增 `<environment>` 部分

**改进内容：**
```typescript
<environment>
Operating System: ${b.osName}
Default Shell: ${b.defaultShell}
Home Directory: ${b.homeDir}
Project Root: ${b.cwd}
</environment>
```

**效果：**
- ✅ Agent 明确知道运行环境
- ✅ 可以根据 OS 和 Shell 调整命令
- ✅ 清晰的项目根目录上下文

**实际输出示例：**
```
<environment>
Operating System: Windows 10
Default Shell: bash
Home Directory: C:/Users/User
Project Root: C:/Users/User/Desktop/Vlinder
</environment>
```

---

### 2. 强化 `<workspace_rules>` 的路径约束

**改进前：**
```typescript
1. **Working Directory**: ALL test files MUST be created in the `test/` directory
   - Correct: `test/unit/feature.test.<ext>`
   - Wrong: `src/tests/feature.test.<ext>`
```

**改进后：**
```typescript
1. **Working Directory Constraints**:
   - Project root: `${b.cwd}`
   - Test directory: `${b.cwd}/test/`
   - ALL test files MUST be created under `${b.cwd}/test/`
   - Use paths relative to `${b.cwd}`
   
   Examples:
   - Correct: `${b.cwd}/test/unit/feature.test.<ext>`
   - Wrong: `${b.cwd}/src/tests/feature.test.<ext>`
```

**效果：**
- ✅ 绝对路径约束，消除歧义
- ✅ Agent 知道确切的目录位置
- ✅ 防止在错误位置创建文件

**实际输出示例：**
```
1. **Working Directory Constraints**:
   - Project root: `C:/Users/User/Desktop/Vlinder`
   - Test directory: `C:/Users/User/Desktop/Vlinder/test/`
   - ALL test files MUST be created under `C:/Users/User/Desktop/Vlinder/test/`
```

---

### 3. 新增 Shell 和 OS 约束

**新增内容：**
```typescript
4. **Shell Commands**:
   - Your default shell is `${b.defaultShell}`
   - Use `${b.defaultShell}`-compatible syntax for all commands
   - On `${b.osName}`, consider platform-specific behaviors
   - Test commands must work on `${b.osName}` with `${b.defaultShell}`
```

**效果：**
- ✅ Agent 知道使用哪种 Shell 语法
- ✅ 考虑平台特定行为
- ✅ 避免跨平台兼容性问题

**实际输出示例：**
```
4. **Shell Commands**:
   - Your default shell is `bash`
   - Use `bash`-compatible syntax for all commands
   - On `Windows 10`, consider platform-specific behaviors
   - Test commands must work on `Windows 10` with `bash`
```

---

### 4. 更新目录结构示例

**改进前：**
```typescript
test/
├── unit/
├── integration/
└── output/
```

**改进后：**
```typescript
${b.cwd}/test/
├── unit/
├── integration/
├── e2e/
├── fixtures/
├── helpers/
└── output/
```

**效果：**
- ✅ 显示完整的绝对路径
- ✅ Agent 知道确切的目录位置

**实际输出示例：**
```
C:/Users/User/Desktop/Vlinder/test/
├── unit/
├── integration/
├── e2e/
├── fixtures/
├── helpers/
└── output/
```

---

### 5. 更新 `<tools_and_capabilities>` 部分

**改进前：**
```typescript
<tools_and_capabilities>
Available tools:
- **Code Analysis**: Read files, search patterns, analyze structure
...

${b.toolSection}
${b.capabilitiesSection}
</tools_and_capabilities>
```

**改进后：**
```typescript
<tools_and_capabilities>
Tool calls use XML format and must be placed inside <action> tags:
...

# Available Tools

${b.toolSection}

# Your Capabilities

${b.capabilitiesSection}

All file operations are relative to `${b.cwd}`.
</tools_and_capabilities>
```

**效果：**
- ✅ 清晰的 Markdown 标题分隔工具和能力
- ✅ 强调所有文件操作相对于项目根目录
- ✅ 更好的可读性

---

### 6. 增强 `<example>` 的环境意识

**改进前：**
```typescript
<observation>
Task: Test search functionality in src/core/search.{ext}
Current state: Unknown if test/ directory structure exists.
</observation>

<thinking>
First step: Verify test directory structure exists.
</thinking>

<self_critique>
File should be test/integration/search.test.{ext}
</self_critique>
```

**改进后：**
```typescript
<observation>
Task: Test search functionality in src/core/search.{ext}
Environment: Working in ${b.cwd}, default shell is ${b.defaultShell}, OS is ${b.osName}
Current state: Unknown if ${b.cwd}/test/ directory structure exists.
</observation>

<thinking>
First step: Verify ${b.cwd}/test/ directory structure exists. If not, create:
- ${b.cwd}/test/integration/
- ${b.cwd}/test/fixtures/

Then read the source code at ${b.cwd}/src/core/search.{ext}
</thinking>

<self_critique>
File should be ${b.cwd}/test/integration/search.test.{ext}, NOT ${b.cwd}/src/tests/

Also verify I'm using ${b.defaultShell}-compatible commands on ${b.osName}.
</self_critique>

<action>
<check_directory>
<path>${b.cwd}/test/</path>
</check_directory>
</action>
```

**效果：**
- ✅ 示例展示了如何使用环境变量
- ✅ 强化了绝对路径的使用
- ✅ 提醒考虑 Shell 和 OS 兼容性

**实际输出示例：**
```
<observation>
Environment: Working in C:/Users/User/Desktop/Vlinder, default shell is bash, OS is Windows 10
Current state: Unknown if C:/Users/User/Desktop/Vlinder/test/ directory structure exists.
</observation>

<thinking>
First step: Verify C:/Users/User/Desktop/Vlinder/test/ directory structure exists.
</thinking>

<self_critique>
File should be C:/Users/User/Desktop/Vlinder/test/integration/search.test.{ext}

Also verify I'm using bash-compatible commands on Windows 10.
</self_critique>
```

---

## 📊 改进总结

| 改进项 | 改进前 | 改进后 | 效果 |
|--------|--------|--------|------|
| **环境信息** | ❌ 缺失 | ✅ `<environment>` 部分 | 明确运行环境 |
| **路径约束** | 相对路径 | 绝对路径 (`${b.cwd}/test/`) | 消除歧义 |
| **Shell 约束** | ❌ 缺失 | ✅ Shell 和 OS 约束 | 跨平台兼容 |
| **目录结构** | `test/` | `${b.cwd}/test/` | 完整路径 |
| **工具部分** | 混合格式 | Markdown 标题 + 路径提示 | 更清晰 |
| **示例质量** | 基础 | 环境意识强 | 更实用 |

---

## 🎯 关键价值

### 1. **绝对路径约束**
```
Before: "Create test files in test/"
After:  "Create test files in C:/Users/User/Desktop/Vlinder/test/"
```
- ✅ 消除歧义
- ✅ 防止路径错误
- ✅ 明确的文件位置

### 2. **环境适配**
```
Before: "Run tests"
After:  "Run tests using bash on Windows 10"
```
- ✅ 使用正确的 Shell 语法
- ✅ 考虑平台差异
- ✅ 避免兼容性问题

### 3. **上下文感知**
```
Before: Agent 不知道运行环境
After:  Agent 知道 OS、Shell、工作目录
```
- ✅ 更智能的决策
- ✅ 更准确的命令
- ✅ 更少的错误

---

## 🔑 使用的模板变量

| 变量 | 用途 | 出现次数 |
|------|------|----------|
| `${b.agentName}` | Agent 名称 | 1 次 |
| `${b.osName}` | 操作系统 | 5 次 |
| `${b.defaultShell}` | 默认 Shell | 5 次 |
| `${b.homeDir}` | 主目录 | 1 次 |
| `${b.cwd}` | 工作目录 | **18 次** ⭐ |
| `${b.toolSection}` | 工具文档 | 1 次 |
| `${b.capabilitiesSection}` | 能力列表 | 1 次 |

**最常用：** `${b.cwd}` 出现 18 次，强化了工作目录约束

---

## 💡 最佳实践示例

### ✅ 好的做法

```typescript
// 1. 使用绝对路径
`ALL test files MUST be created under ${b.cwd}/test/`

// 2. 提供环境上下文
`Environment: Working in ${b.cwd}, default shell is ${b.defaultShell}, OS is ${b.osName}`

// 3. Shell 兼容性提醒
`Use ${b.defaultShell}-compatible syntax for all commands`

// 4. 完整的路径示例
`Correct: ${b.cwd}/test/unit/feature.test.<ext>`
```

### ❌ 避免的做法

```typescript
// 1. 使用相对路径（模糊）
`Create test files in test/`

// 2. 缺少环境信息
`Task: Test the feature`

// 3. 假设特定 Shell
`Run: ls -la test/`  // 假设 Unix shell

// 4. 模糊的路径示例
`Correct: test/unit/feature.test.ts`  // 不知道相对于哪里
```

---

## 📝 总结

通过充分利用模板变量，我们实现了：

1. **✅ 明确的路径约束** - 使用 `${b.cwd}` 提供绝对路径
2. **✅ 环境适配** - 使用 `${b.osName}` 和 `${b.defaultShell}` 适配平台
3. **✅ 清晰的上下文** - 新增 `<environment>` 部分
4. **✅ 更好的示例** - 示例展示环境变量的使用
5. **✅ 自动化文档** - 使用 `${b.toolSection}` 和 `${b.capabilitiesSection}`

**核心改进：** 从"相对路径 + 假设环境"到"绝对路径 + 明确环境"

**结果：** Agent 行为更可预测、更可靠、更少错误！🎉

