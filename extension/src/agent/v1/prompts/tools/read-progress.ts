// prompts/tools/read-progress.ts
import { ToolPromptSchema } from '../utils/utils';

export const readProgressPrompt: ToolPromptSchema = {
	name: 'read_progress',
	description: `Reads the current progress and output of a running terminal process. Use this tool to monitor long-running commands and determine if they are progressing normally or have encountered issues.`,
	parameters: {
		terminalId: {
			type: 'number',
			description:
				'The unique ID of the terminal to check. Either terminalId or terminalName must be provided.',
			required: false,
		},
		terminalName: {
			type: 'string',
			description:
				'The name of the terminal to check. Either terminalId or terminalName must be provided.',
			required: false,
		},
		includeFullOutput: {
			type: 'boolean',
			description:
				'Whether to include full output history. Default is false (only recent output).',
			required: false,
		},
	},
	capabilities: [
		'Check if a terminal process is still running',
		'Read recent or full output from a terminal',
		'Determine if a process is actively producing output (hot state)',
		'Identify dev server status and URL',
		'Detect errors or issues in process output',
		'Get recommendations on whether to continue waiting or terminate',
	],
	examples: [
		{
			description: 'Check progress of terminal by ID',
			output: `<tool name="read_progress">
  <terminalId>1</terminalId>
</tool>`,
		},
		{
			description: 'Check dev server status with full output',
			output: `<tool name="read_progress">
  <terminalName>dev-server</terminalName>
  <includeFullOutput>true</includeFullOutput>
</tool>`,
		},
		{
			description: 'Quick check of recent output',
			output: `<tool name="read_progress">
  <terminalId>2</terminalId>
  <includeFullOutput>false</includeFullOutput>
</tool>`,
		},
	],
};
