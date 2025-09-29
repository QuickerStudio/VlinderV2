// schema/web_fetch.ts
import { z } from "zod"

/**
 * @tool web_fetch
 * @description Fetches data from a webpage and converts it into Markdown format. This tool takes a URL and returns the content of the page in Markdown format. If the return is not valid Markdown, it means the tool cannot successfully parse this page. Optionally supports Context7 MCP for enhanced library documentation retrieval.
 * @schema
 * {
 *   url: string; // The URL to fetch content from.
 *   use_context7?: boolean; // Optional: Whether to use Context7 MCP for enhanced library documentation retrieval. Use this when fetching documentation for popular libraries/frameworks.
 * }
 * @example
 * ```xml
 * <tool name="web_fetch">
 *   <url>https://docs.react.dev/learn/getting-started</url>
 * </tool>
 * ```
 * @example
 * ```xml
 * <tool name="web_fetch">
 *   <url>https://github.com/microsoft/vscode/blob/main/README.md</url>
 * </tool>
 * ```
 * @example
 * ```xml
 * <tool name="web_fetch">
 *   <url>https://nodejs.org/en/docs/guides/getting-started-guide</url>
 * </tool>
 * ```
 * @example
 * ```xml
 * <tool name="web_fetch">
 *   <url>https://docs.mongodb.com/manual/tutorial/getting-started/</url>
 *   <use_context7>true</use_context7>
 * </tool>
 * ```
 */
const schema = z.object({
	url: z.string().url().describe("The URL to fetch content from. Must be a valid HTTP/HTTPS URL."),
	use_context7: z.boolean().optional().describe("Optional: Whether to use Context7 MCP for enhanced library documentation retrieval. Use this when fetching documentation for popular libraries/frameworks like React, Vue, MongoDB, etc."),
})

const examples = [
	`<tool name="web_fetch">
  <url>https://docs.react.dev/learn/getting-started</url>
</tool>`,

	`<tool name="web_fetch">
  <url>https://github.com/microsoft/vscode/blob/main/README.md</url>
</tool>`,

	`<tool name="web_fetch">
  <url>https://nodejs.org/en/docs/guides/getting-started-guide</url>
</tool>`,

	`<tool name="web_fetch">
  <url>https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide</url>
</tool>`,

	`<tool name="web_fetch">
  <url>https://docs.mongodb.com/manual/tutorial/getting-started/</url>
  <use_context7>true</use_context7>
</tool>`,
]

export const webFetchTool = {
	schema: {
		name: "web_fetch",
		schema,
	},
	examples,
}

export type WebFetchToolParams = {
	name: "web_fetch"
	input: z.infer<typeof schema>
}
