# Multi Replace String Tool Implementation

## Overview
Successfully implemented the `multi_replace_string_in_file` tool from vscode-copilot-chat into the Vlinder system.

**Status**: ✅ Complete (100%)  
**Date**: 2025-10-04

## What It Does
The `multi_replace_string_in_file` tool allows the AI agent to perform multiple string replacements across one or more files in a single atomic operation. It includes:
- Multiple exact string replacements in one operation
- Automatic grouping and merging of replacements for the same file
- Atomic application (all successful replacements applied together)
- User approval flow before applying changes
- Detailed success/failure reporting per replacement
- Expandable UI showing all replacement details

## Files Created

### 1. Schema Definition
**File**: `extension/src/agent/v1/tools/schema/multi-replace-string.ts`

Defines the Zod schema for tool parameters:
```typescript
{
  explanation: string,           // Why these replacements are needed
  replacements: Array<{          // Array of replacement operations
    filePath: string,            // Path to the file to edit
    oldString: string,           // Exact string to find and replace
    newString: string            // New string to replace with
  }>
}
```

### 2. Tool Runner
**File**: `extension/src/agent/v1/tools/runners/multi-replace-string.tool.ts`

Implements the tool execution logic:
- Groups replacements by file for efficient processing
- Validates all files exist and are readable
- Finds all occurrences of each exact string
- Merges edits for the same file
- Applies all successful edits atomically using WorkspaceEdit
- Returns detailed success/failure stats

**Key Methods**:
- `execute()`: Main execution flow with approval and atomic application
- `processFileReplacements()`: Processes all replacements for a single file
- `findOccurrences()`: Finds all exact matches in file content

### 3. Prompt Definition
**File**: `extension/src/agent/v1/prompts/tools/multi-replace-string.ts`

Defines the AI prompt with:
- Tool capabilities description
- 5 detailed usage examples covering common scenarios
- Best practices for using the tool
- When to use vs when NOT to use

### 4. UI Component
**File**: `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx`

Added `MultiReplaceStringBlock` component (lines 2266-2421):
- Displays explanation and summary stats
- Shows success/failure counts
- Expandable details view showing all replacements grouped by file
- Color-coded old (red) vs new (green) strings for each replacement
- Error messages for failed replacements
- Loading, success, and error states
- Collapsible design with summary

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

## Usage Example

The AI agent can now use this tool like:

```xml
<tool name="multi_replace_string_in_file">
  <explanation>Rename getUserData to fetchUserData across the codebase</explanation>
  <replacements>
    <replacement>
      <filePath>src/api/users.ts</filePath>
      <oldString>getUserData</oldString>
      <newString>fetchUserData</newString>
    </replacement>
    <replacement>
      <filePath>src/components/UserProfile.tsx</filePath>
      <oldString>getUserData</oldString>
      <newString>fetchUserData</newString>
    </replacement>
    <replacement>
      <filePath>src/hooks/useUser.ts</filePath>
      <oldString>getUserData</oldString>
      <newString>fetchUserData</newString>
    </replacement>
  </replacements>
</tool>
```

The user will see:
1. A tool block showing the total number of replacements and files
2. The explanation for why the changes are needed
3. Success/failure stats
4. A "Show Details" button to expand and see all replacements
5. Approval buttons to accept or reject the changes

## Key Features

### 1. Batch Processing
- Processes multiple replacements in a single operation
- Groups replacements by file for efficiency
- Merges edits for the same file to avoid conflicts

### 2. Atomic Application
- All successful replacements are applied together
- Uses VS Code's WorkspaceEdit API for atomic updates
- If any file operation fails, others can still succeed

### 3. Detailed Reporting
- Shows success/failure count for each replacement
- Displays specific error messages for failed replacements
- Summary of applied changes with occurrence counts

### 4. Smart File Handling
- Validates file existence before processing
- Handles file read errors gracefully
- Sorts edits in reverse order to maintain positions

### 5. User Approval Flow
- Shows summary before applying
- User can approve or reject
- Loading state during execution
- Success/error feedback after completion

### 6. UI/UX
- Collapsible design with summary
- Expandable details showing all replacements
- Grouped by file for clarity
- Color-coded diff preview for each replacement
- Success/failure indicators

## Common Use Cases

1. **Rename across multiple files**: Rename a function, variable, or class across the codebase
2. **Update configuration**: Change API URLs, version numbers, or config values across multiple files
3. **Fix typos**: Correct spelling mistakes across documentation or code
4. **Update imports**: Change import paths after moving files
5. **Batch refactoring**: Update multiple related strings in one operation

## Testing Recommendations

1. **Single file, multiple replacements**: Test multiple replacements in one file
2. **Multiple files, single replacement each**: Test same replacement across multiple files
3. **Mixed success/failure**: Test with some strings not found
4. **File not found**: Test with non-existent file paths
5. **Large batch**: Test with many replacements (10+)
6. **Edge cases**: Empty strings, special characters, Unicode

## Next Steps

With `multi_replace_string_in_file` complete, the next recommended tool to implement is:

**insert_edit_into_file** - Insert code at specific line numbers with smart indentation

See `docs/TOOL_INTEGRATION_STATUS.md` for the complete roadmap.

## Related Files

- Source reference: `vscode-copilot-chat-main/src/extension/tools/node/multiReplaceStringTool.tsx`
- Integration status: `docs/TOOL_INTEGRATION_STATUS.md`
- Related tool: `docs/REPLACE_STRING_TOOL_IMPLEMENTATION.md`

