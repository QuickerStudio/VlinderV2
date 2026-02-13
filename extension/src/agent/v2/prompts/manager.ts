/**
 * @fileoverview V2 Prompt Manager - Manages system prompts
 * 
 * @version 2.0.0
 */

import { EventEmitter } from 'events';

// Import prompts
import {
  MAIN_SYSTEM_PROMPT,
  COMPACTION_PROMPT,
  EXPLORE_PROMPT,
  SUMMARY_PROMPT,
  TITLE_PROMPT,
  prompts,
} from './index';

/**
 * Prompt types
 */
export type PromptType = 'main' | 'compaction' | 'explore' | 'summary' | 'title';

/**
 * Prompt options
 */
export interface PromptOptions {
  language?: string;
  maxTokens?: number;
  customInstructions?: string;
}

/**
 * Prompt Manager - Manages system prompts for the agent
 */
export class PromptManager extends EventEmitter {
  private customPrompts: Map<string, string> = new Map();
  private defaultPrompts: Map<PromptType, string> = new Map();

  constructor() {
    super();
    
    // Initialize default prompts
    this.defaultPrompts.set('main', MAIN_SYSTEM_PROMPT);
    this.defaultPrompts.set('compaction', COMPACTION_PROMPT);
    this.defaultPrompts.set('explore', EXPLORE_PROMPT);
    this.defaultPrompts.set('summary', SUMMARY_PROMPT);
    this.defaultPrompts.set('title', TITLE_PROMPT);
  }

  /**
   * Get a prompt by type
   */
  public getPrompt(type: PromptType, options?: PromptOptions): string {
    let prompt = this.customPrompts.get(type) || this.defaultPrompts.get(type) || '';
    
    // Apply options
    if (options?.customInstructions) {
      prompt = prompt + '\n\n' + options.customInstructions;
    }
    
    return prompt;
  }

  /**
   * Set a custom prompt
   */
  public setPrompt(type: PromptType, prompt: string): void {
    this.customPrompts.set(type, prompt);
    this.emit('promptUpdated', { type, prompt });
  }

  /**
   * Reset a prompt to default
   */
  public resetPrompt(type: PromptType): void {
    this.customPrompts.delete(type);
    this.emit('promptReset', { type });
  }

  /**
   * Get all prompt types
   */
  public getPromptTypes(): PromptType[] {
    return Array.from(this.defaultPrompts.keys());
  }

  /**
   * Get the main system prompt
   */
  public getMainPrompt(options?: PromptOptions): string {
    return this.getPrompt('main', options);
  }

  /**
   * Build a prompt with context
   */
  public buildPrompt(
    type: PromptType,
    context: {
      task?: string;
      files?: string[];
      history?: string;
    } = {}
  ): string {
    let prompt = this.getPrompt(type);
    
    if (context.task) {
      prompt = prompt.replace('{task}', context.task);
    }
    
    if (context.files && context.files.length > 0) {
      const fileList = context.files.map(f => `- ${f}`).join('\n');
      prompt = prompt.replace('{files}', fileList);
    }
    
    if (context.history) {
      prompt = prompt.replace('{history}', context.history);
    }
    
    return prompt;
  }
}

/**
 * Global prompt manager instance
 */
export const globalPromptManager = new PromptManager();

// Export prompts
export { prompts };
export default PromptManager;
