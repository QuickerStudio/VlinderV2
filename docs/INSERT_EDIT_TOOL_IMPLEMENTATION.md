# Insert Edit Tool Implementation

## Overview
Successfully implemented the `insert_edit_into_file` tool from vscode-copilot-chat into the Vlinder system.

**Status**: ✅ Complete (100%)  
**Date**: 2025-10-04

## What It Does
The `insert_edit_into_file` tool allows the AI agent to insert or replace code at specific line numbers in a file. It provides precise line-based editing capabilities with:
- Insert new code at a specific line number
- Replace a range of lines with new code
- 1-based line numbering (first line is line 1)
- User approval flow before applying changes
- Expandable UI showing code preview
- Automatic newline handling

## Files Created

### 1. Schema Definition
**File**: `extension/src/agent/v1/tools/schema/insert-edit.ts`

Defines the Zod schema for tool parameters:
```typescript
{
  explanation: string,      // Why this edit is being made
  filePath: string,         // Path to the file to edit
  startLine: number,        // Starting line number (1-based)
  endLine?: number,         // Optional ending line number for replacement
  code: string              // The code to insert or replace with
}
```

**Operation Types**:
- **Insert**: Only `startLine` provided - code is inserted BEFORE that line
- **Replace**: Both `startLine` and `endLine` provided - replaces lines in that range (inclusive)

### 2. Tool Runner
**File**: `extension/src/agent/v1/tools/runners/insert-edit.tool.ts`

Implements the tool execution logic:
- Validates line numbers are within file bounds
- Determines operation type (insert vs replace)
- Asks for user approval with preview
- Creates VS Code WorkspaceEdit for the operation
- Applies edit atomically
- Returns success/failure status

**Key Features**:
- Line number validation (prevents out-of-bounds edits)
- Automatic newline handling
- User approval flow with clear operation description
- Loading, success, and error states

### 3. Prompt Definition
**File**: `extension/src/agent/v1/prompts/tools/insert-edit.ts`

Defines the AI prompt with:
- Tool capabilities description
- 5 detailed usage examples covering common scenarios
- Best practices for using the tool
- When to use vs when NOT to use
- Tips for effective usage

### 4. UI Component
**File**: `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx`

Added `InsertEditBlock` component (lines 2424-2519):
- Displays explanation and operation type
- Shows file path and line range
- Displays number of lines being inserted/replaced
- Expandable code preview with toggle button
- Loading, success, and error states
- Color-coded operation type (insert vs replace)

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
10. ✅ FileEdit icon imported from lucide-react

## Usage Examples

### Example 1: Insert a new import
```xml
<tool name="insert_edit_into_file">
  <explanation>Add missing import for useEffect hook</explanation>
  <filePath>src/components/Dashboard.tsx</filePath>
  <startLine>2</startLine>
  <code>import { useEffect } from 'react'</code>
</tool>
```

### Example 2: Replace a function
```xml
<tool name="insert_edit_into_file">
  <explanation>Add error handling to calculateTotal function</explanation>
  <filePath>src/utils/calculations.ts</filePath>
  <startLine>15</startLine>
  <endLine>20</endLine>
  <code>function calculateTotal(items: Item[]): number {
  if (!items || items.length === 0) {
    return 0
  }
  
  try {
    return items.reduce((sum, item) => sum + item.price, 0)
  } catch (error) {
    console.error('Error calculating total:', error)
    return 0
  }
}</code>
</tool>
```

### Example 3: Insert a new method
```xml
<tool name="insert_edit_into_file">
  <explanation>Add updateProfile method to User class</explanation>
  <filePath>src/models/User.ts</filePath>
  <startLine>45</startLine>
  <code>  async updateProfile(data: ProfileData): Promise<void> {
    await this.validate(data)
    this.profile = { ...this.profile, ...data }
    await this.save()
  }
</code>
</tool>
```

## Key Features

### 1. Precise Line-Based Editing
- 1-based line numbering (matches editor line numbers)
- Insert at specific line (code inserted BEFORE that line)
- Replace specific line range (inclusive)
- Validates line numbers are within file bounds

### 2. Two Operation Modes
**Insert Mode** (no endLine):
- Inserts code BEFORE the specified startLine
- Useful for adding imports, new methods, etc.
- Preserves all existing code

**Replace Mode** (with endLine):
- Replaces lines from startLine to endLine (inclusive)
- Useful for updating functions, fixing code blocks
- Removes old code and inserts new code

### 3. User Approval Flow
- Shows clear operation description
- Displays file path and line range
- User can approve or reject
- Loading state during execution
- Success/error feedback after completion

### 4. Automatic Handling
- Newline handling (ensures proper line endings)
- File validation (checks file exists)
- Line number validation (prevents out-of-bounds)
- Atomic application (all or nothing)

### 5. UI/UX
- Collapsible design with summary
- Expandable code preview
- Clear operation type indicator
- File path and line range display
- Success/failure indicators

## Common Use Cases

1. **Add imports**: Insert new import statements at the top of files
2. **Add methods**: Insert new methods into classes
3. **Replace functions**: Update function implementations with improved versions
4. **Fix code blocks**: Replace buggy code with corrected versions
5. **Add configuration**: Insert new configuration objects
6. **Update error handling**: Replace error handling blocks with better implementations

## Best Practices

1. **Read the file first**: Use `read_file` to get accurate line numbers
2. **Be precise**: Know exactly which lines you want to insert/replace
3. **Include context**: Provide clear explanation of why the edit is needed
4. **Match indentation**: Ensure code has proper indentation for the context
5. **Complete blocks**: When replacing, include complete logical blocks

## When to Use vs Other Tools

**Use insert_edit_into_file when**:
- You know the exact line numbers
- You want to insert code at a specific location
- You want to replace a specific range of lines
- You need precise control over the edit location

**Use replace_string_in_file when**:
- You want to replace all occurrences of a string
- You don't know the exact line numbers
- The string is unique enough to identify

**Use multi_replace_string_in_file when**:
- You need to make multiple string replacements
- Replacements span multiple files
- You want batch operations

**Use file_editor when**:
- You need to make complex edits
- You want to see diffs
- You need search/replace with context
- You're rewriting large sections

## Line Number Reference

**Important**: Line numbers are 1-based (first line is line 1)

**For insertion**:
- `startLine: 1` - Insert at the very beginning of the file
- `startLine: 5` - Insert BEFORE line 5 (becomes new line 5)
- `startLine: N+1` - Insert at the end of a file with N lines

**For replacement**:
- `startLine: 1, endLine: 1` - Replace only the first line
- `startLine: 5, endLine: 10` - Replace lines 5 through 10 (inclusive)
- Both startLine and endLine are INCLUSIVE

## Testing Recommendations

1. **Insert at beginning**: Test inserting at line 1
2. **Insert in middle**: Test inserting at various middle lines
3. **Insert at end**: Test inserting at end of file
4. **Replace single line**: Test replacing one line
5. **Replace multiple lines**: Test replacing a range
6. **Invalid line numbers**: Test with out-of-bounds line numbers
7. **File not found**: Test with non-existent files
8. **Empty files**: Test with empty files

## Next Steps

With all high-priority editing tools complete (get_errors, replace_string_in_file, multi_replace_string_in_file, insert_edit_into_file), the next recommended tools to implement are:

1. **fetch_webpage** - Medium priority, requires embedding infrastructure
2. **get_vscode_api** - Low priority, API documentation search
3. **install_extension** - Low priority, extension installation

See `docs/TOOL_INTEGRATION_STATUS.md` for the complete roadmap.

## Related Files

- Source reference: `vscode-copilot-chat-main/src/extension/tools/node/insertEditTool.tsx`
- Integration status: `docs/TOOL_INTEGRATION_STATUS.md`
- Related tools: 
  - `docs/GET_ERRORS_TOOL_IMPLEMENTATION.md`
  - `docs/REPLACE_STRING_TOOL_IMPLEMENTATION.md`
  - `docs/MULTI_REPLACE_STRING_TOOL_IMPLEMENTATION.md`

