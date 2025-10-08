import { z } from 'zod';

/**
 * Schema for context7 tool
 * Fetches up-to-date documentation for libraries using Context7 API
 */
const schema = z.object({
	libraryName: z
		.string()
		.min(1)
		.describe(
			'Library name to search for and retrieve documentation. Can be a package name (e.g., "react", "express") or a Context7-compatible library ID in the format "/org/project" or "/org/project/version".'
		),
	topic: z
		.string()
		.optional()
		.describe(
			'Optional topic to focus documentation on (e.g., "hooks", "routing", "authentication"). Helps narrow down the documentation to relevant sections.'
		),
	tokens: z
		.number()
		.optional()
		.default(5000)
		.describe(
			'Maximum number of tokens of documentation to retrieve (default: 5000). Higher values provide more context but consume more tokens.'
		),
});

const examples = [
	`<tool name="context7">
  <libraryName>react</libraryName>
  <topic>hooks</topic>
</tool>`,

	`<tool name="context7">
  <libraryName>express</libraryName>
  <topic>routing</topic>
  <tokens>3000</tokens>
</tool>`,

	`<tool name="context7">
  <libraryName>/vercel/next.js</libraryName>
  <topic>server components</topic>
</tool>`,

	`<tool name="context7">
  <libraryName>typescript</libraryName>
</tool>`,

	`<tool name="context7">
  <libraryName>/mongodb/docs</libraryName>
  <topic>aggregation</topic>
  <tokens>8000</tokens>
</tool>`,
];

export const context7Tool = {
	schema: {
		name: 'context7' as const,
		schema,
	},
	examples,
};

export type Context7ToolParams = {
	name: typeof context7Tool.schema.name;
	input: z.infer<typeof schema>;
};

