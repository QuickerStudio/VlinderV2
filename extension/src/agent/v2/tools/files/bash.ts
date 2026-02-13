/**
 * @fileoverview Bash Tool - 执行命令工具
 * 
 * @version 2.0.0
 */

import { spawn } from 'child_process';
import * as path from 'path';
import { z } from 'zod';
import { defineTool } from '../core/registry';
import type { ToolContext, ToolResult } from '../core/types';

// ============================================================================
// 常量
// ============================================================================

const DEFAULT_TIMEOUT = 2 * 60 * 1000; // 2 minutes
const MAX_METADATA_LENGTH = 30000;

// ============================================================================
// 工具描述
// ============================================================================

const DESCRIPTION = `Executes a bash command in a persistent shell session.

Usage notes:
- Commands run in a persistent shell session where environment variables and directory changes persist
- Use this tool for file operations, running tests, git commands, etc.
- For long-running commands, consider setting a timeout
- Always provide a clear description of what the command does

Parameters:
- command: The command to execute
- description: Clear, concise description of what this command does in 5-10 words
- timeout: Optional timeout in milliseconds
- workdir: The working directory to run the command in`;

// ============================================================================
// 参数Schema
// ============================================================================

const BashSchema = z.object({
  command: z.string().describe('The command to execute'),
  description: z.string().describe('Clear, concise description of what this command does'),
  timeout: z.number().describe('Optional timeout in milliseconds').optional(),
  workdir: z.string().describe('The working directory to run the command in').optional(),
});

// ============================================================================
// 工具实现
// ============================================================================

export const BashTool = defineTool('bash', {
  name: 'bash',
  description: DESCRIPTION,
  parameters: BashSchema,
  
  async execute(params, ctx: ToolContext): Promise<ToolResult> {
    const cwd = params.workdir || ctx.workingDirectory;
    const timeout = params.timeout ?? DEFAULT_TIMEOUT;

    if (params.timeout !== undefined && params.timeout < 0) {
      throw new Error(`Invalid timeout value: ${params.timeout}. Timeout must be a positive number.`);
    }

    // 请求权限
    await ctx.ask({
      permission: 'bash',
      patterns: [params.command],
      always: ['*'],
      metadata: {
        command: params.command,
        cwd,
      },
    });

    // 确定shell
    const shell = process.platform === 'win32' ? true : '/bin/bash';

    // 初始化元数据
    ctx.metadata({
      metadata: {
        output: '',
        description: params.description,
      },
    });

    // 执行命令
    const proc = spawn(params.command, [], {
      shell,
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    });

    let output = '';
    let timedOut = false;
    let aborted = false;
    let exited = false;

    // 处理输出
    const append = (chunk: Buffer) => {
      output += chunk.toString();
      ctx.metadata({
        metadata: {
          output: output.length > MAX_METADATA_LENGTH 
            ? output.slice(0, MAX_METADATA_LENGTH) + '\n\n...' 
            : output,
          description: params.description,
        },
      });
    };

    proc.stdout?.on('data', append);
    proc.stderr?.on('data', append);

    // 处理中止
    if (ctx.abort.aborted) {
      aborted = true;
      killProcess();
    }

    ctx.abort.addEventListener('abort', () => {
      aborted = true;
      killProcess();
    }, { once: true });

    // 处理超时
    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      killProcess();
    }, timeout + 100);

    // 等待进程结束
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeoutTimer);
      };

      proc.once('exit', () => {
        exited = true;
        cleanup();
        resolve();
      });

      proc.once('error', (error) => {
        exited = true;
        cleanup();
        reject(error);
      });
    });

    // 添加元数据
    const resultMetadata: string[] = [];

    if (timedOut) {
      resultMetadata.push(`bash tool terminated command after exceeding timeout ${timeout} ms`);
    }

    if (aborted) {
      resultMetadata.push('User aborted the command');
    }

    if (resultMetadata.length > 0) {
      output += '\n\n<bash_metadata>\n' + resultMetadata.join('\n') + '\n</bash_metadata>';
    }

    return {
      title: params.description,
      metadata: {
        output: output.length > MAX_METADATA_LENGTH 
          ? output.slice(0, MAX_METADATA_LENGTH) + '\n\n...' 
          : output,
        exit: proc.exitCode,
        description: params.description,
      },
      output,
    };

    function killProcess() {
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', String(proc.pid), '/f', '/t']);
        } else {
          process.kill(-proc.pid!, 'SIGTERM');
        }
      } catch {}
    }
  },
});

export default BashTool;
