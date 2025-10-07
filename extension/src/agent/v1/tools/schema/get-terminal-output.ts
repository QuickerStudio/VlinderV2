import { z } from 'zod';

const schema = z.object({
	terminalId: z
		.number()
		.optional()
		.describe(
			'Optional terminal ID to get output from. If not provided, uses the active terminal. Use terminal IDs from terminal tool or execute_command tool.'
		),
	maxChars: z
		.number()
		.optional()
		.describe(
			'Maximum number of characters to return from the terminal buffer (default: 16000, max: 50000)'
		),
});

const examples = [
	`<tool name="get_terminal_output">
</tool>`,
	`<tool name="get_terminal_output">
  <terminalId>1</terminalId>
</tool>`,
	`<tool name="get_terminal_output">
  <terminalId>2</terminalId>
  <maxChars>5000</maxChars>
</tool>`,
	`<tool name="get_terminal_output">
  <maxChars>10000</maxChars>
</tool>`,
];

export const getTerminalOutputTool = {
	schema: {
		name: 'get_terminal_output',
		schema,
	},
	examples,
};

export type GetTerminalOutputToolParams = {
	name: 'get_terminal_output';
	input: z.infer<typeof schema>;
};
