import { ToolPromptSchema } from '../utils/utils';

export const insertEditPrompt: ToolPromptSchema = {
	name: 'insert_edit_into_file',
	description:
		'Insert or replace code at specific line numbers in a file. Useful for precise line-based editing when you know the exact line numbers.',
	parameters: {
		explanation: {
			type: 'string',
			description: 'Explanation of why this edit is being made',
			required: true,
		},
		filePath: {
			type: 'string',
			description: 'Relative path to the file to edit',
			required: true,
		},
		startLine: {
			type: 'number',
			description:
				'Starting line number (1-based). For insertion, code is inserted before this line. For replacement, this is the first line to replace.',
			required: true,
		},
		endLine: {
			type: 'number',
			description:
				'Ending line number (1-based, inclusive). Only required for replacement. If omitted, performs insertion.',
			required: false,
		},
		code: {
			type: 'string',
			description:
				'The code to insert or use as replacement. Should include proper indentation.',
			required: true,
		},
	},
	capabilities: [
		'Insert new code at a specific line number',
		'Replace a range of lines with new code',
		'Precise line-based editing',
		'Automatic indentation handling',
		'Works with any text file',
	],
	examples: [
		{
			description: 'Insert a new import statement',
			output: `<insert_edit_into_file>
  <explanation>Add missing import for useEffect hook</explanation>
  <filePath>src/components/Dashboard.tsx</filePath>
  <startLine>2</startLine>
  <code>import { useEffect } from 'react'</code>
</insert_edit_into_file>`,
		},
		{
			description: 'Replace a function with improved version',
			output: `<insert_edit_into_file>
  <explanation>Add error handling to calculateTotal function</explanation>
  <filePath>src/utils/calculations.ts</filePath>
  <startLine>15</startLine>
  <endLine>20</endLine>
  <code>function calculateTotal(items: Item[]): number {
  if (!items || items.length === 0) return 0
  return items.reduce((sum, item) => sum + item.price, 0)
}</code>
</insert_edit_into_file>`,
		},
		{
			description: 'Insert a new method in a class',
			output: `<insert_edit_into_file>
  <explanation>Add updateProfile method to User class</explanation>
  <filePath>src/models/User.ts</filePath>
  <startLine>45</startLine>
  <code>  async updateProfile(data: ProfileData): Promise<void> {
    await this.validate(data)
    this.profile = { ...this.profile, ...data }
    await this.save()
  }</code>
</insert_edit_into_file>`,
		},
	],
	extraDescriptions: `## When to Use
- Adding new functions, methods, or code blocks
- Replacing specific sections of code
- Inserting import statements
- Adding new class members
- Modifying specific code sections when you know the line numbers

## Important Notes
- Line numbers are 1-based (first line is line 1)
- For insertion: only specify startLine (code is inserted before that line)
- For replacement: specify both startLine and endLine (inclusive range)
- The code you provide should include proper indentation
- Always provide an explanation of why the edit is being made

## Best Practices
1. **Know the line numbers**: Use read_file or other tools to identify the correct line numbers first
2. **Include context**: Provide clear explanation of why the edit is needed
3. **Proper indentation**: Match the indentation of surrounding code
4. **Complete blocks**: When replacing, include complete logical blocks (entire functions, etc.)
5. **Test after editing**: Verify the edit didn't break syntax or logic

## When NOT to Use
- For simple string replacements (use replace_string_in_file instead)
- For multiple unrelated edits (use multi_replace_string_in_file or file_editor instead)
- When you don't know the exact line numbers (use file_editor instead)
- For whole file rewrites (use file_editor with whole_write mode instead)`,
};
