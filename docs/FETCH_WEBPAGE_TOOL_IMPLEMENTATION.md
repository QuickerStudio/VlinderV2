# Fetch Webpage Tool Implementation

## Overview
Successfully implemented the `fetch_webpage` tool from vscode-copilot-chat into the Vlinder system.

**Status**: ✅ Complete (100%)  
**Date**: 2025-10-04

## What It Does
The `fetch_webpage` tool allows the AI agent to fetch and extract content from web pages. It provides:
- Fetch content from any HTTP/HTTPS URL
- Convert HTML to Markdown for better readability
- Optional query parameter to filter relevant content
- Automatic content cleaning (removes scripts, styles, ads)
- 50KB content limit with truncation
- 30-second timeout

## Implementation Notes

### Simplified Version
This is a **simplified implementation** compared to the vscode-copilot-chat version:

**What's Included**:
- ✅ HTTP/HTTPS fetching using Node's fetch API
- ✅ HTML to Markdown conversion using turndown
- ✅ Content cleaning (removes scripts, styles, navigation, etc.)
- ✅ Simple text-based filtering when query is provided
- ✅ Error handling for network failures, timeouts, invalid URLs
- ✅ Content truncation for large pages

**What's NOT Included** (from original):
- ❌ Embedding/semantic search (UrlChunkEmbeddingsIndex)
- ❌ Chunking service integration
- ❌ Authentication token handling
- ❌ Image data extraction
- ❌ Caching of fetched pages
- ❌ Priority-based content ranking

These features can be added later if needed, but require additional infrastructure.

## Files Created

### 1. Schema Definition
**File**: `extension/src/agent/v1/tools/schema/fetch-webpage.ts`

Defines the Zod schema for tool parameters:
```typescript
{
  url: string,        // The URL to fetch (must be valid HTTP/HTTPS)
  query?: string      // Optional search query to filter content
}
```

### 2. Tool Runner
**File**: `extension/src/agent/v1/tools/runners/fetch-webpage.tool.ts`

Implements the tool execution logic:
- Validates URL format and protocol
- Fetches web page with timeout
- Converts HTML to Markdown using turndown
- Filters content based on query (if provided)
- Returns XML-formatted output

**Key Methods**:
- `execute()`: Main execution flow
- `extractTextFromHtml()`: Converts HTML to Markdown
- `filterContentByQuery()`: Simple text-based filtering
- `buildXmlOutput()`: Formats response as XML

### 3. Prompt Definition
**File**: `extension/src/agent/v1/prompts/tools/fetch-webpage.ts`

Defines the AI prompt with:
- Tool capabilities description
- 5 detailed usage examples
- Best practices for using the tool
- When to use vs when NOT to use
- Limitations and error handling

### 4. UI Component
**File**: `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx`

Added `FetchWebpageBlock` component (lines 2522-2617):
- Displays URL with clickable link
- Shows query parameter if provided
- Displays error messages
- Expandable content preview with toggle button
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
8. ✅ UI component created in `chat-tools.tsx`
9. ✅ Case added to ToolRenderer switch

## Usage Examples

### Example 1: Fetch documentation
```xml
<tool name="fetch_webpage">
  <url>https://docs.python.org/3/library/asyncio.html</url>
</tool>
```

### Example 2: Fetch with query filter
```xml
<tool name="fetch_webpage">
  <url>https://nodejs.org/api/fs.html</url>
  <query>readFile</query>
</tool>
```

### Example 3: Fetch GitHub README
```xml
<tool name="fetch_webpage">
  <url>https://github.com/microsoft/vscode/blob/main/README.md</url>
</tool>
```

## Key Features

### 1. HTML to Markdown Conversion
- Uses turndown library for conversion
- Preserves headings, links, code blocks
- Better readability than raw HTML
- Maintains document structure

### 2. Content Cleaning
- Removes `<script>`, `<style>`, `<noscript>` tags
- Removes navigation, footer, header elements
- Extracts main content from `<main>`, `<article>`, or `<body>`
- Cleans up excessive whitespace

### 3. Query-Based Filtering
- Simple text-based search
- Case-insensitive matching
- Includes context (surrounding lines)
- Separates matching sections with `---`

### 4. Error Handling
- Invalid URL detection
- Protocol validation (only HTTP/HTTPS)
- Network error handling
- Timeout handling (30 seconds)
- HTTP error status handling
- Content type validation

### 5. Content Limits
- Maximum 50KB of text content
- Automatic truncation with indicator
- Prevents overwhelming the context window

## Output Format

The tool returns content in XML format:
```xml
<webpage_content>
  <url>https://example.com</url>
  <query>optional search query</query>
  <content>
    Extracted and cleaned Markdown content from the page...
  </content>
</webpage_content>
```

## Common Use Cases

1. **Documentation lookup**: Fetch official documentation for libraries/frameworks
2. **Tutorial reading**: Get content from tutorial websites
3. **API reference**: Fetch API documentation
4. **Blog posts**: Read technical blog posts
5. **GitHub READMEs**: Fetch README files from repositories
6. **Release notes**: Check release notes for libraries

## Limitations

1. **No JavaScript execution**: Gets static HTML only
2. **No authentication**: Cannot fetch content behind login
3. **No binary files**: Only text/HTML content
4. **Content size limit**: 50KB maximum
5. **Timeout**: 30 seconds maximum
6. **No semantic search**: Simple text matching only
7. **No caching**: Fetches fresh content every time

## Future Enhancements

If needed, the following features from vscode-copilot-chat can be added:

1. **Embedding/Semantic Search**:
   - Integrate with embedding service
   - Chunk content for better retrieval
   - Rank chunks by relevance

2. **Caching**:
   - Cache fetched pages
   - Reduce redundant network requests
   - Faster repeated access

3. **Image Extraction**:
   - Extract and process images
   - Support for image-to-text models

4. **Authentication**:
   - Support for authenticated requests
   - Cookie handling
   - OAuth integration

## Testing Recommendations

1. **Valid URLs**: Test with various documentation sites
2. **Invalid URLs**: Test error handling
3. **Timeouts**: Test with slow-loading pages
4. **Large content**: Test truncation
5. **Query filtering**: Test with and without queries
6. **Different content types**: HTML, plain text, etc.
7. **Network errors**: Test offline/unreachable URLs

## Dependencies

- **turndown**: For HTML to Markdown conversion (already in package.json)
- **Node fetch API**: Built-in, no additional dependency

## Next Steps

With 5/10 tools complete (50%), the remaining tools to implement are:

1. **get_vscode_api** - Low priority, requires embedding infrastructure
2. **install_extension** - Low priority, extension installation

See `docs/TOOL_INTEGRATION_STATUS.md` for the complete roadmap.

## Related Files

- Source reference: `vscode-copilot-chat-main/src/extension/tools/vscode-node/fetchWebPageTool.tsx`
- Integration status: `docs/TOOL_INTEGRATION_STATUS.md`
- Related tools:
  - `docs/GET_ERRORS_TOOL_IMPLEMENTATION.md`
  - `docs/REPLACE_STRING_TOOL_IMPLEMENTATION.md`
  - `docs/MULTI_REPLACE_STRING_TOOL_IMPLEMENTATION.md`
  - `docs/INSERT_EDIT_TOOL_IMPLEMENTATION.md`

