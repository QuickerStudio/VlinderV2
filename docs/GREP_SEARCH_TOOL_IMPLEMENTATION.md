# Grep Search Tool Implementation

## Overview
Successfully implemented the `grep_search` tool (FindTextInFiles) from vscode-copilot-chat into the Vlinder system.

**Status**: ✅ Complete (100%)  
**Date**: 2025-10-04

## What It Does
The `grep_search` tool allows the AI agent to search for text patterns in files across the workspace. It provides:
- Search for text or regex patterns in files
- Filter by file patterns (glob patterns)
- Automatic retry with plain text if regex fails
- Returns file paths, line numbers, and preview text
- Respects .gitignore and VS Code search settings

## Implementation Notes

### VS Code API-Based Implementation
This tool uses **VS Code's workspace.findTextInFiles API** instead of ripgrep:

**What's Included**:
- ✅ Uses VS Code's built-in search infrastructure
- ✅ Respects .gitignore and VS Code search exclude settings
- ✅ Automatic retry with plain text if regex search fails
- ✅ Glob pattern filtering (e.g., *.ts, src/**/*.js)
- ✅ Context lines before/after matches
- ✅ Maximum 200 results (automatically capped)
- ✅ Regex validation

**Comparison with search_files**:
- **grep_search** (this tool): Uses VS Code API, respects VS Code settings, better integration
- **search_files** (existing): Uses ripgrep directly, more control, potentially faster

Both tools are available and can be used based on the use case.

## Files Created

### 1. Schema Definition
**File**: `extension/src/agent/v1/tools/schema/grep-search.ts`

Defines the Zod schema for tool parameters:
```typescript
{
  query: string,           // The text or regex pattern to search for
  isRegexp?: boolean,      // Whether the query is a regex (default: true)
  includePattern?: string, // Optional glob pattern to filter files
  maxResults?: number      // Maximum results (default: 20, max: 200)
}
```

### 2. Tool Runner
**File**: `extension/src/agent/v1/tools/runners/grep-search.tool.ts`

Implements the tool execution logic:
- Uses VS Code's workspace.findTextInFiles API
- Validates regex patterns
- Automatically retries with plain text if regex fails
- Normalizes glob patterns
- Returns XML-formatted results

**Key Methods**:
- `execute()`: Main execution flow
- `searchFiles()`: Performs the search using VS Code API
- `buildIncludePattern()`: Normalizes glob patterns
- `isValidRegex()`: Validates regex patterns
- `buildXmlOutput()`: Formats response as XML

### 3. Prompt Definition
**File**: `extension/src/agent/v1/prompts/tools/grep-search.ts`

Defines the AI prompt with:
- Tool capabilities description
- 5 detailed usage examples
- Best practices for using the tool
- Regex tips and common patterns
- When to use vs when NOT to use
- Comparison with search_files tool

### 4. UI Component
**File**: `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx`

Added `GrepSearchBlock` component (lines 2702-2831):
- Displays search query and parameters
- Shows regex/plain text mode
- Displays include pattern if specified
- Shows total matches and files matched
- Expandable matches view with file paths, line numbers, and previews
- Loading, success, and error states

## Registrations Completed

### Backend (Extension)
1. ✅ Schema exported in `tools/schema/index.ts`
2. ✅ Runner exported in `tools/index.ts`
3. ✅ Tool mapped in `tool-executor.ts`
4. ✅ Prompt registered in `prompts/tools/index.ts`
5. ✅ Type added to `tools/types/index.ts`

### Frontend (Webview)
6. ✅ Type defined in `shared/new-tools.ts`
7. ✅ Added to ChatTool union
8. ✅ Added to readOnlyTools array
9. ✅ UI component created in `chat-tools.tsx`
10. ✅ Case added to ToolRenderer switch

## Usage Examples

### Example 1: Simple text search
```xml
<tool name="grep_search">
  <query>TODO</query>
</tool>
```

### Example 2: Regex search in TypeScript files
```xml
<tool name="grep_search">
  <query>function\\s+\\w+</query>
  <isRegexp>true</isRegexp>
  <includePattern>*.ts</includePattern>
</tool>
```

### Example 3: Search imports in JavaScript files
```xml
<tool name="grep_search">
  <query>import.*from</query>
  <includePattern>src/**/*.js</includePattern>
  <maxResults>50</maxResults>
</tool>
```

### Example 4: Plain text search in log files
```xml
<tool name="grep_search">
  <query>Error</query>
  <isRegexp>false</isRegexp>
  <includePattern>*.log</includePattern>
</tool>
```

### Example 5: Search class definitions in React files
```xml
<tool name="grep_search">
  <query>class\\s+\\w+\\s+extends</query>
  <includePattern>**/*.tsx</includePattern>
</tool>
```

## Key Features

### 1. VS Code Integration
- Uses workspace.findTextInFiles API
- Respects .gitignore files
- Honors VS Code's search.exclude settings
- Integrates with VS Code's search infrastructure

### 2. Automatic Retry
- Defaults to regex search
- If regex returns no results, automatically retries with plain text
- Validates regex patterns before searching

### 3. Glob Pattern Filtering
- Filter by file extensions (*.ts, *.js)
- Filter by directories (src/**/*.tsx)
- Automatic pattern normalization (adds **/ prefix)

### 4. Result Formatting
- Returns file paths relative to workspace
- Includes line numbers and column positions
- Provides preview text for each match
- XML-formatted output for structured parsing

### 5. Result Limiting
- Default: 20 results
- Maximum: 200 results (automatically capped)
- Indicates if more results are available

## Output Format

The tool returns content in XML format:
```xml
<grep_search_results>
  <query>search pattern</query>
  <total_matches>15</total_matches>
  <files_matched>5</files_matched>
  <max_results>20</max_results>
  <include_pattern>*.ts</include_pattern>
  <matches>
    <file path="src/file1.ts">
      <match>
        <line>42</line>
        <column>10</column>
        <preview>  function myFunc() {</preview>
      </match>
    </file>
    ...
  </matches>
</grep_search_results>
```

## Common Use Cases

1. **Find TODO comments**: Search for "TODO", "FIXME", "HACK"
2. **Find function declarations**: Use regex "function\\s+\\w+"
3. **Find import statements**: Search for "import.*from"
4. **Find class definitions**: Use regex "class\\s+\\w+"
5. **Find console logs**: Search for "console\\.(log|error|warn)"
6. **Find specific errors**: Search in log files for error messages
7. **Find API usage**: Search for specific function calls

## Regex Tips

### Common Patterns
- **Function declarations**: `function\\s+\\w+`
- **Class declarations**: `class\\s+\\w+`
- **Import statements**: `import.*from`
- **Export statements**: `export\\s+(default\\s+)?(class|function|const)`
- **TODO comments**: `TODO|FIXME|HACK`
- **Console logs**: `console\\.(log|error|warn)`
- **Async functions**: `async\\s+function`

### Regex Syntax
- `\\s` - whitespace
- `\\w` - word character (letter, digit, underscore)
- `+` - one or more
- `*` - zero or more
- `?` - optional
- `|` - OR
- `()` - grouping
- `\\b` - word boundary

## Limitations

1. **Maximum 200 results**: Automatically capped to prevent overwhelming output
2. **Case-insensitive only**: No case-sensitive search option
3. **No word-match-only**: Cannot restrict to whole word matches
4. **Preview length**: Limited to 1000 characters per line
5. **Respects VS Code settings**: May exclude files based on search.exclude settings

## Comparison with search_files

### grep_search (this tool)
**Pros**:
- Better VS Code integration
- Respects .gitignore and VS Code settings
- Automatic plain text retry
- No external dependencies

**Cons**:
- May be slower for very large codebases
- Less control over search options
- Limited to VS Code's search capabilities

### search_files (existing tool)
**Pros**:
- Uses ripgrep (very fast)
- More control over search options
- Better for large codebases
- More flexible filtering

**Cons**:
- Requires ripgrep binary
- Doesn't respect VS Code settings
- No automatic retry

**Recommendation**: Use grep_search for general searches and search_files when you need more control or speed.

## Testing Recommendations

1. **Simple text search**: Test with common strings like "TODO"
2. **Regex search**: Test with function/class patterns
3. **Glob filtering**: Test with *.ts, src/**/*.js patterns
4. **Invalid regex**: Test error handling
5. **No results**: Test with non-existent patterns
6. **Large result sets**: Test with maxResults parameter
7. **Plain text retry**: Test with regex that returns no results

## Dependencies

- **VS Code API**: workspace.findTextInFiles (built-in)
- No external dependencies required

## Next Steps

With 7/10 tools complete (70%), the remaining tools to implement are:

1. **install_extension** - Low priority, extension installation

See `docs/TOOL_INTEGRATION_STATUS.md` for the complete roadmap.

## Related Files

- Source reference: `vscode-copilot-chat-main/src/extension/tools/node/findTextInFilesTool.tsx`
- Integration status: `docs/TOOL_INTEGRATION_STATUS.md`
- Related tools:
  - `docs/GET_ERRORS_TOOL_IMPLEMENTATION.md`
  - `docs/REPLACE_STRING_TOOL_IMPLEMENTATION.md`
  - `docs/MULTI_REPLACE_STRING_TOOL_IMPLEMENTATION.md`
  - `docs/INSERT_EDIT_TOOL_IMPLEMENTATION.md`
  - `docs/FETCH_WEBPAGE_TOOL_IMPLEMENTATION.md`
  - `docs/GET_VSCODE_API_TOOL_IMPLEMENTATION.md`

