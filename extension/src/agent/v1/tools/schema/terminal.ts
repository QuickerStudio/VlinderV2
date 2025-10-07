import { z } from 'zod';

// Terminal tool schema - Universal terminal command execution
const schema = z.object({
	command: z.string().describe('The command to execute in the terminal'),
	shell: z
		.enum([
			'bash',
			'powershell',
			'cmd',
			'git-bash',
			'zsh',
			'fish',
			'sh',
			'auto',
		])
		.optional()
		.describe(
			"The shell to use for execution. 'auto' will detect the system default. Defaults to 'auto'."
		),
	cwd: z
		.string()
		.optional()
		.describe(
			'Working directory for command execution. Defaults to workspace root.'
		),
	timeout: z
		.number()
		.optional()
		.describe(
			'Maximum execution time in milliseconds. Defaults to 30000 (30 seconds).'
		),
	env: z
		.record(z.string())
		.optional()
		.describe('Environment variables to set for the command execution.'),
	captureOutput: z
		.boolean()
		.optional()
		.describe(
			'Whether to capture and return command output. Defaults to true.'
		),
	interactive: z
		.boolean()
		.optional()
		.describe(
			'Whether to run in interactive mode (requires user input). Defaults to false.'
		),
	terminalName: z
		.string()
		.optional()
		.describe(
			'Name for the terminal session. Useful for tracking multiple terminals.'
		),
	reuseTerminal: z
		.boolean()
		.optional()
		.describe(
			'Whether to reuse an existing terminal with the same name. Defaults to false.'
		),
});

const examples = [
	`<tool name="terminal">
  <command>npm install</command>
</tool>`,

	`<tool name="terminal">
  <command>Get-Process | Where-Object {$_.CPU -gt 100}</command>
  <shell>powershell</shell>
</tool>`,

	`<tool name="terminal">
  <command>git status</command>
  <shell>bash</shell>
  <cwd>/path/to/project</cwd>
</tool>`,
];

export const terminalTool = {
	schema: {
		name: 'terminal',
		schema,
	},
	examples,
};

export type TerminalToolParams = {
	name: 'terminal';
	input: z.infer<typeof schema>;
};
