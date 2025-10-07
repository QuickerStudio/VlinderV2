import { z } from 'zod';

/**
 * Schema for grep_search tool
 * Search for text patterns in files using VS Code's search API
 */
const schema = z.object({
	query: z.string().describe('The text or regex pattern to search for'),
	isRegexp: z
		.boolean()
		.optional()
		.describe('Whether the query is a regular expression (default: true)'),
	includePattern: z
		.string()
		.optional()
		.describe(
			"Optional glob pattern to filter files (e.g., '*.ts', 'src/**/*.js')"
		),
	maxResults: z
		.number()
		.optional()
		.describe('Maximum number of results to return (default: 20, max: 200)'),
});

const examples = [
	`<tool name="grep_search">
  <query>TODO</query>
</tool>`,

	`<tool name="grep_search">
  <query>function\\s+\\w+</query>
  <isRegexp>true</isRegexp>
  <includePattern>*.ts</includePattern>
</tool>`,

	`<tool name="grep_search">
  <query>import.*from</query>
  <includePattern>src/**/*.js</includePattern>
  <maxResults>50</maxResults>
</tool>`,

	`<tool name="grep_search">
  <query>Error</query>
  <isRegexp>false</isRegexp>
  <includePattern>*.log</includePattern>
</tool>`,

	`<tool name="grep_search">
  <query>class\\s+\\w+\\s+extends</query>
  <includePattern>**/*.tsx</includePattern>
</tool>`,
];

export const grepSearchTool = {
	schema: {
		name: 'grep_search',
		schema,
	},
	examples,
};

export type GrepSearchToolParams = {
	name: 'grep_search';
	input: z.infer<typeof schema>;
};
