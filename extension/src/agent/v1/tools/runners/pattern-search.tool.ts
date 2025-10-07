import * as vscode from 'vscode';
import * as path from 'path';
import { BaseAgentTool } from '../base-agent.tool';
import { ToolResponseV2 } from '../../types';
import { PatternSearchToolParams } from '../schema/pattern-search';

/**
 * Pattern Search Tool - PATTERN-FOCUSED CODE ANALYSIS
 *
 * This tool is designed to help AI models build mental models of code architecture
 * by analyzing how patterns appear across multiple files. It provides:
 *
 * 1. PATTERN ANALYSIS - Understand how patterns are used in different contexts
 * 2. STRUCTURAL COMPARISON - Compare pattern implementations across files
 * 3. RELATIONSHIP MAPPING - See dependencies and connections between patterns
 * 4. STATISTICAL INSIGHTS - Pattern frequency, distribution, and variations
 * 5. INTELLIGENT GROUPING - Organize results by file type, directory, or usage
 *
 * Unlike simple text search (grep), this tool focuses on understanding CODE PATTERNS
 * and their relationships to help build a comprehensive mental model of the codebase.
 */
export class PatternSearchTool extends BaseAgentTool<PatternSearchToolParams> {
	async execute(): Promise<ToolResponseV2> {
		const { searchPattern, files, caseSensitive, contextLinesBefore, contextLinesAfter } =
			this.params.input;

		// ========== STEP 1: VALIDATE PATTERN ==========
		if (!searchPattern || searchPattern.trim().length === 0) {
			return this.toolResponse('error', 'Search pattern cannot be empty');
		}

		// Validate pattern complexity and provide warnings
		const patternValidation = this.validatePattern(searchPattern);
		if (patternValidation.error) {
			return this.toolResponse('error', patternValidation.error);
		}

		if (!files || files.length === 0) {
			return this.toolResponse('error', 'No files specified for search');
		}

		// Performance: Limit number of files
		if (files.length > 100) {
			return this.toolResponse(
				'error',
				'Too many files specified (max 100). Please narrow down your search.'
			);
		}

		this.logger(
			`Searching for pattern "${searchPattern}" in ${files.length} file(s)`,
			'info'
		);

		// Log pattern type and warnings
		if (patternValidation.warnings.length > 0) {
			this.logger(`Pattern warnings: ${patternValidation.warnings.join(', ')}`, 'warn');
		}

		try {
			const startTime = Date.now();

			// Expand glob patterns and resolve file paths
			const resolvedFiles = await this.resolveFiles(files);

			if (resolvedFiles.length === 0) {
				return this.toolResponse(
					'success',
					`No files found matching the specified patterns:\n${files.join('\n')}`
				);
			}

			this.logger(`Resolved to ${resolvedFiles.length} file(s)`, 'debug');

			// Perform the search with regex support
			const results = await this.searchInFiles(
				searchPattern,
				resolvedFiles,
				caseSensitive ?? false,
				contextLinesBefore ?? 5,
				contextLinesAfter ?? 5,
				patternValidation.isRegex
			);

			const searchTime = Date.now() - startTime;

			// Format results with enhanced analysis
			const output = this.formatResults(
				searchPattern,
				results,
				caseSensitive ?? false,
				contextLinesBefore ?? 5,
				contextLinesAfter ?? 5,
				patternValidation,
				searchTime
			);

			return this.toolResponse('success', output);
		} catch (error) {
			this.logger(`Error during pattern search: ${error}`, 'error');
			return this.toolResponse(
				'error',
				`Failed to search for pattern: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Resolve file paths and expand glob patterns
	 */
	private async resolveFiles(filePatterns: string[]): Promise<vscode.Uri[]> {
		const resolvedFiles: vscode.Uri[] = [];
		const seenPaths = new Set<string>();

		for (const pattern of filePatterns) {
			// Check if it's a glob pattern
			if (pattern.includes('*') || pattern.includes('?')) {
				// Use VS Code's findFiles to expand glob
				const foundFiles = await vscode.workspace.findFiles(
					pattern,
					'**/node_modules/**',
					1000 // Limit per pattern
				);
				for (const file of foundFiles) {
					if (!seenPaths.has(file.fsPath)) {
						seenPaths.add(file.fsPath);
						resolvedFiles.push(file);
					}
				}
			} else {
				// Direct file path
				const absolutePath = path.isAbsolute(pattern)
					? pattern
					: path.resolve(this.cwd, pattern);
				const uri = vscode.Uri.file(absolutePath);

				// Check if file exists
				try {
					await vscode.workspace.fs.stat(uri);
					if (!seenPaths.has(uri.fsPath)) {
						seenPaths.add(uri.fsPath);
						resolvedFiles.push(uri);
					}
				} catch (error) {
					this.logger(`File not found: ${pattern}`, 'warn');
				}
			}
		}

		return resolvedFiles;
	}

	/**
	 * Get human-readable description of pattern type
	 */
	private getPatternTypeDescription(
		patternType: PatternValidation['patternType']
	): string {
		const descriptions: Record<PatternValidation['patternType'], string> = {
			literal: 'Literal Text Search',
			regex: 'Regular Expression Pattern',
			'todo-marker': 'TODO/FIXME/HACK/NOTE Marker',
			'email-or-decorator': 'Email Address or Decorator',
			'class-or-constant': 'Class Name or Constant',
			'function-definition': 'Function Definition',
			'function-call': 'Function Call',
			'keyword-statement': 'Keyword Statement (import/export/const/etc)',
		};
		return descriptions[patternType];
	}

	/**
	 * Validate search pattern and detect pattern type
	 */
	private validatePattern(pattern: string): PatternValidation {
		const validation: PatternValidation = {
			isRegex: false,
			warnings: [],
			error: null,
			patternType: 'literal',
		};

		// First, detect special pattern types (before regex detection)
		// This allows patterns like "user@example.com" to be recognized as email
		// even though they contain regex special characters

		// TODO/FIXME markers
		if (pattern.startsWith('TODO') || pattern.startsWith('FIXME') || pattern.startsWith('HACK') || pattern.startsWith('NOTE')) {
			validation.patternType = 'todo-marker';
			return validation;
		}

		// Email or decorator (contains @ but not spaces, and looks like email/decorator)
		if (pattern.includes('@') && !pattern.includes(' ')) {
			// Check if it looks like an email or decorator
			if (/@[a-zA-Z0-9]/.test(pattern)) {
				validation.patternType = 'email-or-decorator';
				return validation;
			}
		}

		// Keyword statements
		if (/^(import|export|const|let|var|class|interface|type|enum)\s/.test(pattern)) {
			validation.patternType = 'keyword-statement';
			return validation;
		}

		// Function definition
		if (/^function\s+\w+/.test(pattern)) {
			validation.patternType = 'function-definition';
			return validation;
		}

		// Function call
		if (/^[a-z][a-zA-Z0-9]*\(/.test(pattern)) {
			validation.patternType = 'function-call';
			return validation;
		}

		// Class or constant (all uppercase or PascalCase)
		if (/^[A-Z][a-zA-Z0-9]*$/.test(pattern)) {
			validation.patternType = 'class-or-constant';
			return validation;
		}

		// Now detect if pattern looks like regex
		const regexIndicators = /[.*+?^${}()|[\]\\]/;
		if (regexIndicators.test(pattern)) {
			validation.isRegex = true;
			validation.patternType = 'regex';

			// Try to compile regex to check validity
			try {
				new RegExp(pattern);
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				validation.error = `Invalid regular expression: ${errorMsg}`;

				// Provide helpful suggestions for common regex errors
				if (errorMsg.includes('Unterminated character class')) {
					validation.error += '\nSuggestion: Check for unmatched [ or ] brackets';
				} else if (errorMsg.includes('Unterminated group')) {
					validation.error += '\nSuggestion: Check for unmatched ( or ) parentheses';
				} else if (errorMsg.includes('Invalid escape sequence')) {
					validation.error += '\nSuggestion: Use \\\\ for literal backslash';
				} else if (errorMsg.includes('Nothing to repeat')) {
					validation.error += '\nSuggestion: Check for misplaced *, +, or ? quantifiers';
				}

				return validation;
			}

			// Warn about complex patterns
			if (pattern.length > 50) {
				validation.warnings.push('Complex regex pattern may impact performance');
			}

			// Warn about potentially dangerous patterns
			if (pattern.includes('.*.*') || pattern.includes('.+.+')) {
				validation.warnings.push(
					'Pattern contains nested wildcards which may cause slow performance'
				);
			}
		} else {
			validation.patternType = 'literal';
		}

		// Add performance warning for very long patterns
		if (pattern.length > 100) {
			validation.warnings.push('Very long pattern may be difficult to match accurately');
		}

		// Warn about patterns that might match too broadly
		if (!validation.isRegex && pattern.length < 3) {
			validation.warnings.push('Short pattern may produce many false positives');
		}

		// Suggest common pattern improvements
		this.addPatternSuggestions(pattern, validation);

		return validation;
	}

	/**
	 * Add helpful pattern suggestions based on common use cases
	 */
	private addPatternSuggestions(pattern: string, validation: PatternValidation): void {
		// Only suggest for literal patterns that might benefit from regex
		if (validation.isRegex || validation.patternType !== 'literal') {
			return;
		}

		const suggestions: string[] = [];

		// Suggest word boundary for common identifiers
		if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(pattern)) {
			suggestions.push(`Consider using word boundaries: \\b${pattern}\\b (to avoid partial matches)`);
		}

		// Suggest case-insensitive for mixed case
		if (/[A-Z]/.test(pattern) && /[a-z]/.test(pattern)) {
			suggestions.push('Consider using case-insensitive search for mixed-case patterns');
		}

		// Suggest regex for patterns that look like they need flexibility
		if (pattern.includes('_') || pattern.includes('-')) {
			const flexiblePattern = pattern.replace(/[_-]/g, '[_-]');
			suggestions.push(`For flexible matching: ${flexiblePattern}`);
		}

		// Add suggestions as warnings
		for (const suggestion of suggestions) {
			validation.warnings.push(`TIP: ${suggestion}`);
		}
	}

	/**
	 * Search for pattern in files with regex support
	 */
	private async searchInFiles(
		pattern: string,
		files: vscode.Uri[],
		caseSensitive: boolean,
		contextBefore: number,
		contextAfter: number,
		isRegex: boolean
	): Promise<SearchResult[]> {
		const results: SearchResult[] = [];

		for (const file of files) {
			try {
				const document = await vscode.workspace.openTextDocument(file);
				const text = document.getText();

				// Performance: Skip very large files
				if (text.length > 5000000) {
					// 5MB limit
					this.logger(
						`Skipping large file: ${file.fsPath} (${text.length} chars)`,
						'warn'
					);
					continue;
				}

				const lines = text.split('\n');
				const matches = this.findMatches(
					lines,
					pattern,
					caseSensitive,
					contextBefore,
					contextAfter,
					isRegex
				);

				if (matches.length > 0) {
					const relativePath = path.relative(this.cwd, file.fsPath);
					results.push({
						file: relativePath,
						absolutePath: file.fsPath,
						matches,
					});
				}
			} catch (error) {
				this.logger(`Error reading file ${file.fsPath}: ${error}`, 'warn');
			}
		}

		return results;
	}

	/**
	 * Find all matches in lines with regex support
	 */
	private findMatches(
		lines: string[],
		pattern: string,
		caseSensitive: boolean,
		contextBefore: number,
		contextAfter: number,
		isRegex: boolean
	): Match[] {
		const matches: Match[] = [];

		// Create regex or literal pattern
		let regex: RegExp;
		if (isRegex) {
			const flags = caseSensitive ? 'g' : 'gi';
			regex = new RegExp(pattern, flags);
		} else {
			// Escape special regex characters for literal search
			const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const flags = caseSensitive ? 'g' : 'gi';
			regex = new RegExp(escapedPattern, flags);
		}

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Reset regex lastIndex for each line
			regex.lastIndex = 0;

			// Find all matches in this line
			const lineMatches: RegExpExecArray[] = [];
			let match: RegExpExecArray | null;
			while ((match = regex.exec(line)) !== null) {
				lineMatches.push(match);
				// Prevent infinite loop for zero-width matches
				if (match.index === regex.lastIndex) {
					regex.lastIndex++;
				}
			}

			// Create a match entry for each occurrence in the line
			for (const _match of lineMatches) {
				// Get context lines
				const startLine = Math.max(0, i - contextBefore);
				const endLine = Math.min(lines.length - 1, i + contextAfter);

				const contextLines: ContextLine[] = [];
				for (let j = startLine; j <= endLine; j++) {
					contextLines.push({
						lineNumber: j + 1, // 1-based line numbers
						content: lines[j],
						isMatch: j === i,
					});
				}

				matches.push({
					lineNumber: i + 1,
					content: line,
					context: contextLines,
				});
			}
		}

		return matches;
	}

	/**
	 * Format search results with PATTERN ANALYSIS
	 */
	private formatResults(
		pattern: string,
		results: SearchResult[],
		caseSensitive: boolean,
		contextBefore: number,
		contextAfter: number,
		validation: PatternValidation,
		searchTime: number
	): string {
		if (results.length === 0) {
			let output = `No matches found for pattern: "${pattern}"\n\n`;
			output += `PATTERN TYPE: ${this.getPatternTypeDescription(validation.patternType)}\n`;
			output += `SEARCH MODE: ${validation.isRegex ? 'Regular Expression' : 'Literal Text'}\n\n`;

			// Display warnings even when no matches found
			if (validation.warnings.length > 0) {
				output += `WARNINGS & SUGGESTIONS:\n`;
				for (const warning of validation.warnings) {
					output += `  ! ${warning}\n`;
				}
				output += `\n`;
			}

			// Provide helpful suggestions when no matches found
			output += `TROUBLESHOOTING SUGGESTIONS:\n`;
			output += `  1. Check spelling and case sensitivity\n`;
			output += `  2. Try broader search terms or partial matches\n`;
			output += `  3. Verify the file paths are correct\n`;

			if (validation.isRegex) {
				output += `  4. Test your regex pattern in a regex validator\n`;
				output += `  5. Try escaping special characters if searching literally\n`;
			} else {
				output += `  4. Consider using regular expressions for flexible matching\n`;
				output += `  5. Try case-insensitive search if appropriate\n`;
			}

			output += `\n`;

			return output;
		}

		const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);
		const analysis = this.analyzePatterns(results);

		let output = '';

		// ========== SECTION 1: EXECUTIVE SUMMARY ==========
		output += `================================================================================\n`;
		output += `                        PATTERN ANALYSIS REPORT\n`;
		output += `================================================================================\n\n`;

		output += `PATTERN: "${pattern}"\n`;
		output += `PATTERN TYPE: ${this.getPatternTypeDescription(validation.patternType)}\n`;
		output += `SEARCH MODE: ${validation.isRegex ? 'Regular Expression' : 'Literal Text'}\n\n`;

		// Display warnings if any
		if (validation.warnings.length > 0) {
			output += `WARNINGS:\n`;
			for (const warning of validation.warnings) {
				output += `  ! ${warning}\n`;
			}
			output += `\n`;
		}

		output += `STATISTICS:\n`;
		output += `  - Total Matches: ${totalMatches}\n`;
		output += `  - Files Containing Pattern: ${results.length}\n`;
		output += `  - Average Matches per File: ${(totalMatches / results.length).toFixed(1)}\n`;
		output += `  - Case Sensitive: ${caseSensitive ? 'Yes' : 'No'}\n`;
		output += `  - Context: ${contextBefore} lines before, ${contextAfter} lines after\n`;
		output += `  - Search Time: ${searchTime}ms\n\n`;

		// ========== SECTION 2: PATTERN DISTRIBUTION ==========
		output += `PATTERN DISTRIBUTION BY FILE TYPE:\n`;
		output += `${'='.repeat(80)}\n`;
		for (const [fileType, count] of Object.entries(analysis.byFileType)) {
			const percentage = ((count / totalMatches) * 100).toFixed(1);
			const barLength = Math.ceil((count / totalMatches) * 40);
			const bar = '#'.repeat(barLength);
			output += `  ${fileType.padEnd(15)} [${bar.padEnd(40)}] ${count} matches (${percentage}%)\n`;
		}
		output += `\n`;

		// ========== SECTION 3: PATTERN DISTRIBUTION BY DIRECTORY ==========
		output += `PATTERN DISTRIBUTION BY DIRECTORY:\n`;
		output += `${'='.repeat(80)}\n`;
		for (const [dir, count] of Object.entries(analysis.byDirectory)) {
			const percentage = ((count / totalMatches) * 100).toFixed(1);
			output += `  ${dir.padEnd(50)} ${count} matches (${percentage}%)\n`;
		}
		output += `\n`;

		// ========== SECTION 4: USAGE CONTEXT ANALYSIS ==========
		output += `USAGE CONTEXT PATTERNS:\n`;
		output += `${'='.repeat(80)}\n`;
		const contextPatterns = this.analyzeUsageContexts(results);
		for (const [context, count] of Object.entries(contextPatterns).slice(0, 5)) {
			output += `  - ${context}: ${count} occurrences\n`;
		}
		output += `\n`;

		// ========== SECTION 5: FILES RANKED BY PATTERN USAGE ==========
		output += `FILES RANKED BY PATTERN USAGE (Top 10):\n`;
		output += `${'='.repeat(80)}\n`;
		const rankedFiles = results
			.map((r) => ({ file: r.file, count: r.matches.length }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		for (let i = 0; i < rankedFiles.length; i++) {
			const { file, count } = rankedFiles[i];
			const rank = `#${i + 1}`.padStart(4);
			output += `  ${rank}. ${file.padEnd(60)} ${count} matches\n`;
		}
		output += `\n`;

		// ========== SECTION 6: DETAILED MATCHES WITH CONTEXT ==========
		output += `================================================================================\n`;
		output += `                        DETAILED PATTERN MATCHES\n`;
		output += `================================================================================\n\n`;

		for (const result of results) {
			output += `\n${'='.repeat(80)}\n`;
			output += `FILE: ${result.file}\n`;
			output += `MATCHES: ${result.matches.length}\n`;
			output += `${'='.repeat(80)}\n\n`;

			for (const match of result.matches) {
				output += `  Match at line ${match.lineNumber}:\n`;
				output += `  ${'-'.repeat(76)}\n`;

				for (const contextLine of match.context) {
					const prefix = contextLine.isMatch ? '  > ' : '    ';
					const lineNum = String(contextLine.lineNumber).padStart(4, ' ');
					const content = contextLine.content; // Show full line - no truncation
					output += `${prefix}${lineNum} | ${content}\n`;
				}

				output += `  ${'-'.repeat(76)}\n\n`;
			}
		}

		// ========== SECTION 7: INSIGHTS & RECOMMENDATIONS ==========
		output += `\n${'='.repeat(80)}\n`;
		output += `                    INSIGHTS & RECOMMENDATIONS\n`;
		output += `${'='.repeat(80)}\n\n`;

		const insights = this.generateInsights(results, analysis);
		for (const insight of insights) {
			output += `INSIGHT: ${insight}\n\n`;
		}

		return output;
	}

	/**
	 * Analyze pattern distribution and usage
	 */
	private analyzePatterns(results: SearchResult[]): PatternAnalysis {
		const byFileType: Record<string, number> = {};
		const byDirectory: Record<string, number> = {};

		for (const result of results) {
			// Analyze by file type
			const ext = path.extname(result.file) || 'no-extension';
			byFileType[ext] = (byFileType[ext] || 0) + result.matches.length;

			// Analyze by directory
			const dir = path.dirname(result.file);
			byDirectory[dir] = (byDirectory[dir] || 0) + result.matches.length;
		}

		return { byFileType, byDirectory };
	}

	/**
	 * Analyze usage contexts (what code surrounds the pattern)
	 */
	private analyzeUsageContexts(results: SearchResult[]): Record<string, number> {
		const contexts: Record<string, number> = {};

		for (const result of results) {
			for (const match of result.matches) {
				const line = match.content.trim();

				// Use precise regex matching instead of simple string includes
				// This prevents false positives (e.g., "import" in comments)

				// Import statement: must start with import (ignoring whitespace)
				if (/^\s*import\s+/.test(line)) {
					contexts['Import statement'] = (contexts['Import statement'] || 0) + 1;
				}
				// Export statement: must start with export
				else if (/^\s*export\s+/.test(line)) {
					contexts['Export statement'] = (contexts['Export statement'] || 0) + 1;
				}
				// Class/Interface definition: class or interface keyword followed by name
				else if (/^\s*(export\s+)?(abstract\s+)?(class|interface)\s+\w+/.test(line)) {
					contexts['Class/Interface definition'] =
						(contexts['Class/Interface definition'] || 0) + 1;
				}
				// Function definition: function keyword or arrow function
				else if (/^\s*(export\s+)?(async\s+)?function\s+\w+/.test(line) || /^\s*(const|let|var)\s+\w+\s*=\s*(\([^)]*\)|[^=]+)\s*=>/.test(line)) {
					contexts['Function definition'] =
						(contexts['Function definition'] || 0) + 1;
				}
				// Variable declaration: const/let/var at start of line
				else if (/^\s*(const|let|var)\s+\w+/.test(line)) {
					contexts['Variable declaration'] =
						(contexts['Variable declaration'] || 0) + 1;
				}
				// Comment: line starts with // or /* or *
				else if (/^\s*(\/\/|\/\*|\*)/.test(line)) {
					contexts['Comment'] = (contexts['Comment'] || 0) + 1;
				}
				// Type definition: type keyword
				else if (/^\s*(export\s+)?type\s+\w+/.test(line)) {
					contexts['Type definition'] = (contexts['Type definition'] || 0) + 1;
				}
				// Method call: pattern appears in a method call
				else if (/\w+\([^)]*\)/.test(line)) {
					contexts['Method call'] = (contexts['Method call'] || 0) + 1;
				}
				// Property access: pattern appears in property access
				else if (/\w+\.\w+/.test(line)) {
					contexts['Property access'] = (contexts['Property access'] || 0) + 1;
				}
				else {
					contexts['Other usage'] = (contexts['Other usage'] || 0) + 1;
				}
			}
		}

		return Object.entries(contexts)
			.sort(([, a], [, b]) => b - a)
			.reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
	}

	/**
	 * Generate insights based on pattern analysis
	 */
	private generateInsights(
		results: SearchResult[],
		analysis: PatternAnalysis
	): string[] {
		const insights: string[] = [];
		const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);

		// Insight 1: Concentration analysis
		const topFile = results.reduce((max, r) =>
			r.matches.length > max.matches.length ? r : max
		);
		const concentration = (topFile.matches.length / totalMatches) * 100;

		if (concentration > 50) {
			insights.push(
				`HIGH CONCENTRATION: ${concentration.toFixed(1)}% of pattern usage is in "${topFile.file}". This file is a central point for this pattern.`
			);
		} else if (concentration < 10) {
			insights.push(
				`DISTRIBUTED PATTERN: Pattern is evenly distributed across files (max ${concentration.toFixed(1)}% in any single file). This suggests a widely-used utility or common pattern.`
			);
		}

		// Insight 2: File type analysis
		const fileTypes = Object.keys(analysis.byFileType);
		if (fileTypes.length === 1) {
			insights.push(
				`SINGLE FILE TYPE: Pattern only appears in ${fileTypes[0]} files. This is a type-specific pattern.`
			);
		} else if (fileTypes.length >= 4) {
			insights.push(
				`CROSS-CUTTING CONCERN: Pattern appears in ${fileTypes.length} different file types. This suggests a cross-cutting concern or widely-used abstraction.`
			);
		}

		// Insight 3: Directory analysis
		const directories = Object.keys(analysis.byDirectory);
		if (directories.length === 1) {
			insights.push(
				`LOCALIZED PATTERN: All occurrences are in "${directories[0]}" directory. This is a module-specific pattern.`
			);
		} else if (directories.length >= 5) {
			insights.push(
				`WIDESPREAD PATTERN: Pattern appears in ${directories.length} different directories. This suggests a fundamental pattern used throughout the codebase.`
			);
		}

		// Insight 4: Usage frequency
		const avgMatchesPerFile = totalMatches / results.length;
		if (avgMatchesPerFile > 10) {
			insights.push(
				`HIGH USAGE FREQUENCY: Average ${avgMatchesPerFile.toFixed(1)} matches per file. This pattern is heavily used in the files where it appears.`
			);
		} else if (avgMatchesPerFile < 2) {
			insights.push(
				`SPARSE USAGE: Average ${avgMatchesPerFile.toFixed(1)} matches per file. Pattern is used sparingly, possibly for specific cases.`
			);
		}

		// Insight 5: Recommendations based on file count
		if (results.length > 10) {
			insights.push(
				`RECOMMENDATION: Consider refactoring this pattern into a shared utility or abstraction to reduce duplication across ${results.length} files.`
			);
		}

		// Insight 6: High duplication warning
		if (avgMatchesPerFile > 2 && results.length > 5) {
			insights.push(
				`HIGH DUPLICATION: Pattern appears ${totalMatches} times across ${results.length} files. Consider extracting common code to improve maintainability.`
			);
		}

		// Insight 7: Test file analysis
		const testFiles = results.filter(r =>
			r.file.includes('.test.') ||
			r.file.includes('.spec.') ||
			r.file.includes('__tests__')
		);
		if (testFiles.length > 0 && testFiles.length === results.length) {
			insights.push(
				`TEST-ONLY PATTERN: Pattern only appears in test files. This is a testing-specific pattern.`
			);
		} else if (testFiles.length > 0 && testFiles.length < results.length) {
			const testPercentage = (testFiles.length / results.length) * 100;
			insights.push(
				`MIXED USAGE: ${testPercentage.toFixed(1)}% of occurrences are in test files. Pattern is used in both production and test code.`
			);
		}

		// Insight 8: File size correlation
		if (concentration > 80) {
			insights.push(
				`CRITICAL DEPENDENCY: ${concentration.toFixed(1)}% concentration in one file suggests this file is critical for this pattern. Changes here will have wide impact.`
			);
		}

		return insights;
	}
}

/**
 * Search result for a single file
 */
interface SearchResult {
	file: string;
	absolutePath: string;
	matches: Match[];
}

/**
 * A single match in a file
 */
interface Match {
	lineNumber: number;
	content: string;
	context: ContextLine[];
}

/**
 * A line with context information
 */
interface ContextLine {
	lineNumber: number;
	content: string;
	isMatch: boolean;
}

/**
 * Pattern analysis results
 */
interface PatternAnalysis {
	byFileType: Record<string, number>;
	byDirectory: Record<string, number>;
}

/**
 * Pattern validation result
 */
interface PatternValidation {
	isRegex: boolean;
	warnings: string[];
	error: string | null;
	patternType:
		| 'literal'
		| 'regex'
		| 'todo-marker'
		| 'email-or-decorator'
		| 'class-or-constant'
		| 'function-definition'
		| 'function-call'
		| 'keyword-statement';
}

