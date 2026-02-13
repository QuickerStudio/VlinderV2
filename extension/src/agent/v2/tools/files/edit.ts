/**
 * @fileoverview Edit Tool - 编辑文件工具
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

const DESCRIPTION = `Edits a file by replacing specific text.

Usage notes:
- This tool performs exact string replacement in files
- Both oldString and newString must be provided
- If oldString is not found, the tool will fail
- If oldString appears multiple times, use replaceAll to replace all occurrences
- For creating new files, use the write tool instead

Parameters:
- filePath: The absolute path to the file to modify
- oldString: The text to replace
- newString: The text to replace it with (must be different from oldString)
- replaceAll: Replace all occurrences of oldString (default false)`;

// ============================================================================
// 参数Schema
// ============================================================================

const EditFileSchema = z.object({
  filePath: z.string().describe('The absolute path to the file to modify'),
  oldString: z.string().describe('The text to replace'),
  newString: z.string().describe('The text to replace it with'),
  replaceAll: z.boolean().optional().describe('Replace all occurrences of oldString'),
});

// ============================================================================
// 工具实现
// ============================================================================

export const EditTool = defineTool('edit', {
  name: 'edit',
  description: DESCRIPTION,
  parameters: EditFileSchema,
  
  async execute(params, ctx: ToolContext): Promise<ToolResult> {
    if (!params.filePath) {
      throw new Error('filePath is required');
    }

    if (params.oldString === params.newString) {
      throw new Error('No changes to apply: oldString and newString are identical.');
    }

    let filepath = params.filePath;
    if (!path.isAbsolute(filepath)) {
      filepath = path.resolve(ctx.workingDirectory, filepath);
    }

    // 检查文件是否存在
    const stat = await fs.stat(filepath).catch(() => null);
    if (!stat) {
      throw new Error(`File not found: ${filepath}`);
    }
    if (stat.isDirectory()) {
      throw new Error(`Path is a directory, not a file: ${filepath}`);
    }

    // 读取文件内容
    const contentOld = await fs.readFile(filepath, 'utf-8');

    // 执行替换
    let contentNew: string;
    let matchCount = 0;

    if (params.oldString === '') {
      // 如果oldString为空，创建新文件
      contentNew = params.newString;
      matchCount = 1;
    } else if (params.replaceAll) {
      // 替换所有匹配
      const regex = new RegExp(escapeRegex(params.oldString), 'g');
      matchCount = (contentOld.match(regex) || []).length;
      contentNew = contentOld.replace(regex, params.newString);
    } else {
      // 替换第一个匹配
      const index = contentOld.indexOf(params.oldString);
      if (index === -1) {
        // 尝试模糊匹配
        const suggestions = findSimilarStrings(contentOld, params.oldString);
        if (suggestions.length > 0) {
          throw new Error(
            `Could not find the text to replace. Similar text found:\n${suggestions.slice(0, 3).join('\n')}`
          );
        }
        throw new Error(`Could not find the text to replace in ${filepath}`);
      }
      matchCount = 1;
      contentNew = contentOld.replace(params.oldString, params.newString);
    }

    if (contentOld === contentNew && params.oldString !== '') {
      throw new Error('No changes were made to the file');
    }

    // 请求权限
    await ctx.ask({
      permission: 'edit',
      patterns: [filepath],
      always: ['*'],
      metadata: {
        filepath,
        matchCount,
      },
    });

    // 写入文件
    await fs.writeFile(filepath, contentNew, 'utf-8');

    // 生成diff
    const diff = generateDiff(filepath, contentOld, contentNew);
    const additions = countLines(contentNew) - countLines(contentOld);
    const deletions = -additions;

    const title = path.basename(filepath);

    return {
      title,
      output: `Successfully edited ${filepath}\n${matchCount} occurrence(s) replaced\n${additions > 0 ? `+${additions}` : additions} lines`,
      metadata: {
        diff,
        filediff: {
          file: filepath,
          before: contentOld,
          after: contentNew,
          additions: Math.max(0, additions),
          deletions: Math.max(0, deletions),
        },
        matchCount,
      },
    };
  },
});

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 转义正则表达式特殊字符
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 查找相似字符串
 */
function findSimilarStrings(content: string, target: string): string[] {
  const lines = content.split('\n');
  const suggestions: string[] = [];

  for (const line of lines) {
    if (calculateSimilarity(line, target) > 0.5) {
      suggestions.push(line.trim());
    }
  }

  return suggestions;
}

/**
 * 计算字符串相似度 (简单的Jaccard相似度)
 */
function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));

  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}

/**
 * 生成简单的diff
 */
function generateDiff(filepath: string, oldContent: string, newContent: string): string {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  let diff = `--- ${filepath}\n+++ ${filepath}\n`;

  // 简单的行级diff
  const maxLines = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine !== newLine) {
      if (oldLine !== undefined) {
        diff += `-${oldLine}\n`;
      }
      if (newLine !== undefined) {
        diff += `+${newLine}\n`;
      }
    }
  }

  return diff;
}

/**
 * 计算行数
 */
function countLines(content: string): number {
  return content.split('\n').length;
}

export default EditTool;
