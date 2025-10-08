/**
 * Test turndown conversion on Baidu Baike HTML
 */

import TurndownService from 'turndown';
import * as fs from 'fs';
import * as path from 'path';

// Read the saved HTML
const htmlPath = path.join(__dirname, '../../Pattern-Search-test-file/baidu-debug.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

console.log('Original HTML length:', html.length);

// Clean HTML (remove script and style tags)
let cleanedHtml = html
	.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
	.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
	.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
	.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
	.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');

console.log('Cleaned HTML length:', cleanedHtml.length);

// Extract body
const bodyMatch = cleanedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (bodyMatch) {
	cleanedHtml = bodyMatch[1];
	console.log('Body content length:', cleanedHtml.length);
}

// Convert to Markdown
const turndownService = new TurndownService({
	headingStyle: 'atx',
	codeBlockStyle: 'fenced',
});

const markdown = turndownService.turndown(cleanedHtml);

console.log('\n=== Markdown Result ===');
console.log('Markdown length:', markdown.length);
console.log('\nFirst 2000 chars:');
console.log(markdown.substring(0, 2000));

// Save markdown
const mdPath = path.join(__dirname, '../../Pattern-Search-test-file/baidu-markdown.md');
fs.writeFileSync(mdPath, markdown);
console.log('\n✅ Saved to Pattern-Search-test-file/baidu-markdown.md');

