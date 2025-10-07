import { ToolPromptSchema } from '../utils/utils';

export const getTerminalOutputPrompt: ToolPromptSchema = {
	name: 'get_terminal_output',
	description:
		'Retrieve the output buffer from a terminal. Can get output from the active terminal or a specific terminal by ID. Useful for checking command results, debugging, or monitoring long-running processes.',
	parameters: {
		terminalId: {
			type: 'number',
			description:
				'Optional terminal ID to get output from. If not provided, uses the active terminal. Terminal IDs are returned by the terminal or execute_command tools.',
			required: false,
		},
		maxChars: {
			type: 'number',
			description:
				'Maximum number of characters to return from the terminal buffer (default: 16000, max: 50000). Returns the most recent output up to this limit.',
			required: false,
		},
	},
	capabilities: [
		'Retrieve terminal output buffer',
		'Get output from active or specific terminal',
		'Check command results and debugging',
		'Monitor long-running processes',
		'Configurable output length limit',
	],
	examples: [
		{
			description: 'Get output from the active terminal',
			output: `<tool name="get_terminal_output">
</tool>`,
		},
		{
			description: 'Get output from a specific terminal by ID',
			output: `<tool name="get_terminal_output">
  <terminalId>1</terminalId>
</tool>`,
		},
		{
			description: 'Get limited output from a specific terminal',
			output: `<tool name="get_terminal_output">
  <terminalId>2</terminalId>
  <maxChars>5000</maxChars>
</tool>`,
		},
		{
			description: 'Get more output from the active terminal',
			output: `<tool name="get_terminal_output">
  <maxChars>30000</maxChars>
</tool>`,
		},
	],
	usageNotes: `
## When to Use

Use this tool when you need to:
1. **Check command results** - See the output of previously executed commands
2. **Debug issues** - Examine error messages or warnings in terminal output
3. **Monitor processes** - Check the status of long-running processes
4. **Verify execution** - Confirm that commands completed successfully
5. **Extract information** - Get data from command output for further processing

## How It Works

- **Active Terminal**: If no terminalId is provided, reads from the currently active terminal
- **Specific Terminal**: If terminalId is provided, reads from that specific terminal
- **Buffer Limit**: Returns the most recent output up to maxChars (default: 16000, max: 50000)
- **Managed Terminals**: Only works with terminals managed by Vlinder (created by terminal or execute_command tools)

## Output Format

Returns XML with:
- \`terminal_id\`: The ID of the terminal (if specified)
- \`terminal_name\`: The name of the terminal
- \`shell_type\`: The shell type (bash, powershell, etc.)
- \`max_chars\`: The maximum characters requested
- \`output_length\`: The actual length of the output returned
- \`output\`: The terminal output buffer
- \`error\`: Error message if the operation failed

## Important Notes

1. **Terminal Management**: This tool only works with terminals created/managed by Vlinder's terminal tools
2. **Buffer Size**: Terminal buffers are limited. Very old output may not be available
3. **Active Terminal**: Make sure the correct terminal is active if not specifying terminalId
4. **ANSI Codes**: Output is cleaned of ANSI escape codes for readability
5. **Real-time**: Gets the current state of the buffer, not historical snapshots

## Common Use Cases

### 1. Check if a command succeeded
After running a command with execute_command, check its output:
\`\`\`xml
<tool name="get_terminal_output">
  <terminalId>1</terminalId>
</tool>
\`\`\`

### 2. Monitor a dev server
Check the output of a running development server:
\`\`\`xml
<tool name="get_terminal_output">
  <terminalId>2</terminalId>
  <maxChars>10000</maxChars>
</tool>
\`\`\`

### 3. Debug test failures
Get the full output from a test run:
\`\`\`xml
<tool name="get_terminal_output">
  <maxChars>50000</maxChars>
</tool>
\`\`\`

### 4. Extract build information
Get build output to check for warnings or errors:
\`\`\`xml
<tool name="get_terminal_output">
  <terminalId>3</terminalId>
  <maxChars>20000</maxChars>
</tool>
\`\`\`

## Limitations

1. **Managed Terminals Only**: Cannot read from terminals not created by Vlinder
2. **Buffer Size**: Limited by VS Code's terminal buffer (typically last 40 data events)
3. **No History**: Cannot retrieve output from before the terminal was created
4. **Active Terminal**: If no terminalId specified, requires an active terminal

## Best Practices

1. **Use Terminal IDs**: When working with multiple terminals, always use terminalId
2. **Limit Output**: Use maxChars to avoid overwhelming responses
3. **Check Errors**: Always check for error messages in the response
4. **Combine with execute_command**: Use after execute_command to verify results
5. **Monitor Long Processes**: Periodically check output of long-running processes

## Comparison with Other Tools

- **terminal**: Executes commands and returns output. Use when you need to run a new command.
- **get_terminal_output**: Reads existing terminal buffer. Use when you need to check previous output.
- **execute_command**: Executes commands with approval flow. Use for important operations.

## Error Handling

Common errors:
- "No active terminal found" - No terminal is currently active
- "Terminal with ID X not found" - The specified terminal doesn't exist
- "Terminal output not available" - Terminal not managed by Vlinder

## Tips

1. **Recent Output**: The tool returns the most recent output, not all output
2. **Multiple Checks**: You can call this tool multiple times to monitor progress
3. **Terminal IDs**: Terminal IDs are sequential integers starting from 0
4. **Shell Integration**: Works best with terminals that have shell integration enabled
`,
};
