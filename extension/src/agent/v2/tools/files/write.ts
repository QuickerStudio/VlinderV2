/**
 * @fileoverview Write Tool - 写入文件工具
 * 
 * @version 2.0.0
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import { defineTool } from '../core/registry';
import type { ToolContext, ToolResult } from '../core/types';

// ============================================================================
// 工具描述
// ============================================================================

const DESCRIPTION = `Writes content to a file on the local filesystem.

Usage notes:
- This tool writes content to a file, creating it if it doesn't exist or overwriting if it does
- The file path must be absolute, not relative
- For large files, consider using the edit tool instead to make incremental changes
- Always verify the file path before writing to avoid accidental overwrites

Parameters:
- filePath: The absolute path to the file to write (must be absolute, not relative)
- content: The content to write to the file`;

// ============================================================================
// 参数Schema
// ============================================================================

const WriteFileSchema = z.object({
  filePath: z.string().describe('The absolute path to the file to write'),
  content: z.string().describe('The content to write to the file'),
});

// ============================================================================
// 工具实现
// ============================================================================

export const WriteTool = defineTool('write', {
  name: 'write',
  description: DESCRIPTION,
  parameters: WriteFileSchema,
  
  async execute(params, ctx: ToolContext): Promise<ToolResult> {
    let filepath = params.filePath;
    if (!path.isAbsolute(filepath)) {
      filepath = path.resolve(ctx.workingDirectory, filepath);
    }

    // 检查文件是否存在
    const exists = await fs.stat(filepath).catch(() => null);

    // 请求权限
    await ctx.ask({
      permission: 'write',
      patterns: [filepath],
      always: ['*'],
      metadata: {
        filepath,
        exists: !!exists,
      },
    });

    // 确保目录存在
    const dir = path.dirname(filepath);
    await fs.mkdir(dir, { recursive: true });

    // 写入文件
    await fs.writeFile(filepath, params.content, 'utf-8');

    const title = path.basename(filepath);
    const lines = params.content.split('\n').length;

    return {
      title,
      output: `Successfully wrote ${params.content.length} characters (${lines} lines) to ${filepath}`,
      metadata: {
        filepath,
        exists: !!exists,
        size: params.content.length,
        lines,
      },
    };
  },
});

export default WriteTool;
