import { ToolPromptSchema } from '../utils/utils';

export const killBashToolPrompt: ToolPromptSchema = {
	name: 'kill_bash',
	description:
		'Terminates a running bash process or terminal session. Use this tool to stop long-running commands, hanging processes, or clean up terminals that are no longer needed. You can identify terminals by their ID or name.',
	parameters: {
		terminalId: {
			type: 'number',
			description:
				'The unique ID of the terminal to kill. Either terminalId or terminalName must be provided. You can get terminal IDs from previous bash tool executions or by listing active terminals.',
			required: false,
		},
		terminalName: {
			type: 'string',
			description:
				'The name of the terminal to kill. Either terminalId or terminalName must be provided. Terminal names are typically assigned when creating dev servers or named terminal sessions.',
			required: false,
		},
		force: {
			type: 'boolean',
			description:
				"Whether to force kill the terminal. If false (default), attempts graceful termination first. Set to true for processes that don't respond to graceful shutdown.",
			required: false,
		},
	},
	capabilities: [
		"You can use the 'kill_bash' tool to terminate any running terminal process, including long-running commands, dev servers, or hanging processes.",
		'The tool supports both graceful termination (default) and force kill options.',
		'You can identify terminals by their numeric ID or by their assigned name.',
		'This is particularly useful for cleaning up after testing, stopping runaway processes, or managing dev servers.',
		'Before killing a terminal, the tool will show you the last command that was running and whether the terminal was busy.',
	],

	examples: [
		{
			description: 'Kill a terminal by its ID with graceful termination',
			output: `<kill_bash>\n  <terminalId>1</terminalId>\n</kill_bash>`,
		},
		{
			description: 'Force kill a dev server by name',
			output: `<kill_bash>\n  <terminalName>dev-server</terminalName>\n  <force>true</force>\n</kill_bash>`,
		},
		{
			description: 'Gracefully terminate a named terminal',
			output: `<kill_bash>\n  <terminalName>test-runner</terminalName>\n  <force>false</force>\n</kill_bash>`,
		},
	],
};
