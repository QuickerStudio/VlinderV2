import { BaseAgentTool } from '../base-agent.tool';
import { FetchWebpageToolParams } from '../schema/fetch-webpage';
import { ToolResponseV2 } from '../types';
import TurndownService from 'turndown';

/**
 * Result of fetching a single URL
 */
interface FetchResult {
	url: string;
	success: boolean;
	content?: string;
	contentType?: string;
	error?: string;
	chunks?: ContentChunk[];
	metadata?: {
		title?: string;
		description?: string;
		keywords?: string;
		author?: string;
	};
}

/**
 * Content chunk with relevance score
 */
interface ContentChunk {
	text: string;
	score: number;
	startIndex: number;
	endIndex: number;
}

/**
 * Cache entry for fetched content
 */
interface CacheEntry {
	content: string;
	contentType: string;
	timestamp: number;
	etag?: string;
	lastModified?: string;
}

/**
 * Rate limiter entry for tracking requests per domain
 */
interface RateLimitEntry {
	lastRequestTime: number;
	requestCount: number;
	windowStart: number;
}

/**
 * Discovered links from a page
 */
interface DiscoveredLinks {
	internal: string[];  // Same domain links
	external: string[];  // Different domain links
	total: number;
}

/**
 * Rate limiter to prevent overwhelming target servers
 * Implements a simple token bucket algorithm per domain
 */
class RateLimiter {
	private limits = new Map<string, RateLimitEntry>();
	private readonly WINDOW_MS = 60000; // 1 minute window
	private readonly MAX_REQUESTS_PER_WINDOW = 30; // Max 30 requests per minute per domain
	private readonly MIN_DELAY_MS = 1000; // Minimum 1 second between requests

	/**
	 * Check if a request to the domain is allowed and wait if necessary
	 */
	async checkAndWait(hostname: string): Promise<void> {
		const now = Date.now();
		let entry = this.limits.get(hostname);

		if (!entry) {
			entry = {
				lastRequestTime: 0,
				requestCount: 0,
				windowStart: now,
			};
			this.limits.set(hostname, entry);
		}

		// Reset window if expired
		if (now - entry.windowStart >= this.WINDOW_MS) {
			entry.requestCount = 0;
			entry.windowStart = now;
		}

		// Check if we've exceeded the rate limit
		if (entry.requestCount >= this.MAX_REQUESTS_PER_WINDOW) {
			const waitTime = this.WINDOW_MS - (now - entry.windowStart);
			if (waitTime > 0) {
				console.log(`[RateLimiter] Rate limit reached for ${hostname}, waiting ${waitTime}ms`);
				await new Promise(resolve => setTimeout(resolve, waitTime));
				// Reset after waiting
				entry.requestCount = 0;
				entry.windowStart = Date.now();
			}
		}

		// Enforce minimum delay between requests
		const timeSinceLastRequest = now - entry.lastRequestTime;
		if (timeSinceLastRequest < this.MIN_DELAY_MS) {
			const delayNeeded = this.MIN_DELAY_MS - timeSinceLastRequest;
			await new Promise(resolve => setTimeout(resolve, delayNeeded));
		}

		// Update entry
		entry.lastRequestTime = Date.now();
		entry.requestCount++;
	}

	/**
	 * Clear rate limit data for a specific domain
	 */
	clear(hostname: string): void {
		this.limits.delete(hostname);
	}

	/**
	 * Clear all rate limit data
	 */
	clearAll(): void {
		this.limits.clear();
	}
}

/**
 * Simple in-memory cache for fetched web pages with LRU eviction
 */
class WebPageCache {
	private cache = new Map<string, CacheEntry>();
	private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
	private readonly MAX_CACHE_SIZE = 100; // Maximum number of cached entries
	private hits = 0;
	private misses = 0;

	/**
	 * Get cached content if available and not expired
	 */
	get(url: string, ttl: number = this.DEFAULT_TTL): CacheEntry | null {
		const entry = this.cache.get(url);
		if (!entry) {
			this.misses++;
			return null;
		}

		const age = Date.now() - entry.timestamp;
		if (age > ttl) {
			this.cache.delete(url);
			this.misses++;
			return null;
		}

		// Move to end for LRU (re-insert)
		this.cache.delete(url);
		this.cache.set(url, entry);
		this.hits++;
		return entry;
	}

	/**
	 * Store content in cache
	 */
	set(
		url: string,
		content: string,
		contentType: string,
		etag?: string,
		lastModified?: string
	): void {
		// Implement LRU eviction if cache is full
		if (this.cache.size >= this.MAX_CACHE_SIZE) {
			// Remove oldest entry (first in Map)
			const firstKey = this.cache.keys().next().value;
			if (firstKey) {
				this.cache.delete(firstKey);
			}
		}

		this.cache.set(url, {
			content,
			contentType,
			timestamp: Date.now(),
			etag,
			lastModified,
		});
	}

	/**
	 * Clear all cached entries
	 */
	clear(): void {
		this.cache.clear();
		this.hits = 0;
		this.misses = 0;
	}

	/**
	 * Get cache statistics
	 */
	getStats(): {
		size: number;
		maxSize: number;
		hits: number;
		misses: number;
		hitRate: number;
	} {
		const total = this.hits + this.misses;
		return {
			size: this.cache.size,
			maxSize: this.MAX_CACHE_SIZE,
			hits: this.hits,
			misses: this.misses,
			hitRate: total > 0 ? this.hits / total : 0,
		};
	}
}

/**
 * Tool for fetching and extracting content from web pages
 *
 * Enhanced implementation that:
 * 1. Supports multiple URLs (up to 10)
 * 2. Fetches web pages using Node's fetch API
 * 3. Converts HTML to Markdown for better readability
 * 4. Filters content based on search query with context
 * 5. Ranks and prioritizes content by relevance
 * 6. Handles various content types (HTML, text, images)
 *
 * Inspired by vscode-copilot-chat's fetchWebPageTool but adapted for our system.
 */
export class FetchWebpageTool extends BaseAgentTool<FetchWebpageToolParams> {
	private readonly MAX_CONTENT_LENGTH = 50000; // 50KB of text content per URL
	private readonly TIMEOUT_MS = 30000; // 30 seconds
	private readonly MAX_URLS = 10; // Maximum URLs to fetch
	private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL
	private readonly MAX_RETRIES = 2; // Maximum number of retries for failed requests
	private readonly RETRY_DELAY_MS = 1000; // Delay between retries

	// Shared cache instance across all tool instances
	private static cache = new WebPageCache();

	// Shared rate limiter instance to prevent overwhelming servers
	private static rateLimiter = new RateLimiter();

	// Private IP ranges to block for security
	private readonly PRIVATE_IP_PATTERNS = [
		/^127\./, // 127.0.0.0/8 - Loopback
		/^10\./, // 10.0.0.0/8 - Private network
		/^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 - Private network
		/^192\.168\./, // 192.168.0.0/16 - Private network
		/^localhost$/i, // localhost
		/^::1$/, // IPv6 localhost
		/^fe80:/i, // IPv6 link-local
		/^fc00:/i, // IPv6 unique local
		/^fd00:/i, // IPv6 unique local
	];

	async execute(): Promise<ToolResponseV2> {
		const { urls, query } = this.params.input;

		// Validate URLs count (should not happen due to schema validation, but double-check)
		if (urls.length === 0) {
			return this.toolResponse(
				'error',
				'No URLs provided. Please provide at least one URL to fetch.'
			);
		}

		if (urls.length > this.MAX_URLS) {
			return this.toolResponse(
				'error',
				`Too many URLs. Maximum ${this.MAX_URLS} URLs allowed, got ${urls.length}.`
			);
		}

		// Log execution start
		const startTime = Date.now();
		this.logger(
			`Fetching ${urls.length} URL(s)${query ? ` with query: "${query}"` : ''}`
		);

		try {
			// Fetch all URLs in parallel with error isolation
			const results = await Promise.all(
				urls.map((url, index) =>
					this.fetchSingleUrl(url, index, query).catch((error) => ({
						url,
						success: false,
						error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
					}))
				)
			);

			// Separate successful and failed results
			const successfulResults = results.filter((r) => r.success);
			const failedResults = results.filter((r) => !r.success);

			// Log execution summary
			const duration = Date.now() - startTime;
			const cacheStats = FetchWebpageTool.cache.getStats();
			this.logger(
				`Completed in ${duration}ms: ${successfulResults.length} succeeded, ${failedResults.length} failed | Cache: ${cacheStats.hits}/${cacheStats.hits + cacheStats.misses} hits (${(cacheStats.hitRate * 100).toFixed(1)}%)`
			);

			// Build combined response
			return this.buildCombinedResponse(successfulResults, failedResults, query);
		} catch (error) {
			// This should rarely happen due to error isolation above
			this.logger(
				`Fatal error during execution: ${error instanceof Error ? error.message : String(error)}`,
				'error'
			);
			return this.toolResponse(
				'error',
				`Failed to fetch URLs: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Check if a hostname is a private IP address
	 */
	private isPrivateIP(hostname: string): boolean {
		return this.PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname));
	}

	/**
	 * Check robots.txt compliance (basic implementation)
	 * In a production system, this should cache robots.txt and parse it properly
	 */
	private async checkRobotsTxt(parsedUrl: URL): Promise<{
		allowed: boolean;
		reason?: string;
	}> {
		try {
			const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}/robots.txt`;
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for robots.txt

			const response = await fetch(robotsUrl, {
				signal: controller.signal,
				headers: {
					'User-Agent': 'Mozilla/5.0 (compatible; VlinderBot/1.0; +https://vlinder.ai/bot)',
				},
			});

			clearTimeout(timeoutId);

			if (response.ok) {
				const robotsTxt = await response.text();

				// Simple check for "Disallow: /" which means no crawling allowed
				// A full implementation would use a proper robots.txt parser
				const lines = robotsTxt.split('\n');
				let isRelevantSection = false;

				for (const line of lines) {
					const trimmed = line.trim().toLowerCase();

					// Check if this section applies to us
					if (trimmed.startsWith('user-agent:')) {
						const agent = trimmed.substring('user-agent:'.length).trim();
						isRelevantSection = agent === '*' || agent.includes('vlinder');
					}

					// If in relevant section, check for disallow rules
					if (isRelevantSection && trimmed.startsWith('disallow:')) {
						const path = trimmed.substring('disallow:'.length).trim();
						if (path === '/' || (path && parsedUrl.pathname.startsWith(path))) {
							return {
								allowed: false,
								reason: `Disallowed by robots.txt: ${path}`,
							};
						}
					}
				}
			}

			// If no robots.txt or no explicit disallow, allow crawling
			return { allowed: true };
		} catch (error) {
			// If we can't fetch robots.txt, assume crawling is allowed
			// (but log the issue)
			this.logger(`Could not fetch robots.txt for ${parsedUrl.hostname}: ${error}`, 'debug');
			return { allowed: true };
		}
	}

	/**
	 * Validate URL for security concerns
	 * Prevents SSRF attacks and access to private resources
	 */
	private validateUrlSecurity(parsedUrl: URL): {
		valid: boolean;
		error?: string;
	} {
		// Check protocol - only HTTP and HTTPS allowed
		if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
			return {
				valid: false,
				error: `Unsupported protocol: ${parsedUrl.protocol}. Only HTTP and HTTPS are supported.`,
			};
		}

		// Check for private IP addresses (SSRF protection)
		if (this.isPrivateIP(parsedUrl.hostname)) {
			return {
				valid: false,
				error: `Access to private IP addresses is not allowed: ${parsedUrl.hostname}`,
			};
		}

		// Additional security checks
		const hostname = parsedUrl.hostname.toLowerCase();

		// Block common internal hostnames
		const blockedHostnames = [
			'metadata.google.internal',
			'169.254.169.254', // AWS metadata
			'metadata', // Generic metadata
		];

		if (blockedHostnames.includes(hostname)) {
			return {
				valid: false,
				error: `Access to internal metadata services is not allowed: ${hostname}`,
			};
		}

		return { valid: true };
	}

	/**
	 * Sleep for a specified duration
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Fetch a single URL with retry logic and rate limiting
	 */
	private async fetchWithRetry(url: string, attempt: number = 0): Promise<Response> {
		// Apply rate limiting before making the request
		await FetchWebpageTool.rateLimiter.checkAndWait(url);

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

		try {
			const response = await fetch(url, {
				signal: controller.signal,
				redirect: 'follow',
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					Accept:
						'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
					'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
					'Accept-Encoding': 'gzip, deflate, br',
					'Cache-Control': 'no-cache',
					'Pragma': 'no-cache',
					'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120"',
					'Sec-Ch-Ua-Mobile': '?0',
					'Sec-Ch-Ua-Platform': '"Windows"',
					'Sec-Fetch-Dest': 'document',
					'Sec-Fetch-Mode': 'navigate',
					'Sec-Fetch-Site': 'none',
					'Sec-Fetch-User': '?1',
					'Upgrade-Insecure-Requests': '1',
				},
			});

			clearTimeout(timeoutId);
			return response;
		} catch (error) {
			clearTimeout(timeoutId);

			// Retry on network errors if we haven't exceeded max retries
			if (attempt < this.MAX_RETRIES) {
				const isRetryable = error instanceof Error && (
					error.name === 'AbortError' ||
					error.message.includes('ETIMEDOUT') ||
					error.message.includes('ECONNRESET') ||
					error.message.includes('fetch failed')
				);

				if (isRetryable) {
					this.logger(`Retry ${attempt + 1}/${this.MAX_RETRIES} for ${url} after ${this.RETRY_DELAY_MS}ms`, 'warn');
					await this.sleep(this.RETRY_DELAY_MS * (attempt + 1)); // Exponential backoff
					return this.fetchWithRetry(url, attempt + 1);
				}
			}

			throw error;
		}
	}

	/**
	 * Fetch a single URL and extract content
	 */
	private async fetchSingleUrl(
		url: string,
		_index: number,
		query?: string
	): Promise<FetchResult> {
		try {
			// Validate URL
			let parsedUrl: URL;
			try {
				parsedUrl = new URL(url);
			} catch (error) {
				return {
					url,
					success: false,
					error: `Invalid URL: ${url}`,
				};
			}

			// Security validation
			const securityCheck = this.validateUrlSecurity(parsedUrl);
			if (!securityCheck.valid) {
				return {
					url,
					success: false,
					error: securityCheck.error!,
				};
			}

			// Check robots.txt compliance (respecting website rules)
			const robotsCheck = await this.checkRobotsTxt(parsedUrl);
			if (!robotsCheck.allowed) {
				this.logger(`Blocked by robots.txt: ${url}`, 'warn');
				return {
					url,
					success: false,
					error: `Access denied: ${robotsCheck.reason}. Please respect the website's robots.txt rules.`,
				};
			}

			// Check cache first
			const cached = FetchWebpageTool.cache.get(url, this.CACHE_TTL);
			if (cached) {
				this.logger(`Using cached content for ${url}`);
				return this.processTextContent(
					url,
					cached.content,
					cached.contentType,
					query
				);
			}

			// Apply rate limiting to avoid overwhelming the server
			await FetchWebpageTool.rateLimiter.checkAndWait(parsedUrl.hostname);

			// Fetch the web page with retry logic
			this.logger(`Fetching ${url}...`);

			let response: Response;
			try {
				response = await this.fetchWithRetry(url);
			} catch (error) {
				// Handle specific error types
				if (error instanceof Error) {
					if (error.name === 'AbortError') {
						return {
							url,
							success: false,
							error: `Request timed out after ${this.TIMEOUT_MS / 1000} seconds (tried ${this.MAX_RETRIES + 1} times)`,
						};
					}

					// Network errors
					if (error.message.includes('ENOTFOUND')) {
						return {
							url,
							success: false,
							error: `DNS lookup failed - domain not found`,
						};
					}

					if (error.message.includes('ECONNREFUSED')) {
						return {
							url,
							success: false,
							error: `Connection refused - server is not responding`,
						};
					}

					if (error.message.includes('ETIMEDOUT')) {
						return {
							url,
							success: false,
							error: `Connection timed out (tried ${this.MAX_RETRIES + 1} times)`,
						};
					}

					// SSL/TLS errors
					if (error.message.includes('CERT') || error.message.includes('certificate')) {
						return {
							url,
							success: false,
							error: `SSL certificate error - unable to verify certificate`,
						};
					}

					// Fetch API errors
					if (error.message.includes('fetch failed')) {
						return {
							url,
							success: false,
							error: `Network request failed - server may be blocking requests or unreachable (tried ${this.MAX_RETRIES + 1} times)`,
						};
					}
				}

				return {
					url,
					success: false,
					error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
				};
			}

			if (!response.ok) {
				return {
					url,
					success: false,
					error: `HTTP ${response.status}: ${response.statusText}`,
				};
			}

			// Get content type
			const contentType = response.headers.get('content-type') || '';
			const etag = response.headers.get('etag') || undefined;
			const lastModified = response.headers.get('last-modified') || undefined;

			// Check if it's HTML
			if (
				!contentType.includes('text/html') &&
				!contentType.includes('application/xhtml')
			) {
				// For non-HTML content, try to get text
				if (contentType.includes('text/')) {
					const text = await response.text();
					// Cache the raw content
					FetchWebpageTool.cache.set(
						url,
						text,
						contentType,
						etag,
						lastModified
					);
					return this.processTextContent(url, text, contentType, query);
				}
				return {
					url,
					success: false,
					error: `Unsupported content type: ${contentType}. Only HTML and text content are supported.`,
				};
			}

			// Parse HTML and extract text + metadata
			const html = await response.text();
			const extractedText = this.extractTextFromHtml(html);
			const metadata = this.extractMetadata(html);

			// Cache the extracted text
			FetchWebpageTool.cache.set(
				url,
				extractedText,
				contentType,
				etag,
				lastModified
			);

			const result = this.processTextContent(url, extractedText, contentType, query);
			result.metadata = metadata;
			return result;
		} catch (error) {
			this.logger(`Error fetching webpage ${url}: ${error}`, 'error');
			return {
				url,
				success: false,
				error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * Process text content and create chunks with relevance scores
	 */
	private processTextContent(
		url: string,
		content: string,
		contentType: string,
		query?: string
	): FetchResult {
		// If query is provided, create chunks with relevance scores FIRST
		let chunks: ContentChunk[] | undefined;
		if (query && query.trim().length > 0) {
			chunks = this.createRelevantChunks(content, query);

			// If we have chunks, use them to create a focused summary
			if (chunks.length > 0) {
				const topChunks = chunks.slice(0, 5); // Top 5 most relevant chunks
				const focusedContent = topChunks.map(c => c.text).join('\n\n---\n\n');

				// Only truncate if still too long
				if (focusedContent.length <= this.MAX_CONTENT_LENGTH) {
					return {
						url,
						success: true,
						content: focusedContent,
						contentType,
						chunks,
					};
				}
			}
		}

		// Truncate if too long (smart truncation at paragraph boundaries)
		let processedContent = content;
		if (processedContent.length > this.MAX_CONTENT_LENGTH) {
			// Try to truncate at paragraph boundary
			const truncated = processedContent.substring(0, this.MAX_CONTENT_LENGTH);
			const lastParagraph = truncated.lastIndexOf('\n\n');

			if (lastParagraph > this.MAX_CONTENT_LENGTH * 0.8) {
				// If we can find a paragraph break in the last 20%, use it
				processedContent = truncated.substring(0, lastParagraph) + '\n\n[Content truncated...]';
			} else {
				// Otherwise just truncate at the limit
				processedContent = truncated + '\n\n[Content truncated...]';
			}

			this.logger(
				`Content from ${url} truncated to ${processedContent.length} characters`,
				'warn'
			);
		}

		return {
			url,
			success: true,
			content: processedContent,
			contentType,
			chunks,
		};
	}

	/**
	 * Calculate TF-IDF score for a term in a document
	 * TF (Term Frequency): How often a term appears in a document
	 * IDF (Inverse Document Frequency): How rare a term is across all documents
	 */
	private calculateTfIdf(
		term: string,
		document: string,
		allDocuments: string[]
	): number {
		const termLower = term.toLowerCase();
		const docLower = document.toLowerCase();

		// Calculate TF (Term Frequency)
		const termCount = (docLower.match(new RegExp(termLower, 'g')) || []).length;
		const totalWords = docLower.split(/\s+/).length;
		const tf = totalWords > 0 ? termCount / totalWords : 0;

		// Calculate IDF (Inverse Document Frequency)
		const docsWithTerm = allDocuments.filter((doc) =>
			doc.toLowerCase().includes(termLower)
		).length;
		const idf =
			docsWithTerm > 0 ? Math.log(allDocuments.length / docsWithTerm) : 0;

		return tf * idf;
	}

	/**
	 * Create content chunks with relevance scores based on query using TF-IDF
	 */
	private createRelevantChunks(content: string, query: string): ContentChunk[] {
		const queryTerms = query
			.toLowerCase()
			.split(/\s+/)
			.filter((t) => t.length > 0);
		const lines = content.split('\n');
		const chunks: ContentChunk[] = [];

		// Context window: lines before and after a match
		const contextLines = 3;

		// First pass: find all matching lines
		const matchingLines: number[] = [];
		for (let i = 0; i < lines.length; i++) {
			const lineLower = lines[i].toLowerCase();
			if (queryTerms.some((term) => lineLower.includes(term))) {
				matchingLines.push(i);
			}
		}

		// Second pass: create chunks with TF-IDF scoring
		for (const i of matchingLines) {
			// Calculate chunk boundaries
			const startLine = Math.max(0, i - contextLines);
			const endLine = Math.min(lines.length - 1, i + contextLines);

			// Extract chunk text
			const chunkLines = lines.slice(startLine, endLine + 1);
			const chunkText = chunkLines.join('\n');

			// Calculate TF-IDF score for each query term
			let tfidfScore = 0;
			for (const term of queryTerms) {
				tfidfScore += this.calculateTfIdf(term, chunkText, lines);
			}

			// Add bonus for exact phrase match
			if (chunkText.toLowerCase().includes(query.toLowerCase())) {
				tfidfScore *= 2;
			}

			// Add bonus for position (earlier content is often more relevant)
			const positionBonus = 1 - i / lines.length;
			tfidfScore += positionBonus * 0.5;

			// Calculate character positions
			const startIndex = lines.slice(0, startLine).join('\n').length;
			const endIndex = startIndex + chunkText.length;

			chunks.push({
				text: chunkText,
				score: tfidfScore,
				startIndex,
				endIndex,
			});
		}

		// Sort by score descending
		chunks.sort((a, b) => b.score - a.score);

		// Remove overlapping chunks (keep higher scored ones)
		const nonOverlappingChunks: ContentChunk[] = [];
		for (const chunk of chunks) {
			const overlaps = nonOverlappingChunks.some(
				(existing) =>
					(chunk.startIndex >= existing.startIndex &&
						chunk.startIndex <= existing.endIndex) ||
					(chunk.endIndex >= existing.startIndex &&
						chunk.endIndex <= existing.endIndex)
			);
			if (!overlaps) {
				nonOverlappingChunks.push(chunk);
			}
		}

		return nonOverlappingChunks;
	}

	/**
	 * Build combined response from all fetch results
	 */
	private buildCombinedResponse(
		successfulResults: FetchResult[],
		failedResults: FetchResult[],
		query?: string
	): ToolResponseV2 {
		if (successfulResults.length === 0) {
			// All failed
			const errorMessages = failedResults
				.map((r) => `- ${r.url}: ${r.error}`)
				.join('\n');
			return this.toolResponse(
				'error',
				`Failed to fetch all URLs:\n${errorMessages}`
			);
		}

		// Build XML output
		const xmlParts: string[] = ['<webpage_results>'];

		if (query) {
			xmlParts.push(`  <query>${this.escapeXml(query)}</query>`);
		}

		xmlParts.push(
			`  <total_urls>${successfulResults.length + failedResults.length}</total_urls>`
		);
		xmlParts.push(`  <successful>${successfulResults.length}</successful>`);
		xmlParts.push(`  <failed>${failedResults.length}</failed>`);

		// Add successful results
		if (successfulResults.length > 0) {
			xmlParts.push('  <pages>');
			for (const result of successfulResults) {
				xmlParts.push(this.formatSingleResult(result, query));
			}
			xmlParts.push('  </pages>');
		}

		// Add failed results
		if (failedResults.length > 0) {
			xmlParts.push('  <errors>');
			for (const result of failedResults) {
				xmlParts.push(`    <error>`);
				xmlParts.push(`      <url>${this.escapeXml(result.url)}</url>`);
				xmlParts.push(
					`      <message>${this.escapeXml(result.error || 'Unknown error')}</message>`
				);
				xmlParts.push(`    </error>`);
			}
			xmlParts.push('  </errors>');
		}

		xmlParts.push('</webpage_results>');

		const xmlOutput = xmlParts.join('\n');
		this.logger(
			`Successfully fetched ${successfulResults.length}/${successfulResults.length + failedResults.length} URLs`
		);

		return this.toolResponse('success', xmlOutput);
	}

	/**
	 * Format a single fetch result
	 */
	private formatSingleResult(result: FetchResult, _query?: string): string {
		const parts: string[] = [];
		parts.push(`    <page>`);
		parts.push(`      <url>${this.escapeXml(result.url)}</url>`);

		// Add metadata if available
		if (result.metadata) {
			parts.push(`      <metadata>`);
			if (result.metadata.title) {
				parts.push(`        <title>${this.escapeXml(result.metadata.title)}</title>`);
			}
			if (result.metadata.description) {
				parts.push(`        <description>${this.escapeXml(result.metadata.description)}</description>`);
			}
			if (result.metadata.keywords) {
				parts.push(`        <keywords>${this.escapeXml(result.metadata.keywords)}</keywords>`);
			}
			if (result.metadata.author) {
				parts.push(`        <author>${this.escapeXml(result.metadata.author)}</author>`);
			}
			parts.push(`      </metadata>`);
		}

		if (result.chunks && result.chunks.length > 0) {
			// Use chunks if available (query-based filtering)
			parts.push(`      <relevant_sections count="${result.chunks.length}">`);
			for (const chunk of result.chunks.slice(0, 10)) {
				// Limit to top 10 chunks
				parts.push(`        <section score="${chunk.score}">`);
				parts.push(`${this.escapeXml(chunk.text)}`);
				parts.push(`        </section>`);
			}
			parts.push(`      </relevant_sections>`);
		} else if (result.content) {
			// Use full content if no chunks
			let content = result.content;

			// Smart content enhancement: If content is too short but we have a good description,
			// use description as supplementary content (common for JS-heavy sites like Baidu Baike)
			if (content.trim().length < 500 && result.metadata?.description && result.metadata.description.length > 100) {
				this.logger(`Content too short (${content.length} chars), enhancing with metadata description`, 'info');
				content = `# ${result.metadata.title || 'Page Content'}\n\n${result.metadata.description}\n\n---\n\n${content}`;
			}

			if (content.length > this.MAX_CONTENT_LENGTH) {
				content =
					content.substring(0, this.MAX_CONTENT_LENGTH) +
					'\n\n[Content truncated...]';
			}
			parts.push(`      <content>`);
			parts.push(`${this.escapeXml(content)}`);
			parts.push(`      </content>`);
		}

		parts.push(`    </page>`);
		return parts.join('\n');
	}

	/**
	 * Extract structured metadata from HTML
	 */
	private extractMetadata(html: string): {
		title?: string;
		description?: string;
		keywords?: string;
		author?: string;
	} {
		const metadata: {
			title?: string;
			description?: string;
			keywords?: string;
			author?: string;
		} = {};

		// Extract title (try multiple sources)
		const titleMatch =
			html.match(/<title[^>]*>(.*?)<\/title>/i) ||
			html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i) ||
			html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']*)["']/i);

		if (titleMatch) {
			metadata.title = this.decodeHtmlEntities(titleMatch[1]).trim();
		}

		// Extract meta description (try multiple sources)
		const descMatch =
			html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
			html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i) ||
			html.match(/<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']*)["']/i);

		if (descMatch) {
			metadata.description = this.decodeHtmlEntities(descMatch[1]).trim();
		}

		// Extract meta keywords
		const keywordsMatch = html.match(
			/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["']/i
		);
		if (keywordsMatch) {
			metadata.keywords = this.decodeHtmlEntities(keywordsMatch[1]).trim();
		}

		// Extract author (try multiple sources)
		const authorMatch =
			html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']*)["']/i) ||
			html.match(/<meta[^>]*property=["']article:author["'][^>]*content=["']([^"']*)["']/i);

		if (authorMatch) {
			metadata.author = this.decodeHtmlEntities(authorMatch[1]).trim();
		}

		return metadata;
	}

	/**
	 * Decode HTML entities
	 */
	private decodeHtmlEntities(text: string): string {
		return text
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&amp;/g, '&')
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&apos;/g, "'")
			.replace(/&nbsp;/g, ' ')
			.replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(dec))
			.replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCharCode(parseInt(hex, 16)));
	}

	/**
	 * Calculate content quality score (0-100)
	 * Higher score = more likely to be main content
	 */
	private calculateContentQuality(text: string): number {
		let score = 0;

		// Length score (longer paragraphs are better)
		const wordCount = text.split(/\s+/).length;
		if (wordCount > 100) {
			score += 40;
		} else if (wordCount > 50) {
			score += 30;
		} else if (wordCount > 20) {
			score += 15;
		} else if (wordCount > 10) {
			score += 5;
		}

		// Sentence structure (periods indicate complete sentences)
		const sentenceCount = (text.match(/[.!?。！？]+/g) || []).length;
		if (sentenceCount > 5) {
			score += 25;
		} else if (sentenceCount > 3) {
			score += 20;
		} else if (sentenceCount > 1) {
			score += 10;
		}

		// Code blocks (valuable for technical content)
		if (text.includes('```')) {
			score += 20;
		} else if (text.includes('`')) {
			score += 10;
		}

		// Headings (structured content)
		const headingMatches = text.match(/^#{1,6}\s/gm);
		if (headingMatches) {
			if (headingMatches.length === 1) {
				score += 15; // Single heading = likely section title
			} else if (headingMatches.length <= 3) {
				score += 10;
			}
		}

		// Avoid navigation-like content
		const bulletMatches = text.match(/^[•\-\*]\s/gm);
		if (bulletMatches) {
			const bulletRatio = bulletMatches.length / text.split('\n').length;
			if (bulletRatio > 0.8) {
				score -= 40; // Mostly bullets = navigation
			} else if (bulletRatio > 0.5) {
				score -= 20;
			}
		}

		// Short lines with no punctuation = likely menu/navigation
		const lines = text.split('\n');
		const shortLines = lines.filter(l => l.length < 30 && !l.match(/[.!?。！？]/));
		if (shortLines.length > lines.length * 0.7) {
			score -= 30;
		}

		// Penalize repetitive content
		const uniqueLines = new Set(lines);
		if (uniqueLines.size < lines.length * 0.5) {
			score -= 20;
		}

		// Bonus for technical keywords (for Agent use cases)
		const technicalKeywords = /\b(function|class|method|API|documentation|example|tutorial|guide|install|usage|parameter|return|type|interface|component|async|await|promise|callback|event|handler|service|controller|model|view|router|middleware|database|query|schema|validation|authentication|authorization)\b/gi;
		const techMatches = text.match(technicalKeywords);
		if (techMatches && techMatches.length > 3) {
			score += 15;
		}

		// Penalize common non-content patterns
		const nonContentPatterns = [
			/\b(cookie|privacy policy|terms of service|subscribe|newsletter|follow us|share|tweet|like|comment)\b/gi,
			/\b(copyright|all rights reserved|©|®|™)\b/gi,
		];

		for (const pattern of nonContentPatterns) {
			const matches = text.match(pattern);
			if (matches && matches.length > 2) {
				score -= 10;
			}
		}

		return Math.max(0, Math.min(100, score));
	}

	/**
	 * Extract readable text content from HTML by converting to Markdown
	 */
	private extractTextFromHtml(html: string): string {
		try {
			// Remove script, style, and other non-content elements FIRST
			let cleanedHtml = html
				.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
				.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
				.replace(
					/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi,
					''
				)
				.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
				.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
				// Remove comments
				.replace(/<!--[\s\S]*?-->/g, '')
				// Remove JSON-LD and other script data
				.replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');

			// Try to extract main content with multiple strategies (ordered by specificity)
			const mainMatch =
				cleanedHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
				cleanedHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
				cleanedHtml.match(/<div[^>]*role=["']main["'][^>]*>([\s\S]*?)<\/div>/i) ||
				cleanedHtml.match(/<div[^>]*id=["']content["'][^>]*>([\s\S]*?)<\/div>/i) ||
				cleanedHtml.match(/<div[^>]*class=["'][^"']*\bcontent\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
				cleanedHtml.match(/<div[^>]*id=["']main["'][^>]*>([\s\S]*?)<\/div>/i) ||
				cleanedHtml.match(/<div[^>]*class=["'][^"']*\bmain\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
				// Additional patterns for complex sites
				cleanedHtml.match(/<div[^>]*class=["'][^"']*\bwrapper\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
				cleanedHtml.match(/<div[^>]*class=["'][^"']*\bcontainer\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
				cleanedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

			if (mainMatch) {
				cleanedHtml = mainMatch[1];
			}

			// Remove common non-content elements from the extracted content
			cleanedHtml = cleanedHtml
				.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
				.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
				.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
				.replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')
				// Remove elements with common non-content classes/ids
				.replace(/<div[^>]*class=["'][^"']*\b(nav|menu|sidebar|ad|advertisement|banner|cookie|popup|modal)\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '')
				.replace(/<div[^>]*id=["'][^"']*\b(nav|menu|sidebar|ad|advertisement|banner|cookie|popup|modal)\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');

			// Convert HTML to Markdown using turndown
			const turndownService = new TurndownService({
				headingStyle: 'atx',
				codeBlockStyle: 'fenced',
				emDelimiter: '*',
				bulletListMarker: '-',
				hr: '---',
			});

			// Remove navigation, footer, and other non-content elements
			turndownService.remove([
				'nav',
				'footer',
				'header',
				'aside',
				'script',
				'style',
				'noscript',
				'iframe',
			]);

			// Custom rule: Remove images but keep alt text if meaningful
			turndownService.addRule('removeImages', {
				filter: 'img',
				replacement: (_content: string, node: any) => {
					const alt = node.getAttribute('alt');
					// Keep alt text if it's meaningful (longer than 10 chars and not just filename)
					if (alt && alt.length > 10 && !alt.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
						return `[Image: ${alt}]`;
					}
					return '';
				},
			});

			// Custom rule: Simplify links - keep text and URL for important links
			turndownService.addRule('simplifyLinks', {
				filter: 'a',
				replacement: (content: string, node: any) => {
					const href = node.getAttribute('href');
					// Keep link if it's external or looks like documentation
					if (href && (href.startsWith('http') || href.includes('doc') || href.includes('api'))) {
						return content ? `${content} (${href})` : href;
					}
					return content || '';
				},
			});

			// Custom rule: Preserve code blocks better
			turndownService.addRule('preserveCode', {
				filter: ['pre', 'code'],
				replacement: (content: string, node: any) => {
					const isBlock = node.nodeName === 'PRE';
					if (isBlock) {
						const codeNode = node.querySelector('code');
						const language = codeNode?.getAttribute('class')?.match(/language-(\w+)/)?.[1] || '';
						return `\n\`\`\`${language}\n${content}\n\`\`\`\n`;
					}
					return `\`${content}\``;
				},
			});

			const markdown = turndownService.turndown(cleanedHtml);

			// Split into paragraphs
			const paragraphs = markdown
				.split(/\n{2,}/)
				.map((p) => p.trim())
				.filter((p) => p.length > 0);

			// Score each paragraph
			const scoredParagraphs = paragraphs.map((p) => ({
				text: p,
				score: this.calculateContentQuality(p),
			}));

			// Only filter out obviously low-quality content (navigation, menus)
			// Keep anything with score >= 0 (negative scores are filtered)
			const qualityContent = scoredParagraphs
				.filter((p) => p.score >= 0)
				.map((p) => p.text)
				.join('\n\n');

			// Clean up and format
			const cleaned = qualityContent
				.split('\n')
				.map((line) => line.trim())
				.filter((line) => line.length > 0)
				.join('\n')
				.replace(/\n{3,}/g, '\n\n')
				.replace(/\*\s+/g, '• ')
				.trim();

			// If result is too short, fall back to original markdown
			if (cleaned.length < 100 && markdown.length > 200) {
				this.logger(`Quality filtering removed too much content (${cleaned.length} < 100), using original`, 'debug');
				return markdown
					.split('\n')
					.map((line) => line.trim())
					.filter((line) => line.length > 0)
					.join('\n')
					.replace(/\n{3,}/g, '\n\n')
					.replace(/\*\s+/g, '• ')
					.trim();
			}

			return cleaned;
		} catch (error) {
			this.logger(`Error parsing HTML: ${error}`, 'error');
			// Fallback: strip all HTML tags
			return html
				.replace(/<[^>]*>/g, ' ')
				.replace(/\s+/g, ' ')
				.trim();
		}
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

	/**
	 * Extract all links from HTML content
	 * Useful for discovering new pages to crawl
	 *
	 * NOTE: This method is currently not used but kept for future enhancements
	 * such as recursive crawling or sitemap generation.
	 *
	 * @param html - HTML content to extract links from
	 * @param baseUrl - Base URL for resolving relative links
	 * @returns Object containing internal and external links
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	private extractLinks(html: string, baseUrl: string): DiscoveredLinks {
		const links: DiscoveredLinks = {
			internal: [],
			external: [],
			total: 0,
		};

		try {
			const parsedBase = new URL(baseUrl);
			const baseDomain = parsedBase.hostname;

			// Extract all <a href="..."> links
			const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
			let match: RegExpExecArray | null;

			const seenUrls = new Set<string>();

			while ((match = linkRegex.exec(html)) !== null) {
				try {
					const href = match[1];

					// Skip anchors, javascript:, mailto:, tel:, etc.
					if (href.startsWith('#') ||
						href.startsWith('javascript:') ||
						href.startsWith('mailto:') ||
						href.startsWith('tel:')) {
						continue;
					}

					// Resolve relative URLs
					const absoluteUrl = new URL(href, baseUrl).href;

					// Deduplicate
					if (seenUrls.has(absoluteUrl)) {
						continue;
					}
					seenUrls.add(absoluteUrl);

					// Categorize as internal or external
					const linkDomain = new URL(absoluteUrl).hostname;
					if (linkDomain === baseDomain) {
						links.internal.push(absoluteUrl);
					} else {
						links.external.push(absoluteUrl);
					}

					links.total++;
				} catch (error) {
					// Invalid URL, skip
					continue;
				}
			}

			this.logger(`Discovered ${links.internal.length} internal and ${links.external.length} external links from ${baseUrl}`, 'debug');
		} catch (error) {
			this.logger(`Error extracting links: ${error}`, 'error');
		}

		return links;
	}


}
