# Get VS Code API Tool Implementation

## Overview
Successfully implemented the `get_vscode_api` tool from vscode-copilot-chat into the Vlinder system.

**Status**: ✅ Complete (100%)  
**Date**: 2025-10-04

## What It Does
The `get_vscode_api` tool allows the AI agent to search and retrieve VS Code API documentation. It provides:
- Search VS Code API documentation by query
- Fetch documentation from the official VS Code API reference
- Convert HTML documentation to Markdown
- Filter and return relevant API sections
- Help with VS Code extension development

## Implementation Notes

### Simplified Version
This is a **simplified implementation** compared to the vscode-copilot-chat version:

**What's Included**:
- ✅ Fetches from official VS Code API documentation website
- ✅ HTML to Markdown conversion for better readability
- ✅ Text-based search and filtering
- ✅ Returns top 5 most relevant sections
- ✅ Error handling for network failures and timeouts
- ✅ Direct links to official documentation

**What's NOT Included** (from original):
- ❌ Embedding/semantic search (IApiEmbeddingsIndex)
- ❌ Pre-computed embeddings for API documentation
- ❌ Semantic similarity ranking
- ❌ Local API documentation index
- ❌ Cached API documentation

These features require embedding infrastructure that doesn't exist in the Vlinder codebase yet.

## Files Created

### 1. Schema Definition
**File**: `extension/src/agent/v1/tools/schema/vscode-api.ts`

Defines the Zod schema for tool parameters:
```typescript
{
  query: string  // The search query for VS Code API documentation
}
```

### 2. Tool Runner
**File**: `extension/src/agent/v1/tools/runners/vscode-api.tool.ts`

Implements the tool execution logic:
- Fetches VS Code API documentation from code.visualstudio.com
- Converts HTML to Markdown using turndown
- Searches for relevant sections based on query
- Returns top 5 most relevant results
- Handles errors and timeouts

**Key Methods**:
- `execute()`: Main execution flow
- `extractApiDocs()`: Converts HTML to Markdown
- `searchApiDocs()`: Searches for relevant content
- `simpleSearch()`: Fallback simple text search
- `buildXmlOutput()`: Formats response as XML

### 3. Prompt Definition
**File**: `extension/src/agent/v1/prompts/tools/vscode-api.ts`

Defines the AI prompt with:
- Tool capabilities description
- 5 detailed usage examples
- Best practices for using the tool
- When to use vs when NOT to use
- Limitations and error handling

### 4. UI Component
**File**: `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx`

Added `VscodeApiBlock` component (lines 2619-2699):
- Displays search query
- Shows result count
- Displays error messages
- Expandable results preview with toggle button
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

### Example 1: Search for window API
```xml
<tool name="get_vscode_api">
  <query>window</query>
</tool>
```

### Example 2: Search for specific method
```xml
<tool name="get_vscode_api">
  <query>window.showInformationMessage</query>
</tool>
```

### Example 3: Search for TextEditor
```xml
<tool name="get_vscode_api">
  <query>TextEditor</query>
</tool>
```

### Example 4: Search for commands
```xml
<tool name="get_vscode_api">
  <query>commands.registerCommand</query>
</tool>
```

### Example 5: Search for workspace API
```xml
<tool name="get_vscode_api">
  <query>workspace.openTextDocument</query>
</tool>
```

## Key Features

### 1. Live Documentation Fetching
- Fetches from https://code.visualstudio.com/api/references/vscode-api
- Always gets the latest documentation
- No need for local index maintenance

### 2. HTML to Markdown Conversion
- Uses turndown library for conversion
- Preserves headings, links, code blocks
- Better readability than raw HTML
- Maintains document structure

### 3. Content Filtering
- Searches for sections containing the query
- Includes context around matches
- Returns top 5 most relevant sections
- Fallback to simple paragraph search

### 4. Error Handling
- Network error handling
- Timeout handling (30 seconds)
- HTTP error status handling
- Graceful degradation

### 5. Result Formatting
- XML-formatted output
- Includes query, result count, and documentation URL
- Escaped XML for safe parsing
- Structured results

## Output Format

The tool returns content in XML format:
```xml
<vscode_api_documentation>
  <query>search query</query>
  <result_count>5</result_count>
  <documentation_url>https://code.visualstudio.com/api/references/vscode-api</documentation_url>
  <results>
    <result index="1">
      Markdown content of first result...
    </result>
    <result index="2">
      Markdown content of second result...
    </result>
    ...
  </results>
</vscode_api_documentation>
```

## Common Use Cases

1. **API lookup**: Find information about specific VS Code APIs
2. **Method signatures**: Get method signatures and parameters
3. **Interface details**: Understand VS Code interfaces
4. **Namespace exploration**: Explore window, workspace, commands namespaces
5. **Extension development**: Get help with VS Code extension development
6. **API discovery**: Discover available APIs for specific tasks

## Limitations

1. **No semantic search**: Uses simple text matching, not embedding-based search
2. **No local cache**: Fetches fresh content every time
3. **Internet required**: Requires connection to code.visualstudio.com
4. **Limited results**: Returns top 5 sections only
5. **No proposed APIs**: May not include very new or proposed APIs immediately
6. **Text-based matching**: May miss relevant results with different terminology

## Future Enhancements

If needed, the following features from vscode-copilot-chat can be added:

1. **Embedding/Semantic Search**:
   - Build local API documentation index
   - Use embeddings for semantic similarity
   - Better ranking of results

2. **Caching**:
   - Cache fetched documentation
   - Reduce network requests
   - Faster repeated searches

3. **Local Index**:
   - Pre-process API documentation
   - Build searchable index
   - Offline capability

4. **Enhanced Filtering**:
   - Better relevance scoring
   - Category-based filtering
   - API stability filtering (stable vs proposed)

## Testing Recommendations

1. **Common APIs**: Test with window, workspace, commands
2. **Specific methods**: Test with full method names
3. **Interfaces**: Test with TextEditor, Diagnostic, etc.
4. **Error cases**: Test with invalid queries, network errors
5. **Timeout**: Test with slow connections
6. **No results**: Test with queries that don't match

## Dependencies

- **turndown**: For HTML to Markdown conversion (already in package.json)
- **Node fetch API**: Built-in, no additional dependency

## Next Steps

With 6/10 tools complete (60%), the remaining tools to implement are:

1. **install_extension** - Low priority, extension installation

See `docs/TOOL_INTEGRATION_STATUS.md` for the complete roadmap.

## Related Files

- Source reference: `vscode-copilot-chat-main/src/extension/tools/node/vscodeAPITool.ts`
- Integration status: `docs/TOOL_INTEGRATION_STATUS.md`
- Related tools:
  - `docs/GET_ERRORS_TOOL_IMPLEMENTATION.md`
  - `docs/REPLACE_STRING_TOOL_IMPLEMENTATION.md`
  - `docs/MULTI_REPLACE_STRING_TOOL_IMPLEMENTATION.md`
  - `docs/INSERT_EDIT_TOOL_IMPLEMENTATION.md`
  - `docs/FETCH_WEBPAGE_TOOL_IMPLEMENTATION.md`

## Comparison with vscode-copilot-chat

### vscode-copilot-chat Implementation
- Uses `VSCodeAPIContextElement` for rendering
- Relies on `IApiEmbeddingsIndex` for semantic search
- Pre-computed embeddings for API documentation
- Semantic similarity ranking
- Requires embedding infrastructure

### Vlinder Implementation
- Direct fetch from official documentation
- Text-based search and filtering
- No pre-computed index required
- Simpler, more maintainable
- Always up-to-date with official docs

Both approaches have trade-offs:
- **vscode-copilot-chat**: Better search quality, offline capability, faster
- **Vlinder**: Simpler, always current, no infrastructure needed

