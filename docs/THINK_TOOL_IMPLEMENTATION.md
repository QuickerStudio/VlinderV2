# Think Tool Implementation

## Overview
Successfully implemented the `think` tool from vscode-copilot-chat into the Vlinder system with a **custom UI component**.

**Status**: ✅ Complete (100%)  
**Date**: 2025-10-04

## What It Does
The `think` tool allows the AI agent to express internal thoughts, reasoning, and analysis. It provides:
- Transparent reasoning process visible to users
- Planning and strategizing before taking action
- Breaking down complex problems
- Self-critique and reflection
- Analysis of situations and alternatives
- Custom UI component with distinctive purple theme

## Implementation Notes

### Simple Yet Powerful
This tool is conceptually simple but very powerful:

**What's Included**:
- ✅ Single parameter: thoughts (string)
- ✅ Returns thoughts as tool response
- ✅ Visible to user for transparency
- ✅ No side effects (read-only in nature)
- ✅ Custom UI component in tools/ directory
- ✅ Purple-themed design for visual distinction
- ✅ Expandable/collapsible interface

**Purpose**:
- Help AI organize thoughts before acting
- Make reasoning process transparent
- Enable better collaboration with users
- Provide learning opportunities
- Document problem-solving approaches

## Files Created

### 1. Schema Definition
**File**: `extension/src/agent/v1/tools/schema/think.ts`

Defines the Zod schema for tool parameters:
```typescript
{
  thoughts: string  // Internal thoughts, reasoning, and analysis
}
```

### 2. Tool Runner
**File**: `extension/src/agent/v1/tools/runners/think.tool.ts`

Implements the tool execution logic:
- Validates thoughts are not empty
- Updates UI with thinking process
- Returns thoughts as tool response
- Enables conversation continuity

**Key Features**:
- Simple execution flow
- UI update via updateAsk
- Success/error handling
- Trimmed output

### 3. Prompt Definition
**File**: `extension/src/agent/v1/prompts/tools/think.ts`

Comprehensive prompt with:
- Tool capabilities description
- 4 detailed usage examples
- When to use guidelines
- Best practices for effective thinking
- Common patterns (analysis, planning, course correction)
- Integration with other tools
- Tips for structured thinking

### 4. Custom UI Component
**File**: `extension/webview-ui-vite/src/components/chat-row/tools/think-tool.tsx`

Custom React component featuring:
- **Brain icon** for easy recognition
- **Purple color scheme** for visual distinction
- **Expandable/collapsible** header
- **Markdown rendering** for formatted thoughts
- **State management** (loading, approved, error)
- **Timestamp display**
- **Dark mode support**
- **Responsive design**

**Component Structure**:
```typescript
export const ThinkToolBlock: React.FC<ThinkToolProps> = ({
  thoughts,
  approvalState,
  ts
}) => {
  // Expandable state
  // Dynamic styling based on approval state
  // Header with Brain icon
  // Content with MarkdownRenderer
  // Timestamp footer
}
```

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
8. ✅ Custom UI component created in `tools/think-tool.tsx`
9. ✅ Imported in `chat-tools.tsx`
10. ✅ Case added to ToolRenderer switch

## Usage Examples

### Example 1: Analyzing an error
```xml
<tool name="think">
  <thoughts>
I need to analyze this error message carefully. The stack trace shows a null pointer exception in the authentication module. This could be caused by:
1. Missing user session data
2. Expired authentication token
3. Race condition during login

Let me check the authentication flow first to understand where the null value is coming from.
  </thoughts>
</tool>
```

### Example 2: Planning a refactoring
```xml
<tool name="think">
  <thoughts>
The user wants to refactor this code. Before making changes, I should:
- Understand the current architecture and dependencies
- Identify code smells and anti-patterns
- Plan the refactoring steps in a safe order
- Consider backward compatibility and breaking changes

The main issue seems to be tight coupling between the authentication and user management modules. I'll need to introduce an abstraction layer.
  </thoughts>
</tool>
```

### Example 3: Breaking down a complex task
```xml
<tool name="think">
  <thoughts>
This is a complex request involving multiple components. Let me break it down:

1. User wants to add a new feature to the payment system
2. Need to maintain existing functionality and tests
3. Should follow the project's coding standards and patterns
4. Must handle edge cases like network failures and timeouts

I'll start by examining the existing payment flow to understand the integration points.
  </thoughts>
</tool>
```

### Example 4: Self-critique
```xml
<tool name="think">
  <thoughts>
Wait, I think I made an error in my previous response. I suggested modifying the database schema directly, but that could cause data loss for existing users.

Let me reconsider:
- Instead of altering the table, I should create a migration script
- Need to handle backward compatibility
- Should add a rollback plan in case something goes wrong

I'll revise my approach to be safer and more production-ready.
  </thoughts>
</tool>
```

## Key Features

### 1. Transparency
- Thoughts are visible to users
- Shows reasoning process
- Builds trust through openness
- Enables early correction of misunderstandings

### 2. Planning Aid
- Organize thoughts before acting
- Break down complex problems
- Consider multiple approaches
- Evaluate trade-offs

### 3. Self-Critique
- Question assumptions
- Catch potential errors
- Improve solutions
- Course correction

### 4. Custom UI
- Distinctive purple theme
- Brain icon for recognition
- Expandable/collapsible
- Markdown formatting
- State indicators

### 5. No Side Effects
- Read-only in nature
- Doesn't modify files
- Doesn't execute commands
- Safe to use frequently

## UI Design

### Color Scheme
- **Purple theme**: Distinguishes from other tools
- **Border**: Purple border (purple-500/50)
- **Background**: Light purple background (purple-50/50)
- **Icon**: Purple brain icon (purple-600)
- **Header**: Purple header background (purple-100/50)

### States
- **Loading**: Blue theme with spinner
- **Approved**: Purple theme (default)
- **Error**: Red theme with error message

### Layout
```
┌─────────────────────────────────────┐
│ 🧠 Thinking                    ▼   │ ← Header (clickable)
├─────────────────────────────────────┤
│                                     │
│  [Markdown-rendered thoughts]       │ ← Content (expandable)
│                                     │
├─────────────────────────────────────┤
│ 12:34:56 PM                         │ ← Timestamp
└─────────────────────────────────────┘
```

## Common Use Cases

1. **Problem Analysis**: Break down errors and issues
2. **Planning**: Think through approach before acting
3. **Alternatives**: Evaluate different solutions
4. **Reflection**: Review actions and identify improvements
5. **Self-Critique**: Catch errors in reasoning
6. **Explanation**: Make thought process transparent

## Best Practices

### 1. Be Thorough
- Show reasoning, not just conclusions
- Explain how you reached decisions
- Include analysis and considerations

### 2. Structure Thoughts
- Use lists and numbered steps
- Organize into sections
- Make it easy to follow

### 3. Be Specific
- Reference actual code, files, errors
- Use concrete examples
- Avoid vague statements

### 4. Question Assumptions
- Challenge your own reasoning
- Consider edge cases
- Look for potential issues

### 5. Plan Before Acting
- Think through steps before using action tools
- Consider order of operations
- Identify potential risks

## Integration with Other Tools

The think tool works well before/after other tools:

1. **Before file_editor**: Plan what changes to make
2. **Before execute_command**: Consider what will happen
3. **After get_errors**: Analyze errors before fixing
4. **During debugging**: Reason through the problem
5. **Before complex operations**: Break down the task

## Example Workflow

```
1. User asks to fix a bug
2. Use think tool to analyze the error
3. Use read_file to examine the code
4. Use think tool to plan the fix
5. Use file_editor to make changes
6. Use execute_command to test
7. Use think tool to verify the solution
```

## Technical Details

### Tool Execution
```typescript
async execute(): Promise<ToolResponseV2> {
  const { thoughts } = this.params.input
  
  // Update UI
  await updateAsk("tool", {
    tool: {
      tool: "think",
      thoughts: thoughts.trim(),
      approvalState: "approved",
      ts: this.ts,
    },
  }, this.ts)
  
  // Return thoughts for conversation continuity
  return this.toolResponse("success", thoughts.trim())
}
```

### UI Component Props
```typescript
interface ThinkToolProps extends ThinkTool {
  approvalState?: ToolStatus
  ts: number
}
```

## Testing Recommendations

1. **Simple thoughts**: Test with basic reasoning
2. **Complex analysis**: Test with multi-step thinking
3. **Markdown formatting**: Test with lists, code blocks
4. **Long thoughts**: Test with extensive reasoning
5. **Empty thoughts**: Test error handling
6. **State changes**: Test loading, approved, error states
7. **Expand/collapse**: Test UI interaction

## Dependencies

- **React**: UI component framework
- **Lucide Icons**: Brain icon
- **MarkdownRenderer**: Formatted thoughts display
- **Tailwind CSS**: Styling
- No external dependencies required

## Next Steps

With 9/10 tools complete (90%), the remaining tool to implement is:

1. **install_extension** - Low priority, extension installation

See `docs/TOOL_INTEGRATION_STATUS.md` for the complete roadmap.

## Related Files

- Source reference: `vscode-copilot-chat-main/src/extension/tools/node/thinkTool.tsx`
- Integration status: `docs/TOOL_INTEGRATION_STATUS.md`
- Custom UI component: `extension/webview-ui-vite/src/components/chat-row/tools/think-tool.tsx`
- Related tools:
  - All other tools can benefit from using think before/after execution

