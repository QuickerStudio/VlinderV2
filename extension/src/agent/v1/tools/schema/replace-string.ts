import { z } from 'zod';

/**
 * @tool replace_string_in_file
 * @description Replace an exact string in a single file. All occurrences of the string will be replaced.
 *
 * USE THIS TOOL FOR:
 * Single-file editing scenarios:
 * - Fixing a typo in one file
 * - Updating a constant value in one file
 * - Changing a function implementation in one file
 * - Modifying a configuration in one file
 * - Quick single-file corrections
 *
 * DO NOT USE THIS TOOL FOR:
 * Multi-file scenarios (use multi_replace_string_in_file instead):
 * - Renaming a function used across multiple files
 * - Updating the same constant in multiple files
 * - Refactoring that affects multiple files
 * - Batch updates across the codebase
 */
const schema = z.object({
	explanation: z
		.string()
		.describe('Brief explanation of why this replacement is being made'),
	filePath: z
		.string()
		.describe('Path to the file to edit (relative to workspace root)'),
	oldString: z
		.string()
		.describe(
			'The exact string to find and replace. Must match exactly including whitespace and indentation. If the string appears multiple times, all occurrences will be replaced.'
		),
	newString: z
		.string()
		.describe('The new string to replace the old string with'),
});

const examples = [
	`<tool name="replace_string_in_file">
  <explanation>Fix typo in function name</explanation>
  <filePath>src/utils.ts</filePath>
  <oldString>function calcualteTotal() {</oldString>
  <newString>function calculateTotal() {</newString>
</tool>`,

	`<tool name="replace_string_in_file">
  <explanation>Update API endpoint URL</explanation>
  <filePath>src/config.ts</filePath>
  <oldString>const API_URL = "http://localhost:3000"</oldString>
  <newString>const API_URL = "https://api.production.com"</newString>
</tool>`,

	`<tool name="replace_string_in_file">
  <explanation>Add error handling to function</explanation>
  <filePath>src/api.ts</filePath>
  <oldString>async function fetchData() {
  const response = await fetch(url)
  return response.json()
}</oldString>
  <newString>async function fetchData() {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`)
    }
    return response.json()
  } catch (error) {
    console.error('Failed to fetch data:', error)
    throw error
  }
}</newString>
</tool>`,
];

export const replaceStringTool = {
	schema: {
		name: 'replace_string_in_file',
		schema,
	},
	examples,
};

export type ReplaceStringToolParams = {
	name: 'replace_string_in_file';
	input: z.infer<typeof schema>;
};
