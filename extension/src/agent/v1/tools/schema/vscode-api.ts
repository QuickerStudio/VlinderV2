import { z } from 'zod';

/**
 * Schema for get_vscode_api tool
 * Search VS Code API documentation
 */
const schema = z.object({
	query: z
		.string()
		.describe(
			"The search query for VS Code API documentation (e.g., 'window', 'TextEditor', 'commands')"
		),
});

const examples = [
	`<tool name="get_vscode_api">
  <query>window.showInformationMessage</query>
</tool>`,

	`<tool name="get_vscode_api">
  <query>TextEditor</query>
</tool>`,

	`<tool name="get_vscode_api">
  <query>commands.registerCommand</query>
</tool>`,

	`<tool name="get_vscode_api">
  <query>workspace.openTextDocument</query>
</tool>`,

	`<tool name="get_vscode_api">
  <query>Diagnostic</query>
</tool>`,
];

export const vscodeApiTool = {
	schema: {
		name: 'get_vscode_api',
		schema,
	},
	examples,
};

export type VscodeApiToolParams = {
	name: 'get_vscode_api';
	input: z.infer<typeof schema>;
};
