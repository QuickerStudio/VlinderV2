import { BaseAgentTool } from '../base-agent.tool';
import { VscodeApiToolParams } from '../schema/vscode-api';
import { ToolResponseV2 } from '../types';
import TurndownService from 'turndown';

// Simple in-memory cache for API documentation
interface CacheEntry {
	data: string;
	timestamp: number;
	ttl: number; // Time to live in milliseconds
}

class SimpleCache {
	private cache = new Map<string, CacheEntry>();
	private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes

	set(key: string, data: string, ttl: number = this.DEFAULT_TTL): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl,
		});
	}

	get(key: string): string | null {
		const entry = this.cache.get(key);
		if (!entry) {
			return null;
		}

		const now = Date.now();
		if (now - entry.timestamp > entry.ttl) {
			// Entry expired
			this.cache.delete(key);
			return null;
		}

		return entry.data;
	}

	clear(): void {
		this.cache.clear();
	}

	size(): number {
		return this.cache.size;
	}
}

/**
 * Tool for searching VS Code API documentation
 *
 * Enhanced implementation with:
 * 1. Caching mechanism for improved performance
 * 2. Better search algorithms with relevance scoring
 * 3. Improved error handling and recovery
 * 4. Enhanced security and input validation
 */
export class VscodeApiTool extends BaseAgentTool<VscodeApiToolParams> {
	private readonly VSCODE_API_URL =
		'https://code.visualstudio.com/api/references/vscode-api';
	private readonly TIMEOUT_MS = 30000; // 30 seconds
	private readonly MAX_RESULTS = 5;
	private readonly MAX_SECTION_SIZE = 100; // lines
	private static cache = new SimpleCache();

	async execute(): Promise<ToolResponseV2> {
		const { query } = this.params.input;

		try {
			// Validate input
			if (!query || typeof query !== 'string' || query.trim().length === 0) {
				return this.toolResponse(
					'error',
					'Query parameter is required and must be a non-empty string'
				);
			}

			const trimmedQuery = query.trim();
			if (trimmedQuery.length > 200) {
				return this.toolResponse(
					'error',
					'Query is too long (maximum 200 characters)'
				);
			}

			this.logger(`Searching VS Code API for: ${trimmedQuery}`);

			// Try to get cached documentation
			const cacheKey = 'vscode-api-docs';
			let markdown = VscodeApiTool.cache.get(cacheKey);

			if (!markdown) {
				// Fetch fresh documentation
				markdown = await this.fetchApiDocumentation();
				if (!markdown) {
					return this.toolResponse(
						'error',
						'Failed to fetch VS Code API documentation'
					);
				}

				// Cache the result
				VscodeApiTool.cache.set(cacheKey, markdown);
				this.logger('API documentation cached successfully');
			} else {
				this.logger('Using cached API documentation');
			}

			// Search for relevant content with improved algorithm
			const results = this.enhancedSearchApiDocs(markdown, trimmedQuery);

			if (results.length === 0) {
				return this.toolResponse(
					'success',
					`No VS Code API documentation found for query: "${trimmedQuery}". Try a different search term or check the official documentation at ${this.VSCODE_API_URL}`
				);
			}

			// Format the results with enhanced metadata
			const xmlOutput = this.buildEnhancedXmlOutput(trimmedQuery, results);

			return this.toolResponse('success', xmlOutput);
		} catch (error) {
			this.logger(`Error searching VS Code API: ${error}`, 'error');
			return this.toolResponse(
				'error',
				`Unexpected error: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Fetch API documentation from the web
	 */
	private async fetchApiDocumentation(): Promise<string | null> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

		try {
			const response = await fetch(this.VSCODE_API_URL, {
				signal: controller.signal,
				headers: {
					'User-Agent': 'Mozilla/5.0 (compatible; VlinderBot/1.0)',
					Accept: 'text/html',
				},
			});

			if (!response.ok) {
				this.logger(`HTTP ${response.status}: ${response.statusText}`, 'error');
				return null;
			}

			const html = await response.text();
			return this.extractApiDocs(html);
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				this.logger(
					`Request timed out after ${this.TIMEOUT_MS / 1000} seconds`,
					'error'
				);
			} else {
				this.logger(
					`Failed to fetch VS Code API documentation: ${error instanceof Error ? error.message : String(error)}`,
					'error'
				);
			}
			return null;
		} finally {
			clearTimeout(timeoutId);
		}
	}

	/**
	 * Extract API documentation from HTML
	 */
	private extractApiDocs(html: string): string {
		try {
			// Remove script, style, and other non-content elements
			let cleanedHtml = html
				.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
				.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
				.replace(
					/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi,
					''
				);

			// Try to extract main content
			const mainMatch =
				cleanedHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
				cleanedHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
				cleanedHtml.match(
					/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i
				);

			if (mainMatch) {
				cleanedHtml = mainMatch[1];
			}

			// Convert HTML to Markdown
			const turndownService = new TurndownService({
				headingStyle: 'atx',
				codeBlockStyle: 'fenced',
				emDelimiter: '*',
			});

			turndownService.remove([
				'nav',
				'footer',
				'header',
				'aside',
				'script',
				'style',
			]);

			const markdown = turndownService.turndown(cleanedHtml);

			return markdown;
		} catch (error) {
			this.logger(`Error extracting API docs: ${error}`, 'error');
			// Fallback: strip all HTML tags
			return html
				.replace(/<[^>]*>/g, ' ')
				.replace(/\s+/g, ' ')
				.trim();
		}
	}

	/**
	 * Enhanced search with relevance scoring and better algorithms
	 */
	private enhancedSearchApiDocs(
		markdown: string,
		query: string
	): SearchResult[] {
		const queryLower = query.toLowerCase();
		const queryWords = queryLower
			.split(/\s+/)
			.filter((word) => word.length > 0);
		const lines = markdown.split('\n');
		const results: SearchResult[] = [];

		// Find sections that contain the query
		let currentSection: string[] = [];
		let currentHeading = '';
		let sectionDepth = 0;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmedLine = line.trim();

			// Check if this is a heading
			const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);

			if (headingMatch) {
				// Process previous section if it exists
				if (currentSection.length > 0) {
					const result = this.evaluateSection(
						currentSection,
						currentHeading,
						queryWords,
						queryLower
					);
					if (result.score > 0) {
						results.push(result);
					}
				}

				// Start new section
				const depth = headingMatch[1].length;
				const headingText = headingMatch[2];

				currentSection = [line];
				currentHeading = headingText;
				sectionDepth = depth;
			} else if (currentSection.length > 0) {
				// Add line to current section
				currentSection.push(line);

				// Limit section size to prevent memory issues
				if (currentSection.length > this.MAX_SECTION_SIZE) {
					const result = this.evaluateSection(
						currentSection,
						currentHeading,
						queryWords,
						queryLower
					);
					if (result.score > 0) {
						results.push(result);
					}
					currentSection = [];
					currentHeading = '';
				}
			}
		}

		// Process last section
		if (currentSection.length > 0) {
			const result = this.evaluateSection(
				currentSection,
				currentHeading,
				queryWords,
				queryLower
			);
			if (result.score > 0) {
				results.push(result);
			}
		}

		// Sort by relevance score (descending) and limit results
		return results.sort((a, b) => b.score - a.score).slice(0, this.MAX_RESULTS);
	}

	/**
	 * Evaluate a section for relevance and calculate score
	 */
	private evaluateSection(
		section: string[],
		heading: string,
		queryWords: string[],
		fullQuery: string
	): SearchResult {
		const content = section.join('\n');
		const contentLower = content.toLowerCase();
		const headingLower = heading.toLowerCase();

		let score = 0;

		// Exact match in heading gets highest score
		if (headingLower.includes(fullQuery)) {
			score += 100;
		}

		// Partial matches in heading
		for (const word of queryWords) {
			if (headingLower.includes(word)) {
				score += 20;
			}
		}

		// Exact match in content
		if (contentLower.includes(fullQuery)) {
			score += 50;
		}

		// Word matches in content
		for (const word of queryWords) {
			const matches = (contentLower.match(new RegExp(word, 'g')) || []).length;
			score += matches * 5;
		}

		// Bonus for API-like patterns
		if (this.containsApiPatterns(content, queryWords)) {
			score += 30;
		}

		// Penalty for very long sections (less focused)
		if (section.length > 30) {
			score *= 0.8;
		}

		return {
			content: content,
			heading: heading,
			score: Math.round(score),
			type: this.detectContentType(content),
		};
	}

	/**
	 * Detect if content contains API-like patterns
	 */
	private containsApiPatterns(content: string, queryWords: string[]): boolean {
		const apiPatterns = [
			/\b\w+\.\w+\(/, // method calls like window.showMessage(
			/interface\s+\w+/i, // interface definitions
			/class\s+\w+/i, // class definitions
			/enum\s+\w+/i, // enum definitions
			/\bnamespace\s+\w+/i, // namespace definitions
			/\bfunction\s+\w+/i, // function definitions
		];

		return (
			apiPatterns.some((pattern) => pattern.test(content)) &&
			queryWords.some((word) => content.toLowerCase().includes(word))
		);
	}

	/**
	 * Detect the type of content (interface, class, method, etc.)
	 */
	private detectContentType(content: string): string {
		const contentLower = content.toLowerCase();

		if (contentLower.includes('interface ')) {
			return 'interface';
		}
		if (contentLower.includes('class ')) {
			return 'class';
		}
		if (contentLower.includes('enum ')) {
			return 'enum';
		}
		if (contentLower.includes('namespace ')) {
			return 'namespace';
		}
		if (contentLower.includes('function ') || /\w+\s*\(/.test(content)) {
			return 'method';
		}
		if (
			contentLower.includes('property') ||
			contentLower.includes('readonly')
		) {
			return 'property';
		}

		return 'documentation';
	}

	/**
	 * Simple search that finds paragraphs containing the query (fallback)
	 */
	private simpleSearch(markdown: string, query: string): SearchResult[] {
		const queryLower = query.toLowerCase();
		const paragraphs = markdown.split('\n\n');
		const results: SearchResult[] = [];

		for (const paragraph of paragraphs) {
			if (paragraph.toLowerCase().includes(queryLower)) {
				results.push({
					content: paragraph,
					heading: 'Search Result',
					score: 10,
					type: 'documentation',
				});
				if (results.length >= this.MAX_RESULTS) {
					break;
				}
			}
		}

		return results;
	}

	/**
	 * Build enhanced XML output with metadata and scoring
	 */
	private buildEnhancedXmlOutput(
		query: string,
		results: SearchResult[]
	): string {
		const escapedQuery = this.escapeXml(query);
		const resultCount = results.length;
		const timestamp = new Date().toISOString();
		const cacheStatus = VscodeApiTool.cache.get('vscode-api-docs')
			? 'cached'
			: 'fresh';

		let output = `<vscode_api_documentation>
  <query>${escapedQuery}</query>
  <result_count>${resultCount}</result_count>
  <documentation_url>${this.VSCODE_API_URL}</documentation_url>
  <timestamp>${timestamp}</timestamp>
  <cache_status>${cacheStatus}</cache_status>
  <results>
`;

		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			output += `    <result index="${i + 1}" score="${result.score}" type="${result.type}">
      <heading>${this.escapeXml(result.heading)}</heading>
      <content>
${this.escapeXml(result.content)}
      </content>
    </result>
`;
		}

		output += `  </results>
</vscode_api_documentation>`;

		return output;
	}

	/**
	 * Escape XML special characters
	 */
	private escapeXml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;');
	}
}

/**
 * Search result interface
 */
interface SearchResult {
	content: string;
	heading: string;
	score: number;
	type: string;
}
