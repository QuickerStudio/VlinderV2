# Edit Files Tool Implementation

## Overview
Successfully implemented the `fast-editor` tool (EditFilesPlaceholder) with a **custom implementation** and **custom UI component**.

**Status**: ✅ Complete (100%)  
**Date**: 2025-10-04

## Important Note
**EditFilesPlaceholder had NO source implementation** in vscode-copilot-chat. It was listed in the `ToolName` enum as a placeholder but never actually implemented. This is a **completely custom implementation** designed specifically for the Vlinder system.

## What It Does
The `fast-editor` tool allows editing multiple files in a single batch operation by performing string replacements. It provides:
- Batch editing of multiple files at once
- Coordinated changes across the codebase
- Independent processing of each edit
- Detailed success/failure reporting
- User approval before applying changes
- Custom UI with file-by-file status display

## Use Cases

### 1. Update Imports Across Multiple Files
When refactoring module paths or moving components:
```json
{
  "edits": [
    {
      "path": "src/components/Header.tsx",
      "oldString": "import { Button } from './Button'",
      "newString": "import { Button } from '@/components/ui/button'"
    },
    {
      "path": "src/components/Footer.tsx",
      "oldString": "import { Button } from './Button'",
      "newString": "import { Button } from '@/components/ui/button'"
    }
  ],
  "explanation": "Update all Button imports to use the new centralized UI component path"
}
```

### 2. Bump Version Numbers
Update version across package.json, constants, and documentation:
```json
{
  "edits": [
    {
      "path": "package.json",
      "oldString": "\"version\": \"1.0.0\"",
      "newString": "\"version\": \"1.1.0\""
    },
    {
      "path": "src/constants.ts",
      "oldString": "export const VERSION = '1.0.0'",
      "newString": "export const VERSION = '1.1.0'"
    },
    {
      "path": "README.md",
      "oldString": "## Version 1.0.0",
      "newString": "## Version 1.1.0"
    }
  ],
  "explanation": "Bump version to 1.1.0 across all relevant files"
}
```

### 3. Refactor API Calls
Replace direct API calls with a wrapper across multiple modules:
```json
{
  "edits": [
    {
      "path": "src/api/users.ts",
      "oldString": "const API_URL = 'http://localhost:3000'",
      "newString": "const API_URL = process.env.API_URL || 'http://localhost:3000'"
    },
    {
      "path": "src/api/posts.ts",
      "oldString": "const API_URL = 'http://localhost:3000'",
      "newString": "const API_URL = process.env.API_URL || 'http://localhost:3000'"
    }
  ],
  "explanation": "Make API URLs configurable via environment variables"
}
```

## Files Created

### 1. Schema Definition
**File**: `extension/src/agent/v1/tools/schema/edit-files.ts`

Defines the Zod schema for tool parameters:
```typescript
{
  edits: Array<{
    path: string          // Relative file path
    oldString: string     // Exact string to find
    newString: string     // Replacement string
  }>
  explanation?: string    // Optional explanation
}
```

### 2. Tool Runner
**File**: `extension/src/agent/v1/tools/runners/edit-files.tool.ts`

Implements the batch editing logic:
- Requests user approval
- Applies each edit independently
- Reports success/failure for each file
- Handles errors gracefully
- Updates UI with detailed results

**Key Features**:
- Exact string matching (case-sensitive, whitespace-sensitive)
- Global replacement (all occurrences in each file)
- Independent edit processing
- Partial success support
- Detailed error messages

### 3. Prompt Definition
**File**: `extension/src/agent/v1/prompts/tools/edit-files.ts`

Comprehensive prompt with:
- Tool capabilities description
- 4 detailed usage examples
- When to use guidelines
- Best practices for batch editing
- Common patterns (imports, versions, refactoring)
- Error handling guidance
- Integration with other tools

### 4. Custom UI Component
**File**: `extension/webview-ui-vite/src/components/chat-row/tools/edit-files-tool.tsx`

Custom React component featuring:
- **Files icon** for easy recognition
- **Green/red color scheme** for success/failure
- **File-by-file status display** with icons
- **Find/replace preview** for each edit
- **Error messages** for failed edits
- **Success/failure badges** in header
- **Expandable/collapsible** interface
- **Timestamp display**
- **Dark mode support**
- **Responsive design**

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
8. ✅ Custom UI component created in `tools/edit-files-tool.tsx`
9. ✅ Imported in `chat-tools.tsx`
10. ✅ Case added to ToolRenderer switch

## How It Works

### 1. User Approval
- Tool shows all edits to the user
- Displays file paths and replacement previews
- User must approve before any changes are made

### 2. Independent Processing
- Each edit is applied independently
- One failure doesn't stop other edits
- Detailed results for each file

### 3. Exact Matching
- oldString must match exactly
- Case-sensitive
- Whitespace-sensitive
- All occurrences are replaced

### 4. Result Reporting
- Success count
- Failure count
- Error messages for each failure
- File-by-file status display

## UI Design

### Color Scheme
- **Pending**: Yellow theme (awaiting approval)
- **Loading**: Blue theme with spinner
- **Success**: Green theme (all edits succeeded)
- **Partial**: Green/red badges (some succeeded, some failed)
- **Error/Rejected**: Red theme

### Layout
```
┌─────────────────────────────────────────────┐
│ 📁 Edit Files                    [2✓] [1✗] ▼│ ← Header
├─────────────────────────────────────────────┤
│ Explanation: Update imports...              │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ ✓ src/ComponentA.tsx        [1 of 3]    │ │
│ │ Find: import { util } from './utils'    │ │
│ │ Replace: import { util } from '@/lib'   │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ ✗ src/ComponentB.tsx        [2 of 3]    │ │
│ │ Find: import { util } from '../utils'   │ │
│ │ Replace: import { util } from '@/lib'   │ │
│ │ ⚠ String not found in file              │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 12:34:56 PM                                 │ ← Timestamp
└─────────────────────────────────────────────┘
```

## Error Handling

The tool provides detailed error messages for various failure scenarios:

### 1. File Not Found
```
File not found: src/missing-file.ts
```

### 2. String Not Found
```
String not found in file: "import { Button } from './Button'"
```

### 3. No Changes
```
No changes made (content identical after replacement)
```

### 4. Apply Failed
```
Failed to apply workspace edit
```

## Best Practices

### 1. Use Exact Strings
```typescript
// ✅ Good - exact match
oldString: "import { Button } from './Button'"

// ❌ Bad - extra space
oldString: "import { Button } from './Button' "
```

### 2. Include Context
```typescript
// ✅ Good - includes context
oldString: "export function getUserData("

// ❌ Bad - too generic
oldString: "getUserData"
```

### 3. Provide Explanation
```typescript
// ✅ Good
explanation: "Update all Button imports to use the new centralized UI component path"

// ❌ Bad
explanation: ""
```

### 4. Group Related Changes
```typescript
// ✅ Good - all import updates together
edits: [
  { path: "A.tsx", oldString: "...", newString: "..." },
  { path: "B.tsx", oldString: "...", newString: "..." },
]

// ❌ Bad - mixing unrelated changes
edits: [
  { path: "A.tsx", oldString: "import...", newString: "import..." },
  { path: "B.tsx", oldString: "version: 1.0", newString: "version: 2.0" },
]
```

## Comparison with Other Tools

### vs. replace_string_in_file
- **fast-editor**: Multiple files in one operation
- **replace_string_in_file**: Single file only

### vs. multi_replace_string_in_file
- **fast-editor**: Multiple files, one replacement per file
- **multi_replace_string_in_file**: Single file, multiple replacements

### vs. insert_edit_into_file
- **fast-editor**: Simple string replacement
- **insert_edit_into_file**: Complex code generation with line numbers

## Integration with Other Tools

### Workflow Example
```
1. Use grep_search to find all files with old import
2. Use read_file to verify exact import syntax
3. Use fast-editor to update all imports at once
4. Use get_errors to verify no issues were introduced
```

### Complementary Tools
- **grep_search**: Find files that need editing
- **read_file**: Verify exact strings before editing
- **get_errors**: Check for issues after editing

## Technical Details

### Tool Execution Flow
```typescript
1. Validate input (edits array not empty)
2. Request user approval
3. For each edit:
   a. Resolve file path
   b. Check file exists
   c. Read file content
   d. Check oldString exists
   e. Perform replacement
   f. Apply workspace edit
   g. Save document
   h. Record result
4. Update UI with results
5. Return success/feedback/error status
```

### Result Types
```typescript
{
  path: string
  success: boolean
  error?: string  // Only present if success is false
}
```

### Status Types
- **success**: All edits succeeded
- **feedback**: Some edits succeeded, some failed
- **error**: All edits failed
- **rejected**: User rejected the operation

## Testing Recommendations

1. **Single file edit**: Test with one file
2. **Multiple files**: Test with 3-5 files
3. **File not found**: Test with non-existent file
4. **String not found**: Test with string that doesn't exist
5. **Partial success**: Test with mix of valid and invalid edits
6. **Long strings**: Test with strings > 100 characters
7. **Special characters**: Test with quotes, backslashes, newlines
8. **User rejection**: Test canceling the operation

## Limitations

1. **Exact matching only**: No regex support
2. **Global replacement**: All occurrences are replaced
3. **No undo**: Changes are permanent (use git to revert)
4. **No preview**: User sees strings but not full file diff
5. **No line numbers**: Replacements are string-based, not line-based

## Future Enhancements

Potential improvements:
1. Add regex support for pattern matching
2. Add preview mode with full file diffs
3. Add selective replacement (choose which occurrences)
4. Add dry-run mode
5. Add rollback functionality
6. Add file backup before editing

## Next Steps

With 10/11 tools complete (91%), the remaining tool to implement is:

1. **install_extension** - Low priority, extension installation

See `docs/TOOL_INTEGRATION_STATUS.md` for the complete roadmap.

## Related Files

- Source reference: None (custom implementation)
- Integration status: `docs/TOOL_INTEGRATION_STATUS.md`
- Custom UI component: `extension/webview-ui-vite/src/components/chat-row/tools/edit-files-tool.tsx`
- Related tools:
  - replace_string_in_file (single file editing)
  - multi_replace_string_in_file (multiple replacements in one file)
  - insert_edit_into_file (complex code generation)

