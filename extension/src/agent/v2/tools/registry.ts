/**
 * @fileoverview V2 Tool Registry - Registers all available tools
 * 
 * @version 2.0.0
 */

import { ToolRegistry, globalToolRegistry } from './tool';
import {
  BashTool,
  ReadTool,
  WriteTool,
  EditTool,
  GlobTool,
  GrepTool,
  LsTool,
} from './index';

// Import additional tools from OpenCode
import { InvalidTool } from './invalid';
import { WebFetchTool } from './webfetch';
import { WebSearchTool } from './websearch';
import { TaskTool } from './task';
import { TodoWriteTool, TodoReadTool } from './todo';
import { QuestionTool } from './question';
import { BatchTool } from './batch';
import { CodeSearchTool } from './codesearch';
import { ApplyPatchTool } from './apply_patch';
import { MultiEditTool } from './multiedit';
import { LspTool } from './lsp';
import { SkillTool } from './skill';
import { PlanEnterTool, PlanExitTool } from './plan';

/**
 * Initialize the tool registry with all available tools
 */
export async function initializeToolRegistry(): Promise<ToolRegistry> {
  const registry = new ToolRegistry();

  // Core tools
  registry.register(BashTool);
  registry.register(ReadTool);
  registry.register(WriteTool);
  registry.register(EditTool);
  registry.register(GlobTool);
  registry.register(GrepTool);
  registry.register(LsTool);

  // Additional tools from OpenCode
  registry.register(InvalidTool);
  registry.register(WebFetchTool);
  registry.register(WebSearchTool);
  registry.register(TaskTool);
  registry.register(TodoWriteTool);
  registry.register(TodoReadTool);
  registry.register(QuestionTool);
  registry.register(BatchTool);
  registry.register(CodeSearchTool);
  registry.register(ApplyPatchTool);
  registry.register(MultiEditTool);
  registry.register(LspTool);
  registry.register(SkillTool);
  registry.register(PlanEnterTool);
  registry.register(PlanExitTool);

  return registry;
}

/**
 * Get all tool IDs
 */
export function getToolIds(): string[] {
  return globalToolRegistry.getIds();
}

/**
 * Get all tools
 */
export function getAllTools() {
  return globalToolRegistry.getAll();
}

/**
 * Get a tool by ID
 */
export function getTool(toolId: string) {
  return globalToolRegistry.get(toolId);
}

/**
 * Register a custom tool
 */
export function registerTool(tool: any): void {
  globalToolRegistry.register(tool);
}

// Export registry
export { globalToolRegistry };
