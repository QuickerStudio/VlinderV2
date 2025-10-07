import { ToolPromptSchema } from '../utils/utils';

export const getErrorsPrompt: ToolPromptSchema = {
	name: 'get_errors',
	description:
		'Get diagnostics (errors and warnings) from files in the workspace. Helps identify compilation errors, linting issues, and warnings that need to be fixed.',
	parameters: {
		filePaths: {
			type: 'array',
			description:
				'Optional array of file paths to get errors for. If not provided, returns errors from all files with diagnostics.',
			required: false,
		},
		ranges: {
			type: 'array',
			description:
				'Optional array of ranges [startLine, startChar, endLine, endChar] corresponding to each file path. Used to filter diagnostics to specific ranges.',
			required: false,
		},
	},
	capabilities: [
		'Retrieves errors and warnings from TypeScript, JavaScript, and other language servers',
		'Can get diagnostics for specific files or all files in workspace',
		'Supports filtering diagnostics by line/column ranges',
		'Returns severity (error vs warning), line numbers, and error messages',
		"Includes error codes and source (e.g., 'ts', 'eslint') when available",
		'Useful for understanding what needs to be fixed before making changes',
		'Can be used to verify that changes fixed the intended errors',
	],
	examples: [
		{
			description: 'Get all errors and warnings in the workspace',
			output: `<tool name="get_errors">
</tool>`,
		},
		{
			description: 'Get errors for specific files',
			output: `<tool name="get_errors">
  <filePaths>["src/index.ts", "src/utils.ts"]</filePaths>
</tool>`,
		},
		{
			description: 'Get errors in a specific range of a file',
			output: `<tool name="get_errors">
  <filePaths>["src/index.ts"]</filePaths>
  <ranges>[[10, 0, 20, 50]]</ranges>
</tool>`,
		},
		{
			description: 'Check multiple files with specific ranges',
			output: `<tool name="get_errors">
  <filePaths>["src/app.ts", "src/config.ts"]</filePaths>
  <ranges>[[0, 0, 50, 0], [10, 0, 30, 0]]</ranges>
</tool>`,
		},
	],
};
