import { ToolPromptSchema } from '../utils/utils';

export const patternSearchPrompt: ToolPromptSchema = {
	name: 'pattern_search',
	description:
		'**PATTERN RELATIONSHIP ANALYZER** - Analyze how patterns are used across a specific set of files to understand code architecture, dependencies, and design patterns. Unlike grep_search (discovers files) or search_files (searches directories), this tool provides DEEP ANALYSIS of pattern usage in files you already identified, including statistical insights, relationship mapping, and architectural recommendations.',
	parameters: {
		searchPattern: {
			type: 'string',
			description:
				'The pattern to search for. Supports both plain text and regular expressions. Examples: "BaseAgentTool", "function.*\\(", "import.*from"',
			required: true,
		},
		files: {
			type: 'array',
			description:
				'REQUIRED: Specific file paths to analyze. Must be files you already identified (e.g., from grep_search results). Can be exact paths ["src/tools/fast-editor.tool.ts"] or glob patterns ["src/tools/**/*.ts"]. Maximum 100 files.',
			required: true,
		},
		caseSensitive: {
			type: 'boolean',
			description:
				'Whether the search should be case-sensitive. Default is false (case-insensitive)',
			required: false,
		},
		contextLinesBefore: {
			type: 'number',
			description:
				'Number of lines to show BEFORE each match for context. Default is 5, max is 20. Use 10-20 for understanding function implementations, 0-5 for quick verification.',
			required: false,
		},
		contextLinesAfter: {
			type: 'number',
			description:
				'Number of lines to show AFTER each match for context. Default is 5, max is 20. Use 10-20 for understanding function implementations, 0-5 for quick verification.',
			required: false,
		},
	},
	capabilities: [
		'**PATTERN RELATIONSHIP ANALYSIS**: Understand how patterns connect across files (imports, inheritance, dependencies)',
		'**STATISTICAL INSIGHTS**: Pattern distribution by file type, directory, usage context with percentages and rankings',
		'**ARCHITECTURAL RECOMMENDATIONS**: AI-generated insights about code concentration, cross-cutting concerns, refactoring opportunities',
		'**USAGE CONTEXT DETECTION**: Automatically categorize pattern usage (imports, class definitions, function calls, comments)',
		'**REGEX PATTERN SUPPORT**: Full regular expression support with pattern validation and performance warnings',
		'**PERFORMANCE MONITORING**: Search time tracking and complex pattern warnings',
		'**RICH CONTEXTUAL OUTPUT**: Configurable context lines (0-20) to see surrounding code implementation',
	],
	examples: [
		{
			description: 'GOOD: Find how "BaseAgentTool" is used across known tool files',
			output: `<pattern_search>
  <searchPattern>BaseAgentTool</searchPattern>
  <files>["src/agent/v1/tools/runners/fast-editor.tool.ts", "src/agent/v1/tools/runners/grep-search.tool.ts", "src/agent/v1/tools/runners/pattern-search.tool.ts"]</files>
  <contextLinesBefore>3</contextLinesBefore>
  <contextLinesAfter>3</contextLinesAfter>
</pattern_search>`,
		},
		{
			description: 'GOOD: Compare how "execute()" method is implemented in different tools',
			output: `<pattern_search>
  <searchPattern>async execute()</searchPattern>
  <files>["src/agent/v1/tools/runners/*.tool.ts"]</files>
  <contextLinesBefore>10</contextLinesBefore>
  <contextLinesAfter>15</contextLinesAfter>
</pattern_search>`,
		},
		{
			description: 'GOOD: Find all imports of a specific module in known components',
			output: `<pattern_search>
  <searchPattern>import { Button }</searchPattern>
  <files>["src/components/Header.tsx", "src/components/Footer.tsx", "src/pages/Home.tsx"]</files>
  <contextLinesBefore>0</contextLinesBefore>
  <contextLinesAfter>0</contextLinesAfter>
</pattern_search>`,
		},
		{
			description: 'BAD: Do NOT use for whole codebase search - use grep_search instead',
			output: `<!-- WRONG: This should use grep_search, not pattern_search -->
<pattern_search>
  <searchPattern>TODO</searchPattern>
  <files>["**/*"]</files>
</pattern_search>`,
		},
	],
	extraDescriptions: `## pattern_search - PATTERN RELATIONSHIP ANALYZER

### CORE PURPOSE: Deep Pattern Analysis for Architecture Understanding

This tool is a **PATTERN RELATIONSHIP ANALYZER**, not just a search tool. It provides:
- Statistical analysis of pattern distribution across files
- Automatic detection of usage contexts (imports, classes, functions, comments)
- Architectural insights and refactoring recommendations
- Pattern concentration and cross-cutting concern detection
- Performance monitoring and regex validation

### TOOL DIFFERENTIATION - When to Use Each Tool

#### pattern_search (THIS TOOL) - Pattern Relationship Analyzer
**Use when:** You have a specific set of files and need to ANALYZE how patterns are used
**Strengths:**
- Deep statistical analysis (distribution by file type, directory, usage context)
- Architectural insights (concentration analysis, cross-cutting concerns)
- Rich context (0-20 configurable lines before/after)
- Regex support with validation and performance warnings
- Usage context detection (imports vs classes vs functions)
**Output:** Analysis report with statistics, insights, and recommendations
**Example:** "Analyze how BaseAgentTool is used across these 12 tool files"

#### grep_search - Global Discovery Tool
**Use when:** You DON'T know which files contain the pattern
**Strengths:**
- Searches entire codebase
- Fast file discovery
- Respects .gitignore
**Output:** List of files with simple previews
**Example:** "Find all files that contain TODO comments"

#### search_files - Directory Regex Search
**Use when:** You know the directory but need regex search
**Strengths:**
- Ripgrep-based (very fast)
- Directory-scoped search
- Regex support
**Output:** Matches with context in specified directory
**Example:** "Search for function definitions in src/utils directory"

### WHEN TO USE pattern_search

USE pattern_search when:
1. You already identified files (from grep_search, list_files, or manual selection)
2. You need to UNDERSTAND how a pattern is used (not just find it)
3. You want statistical insights (distribution, concentration, frequency)
4. You need architectural recommendations
5. You want to compare implementations across specific files
6. You need rich context to understand code relationships

TYPICAL WORKFLOW:
Step 1: Use grep_search to discover files
  <grep_search><query>BaseAgentTool</query></grep_search>
  Result: Found in 12 files

Step 2: Use pattern_search to analyze those files
  <pattern_search>
    <searchPattern>BaseAgentTool</searchPattern>
    <files>["src/tools/*.tool.ts"]</files>
    <contextLinesBefore>10</contextLinesBefore>
    <contextLinesAfter>10</contextLinesAfter>
  </pattern_search>
  Result: Analysis report showing:
  - 88.9% usage in .ts files
  - 77.8% concentrated in tools/runners directory
  - Detected as "Class/Interface definition" in 12 cases
  - Recommendation: This is a base class pattern

### WHEN NOT TO USE pattern_search

DO NOT use pattern_search when:
- You don't know which files to search (use grep_search)
- You just need to find files (use grep_search or list_files)
- You need language-aware symbol search (use search_symbol)
- You just want to read a file (use read_file)
- You need to search a whole directory (use search_files)

### KEY FEATURES THAT DIFFERENTIATE pattern_search

1. STATISTICAL ANALYSIS
   - Pattern distribution by file type (e.g., "88.9% in .ts files")
   - Pattern distribution by directory (e.g., "77.8% in tools/runners")
   - Usage context detection (imports, classes, functions, comments)
   - File ranking by pattern usage (top 10 files)
   - Average matches per file calculation

2. ARCHITECTURAL INSIGHTS
   - Concentration analysis (is pattern centralized or distributed?)
   - Cross-cutting concern detection (used across many file types?)
   - Localization detection (all in one directory?)
   - Usage frequency analysis (heavily used or sparse?)
   - Refactoring recommendations based on data

3. REGEX SUPPORT WITH VALIDATION
   - Full regular expression support
   - Automatic pattern type detection (literal, regex, TODO marker, etc.)
   - Pattern validation before search
   - Performance warnings for complex patterns
   - Error messages distinguish "no matches" from "invalid regex"

4. PERFORMANCE MONITORING
   - Search time tracking (displayed in milliseconds)
   - Complex pattern warnings
   - Large file skipping (>5MB)
   - File count limits (max 100 files)

5. RICH CONTEXTUAL OUTPUT
   - Configurable context lines (0-20 before/after)
   - Structured output with 7 sections:
     * Executive Summary (pattern type, warnings, statistics)
     * Distribution by File Type (with percentage bars)
     * Distribution by Directory
     * Usage Context Patterns
     * Files Ranked by Usage
     * Detailed Matches with Context
     * Insights and Recommendations

### 💡 USAGE PATTERNS FOR BUILDING CODE MODELS

#### Pattern 1: Understanding Component Dependencies
\`\`\`
Step 1: Find components that might use a module
  <grep_search><query>import.*Button</query></grep_search>

Step 2: Examine HOW they use it with context
  <pattern_search>
    <searchPattern>Button</searchPattern>
    <files>["src/components/Header.tsx", "src/components/Footer.tsx"]</files>
    <contextLinesBefore>5</contextLinesBefore>
    <contextLinesAfter>5</contextLinesAfter>
  </pattern_search>
\`\`\`

#### Pattern 2: Comparing Implementations
\`\`\`
Step 1: List all tool files
  <list_files><path>src/agent/v1/tools/runners</path></list_files>

Step 2: Compare how they implement execute()
  <pattern_search>
    <searchPattern>async execute()</searchPattern>
    <files>["src/agent/v1/tools/runners/*.tool.ts"]</files>
    <contextLinesBefore>10</contextLinesBefore>
    <contextLinesAfter>20</contextLinesAfter>
  </pattern_search>
\`\`\`

#### Pattern 3: Tracing Code Flow
\`\`\`
Step 1: Find where a function is called
  <grep_search><query>processData</query></grep_search>

Step 2: See the calling context in each file
  <pattern_search>
    <searchPattern>processData</searchPattern>
    <files>["src/services/data.service.ts", "src/controllers/data.controller.ts"]</files>
    <contextLinesBefore>8</contextLinesBefore>
    <contextLinesAfter>8</contextLinesAfter>
  </pattern_search>
\`\`\`

### 🎓 BEST PRACTICES

1. **Always specify exact files or tight glob patterns**
   - ✅ GOOD: \`["src/tools/fast-editor.tool.ts", "src/tools/grep-search.tool.ts"]\`
   - ✅ GOOD: \`["src/tools/**/*.tool.ts"]\`
   - ❌ BAD: \`["**/*"]\` (use grep_search instead)

2. **Adjust context based on your goal**
   - Understanding architecture: 10-20 lines
   - Finding usage patterns: 5-10 lines
   - Verifying imports: 0-2 lines

3. **Use case-sensitive search strategically**
   - Class names: \`caseSensitive=true\`
   - Constants: \`caseSensitive=true\`
   - General text: \`caseSensitive=false\`

4. **Combine with other tools for workflow**
   - grep_search → pattern_search (discover → analyze)
   - list_files → pattern_search (list → examine)
   - codebase_search → pattern_search (semantic → detailed)

### ⚡ PERFORMANCE LIMITS

- **Maximum 100 files** per search (automatically limited)
- **Files > 5MB** are skipped (prevents memory issues)
- **Plain text only** (no regex - faster than grep_search for exact matches)

### 🔗 TOOL COMPARISON

| Tool | Purpose | File Selection | Pattern Type | Context |
|------|---------|----------------|--------------|---------|
| **pattern_search** | Analyze known files | You specify | Plain text | Rich (0-20 lines) |
| **grep_search** | Discover files | Whole codebase | Regex | Limited preview |
| **search_files** | Regex search | Directory-based | Regex | Context lines |
| **search_symbol** | Find definitions | Language-aware | Symbol name | Definition only |

### 📝 EXAMPLE WORKFLOWS

**Workflow 1: Understanding a New Tool's Architecture**
\`\`\`
1. <list_files><path>src/agent/v1/tools/runners</path></list_files>
2. <pattern_search>
     <searchPattern>BaseAgentTool</searchPattern>
     <files>["src/agent/v1/tools/runners/*.tool.ts"]</files>
     <contextLinesBefore>5</contextLinesBefore>
     <contextLinesAfter>5</contextLinesAfter>
   </pattern_search>
3. Now you understand: how all tools extend BaseAgentTool
\`\`\`

**Workflow 2: Refactoring Analysis**
\`\`\`
1. <grep_search><query>oldFunction</query></grep_search>
2. <pattern_search>
     <searchPattern>oldFunction</searchPattern>
     <files>[...files from grep_search...]</files>
     <contextLinesBefore>10</contextLinesBefore>
     <contextLinesAfter>10</contextLinesAfter>
   </pattern_search>
3. Now you see: all usage contexts to plan refactoring
\`\`\`

**Workflow 3: Dependency Mapping**
\`\`\`
1. <codebase_search><query>components that use authentication</query></codebase_search>
2. <pattern_search>
     <searchPattern>useAuth</searchPattern>
     <files>[...components from codebase_search...]</files>
     <contextLinesBefore>8</contextLinesBefore>
     <contextLinesAfter>8</contextLinesAfter>
   </pattern_search>
3. Now you understand: how authentication is integrated across components
\`\`\``,
};

