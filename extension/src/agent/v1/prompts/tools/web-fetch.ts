import { ToolPromptSchema } from "../utils/utils"

export const webFetchPrompt: ToolPromptSchema = {
	name: "web_fetch",
	description:
		"Fetches data from a webpage and converts it into Markdown format. This tool takes a URL and returns the content of the page in Markdown format. Use this tool when you need to read and analyze content from web pages, documentation sites, articles, or any other web-based content.",
	parameters: {
		url: {
			type: "string",
			description: "The URL to fetch content from. Must be a valid HTTP/HTTPS URL.",
			required: true,
		},
	},
	capabilities: [
		"Fetch content from any publicly accessible webpage",
		"Convert HTML content to clean Markdown format",
		"Handle various content types including articles, documentation, and blog posts",
		"Extract text content while preserving structure (headings, lists, links, etc.)",
		"Remove unnecessary elements like scripts, styles, and ads",
		"Support for timeout and abort functionality",
		"LIMITATIONS: Cannot access pages that require authentication or login",
		"LIMITATIONS: May not work with heavily JavaScript-dependent single-page applications",
		"LIMITATIONS: Cannot interact with dynamic content that loads after page load",
		"LIMITATIONS: Subject to rate limiting and anti-bot measures on some sites",
		"LIMITATIONS: Cannot access localhost or internal network URLs for security reasons",
		"USAGE: Always verify the URL is accessible and publicly available before using this tool",
		"USAGE: The tool will automatically handle common HTML elements and convert them to appropriate Markdown",
		"USAGE: Large pages may take some time to process - the tool includes timeout protection",
		"USAGE: Use this tool when you need to analyze, summarize, or work with web-based content",
	],
	examples: [
		{
			description: "Fetch documentation from a public API",
			output: `<web_fetch>
<url>https://docs.github.com/en/rest/overview/resources-in-the-rest-api</url>
</web_fetch>`,
		},
		{
			description: "Get content from a technical blog post",
			output: `<web_fetch>
<url>https://blog.example.com/how-to-optimize-react-performance</url>
</web_fetch>`,
		},
		{
			description: "Read content from a news article",
			output: `<web_fetch>
<url>https://example-news.com/latest-tech-trends-2024</url>
</web_fetch>`,
		},
	],
}
