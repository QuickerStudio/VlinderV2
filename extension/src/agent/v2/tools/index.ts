/**
 * @fileoverview V2 Tool System - Main Entry Point
 * 
 * Exports all tools adapted from OpenCode
 * 
 * @version 2.0.0
 */

// Core tool types and utilities
export * from './tool';

// Tool registry
export { ToolRegistry, globalToolRegistry } from './tool';

// Core tools
export { BashTool } from './tool';
export { ReadTool } from './tool';
export { WriteTool } from './tool';
export { EditTool } from './tool';
export { GlobTool } from './tool';
export { GrepTool } from './tool';
export { LsTool } from './tool';

// All tools array
import { BashTool, ReadTool, WriteTool, EditTool, GlobTool, GrepTool, LsTool } from './tool';
import type { ToolInfo } from './tool';

export const allTools: ToolInfo[] = [
  BashTool,
  ReadTool,
  WriteTool,
  EditTool,
  GlobTool,
  GrepTool,
  LsTool,
];

/**
 * Register all default tools to the global registry
 */
export function registerDefaultTools(): void {
  const { globalToolRegistry } = require('./tool');
  
  for (const tool of allTools) {
    globalToolRegistry.register(tool);
  }
}

/**
 * Get list of all tool IDs
 */
export function getToolList(): string[] {
  return allTools.map(t => t.id);
}

// Re-export from OpenCode tools (will be adapted)
export { InvalidTool } from './invalid';
export { WebFetchTool } from './webfetch';
export { WebSearchTool } from './websearch';
export { TaskTool } from './task';
export { TodoWriteTool, TodoReadTool } from './todo';
export { QuestionTool } from './question';
export { BatchTool } from './batch';
export { CodeSearchTool } from './codesearch';
export { ApplyPatchTool } from './apply_patch';
export { MultiEditTool } from './multiedit';
export { LspTool } from './lsp';
export { SkillTool } from './skill';
export { PlanEnterTool, PlanExitTool } from './plan';

// Export truncation utility
export { Truncate } from './truncation';
