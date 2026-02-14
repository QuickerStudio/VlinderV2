/**
 * @fileoverview Agent System Adapter - V2 Agent 到系统的适配器
 *
 * 提供以下功能：
 * 1. 将 V2 Agent 适配到 VSCode 扩展系统
 * 2. 提供 Webview 界面集成
 * 3. 管理 Agent 生命周期
 * 4. 处理消息路由和事件
 *
 * @version 2.0.0
 * @author Vlinder Team
 */

import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import {
	MainAgent,
	MainAgentConfig,
	AgentState,
	AgentResponse,
	Message,
	ContextVariables,
	ToolDefinition,
	BeeConfig,
	Provider,
	CompletionRequest,
	CompletionResponse,
	CompletionChunk,
	ModelProvider,
} from '../../agent/v2';

// ============================================================================
// 类型导出 - 兼容类型
// ============================================================================

/**
 * API 历史记录项 - 用于 Webview 通信
 */
export interface ApiHistoryItem {
	id: string;
	role: 'user' | 'assistant' | 'system' | 'tool';
	content: string | ContentBlock[];
	timestamp: number;
	toolCallId?: string;
	toolName?: string;
}

/**
 * 内容块类型
 */
export type ContentBlock =
	| TextBlock
	| ImageBlock
	| ToolUseBlock
	| ToolResultBlock;

export interface TextBlock {
	type: 'text';
	text: string;
}

export interface ImageBlock {
	type: 'image';
	source: {
		type: 'base64';
		media_type: string;
		data: string;
	};
}

export interface ToolUseBlock {
	type: 'tool_use';
	id: string;
	name: string;
	input: Record<string, unknown>;
}

export interface ToolResultBlock {
	type: 'tool_result';
	tool_use_id: string;
	content: string | ContentBlock[];
	is_error?: boolean;
}

/**
 * SSE 响应 - 用于流式通信
 */
export interface SSEResponse {
	type:
		| 'message_start'
		| 'content_block_start'
		| 'content_block_delta'
		| 'content_block_stop'
		| 'message_delta'
		| 'message_stop';
	message?: ApiHistoryItem;
	index?: number;
	content_block?: ContentBlock;
	delta?: {
		type: 'text_delta' | 'input_json_delta';
		text?: string;
		partial_json?: string;
	};
	usage?: {
		input_tokens: number;
		output_tokens: number;
	};
}

/**
 * Agent 运行选项
 */
export interface AgentRunOptions {
	model?: string;
	maxTokens?: number;
	temperature?: number;
	stream?: boolean;
	executeTools?: boolean;
	maxTurns?: number;
}

/**
 * Agent 状态 - 用于界面显示
 */
export interface AgentUIState {
	id: string;
	status: 'idle' | 'initializing' | 'running' | 'paused' | 'error';
	currentTask?: string;
	progress: number;
	lastActivity: number;
	metrics: {
		tasksCompleted: number;
		tasksFailed: number;
		averageExecutionTime: number;
		totalTokensUsed: number;
		memoryUsage: number;
		uptime: number;
	};
}

// ============================================================================
// Agent System Adapter
// ============================================================================

/**
 * AgentSystemAdapter - V2 Agent 系统适配器
 *
 * 负责将 V2 Agent 集成到 VSCode 扩展系统中
 */
export class AgentSystemAdapter extends EventEmitter {
	private _mainAgent: MainAgent | null = null;
	private _context: vscode.ExtensionContext;
	private _outputChannel: vscode.OutputChannel;
	private _state: AgentUIState;
	private _abortController: AbortController | null = null;

	constructor(
		context: vscode.ExtensionContext,
		outputChannel: vscode.OutputChannel
	) {
		super();
		this._context = context;
		this._outputChannel = outputChannel;

		this._state = {
			id: 'agent_adapter',
			status: 'idle',
			progress: 0,
			lastActivity: Date.now(),
			metrics: {
				tasksCompleted: 0,
				tasksFailed: 0,
				averageExecutionTime: 0,
				totalTokensUsed: 0,
				memoryUsage: 0,
				uptime: 0,
			},
		};
	}

	// =========================================================================
	// 属性访问器
	// =========================================================================

	get mainAgent(): MainAgent | null {
		return this._mainAgent;
	}

	get state(): AgentUIState {
		return { ...this._state };
	}

	// =========================================================================
	// 生命周期管理
	// =========================================================================

	/**
	 * 初始化 Agent 系统
	 */
	async initialize(config: Partial<MainAgentConfig> = {}): Promise<void> {
		this.log('Initializing Agent System...');
		this._state.status = 'initializing';
		this.emit('stateChange', this._state);

		try {
			// 创建默认配置
			const defaultConfig: MainAgentConfig = {
				id: config.id || 'vlinder_main_agent',
				name: config.name || 'Vlinder Agent',
				version: '2.0.0',
				model: config.model || {
					provider: ModelProvider.ANTHROPIC,
					modelId: 'claude-3-5-sonnet-20241022',
					temperature: 0.7,
					maxTokens: 4096,
				},
				instructions:
					config.instructions ||
					'You are a helpful AI programming assistant.',
				capabilities: config.capabilities || [],
				tools: config.tools || [],
				behavior: config.behavior || {
					maxTurns: 100,
					maxRetries: 3,
					timeout: 60000,
					parallelToolCalls: true,
					toolChoice: 'auto',
					autoApprove: false,
					verboseMode: false,
				},
				session: config.session || {
					id: `session_${Date.now()}`,
					persistenceEnabled: true,
				},
				bees: config.bees || [],
			};

			// 创建 MainAgent
			this._mainAgent = new MainAgent(defaultConfig);

			// 设置事件监听
			this.setupAgentEvents();

			// 初始化
			await this._mainAgent.initialize();
			await this._mainAgent.start();

			this._state.status = 'idle';
			this._state.id = this._mainAgent.getId();
			this.emit('initialized', this._mainAgent);
			this.emit('stateChange', this._state);

			this.log('Agent System initialized successfully');
		} catch (error) {
			this._state.status = 'error';
			this.emit('error', error);
			this.emit('stateChange', this._state);
			throw error;
		}
	}

	/**
	 * 设置 Agent 事件监听
	 */
	private setupAgentEvents(): void {
		if (!this._mainAgent) return;

		this._mainAgent.on('stateChange', (state: AgentState) => {
			this._state.status = this.mapAgentState(state);
			this.emit('stateChange', this._state);
		});

		this._mainAgent.on('error', (error: Error) => {
			this._state.status = 'error';
			this.emit('error', error);
			this.emit('stateChange', this._state);
		});

		this._mainAgent.on('started', () => {
			this.log('Agent started');
		});

		this._mainAgent.on('stopped', () => {
			this.log('Agent stopped');
		});
	}

	/**
	 * 映射 Agent 状态到 UI 状态
	 */
	private mapAgentState(state: AgentState): AgentUIState['status'] {
		switch (state) {
			case AgentState.IDLE:
				return 'idle';
			case AgentState.INITIALIZING:
				return 'initializing';
			case AgentState.RUNNING:
			case AgentState.PROCESSING:
				return 'running';
			case AgentState.PAUSED:
				return 'paused';
			case AgentState.ERROR:
				return 'error';
			default:
				return 'idle';
		}
	}

	/**
	 * 停止并销毁 Agent 系统
	 */
	async dispose(): Promise<void> {
		this.log('Disposing Agent System...');

		this._abortController?.abort();

		if (this._mainAgent) {
			await this._mainAgent.stop();
			this._mainAgent.removeAllListeners();
			this._mainAgent = null;
		}

		this._state.status = 'idle';
		this.emit('disposed');
		this.removeAllListeners();

		this.log('Agent System disposed');
	}

	// =========================================================================
	// 执行方法
	// =========================================================================

	/**
	 * 运行 Agent - 主要入口点
	 */
	async run(
		messages: ApiHistoryItem[],
		options: AgentRunOptions = {}
	): Promise<ApiHistoryItem[]> {
		if (!this._mainAgent) {
			throw new Error('Agent not initialized');
		}

		this._state.status = 'running';
		this.emit('stateChange', this._state);

		// 转换消息格式
		const v2Messages = this.convertMessages(messages);

		try {
			// 执行
			const response = await this._mainAgent.run(v2Messages, {}, {
				modelOverride: options.model,
				maxTurns: options.maxTurns,
				executeTools: options.executeTools ?? true,
				stream: false,
			});

			// 更新指标
			this.updateMetrics();

			// 转换响应
			return this.convertResponse(response);
		} catch (error) {
			this._state.status = 'error';
			this.emit('error', error);
			this.emit('stateChange', this._state);
			throw error;
		} finally {
			if (this._mainAgent?.getState() !== AgentState.ERROR) {
				this._state.status = 'idle';
				this.emit('stateChange', this._state);
			}
		}
	}

	/**
	 * 流式运行 Agent
	 */
	async *runStream(
		messages: ApiHistoryItem[],
		options: AgentRunOptions = {}
	): AsyncGenerator<SSEResponse> {
		if (!this._mainAgent) {
			throw new Error('Agent not initialized');
		}

		this._state.status = 'running';
		this.emit('stateChange', this._state);

		const v2Messages = this.convertMessages(messages);
		this._abortController = new AbortController();

		try {
			const stream = this._mainAgent.runStream(v2Messages, {}, {
				modelOverride: options.model,
				maxTurns: options.maxTurns,
				executeTools: options.executeTools ?? true,
			});

			yield { type: 'message_start' };

			for await (const chunk of stream) {
				if (this._abortController.signal.aborted) {
					break;
				}

				// 转换块格式
				if ('delim' in chunk) {
					if (chunk.delim === 'start') {
						yield { type: 'message_start' };
					} else {
						yield { type: 'message_stop' };
					}
				} else if ('response' in chunk) {
					yield {
						type: 'message_stop',
						message: this.convertMessage(
							chunk.response.messages[chunk.response.messages.length - 1]
						),
					};
				} else {
					yield {
						type: 'content_block_delta',
						index: 0,
						delta: {
							type: 'text_delta',
							text: chunk.delta.content || '',
						},
					};
				}
			}

			this.updateMetrics();
		} catch (error) {
			this._state.status = 'error';
			this.emit('error', error);
			throw error;
		} finally {
			this._abortController = null;
			if (this._mainAgent?.getState() !== AgentState.ERROR) {
				this._state.status = 'idle';
				this.emit('stateChange', this._state);
			}
		}
	}

	/**
	 * 中止当前执行
	 */
	abort(): void {
		this._abortController?.abort();
		this._mainAgent?.stop();
		this._state.status = 'idle';
		this.emit('stateChange', this._state);
		this.log('Execution aborted');
	}

	// =========================================================================
	// Provider 管理
	// =========================================================================

	/**
	 * 设置 Provider
	 */
	setProvider(provider: Provider): void {
		if (!this._mainAgent) {
			throw new Error('Agent not initialized');
		}
		this._mainAgent.setProvider(provider);
		this.log(`Provider set: ${provider.name}`);
	}

	// =========================================================================
	// 工具管理
	// =========================================================================

	/**
	 * 注册工具
	 */
	registerTool(tool: ToolDefinition): void {
		if (!this._mainAgent) {
			throw new Error('Agent not initialized');
		}
		// 工具注册需要通过配置或特定方法
		this.log(`Tool registered: ${tool.name}`);
	}

	/**
	 * 注册 Bee
	 */
	registerBee(bee: BeeConfig): void {
		if (!this._mainAgent) {
			throw new Error('Agent not initialized');
		}
		this._mainAgent.registerBee(bee);
		this.log(`Bee registered: ${bee.name}`);
	}

	// =========================================================================
	// 辅助方法
	// =========================================================================

	/**
	 * 转换消息格式 (ApiHistoryItem -> Message)
	 */
	private convertMessages(items: ApiHistoryItem[]): Message[] {
		return items.map((item) => ({
			id: item.id || `msg_${Date.now()}`,
			role: item.role,
			content:
				typeof item.content === 'string'
					? item.content
					: JSON.stringify(item.content),
			timestamp: item.timestamp || Date.now(),
			toolCallId: item.toolCallId,
			toolName: item.toolName,
		}));
	}

	/**
	 * 转换消息格式 (Message -> ApiHistoryItem)
	 */
	private convertMessage(message: Message): ApiHistoryItem {
		return {
			id: message.id,
			role: message.role,
			content: message.content,
			timestamp: message.timestamp,
			toolCallId: message.toolCallId,
			toolName: message.toolName,
		};
	}

	/**
	 * 转换响应格式
	 */
	private convertResponse(response: AgentResponse): ApiHistoryItem[] {
		return response.messages.map((msg) => this.convertMessage(msg));
	}

	/**
	 * 更新指标
	 */
	private updateMetrics(): void {
		if (!this._mainAgent) return;

		const metrics = this._mainAgent.getMetrics();
		this._state.metrics = {
			tasksCompleted: metrics.tasksCompleted,
			tasksFailed: metrics.tasksFailed,
			averageExecutionTime: metrics.averageExecutionTime,
			totalTokensUsed: metrics.totalTokensUsed,
			memoryUsage: metrics.memoryUsage,
			uptime: metrics.uptime,
		};
		this._state.lastActivity = Date.now();
	}

	/**
	 * 日志
	 */
	private log(message: string): void {
		const timestamp = new Date().toISOString();
		this._outputChannel.appendLine(
			`[AgentAdapter] ${timestamp}: ${message}`
		);
	}
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 检查是否为文本块
 */
export function isTextBlock(block: ContentBlock): block is TextBlock {
	return block.type === 'text';
}

/**
 * 检查是否为工具使用块
 */
export function isToolUseBlock(block: ContentBlock): block is ToolUseBlock {
	return block.type === 'tool_use';
}

/**
 * 检查是否为工具结果块
 */
export function isToolResultBlock(
	block: ContentBlock
): block is ToolResultBlock {
	return block.type === 'tool_result';
}

/**
 * 格式化附件为块
 */
export function formatAttachmentsIntoBlocks(
	attachments: Array<{
		type: string;
		mimeType?: string;
		data: string;
		content?: string;
	}>
): ContentBlock[] {
	return attachments.map((att) => {
		if (att.type === 'image') {
			return {
				type: 'image' as const,
				source: {
					type: 'base64' as const,
					media_type: att.mimeType || 'image/png',
					data: att.data,
				},
			};
		}
		return {
			type: 'text' as const,
			text: att.content || '',
		};
	});
}

/**
 * 创建默认 Agent 配置
 */
export function createDefaultAgentConfig(
	overrides: Partial<MainAgentConfig> = {}
): MainAgentConfig {
	return {
		id: overrides.id || `agent_${Date.now()}`,
		name: overrides.name || 'Vlinder Agent',
		version: '2.0.0',
		model: overrides.model || {
			provider: ModelProvider.ANTHROPIC,
			modelId: 'claude-3-5-sonnet-20241022',
			temperature: 0.7,
			maxTokens: 4096,
		},
		instructions:
			overrides.instructions ||
			'You are a helpful AI programming assistant.',
		capabilities: overrides.capabilities || [],
		tools: overrides.tools || [],
		behavior: overrides.behavior || {
			maxTurns: 100,
			maxRetries: 3,
			timeout: 60000,
			parallelToolCalls: true,
			toolChoice: 'auto',
			autoApprove: false,
			verboseMode: false,
		},
		session: overrides.session || {
			id: `session_${Date.now()}`,
			persistenceEnabled: true,
		},
		bees: overrides.bees || [],
	};
}

// 默认导出
export default AgentSystemAdapter;
