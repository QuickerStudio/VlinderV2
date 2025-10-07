# Replace String Tool Implementation

## Overview
Successfully implemented the `replace_string_in_file` tool from vscode-copilot-chat into the Vlinder system.

**Status**: ✅ Complete (100%)  
**Date**: 2025-10-04

## What It Does
The `replace_string_in_file` tool allows the AI agent to replace all occurrences of an exact string in a file with a new string. It includes:
- Exact string matching (all occurrences)
- User approval flow before applying changes
- Similarity-based error suggestions when string not found
- Diff preview in UI showing old vs new strings
- Occurrence count display

## Files Created

### 1. Schema Definition
**File**: `extension/src/agent/v1/tools/schema/replace-string.ts`

Defines the Zod schema for tool parameters:
```typescript
{
  explanation: string,  // Why this replacement is needed
  filePath: string,     // Path to the file to edit
  oldString: string,    // Exact string to find and replace
  newString: string     // New string to replace with
}
```

### 2. Tool Runner
**File**: `extension/src/agent/v1/tools/runners/replace-string.tool.ts`

Implements the tool execution logic:
- Validates file exists and is readable
- Finds all occurrences of the exact string
- Provides similarity-based suggestions if string not found
- Asks user for approval with occurrence count
- Applies changes using VS Code WorkspaceEdit API
- Returns success/failure status

**Key Methods**:
- `execute()`: Main execution flow
- `findOccurrences()`: Finds all exact matches in file
- `calculateSimilarity()`: Levenshtein distance for error suggestions

### 3. Prompt Definition
**File**: `extension/src/agent/v1/prompts/tools/replace-string.ts`

Defines the AI prompt with:
- Tool capabilities description
- 5 detailed usage examples
- Emphasis on exact matching requirement
- Best practices for using the tool

### 4. UI Component
**File**: `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx`

Added `ReplaceStringBlock` component (lines 2178-2263):
- Displays explanation, file path, and occurrence count
- Shows/hides diff view with toggle button
- Color-coded old (red) vs new (green) strings
- Loading, success, and error states
- Collapsible design with summary

## Registrations Completed

### Backend (Extension)
1. ✅ Schema exported in `tools/schema/index.ts` (line 26, 52, 80)
2. ✅ Runner exported in `tools/index.ts` (line 19)
3. ✅ Tool mapped in `tool-executor.ts` (line 28, 150)
4. ✅ Prompt registered in `prompts/tools/index.ts` (line 21, 44)
5. ✅ Type added to `tools/types/index.ts` (line 33, 70)

### Frontend (Webview)
6. ✅ Type defined in `shared/new-tools.ts` (lines 238-245)
7. ✅ Added to ChatTool union (line 273)
8. ✅ UI component created in `chat-tools.tsx` (lines 2178-2263)
9. ✅ Case added to ToolRenderer switch (line 2318)

## Usage Example

The AI agent can now use this tool like:

```xml
<replace_string_in_file>
  <explanation>Update API endpoint URL to production server</explanation>
  <filePath>src/config/api.ts</filePath>
  <oldString>https://dev.api.example.com</oldString>
  <newString>https://api.example.com</newString>
</replace_string_in_file>
```

The user will see:
1. A tool block showing the file path and number of occurrences
2. The explanation for why the change is needed
3. A "Show Diff" button to preview old vs new strings
4. Approval buttons to accept or reject the change

## Key Features

### 1. Exact Matching
- Finds ALL occurrences of the exact string
- Case-sensitive matching
- No regex or partial matching

### 2. Error Handling
- Validates file exists and is readable
- Checks if string exists in file
- Provides similarity-based suggestions if not found
- Shows top 3 similar strings with similarity scores

### 3. User Approval Flow
- Shows occurrence count before applying
- User can approve or reject
- Changes applied atomically (all or nothing)

### 4. UI/UX
- Collapsible design with summary
- Diff preview with color coding
- Loading states during execution
- Success/error feedback

## Testing Recommendations

1. **Basic Replacement**: Replace a simple string in a file
2. **Multiple Occurrences**: Replace a string that appears multiple times
3. **String Not Found**: Try to replace a non-existent string (should show suggestions)
4. **Special Characters**: Test with strings containing quotes, newlines, etc.
5. **Large Files**: Test performance with files containing many occurrences
6. **Edge Cases**: Empty strings, very long strings, Unicode characters

## Next Steps

With `replace_string_in_file` complete, the next recommended tools to implement are:

1. **multi_replace_string_in_file** - Batch replacement operations across multiple files
2. **insert_edit_into_file** - Insert code at specific line numbers
3. **fetch_webpage** - Fetch and index web page content (requires embedding infrastructure)

See `docs/TOOL_INTEGRATION_STATUS.md` for the complete roadmap.

## Related Files

- Source reference: `vscode-copilot-chat-main/src/extension/tools/node/replaceStringTool.tsx`
- Integration status: `docs/TOOL_INTEGRATION_STATUS.md`
- Tool creation guide: `docs/TOOL_CREATION_GUIDE.md` (if exists)

