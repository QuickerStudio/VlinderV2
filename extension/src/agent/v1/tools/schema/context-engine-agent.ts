import { z } from "zod"

/**
 * @tool context_engine_agent
 * @description Advanced codebase analysis and semantic search tool that provides intelligent code understanding, 
 * context-aware search, and Git history analysis. This tool acts as a specialized sub-agent for deep codebase exploration.
 * @schema
 * {
 *   query: string;                    // The search query or analysis request
 *   searchType: "semantic" | "structural" | "historical" | "contextual";  // Type of search to perform
 *   scope?: string;                   // Optional scope to limit search (file path, directory, or pattern)
 *   includeGitHistory?: boolean;      // Whether to include Git commit history in analysis
 *   maxResults?: number;              // Maximum number of results to return (default: 10)
 *   analysisDepth?: "shallow" | "deep" | "comprehensive";  // Depth of analysis
 * }
 * @example
 * ```xml
 * <tool name="context_engine_agent">
 *   <query>authentication implementation patterns</query>
 *   <searchType>semantic</searchType>
 *   <includeGitHistory>true</includeGitHistory>
 * </tool>
 * ```
 * @example
 * ```xml
 * <tool name="context_engine_agent">
 *   <query>UserService class methods</query>
 *   <searchType>structural</searchType>
 *   <scope>src/services</scope>
 *   <analysisDepth>deep</analysisDepth>
 * </tool>
 * ```
 * @example
 * ```xml
 * <tool name="context_engine_agent">
 *   <query>recent bug fixes in payment module</query>
 *   <searchType>historical</searchType>
 *   <scope>src/payment</scope>
 *   <maxResults>5</maxResults>
 * </tool>
 * ```
 */

export const SearchType = ["semantic", "structural", "historical", "contextual"] as const
export type SearchType = (typeof SearchType)[number]

export const AnalysisDepth = ["shallow", "deep", "comprehensive"] as const
export type AnalysisDepth = (typeof AnalysisDepth)[number]

const schema = z.object({
	query: z
		.string()
		.min(1)
		.describe("The search query or analysis request. Can be natural language or specific technical terms."),
	
	searchType: z
		.enum(SearchType)
		.describe(
			"Type of search to perform:\n" +
			"- semantic: AI-powered semantic understanding of code meaning and intent\n" +
			"- structural: Search based on code structure (classes, functions, imports)\n" +
			"- historical: Search through Git commit history and code evolution\n" +
			"- contextual: Context-aware search based on current file/position"
		),
	
	scope: z
		.string()
		.optional()
		.describe(
			"Optional scope to limit search. Can be:\n" +
			"- File path: 'src/components/Button.tsx'\n" +
			"- Directory: 'src/services/'\n" +
			"- Glob pattern: '**/*.test.ts'\n" +
			"- Language: 'typescript', 'javascript', 'python'"
		),
	
	includeGitHistory: z
		.boolean()
		.default(false)
		.describe("Whether to include Git commit history and code evolution analysis in results"),

	maxResults: z
		.number()
		.min(1)
		.max(50)
		.default(10)
		.describe("Maximum number of results to return (1-50, default: 10)"),

	analysisDepth: z
		.enum(AnalysisDepth)
		.default("deep")
		.describe(
			"Depth of analysis to perform:\n" +
			"- shallow: Quick surface-level analysis\n" +
			"- deep: Detailed analysis with context and relationships\n" +
			"- comprehensive: Full analysis including dependencies, usage patterns, and evolution"
		),
})

const examples = [
	{
		description: "Semantic search for authentication patterns",
		input: {
			query: "user authentication and authorization logic",
			searchType: "semantic" as const,
			includeGitHistory: true,
			analysisDepth: "deep" as const,
		},
		output: `Found 8 relevant code segments related to authentication:

1. **AuthService.authenticate()** (src/services/auth.service.ts:45-67)
   - Handles user login with JWT token generation
   - Includes password validation and rate limiting
   - Related commits: 3 recent changes for security improvements

2. **useAuth hook** (src/hooks/useAuth.ts:12-34)
   - React hook for authentication state management
   - Provides login, logout, and user context
   - Used in 12 components across the application

3. **AuthMiddleware** (src/middleware/auth.middleware.ts:8-28)
   - Express middleware for route protection
   - Validates JWT tokens and user permissions
   - Recently updated for role-based access control`,
	},
	{
		description: "Structural search for specific class methods",
		input: {
			query: "DatabaseConnection class methods",
			searchType: "structural" as const,
			scope: "src/database/",
			analysisDepth: "comprehensive" as const,
		},
		output: `DatabaseConnection class analysis:

**Class Definition**: src/database/connection.ts:15-89
- **connect()**: Establishes database connection with retry logic
- **disconnect()**: Safely closes connection with cleanup
- **query()**: Executes SQL queries with parameter binding
- **transaction()**: Handles database transactions
- **healthCheck()**: Monitors connection status

**Usage Patterns**:
- Instantiated in 5 service classes
- Most common usage: query execution (67% of calls)
- Error handling patterns: try-catch with connection retry

**Dependencies**:
- Uses pg (PostgreSQL driver)
- Integrates with connection pooling
- Logging via Winston logger`,
	},
	{
		description: "Historical search for recent changes",
		input: {
			query: "payment processing bug fixes",
			searchType: "historical" as const,
			scope: "src/payment/",
			maxResults: 5,
		},
		output: `Recent payment processing changes:

1. **Fix payment timeout handling** (commit: a1b2c3d, 2 days ago)
   - Fixed race condition in payment status updates
   - Added proper timeout handling for external API calls
   - Files: PaymentProcessor.ts, PaymentStatus.ts

2. **Resolve duplicate payment issue** (commit: d4e5f6g, 1 week ago)
   - Added idempotency key validation
   - Prevents duplicate charges for same transaction
   - Files: PaymentService.ts, PaymentValidator.ts

3. **Update Stripe API integration** (commit: h7i8j9k, 2 weeks ago)
   - Migrated to Stripe API v2023-10-16
   - Updated webhook signature validation
   - Files: StripeAdapter.ts, WebhookHandler.ts`,
	},
]

export const contextEngineAgentTool = {
	schema: {
		name: "context_engine_agent" as const,
		schema,
	},
	examples,
}

export type ContextEngineAgentToolParams = {
	name: typeof contextEngineAgentTool.schema.name
	input: z.infer<typeof schema>
}

// Additional types for internal use
export interface CodeSearchResult {
	id: string
	filePath: string
	startLine: number
	endLine: number
	content: string
	language: string
	chunkType: "function" | "class" | "method" | "interface" | "type" | "variable" | "comment" | "import"
	relevanceScore: number
	context?: string
	metadata: {
		name?: string
		parameters?: string[]
		returnType?: string
		accessibility?: "public" | "private" | "protected"
		isAsync?: boolean
		isStatic?: boolean
		parentClass?: string
		imports?: string[]
		exports?: string[]
	}
}

export interface GitHistoryResult {
	commitHash: string
	message: string
	author: string
	date: string
	filesChanged: string[]
	summary: string
	relevanceScore: number
	diffAnalysis?: {
		linesAdded: number
		linesRemoved: number
		functionsChanged: string[]
		classesChanged: string[]
	}
}

export interface ContextEngineAnalysisResult {
	query: string
	searchType: SearchType
	totalResults: number
	executionTime: number
	codeResults: CodeSearchResult[]
	gitResults?: GitHistoryResult[]
	insights: {
		patterns: string[]
		recommendations: string[]
		relatedConcepts: string[]
		codeQuality: {
			score: number
			issues: string[]
			suggestions: string[]
		}
	}
	summary: string
}
