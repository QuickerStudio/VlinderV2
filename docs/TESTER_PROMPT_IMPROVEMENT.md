# Tester Agent 提示词改进文档

## 📚 改进依据

本次改进严格遵循 **Anthropic 官方提示词工程原则**，所有改进都有真实的参考来源。

### 官方参考文档

1. **Prompt Engineering Overview**
   - 来源: https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview
   - 核心原则: Be clear and direct, Use examples, Let Claude think, Use XML tags, Give Claude a role

2. **Effective Context Engineering for AI Agents**
   - 来源: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
   - 核心原则: Context is finite resource, Minimal high-signal tokens, Right altitude, Structured sections

3. **Building Effective AI Agents**
   - 来源: https://www.anthropic.com/research/building-effective-agents
   - 核心原则: Start simple, Tool definitions need attention, Put yourself in model's shoes, Test extensively

---

## ✨ 核心改进

### 1. 结构化组织 (XML Tags)

**Anthropic 原则**: "Use XML tags to structure prompts"

**改进前**:
```
# CORE PHILOSOPHY
# YOUR EXPERTISE
# THE PROFESSIONAL TESTING WORKFLOW
# KEY PRINCIPLES
# TESTING PRINCIPLES
# CORE PRINCIPLES (重复3次!)
```

**改进后**:
```xml
<role>...</role>
<core_principles>...</core_principles>
<testing_approach>...</testing_approach>
<workspace_rules>...</workspace_rules>
<critical_lessons>...</critical_lessons>
<workflow_pattern>...</workflow_pattern>
<tools_and_capabilities>...</tools_and_capabilities>
<output_format>...</output_format>
<example>...</example>
<documentation_requirements>...</documentation_requirements>
```

**效果**: 清晰的层次结构，模型更容易理解和遵循

---

### 2. Token 效率优化 (Minimal High-Signal Tokens)

**Anthropic 原则**: "Find the smallest set of high-signal tokens"

**改进前**: 329 行，大量冗余和重复
**改进后**: 237 行，减少 **28%** token 使用

**具体优化**:
- 消除 3 处重复的原则部分
- 删除 7 个僵化的阶段描述
- 精简每个 Lesson 的表述
- 合并相似概念

---

### 3. 适当的抽象层次 (Right Altitude)

**Anthropic 原则**: "The right altitude is the Goldilocks zone between hardcoded logic and vague guidance"

**改进前** (过于规定性):
```
## Phase 1: Requirements Analysis
1. Understand the feature/tool requirements deeply
2. Identify all possible use cases (happy path + edge cases)
3. Define success criteria and acceptance tests
4. Document expected behaviors

## Phase 2: Test Planning
1. Create comprehensive test case list
2. Categorize tests: unit, integration, edge cases, performance
...
## Phase 7: Quality Report
```

**改进后** (适当高度):
```xml
<testing_approach>
Your testing philosophy:
- Start by understanding requirements and identifying all test scenarios
- Generate diverse, realistic test data from actual use cases
- Write integration tests that call real code with real data
- Execute tests, capture full output, analyze failures deeply
- Fix issues in actual code, add regression tests, re-run suite until 100% pass
- Document results with metrics and actionable recommendations

Adapt this approach based on task complexity.
</testing_approach>
```

**效果**: 提供指导而非死板步骤，给模型思考和适应的空间

---

### 4. 强化思考模式 (Let Claude Think)

**Anthropic 原则**: "Give Claude time to think - Chain of Thought"

**改进**:
```xml
<workflow_pattern>
You operate in a continuous cycle:

1. <observation> - Analyze current state
2. <thinking> - Reason about next steps
3. <self_critique> - Challenge your approach
4. <action> - Execute ONE tool call

Iterate until all tests pass.
</workflow_pattern>
```

**效果**: 明确的 Chain of Thought 模式，提高推理质量

---

### 5. 工作流程约束 (Workspace Rules) ⭐ 新增

**用户需求**: 通过提示词设定 agent 的工作流程和操作约束

**新增部分**:
```xml
<workspace_rules>
**CRITICAL: Test File Organization**

1. **Working Directory**: ALL test files MUST be created in `test/` directory
   - ✅ Correct: `test/unit/feature.test.ts`
   - ❌ Wrong: `src/tests/feature.test.ts`

2. **Directory Structure**:
   test/
   ├── unit/              # Unit tests
   ├── integration/       # Integration tests
   ├── e2e/              # End-to-end tests
   ├── fixtures/         # Test data
   ├── helpers/          # Test utilities
   └── output/           # Test outputs

3. **File Naming Convention**:
   - Test files: `<feature-name>.test.ts`
   - Fixture files: `<feature-name>.fixture.ts`

4. **Before Creating Files**:
   - Check if test directory structure exists
   - Verify correct subdirectory
   - Follow naming convention
   - Avoid duplicates

**Violation Consequences**:
- Test discovery failures
- CI/CD pipeline errors
- Codebase organization issues
</workspace_rules>
```

**效果**: 
- 明确工作目录约束
- 防止随意创建测试文件
- 结构化 test 目录
- 清晰的违规后果

---

### 6. 标准化工作流 (Standard Testing Workflow) ⭐ 新增

**新增部分**:
```xml
<workflow_pattern>
**Standard Testing Workflow**:
1. **Setup Phase**: Verify `test/` directory structure exists
2. **Analysis Phase**: Read source code to understand functionality
3. **Planning Phase**: Determine test categories, list test cases
4. **Implementation Phase**: Create test files in appropriate `test/` subdirectory
5. **Execution Phase**: Run tests, capture full output
6. **Fix Phase**: Debug root causes, fix bugs, add regression tests
7. **Verification Phase**: Re-run full test suite, verify 100% pass
8. **Documentation Phase**: Update CHANGELOG.md, generate test report

Always start by checking/creating proper `test/` directory structure.
</workflow_pattern>
```

**效果**: 清晰的 8 步工作流，强调目录结构优先

---

### 7. 实战示例更新 (Updated Example)

**改进前**:
```xml
<action>
<read_file>
<path>extension/src/agent/v1/tools/runners/pattern-search.tool.ts</path>
</read_file>
</action>
```

**改进后**:
```xml
<thinking>
First step: Verify test directory structure exists. If not, create:
- test/integration/ (for this integration test)
- test/fixtures/ (for test data)
</thinking>

<self_critique>
CRITICAL: Must verify I'm creating test files in test/ directory, not elsewhere.
File should be test/integration/pattern-search.test.ts, NOT src/tests/ or root level.
</self_critique>

<action>
<execute_command>
<command>ls -la test/</command>
</execute_command>
</action>
```

**效果**: 示例强调目录结构检查，展示正确的工作流

---

## 📊 改进对比总结

| 维度 | 改进前 | 改进后 | 提升 |
|------|--------|--------|------|
| **行数** | 329 行 | 237 行 | -28% |
| **Token 效率** | 低 (大量重复) | 高 (最小高信号) | ✅ |
| **结构清晰度** | 混乱 (Markdown 标题) | 清晰 (XML 标签) | ✅ |
| **抽象层次** | 不当 (7 阶段僵化) | 适中 (灵活指导) | ✅ |
| **思考模式** | 隐含 | 明确 (CoT 循环) | ✅ |
| **工作流约束** | ❌ 缺失 | ✅ 完整 | ⭐ 新增 |
| **目录结构** | ❌ 未规定 | ✅ 明确规定 | ⭐ 新增 |
| **示例质量** | 基础 | 完整 (含目录检查) | ✅ |

---

## 🎯 符合的 Anthropic 原则

✅ **Be clear and direct** - 简洁直接的语言，无冗余  
✅ **Use XML tags** - 结构化组织，清晰层次  
✅ **Right altitude** - 适当抽象，灵活指导  
✅ **Minimal high-signal tokens** - 最小 token，最大信号  
✅ **Give Claude a role** - 明确角色和使命  
✅ **Let Claude think** - Chain of Thought 模式  
✅ **Use examples** - 完整的实战示例  
✅ **Tool definitions** - 清晰的工具说明  

---

## 🔍 关键特性

1. **XML 标签组织** - 10 个清晰的 XML 部分
2. **工作流约束** - 明确的 `test/` 目录规则
3. **目录结构** - 6 个标准子目录 (unit/integration/e2e/fixtures/helpers/output)
4. **文件命名** - 清晰的命名约定
5. **违规后果** - 明确的错误后果
6. **8 步工作流** - 标准化测试流程
7. **CoT 模式** - observation → thinking → self_critique → action
8. **实战经验** - 保留 8 个 Lessons

---

## 💡 使用建议

1. **首次使用**: Agent 会自动检查/创建 `test/` 目录结构
2. **测试文件**: 所有测试文件都会在 `test/` 目录下创建
3. **目录组织**: 自动按 unit/integration/e2e 分类
4. **命名规范**: 自动遵循 `<feature>.test.ts` 命名
5. **工作流**: 自动遵循 8 步标准流程

---

## 📝 总结

这份改进后的提示词:
- ✅ 基于 Anthropic 官方原则，有真实参考来源
- ✅ 逻辑严谨，流程清晰，细节到位
- ✅ 通过提示词设定 agent 工作流程
- ✅ 明确工作目录约束 (`test/` 目录)
- ✅ 防止随意创建测试文件
- ✅ 结构化 test 目录组织
- ✅ 每句话都有明确目的，可还原完整工作流

**如果你能很好地理解这份提示词，那就是一份很好的提示词。**

