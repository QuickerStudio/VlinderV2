/**
 * @fileoverview Tool Types - 工具类型定义
 * 
 * 基于OpenCode的工具系统设计
 * 
 * @version 2.0.0
 */

import { z } from 'zod';

// ============================================================================
// 工具标识符
// ============================================================================

export type ToolId = string;
export type ToolName = string;

// ============================================================================
// 工具状态
// ============================================================================

/**
 * 工具执行状态
 */
export enum ToolStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// ============================================================================
// 工具上下文
// ============================================================================

/**
 * 工具执行上下文
 */
export interface ToolContext {
  sessionId: string;
  messageId: string;
  agentId: string;
  abort: AbortSignal;
  callId?: string;
  extra?: Record<string, unknown>;
  workingDirectory: string;
  
  // 权限请求
  ask: (request: PermissionRequest) => Promise<void>;
  
  // 元数据更新
  metadata: (input: { title?: string; metadata?: Record<string, unknown> }) => void;
}

/**
 * 权限请求
 */
export interface PermissionRequest {
  permission: string;
  patterns: string[];
  always?: string[];
  metadata: Record<string, unknown>;
}

// ============================================================================
// 工具定义
// ============================================================================

/**
 * 工具信息
 */
export interface ToolInfo<Parameters extends z.ZodType = z.ZodType, Metadata = Record<string, unknown>> {
  id: string;
  name: string;
  description: string;
  parameters: Parameters;
  execute: (
    args: z.infer<Parameters>,
    ctx: ToolContext
  ) => Promise<ToolResult<Metadata>>;
  formatValidationError?: (error: z.ZodError) => string;
}

/**
 * 工具结果
 */
export interface ToolResult<Metadata = Record<string, unknown>> {
  title: string;
  output: string;
  metadata: Metadata;
  attachments?: Attachment[];
}

/**
 * 附件
 */
export interface Attachment {
  id: string;
  sessionId: string;
  messageId: string;
  type: 'file' | 'image';
  mime: string;
  url: string;
}

// ============================================================================
// 工具定义辅助函数
// ============================================================================

/**
 * 定义工具
 */
export function defineTool<Parameters extends z.ZodType, Metadata = Record<string, unknown>>(
  id: string,
  name: string,
  init:
    | ToolInfo<Parameters, Metadata>['parameters']
    | ((
        ctx?: InitContext
      ) => Promise<{
        description: string;
        parameters: Parameters;
        execute: ToolInfo<Parameters, Metadata>['execute'];
        formatValidationError?: ToolInfo<Parameters, Metadata>['formatValidationError'];
      }>)
): ToolInfo<Parameters, Metadata> {
  return {
    id,
    name,
    description: '',
    parameters: init instanceof Promise ? (init as any).parameters : (init as any),
    execute: async () => ({ title: '', output: '', metadata: {} as Metadata }),
    ...(typeof init === 'function' ? {} : init),
  } as ToolInfo<Parameters, Metadata>;
}

/**
 * 初始化上下文
 */
export interface InitContext {
  agent?: {
    id: string;
    name: string;
    model: string;
  };
}

// ============================================================================
// 工具参数类型
// ============================================================================

/**
 * 读取文件参数
 */
export const ReadFileSchema = z.object({
  filePath: z.string().describe('The absolute path to the file or directory to read'),
  offset: z.coerce.number().describe('The line number to start reading from (1-indexed)').optional(),
  limit: z.coerce.number().describe('The maximum number of lines to read (defaults to 2000)').optional(),
});

export type ReadFileParams = z.infer<typeof ReadFileSchema>;

/**
 * 写入文件参数
 */
export const WriteFileSchema = z.object({
  filePath: z.string().describe('The absolute path to the file to write'),
  content: z.string().describe('The content to write to the file'),
});

export type WriteFileParams = z.infer<typeof WriteFileSchema>;

/**
 * 编辑文件参数
 */
export const EditFileSchema = z.object({
  filePath: z.string().describe('The absolute path to the file to modify'),
  oldString: z.string().describe('The text to replace'),
  newString: z.string().describe('The text to replace it with'),
  replaceAll: z.boolean().optional().describe('Replace all occurrences of oldString'),
});

export type EditFileParams = z.infer<typeof EditFileSchema>;

/**
 * Bash命令参数
 */
export const BashSchema = z.object({
  command: z.string().describe('The command to execute'),
  timeout: z.number().describe('Optional timeout in milliseconds').optional(),
  workdir: z.string().describe('The working directory to run the command in').optional(),
  description: z.string().describe('Clear, concise description of what this command does'),
});

export type BashParams = z.infer<typeof BashSchema>;

/**
 * Glob搜索参数
 */
export const GlobSchema = z.object({
  pattern: z.string().describe('The glob pattern to match files against'),
  path: z.string().optional().describe('The directory to search in'),
});

export type GlobParams = z.infer<typeof GlobSchema>;

/**
 * Grep搜索参数
 */
export const GrepSchema = z.object({
  pattern: z.string().describe('The regex pattern to search for'),
  path: z.string().optional().describe('The directory to search in'),
  include: z.string().optional().describe('File pattern to include'),
});

export type GrepParams = z.infer<typeof GrepSchema>;

/**
 * WebFetch参数
 */
export const WebFetchSchema = z.object({
  url: z.string().describe('The URL to fetch content from'),
  format: z.enum(['text', 'markdown', 'html']).default('markdown').describe('The format to return'),
  timeout: z.number().describe('Optional timeout in seconds').optional(),
});

export type WebFetchParams = z.infer<typeof WebFetchSchema>;

/**
 * WebSearch参数
 */
export const WebSearchSchema = z.object({
  query: z.string().describe('Web search query'),
  numResults: z.number().optional().describe('Number of results to return'),
});

export type WebSearchParams = z.infer<typeof WebSearchSchema>;

// ============================================================================
// 工具结果类型
// ============================================================================

/**
 * 读取文件结果
 */
export interface ReadFileResult extends ToolResult<{
  preview: string;
  truncated: boolean;
  loaded: string[];
}> {}

/**
 * 写入文件结果
 */
export interface WriteFileResult extends ToolResult<{
  filepath: string;
  exists: boolean;
  diagnostics?: Record<string, unknown[]>;
}> {}

/**
 * 编辑文件结果
 */
export interface EditFileResult extends ToolResult<{
  diff: string;
  filediff: {
    file: string;
    before: string;
    after: string;
    additions: number;
    deletions: number;
  };
  diagnostics?: Record<string, unknown[]>;
}> {}

/**
 * Bash结果
 */
export interface BashResult extends ToolResult<{
  output: string;
  exit: number | null;
  description: string;
}> {}

/**
 * Glob结果
 */
export interface GlobResult extends ToolResult<{
  count: number;
  truncated: boolean;
}> {}

/**
 * Grep结果
 */
export interface GrepResult extends ToolResult<{
  matches: number;
  truncated: boolean;
}> {}

/**
 * WebFetch结果
 */
export interface WebFetchResult extends ToolResult<{
  url: string;
  format: string;
  size: number;
}> {}

/**
 * WebSearch结果
 */
export interface WebSearchResult extends ToolResult<{
  query: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}> {}
