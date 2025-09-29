import { ToolPromptSchema } from "../utils/utils"

export const contextEngineAgentPrompt: ToolPromptSchema = {
	name: "context_engine_agent",
	description:
		"Advanced codebase analysis and semantic search tool that provides intelligent code understanding, context-aware search, and Git history analysis. This tool acts as a specialized sub-agent for deep codebase exploration and provides comprehensive insights about code structure, patterns, and evolution.",
	parameters: {
		query: {
			type: "string",
			description: "The search query or analysis request. Can be natural language descriptions, technical terms, or specific code elements you're looking for.",
			required: true,
		},
		searchType: {
			type: "string",
			description: "Type of search to perform: 'semantic' for AI-powered understanding of code meaning, 'structural' for code structure analysis, 'historical' for Git history search, 'contextual' for context-aware recommendations.",
			required: true,
		},
		scope: {
			type: "string",
			description: "Optional scope to limit search. Can be file path, directory, glob pattern, or language name.",
			required: false,
		},
		includeGitHistory: {
			type: "boolean",
			description: "Whether to include Git commit history and code evolution analysis in results.",
			required: false,
		},
		maxResults: {
			type: "number",
			description: "Maximum number of results to return (1-50, default: 10).",
			required: false,
		},
		analysisDepth: {
			type: "string",
			description: "Depth of analysis: 'shallow' for quick overview, 'deep' for detailed analysis with context, 'comprehensive' for full analysis including dependencies and patterns.",
			required: false,
		},
	},
	capabilities: [
		"Semantic code search using AI-powered understanding of code intent and functionality",
		"Structural analysis of classes, functions, interfaces, and other code elements",
		"Git history analysis with commit pattern recognition and code evolution tracking",
		"Context-aware search that considers current workspace and file relationships",
		"Multi-language support including TypeScript, JavaScript, Python, Java, and more",
		"Code quality assessment with suggestions for improvements",
		"Pattern detection and architectural insights",
		"Relevance scoring and intelligent result ranking",
		"Integration with VSCode workspace symbols and search capabilities",
		"Real-time analysis with performance optimization",
		"USAGE: Use semantic search for conceptual queries like 'authentication logic' or 'error handling patterns'",
		"USAGE: Use structural search for specific code elements like 'UserService class methods' or 'API endpoints'",
		"USAGE: Use historical search to understand code evolution, bug fixes, and recent changes",
		"USAGE: Use contextual search for getting relevant suggestions based on current work context",
		"USAGE: Combine with scope parameter to focus search on specific directories or file types",
		"USAGE: Enable Git history for comprehensive understanding of code changes and patterns",
		"LIMITATIONS: Requires valid workspace with accessible source code files",
		"LIMITATIONS: Git history analysis requires Git repository with commit history",
		"LIMITATIONS: Performance may vary with very large codebases (>1M lines)",
		"LIMITATIONS: Analysis quality depends on code documentation and structure",
	],
	examples: [
		{
			description: "Search for authentication implementation patterns",
			output: `<context_engine_agent>
<query>user authentication and login functionality</query>
<searchType>semantic</searchType>
<includeGitHistory>true</includeGitHistory>
<analysisDepth>deep</analysisDepth>
</context_engine_agent>`,
		},
		{
			description: "Find specific class methods in services directory",
			output: `<context_engine_agent>
<query>UserService class methods</query>
<searchType>structural</searchType>
<scope>src/services</scope>
<maxResults>15</maxResults>
</context_engine_agent>`,
		},
		{
			description: "Analyze recent bug fixes in payment module",
			output: `<context_engine_agent>
<query>payment processing bug fixes</query>
<searchType>historical</searchType>
<scope>src/payment</scope>
<maxResults>10</maxResults>
</context_engine_agent>`,
		},
		{
			description: "Get contextual suggestions for database operations",
			output: `<context_engine_agent>
<query>database connection and query handling</query>
<searchType>contextual</searchType>
<analysisDepth>comprehensive</analysisDepth>
</context_engine_agent>`,
		},
		{
			description: "Search for API endpoint implementations",
			output: `<context_engine_agent>
<query>REST API endpoint definitions</query>
<searchType>structural</searchType>
<scope>src/api</scope>
<includeGitHistory>true</includeGitHistory>
</context_engine_agent>`,
		},
		{
			description: "Find error handling patterns across the codebase",
			output: `<context_engine_agent>
<query>error handling and exception management</query>
<searchType>semantic</searchType>
<maxResults>20</maxResults>
<analysisDepth>comprehensive</analysisDepth>
</context_engine_agent>`,
		},
	],
}
