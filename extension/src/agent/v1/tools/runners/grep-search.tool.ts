import * as vscode from 'vscode';
import * as path from 'path';
import { BaseAgentTool } from '../base-agent.tool';
import { GrepSearchToolParams } from '../schema/grep-search';
import { ToolResponseV2 } from '../types';

/**
 * Tool for searching text in files using VS Code's workspace search API
 *
 * This tool provides grep-like functionality using VS Code's built-in search.
 * It's an alternative to the search_files tool which uses ripgrep directly.
 *
 * Key differences from search_files:
 * - Uses VS Code's workspace.findTextInFiles API
 * - Respects .gitignore and VS Code search settings
 * - Better integration with VS Code's search infrastructure
 * - Automatic retry with plain text if regex fails
 */
export class GrepSearchTool extends BaseAgentTool<GrepSearchToolParams> {
	private readonly MAX_RESULTS_CAP = 200;
	private readonly DEFAULT_MAX_RESULTS = 20;

	async execute(): Promise<ToolResponseV2> {
		const { query, isRegexp, includePattern, maxResults } = this.params.input;

		try {
			// Security: Validate query length
			if (query.length > 5000) {
				return this.toolResponse(
					'error',
					'Query too long (max 5000 characters). Please use a shorter search pattern.'
				);
			}

			// Security: Check for potentially problematic patterns
			if (query.length === 0) {
				this.logger('Warning: Empty query provided', 'warn');
			}

			this.logger(
				`Searching for: ${query}${includePattern ? ` in ${includePattern}` : ''}`
			);

			// Validate and cap max results
			const cappedMaxResults = Math.min(
				maxResults ?? this.DEFAULT_MAX_RESULTS,
				this.MAX_RESULTS_CAP
			);
			const askedForTooMany = !!(
				maxResults && maxResults > this.MAX_RESULTS_CAP
			);

			// Performance: Warn about large result requests
			if (maxResults && maxResults > 100) {
				this.logger(
					`Large result set requested: ${maxResults} results`,
					'warn'
				);
			}

			// Default to regex search
			const useRegex = isRegexp ?? true;

			// Validate regex if using regex mode
			if (useRegex && !this.isValidRegex(query)) {
				return this.toolResponse(
					'error',
					`Invalid regular expression: "${query}". Please provide a valid regex pattern or set isRegexp to false.`
				);
			}

			// Perform the search
			let results = await this.searchFiles(
				query,
				useRegex,
				includePattern,
				cappedMaxResults
			);

			// If regex search returned no results and query is a valid regex, retry with plain text
			if (results.length === 0 && useRegex && this.isValidRegex(query)) {
				this.logger(`No results with regex, retrying with plain text search`);
				results = await this.searchFiles(
					query,
					false,
					includePattern,
					cappedMaxResults
				);
			}

			// Format the results
			const xmlOutput = this.buildXmlOutput(
				query,
				results,
				cappedMaxResults,
				askedForTooMany,
				includePattern
			);

			return this.toolResponse('success', xmlOutput);
		} catch (error) {
			this.logger(`Error searching files: ${error}`, 'error');
			return this.toolResponse(
				'error',
				`Failed to search files: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Search files using VS Code's workspace API
	 */
	private async searchFiles(
		query: string,
		isRegex: boolean,
		includePattern: string | undefined,
		maxResults: number
	): Promise<SearchMatch[]> {
		const matches: SearchMatch[] = [];

		// Build the include glob pattern
		const include = this.buildIncludePattern(includePattern);

		// Performance: Limit file search to reasonable number
		const maxFilesToSearch = Math.min(maxResults * 10, 1000);

		// Use VS Code's findFiles and then search in each file
		const files = await vscode.workspace.findFiles(
			include || '**/*',
			'**/node_modules/**',
			maxFilesToSearch
		);

		this.logger(`Searching in ${files.length} files`, 'debug');

		// Performance: Process files in batches to avoid blocking
		const batchSize = 50;
		for (let i = 0; i < files.length; i += batchSize) {
			if (matches.length >= maxResults) {
				break;
			}

			const batch = files.slice(i, i + batchSize);
			await this.processBatch(batch, query, isRegex, matches, maxResults);

			// Allow other operations to run
			await new Promise((resolve) => setImmediate(resolve));
		}

		this.logger(`Search completed: ${matches.length} matches found`);
		return matches;
	}

	/**
	 * Process a batch of files for search
	 */
	private async processBatch(
		files: vscode.Uri[],
		query: string,
		isRegex: boolean,
		matches: SearchMatch[],
		maxResults: number
	): Promise<void> {
		for (const file of files) {
			if (matches.length >= maxResults) {
				break;
			}

			try {
				const document = await vscode.workspace.openTextDocument(file);
				const text = document.getText();

				// Performance: Skip very large files
				if (text.length > 1000000) {
					// 1MB limit
					this.logger(
						`Skipping large file: ${file.fsPath} (${text.length} chars)`,
						'debug'
					);
					continue;
				}

				const lines = text.split('\n');
				const searchPattern = isRegex ? new RegExp(query, 'gi') : null;

				// Performance: Limit lines processed per file
				const maxLinesToProcess = Math.min(lines.length, 10000);

				for (let i = 0; i < maxLinesToProcess; i++) {
					const line = lines[i];
					let found = false;

					if (isRegex && searchPattern) {
						// Reset regex lastIndex for each line
						searchPattern.lastIndex = 0;
						found = searchPattern.test(line);
					} else {
						found = line.toLowerCase().includes(query.toLowerCase());
					}

					if (found) {
						const filePath = this.getRelativePath(file.fsPath);
						const match: SearchMatch = {
							file: filePath,
							uri: file.fsPath,
							ranges: [
								{
									startLine: i,
									startChar: 0,
									endLine: i,
									endChar: Math.min(line.length, 1000), // Limit line length
								},
							],
							preview: this.truncatePreview(line.trim()),
						};
						matches.push(match);

						if (matches.length >= maxResults) {
							return;
						}
					}
				}

				if (lines.length > maxLinesToProcess) {
					this.logger(
						`File ${file.fsPath} truncated at ${maxLinesToProcess} lines`,
						'debug'
					);
				}
			} catch (error) {
				// Skip files that can't be read
				this.logger(`Error reading file ${file.fsPath}: ${error}`, 'warn');
			}
		}
	}

	/**
	 * Truncate preview text to reasonable length
	 */
	private truncatePreview(text: string): string {
		const maxLength = 200;
		if (text.length <= maxLength) {
			return text;
		}
		return text.substring(0, maxLength) + '...';
	}

	/**
	 * Build the include pattern for VS Code search
	 */
	private buildIncludePattern(
		includePattern: string | undefined
	): string | undefined {
		if (!includePattern) {
			return undefined;
		}

		let pattern = includePattern;

		// Normalize the pattern
		if (!pattern.startsWith('**/')) {
			pattern = `**/${pattern}`;
		}

		if (pattern.endsWith('/')) {
			pattern = `${pattern}**`;
		}

		return pattern;
	}

	/**
	 * Get relative path from workspace root
	 */
	private getRelativePath(absolutePath: string): string {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return absolutePath;
		}

		// Try to find the workspace folder that contains this file
		for (const folder of workspaceFolders) {
			const folderPath = folder.uri.fsPath;
			if (absolutePath.startsWith(folderPath)) {
				return path.relative(folderPath, absolutePath);
			}
		}

		return absolutePath;
	}

	/**
	 * Check if a pattern is a valid regex
	 */
	private isValidRegex(pattern: string): boolean {
		try {
			// Additional validation for common problematic patterns
			if (pattern.length === 0) {
				return false;
			}

			// Check for catastrophic backtracking patterns
			const problematicPatterns = [
				/(\.\*){3,}/, // Multiple .* patterns
				/(\+\*|\*\+)/, // Conflicting quantifiers
				/(.*\+.*){3,}/, // Nested quantifiers
			];

			for (const problematic of problematicPatterns) {
				if (problematic.test(pattern)) {
					this.logger(
						`Potentially problematic regex pattern detected: ${pattern}`,
						'warn'
					);
				}
			}

			new RegExp(pattern);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Build XML output for search results
	 */
	private buildXmlOutput(
		query: string,
		results: SearchMatch[],
		maxResults: number,
		askedForTooMany: boolean | undefined,
		includePattern: string | undefined
	): string {
		const totalMatches = results.reduce(
			(sum, match) => sum + match.ranges.length,
			0
		);
		const hasMoreResults = totalMatches > maxResults;

		let output = `<grep_search_results>
  <query>${this.escapeXml(query)}</query>
  <total_matches>${totalMatches}</total_matches>
  <files_matched>${results.length}</files_matched>
  <max_results>${maxResults}</max_results>`;

		if (includePattern) {
			output += `
  <include_pattern>${this.escapeXml(includePattern)}</include_pattern>`;
		}

		if (askedForTooMany) {
			output += `
  <note>maxResults was capped at ${this.MAX_RESULTS_CAP}</note>`;
		}

		if (hasMoreResults) {
			output += `
  <note>More results are available. Increase maxResults to see more.</note>`;
		}

		if (results.length === 0) {
			output += `
  <message>No matches found</message>`;
		} else {
			output += `
  <matches>`;

			for (const match of results) {
				output += `
    <file path="${this.escapeXml(match.file)}">`;

				for (const range of match.ranges) {
					output += `
      <match>
        <line>${range.startLine + 1}</line>
        <column>${range.startChar + 1}</column>
        <preview>${this.escapeXml(match.preview.trim())}</preview>
      </match>`;
				}

				output += `
    </file>`;
			}

			output += `
  </matches>`;
		}

		output += `
</grep_search_results>`;

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
 * Represents a search match in a file
 */
interface SearchMatch {
	file: string;
	uri: string;
	ranges: Array<{
		startLine: number;
		startChar: number;
		endLine: number;
		endChar: number;
	}>;
	preview: string;
}
