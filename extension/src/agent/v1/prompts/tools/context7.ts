import { ToolPromptSchema } from '../utils/utils';

export const context7Prompt: ToolPromptSchema = {
	name: 'context7',
	description:
		'Fetch up-to-date documentation for libraries and frameworks using the Context7 API.',
	parameters: {
		libraryName: {
			type: 'string',
			description:
				'Library name (e.g., "react", "express") or Context7 library ID (e.g., "/vercel/next.js")',
			required: true,
		},
		topic: {
			type: 'string',
			description:
				'Optional topic to focus on (e.g., "hooks", "routing", "authentication")',
			required: false,
		},
		tokens: {
			type: 'number',
			description:
				'Maximum tokens to retrieve (default: 5000, max: 10000)',
			required: false,
		},
	},
	capabilities: [
		'Fetch comprehensive library documentation',
		'Automatic library name resolution to Context7 IDs',
		'Topic-based filtering for focused documentation',
		'Support for version-specific documentation',
		'Covers popular libraries: React, Vue, Angular, Express, Next.js, MongoDB, TypeScript, etc.',
	],
	examples: [
		{
			description: 'Fetch React hooks documentation',
			output: `<context7>
  <libraryName>react</libraryName>
  <topic>hooks</topic>
</context7>`,
		},
		{
			description: 'Fetch Express routing documentation with custom token limit',
			output: `<context7>
  <libraryName>express</libraryName>
  <topic>routing</topic>
  <tokens>3000</tokens>
</context7>`,
		},
		{
			description: 'Fetch Next.js documentation using library ID',
			output: `<context7>
  <libraryName>/vercel/next.js</libraryName>
  <topic>server components</topic>
</context7>`,
		},
		{
			description: 'Fetch general TypeScript documentation',
			output: `<context7>
  <libraryName>typescript</libraryName>
</context7>`,
		},
		{
			description: 'Fetch MongoDB aggregation documentation',
			output: `<context7>
  <libraryName>/mongodb/docs</libraryName>
  <topic>aggregation</topic>
  <tokens>8000</tokens>
</context7>`,
		},
	],
	usageNotes: `
**When to Use:**
- When you need to understand how to use a specific library or framework
- When implementing features that require library-specific knowledge
- When troubleshooting issues related to third-party libraries
- When you need API reference documentation
- When learning about best practices for a library

**Best Practices:**
1. **Be Specific with Topics**: Use the \`topic\` parameter to narrow down documentation to relevant sections
2. **Start with Lower Token Limits**: Begin with default 5000 tokens and increase only if needed
3. **Use Library IDs for Precision**: If you know the exact Context7 library ID, use it directly
4. **Combine with Code Search**: Use this tool alongside code search to understand both documentation and implementation

**Common Libraries:**
- Frontend: react, vue, angular, svelte, next.js, nuxt
- Backend: express, fastify, koa, nest.js
- Databases: mongodb, postgresql, mysql, redis
- Tools: typescript, webpack, vite, eslint, jest
- Cloud: aws-sdk, azure-sdk, google-cloud

**Output Format:**
The tool returns documentation in XML format:
\`\`\`xml
<context7_documentation>
  <library_name>react</library_name>
  <library_id>/facebook/react</library_id>
  <topic>hooks</topic>
  <documentation>
    [Documentation content here...]
  </documentation>
</context7_documentation>
\`\`\`

**Error Handling:**
- If library name cannot be resolved, the tool will return an error with suggestions
- If documentation is not available, the tool will indicate this clearly
- Network errors are automatically retried up to 2 times
- Timeout is set to 30 seconds per request

**Tips:**
- For version-specific documentation, use the format: /org/project/version
- If unsure about the library name, try common variations (e.g., "nextjs" vs "next.js")
- Use broader topics first, then narrow down if needed
- Combine multiple queries for different topics of the same library if comprehensive coverage is needed
`,
};

