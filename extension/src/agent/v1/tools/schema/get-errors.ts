import { z } from 'zod';

/**
 * @tool get_errors
 * @description Get diagnostics (errors and warnings) from files in the workspace
 */
const schema = z.object({
	filePaths: z
		.array(z.string())
		.optional()
		.describe(
			'Optional array of file paths to get errors for. If not provided, returns errors from all files with diagnostics.'
		),
	ranges: z
		.array(z.tuple([z.number(), z.number(), z.number(), z.number()]).optional())
		.optional()
		.describe(
			'Optional array of ranges [startLine, startChar, endLine, endChar] corresponding to each file path. Used to filter diagnostics to specific ranges.'
		),
});

const examples = [
	`<tool name="get_errors">
</tool>`,

	`<tool name="get_errors">
  <filePaths>["src/index.ts", "src/utils.ts"]</filePaths>
</tool>`,

	`<tool name="get_errors">
  <filePaths>["src/index.ts"]</filePaths>
  <ranges>[[10, 0, 20, 50]]</ranges>
</tool>`,
];

export const getErrorsTool = {
	schema: {
		name: 'get_errors',
		schema,
	},
	examples,
};

export type GetErrorsToolParams = {
	name: 'get_errors';
	input: z.infer<typeof schema>;
};
