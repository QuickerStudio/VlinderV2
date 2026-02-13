/**
 * @fileoverview Grep Tool - 文本搜索工具
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
const MAX_LINE_LENGTH = 2000;

// ============================================================================
// 工具描述
// ============================================================================

const DESCRIPTION = `Search for patterns in file contents using regex.

Usage notes:
- Supports full regex syntax for powerful pattern matching
- Returns matching lines with file paths and line numbers
- Results are sorted by file modification time
- Use the 'include' parameter to filter by file type

Parameters:
- pattern: The regex pattern to search for in file contents
- path: The directory to search in (optional, defaults to current working directory)
- include: File pattern to include in the search (e.g. "*.js", "*.{ts,tsx}")`;

// ============================================================================
// 参数Schema
// ============================================================================

const GrepSchema = z.object({
  pattern: z.string().describe('The regex pattern to search for in file contents'),
  path: z.string().optional().describe('The directory to search in'),
  include: z.string().optional().describe('File pattern to include in the search'),
});

// ============================================================================
// 工具实现
// ============================================================================

export const GrepTool = defineTool('grep', {
  name: 'grep',
  description: DESCRIPTION,
  parameters: GrepSchema,
  
  async execute(params, ctx: ToolContext): Promise<ToolResult> {
    if (!params.pattern) {
      throw new Error('pattern is required');
    }

    // 请求权限
    await ctx.ask({
      permission: 'grep',
      patterns: [params.pattern],
      always: ['*'],
      metadata: {
        pattern: params.pattern,
        path: params.path,
        include: params.include,
      },
    });

    let searchPath = params.path ?? ctx.workingDirectory;
    searchPath = path.isAbsolute(searchPath) 
      ? searchPath 
      : path.resolve(ctx.workingDirectory, searchPath);

    // 编译正则表达式
    let regex: RegExp;
    try {
      regex = new RegExp(params.pattern, 'gm');
    } catch (error) {
      throw new Error(`Invalid regex pattern: ${error}`);
    }

    // 收集匹配
    const matches: Array<{
      path: string;
      modTime: number;
      lineNum: number;
      lineText: string;
    }> = [];

    const includeRegex = params.include ? globToRegex(params.include) : null;

    await walkDirectory(searchPath, async (filePath, content) => {
      // 检查文件扩展名
      if (includeRegex && !includeRegex.test(filePath)) {
        return true;
      }

      const lines = content.split('\n');
      const stat = await fs.stat(filePath).catch(() => null);

      for (let i = 0; i < lines.length; i++) {
        if (matches.length >= LIMIT) {
          return false;
        }

        const line = lines[i];
        if (regex.test(line)) {
          matches.push({
            path: filePath,
            modTime: stat?.mtimeMs ?? 0,
            lineNum: i + 1,
            lineText: line.length > MAX_LINE_LENGTH 
              ? line.substring(0, MAX_LINE_LENGTH) + '...' 
              : line,
          });
        }
        // 重置正则表达式状态
        regex.lastIndex = 0;
      }

      return true;
    });

    // 按修改时间排序
    matches.sort((a, b) => b.modTime - a.modTime);

    const truncated = matches.length >= LIMIT;

    // 生成输出
    const outputLines: string[] = [];

    if (matches.length === 0) {
      outputLines.push('No files found');
    } else {
      outputLines.push(`Found ${matches.length} matches${truncated ? ' (showing first 100)' : ''}`);

      let currentFile = '';
      for (const match of matches) {
        if (currentFile !== match.path) {
          if (currentFile !== '') {
            outputLines.push('');
          }
          currentFile = match.path;
          outputLines.push(`${match.path}:`);
        }
        outputLines.push(`  Line ${match.lineNum}: ${match.lineText}`);
      }

      if (truncated) {
        outputLines.push('');
        outputLines.push(
          `(Results truncated: showing ${LIMIT} of ${matches.length} matches. Consider using a more specific path or pattern.)`
        );
      }
    }

    return {
      title: params.pattern,
      output: outputLines.join('\n'),
      metadata: {
        matches: matches.length,
        truncated,
      },
    };
  },
});

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 遍历目录并读取文件
 */
async function walkDirectory(
  dir: string,
  callback: (filePath: string, content: string) => Promise<boolean>
): Promise<void> {
  async function walk(currentDir: string): Promise<boolean> {
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
          const shouldContinue = await walk(fullPath);
          if (!shouldContinue) return false;
        } else if (entry.isFile()) {
          // 只读取文本文件
          const ext = path.extname(entry.name).toLowerCase();
          const textExts = [
            '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt', '.py',
            '.java', '.go', '.rs', '.c', '.cpp', '.h', '.hpp', '.css',
            '.scss', '.html', '.xml', '.yaml', '.yml', '.toml', '.ini',
            '.sh', '.bash', '.zsh', '.env', '.gitignore', '.dockerignore',
          ];

          if (textExts.includes(ext) || entry.name.startsWith('.')) {
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              const shouldContinue = await callback(fullPath, content);
              if (!shouldContinue) return false;
            } catch {}
          }
        }
      }

      return true;
    } catch {
      return true;
    }
  }

  await walk(dir);
}

/**
 * 将glob模式转换为正则表达式
 */
function globToRegex(pattern: string): RegExp {
  let regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '{{DOUBLESTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\{\{DOUBLESTAR\}\}/g, '.*');

  return new RegExp(regex, 'i');
}

export default GrepTool;
