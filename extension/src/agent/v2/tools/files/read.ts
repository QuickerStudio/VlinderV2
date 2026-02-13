/**
 * @fileoverview Read Tool - 读取文件工具
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

const DEFAULT_READ_LIMIT = 2000;
const MAX_LINE_LENGTH = 2000;
const MAX_BYTES = 50 * 1024;

// ============================================================================
// 工具描述
// ============================================================================

const DESCRIPTION = `Reads a file from the local filesystem.

Usage notes:
- This tool reads files from the local filesystem
- You can access files outside the current working directory by providing an absolute path
- You can call this tool multiple times to read different files
- By default, it reads up to 2000 lines starting from line 1
- Use the 'offset' and 'limit' parameters to read specific portions of large files
- For images and PDFs, the content will be returned as base64-encoded data

Parameters:
- filePath: The absolute path to the file or directory to read
- offset: The line number to start reading from (1-indexed, optional)
- limit: The maximum number of lines to read (defaults to 2000)`;

// ============================================================================
// 参数Schema
// ============================================================================

const ReadFileSchema = z.object({
  filePath: z.string().describe('The absolute path to the file or directory to read'),
  offset: z.coerce.number().describe('The line number to start reading from (1-indexed)').optional(),
  limit: z.coerce.number().describe('The maximum number of lines to read (defaults to 2000)').optional(),
});

// ============================================================================
// 工具实现
// ============================================================================

export const ReadTool = defineTool('read', {
  name: 'read',
  description: DESCRIPTION,
  parameters: ReadFileSchema,
  
  async execute(params, ctx: ToolContext): Promise<ToolResult> {
    if (params.offset !== undefined && params.offset < 1) {
      throw new Error('offset must be greater than or equal to 1');
    }

    let filepath = params.filePath;
    if (!path.isAbsolute(filepath)) {
      filepath = path.resolve(ctx.workingDirectory, filepath);
    }

    const title = path.basename(filepath);

    // 请求权限
    await ctx.ask({
      permission: 'read',
      patterns: [filepath],
      always: ['*'],
      metadata: {},
    });

    // 检查文件是否存在
    const stat = await fs.stat(filepath).catch(() => null);

    if (!stat) {
      // 尝试提供相似文件建议
      const dir = path.dirname(filepath);
      const base = path.basename(filepath);

      try {
        const dirEntries = await fs.readdir(dir);
        const suggestions = dirEntries
          .filter(
            entry =>
              entry.toLowerCase().includes(base.toLowerCase()) ||
              base.toLowerCase().includes(entry.toLowerCase())
          )
          .map(entry => path.join(dir, entry))
          .slice(0, 3);

        if (suggestions.length > 0) {
          throw new Error(
            `File not found: ${filepath}\n\nDid you mean one of these?\n${suggestions.join('\n')}`
          );
        }
      } catch {}

      throw new Error(`File not found: ${filepath}`);
    }

    // 处理目录
    if (stat.isDirectory()) {
      const dirents = await fs.readdir(filepath, { withFileTypes: true });
      const entries = await Promise.all(
        dirents.map(async dirent => {
          if (dirent.isDirectory()) return dirent.name + '/';
          if (dirent.isSymbolicLink()) {
            const target = await fs.stat(path.join(filepath, dirent.name)).catch(() => null);
            if (target?.isDirectory()) return dirent.name + '/';
          }
          return dirent.name;
        })
      );
      entries.sort((a, b) => a.localeCompare(b));

      const limit = params.limit ?? DEFAULT_READ_LIMIT;
      const offset = params.offset ?? 1;
      const start = offset - 1;
      const sliced = entries.slice(start, start + limit);
      const truncated = start + sliced.length < entries.length;

      const output = [
        `<path>${filepath}</path>`,
        `<type>directory</type>`,
        `<entries>`,
        sliced.join('\n'),
        truncated
          ? `\n(Showing ${sliced.length} of ${entries.length} entries. Use 'offset' parameter to read beyond entry ${offset + sliced.length})`
          : `\n(${entries.length} entries)`,
        `</entries>`,
      ].join('\n');

      return {
        title,
        output,
        metadata: {
          preview: sliced.slice(0, 20).join('\n'),
          truncated,
          loaded: [],
        },
      };
    }

    // 检查是否为图片或PDF
    const ext = path.extname(filepath).toLowerCase();
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
    const isImage = imageExts.includes(ext);
    const isPdf = ext === '.pdf';

    if (isImage || isPdf) {
      const content = await fs.readFile(filepath);
      const mime = isImage ? `image/${ext.slice(1)}` : 'application/pdf';
      const base64 = content.toString('base64');

      return {
        title,
        output: `${isImage ? 'Image' : 'PDF'} read successfully`,
        metadata: {
          preview: `${isImage ? 'Image' : 'PDF'} file`,
          truncated: false,
          loaded: [],
        },
        attachments: [
          {
            id: `attachment_${Date.now()}`,
            sessionId: ctx.sessionId,
            messageId: ctx.messageId,
            type: 'file',
            mime,
            url: `data:${mime};base64,${base64}`,
          },
        ],
      };
    }

    // 检查是否为二进制文件
    const isBinary = await isBinaryFile(filepath, ext);
    if (isBinary) {
      throw new Error(`Cannot read binary file: ${filepath}`);
    }

    // 读取文本文件
    const limit = params.limit ?? DEFAULT_READ_LIMIT;
    const offset = params.offset ?? 1;
    const start = offset - 1;
    const content = await fs.readFile(filepath, 'utf-8');
    const lines = content.split('\n');

    if (start >= lines.length) {
      throw new Error(`Offset ${offset} is out of range for this file (${lines.length} lines)`);
    }

    const raw: string[] = [];
    let bytes = 0;
    let truncatedByBytes = false;

    for (let i = start; i < Math.min(lines.length, start + limit); i++) {
      const line = lines[i].length > MAX_LINE_LENGTH 
        ? lines[i].substring(0, MAX_LINE_LENGTH) + '...' 
        : lines[i];
      const size = Buffer.byteLength(line, 'utf-8') + (raw.length > 0 ? 1 : 0);
      
      if (bytes + size > MAX_BYTES) {
        truncatedByBytes = true;
        break;
      }
      raw.push(line);
      bytes += size;
    }

    const numberedContent = raw.map((line, index) => `${index + offset}: ${line}`);
    const preview = raw.slice(0, 20).join('\n');

    let output = [`<path>${filepath}</path>`, `<type>file</type>`, '<content>'].join('\n');
    output += numberedContent.join('\n');

    const totalLines = lines.length;
    const lastReadLine = offset + raw.length - 1;
    const hasMoreLines = totalLines > lastReadLine;
    const truncated = hasMoreLines || truncatedByBytes;

    if (truncatedByBytes) {
      output += `\n\n(Output truncated at ${MAX_BYTES} bytes. Use 'offset' parameter to read beyond line ${lastReadLine})`;
    } else if (hasMoreLines) {
      output += `\n\n(File has more lines. Use 'offset' parameter to read beyond line ${lastReadLine})`;
    } else {
      output += `\n\n(End of file - total ${totalLines} lines)`;
    }
    output += '\n</content>';

    return {
      title,
      output,
      metadata: {
        preview,
        truncated,
        loaded: [],
      },
    };
  },
});

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 检查是否为二进制文件
 */
async function isBinaryFile(filepath: string, ext: string): Promise<boolean> {
  // 常见二进制扩展名
  const binaryExts = [
    '.zip', '.tar', '.gz', '.exe', '.dll', '.so', '.class', '.jar',
    '.war', '.7z', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.odt', '.ods', '.odp', '.bin', '.dat', '.obj', '.o', '.a', '.lib',
    '.wasm', '.pyc', '.pyo',
  ];

  if (binaryExts.includes(ext)) {
    return true;
  }

  const stat = await fs.stat(filepath);
  const fileSize = stat.size;
  if (fileSize === 0) return false;

  const buffer = Buffer.alloc(Math.min(4096, fileSize));
  const fd = await fs.open(filepath, 'r');
  await fd.read(buffer, 0, buffer.length, 0);
  await fd.close();

  let nonPrintableCount = 0;
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 0) return true;
    if (buffer[i] < 9 || (buffer[i] > 13 && buffer[i] < 32)) {
      nonPrintableCount++;
    }
  }

  // 如果超过30%是非打印字符，认为是二进制
  return nonPrintableCount / buffer.length > 0.3;
}

export default ReadTool;
