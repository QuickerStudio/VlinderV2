import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs"
import { exec } from "child_process"
import { promisify } from "util"
import {
	CodeSearchResult,
	GitHistoryResult,
	ContextEngineAnalysisResult,
	SearchType,
	AnalysisDepth
} from "../../schema/context-engine-agent"

const execAsync = promisify(exec)

export interface ContextEngineConfig {
	maxResults: number
	includeGitHistory: boolean
	analysisDepth: AnalysisDepth
	workspaceRoot: string
}

export class ContextEngineService {
	private workspaceRoot: string
	private gitAvailable: boolean = false

	constructor(workspaceRoot: string) {
		this.workspaceRoot = workspaceRoot
		this.checkGitAvailability()
	}

	private async checkGitAvailability(): Promise<void> {
		try {
			await execAsync("git --version", { cwd: this.workspaceRoot })
			this.gitAvailable = true
		} catch {
			this.gitAvailable = false
		}
	}

	/**
	 * Main analysis method that orchestrates different search types
	 */
	async analyzeCodebase(
		query: string,
		searchType: SearchType,
		config: ContextEngineConfig,
		scope?: string
	): Promise<ContextEngineAnalysisResult> {
		const startTime = Date.now()
		
		let codeResults: CodeSearchResult[] = []
		let gitResults: GitHistoryResult[] = []

		try {
			// Perform code search based on type
			switch (searchType) {
				case "semantic":
					codeResults = await this.performSemanticSearch(query, config, scope)
					break
				case "structural":
					codeResults = await this.performStructuralSearch(query, config, scope)
					break
				case "historical":
					if (this.gitAvailable) {
						gitResults = await this.performHistoricalSearch(query, config, scope)
					}
					break
				case "contextual":
					codeResults = await this.performContextualSearch(query, config, scope)
					break
			}

			// Add Git history if requested and available
			if (config.includeGitHistory && this.gitAvailable && searchType !== "historical") {
				const historyResults = await this.performHistoricalSearch(query, config, scope)
				gitResults = historyResults.slice(0, Math.floor(config.maxResults / 3))
			}

			// Generate insights
			const insights = await this.generateInsights(codeResults, gitResults, query)

			// Create summary
			const summary = this.generateSummary(query, searchType, codeResults, gitResults, insights)

			return {
				query,
				searchType,
				totalResults: codeResults.length + gitResults.length,
				executionTime: Date.now() - startTime,
				codeResults: codeResults.slice(0, config.maxResults),
				gitResults: gitResults.length > 0 ? gitResults : undefined,
				insights,
				summary
			}

		} catch (error) {
			console.error("Context Engine analysis failed:", error)
			throw new Error(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	/**
	 * Semantic search using VSCode's workspace symbol search and text matching
	 */
	private async performSemanticSearch(
		query: string, 
		config: ContextEngineConfig, 
		scope?: string
	): Promise<CodeSearchResult[]> {
		const results: CodeSearchResult[] = []

		try {
			// Use VSCode's workspace symbol search
			const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
				'vscode.executeWorkspaceSymbolProvider',
				query
			)

			if (symbols) {
				for (const symbol of symbols.slice(0, config.maxResults)) {
					const result = await this.symbolToSearchResult(symbol, query)
					if (result) {
						results.push(result)
					}
				}
			}

			// Supplement with text-based search
			const textResults = await this.performTextSearch(query, scope)
			results.push(...textResults.slice(0, config.maxResults - results.length))

		} catch (error) {
			console.error("Semantic search failed:", error)
		}

		return this.rankResults(results, query)
	}

	/**
	 * Structural search focusing on code structure and definitions
	 */
	private async performStructuralSearch(
		query: string,
		config: ContextEngineConfig,
		scope?: string
	): Promise<CodeSearchResult[]> {
		const results: CodeSearchResult[] = []

		try {
			// Search for class definitions
			if (query.toLowerCase().includes("class")) {
				const classResults = await this.searchForPattern(
					`class\\s+\\w*${this.escapeRegex(query.replace(/class\s*/i, ""))}\\w*`,
					scope
				)
				results.push(...classResults)
			}

			// Search for function definitions
			if (query.toLowerCase().includes("function") || query.toLowerCase().includes("method")) {
				const funcResults = await this.searchForPattern(
					`(function\\s+|const\\s+\\w+\\s*=\\s*|\\w+\\s*\\().*${this.escapeRegex(query)}`,
					scope
				)
				results.push(...funcResults)
			}

			// Search for interface/type definitions
			if (query.toLowerCase().includes("interface") || query.toLowerCase().includes("type")) {
				const typeResults = await this.searchForPattern(
					`(interface|type)\\s+\\w*${this.escapeRegex(query.replace(/(interface|type)\s*/i, ""))}\\w*`,
					scope
				)
				results.push(...typeResults)
			}

			// General symbol search
			const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
				'vscode.executeWorkspaceSymbolProvider',
				query
			)

			if (symbols) {
				for (const symbol of symbols.slice(0, config.maxResults)) {
					const result = await this.symbolToSearchResult(symbol, query)
					if (result && !results.find(r => r.filePath === result.filePath && r.startLine === result.startLine)) {
						results.push(result)
					}
				}
			}

		} catch (error) {
			console.error("Structural search failed:", error)
		}

		return this.rankResults(results.slice(0, config.maxResults), query)
	}

	/**
	 * Historical search through Git commits
	 */
	private async performHistoricalSearch(
		query: string,
		config: ContextEngineConfig,
		scope?: string
	): Promise<GitHistoryResult[]> {
		if (!this.gitAvailable) {
			return []
		}

		const results: GitHistoryResult[] = []

		try {
			// Search commit messages
			const scopeArg = scope ? `-- ${scope}` : ""
			const { stdout } = await execAsync(
				`git log --oneline --grep="${query}" -n ${config.maxResults * 2} ${scopeArg}`,
				{ cwd: this.workspaceRoot }
			)

			const commits = stdout.trim().split('\n').filter(line => line.trim())

			for (const commit of commits) {
				const [hash, ...messageParts] = commit.split(' ')
				const message = messageParts.join(' ')

				if (hash && message) {
					const gitResult = await this.getCommitDetails(hash, query)
					if (gitResult) {
						results.push(gitResult)
					}
				}
			}

			// Also search in diff content
			if (results.length < config.maxResults) {
				const diffResults = await this.searchInDiffs(query, config.maxResults - results.length, scope)
				results.push(...diffResults)
			}

		} catch (error) {
			console.error("Historical search failed:", error)
		}

		return results.slice(0, config.maxResults)
	}

	/**
	 * Contextual search based on current workspace context
	 */
	private async performContextualSearch(
		query: string,
		config: ContextEngineConfig,
		scope?: string
	): Promise<CodeSearchResult[]> {
		// For now, implement as enhanced semantic search
		// In a full implementation, this would consider:
		// - Currently open files
		// - Recent file access patterns
		// - Import/dependency relationships
		// - File similarity based on structure
		
		return this.performSemanticSearch(query, config, scope)
	}

	/**
	 * Convert VSCode symbol to search result
	 */
	private async symbolToSearchResult(
		symbol: vscode.SymbolInformation, 
		query: string
	): Promise<CodeSearchResult | null> {
		try {
			const document = await vscode.workspace.openTextDocument(symbol.location.uri)
			const range = symbol.location.range
			
			// Get surrounding context
			const startLine = Math.max(0, range.start.line - 2)
			const endLine = Math.min(document.lineCount - 1, range.end.line + 2)
			
			const lines: string[] = []
			for (let i = startLine; i <= endLine; i++) {
				lines.push(document.lineAt(i).text)
			}

			const content = lines.join('\n')
			const language = document.languageId

			return {
				id: `${symbol.location.uri.fsPath}:${range.start.line}`,
				filePath: path.relative(this.workspaceRoot, symbol.location.uri.fsPath),
				startLine: range.start.line + 1,
				endLine: range.end.line + 1,
				content,
				language,
				chunkType: this.mapSymbolKindToChunkType(symbol.kind),
				relevanceScore: this.calculateRelevanceScore(symbol.name, content, query),
				metadata: {
					name: symbol.name,
					parentClass: symbol.containerName
				}
			}

		} catch (error) {
			console.error("Failed to convert symbol to search result:", error)
			return null
		}
	}

	/**
	 * Perform text-based search across files
	 */
	private async performTextSearch(query: string, scope?: string): Promise<CodeSearchResult[]> {
		const results: CodeSearchResult[] = []
		
		try {
			// Use ripgrep if available, otherwise fallback to basic search
			const searchPattern = this.escapeRegex(query)
			const scopePattern = scope || "**/*.{ts,tsx,js,jsx,py,java,cpp,c,h}"
			
			// This is a simplified implementation
			// In practice, you'd want to use ripgrep or similar tool
			const files = await vscode.workspace.findFiles(scopePattern, "**/node_modules/**")
			
			for (const file of files.slice(0, 20)) { // Limit files to search
				try {
					const document = await vscode.workspace.openTextDocument(file)
					const text = document.getText()
					
					if (text.toLowerCase().includes(query.toLowerCase())) {
						const lines = text.split('\n')
						for (let i = 0; i < lines.length; i++) {
							if (lines[i].toLowerCase().includes(query.toLowerCase())) {
								const startLine = Math.max(0, i - 1)
								const endLine = Math.min(lines.length - 1, i + 1)
								const content = lines.slice(startLine, endLine + 1).join('\n')
								
								results.push({
									id: `${file.fsPath}:${i}`,
									filePath: path.relative(this.workspaceRoot, file.fsPath),
									startLine: i + 1,
									endLine: i + 1,
									content,
									language: document.languageId,
									chunkType: "comment", // Default type
									relevanceScore: this.calculateRelevanceScore("", content, query),
									metadata: {}
								})
								
								if (results.length >= 10) break
							}
						}
					}
				} catch (error) {
					// Skip files that can't be read
					continue
				}
				
				if (results.length >= 10) break
			}
			
		} catch (error) {
			console.error("Text search failed:", error)
		}
		
		return results
	}

	/**
	 * Search for specific patterns using regex
	 */
	private async searchForPattern(pattern: string, scope?: string): Promise<CodeSearchResult[]> {
		// Simplified implementation - in practice use ripgrep or similar
		return []
	}

	/**
	 * Get detailed commit information
	 */
	private async getCommitDetails(hash: string, query: string): Promise<GitHistoryResult | null> {
		try {
			const { stdout } = await execAsync(
				`git show --stat --format="%H|%s|%an|%ad" --date=iso ${hash}`,
				{ cwd: this.workspaceRoot }
			)

			const lines = stdout.trim().split('\n')
			const [commitInfo] = lines
			const [fullHash, message, author, date] = commitInfo.split('|')

			const filesChanged: string[] = []
			let linesAdded = 0
			let linesRemoved = 0

			// Parse file changes
			for (let i = 1; i < lines.length; i++) {
				const line = lines[i].trim()
				if (line.includes('|')) {
					const parts = line.split('|')
					if (parts.length >= 2) {
						filesChanged.push(parts[0].trim())
					}
				}
			}

			return {
				commitHash: hash,
				message: message || "",
				author: author || "",
				date: date || "",
				filesChanged,
				summary: `${message} - ${filesChanged.length} files changed`,
				relevanceScore: this.calculateRelevanceScore(message, message, query),
				diffAnalysis: {
					linesAdded,
					linesRemoved,
					functionsChanged: [],
					classesChanged: []
				}
			}

		} catch (error) {
			console.error("Failed to get commit details:", error)
			return null
		}
	}

	/**
	 * Search in Git diffs
	 */
	private async searchInDiffs(query: string, maxResults: number, scope?: string): Promise<GitHistoryResult[]> {
		// Simplified implementation
		return []
	}

	/**
	 * Generate insights from search results
	 */
	private async generateInsights(
		codeResults: CodeSearchResult[],
		gitResults: GitHistoryResult[],
		query: string
	) {
		const patterns: string[] = []
		const recommendations: string[] = []
		const relatedConcepts: string[] = []

		// Analyze code patterns
		const languages = new Set(codeResults.map(r => r.language))
		const chunkTypes = new Set(codeResults.map(r => r.chunkType))

		if (languages.size > 1) {
			patterns.push(`Multi-language implementation found: ${Array.from(languages).join(", ")}`)
		}

		if (chunkTypes.has("function") && chunkTypes.has("class")) {
			patterns.push("Both functional and object-oriented patterns detected")
		}

		// Generate recommendations
		if (codeResults.length > 0) {
			recommendations.push("Consider reviewing the most relevant matches for implementation patterns")
		}

		if (gitResults && gitResults.length > 0) {
			recommendations.push("Review recent changes for context on current implementation")
		}

		// Extract related concepts
		const allContent = codeResults.map(r => r.content).join(" ")
		const words = allContent.toLowerCase().match(/\b\w{4,}\b/g) || []
		const wordFreq = new Map<string, number>()
		
		words.forEach(word => {
			if (!["function", "class", "const", "return", "import", "export"].includes(word)) {
				wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
			}
		})

		const sortedWords = Array.from(wordFreq.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
			.map(([word]) => word)

		relatedConcepts.push(...sortedWords)

		return {
			patterns,
			recommendations,
			relatedConcepts,
			codeQuality: {
				score: 85, // Placeholder
				issues: [],
				suggestions: []
			}
		}
	}

	/**
	 * Generate summary of analysis results
	 */
	private generateSummary(
		query: string,
		searchType: SearchType,
		codeResults: CodeSearchResult[],
		gitResults: GitHistoryResult[],
		insights: any
	): string {
		const parts: string[] = []

		parts.push(`Found ${codeResults.length} code matches for "${query}" using ${searchType} search.`)

		if (gitResults && gitResults.length > 0) {
			parts.push(`Additionally found ${gitResults.length} relevant commits in Git history.`)
		}

		if (codeResults.length > 0) {
			const topResult = codeResults[0]
			parts.push(`Most relevant match: ${topResult.chunkType} in ${topResult.filePath}:${topResult.startLine}`)
		}

		if (insights.patterns.length > 0) {
			parts.push(`Key patterns: ${insights.patterns[0]}`)
		}

		return parts.join(" ")
	}

	/**
	 * Utility methods
	 */
	private escapeRegex(text: string): string {
		return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	}

	private mapSymbolKindToChunkType(kind: vscode.SymbolKind): CodeSearchResult["chunkType"] {
		switch (kind) {
			case vscode.SymbolKind.Function:
			case vscode.SymbolKind.Method:
				return "function"
			case vscode.SymbolKind.Class:
				return "class"
			case vscode.SymbolKind.Interface:
				return "interface"
			case vscode.SymbolKind.Variable:
			case vscode.SymbolKind.Constant:
				return "variable"
			default:
				return "comment"
		}
	}

	private calculateRelevanceScore(name: string, content: string, query: string): number {
		let score = 0
		const queryLower = query.toLowerCase()
		const nameLower = name.toLowerCase()
		const contentLower = content.toLowerCase()

		// Exact name match
		if (nameLower === queryLower) score += 100
		// Name contains query
		else if (nameLower.includes(queryLower)) score += 80
		// Content contains query
		else if (contentLower.includes(queryLower)) score += 60

		// Boost for multiple occurrences
		const occurrences = (contentLower.match(new RegExp(queryLower, 'g')) || []).length
		score += Math.min(occurrences * 10, 40)

		return Math.min(score, 100)
	}

	private rankResults(results: CodeSearchResult[], query: string): CodeSearchResult[] {
		return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
	}
}
