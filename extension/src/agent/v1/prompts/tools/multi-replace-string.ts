import { ToolPromptSchema } from '../utils/utils';

export const multiReplaceStringPrompt: ToolPromptSchema = {
	name: 'multi_replace_string_in_file',
	description:
		'Perform multiple string replacements across one or more files in a single atomic operation. Useful for batch refactoring and updating multiple related strings.',
	parameters: {
		explanation: {
			type: 'string',
			description: 'Explanation of why these replacements are being made',
			required: true,
		},
		replacements: {
			type: 'array',
			description:
				'Array of replacement objects, each containing filePath, oldString, and newString',
			required: true,
		},
	},
	capabilities: [
		'Replace multiple exact strings across multiple files',
		'All replacements for the same file are merged and applied together',
		'Atomic operation: all successful replacements are applied together',
		'Finds and replaces ALL occurrences of each exact string',
		'Case-sensitive exact matching (no regex or partial matching)',
	],
	examples: [
		{
			description: 'Rename a function across multiple files',
			output: `<multi_replace_string_in_file>
  <explanation>Rename getUserData to fetchUserData across the codebase</explanation>
  <replacements>
    <replacement>
      <filePath>src/api/users.ts</filePath>
      <oldString>getUserData</oldString>
      <newString>fetchUserData</newString>
    </replacement>
    <replacement>
      <filePath>src/components/UserProfile.tsx</filePath>
      <oldString>getUserData</oldString>
      <newString>fetchUserData</newString>
    </replacement>
  </replacements>
</multi_replace_string_in_file>`,
		},
		{
			description: 'Update API endpoints in multiple config files',
			output: `<multi_replace_string_in_file>
  <explanation>Update API base URL from staging to production</explanation>
  <replacements>
    <replacement>
      <filePath>src/config/api.ts</filePath>
      <oldString>https://staging.api.example.com</oldString>
      <newString>https://api.example.com</newString>
    </replacement>
    <replacement>
      <filePath>src/config/websocket.ts</filePath>
      <oldString>wss://staging.api.example.com</oldString>
      <newString>wss://api.example.com</newString>
    </replacement>
  </replacements>
</multi_replace_string_in_file>`,
		},
	],
	extraDescriptions: `## When to Use
- Making the same change across multiple files (e.g., renaming a variable/function)
- Updating multiple related strings in one or more files
- Batch refactoring operations
- Updating configuration values across multiple files

## Important Notes
- Each oldString must match EXACTLY (including whitespace, case, etc.)
- All occurrences of each oldString will be replaced
- Replacements for the same file are merged and applied atomically
- If a string is not found, that replacement fails but others may succeed
- User approval is required before applying changes

## When NOT to Use
- For complex code transformations (use file_editor instead)
- For regex-based replacements (use file_editor instead)
- For single file, single replacement (use replace_string_in_file instead)
- For inserting new code (use file_editor instead)`,
};
