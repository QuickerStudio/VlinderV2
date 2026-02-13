/**
 * @fileoverview V2 Agent Tools - Main Entry Point
 * 
 * 工具系统，基于OpenCode的工具架构设计
 * 
 * @version 2.0.0
 */

// Core
export * from './core';

// File Tools
export * from './files';

// Search Tools
export * from './search';

// Web Tools
export * from './web';

// ============================================================================
// 工具注册
// ============================================================================

import { globalToolRegistry } from './core/registry';
import { ReadTool } from './files/read';
import { WriteTool } from './files/write';
import { EditTool } from './files/edit';
import { BashTool } from './files/bash';
import { GlobTool } from './search/glob';
import { GrepTool } from './search/grep';
import { WebFetchTool } from './web/webfetch';
import { WebSearchTool } from './web/websearch';

/**
 * 注册所有默认工具
 */
export function registerDefaultTools(): void {
  globalToolRegistry.registerAll([
    ReadTool,
    WriteTool,
    EditTool,
    BashTool,
    GlobTool,
    GrepTool,
    WebFetchTool,
    WebSearchTool,
  ]);
}

/**
 * 获取工具列表
 */
export function getToolList(): string[] {
  return [
    'read',
    'write',
    'edit',
    'bash',
    'glob',
    'grep',
    'webfetch',
    'websearch',
  ];
}

// 自动注册默认工具
registerDefaultTools();
