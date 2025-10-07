import dedent from 'dedent';
import { BaseHook, HookOptions } from './base-hook';
import { MainAgent } from '../main-agent';
import { ApiManager } from '../../../api/api-handler';
import { serverRPC } from '../../../router/utils/extension-server';
import { PLANNER_SYSTEM_PROMPT } from '../prompts/agents/planner.prompt';

/**
 * Options specific to the enhance prompt hook
 */
export interface EnhancePromptOptions extends HookOptions {
	/**
	 * Model to use for prompt enhancement (optional, will use current model if not specified)
	 */
	modelId?: string;
	/**
	 * Provider to use for prompt enhancement (optional, will use current provider if not specified)
	 */
	providerId?: string;
}

export const enhancePromptDefaultPrompt = dedent`
You are a prompt enhancement specialist focused on initial prompt cleanup and structuring. Your job is to take user prompts and perform initial enhancement to make them clearer and more structured, preparing them for further analysis by a planning agent.

Your role is the FIRST STAGE of a two-stage enhancement process:

**Stage 1 (Your Role) - Initial Enhancement:**
1. **Clarity**: Fix grammar, spelling, and unclear phrasing
2. **Structure**: Organize the request into logical sections
3. **Basic Context**: Add essential missing context that's clearly implied
4. **Intent Clarification**: Make the core request unambiguous
5. **Format Standardization**: Structure the prompt in a consistent format

**Guidelines for Stage 1:**
- Focus on cleanup and basic structuring, not deep analysis
- Preserve the original intent completely
- Don't add complex technical details or assumptions
- Don't break down into detailed steps (that's for Stage 2)
- Keep enhancements conservative and obvious
- Prepare the prompt for further analysis by a planning specialist

**Output Format:**
Provide only the cleaned and initially enhanced prompt as your response, without any additional explanation, formatting, or meta-commentary. The output should be ready for further analysis by a planning agent.
`;

/**
 * Hook for enhancing user prompts using AI
 */
export class EnhancePromptHook extends BaseHook {
	private options: EnhancePromptOptions;

	constructor(options: EnhancePromptOptions, MainAgent: MainAgent) {
		super(options, MainAgent);
		this.options = options;
	}

	/**
	 * Enhance a user prompt using a two-stage AI process
	 * Stage 1: Initial cleanup and structuring
	 * Stage 2: Deep analysis and planning using planner agent
	 * @param userPrompt The original user prompt to enhance
	 * @returns Enhanced prompt or null if enhancement fails
	 */
	public async enhancePrompt(userPrompt: string): Promise<string | null> {
		if (!userPrompt.trim()) {
			return null;
		}

		try {
			console.log('[EnhancePrompt] Starting two-stage enhancement process');

			// Stage 1: Initial enhancement and cleanup
			const stage1Result = await this.performStage1Enhancement(userPrompt);
			if (!stage1Result) {
				console.error('[EnhancePrompt] Stage 1 enhancement failed');
				return null;
			}

			console.log('[EnhancePrompt] Stage 1 completed, starting Stage 2');

			// Stage 2: Deep analysis using planner agent
			const stage2Result = await this.performStage2Planning(stage1Result);
			if (!stage2Result) {
				console.error('[EnhancePrompt] Stage 2 planning failed');
				return stage1Result; // Return stage 1 result as fallback
			}

			console.log(
				'[EnhancePrompt] Two-stage enhancement completed successfully'
			);
			return stage2Result;
		} catch (error) {
			console.error('Failed to enhance prompt:', error);
			return null;
		}
	}

	/**
	 * Stage 1: Initial prompt cleanup and structuring
	 */
	private async performStage1Enhancement(
		userPrompt: string
	): Promise<string | null> {
		try {
			console.log('[EnhancePrompt] Starting Stage 1 enhancement');

			// Try to get observer model first, fallback to current main model if not configured
			let providerData, model;
			try {
				const observerModelInfo = await serverRPC()
					.getClient()
					.currentObserverModel({});
				providerData = observerModelInfo.providerData;
				model = observerModelInfo.model;
				console.log('[EnhancePrompt] Using observer model:', {
					modelId: model.id,
					provider: model.provider,
				});
			} catch (error) {
				console.log(
					'[EnhancePrompt] Observer model not configured, falling back to current main model'
				);
				const currentModelInfo = await serverRPC()
					.getClient()
					.currentModelInfo({});
				providerData = currentModelInfo.providerData;
				model = currentModelInfo.model;
				console.log('[EnhancePrompt] Using current main model:', {
					modelId: model.id,
					provider: model.provider,
				});
			}

			const targetModel = this.options.modelId
				? providerData.models.find((m) => m.id === this.options.modelId) ||
					model
				: model;

			const stage1Request = dedent`
				Please perform initial cleanup and structuring of the following user prompt. This is Stage 1 of a two-stage process.

				Focus on:
				1. Grammar and clarity fixes
				2. Basic structure organization
				3. Intent clarification
				4. Essential context addition

				Original prompt:
				"""
				${userPrompt}
				"""

				Provide only the cleaned and structured prompt, ready for further analysis.
			`;

			const messages = [
				{
					role: 'user' as const,
					content: [
						{
							type: 'text' as const,
							text: stage1Request,
						},
					],
				},
			];

			const providerSettings = {
				providerSettings: providerData.currentProvider || {
					providerId: targetModel.provider,
					apiKey: '',
				},
				models: providerData.models,
				model: targetModel,
			};

			const apiManager = new ApiManager(
				this.MainAgent.providerRef.deref()!,
				providerSettings
			);

			// Create abort controller if not available (e.g., when MainAgent is initialized with noTask)
			const abortController =
				this.MainAgent.taskExecutor.abortController || new AbortController();

			const response = apiManager.createApiStreamRequest(
				messages,
				abortController,
				{
					systemPrompt: enhancePromptDefaultPrompt,
				},
				true, // skipProcessing
				undefined, // postProcessConversationCallback
				true // silent mode - don't update UI status
			);

			let output = '';
			for await (const message of response) {
				if (message.code === -1) {
					throw new Error('Stage 1 enhancement failed');
				}
				if (message.code === 1) {
					output =
						message.body.anthropic.content[0].type === 'text'
							? message.body.anthropic.content[0].text
							: '';
					break;
				}
			}

			return output.trim() || null;
		} catch (error) {
			console.error('Stage 1 enhancement error:', error);
			return null;
		}
	}

	/**
	 * Stage 2: Deep analysis and planning using actual planner agent
	 */
	private async performStage2Planning(
		stage1Prompt: string
	): Promise<string | null> {
		try {
			console.log('[EnhancePrompt] Starting Stage 2 with planner agent');

			const ts = Date.now();
			const stateManager = this.MainAgent.getStateManager();

			// Create planner agent instructions for prompt enhancement
			const plannerInstructions = dedent`
				You are tasked with enhancing a user prompt that has already been cleaned and structured in Stage 1.

				Your goal is to analyze this prompt deeply and create the most effective final version possible.

				**Stage 1 Enhanced Prompt:**
				"""
				${stage1Prompt}
				"""

				**Your Task:**
				1. Analyze the intent and requirements thoroughly
				2. Identify what additional context, constraints, or structure would improve results
				3. Apply advanced prompting techniques (examples, chain-of-thought, specific formats, etc.)
				4. Create the most effective final version

				**Critical Requirement:**
				Your final response must contain ONLY the enhanced prompt - no analysis, no explanation, no meta-commentary.
				Just provide the final, optimized prompt ready for immediate use.

				Use your planning expertise to create the best possible version, then use exit_agent with the final enhanced prompt as your result.
			`;

			// Spawn planner agent
			const plannerSystemPrompt = PLANNER_SYSTEM_PROMPT(
				this.MainAgent.getApiManager().getModelInfo()?.supportsImages || false
			);

			await stateManager.subAgentManager.spawnSubAgent(ts, {
				name: 'planner',
				state: 'RUNNING',
				ts,
				apiConversationHistory: [],
				historyErrors: {},
				systemPrompt: plannerSystemPrompt,
			});

			// Get the spawned planner agent state
			const plannerAgent = stateManager.subAgentManager.state;
			if (!plannerAgent) {
				throw new Error('Failed to create planner agent');
			}

			// Execute planner agent with instructions
			const plannerResult = await this.executePlannerAgent(
				plannerAgent,
				plannerInstructions
			);

			// Clean up the sub-agent
			await stateManager.subAgentManager.exitSubAgent();

			return plannerResult;
		} catch (error) {
			console.error('Stage 2 planning error:', error);
			return null;
		}
	}

	/**
	 * Execute planner agent and get the enhanced prompt result
	 */
	private async executePlannerAgent(
		plannerAgent: any,
		instructions: string
	): Promise<string | null> {
		try {
			console.log('[EnhancePrompt] Executing planner agent with instructions');

			// Create a message for the planner agent
			const userMessage = {
				role: 'user' as const,
				content: [
					{
						type: 'text' as const,
						text: instructions,
					},
				],
			};

			// Add message to planner's conversation history
			plannerAgent.apiConversationHistory.push(userMessage);

			// Execute the planner agent using the API manager
			const apiManager = this.MainAgent.getApiManager();

			// Create abort controller if not available (e.g., when MainAgent is initialized with noTask)
			const abortController =
				this.MainAgent.taskExecutor.abortController || new AbortController();

			const response = apiManager.createApiStreamRequest(
				plannerAgent.apiConversationHistory,
				abortController,
				{
					systemPrompt: plannerAgent.systemPrompt,
				},
				true, // skipProcessing
				undefined, // postProcessConversationCallback
				true // silent mode - don't update UI status
			);

			let finalOutput = '';
			let hasCompleted = false;

			for await (const message of response) {
				if (message.code === -1) {
					console.error(
						'[EnhancePrompt] Planner agent execution failed:',
						message.body
					);
					throw new Error('Planner agent execution failed');
				}
				if (message.code === 1) {
					const content = message.body.anthropic.content[0];
					if (content.type === 'text') {
						finalOutput += content.text;
					}
					hasCompleted = true;
					break;
				}
			}

			if (!hasCompleted) {
				throw new Error('Planner agent did not complete successfully');
			}

			console.log(
				'[EnhancePrompt] Planner agent completed, extracting enhanced prompt'
			);

			// Extract the final enhanced prompt from planner's output
			const enhancedPrompt =
				this.extractEnhancedPromptFromPlannerOutput(finalOutput);

			if (enhancedPrompt) {
				console.log(
					'[EnhancePrompt] Successfully extracted enhanced prompt from planner output'
				);
				return enhancedPrompt;
			} else {
				console.log(
					'[EnhancePrompt] No structured output found, using raw planner output'
				);
				// Fallback to cleaned raw output if no structured result found
				return this.cleanPlannerOutput(finalOutput);
			}
		} catch (error) {
			console.error('Planner agent execution error:', error);
			return null;
		}
	}

	/**
	 * Extract the enhanced prompt from planner agent's output
	 */
	private extractEnhancedPromptFromPlannerOutput(
		output: string
	): string | null {
		// Look for exit_agent tool call with the enhanced prompt
		const exitAgentMatch = output.match(
			/<exit_agent>\s*<result>([\s\S]*?)<\/result>\s*<\/exit_agent>/i
		);
		if (exitAgentMatch) {
			return exitAgentMatch[1].trim();
		}

		// Look for attempt_completion tool call with the enhanced prompt
		const attemptCompletionMatch = output.match(
			/<attempt_completion>\s*<result>([\s\S]*?)<\/result>\s*<\/attempt_completion>/i
		);
		if (attemptCompletionMatch) {
			return attemptCompletionMatch[1].trim();
		}

		// Look for any tool call that might contain the result
		const toolResultMatch = output.match(
			/<[^>]+>\s*<result>([\s\S]*?)<\/result>\s*<\/[^>]+>/i
		);
		if (toolResultMatch) {
			return toolResultMatch[1].trim();
		}

		return null;
	}

	/**
	 * Clean planner output by removing tool calls and meta-commentary
	 */
	private cleanPlannerOutput(output: string): string | null {
		// Remove tool calls (anything between < and >)
		let cleaned = output.replace(/<[^>]*>[\s\S]*?<\/[^>]*>/g, '');

		// Remove thinking tags and their content
		cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');

		// Remove observation tags and their content
		cleaned = cleaned.replace(/<observation>[\s\S]*?<\/observation>/gi, '');

		// Remove action tags and their content
		cleaned = cleaned.replace(/<action>[\s\S]*?<\/action>/gi, '');

		// Remove markdown headers and bold text
		cleaned = cleaned.replace(/#{1,6}\s+/g, '');
		cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');

		// Split into lines and filter out meta-commentary
		const lines = cleaned.split('\n');
		const contentLines: string[] = [];

		for (const line of lines) {
			const trimmed = line.trim();
			if (
				trimmed &&
				!trimmed.startsWith('I ') &&
				!trimmed.startsWith('Let me ') &&
				!trimmed.startsWith('Now ') &&
				!trimmed.startsWith('First ') &&
				!trimmed.includes('analyze') &&
				!trimmed.includes('planning') &&
				!trimmed.includes('approach')
			) {
				contentLines.push(line);
			}
		}

		const result = contentLines.join('\n').trim();
		return result || null;
	}

	/**
	 * Update enhancement options
	 */
	public updateEnhanceOptions(options: Partial<EnhancePromptOptions>): void {
		this.options = { ...this.options, ...options };
		this.updateOptions(options);
	}

	/**
	 * Required implementation from BaseHook
	 */
	protected async executeHook(): Promise<string | null> {
		// This hook is not meant to be triggered automatically
		// It's called manually via enhancePrompt method
		return null;
	}
}

/**
 * Create an enhance prompt hook instance
 */
export function createEnhancePromptHook(
	MainAgent: MainAgent,
	options?: Partial<EnhancePromptOptions>
): EnhancePromptHook {
	const defaultOptions: EnhancePromptOptions = {
		hookName: 'enhance-prompt',
		triggerEvery: undefined, // Manual trigger only
		...options,
	};

	return new EnhancePromptHook(defaultOptions, MainAgent);
}
