/**
 * @fileoverview V2 Tool System - Adapted from OpenCode
 * 
 * This module provides the tool system for V2 Agent,
 * adapted from OpenCode's tool architecture.
 * 
 * @version 2.0.0
 */

import { z } from 'zod';
import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

/**
 * Tool metadata
 */
export interface ToolMetadata {
  [key: string]: unknown;
}

/**
 * Tool initialization context
 */
export interface ToolInitContext {
  agent?: {
    id: string;
    name: string;
    model?: string;
  };
}

/**
 * Tool execution context
 */
export interface ToolContext<M extends ToolMetadata = ToolMetadata> {
  sessionId: string;
  messageId: string;
  agent: string;
  abort: AbortSignal;
  callId?: string;
  extra?: Record<string, unknown>;
  messages: ToolMessage[];
  metadata(input: { title?: string; metadata?: M }): void;
  ask(input: ToolPermissionRequest): Promise<void>;
}

/**
 * Tool message
 */
export interface ToolMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
}

/**
 * Tool permission request
 */
export interface ToolPermissionRequest {
  permission: string;
  patterns?: string[];
  always?: string[];
  metadata: Record<string, unknown>;
}

/**
 * Tool info
 */
export interface ToolInfo<
  Parameters extends z.ZodType = z.ZodType,
  M extends ToolMetadata = ToolMetadata
> {
  id: string;
  init: (ctx?: ToolInitContext) => Promise<{
    description: string;
    parameters: Parameters;
    execute(
      args: z.infer<Parameters>,
      ctx: ToolContext<M>
    ): Promise<{
      title: string;
      metadata: M;
      output: string;
      attachments?: ToolAttachment[];
    }>;
    formatValidationError?(error: z.ZodError): string;
  }>;
}

/**
 * Tool attachment
 */
export interface ToolAttachment {
  type: 'file' | 'image';
  name: string;
  content: string | Buffer;
  mimeType?: string;
}

/**
 * Tool definition helper
 */
export type ToolDefinition<P extends z.ZodType = z.ZodType, M extends ToolMetadata = ToolMetadata> = {
  id: string;
  description: string;
  parameters: P;
  execute: (
    args: z.infer<P>,
    ctx: ToolContext<M>
  ) => Promise<{
    title: string;
    metadata: M;
    output: string;
    attachments?: ToolAttachment[];
  }>;
};

// ============================================================================
// Tool Namespace
// ============================================================================

export namespace Tool {
  /**
   * Define a tool
   */
  export function define<Parameters extends z.ZodType, Result extends ToolMetadata>(
    id: string,
    init: ToolInfo<Parameters, Result>['init'] | Awaited<ReturnType<ToolInfo<Parameters, Result>['init']>>
  ): ToolInfo<Parameters, Result> {
    return {
      id,
      init: typeof init === 'function' 
        ? init as ToolInfo<Parameters, Result>['init']
        : async () => init as Awaited<ReturnType<ToolInfo<Parameters, Result>['init']>>,
    };
  }

  /**
   * Create a simple tool
   */
  export function create<P extends z.ZodType>(
    id: string,
    description: string,
    parameters: P,
    execute: (
      args: z.infer<P>,
      ctx: ToolContext
    ) => Promise<string>
  ): ToolInfo<P> {
    return {
      id,
      init: async () => ({
        description,
        parameters,
        execute: async (args, ctx) => {
          const output = await execute(args, ctx);
          return {
            title: id,
            metadata: {},
            output,
          };
        },
      }),
    };
  }

  /**
   * Infer parameters type
   */
  export type InferParameters<T extends ToolInfo> = T extends ToolInfo<infer P> ? z.infer<P> : never;

  /**
   * Infer metadata type
   */
  export type InferMetadata<T extends ToolInfo> = T extends ToolInfo<any, infer M> ? M : never;
}

// ============================================================================
// Tool Registry
// ============================================================================

/**
 * Tool Registry - Manages all available tools
 */
export class ToolRegistry extends EventEmitter {
  private tools: Map<string, ToolInfo> = new Map();
  private initialized: boolean = false;

  constructor() {
    super();
  }

  /**
   * Register a tool
   */
  public register(tool: ToolInfo): void {
    this.tools.set(tool.id, tool);
    this.emit('toolRegistered', tool);
  }

  /**
   * Unregister a tool
   */
  public unregister(toolId: string): void {
    this.tools.delete(toolId);
    this.emit('toolUnregistered', toolId);
  }

  /**
   * Get a tool by ID
   */
  public get(toolId: string): ToolInfo | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Get all tool IDs
   */
  public getIds(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get all tools
   */
  public getAll(): ToolInfo[] {
    return Array.from(this.tools.values());
  }

  /**
   * Initialize a tool
   */
  public async initTool(
    toolId: string,
    ctx?: ToolInitContext
  ): Promise<ToolDefinition | undefined> {
    const tool = this.tools.get(toolId);
    if (!tool) return undefined;

    const initialized = await tool.init(ctx);
    return {
      id: tool.id,
      description: initialized.description,
      parameters: initialized.parameters,
      execute: initialized.execute,
    };
  }

  /**
   * Execute a tool
   */
  public async executeTool(
    toolId: string,
    args: Record<string, unknown>,
    ctx: ToolContext
  ): Promise<{
    title: string;
    metadata: ToolMetadata;
    output: string;
    attachments?: ToolAttachment[];
  }> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    const initialized = await tool.init({ agent: { id: ctx.agent, name: ctx.agent } });
    
    // Validate parameters
    const parsed = initialized.parameters.safeParse(args);
    if (!parsed.success) {
      const errorMsg = initialized.formatValidationError
        ? initialized.formatValidationError(parsed.error)
        : `Validation error: ${parsed.error.message}`;
      throw new Error(errorMsg);
    }

    return initialized.execute(parsed.data, ctx);
  }

  /**
   * Check if a tool exists
   */
  public has(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  /**
   * Get tool count
   */
  public get count(): number {
    return this.tools.size;
  }
}

// ============================================================================
// Global Tool Registry Instance
// ============================================================================

export const globalToolRegistry = new ToolRegistry();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Truncate output to a maximum length
 */
export function truncateOutput(output: string, maxLength: number = 10000): string {
  if (output.length <= maxLength) {
    return output;
  }
  return output.slice(0, maxLength) + '\n\n... [truncated]';
}

/**
 * Format tool result for display
 */
export function formatToolResult(result: {
  title: string;
  output: string;
  metadata?: ToolMetadata;
}): string {
  let formatted = `## ${result.title}\n\n`;
  formatted += result.output;
  
  if (result.metadata && Object.keys(result.metadata).length > 0) {
    formatted += '\n\n### Metadata\n';
    formatted += '```json\n';
    formatted += JSON.stringify(result.metadata, null, 2);
    formatted += '\n```';
  }
  
  return formatted;
}
