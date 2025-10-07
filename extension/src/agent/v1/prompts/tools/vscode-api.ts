import { ToolPromptSchema } from '../utils/utils';

export const vscodeApiPrompt: ToolPromptSchema = {
	name: 'get_vscode_api',
	description:
		'Search the VS Code API documentation for information about VS Code extension development APIs.',
	parameters: {
		query: {
			type: 'string',
			description:
				"The search query for VS Code API documentation (e.g., 'window', 'TextEditor', 'showInformationMessage')",
			required: true,
		},
	},
	capabilities: [
		'Search for VS Code API classes, interfaces, functions, and namespaces',
		'Get documentation for specific API members',
		'Find usage examples and descriptions',
		'Help with VS Code extension development',
	],
	examples: [
		{
			description: 'Search for window API',
			output: `<get_vscode_api>
  <query>window</query>
</get_vscode_api>`,
		},
		{
			description: 'Search for TextEditor class',
			output: `<get_vscode_api>
  <query>TextEditor</query>
</get_vscode_api>`,
		},
		{
			description: 'Search for a specific method',
			output: `<get_vscode_api>
  <query>showInformationMessage</query>
</get_vscode_api>`,
		},
	],
	extraDescriptions: `### When to Use
Use this tool when you need to:
- Look up VS Code API documentation
- Find information about VS Code extension APIs
- Get details about specific VS Code API members (e.g., window, workspace, commands)
- Understand how to use VS Code extension APIs
- Find the correct API for a specific task in VS Code extension development

### When NOT to Use
- For general programming questions not related to VS Code APIs
- For searching user's codebase (use codebase search instead)
- For web searches (use fetch_webpage instead)
- For TypeScript/JavaScript general documentation (use fetch_webpage with appropriate docs URL)

### Output Format
Returns XML-formatted documentation with:
- Query used for search
- Number of results found
- Link to official documentation
- Relevant API documentation sections

### Best Practices
1. **Be specific**: Use specific API names for better results
2. **Use official names**: Use the exact API names from VS Code documentation
3. **Check multiple terms**: If one search doesn't work, try related terms
4. **Combine with fetch_webpage**: For more detailed examples, fetch specific documentation pages
5. **Verify API availability**: Check if the API is stable or proposed

### Limitations
- Searches the official VS Code API documentation website
- Does not include semantic/embedding-based search
- May not find very new or proposed APIs immediately
- Results are limited to top 5 most relevant sections
- Requires internet connection to fetch documentation`,
};
