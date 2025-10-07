import { BaseAgentTool } from '../base-agent.tool';
import { ToolResponseV2 } from '../types';
import { ThinkToolParams } from '../schema/think';

/**
 * Think Tool - "Super Smart Mini-Brain" (超级无敌小脑子,聪明的大脑)
 *
 * This is a complete intelligence analysis, information acquisition, solution design system,
 * and problem-solving chain. Each thought forms an interconnected system.
 *
 * **═══════════════════════════════════════════════════════════════════════════════**
 * **情报分析与决策系统 (Intelligence Analysis & Decision System)**
 * **═══════════════════════════════════════════════════════════════════════════════**
 *
 * **COMPLETE DECISION FLOW (What-How-Why-Where)**:
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │         情报分析与决策系统                               │
 * │   (Intelligence Analysis & Decision System)             │
 * └─────────────────────────────────────────────────────────┘
 *                         │
 *                         ▼
 *     ┌──────────────────────────────────┐
 *     │   1. WHAT (是什么)                │
 *     │   这是什么情况/问题?               │
 *     │   精准简明描述核心问题             │
 *     └──────────────────────────────────┘
 *                         │
 *                         ▼
 *     ┌──────────────────────────────────┐
 *     │   2. WHERE (哪里)                 │
 *     │   根本原因是什么?                  │
 *     │   从哪里找资源,从哪里获取信息?      │
 *     └──────────────────────────────────┘
 *                         │
 *         ┌───────────────┴───────────────┐
 *         │                               │
 *         ▼                               ▼
 * ┌──────────────────┐          ┌──────────────────┐
 * │ Knowledge Check  │          │ Complexity Check │
 * │ 知识评估          │          │ 复杂度评估        │
 * └──────────────────┘          └──────────────────┘
 *         │                               │
 *         ├─ 信息充足 → WHY               ├─ 简单问题 → 直接执行
 *         └─ 信息不足 ↓                   └─ 复杂问题 ↓
 *                 │                               │
 *         ┌───────┴────────┐              ┌───────┴────────┐
 *         │                │              │                │
 *         ▼                ▼              ▼                ▼
 *   ┌─────────┐    ┌──────────┐  ┌──────────────┐ ┌─────────────┐
 *   │本地搜索  │    │ 外部资源  │  │ Think工具    │ │ 代码关系链   │
 *   │工具调用  │    │ 用户/网络 │  │ 递归分解     │ │ 系统审查     │
 *   └─────────┘    └──────────┘  └──────────────┘ └─────────────┘
 *         │                │              │                │
 *         └────────┬───────┘              └────────┬───────┘
 *                  ▼                               │
 *         ┌─────────────────┐                      │
 *         │  信息整合与验证   │                      │
 *         │  是否与目标相符?  │                      │
 *         └─────────────────┘                      │
 *                  │                               │
 *                  └───────────────────────────────┘
 *                                  │
 *                                  ▼
 *                  ┌──────────────────────────────────┐
 *                  │   3. WHY (为什么)                 │
 *                  │   原因是什么,什么理由做这件事?     │
 *                  │   论点 论据 论证 总结             │
 *                  └──────────────────────────────────┘
 *                                  │
 *                                  ▼
 *                  ┌──────────────────────────────────┐
 *                  │   4. HOW (怎么做)                 │
 *                  │   怎么指定计划,怎么做?             │
 *                  │   工具联动是关键                  │
 *                  │                                  │
 *                  │   失败处理 (Failure Handling):   │
 *                  │   • 先想好计划避免代码恶化        │
 *                  │   • 多次失败 → 停止并报告         │
 *                  │   • 重大故障 → 请求用户手动回滚   │
 *                  └──────────────────────────────────┘
 *                                  │
 *                  ┌───────────────┴───────────────┐
 *                  │                               │
 *                  ▼                               ▼
 *          ┌──────────────┐              ┌──────────────────┐
 *          │  执行方案     │              │   失败处理        │
 *          │  工具联动     │              │                  │
 *          └──────────────┘              │ • 停止并报告      │
 *                  │                     │ • 请求用户手动    │
 *                  ▼                     │   回滚代码        │
 *          ┌──────────────┐              └──────────────────┘
 *          │  5. 验证      │                        │
 *          │  错误检查     │                        │
 *          └──────────────┘                        │
 *                  │                               │
 *                  └───────────────────────────────┘
 *                                  │
 *                                  ▼
 *                  ┌──────────────────────────────────┐
 *                  │   完成 / 报告                     │
 *                  └──────────────────────────────────┘
 *
 * **═══════════════════════════════════════════════════════════════════════════════**
 * **核心原则 (Core Principles) - 解决问题的心态和态度**
 * **═══════════════════════════════════════════════════════════════════════════════**
 *
 * 1. 失败处理策略:
 *    • 尝试在处理问题先想好计划步骤避免代码恶化
 *    • 多次失败无法解决问题 → 停止并报告
 *    • 重大故障无法修复 → 请求用户手动回滚代码
 * 2. 界面和操作相关多询问用户的意见和发现
 * 3. 擅长组合工具,计划工具之间的联动调用是解决问题的关键
 * 4. 冷静清晰的思路有助于高效解决问题
 * 5. 任何时候根据代码的现实问题来制定方案,禁止在未了解清楚情况之前盲目行动
 * 6. 提供逻辑严谨的高质量代码,只有在不确定情况的时候才能注入检测信息和日志
 * 7. 在工作基本完成的时候运行一次错误检查,并修复发现的错误
 *
 * The tool automatically detects whether the thinking is complex (planning) or simple
 * based on the content and structure of the thoughts.
 *
 * The thoughts are visible to the user, providing transparency into the AI's reasoning process.
 */
export class ThinkTool extends BaseAgentTool<ThinkToolParams> {
	/**
	 * Analyzes if the thought follows the What-How-Why-Where framework
	 * @param thoughts The thought content to analyze
	 * @returns Object indicating framework usage and completeness
	 */
	private analyzeFrameworkUsage(thoughts: string): {
		usesFramework: boolean;
		hasWhat: boolean;
		hasHow: boolean;
		hasWhy: boolean;
		hasWhere: boolean;
		completeness: number;
	} {
		// Check for explicit framework markers (case-insensitive)
		const hasWhat = /\*\*what\*\*|what:/i.test(thoughts);
		const hasHow = /\*\*how\*\*|how:/i.test(thoughts);
		const hasWhy = /\*\*why\*\*|why:/i.test(thoughts);
		const hasWhere = /\*\*where\*\*|where:/i.test(thoughts);

		// Also check for decision system keywords
		const hasKnowledgeAssessment = /knowledge assessment|do i have|sufficient|insufficient/i.test(thoughts);
		const hasInfoAcquisition = /information acquisition|need more info|need to (investigate|search|ask)/i.test(thoughts);

		const frameworkElements = [hasWhat, hasHow, hasWhy, hasWhere].filter(Boolean).length;
		const decisionSystemUsage = hasKnowledgeAssessment || hasInfoAcquisition;

		// Consider it using framework if has 2+ elements OR uses decision system keywords
		const usesFramework = frameworkElements >= 2 || decisionSystemUsage;
		const completeness = frameworkElements / 4;

		return {
			usesFramework,
			hasWhat,
			hasHow,
			hasWhy,
			hasWhere,
			completeness,
		};
	}
	/**
	 * Analyzes the thought content to determine if it represents complex/multi-step thinking
	 *
	 * Complex thinking indicators:
	 * - Long, detailed thoughts (>200 characters)
	 * - Contains numbered or bulleted lists
	 * - Contains step-by-step planning
	 * - Contains multiple sections or phases
	 * - Contains keywords like "plan", "step", "phase", "approach", "strategy"
	 * - Contains analysis of multiple alternatives or trade-offs
	 *
	 * @param thoughts The thought content to analyze
	 * @returns true if this is complex thinking, false for simple thinking
	 */
	private isComplexThinking(thoughts: string): boolean {
		const trimmedThoughts = thoughts.trim();

		// Check length - complex thoughts are usually longer
		if (trimmedThoughts.length > 200) {
			return true;
		}

		// Check for list structures (numbered or bulleted)
		const hasNumberedList = /\n\s*\d+[\.)]\s+/m.test(trimmedThoughts);
		const hasBulletList = /\n\s*[-*•]\s+/m.test(trimmedThoughts);
		if (hasNumberedList || hasBulletList) {
			return true;
		}

		// Check for planning keywords (case-insensitive)
		const planningKeywords = [
			'plan',
			'step',
			'phase',
			'approach',
			'strategy',
			'first',
			'second',
			'third',
			'then',
			'next',
			'finally',
			'before',
			'after',
			'workflow',
			'process',
			'procedure',
			'sequence',
		];

		const lowerThoughts = trimmedThoughts.toLowerCase();
		const keywordMatches = planningKeywords.filter((keyword) =>
			lowerThoughts.includes(keyword)
		).length;

		// If multiple planning keywords are present, it's likely complex thinking
		if (keywordMatches >= 2) {
			return true;
		}

		// Check for multiple paragraphs or sections
		const paragraphs = trimmedThoughts
			.split(/\n\s*\n/)
			.filter((p) => p.trim().length > 0);
		if (paragraphs.length >= 3) {
			return true;
		}

		// Check for analysis patterns (comparing alternatives, trade-offs)
		const analysisPatterns = [
			/(?:option|alternative|approach)\s*\d+/i,
			/(?:pros?|cons?|advantages?|disadvantages?)/i,
			/(?:trade-?off|consider|evaluate|compare)/i,
			/(?:if|when|unless|however|although|whereas)/i,
		];

		const analysisMatches = analysisPatterns.filter((pattern) =>
			pattern.test(trimmedThoughts)
		).length;

		if (analysisMatches >= 2) {
			return true;
		}

		// Default to simple thinking
		return false;
	}

	async execute(): Promise<ToolResponseV2> {
		const { thoughts } = this.params.input;
		const { updateAsk } = this.params;

		if (!thoughts || thoughts.trim().length === 0) {
			return this.toolResponse('error', 'Thoughts cannot be empty');
		}

		const trimmedThoughts = thoughts.trim();

		// Analyze framework usage
		const frameworkAnalysis = this.analyzeFrameworkUsage(trimmedThoughts);

		// Determine if this is complex thinking (planning) or simple thinking
		const isComplex = this.isComplexThinking(trimmedThoughts);

		// Update the UI to show the thinking process
		// The frontend will display "Planning..." for complex thinking
		// and "Think...." for simple thinking
		await updateAsk(
			'tool',
			{
				tool: {
					tool: 'think',
					thoughts: trimmedThoughts,
					isComplexThinking: isComplex,
					usesFramework: frameworkAnalysis.usesFramework,
					frameworkCompleteness: frameworkAnalysis.completeness,
					approvalState: 'approved',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		// Return the thoughts as the tool response
		// Include framework usage info for better context
		let thinkingType = isComplex ? 'Complex planning' : 'Quick analysis';
		if (frameworkAnalysis.usesFramework) {
			thinkingType += ' (What-How-Why-Where)';
		}

		return this.toolResponse('success', `[${thinkingType}] ${trimmedThoughts}`);
	}
}
