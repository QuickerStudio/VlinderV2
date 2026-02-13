/**
 * @fileoverview Tool Registry - 工具注册表
 * 
 * 管理所有工具的注册和获取
 * 
 * @version 2.0.0
 */

import { z } from 'zod';
import type { ToolInfo, ToolContext, ToolResult, InitContext } from './types';

// ============================================================================
// 工具注册表
// ============================================================================

/**
 * 工具注册表
 */
export class ToolRegistry {
  private tools: Map<string, ToolInfo> = new Map();
  private initialized: boolean = false;

  constructor() {}

  // =========================================================================
  // 注册方法
  // =========================================================================

  /**
   * 注册工具
   */
  public register(tool: ToolInfo): void {
    if (this.tools.has(tool.id)) {
      console.warn(`Tool ${tool.id} already registered, overwriting`);
    }
    this.tools.set(tool.id, tool);
  }

  /**
   * 批量注册工具
   */
  public registerAll(tools: ToolInfo[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * 注销工具
   */
  public unregister(toolId: string): boolean {
    return this.tools.delete(toolId);
  }

  // =========================================================================
  // 获取方法
  // =========================================================================

  /**
   * 获取工具
   */
  public get(toolId: string): ToolInfo | undefined {
    return this.tools.get(toolId);
  }

  /**
   * 获取所有工具
   */
  public getAll(): ToolInfo[] {
    return Array.from(this.tools.values());
  }

  /**
   * 获取所有工具ID
   */
  public getIds(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * 检查工具是否存在
   */
  public has(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  // =========================================================================
  // 执行方法
  // =========================================================================

  /**
   * 执行工具
   */
  public async execute(
    toolId: string,
    args: Record<string, unknown>,
    ctx: ToolContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    // 验证参数
    try {
      tool.parameters.parse(args);
    } catch (error) {
      if (error instanceof z.ZodError && tool.formatValidationError) {
        throw new Error(tool.formatValidationError(error));
      }
      throw new Error(
        `The ${toolId} tool was called with invalid arguments: ${error}.\nPlease rewrite the input so it satisfies the expected schema.`
      );
    }

    // 执行工具
    return tool.execute(args, ctx);
  }

  // =========================================================================
  // 初始化方法
  // =========================================================================

  /**
   * 初始化所有工具
   */
  public async initialize(initCtx?: InitContext): Promise<void> {
    if (this.initialized) {
      return;
    }

    // 初始化每个工具
    for (const [id, tool] of this.tools) {
      try {
        // 如果工具有init函数，调用它
        if (typeof (tool as any).init === 'function') {
          const initialized = await (tool as any).init(initCtx);
          Object.assign(tool, initialized);
        }
      } catch (error) {
        console.error(`Failed to initialize tool ${id}:`, error);
      }
    }

    this.initialized = true;
  }

  /**
   * 清理
   */
  public clear(): void {
    this.tools.clear();
    this.initialized = false;
  }

  // =========================================================================
  // 统计方法
  // =========================================================================

  /**
   * 获取工具数量
   */
  public get size(): number {
    return this.tools.size;
  }
}

// ============================================================================
// 全局工具注册表实例
// ============================================================================

/**
 * 全局工具注册表
 */
export const globalToolRegistry = new ToolRegistry();

// ============================================================================
// 工具定义辅助函数
// ============================================================================

/**
 * 定义工具
 */
export function defineTool<Parameters extends z.ZodType, Metadata = Record<string, unknown>>(
  id: string,
  init: {
    name?: string;
    description: string;
    parameters: Parameters;
    execute: (
      args: z.infer<Parameters>,
      ctx: ToolContext
    ) => Promise<ToolResult<Metadata>>;
    formatValidationError?: (error: z.ZodError) => string;
  }
): ToolInfo<Parameters, Metadata> {
  return {
    id,
    name: init.name || id,
    description: init.description,
    parameters: init.parameters,
    execute: init.execute,
    formatValidationError: init.formatValidationError,
  };
}

/**
 * 注册工具到全局注册表
 */
export function registerTool(tool: ToolInfo): void {
  globalToolRegistry.register(tool);
}

/**
 * 获取工具
 */
export function getTool(toolId: string): ToolInfo | undefined {
  return globalToolRegistry.get(toolId);
}

/**
 * 获取所有工具
 */
export function getAllTools(): ToolInfo[] {
  return globalToolRegistry.getAll();
}

/**
 * 执行工具
 */
export async function executeTool(
  toolId: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolResult> {
  return globalToolRegistry.execute(toolId, args, ctx);
}
