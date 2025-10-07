# Get Terminal Output Tool Implementation

## Overview
Successfully implemented the `get_terminal_output` tool (CoreGetTerminalOutput) from vscode-copilot-chat into the Vlinder system.

**Status**: ✅ Complete (100%)  
**Date**: 2025-10-04

## What It Does
The `get_terminal_output` tool allows the AI agent to retrieve the output buffer from terminals. It provides:
- Read terminal output from active terminal or by terminal ID
- Configurable maximum characters to retrieve
- Terminal information (name, shell type, output length)
- Works with Vlinder-managed terminals
- ANSI escape codes cleaned for readability

## Implementation Notes

### Terminal Buffer Access
This tool uses **Vlinder's TerminalRegistry** to access terminal buffers:

**What's Included**:
- ✅ Access to managed terminals (created by terminal/execute_command tools)
- ✅ Retrieves unretrieved output from TerminalRegistry
- ✅ Configurable max characters (default: 16000, max: 50000)
- ✅ Returns most recent output (buffer tail)
- ✅ Terminal metadata (ID, name, shell type)
- ✅ Read-only operation (no terminal modifications)

**Limitations**:
- Only works with terminals managed by Vlinder
- Cannot read from arbitrary VS Code terminals
- Buffer size limited by TerminalRegistry implementation
- No historical output (only current buffer state)

## Files Created

### 1. Schema Definition
**File**: `extension/src/agent/v1/tools/schema/get-terminal-output.ts`

Defines the Zod schema for tool parameters:
```typescript
{
  terminalId?: number,  // Optional terminal ID (uses active if not provided)
  maxChars?: number     // Max characters to return (default: 16000, max: 50000)
}
```

### 2. Tool Runner
**File**: `extension/src/agent/v1/tools/runners/get-terminal-output.tool.ts`

Implements the tool execution logic:
- Validates and caps maxChars parameter
- Gets output from TerminalRegistry or active terminal
- Handles terminal not found errors
- Returns XML-formatted output with metadata

**Key Methods**:
- `execute()`: Main execution flow
- `getOutputFromTerminalId()`: Gets output from specific terminal by ID
- `getOutputFromVscodeTerminal()`: Gets output from VS Code terminal
- `buildXmlOutput()`: Formats response as XML
- `escapeXml()`: Escapes XML special characters

### 3. Prompt Definition
**File**: `extension/src/agent/v1/prompts/tools/get-terminal-output.ts`

Defines the AI prompt with:
- Tool capabilities description
- 4 detailed usage examples
- When to use guidelines
- Output format specification
- Important notes and limitations
- Common use cases
- Best practices
- Comparison with other tools

### 4. UI Component
**File**: `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx`

Added `GetTerminalOutputBlock` component (lines 2833-2949):
- Displays terminal information (ID, name, shell type)
- Shows max chars and output length
- Expandable output view with "Show/Hide Output" button
- Monospace font for output display
- Loading, success, and error states
- Scrollable output area (max height: 96)

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

### Example 1: Get output from active terminal
```xml
<tool name="get_terminal_output">
</tool>
```

### Example 2: Get output from specific terminal
```xml
<tool name="get_terminal_output">
  <terminalId>1</terminalId>
</tool>
```

### Example 3: Get limited output
```xml
<tool name="get_terminal_output">
  <terminalId>2</terminalId>
  <maxChars>5000</maxChars>
</tool>
```

### Example 4: Get more output from active terminal
```xml
<tool name="get_terminal_output">
  <maxChars>30000</maxChars>
</tool>
```

## Key Features

### 1. Terminal Management Integration
- Uses TerminalRegistry to access managed terminals
- Gets unretrieved output from terminal buffers
- Supports both active terminal and terminal by ID

### 2. Flexible Output Control
- Default: 16000 characters
- Maximum: 50000 characters
- Returns most recent output (buffer tail)
- Automatically limits to prevent overwhelming responses

### 3. Terminal Metadata
- Terminal ID (if specified)
- Terminal name
- Shell type (bash, powershell, etc.)
- Output length (actual characters returned)

### 4. Error Handling
- "No active terminal found" - No terminal is active
- "Terminal with ID X not found" - Terminal doesn't exist
- "Terminal output not available" - Terminal not managed by Vlinder

### 5. Read-Only Operation
- Does not modify terminal state
- Does not execute commands
- Only reads existing buffer content

## Output Format

The tool returns content in XML format:
```xml
<terminal_output>
  <terminal_id>1</terminal_id>
  <terminal_name>Workspace Terminal</terminal_name>
  <shell_type>bash</shell_type>
  <max_chars>16000</max_chars>
  <output_length>1234</output_length>
  <output>
    ... terminal output here ...
  </output>
</terminal_output>
```

Error format:
```xml
<terminal_output>
  <max_chars>16000</max_chars>
  <output_length>0</output_length>
  <error>No active terminal found</error>
</terminal_output>
```

## Common Use Cases

1. **Check command results**: Verify output of previously executed commands
2. **Debug issues**: Examine error messages or warnings
3. **Monitor processes**: Check status of long-running processes
4. **Verify execution**: Confirm commands completed successfully
5. **Extract information**: Get data from command output

## Workflow Integration

### With execute_command Tool
```
1. execute_command: Run a command
2. get_terminal_output: Check the output
3. Analyze results and decide next steps
```

### With terminal Tool
```
1. terminal: Execute a command
2. get_terminal_output: Retrieve the output
3. Process the output data
```

### Monitoring Long Processes
```
1. Start long-running process
2. Periodically call get_terminal_output
3. Check for completion or errors
```

## Limitations

1. **Managed Terminals Only**: Cannot read from terminals not created by Vlinder
2. **Buffer Size**: Limited by TerminalRegistry's buffer implementation
3. **No History**: Cannot retrieve output from before terminal was created
4. **Active Terminal**: Requires an active terminal if terminalId not specified
5. **Recent Output**: Returns most recent output, not all historical output

## Best Practices

1. **Use Terminal IDs**: When working with multiple terminals, always specify terminalId
2. **Limit Output**: Use maxChars to avoid overwhelming responses
3. **Check Errors**: Always check for error messages in the response
4. **Combine with execute_command**: Use after execute_command to verify results
5. **Monitor Periodically**: For long processes, check output multiple times

## Comparison with Other Tools

### get_terminal_output (this tool)
**Purpose**: Read existing terminal buffer  
**Use when**: You need to check previous command output  
**Pros**: Simple, read-only, no side effects  
**Cons**: Only works with managed terminals

### terminal
**Purpose**: Execute commands and return output  
**Use when**: You need to run a new command  
**Pros**: Executes commands, captures output  
**Cons**: Creates new execution, not for reading existing output

### execute_command
**Purpose**: Execute commands with approval flow  
**Use when**: You need to run important operations  
**Pros**: User approval, comprehensive error handling  
**Cons**: Requires approval, more complex

## Technical Details

### TerminalRegistry Integration
```typescript
// Get output from managed terminal
const terminalInfo = TerminalRegistry.getAllTerminals().find(t => t.id === terminalId)
const output = TerminalRegistry.getUnretrievedOutput(terminalId)
```

### Buffer Limiting
```typescript
// Limit output to maxChars (returns tail)
const limitedOutput = output.length > maxChars 
  ? output.slice(output.length - maxChars) 
  : output
```

### Active Terminal Fallback
```typescript
// Use active terminal if no terminalId specified
const activeTerminal = vscode.window.activeTerminal
```

## Testing Recommendations

1. **Active Terminal**: Test with no terminalId parameter
2. **Specific Terminal**: Test with valid terminalId
3. **Invalid Terminal**: Test with non-existent terminalId
4. **No Active Terminal**: Test when no terminal is active
5. **Large Output**: Test with maxChars parameter
6. **Empty Output**: Test with terminal that has no output
7. **Multiple Terminals**: Test switching between terminals

## Dependencies

- **VS Code API**: window.activeTerminal, window.terminals
- **TerminalRegistry**: Vlinder's terminal management system
- No external dependencies required

## Next Steps

With 8/10 tools complete (80%), the remaining tools to implement are:

1. **install_extension** - Low priority, extension installation

See `docs/TOOL_INTEGRATION_STATUS.md` for the complete roadmap.

## Related Files

- Source reference: `vscode-copilot-chat-main/src/platform/terminal/vscode/terminalBufferListener.ts`
- Integration status: `docs/TOOL_INTEGRATION_STATUS.md`
- Related tools:
  - `docs/GET_ERRORS_TOOL_IMPLEMENTATION.md`
  - `docs/GREP_SEARCH_TOOL_IMPLEMENTATION.md`
  - Terminal tool: `extension/src/agent/v1/tools/runners/terminal.tool.ts`
  - Execute command tool: `extension/src/agent/v1/tools/runners/execute-command.tool.ts`

