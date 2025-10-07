// schema/git-bash.ts
import { z } from 'zod';

/**
 * @tool git_bash
 * @description Executes a command in Git Bash shell environment. Git Bash provides a Unix-like command-line environment on Windows with Git tools and common Unix utilities (grep, find, sed, awk, curl, etc.). This tool automatically detects Git Bash installation and uses VSCode's Shell Integration API for reliable command execution with accurate exit codes and output capture.
 * @schema
 * {
 *   command: string; // The Git Bash command to execute
 *   timeout?: number; // Maximum execution time in milliseconds (default: 300000 = 5 minutes)
 *   captureOutput?: boolean; // Whether to capture and return command output (default: true)
 * }
 * @example
 * ```xml
 * <tool name="git_bash">
 *   <command>grep -r "TODO" ./src</command>
 * </tool>
 * ```
 * @example
 * ```xml
 * <tool name="git_bash">
 *   <command>find ./dist -name "*.js" -type f</command>
 * </tool>
 * ```
 * @example
 * ```xml
 * <tool name="git_bash">
 *   <command>curl -sL https://api.github.com/repos/microsoft/vscode | jq .stargazers_count</command>
 * </tool>
 * ```
 * @example
 * ```xml
 * <tool name="git_bash">
 *   <command>npm run build</command>
 *   <timeout>600000</timeout>
 * </tool>
 * ```
 */
const schema = z.object({
	command: z
		.string()
		.describe(
			'The Git Bash command to execute. Can use Unix utilities like grep, find, sed, awk, curl, jq, etc.'
		),
	timeout: z
		.number()
		.optional()
		.default(300000)
		.describe(
			'Maximum execution time in milliseconds. Default is 300000 (5 minutes).'
		),
	captureOutput: z
		.boolean()
		.optional()
		.default(true)
		.describe('Whether to capture and return command output. Default is true.'),
});

const examples = [
	`<tool name="git_bash">
  <command>grep -r "TODO" ./src</command>
</tool>`,

	`<tool name="git_bash">
  <command>find ./dist -name "*.js" -type f</command>
</tool>`,

	`<tool name="git_bash">
  <command>curl -sL https://api.github.com/repos/microsoft/vscode | jq .stargazers_count</command>
</tool>`,

	`<tool name="git_bash">
  <command>npm run build</command>
  <timeout>600000</timeout>
</tool>`,
];

export const gitBashTool = {
	schema: {
		name: 'git_bash',
		schema,
	},
	examples,
};

export type GitBashToolParams = {
	name: 'git_bash';
	input: z.infer<typeof schema>;
};
