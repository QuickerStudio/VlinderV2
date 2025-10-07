import dedent from 'dedent';
import { MainAgent } from '../main-agent';
import { BaseHook, HookOptions } from './base-hook';
import { getCwd } from '../utils';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ApiManager } from '../../../api/api-handler';
import { serverRPC } from '../../../router/utils/extension-server';
import { V1ClaudeMessage } from '../../../shared/messages/extension-message';

/**
 * Options specific to the scholar hook
 */
export interface ScholarHookOptions extends HookOptions {
	/**
	 * Trigger when learning opportunities are detected
	 */
	autoTrigger?: boolean;
}

export const scholarHookDefaultPrompt = dedent`
You are a Scholar Agent - an intelligent memory and knowledge management system for development activities.

You work alongside the main coding agent to:
1. **Extract and summarize knowledge** from successful development sessions
2. **Search and retrieve** relevant knowledge from the knowledge base
3. **Provide insights** based on accumulated experience

**OPERATION MODES:**

**Mode 1: Knowledge Extraction & Summarization**
When analyzing development activity, provide:

# Knowledge Summary

## Session Overview
[Brief summary of what was accomplished in this session]

## Key Learnings
- [Learning 1: What was discovered or learned]
- [Learning 2: Important insight or pattern]
- [Learning 3: Best practice identified]

## Technical Patterns
- **Pattern Name**: Description and context
- **Applicability**: Where this pattern can be reused
- **Effectiveness**: Why this approach worked well

## Actionable Knowledge
- [Knowledge item 1: Specific technique or approach]
- [Knowledge item 2: Tool usage or workflow improvement]
- [Knowledge item 3: Problem-solving methodology]

## Future Applications
- [How this knowledge can be applied in similar contexts]
- [Recommendations for future development work]

**Mode 2: Knowledge Search & Retrieval**
When searching the knowledge base, provide:

# Knowledge Search Results

## Relevant Patterns
[List matching patterns from knowledge base]

## Similar Experiences
[Previous sessions with similar challenges/solutions]

## Recommendations
[Suggested approaches based on accumulated knowledge]

**RESPONSE STYLE:**
- Be concise but comprehensive
- Focus on actionable insights
- Highlight transferable knowledge
- Maintain development context
- Use clear, structured formatting

You operate as a fully automatic background service:
- Triggered automatically when tasks complete (attempt_completion tool called)
- No user approval or confirmation required
- Process knowledge extraction independently
- The main agent can continue working while you analyze and store knowledge
`;

/**
 * Hook that automatically detects learning opportunities and extracts knowledge
 */
export class ScholarHook extends BaseHook {
	private options: ScholarHookOptions;

	constructor(options: ScholarHookOptions, MainAgent: MainAgent) {
		super(options, MainAgent);
		this.options = options;
	}

	/**
	 * Allow main agent to explicitly request Scholar services
	 */
	async requestScholarService(
		type: 'extract' | 'search' | 'summarize',
		context?: string
	): Promise<string | null> {
		console.log(`[ScholarHook] - Explicit ${type} request from main agent`);

		// Force execution regardless of normal shouldExecute conditions
		const ts = Date.now();

		try {
			const { providerData, model } = await serverRPC()
				.getClient()
				.currentScholarModel({});
			const { scholarSettings } = await serverRPC()
				.getClient()
				.getScholarSettings({});
			if (!scholarSettings) {
				throw new Error('Scholar settings not found');
			}

			this.MainAgent.taskExecutor.sayHook({
				hookName: 'scholar',
				state: 'pending',
				output: `Processing ${type} request...`,
				input: context || '',
				ts,
				modelId: model.id,
			});

			// Get current context
			const currentContext = this.getCurrentContext();
			const taskHistory = [...currentContext.history].slice(
				-scholarSettings.scholarPullMessages * 2
			);

			// Add explicit request
			taskHistory.push({
				role: 'user',
				content: [
					{
						type: 'text',
						text: this.createScholarPrompt(
							type,
							context || currentContext.taskMsgText
						),
					},
				],
			});

			// Execute Scholar request
			const providerSettings = {
				providerSettings: providerData.currentProvider || {
					providerId: model.provider,
					apiKey: '',
				},
				models: providerData.models,
				model,
			};

			const apiManager = new ApiManager(
				this.MainAgent.providerRef.deref()!,
				providerSettings
			);
			const scholarResponse = await apiManager.createApiStreamRequest(
				taskHistory,
				this.MainAgent.taskExecutor.abortController!,
				{
					systemPrompt:
						scholarSettings.scholarPrompt ?? scholarHookDefaultPrompt,
				},
				true
			);

			let finalOutput = ``;
			let apiMetrics: V1ClaudeMessage['apiMetrics'];
			for await (const message of scholarResponse) {
				if (message.code === -1) {
					throw new Error('Scholar service request failed');
				}
				if (message.code === 1) {
					const {
						inputTokens,
						outputTokens,
						cacheCreationInputTokens,
						cacheReadInputTokens,
					} = message.body.internal;
					finalOutput =
						message.body.anthropic.content[0].type === 'text'
							? message.body.anthropic.content[0].text
							: ``;
					apiMetrics = {
						cost: 0, // Cost calculation would be handled by the API manager
						inputTokens,
						outputTokens,
						inputCacheRead: cacheReadInputTokens,
						inputCacheWrite: cacheCreationInputTokens,
					};
					break;
				}
			}

			// Handle response
			let success = true;
			if (type === 'extract' || type === 'summarize') {
				success = await this.saveKnowledgeToFile(finalOutput, currentContext);
				// Update learning keywords with discovered high-value terms
				await this.updateLearningKeywords(finalOutput);
			}

			this.MainAgent.taskExecutor.sayHook({
				hookName: 'scholar',
				state: 'completed',
				output: finalOutput,
				input: context || '',
				apiMetrics,
				ts,
				modelId: model.id,
			});

			return this.createStatusMessage(type, success, finalOutput);
		} catch (error) {
			this.MainAgent.taskExecutor.sayHook({
				hookName: 'scholar',
				state: 'error',
				output: `${type} request failed: ${error instanceof Error ? error.message : String(error)}`,
				input: context || '',
				ts,
				modelId: 'scholar-service',
			});

			console.error(`[ScholarHook] - ${type} request failed:`, error);
			return null;
		}
	}

	private async shouldExecute(): Promise<boolean> {
		try {
			const history =
				this.MainAgent.getStateManager().state.apiConversationHistory;
			const claudeMessages =
				this.MainAgent.getStateManager().state.claudeMessages;

			// Don't execute if in sub-agent
			const isInSubAgent =
				!!this.MainAgent.getStateManager().subAgentManager.currentSubAgentId;
			const pastFirstMsg = history.length > 2;

			// Scholar can be triggered by (fully automatic, no user approval needed):
			// 1. After task completion (attempt_completion tool called)
			// 2. Learning opportunity detection
			// 3. Explicit request from main agent
			const hasTaskCompleted = this.detectTaskCompletion(claudeMessages);
			const hasLearningOpportunity = await this.detectLearningOpportunity(
				history.slice(-3)
			);
			const lastMessage = history.slice(-1)?.[0]?.content?.[0];
			const lastMessageText =
				typeof lastMessage === 'string'
					? lastMessage
					: lastMessage?.type === 'text'
						? lastMessage.text
						: '';
			const hasExplicitRequest =
				this.detectExplicitScholarRequest(lastMessageText);

			return (
				pastFirstMsg &&
				!isInSubAgent &&
				(hasTaskCompleted || hasLearningOpportunity || hasExplicitRequest)
			);
		} catch (e) {
			return false;
		}
	}

	/**
	 * Detect if task completion tool has been called (automatic trigger, no user approval needed)
	 */
	private detectTaskCompletion(claudeMessages: any[]): boolean {
		try {
			// Look for recent attempt_completion tool call (regardless of approval state)
			const recentMessages = claudeMessages.slice(-5); // Check last 5 messages

			for (const message of recentMessages.reverse()) {
				if (message.ask === 'tool' && message.text) {
					try {
						const toolData = JSON.parse(message.text);
						// Trigger on any attempt_completion call, not just approved ones
						if (toolData.tool === 'attempt_completion') {
							return true;
						}
					} catch (e) {
						// Skip invalid JSON
						continue;
					}
				}
			}
			return false;
		} catch (e) {
			return false;
		}
	}

	/**
	 * Detect if main agent explicitly requests Scholar services
	 */
	private detectExplicitScholarRequest(messageText: string): boolean {
		const scholarKeywords = [
			'summarize',
			'remember',
			'save knowledge',
			'extract learning',
			'document this',
			'store experience',
			'knowledge base',
			'memory',
			'what did we learn',
			'search knowledge',
			'recall pattern',
		];

		const lowerText = messageText.toLowerCase();
		return scholarKeywords.some((keyword) => lowerText.includes(keyword));
	}

	/**
	 * Detect if there's a learning opportunity in recent messages
	 */
	private async detectLearningOpportunity(messages: any[]): Promise<boolean> {
		try {
			// Get learning keywords from settings
			const { scholarSettings } = await serverRPC()
				.getClient()
				.getScholarSettings({});

			// Default keywords if none configured
			const defaultKeywords = [
				'successfully',
				'resolved',
				'fixed',
				'implemented',
				'optimized',
				'discovered',
				'found',
				'pattern',
				'approach',
				'solution',
				'effective',
				'efficient',
				'best practice',
				'lesson learned',
			];

			// Parse keywords from settings or use defaults
			let learningKeywords = defaultKeywords;
			if (scholarSettings?.learningKeywords) {
				learningKeywords = scholarSettings.learningKeywords
					.split(',')
					.map((keyword: string) => keyword.trim().toLowerCase())
					.filter((keyword: string) => keyword.length > 0);
			}

			const messageText = messages
				.map((msg) => this.extractTextFromMessage(msg))
				.join(' ')
				.toLowerCase();

			return learningKeywords.some((keyword) => messageText.includes(keyword));
		} catch (error) {
			console.error(
				'[ScholarHook] Error detecting learning opportunity:',
				error
			);
			// Fallback to default behavior
			const defaultKeywords = [
				'successfully',
				'resolved',
				'fixed',
				'implemented',
				'optimized',
				'discovered',
				'found',
				'pattern',
				'approach',
				'solution',
				'effective',
				'efficient',
				'best practice',
				'lesson learned',
			];

			const messageText = messages
				.map((msg) => this.extractTextFromMessage(msg))
				.join(' ')
				.toLowerCase();

			return defaultKeywords.some((keyword) => messageText.includes(keyword));
		}
	}

	protected async executeHook(): Promise<string | null> {
		const ts = Date.now();
		const { providerData, model } = await serverRPC()
			.getClient()
			.currentScholarModel({});
		const { scholarSettings } = await serverRPC()
			.getClient()
			.getScholarSettings({});
		if (!scholarSettings) {
			throw new Error('Scholar settings not found');
		}
		try {
			if (!(await this.shouldExecute())) {
				return null;
			}
			console.log('[ScholarHook] - executing scholar hook');
			// Get current context from state
			const currentContext = this.getCurrentContext();

			// Determine the type of Scholar request
			const requestType = this.determineRequestType(currentContext.history);

			// we take the last x pairs of messages
			const taskHistory = [...currentContext.history].slice(
				-scholarSettings.scholarPullMessages * 2
			);
			const lastMessage = taskHistory.at(-1);

			// must happen
			if (
				lastMessage?.role === 'assistant' &&
				Array.isArray(lastMessage.content)
			) {
				const scholarPrompt = this.createScholarPrompt(
					requestType,
					currentContext.taskMsgText
				);
				taskHistory.push({
					role: 'user',
					content: [
						{
							type: 'text',
							text: scholarPrompt,
						},
					],
				});
			} else {
				// should not happen
				console.error(
					`[ScholarHook] - last message is not a assistant message [${lastMessage?.role} | length: ${lastMessage?.content.length}]`
				);
				return null;
			}
			this.MainAgent.taskExecutor.sayHook({
				hookName: 'scholar',
				state: 'pending',
				output: '',
				input: '',
				ts,
				modelId: model.id,
			});
			const providerSettings = {
				providerSettings: providerData.currentProvider || {
					providerId: model.provider,
					apiKey: '', // Will be filled by the provider
				},
				models: providerData.models,
				model,
			};
			const apiManager = new ApiManager(
				this.MainAgent.providerRef.deref()!,
				providerSettings
			);
			const scholarResponse = await apiManager.createApiStreamRequest(
				taskHistory,
				this.MainAgent.taskExecutor.abortController!,
				{
					systemPrompt:
						scholarSettings.scholarPrompt ?? scholarHookDefaultPrompt,
				},
				true
			);

			let finalOutput = ``;
			let apiMetrics: V1ClaudeMessage['apiMetrics'];
			for await (const message of scholarResponse) {
				if (message.code === -1) {
					console.error('Scholar hook failed to execute:', message.body);
					throw new Error('Scholar hook failed to execute');
				}
				if (message.code === 1) {
					const {
						inputTokens,
						outputTokens,
						cacheCreationInputTokens,
						cacheReadInputTokens,
					} = message.body.internal;
					finalOutput =
						message.body.anthropic.content[0].type === 'text'
							? message.body.anthropic.content[0].text
							: ``;
					apiMetrics = {
						cost: 0, // Cost calculation would be handled by the API manager
						inputTokens,
						outputTokens,
						inputCacheRead: cacheReadInputTokens,
						inputCacheWrite: cacheCreationInputTokens,
					};
					break;
				}
			}

			// Handle the response based on request type
			const responseRequestType = this.determineRequestType(
				currentContext.history
			);
			let success = true;

			if (
				responseRequestType === 'extract' ||
				responseRequestType === 'summarize'
			) {
				// Save extracted knowledge to file system
				success = await this.saveKnowledgeToFile(finalOutput, currentContext);
			} else if (responseRequestType === 'search') {
				// For search requests, we don't save but we might want to log the search
				console.log('[ScholarHook] - Knowledge search completed');
			}

			this.MainAgent.taskExecutor.sayHook({
				hookName: 'scholar',
				state: 'completed',
				output: finalOutput,
				input: '',
				apiMetrics,
				ts,
				modelId: model.id,
			});

			if (finalOutput.length > 0) {
				const statusMessage = this.createStatusMessage(
					responseRequestType,
					success,
					finalOutput
				);
				return statusMessage;
			} else {
				this.MainAgent.taskExecutor.sayHook({
					hookName: 'scholar',
					state: 'error',
					output: finalOutput,
					input: '',
					apiMetrics,
					ts,
					modelId: model.id,
				});
			}

			return finalOutput;
		} catch (error) {
			this.MainAgent.taskExecutor.sayHook({
				hookName: 'scholar',
				state: 'error',
				output: '',
				input: '',
				ts,
				modelId: model.id,
			});
			console.error('Failed to execute scholar hook:', error);
			return null;
		}
	}

	/**
	 * Get current context from state
	 */
	private getCurrentContext() {
		const history =
			this.MainAgent.getStateManager().state.apiConversationHistory;
		if (history.length === 0) {
			return {
				history: [],
				taskMsg: null,
				taskMsgText: '',
			};
		}
		// we take the first message anyway
		const taskMsg = history.at(0);

		if (!taskMsg || !taskMsg.content || !Array.isArray(taskMsg.content)) {
			return {
				history: [],
				taskMsg: null,
				taskMsgText: '',
			};
		}
		const taskMsgText = this.getTaskText(
			typeof taskMsg?.content?.[0] === 'string'
				? taskMsg.content[0]
				: typeof taskMsg.content[0].type === 'string'
					? taskMsg.content[0].type
					: 'No message'
		);

		return {
			history,
			taskMsg,
			taskMsgText,
		};
	}

	private getTaskText(str: string) {
		const [taskStartTag, taskEndTag] = ['<task>', '</task>'];
		const [start, end] = [str.indexOf(taskStartTag), str.indexOf(taskEndTag)];
		return str.slice(start + taskStartTag.length, end);
	}

	/**
	 * Determine what type of Scholar request this is
	 */
	private determineRequestType(
		history: any[]
	): 'extract' | 'search' | 'summarize' {
		const recentMessages = history.slice(-3);
		const messageText = recentMessages
			.map((msg) => this.extractTextFromMessage(msg))
			.join(' ')
			.toLowerCase();

		// Check for search requests
		if (
			messageText.includes('search') ||
			messageText.includes('find') ||
			messageText.includes('recall') ||
			messageText.includes('what did we learn')
		) {
			return 'search';
		}

		// Check for summarization requests
		if (
			messageText.includes('summarize') ||
			messageText.includes('remember') ||
			messageText.includes('save this') ||
			messageText.includes('document')
		) {
			return 'summarize';
		}

		// Default to knowledge extraction
		return 'extract';
	}

	/**
	 * Create appropriate prompt based on request type
	 */
	private createScholarPrompt(
		requestType: 'extract' | 'search' | 'summarize',
		taskContext: string
	): string {
		const baseContext = dedent`Here is the task context: <task>${taskContext}</task>
		
		Based on the conversation history, `;

		switch (requestType) {
			case 'search':
				return (
					baseContext +
					dedent`search the knowledge base and provide relevant patterns, solutions, or insights that could help with the current development work.
				
				Focus on:
				- Similar problems solved before
				- Relevant patterns and approaches
				- Best practices that apply
				- Lessons learned from previous sessions
				
				Use Mode 2 (Knowledge Search & Retrieval) from your system prompt.`
				);

			case 'summarize':
				return (
					baseContext +
					dedent`summarize and document the key knowledge from this development session for future reference.
				
				Focus on:
				- What was accomplished
				- Key decisions made
				- Effective approaches used
				- Lessons learned
				- Patterns that emerged
				
				Use Mode 1 (Knowledge Extraction & Summarization) from your system prompt.`
				);

			case 'extract':
			default:
				return (
					baseContext +
					dedent`analyze the development activity and extract valuable knowledge that should be preserved for future reference.
				
				Focus on:
				- Successful problem-solving patterns
				- Effective tool usage and workflows
				- Best practices demonstrated
				- Transferable methodologies
				- Domain-specific insights
				
				Use Mode 1 (Knowledge Extraction & Summarization) from your system prompt.`
				);
		}
	}

	/**
	 * Create appropriate status message based on request type
	 */
	private createStatusMessage(
		requestType: 'extract' | 'search' | 'summarize',
		success: boolean,
		output: string
	): string {
		switch (requestType) {
			case 'search':
				return dedent`## 🔍 Scholar Knowledge Search ##
				### Scholar Agent completed knowledge base search ###
				<scholar_search>${output}</scholar_search>
				*Search completed - relevant knowledge retrieved from experience base.*
				## End of Scholar Search ##`;

			case 'summarize':
				return dedent`## 📝 Scholar Session Summary ##
				### Scholar Agent completed session summarization ###
				<scholar_summary>${output}</scholar_summary>
				${success ? '*Summary documented in .Scholar/Skills directory for future reference.*' : '*Summary completed but not saved.*'}
				## End of Scholar Summary ##`;

			case 'extract':
			default:
				return dedent`## 🧠 Scholar Knowledge Extraction ##
				### Scholar Agent completed automatic knowledge extraction ###
				<scholar_extraction>${output}</scholar_extraction>
				${success ? '*Knowledge documented in .Scholar/Skills directory for future reference.*' : '*Knowledge extracted but not saved.*'}
				## End of Scholar Extraction ##`;
		}
	}

	/**
	 * Discover and add high-value keywords to Learning Keywords
	 */
	private async updateLearningKeywords(
		extractedKnowledge: string
	): Promise<void> {
		try {
			// Extract potential keywords from the knowledge
			const potentialKeywords =
				this.extractKeywordsFromKnowledge(extractedKnowledge);

			if (potentialKeywords.length > 0) {
				// Get current learning keywords
				const { scholarSettings } = await serverRPC()
					.getClient()
					.getScholarSettings({});
				const currentKeywords = scholarSettings?.learningKeywords || '';

				// Merge new keywords with existing ones
				const existingKeywordsList = currentKeywords
					.split(',')
					.map((k) => k.trim().toLowerCase())
					.filter((k) => k.length > 0);

				const newKeywords = potentialKeywords.filter(
					(keyword) => !existingKeywordsList.includes(keyword.toLowerCase())
				);

				if (newKeywords.length > 0) {
					const updatedKeywords = currentKeywords
						? `${currentKeywords}, ${newKeywords.join(', ')}`
						: newKeywords.join(', ');

					// Save updated keywords using the RPC method
					await serverRPC()
						.getClient()
						.saveLearningKeywords({ keywords: updatedKeywords });

					console.log(
						`[ScholarHook] Added new learning keywords: ${newKeywords.join(', ')}`
					);
				}
			}
		} catch (error) {
			console.error('[ScholarHook] Error updating learning keywords:', error);
		}
	}

	/**
	 * Extract potential high-value keywords from knowledge content
	 */
	private extractKeywordsFromKnowledge(knowledge: string): string[] {
		const keywords: string[] = [];
		const lowerKnowledge = knowledge.toLowerCase();

		// High-value keyword patterns
		const keywordPatterns = [
			// Success indicators
			/\b(successfully|achieved|accomplished|completed|resolved|fixed|solved|optimized|improved)\b/g,
			// Discovery patterns
			/\b(discovered|found|identified|realized|learned|understood|breakthrough|insight)\b/g,
			// Technical patterns
			/\b(pattern|approach|technique|method|strategy|solution|implementation|architecture)\b/g,
			// Quality indicators
			/\b(effective|efficient|best practice|optimal|recommended|proven|reliable)\b/g,
			// Innovation patterns
			/\b(innovative|creative|novel|advanced|cutting-edge|state-of-the-art)\b/g,
		];

		keywordPatterns.forEach((pattern) => {
			const matches = lowerKnowledge.match(pattern);
			if (matches) {
				keywords.push(...matches);
			}
		});

		// Remove duplicates and return unique keywords
		return [...new Set(keywords)];
	}

	/**
	 * Save extracted knowledge to .Scholar/Skills directory
	 */
	private async saveKnowledgeToFile(
		extractedKnowledge: string,
		context: any
	): Promise<boolean> {
		try {
			const cwd = getCwd();
			const scholarDir = path.join(cwd, '.Scholar');
			const skillsDir = path.join(scholarDir, 'Skills');
			const universalPatternsDir = path.join(skillsDir, 'universal_patterns');

			// Ensure directories exist
			await fs.mkdir(universalPatternsDir, { recursive: true });

			// Create filename based on timestamp and content
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
			const filename = `scholar_extraction_${timestamp}.md`;
			const filePath = path.join(universalPatternsDir, filename);

			// Create markdown content with metadata
			const markdownContent = dedent`
				# Scholar Agent Knowledge Extraction
				
				**Generated**: ${new Date().toISOString()}
				**Source**: Automatic detection from development activity
				**Type**: Universal Patterns
				
				---
				
				${extractedKnowledge}
				
				---
				
				*This knowledge was automatically extracted by the Scholar Agent system.*
			`;

			// Save to file
			await fs.writeFile(filePath, markdownContent, 'utf8');

			console.log(`[ScholarHook] - Knowledge saved to: ${filePath}`);
			return true;
		} catch (error) {
			console.error('[ScholarHook] - Failed to save knowledge:', error);
			return false;
		}
	}

	/**
	 * Extract text content from message
	 */
	private extractTextFromMessage(message: any): string {
		if (!message?.content) {
			return '';
		}

		if (typeof message.content === 'string') {
			return message.content;
		}

		if (Array.isArray(message.content)) {
			return message.content
				.filter((block: any) => block.type === 'text')
				.map((block: any) => block.text)
				.join(' ');
		}

		return '';
	}
}
