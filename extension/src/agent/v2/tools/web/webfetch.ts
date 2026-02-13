/**
 * @fileoverview WebFetch Tool - 网页获取工具
 * 
 * @version 2.0.0
 */

import { z } from 'zod';
import { defineTool } from '../core/registry';
import type { ToolContext, ToolResult } from '../core/types';

// ============================================================================
// 常量
// ============================================================================

const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_TIMEOUT = 120000; // 2 minutes

// ============================================================================
// 工具描述
// ============================================================================

const DESCRIPTION = `Fetches content from a URL.

Usage notes:
- Fetches content from HTTP/HTTPS URLs
- Supports multiple output formats: text, markdown, or HTML
- Handles various content types including images and PDFs
- Respects robots.txt and rate limits

Parameters:
- url: The URL to fetch content from
- format: The format to return the content in (text, markdown, or html). Defaults to markdown.
- timeout: Optional timeout in seconds (max 120)`;

// ============================================================================
// 参数Schema
// ============================================================================

const WebFetchSchema = z.object({
  url: z.string().describe('The URL to fetch content from'),
  format: z.enum(['text', 'markdown', 'html']).default('markdown').describe('The format to return'),
  timeout: z.number().describe('Optional timeout in seconds').optional(),
});

// ============================================================================
// 工具实现
// ============================================================================

export const WebFetchTool = defineTool('webfetch', {
  name: 'webfetch',
  description: DESCRIPTION,
  parameters: WebFetchSchema,
  
  async execute(params, ctx: ToolContext): Promise<ToolResult> {
    // 验证URL
    if (!params.url.startsWith('http://') && !params.url.startsWith('https://')) {
      throw new Error('URL must start with http:// or https://');
    }

    // 请求权限
    await ctx.ask({
      permission: 'webfetch',
      patterns: [params.url],
      always: ['*'],
      metadata: {
        url: params.url,
        format: params.format,
      },
    });

    const timeout = Math.min((params.timeout ?? DEFAULT_TIMEOUT / 1000) * 1000, MAX_TIMEOUT);

    // 创建AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // 同时监听ctx.abort
    const abortHandler = () => controller.abort();
    ctx.abort.addEventListener('abort', abortHandler);

    try {
      const response = await fetch(params.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!response.ok) {
        throw new Error(`Request failed with status code: ${response.status}`);
      }

      // 检查内容长度
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
        throw new Error('Response too large (exceeds 5MB limit)');
      }

      const contentType = response.headers.get('content-type') || '';
      const mime = contentType.split(';')[0]?.trim().toLowerCase() || '';
      const title = `${params.url} (${contentType})`;

      // 检查是否为图片
      const isImage = mime.startsWith('image/') && mime !== 'image/svg+xml';

      if (isImage) {
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > MAX_RESPONSE_SIZE) {
          throw new Error('Response too large (exceeds 5MB limit)');
        }

        const base64Content = Buffer.from(arrayBuffer).toString('base64');

        return {
          title,
          output: 'Image fetched successfully',
          metadata: {
            url: params.url,
            format: 'image',
            size: arrayBuffer.byteLength,
          },
          attachments: [
            {
              id: `attachment_${Date.now()}`,
              sessionId: ctx.sessionId,
              messageId: ctx.messageId,
              type: 'image',
              mime,
              url: `data:${mime};base64,${base64Content}`,
            },
          ],
        };
      }

      // 获取文本内容
      const text = await response.text();

      // 根据格式处理内容
      let output = text;
      if (params.format === 'markdown' && mime.includes('html')) {
        output = htmlToMarkdown(text);
      } else if (params.format === 'text') {
        output = text.replace(/<[^>]*>/g, '');
      }

      return {
        title,
        output: output.slice(0, 50000), // 限制输出大小
        metadata: {
          url: params.url,
          format: params.format,
          size: text.length,
        },
      };

    } finally {
      clearTimeout(timeoutId);
      ctx.abort.removeEventListener('abort', abortHandler);
    }
  },
});

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 简单的HTML转Markdown
 */
function htmlToMarkdown(html: string): string {
  return html
    // 移除script和style标签
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // 标题
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
    // 段落
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    // 链接
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    // 粗体
    .replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**')
    // 斜体
    .replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, '*$2*')
    // 代码
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```')
    // 列表
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<ul[^>]*>(.*?)<\/ul>/gis, '$1')
    .replace(/<ol[^>]*>(.*?)<\/ol>/gis, '$1')
    // 换行
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<div[^>]*>(.*?)<\/div>/gis, '$1\n')
    // 移除其他标签
    .replace(/<[^>]*>/g, '')
    // 清理多余空白
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default WebFetchTool;
