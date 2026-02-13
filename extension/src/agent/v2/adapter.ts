/**
 * @fileoverview V2 Agent Adapter - V2 Agent适配器
 * 
 * 提供与V1 Agent兼容的接口，使V2 Agent能够无缝替换V1
 * 
 * @version 2.0.0
 */

// ============================================================================
// 类型导出 - 从V2导出并保持V1兼容性
// ============================================================================

// 从V2类型导出
export * from './types';

// ============================================================================
// V1 兼容类型定义
// ============================================================================

/**
 * ApiHistoryItem - 兼容V1的历史记录项
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
 * 工具响应 - 兼容V1
 */
export type ToolResponseV2 = {
  status: 'success' | 'error';
  message?: string;
  data?: unknown;
  toolCallId?: string;
};

/**
 * 感兴趣的文件 - 兼容V1
 */
export type InterestedFile = {
  path: string;
  reason: string;
  relevanceScore: number;
};

/**
 * 文件版本 - 兼容V1
 */
export type FileVersion = {
  path: string;
  content: string;
  timestamp: number;
  hash: string;
};

/**
 * 子代理状态 - 兼容V1
 */
export type SubAgentState = {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  currentTask?: string;
};

/**
 * Agent状态 - 兼容V1
 */
export interface AgentState {
  id: string;
  status: 'idle' | 'initializing' | 'running' | 'paused' | 'error';
  currentTask?: string;
  progress: number;
  lastActivity: number;
  metrics: AgentMetrics;
}

export interface AgentMetrics {
  tasksCompleted: number;
  tasksFailed: number;
  averageExecutionTime: number;
  totalTokensUsed: number;
  memoryUsage: number;
  uptime: number;
}

/**
 * SSE响应 - 兼容V1
 */
export interface SSEResponse {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_delta' | 'message_stop';
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
 * 工具名称 - 兼容V1
 */
export type ToolName = string;

/**
 * SpawnAgentOptions - 兼容V1
 */
export type SpawnAgentOptions = {
  agentId: string;
  task: string;
  context?: Record<string, unknown>;
  priority?: 'low' | 'medium' | 'high';
};

// ============================================================================
// V2 Agent 适配器类
// ============================================================================

import { MainAgent as V2MainAgent } from './main-agent';
import { AgentSwarm } from './AgentSwarm/swarm';
import type { MainAgentConfig, BeeConfig } from './types';

/**
 * MainAgent - V2适配器，提供V1兼容接口
 */
export class MainAgent extends V2MainAgent {
  private v1CompatibleState: AgentState;
  
  constructor(options: Partial<MainAgentConfig> & {
    // V1兼容选项
    apiKey?: string;
    model?: string;
    systemPrompt?: string;
    onStatusChange?: (status: string) => void;
  } = {}) {
    // 转换V1选项到V2配置
    const v2Config: MainAgentConfig = {
      id: options.id || 'main_agent_v2',
      name: options.name || 'Vlinder V2 Agent',
      version: '2.0.0',
      model: {
        provider: 'anthropic' as any,
        modelId: options.model || 'claude-3-5-sonnet-20241022',
        temperature: 0.7,
        maxTokens: 4096,
      },
      instructions: options.systemPrompt || 'You are a helpful AI assistant.',
      capabilities: [],
      tools: [],
      behavior: {
        maxTurns: 100,
        maxRetries: 3,
        timeout: 60000,
        parallelToolCalls: true,
        toolChoice: 'auto',
        autoApprove: false,
        verboseMode: false,
      },
      session: {
        id: `session_${Date.now()}`,
        persistenceEnabled: true,
      },
      bees: [],
    };
    
    super(v2Config);
    
    this.v1CompatibleState = {
      id: v2Config.id,
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
  // V1 兼容方法
  // =========================================================================
  
  /**
   * 获取Agent状态 - V1兼容
   */
  public getV1State(): AgentState {
    return { ...this.v1CompatibleState };
  }
  
  /**
   * 运行Agent - V1兼容
   */
  public async runV1(
    messages: ApiHistoryItem[],
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<ApiHistoryItem[]> {
    // 转换V1消息格式到V2
    const v2Messages = messages.map(msg => ({
      id: msg.id || `msg_${Date.now()}`,
      role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      timestamp: msg.timestamp || Date.now(),
      toolCallId: msg.toolCallId,
      toolName: msg.toolName,
    }));
    
    // 调用V2 run方法
    const response = await this.run(v2Messages);
    
    // 转换V2响应到V1格式
    return response.messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      toolCallId: msg.toolCallId,
      toolName: msg.toolName,
    }));
  }
  
  /**
   * 流式运行 - V1兼容
   */
  public async *runStreamV1(
    messages: ApiHistoryItem[],
    options: {
      model?: string;
      maxTokens?: number;
    } = {}
  ): AsyncGenerator<SSEResponse> {
    // 转换消息
    const v2Messages = messages.map(msg => ({
      id: msg.id || `msg_${Date.now()}`,
      role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      timestamp: msg.timestamp || Date.now(),
    }));
    
    // 使用V2流式方法
    const stream = this.runStream(v2Messages);
    
    for await (const chunk of stream) {
      // 转换V2块到V1 SSE格式
      if ('delim' in chunk) {
        yield {
          type: chunk.delim === 'start' ? 'message_start' : 'message_stop',
        };
      } else if ('response' in chunk) {
        yield {
          type: 'message_stop',
          message: chunk.response.messages[0] as any,
        };
      } else {
        yield {
          type: 'content_block_delta',
          index: 0,
          delta: {
            type: 'text_delta',
            text: chunk.delta?.content || '',
          },
        };
      }
    }
  }
  
  /**
   * 中止当前任务 - V1兼容
   */
  public abort(): void {
    this.stop();
  }
  
  /**
   * 更新系统提示 - V1兼容
   */
  public updateSystemPrompt(prompt: string): void {
    // V2中通过更新配置实现
    const config = this.getConfig();
    // 可以通过重新配置来更新
  }
}

// ============================================================================
// 工具函数导出
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
export function isToolResultBlock(block: ContentBlock): block is ToolResultBlock {
  return block.type === 'tool_result';
}

/**
 * 格式化附件为块
 */
export function formatAttachementsIntoBlocks(attachments: any[]): ContentBlock[] {
  return attachments.map(att => {
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
 * 格式化文件到行
 */
export function formatFileToLines(content: string): string[] {
  return content.split('\n');
}

/**
 * 读取文件内容
 */
export async function readFile(path: string): Promise<string> {
  const fs = await import('fs/promises');
  return fs.readFile(path, 'utf-8');
}

// ============================================================================
// 默认导出
// ============================================================================

export default MainAgent;
