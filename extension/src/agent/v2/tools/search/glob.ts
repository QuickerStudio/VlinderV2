/**
 * @fileoverview Glob Tool - 文件模式匹配搜索工具
 * 
 * @version 2.0.0
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import { defineTool } from '../core/registry';
import type { ToolContext, ToolResult } from '../core/types';

// ============================================================================
// 常量
// ============================================================================

const LIMIT = 100;

// ============================================================================
// 工具描述
// ============================================================================

const DESCRIPTION = `Fast file pattern matching tool.

Usage notes:
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns file paths sorted by modification time (most recent first)
- Results are limited to 100 files by default
- Use more specific patterns to narrow down results

Parameters:
- pattern: The glob pattern to match files against
- path: The directory to search in (optional, defaults to current working directory)`;

// ============================================================================
// 参数Schema
// ============================================================================

const GlobSchema = z.object({
  pattern: z.string().describe('The glob pattern to match files against'),
  path: z.string().optional().describe('The directory to search in'),
});

// ============================================================================
// 工具实现
// ============================================================================

export const GlobTool = defineTool('glob', {
  name: 'glob',
  description: DESCRIPTION,
  parameters: GlobSchema,
  
  async execute(params, ctx: ToolContext): Promise<ToolResult> {
    // 请求权限
    await ctx.ask({
      permission: 'glob',
      patterns: [params.pattern],
      always: ['*'],
      metadata: {
        pattern: params.pattern,
        path: params.path,
      },
    });

    let searchPath = params.path ?? ctx.workingDirectory;
    searchPath = path.isAbsolute(searchPath) 
      ? searchPath 
      : path.resolve(ctx.workingDirectory, searchPath);

    // 收集匹配的文件
    const files: Array<{ path: string; mtime: number }> = [];
    let truncated = false;

    await walkDirectory(searchPath, params.pattern, async (filePath) => {
      if (files.length >= LIMIT) {
        truncated = true;
        return false;
      }

      try {
        const stat = await fs.stat(filePath);
        files.push({
          path: filePath,
          mtime: stat.mtimeMs,
        });
      } catch {}

      return true;
    });

    // 按修改时间排序
    files.sort((a, b) => b.mtime - a.mtime);

    // 生成输出
    const outputLines: string[] = [];

    if (files.length === 0) {
      outputLines.push('No files found');
    } else {
      outputLines.push(...files.map(f => f.path));

      if (truncated) {
        outputLines.push('');
        outputLines.push(
          `(Results are truncated: showing first ${LIMIT} results. Consider using a more specific path or pattern.)`
        );
      }
    }

    const title = path.basename(searchPath);

    return {
      title,
      output: outputLines.join('\n'),
      metadata: {
        count: files.length,
        truncated,
      },
    };
  },
});

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 遍历目录
 */
async function walkDirectory(
  dir: string,
  pattern: string,
  callback: (filePath: string) => Promise<boolean>
): Promise<void> {
  const regex = globToRegex(pattern);

  async function walk(currentDir: string): Promise<void> {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        // 跳过隐藏文件和常见排除目录
        if (entry.name.startsWith('.') || 
            ['node_modules', 'dist', 'build', '.git'].includes(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          if (regex.test(fullPath)) {
            const shouldContinue = await callback(fullPath);
            if (!shouldContinue) return;
          }
        }
      }
    } catch {}
  }

  await walk(dir);
}

/**
 * 将glob模式转换为正则表达式
 */
function globToRegex(pattern: string): RegExp {
  let regex = pattern
    // 转义特殊字符
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    // 处理 **
    .replace(/\*\*/g, '{{DOUBLESTAR}}')
    // 处理 *
    .replace(/\*/g, '[^/]*')
    // 处理 ?
    .replace(/\?/g, '[^/]')
    // 恢复 **
    .replace(/\{\{DOUBLESTAR\}\}/g, '.*');

  return new RegExp(regex, 'i');
}

export default GlobTool;
