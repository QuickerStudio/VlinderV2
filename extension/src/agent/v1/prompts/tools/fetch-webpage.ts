import { ToolPromptSchema } from '../utils/utils';

export const fetchWebpagePrompt: ToolPromptSchema = {
	name: 'fetch_webpage',
	description:
		'Fetch and extract content from web pages. Useful for reading documentation, blog posts, GitHub READMEs, and other web content.',
	parameters: {
		url: {
			type: 'string',
			description: 'The HTTP/HTTPS URL to fetch',
			required: true,
		},
		query: {
			type: 'string',
			description:
				'Optional search query to filter relevant content from the page',
			required: false,
		},
	},
	capabilities: [
		'Fetch content from any HTTP/HTTPS URL',
		'Extract readable text from HTML pages',
		'Filter content based on search queries',
		'Automatic content cleaning (removes scripts, styles, ads)',
		'Handle various content types (HTML, plain text)',
	],
	examples: [
		{
			description: 'Fetch documentation without filtering',
			output: `<fetch_webpage>
  <url>https://docs.python.org/3/library/asyncio.html</url>
</fetch_webpage>`,
		},
		{
			description: 'Fetch and filter by query',
			output: `<fetch_webpage>
  <url>https://nodejs.org/api/fs.html</url>
  <query>readFile</query>
</fetch_webpage>`,
		},
		{
			description: 'Fetch GitHub README',
			output: `<fetch_webpage>
  <url>https://github.com/microsoft/vscode/blob/main/README.md</url>
</fetch_webpage>`,
		},
	],
	extraDescriptions: `## When to Use
- Looking up documentation from official websites
- Reading blog posts or articles
- Fetching README files from GitHub
- Getting information from API documentation
- Reading tutorials or guides
- Checking current information from websites

## Important Notes
- Only HTTP and HTTPS protocols are supported
- Content is automatically cleaned (scripts, styles, ads removed)
- Large content is truncated to 50KB
- Requests timeout after 30 seconds
- Use the optional 'query' parameter to filter relevant content
- The tool extracts text content, not raw HTML

## Best Practices
1. **Use specific URLs**: Point to the exact page you need, not just the homepage
2. **Use query parameter**: When you know what you're looking for, use the query to filter content
3. **Check URL validity**: Ensure the URL is correct and accessible
4. **Be patient**: Some pages may take time to load
5. **Prefer official documentation**: Official docs are usually more reliable and well-structured

## Limitations
- Cannot fetch content behind authentication/login
- Cannot execute JavaScript (gets static HTML only)
- Cannot fetch binary files (images, PDFs, etc.)
- Content is limited to 50KB of text
- Requests timeout after 30 seconds
- Cannot bypass CORS or other security restrictions`,
};
