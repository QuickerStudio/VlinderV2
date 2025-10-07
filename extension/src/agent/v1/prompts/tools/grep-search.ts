import { ToolPromptSchema } from '../utils/utils';

export const grepSearchPrompt: ToolPromptSchema = {
	name: 'grep_search',
	description:
		'Search for text patterns in files using regex. Fast and efficient for finding code, text, or patterns across the codebase.',
	parameters: {
		query: {
			type: 'string',
			description: 'The regex pattern to search for',
			required: true,
		},
		includePattern: {
			type: 'string',
			description: "Optional glob pattern for files to include (e.g., '*.ts')",
			required: false,
		},
		caseSensitive: {
			type: 'boolean',
			description:
				'Whether the search should be case-sensitive (default: false)',
			required: false,
		},
		maxResults: {
			type: 'number',
			description: 'Maximum number of results to return (default: 100)',
			required: false,
		},
	},
	capabilities: [
		'Fast regex-based text search across files',
		'Support for glob patterns to filter files',
		'Case-sensitive and case-insensitive search',
		'Configurable result limits',
		'Returns file paths, line numbers, and matching content',
	],
	examples: [
		{
			description: 'Search for a function definition',
			output: `<grep_search>
  <query>function handleClick</query>
</grep_search>`,
		},
		{
			description: 'Search in TypeScript files only',
			output: `<grep_search>
  <query>interface.*Props</query>
  <includePattern>**/*.ts</includePattern>
</grep_search>`,
		},
		{
			description: 'Case-sensitive search',
			output: `<grep_search>
  <query>TODO</query>
  <caseSensitive>true</caseSensitive>
</grep_search>`,
		},
	],
	extraDescriptions: `## grep_search

Search for text patterns in files across the workspace using VS Code's built-in search.

### Capabilities
- Search for text or regex patterns in files
- Filter by file patterns (glob patterns)
- Automatic retry with plain text if regex fails
- Respects .gitignore and VS Code search settings
- Returns file paths, line numbers, and preview text

### When to Use
Use this tool when you need to:
- Find all occurrences of a specific text or pattern
- Search for code patterns across multiple files
- Locate specific strings, functions, or identifiers
- Find TODO comments, error messages, or specific keywords
- Search within specific file types or directories

### When NOT to Use
- For semantic code search (use codebase search instead)
- For finding files by name (use list_files or explore_repo_folder instead)
- For reading file contents (use read_file instead)
- For getting file structure (use explore_repo_folder instead)

### Parameters
- **query** (required): The text or regex pattern to search for
  - Can be plain text (e.g., "TODO", "function myFunc")
  - Can be a regex pattern (e.g., "function\\s+\\w+", "import.*from")
  - Case-insensitive by default
  
- **isRegexp** (optional): Whether the query is a regular expression
  - Default: true
  - Set to false for exact text matching
  - Invalid regex will return an error
  
- **includePattern** (optional): Glob pattern to filter files
  - Examples: "*.ts", "src/**/*.js", "**/*.tsx"
  - Automatically normalized (adds **/ prefix if needed)
  - Can specify directories: "src/" becomes "src/**"
  
- **maxResults** (optional): Maximum number of results to return
  - Default: 20
  - Maximum: 200 (automatically capped)
  - Set higher for comprehensive searches

### Output Format
Returns XML-formatted results with:
- Total number of matches
- Number of files matched
- File paths with line numbers and previews
- Indication if more results are available

### Examples

#### Example 1: Simple text search
<grep_search>
  <query>TODO</query>
</grep_search>

Finds all TODO comments in the workspace.

#### Example 2: Regex search in TypeScript files
<grep_search>
  <query>function\\s+\\w+</query>
  <isRegexp>true</isRegexp>
  <includePattern>*.ts</includePattern>
</grep_search>

Finds all function declarations in TypeScript files.

#### Example 3: Search imports in JavaScript files
<grep_search>
  <query>import.*from</query>
  <includePattern>src/**/*.js</includePattern>
  <maxResults>50</maxResults>
</grep_search>

Finds all import statements in JavaScript files under src/ directory.

#### Example 4: Plain text search in log files
<grep_search>
  <query>Error</query>
  <isRegexp>false</isRegexp>
  <includePattern>*.log</includePattern>
</grep_search>

Finds the word "Error" in log files (exact text match).

#### Example 5: Search class definitions in React files
<grep_search>
  <query>class\\s+\\w+\\s+extends</query>
  <includePattern>**/*.tsx</includePattern>
</grep_search>

Finds all class component definitions in TypeScript React files.

### Best Practices

1. **Use specific patterns**: More specific queries return more relevant results
2. **Filter by file type**: Use includePattern to narrow down the search
3. **Start with regex**: The tool defaults to regex and auto-retries with plain text
4. **Escape regex characters**: Use \\\\ for backslashes in regex patterns
5. **Increase maxResults**: For comprehensive searches, set maxResults higher
6. **Check for more results**: The output indicates if more results are available

### Regex Tips

- **Word boundaries**: Use \\\\b for word boundaries (e.g., "\\\\bfunction\\\\b")
- **Whitespace**: Use \\\\s for any whitespace character
- **Word characters**: Use \\\\w for letters, digits, underscore
- **Quantifiers**: Use + (one or more), * (zero or more), ? (optional)
- **Groups**: Use () for grouping
- **Alternatives**: Use | for OR (e.g., "function|class")

### Common Patterns

- **Function declarations**: "function\\s+\\w+"
- **Class declarations**: "class\\s+\\w+"
- **Import statements**: "import.*from"
- **Export statements**: "export\\s+(default\\s+)?(class|function|const)"
- **TODO comments**: "TODO|FIXME|HACK"
- **Console logs**: "console\\.(log|error|warn)"
- **Async functions**: "async\\s+function"

### Error Handling

The tool will return an error if:
- Invalid regex pattern is provided
- Search operation fails
- No workspace is open

If regex search returns no results, the tool automatically retries with plain text search.

### Limitations

- Maximum 200 results (automatically capped)
- Case-insensitive search only
- No word-match-only option
- Preview limited to 1000 characters per line
- Respects VS Code's search exclude settings

### Comparison with search_files

**grep_search** (this tool):
- Uses VS Code's workspace.findTextInFiles API
- Respects .gitignore and VS Code settings
- Better VS Code integration
- Automatic plain text retry

**search_files**:
- Uses ripgrep directly
- More control over search options
- Potentially faster for large codebases
- More flexible filtering

Use grep_search for general searches and search_files when you need more control.

### Related Tools

- **search_files**: Alternative search using ripgrep
- **list_files**: Find files by name
- **read_file**: Read file contents
- **explore_repo_folder**: Get directory structure
- **codebase_search**: Semantic code search`,
};
