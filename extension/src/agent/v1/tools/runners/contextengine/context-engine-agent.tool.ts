import * as vscode from "vscode"
import { ContextEngineAgentToolParams, ContextEngineAnalysisResult } from "../../schema/context-engine-agent"
import { ContextEngineService } from "./context-engine.service"
import { BaseAgentTool, FullToolParams } from "../../base-agent.tool"
import { ToolResponseV2 } from "../../../types"
import { AgentToolOptions, AgentToolParams } from "../../types"

export class ContextEngineAgentTool extends BaseAgentTool<ContextEngineAgentToolParams> {
	private contextEngine: ContextEngineService | null = null
	private workspaceRoot: string

	constructor(params: FullToolParams<ContextEngineAgentToolParams>, options: AgentToolOptions) {
		super(params, options)
		this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd()
		this.initializeContextEngine()
	}

	private initializeContextEngine() {
		try {
			this.contextEngine = new ContextEngineService(this.workspaceRoot)
		} catch (error) {
			console.error("Failed to initialize Context Engine:", error)
		}
	}

	async execute(): Promise<ToolResponseV2> {
		if (!this.contextEngine) {
			return this.toolResponse("error", "ERROR: Context Engine is not available. Please ensure you're in a valid workspace.")
		}

		const { query, searchType, scope, includeGitHistory, maxResults, analysisDepth } = this.params.input

		try {
			// Show progress to user
			const progressMessage = this.getProgressMessage(searchType, query)
			
			// Perform the analysis
			const result = await this.contextEngine.analyzeCodebase(
				query,
				searchType,
				{
					maxResults: maxResults || 10,
					includeGitHistory: includeGitHistory || false,
					analysisDepth: analysisDepth || "deep",
					workspaceRoot: this.workspaceRoot
				},
				scope
			)

			// Format and return the response
			const formattedResult = this.formatAnalysisResult(result)
			return this.toolResponse("success", formattedResult)

		} catch (error) {
			console.error("Context Engine analysis failed:", error)
			return this.toolResponse("error", `ERROR: Analysis failed: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	private getProgressMessage(searchType: string, query: string): string {
		switch (searchType) {
			case "semantic":
				return `[SEARCH] Performing semantic analysis for "${query}"...`
			case "structural":
				return `[ANALYZE] Analyzing code structure for "${query}"...`
			case "historical":
				return `[HISTORY] Searching Git history for "${query}"...`
			case "contextual":
				return `[CONTEXT] Performing contextual search for "${query}"...`
			default:
				return `[SEARCH] Analyzing codebase for "${query}"...`
		}
	}

	private formatAnalysisResult(result: ContextEngineAnalysisResult): string {
		const sections: string[] = []

		// Header with summary
		sections.push(`# Context Engine Analysis Results`)
		sections.push(`**Query:** "${result.query}"`)
		sections.push(`**Search Type:** ${result.searchType}`)
		sections.push(`**Results Found:** ${result.totalResults}`)
		sections.push(`**Execution Time:** ${result.executionTime}ms`)
		sections.push("")

		// Executive Summary
		sections.push(`## Summary`)
		sections.push(result.summary)
		sections.push("")

		// Code Results
		if (result.codeResults.length > 0) {
			sections.push(`## Code Matches (${result.codeResults.length})`)
			sections.push("")

			result.codeResults.forEach((codeResult: any, index: number) => {
				sections.push(`### ${index + 1}. ${this.formatChunkType(codeResult.chunkType)} in \`${codeResult.filePath}\``)
				sections.push(`**Location:** Lines ${codeResult.startLine}-${codeResult.endLine}`)
				sections.push(`**Language:** ${codeResult.language}`)
				sections.push(`**Relevance Score:** ${codeResult.relevanceScore.toFixed(1)}/100`)
				
				if (codeResult.metadata.name) {
					sections.push(`**Name:** \`${codeResult.metadata.name}\``)
				}
				
				if (codeResult.metadata.parentClass) {
					sections.push(`**Parent Class:** \`${codeResult.metadata.parentClass}\``)
				}

				if (codeResult.metadata.parameters && codeResult.metadata.parameters.length > 0) {
					sections.push(`**Parameters:** \`${codeResult.metadata.parameters.join(", ")}\``)
				}

				sections.push("")
				sections.push("```" + codeResult.language)
				sections.push(codeResult.content.trim())
				sections.push("```")
				sections.push("")

				if (codeResult.context) {
					sections.push(`**Context:** ${codeResult.context}`)
					sections.push("")
				}
			})
		}

		// Git History Results
		if (result.gitResults && result.gitResults.length > 0) {
			sections.push(`## Git History (${result.gitResults.length})`)
			sections.push("")

			result.gitResults.forEach((gitResult: any, index: number) => {
				sections.push(`### ${index + 1}. ${gitResult.message}`)
				sections.push(`**Commit:** \`${gitResult.commitHash.substring(0, 8)}\``)
				sections.push(`**Author:** ${gitResult.author}`)
				sections.push(`**Date:** ${new Date(gitResult.date).toLocaleDateString()}`)
				sections.push(`**Relevance Score:** ${gitResult.relevanceScore.toFixed(1)}/100`)
				
				if (gitResult.filesChanged.length > 0) {
					const fileList = gitResult.filesChanged.slice(0, 5).map((f: string) => `\`${f}\``).join(", ")
					const moreFiles = gitResult.filesChanged.length > 5 ? ` and ${gitResult.filesChanged.length - 5} more` : ""
					sections.push(`**Files Changed:** ${fileList}${moreFiles}`)
				}

				if (gitResult.diffAnalysis) {
					sections.push(`**Changes:** +${gitResult.diffAnalysis.linesAdded}/-${gitResult.diffAnalysis.linesRemoved} lines`)
				}

				sections.push(`**Summary:** ${gitResult.summary}`)
				sections.push("")
			})
		}

		// Insights
		if (result.insights) {
			sections.push(`## Analysis Insights`)
			sections.push("")

			if (result.insights.patterns.length > 0) {
				sections.push(`### Patterns Detected`)
				result.insights.patterns.forEach((pattern: string) => {
					sections.push(`- ${pattern}`)
				})
				sections.push("")
			}

			if (result.insights.recommendations.length > 0) {
				sections.push(`### Recommendations`)
				result.insights.recommendations.forEach((rec: string) => {
					sections.push(`- ${rec}`)
				})
				sections.push("")
			}

			if (result.insights.relatedConcepts.length > 0) {
				sections.push(`### Related Concepts`)
				sections.push(result.insights.relatedConcepts.map((concept: string) => `\`${concept}\``).join(", "))
				sections.push("")
			}

			if (result.insights.codeQuality) {
				sections.push(`### Code Quality Assessment`)
				sections.push(`**Overall Score:** ${result.insights.codeQuality.score}/100`)

				if (result.insights.codeQuality.issues.length > 0) {
					sections.push(`**Issues Found:**`)
					result.insights.codeQuality.issues.forEach((issue: string) => {
						sections.push(`- [WARNING] ${issue}`)
					})
				}

				if (result.insights.codeQuality.suggestions.length > 0) {
					sections.push(`**Suggestions:**`)
					result.insights.codeQuality.suggestions.forEach((suggestion: string) => {
						sections.push(`- [SUGGESTION] ${suggestion}`)
					})
				}
				sections.push("")
			}
		}

		// Footer with additional actions
		sections.push(`## Next Steps`)
		sections.push(`- Review the most relevant matches above`)
		sections.push(`- Consider exploring related files and dependencies`)

		if (result.gitResults && result.gitResults.length > 0) {
			sections.push(`- Examine recent changes for implementation context`)
		}

		sections.push(`- Use \`context_engine_agent\` with different search types for broader analysis`)
		sections.push("")

		// Metadata for debugging
		sections.push(`---`)
		sections.push(`*Analysis completed in ${result.executionTime}ms*`)

		return sections.join("\n")
	}

	private formatChunkType(chunkType: string): string {
		const typeMap: Record<string, string> = {
			"function": "[FUNC] Function",
			"class": "[CLASS] Class",
			"method": "[METHOD] Method",
			"interface": "[INTERFACE] Interface",
			"type": "[TYPE] Type",
			"variable": "[VAR] Variable",
			"comment": "[COMMENT] Comment",
			"import": "[IMPORT] Import"
		}
		return typeMap[chunkType] || `[${chunkType.toUpperCase()}] ${chunkType}`
	}

	/**
	 * Get tool usage examples and help
	 */
	static getUsageExamples(): string[] {
		return [
			"Search for authentication patterns: `context_engine_agent` with query='user authentication' and searchType='semantic'",
			"Find specific class methods: `context_engine_agent` with query='UserService methods' and searchType='structural'",
			"Analyze recent changes: `context_engine_agent` with query='bug fixes' and searchType='historical'",
			"Get contextual suggestions: `context_engine_agent` with query='payment processing' and searchType='contextual'"
		]
	}

	/**
	 * Validate tool parameters
	 */
	static validateParams(params: any): string[] {
		const errors: string[] = []

		if (!params.query || typeof params.query !== 'string' || params.query.trim().length === 0) {
			errors.push("Query is required and must be a non-empty string")
		}

		if (!params.searchType || !["semantic", "structural", "historical", "contextual"].includes(params.searchType)) {
			errors.push("searchType must be one of: semantic, structural, historical, contextual")
		}

		if (params.maxResults && (typeof params.maxResults !== 'number' || params.maxResults < 1 || params.maxResults > 50)) {
			errors.push("maxResults must be a number between 1 and 50")
		}

		if (params.analysisDepth && !["shallow", "deep", "comprehensive"].includes(params.analysisDepth)) {
			errors.push("analysisDepth must be one of: shallow, deep, comprehensive")
		}

		return errors
	}

	/**
	 * Get tool capabilities description
	 */
	static getCapabilities(): string {
		return `
The Context Engine Agent provides advanced codebase analysis capabilities:

🔍 **Semantic Search**: AI-powered understanding of code meaning and intent
🏗️ **Structural Search**: Analysis based on code structure (classes, functions, types)
📚 **Historical Search**: Git commit history and code evolution analysis  
🎯 **Contextual Search**: Context-aware search based on current workspace

**Key Features:**
- Multi-language support (TypeScript, JavaScript, Python, Java, etc.)
- Git integration for historical analysis
- Code quality assessment and recommendations
- Pattern detection and insights
- Relevance scoring and intelligent ranking

**Use Cases:**
- Find implementation patterns and examples
- Understand code architecture and relationships
- Track code evolution and recent changes
- Get contextual suggestions for current work
- Analyze code quality and identify improvements
		`.trim()
	}
}
