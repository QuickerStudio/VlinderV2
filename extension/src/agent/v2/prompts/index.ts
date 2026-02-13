/**
 * @fileoverview V2 Agent Prompts - Main Entry Point
 * 
 * 提示词系统，基于OpenCode的提示词架构设计
 * 
 * @version 2.0.0
 */

export * from './types';

// 导出提示词模板
export {
  SYSTEM_PROMPT,
  COMPACT_PROMPT,
  EXPLORE_PROMPT,
  SUMMARY_PROMPT,
  TITLE_PROMPT,
} from './types';

// ============================================================================
// 提示词管理器
// ============================================================================

import type { PromptConfig, PromptContext, PromptResult, PromptType } from './types';

/**
 * 提示词管理器
 */
export class PromptManager {
  private prompts: Map<string, PromptConfig> = new Map();

  constructor() {
    this.initializeDefaultPrompts();
  }

  /**
   * 初始化默认提示词
   */
  private initializeDefaultPrompts(): void {
    this.register({
      id: 'system',
      type: 'system' as PromptType,
      name: 'System Prompt',
      description: 'Main system prompt for the agent',
      content: SYSTEM_PROMPT,
    });

    this.register({
      id: 'compact',
      type: 'compact' as PromptType,
      name: 'Compact Prompt',
      description: 'Prompt for summarizing conversations',
      content: COMPACT_PROMPT,
    });

    this.register({
      id: 'explore',
      type: 'explore' as PromptType,
      name: 'Explore Prompt',
      description: 'Prompt for file search and exploration',
      content: EXPLORE_PROMPT,
    });

    this.register({
      id: 'summary',
      type: 'summary' as PromptType,
      name: 'Summary Prompt',
      description: 'Prompt for generating summaries',
      content: SUMMARY_PROMPT,
    });

    this.register({
      id: 'title',
      type: 'title' as PromptType,
      name: 'Title Prompt',
      description: 'Prompt for generating titles',
      content: TITLE_PROMPT,
    });
  }

  /**
   * 注册提示词
   */
  public register(config: PromptConfig): void {
    this.prompts.set(config.id, config);
  }

  /**
   * 获取提示词
   */
  public get(id: string): PromptConfig | undefined {
    return this.prompts.get(id);
  }

  /**
   * 渲染提示词
   */
  public render(id: string, context: Partial<PromptContext>): PromptResult | null {
    const config = this.prompts.get(id);
    if (!config) return null;

    // 替换变量
    let content = config.content;
    if (context.variables) {
      for (const [key, value] of Object.entries(context.variables)) {
        content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
      }
    }

    return {
      id: `result_${Date.now()}`,
      configId: config.id,
      renderedContent: content,
      context: {
        sessionId: context.sessionId || '',
        taskId: context.taskId,
        agentId: context.agentId,
        workingDirectory: context.workingDirectory || '',
        timestamp: Date.now(),
        variables: context.variables || {},
      },
      timestamp: Date.now(),
    };
  }

  /**
   * 获取所有提示词
   */
  public getAll(): PromptConfig[] {
    return Array.from(this.prompts.values());
  }

  /**
   * 按类型获取提示词
   */
  public getByType(type: PromptType): PromptConfig[] {
    return this.getAll().filter(p => p.type === type);
  }
}

// 全局提示词管理器
export const globalPromptManager = new PromptManager();
