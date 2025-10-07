import { z } from 'zod';

/**
 * Schema for insert_edit_into_file tool
 * Insert or replace code at specific line numbers in a file
 */
const schema = z.object({
	explanation: z
		.string()
		.describe('Brief explanation of why this edit is being made'),
	filePath: z
		.string()
		.describe('Path to the file to edit (relative to workspace root)'),
	startLine: z
		.number()
		.int()
		.positive()
		.describe(
			'Starting line number (1-based) where the edit should be applied'
		),
	endLine: z
		.number()
		.int()
		.positive()
		.optional()
		.describe(
			'Ending line number (1-based, inclusive) for replacement. If not provided, code will be inserted at startLine'
		),
	code: z.string().describe('The code to insert or replace with'),
});

const examples = [
	`<tool name="insert_edit_into_file">
  <explanation>Add error handling to the fetchData function</explanation>
  <filePath>src/api/users.ts</filePath>
  <startLine>15</startLine>
  <endLine>20</endLine>
  <code>async function fetchData() {
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
}</code>
</tool>`,

	`<tool name="insert_edit_into_file">
  <explanation>Insert new import statement at the top of the file</explanation>
  <filePath>src/components/UserProfile.tsx</filePath>
  <startLine>3</startLine>
  <code>import { useAuth } from '../hooks/useAuth'</code>
</tool>`,

	`<tool name="insert_edit_into_file">
  <explanation>Add new method to the User class</explanation>
  <filePath>src/models/User.ts</filePath>
  <startLine>45</startLine>
  <code>  async updateProfile(data: ProfileData): Promise<void> {
    await this.validate(data)
    await this.save(data)
  }</code>
</tool>`,
];

export const insertEditTool = {
	schema: {
		name: 'insert_edit_into_file',
		schema,
	},
	examples,
};

export type InsertEditToolParams = {
	name: 'insert_edit_into_file';
	input: z.infer<typeof schema>;
};
