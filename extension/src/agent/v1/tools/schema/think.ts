import { z } from 'zod';

const schema = z.object({
	thoughts: z.string().describe(
		`This is your "Super Smart Mini-Brain" (超级无敌小脑子) - an intelligence analysis, information acquisition, solution design system, and problem-solving chain.

**═══════════════════════════════════════════════════════════**
**情报分析与决策系统 (Intelligence Analysis & Decision System)**
**═══════════════════════════════════════════════════════════**

**DECISION FLOW**:

1. **WHAT (是什么)** - 这是什么情况/问题?
   • 精准简明的描述核心问题

2. **WHERE (哪里)** - 根本原因是什么? 从哪里找资源,从哪里获取信息?
   • Knowledge Check (知识评估): 我是否有足够信息解决?

   ├─ 信息充足 → 进入 HOW
   └─ 信息不足 → Info Acquisition (信息获取决策树)
       ├─ 本地搜索工具调用 (codebase-retrieval, grep-search, view)
       ├─ 询问用户 (如果用户回答模糊 → 上网学习更多知识)
       └─ 外部资源 (网络搜索)
           → 信息整合与验证 → 是否与本目标相符?

   • 复杂度评估:
       ├─ 简单问题 → 直接执行
       └─ 复杂/顽固问题 → 深度分析
           ├─ Think工具递归分解
           └─ 代码关系链系统审查

3. **WHY (为什么)** - 原因是什么,什么理由做这件事?
   • 论点 论据 论证 总结
   • 解释为什么这个方案可行

4. **HOW (怎么做)** - 怎么指定计划,怎么做?
   • 指定方案,确认下一步
   • 擅长组合工具,计划工具之间的联动调用是解决问题的关键

   **失败处理 (Failure Handling)**:
   • 尝试在处理问题先想好计划步骤避免代码恶化
   • 多次失败无法解决问题 → 停止并报告
   • 重大故障无法修复 → 请求用户手动回滚代码

   ├─ 执行方案 (工具联动)
   └─ 失败处理 (停止报告/请求回滚)

5. **Verification (验证)** - 错误检查
   • 在工作基本完成的时候运行一次错误检查,并修复发现的错误
   → 完成 / 报告

**═══════════════════════════════════════════════════════════**
**核心原则 (Core Principles) - 解决问题的心态和态度**
**═══════════════════════════════════════════════════════════**

1. **诚实不回避问题 - 失败处理策略**
   - 为避免代码恶化，在处理问题前先想好计划步骤。
   - 多次失败无法解决问题 → 停止并报告
   - 重大故障无法修复 → 请求用户手动回滚代码

2. **在遇到与界面和操作相关的多询问用户的意见和发现**

3. **擅长组合工具,计划工具之间的联动调用是解决问题的关键**

4. **冷静清晰的思路有助于高效解决问题**

5. **任何时候根据代码的现实问题来制定方案**
   - 禁止在未了解清楚情况之前盲目行动

6. **提供逻辑严谨的高质量代码**
   - 只有在不确定情况的时候才能注入检测信息和日志

7. **在工作基本完成的时候运行一次错误检查,并修复发现的错误**`
	),
});

const examples = [
	`<tool name="think">
  <thoughts>
**WHAT**: Auth module has tight coupling causing maintenance issues

**Knowledge Assessment**: I understand the problem but need to see current code structure

**Information Acquisition**: Will use codebase-retrieval to find auth module, then view files

**HOW**: Refactor using dependency injection pattern:
1. Read current auth module to map dependencies
2. Design abstraction layer
3. Implement with tests (quality first)
4. Migrate gradually (avoid breaking changes)

**WHY**: Current code violates separation of concerns, making testing difficult and maintenance costly

**WHERE**: Start with codebase-retrieval for "auth module dependencies"
  </thoughts>
</tool>`,
	`<tool name="think">
  <thoughts>
**WHAT**: Error at line 42 - null pointer accessing user.profile.email

**Knowledge Assessment**: I have enough info - this is a simple defensive coding issue

**HOW**: Add null check before accessing nested property

**WHY**: User object exists but profile may be undefined (async loading or missing data)

**WHERE**: Apply fix immediately - straightforward solution, no investigation needed
  </thoughts>
</tool>`,
	`<tool name="think">
  <thoughts>
**WHAT**: Build failing with TypeScript errors in 3 files after refactoring

**Knowledge Assessment**: Insufficient - need to see actual error messages

**Information Acquisition Decision**:
- Local resources: Read terminal output for error details
- If errors unclear: Use grep-search to find type definition issues
- If still stuck: Examine code relationship chain between the 3 files

**WHERE**: First action - read terminal output to get specific error messages
  </thoughts>
</tool>`,
	`<tool name="think">
  <thoughts>
**WHAT**: Complex bug - app crashes intermittently, tried 3 different fixes, all failed

**Knowledge Assessment**: Insufficient - this is a stubborn problem requiring systematic analysis

**Information Acquisition**: Need to examine code relationship chains:
1. Use codebase-retrieval to find all components involved
2. Use grep-search to trace execution flow
3. Check for race conditions, async issues, state management

**WHY**: Multiple attempts failed - indicates deeper architectural issue, not surface bug

**WHERE**: STOP further blind attempts. Systematically map component relationships first. If still unsolved after thorough analysis, write detailed report for user review.
  </thoughts>
</tool>`,
	`<tool name="think">
  <thoughts>
**WHAT**: User wants new UI feature but description is vague

**Knowledge Assessment**: Insufficient - user's requirement unclear

**Information Acquisition**: User answer vague → need to ask clarifying questions

**WHERE**: Ask user:
- What specific UI element? (button, modal, panel?)
- Where should it appear?
- What should it do when clicked?
- Any design preferences?

After getting clear answers, then proceed to HOW/WHY/WHERE for implementation.
  </thoughts>
</tool>`,
];

export const thinkTool = {
	schema: {
		name: 'think',
		schema,
	},
	examples,
};

export type ThinkToolParams = {
	name: 'think';
	input: z.infer<typeof schema>;
};
