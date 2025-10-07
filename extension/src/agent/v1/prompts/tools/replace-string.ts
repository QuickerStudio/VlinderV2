import { ToolPromptSchema } from '../utils/utils';

export const replaceStringPrompt: ToolPromptSchema = {
	name: 'replace_string_in_file',
	description:
		'Find and replace an exact string in a file. Use this for precise, targeted edits when you know the exact text to replace. All occurrences of the old string will be replaced with the new string.',
	parameters: {
		explanation: {
			type: 'string',
			description: 'Brief explanation of why this replacement is being made',
			required: true,
		},
		filePath: {
			type: 'string',
			description: 'Path to the file to edit (relative to workspace root)',
			required: true,
		},
		oldString: {
			type: 'string',
			description:
				'The exact string to find and replace. Must match exactly including whitespace and indentation. If the string appears multiple times, all occurrences will be replaced.',
			required: true,
		},
		newString: {
			type: 'string',
			description: 'The new string to replace the old string with',
			required: true,
		},
	},
	capabilities: [
		'Replaces ALL occurrences of the exact string in the file',
		'Requires exact match including whitespace, indentation, and line breaks',
		'Shows helpful error if string not found, with suggestions for similar strings',
		'Displays number of occurrences before applying changes',
		'Requires user approval before making changes',
		'Automatically saves the file after successful replacement',
		'Provides diff preview in the UI',
	],
	examples: [
		{
			description: 'Fix a typo in a function name',
			output: `<tool name="replace_string_in_file">
  <explanation>Fix typo in function name</explanation>
  <filePath>src/utils.ts</filePath>
  <oldString>function calcualteTotal() {</oldString>
  <newString>function calculateTotal() {</newString>
</tool>`,
		},
		{
			description: 'Update a configuration value',
			output: `<tool name="replace_string_in_file">
  <explanation>Update API endpoint URL to production</explanation>
  <filePath>src/config.ts</filePath>
  <oldString>const API_URL = "http://localhost:3000"</oldString>
  <newString>const API_URL = "https://api.production.com"</newString>
</tool>`,
		},
		{
			description: 'Add error handling to a function',
			output: `<tool name="replace_string_in_file">
  <explanation>Add try-catch error handling to fetchData function</explanation>
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
		},
		{
			description: 'Replace a single line',
			output: `<tool name="replace_string_in_file">
  <explanation>Update import statement to use named import</explanation>
  <filePath>src/index.ts</filePath>
  <oldString>import React from 'react'</oldString>
  <newString>import * as React from 'react'</newString>
</tool>`,
		},
		{
			description: 'Replace multi-line code block',
			output: `<tool name="replace_string_in_file">
  <explanation>Refactor if-else to switch statement</explanation>
  <filePath>src/handler.ts</filePath>
  <oldString>if (type === 'create') {
  handleCreate()
} else if (type === 'update') {
  handleUpdate()
} else if (type === 'delete') {
  handleDelete()
}</oldString>
  <newString>switch (type) {
  case 'create':
    handleCreate()
    break
  case 'update':
    handleUpdate()
    break
  case 'delete':
    handleDelete()
    break
}</newString>
</tool>`,
		},
	],
};
