import { ToolPromptSchema } from '../utils/utils';

export const thinkToolPrompt: ToolPromptSchema = {
	name: 'think',
	description: `This is your "Super Smart Mini-Brain" (超级无敌小脑子,聪明的大脑) - a complete intelligence analysis, information acquisition, solution design system, and problem-solving chain.

This system includes: intelligence analysis (情报分析), information acquisition (信息获取), solution specification (指定方案), problem-solving chain (解决问题的链路), and the right mindset and attitude for problem-solving (解决问题的心态和态度).

The tool automatically detects complexity:
- **Complex Thinking**: Multi-step plans, systematic analysis. Shows "Planning..." in UI.
- **Simple Thinking**: Quick observations, direct solutions. Shows "Think...." in UI.

Your thoughts are visible to the user for transparency.`,
	parameters: {
		thoughts: {
			type: 'string',
			description: `Your thoughts using the complete Intelligence Analysis & Decision System.

**Decision Flow (What-How-Why-Where)**:

1. WHAT (是什么) - 这是什么情况/问题? 精准简明描述核心问题

2. WHERE (哪里) - 根本原因是什么? 从哪里找资源,从哪里获取信息?
   - Knowledge Check: 我是否有足够信息解决?
   - 信息不足 → 本地搜索/询问用户/网络搜索
   - Complexity Assessment: 简单问题直接执行 / 复杂问题深度分析

3. WHY (为什么) - 原因是什么,什么理由做这件事?
   - 论点 论据 论证 总结

4. HOW (怎么做) - 怎么指定计划,怎么做?
   - 指定方案,工具联动
   - 失败处理: 先想好计划避免代码恶化
   - 多次失败 → 停止并报告
   - 重大故障 → 请求用户手动回滚代码

5. Verification - 完成后运行错误检查

**Core Principles**:
- 失败处理: 先想好计划避免代码恶化,多次失败停止并报告,重大故障请求用户手动回滚
- 界面/操作相关多询问用户
- 擅长组合工具,工具联动是关键
- 冷静清晰思路
- 禁止盲目行动
- 逻辑严谨高质量代码
- 完成后运行错误检查`,
			required: true,
		},
	},
	capabilities: [
		'Intelligence analysis and decision-making (情报分析与决策)',
		'Information acquisition strategy (信息获取策略)',
		'Solution specification (方案指定)',
		'Problem-solving chain execution (问题解决链路)',
		'Tool coordination and workflow planning (工具联动)',
		'Honest problem assessment and failure reporting (诚实评估与报告)',
		'Code relationship chain analysis (代码关系链分析)',
		'Quality-first, logically rigorous solutions (逻辑严谨高质量方案)',
	],
	examples: [
		{
			description: 'Complete decision system - complex refactoring',
			output: `<tool name="think">
  <thoughts>
**WHAT**: Auth module has tight coupling causing maintenance issues

**Knowledge Assessment**: I understand the problem but need to see current code structure

**Information Acquisition**: Will use codebase-retrieval to find auth module, then view files

**HOW**: Refactor using dependency injection:
1. Map current dependencies
2. Design abstraction layer
3. Implement with tests (quality first)
4. Migrate gradually

**WHY**: Violates separation of concerns, making testing difficult

**WHERE**: Start with codebase-retrieval for "auth module dependencies"
  </thoughts>
</tool>`,
		},
		{
			description: 'Simple issue - direct solution',
			output: `<tool name="think">
  <thoughts>
**WHAT**: Null pointer at line 42 accessing user.profile.email

**Knowledge Assessment**: Sufficient - simple defensive coding issue

**HOW**: Add null check before accessing nested property

**WHY**: Profile may be undefined (async loading or missing data)

**WHERE**: Apply fix immediately
  </thoughts>
</tool>`,
		},
		{
			description: 'Information acquisition - need investigation',
			output: `<tool name="think">
  <thoughts>
**WHAT**: Build failing with TypeScript errors in 3 files

**Knowledge Assessment**: Insufficient - need error details

**Information Acquisition**:
- Read terminal output for errors
- If unclear: grep-search for type issues
- If stuck: examine code relationship chain

**WHERE**: First - read terminal output
  </thoughts>
</tool>`,
		},
		{
			description: 'Stubborn problem - stop and report',
			output: `<tool name="think">
  <thoughts>
**WHAT**: App crashes intermittently, 3 fixes failed

**Knowledge Assessment**: Insufficient - stubborn problem needs systematic analysis

**Information Acquisition**: Examine code relationship chains:
1. codebase-retrieval for all components
2. grep-search to trace execution flow
3. Check race conditions, async issues

**WHY**: Multiple failures indicate deeper architectural issue

**WHERE**: STOP blind attempts. Map relationships systematically. If still unsolved, write detailed report for user.
  </thoughts>
</tool>`,
		},
		{
			description: 'Vague user requirement - ask for clarification',
			output: `<tool name="think">
  <thoughts>
**WHAT**: User wants new UI feature but description vague

**Knowledge Assessment**: Insufficient - requirement unclear

**Information Acquisition**: User answer vague → ask clarifying questions

**WHERE**: Ask user:
- What specific UI element?
- Where should it appear?
- What should it do?
- Design preferences?

Then proceed to implementation.
  </thoughts>
</tool>`,
		},
	],
	usageNotes: '',
};
