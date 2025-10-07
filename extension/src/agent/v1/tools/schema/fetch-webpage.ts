import { z } from 'zod';

/**
 * Helper function to parse XML string containing url elements into an array
 * Handles the format: <urls><url>...</url><url>...</url></urls>
 *
 * @param xmlString - XML string to parse
 * @returns Array of URLs extracted from the XML
 */
function parseUrlsXml(xmlString: string): string[] {
	const urls: string[] = [];

	// Match all <url>...</url> blocks (non-greedy)
	const urlRegex = /<url>([\s\S]*?)<\/url>/gi;
	let match: RegExpExecArray | null;
	let matchCount = 0;

	while ((match = urlRegex.exec(xmlString)) !== null) {
		matchCount++;
		const urlContent = match[1].trim();

		// Only add non-empty URLs
		if (urlContent && urlContent.length > 0) {
			urls.push(urlContent);
		}
	}

	// Only log if parsing found issues or in debug mode
	if (matchCount > 0 && urls.length === 0) {
		console.warn(`[FetchWebpage] Found ${matchCount} <url> tags but all were empty`);
	} else if (urls.length > 0) {
		console.log(`[FetchWebpage] Successfully parsed ${urls.length} URL(s)`);
	}

	return urls;
}

/**
 * Schema for fetch_webpage tool
 * Fetch and extract content from web pages
 */
const schema = z.object({
	urls: z.preprocess(
		(val) => {
			// If it's already an array, validate and return as-is
			if (Array.isArray(val)) {
				// Filter out any invalid entries
				const validUrls = val.filter(
					(url) => typeof url === 'string' && url.trim().length > 0
				);
				if (validUrls.length !== val.length) {
					console.warn(
						`[FetchWebpage] Filtered out ${val.length - validUrls.length} invalid URL(s)`
					);
				}
				return validUrls;
			}

			// If it's undefined or null, return empty array to trigger validation error
			if (val === undefined || val === null) {
				console.error(
					'[FetchWebpage] Missing urls parameter - AI did not provide <urls> tag'
				);
				return [];
			}

			// If it's a string, parse it
			if (typeof val === 'string') {
				const trimmed = val.trim();

				// Check if string is empty
				if (trimmed.length === 0) {
					console.error('[FetchWebpage] Empty urls parameter');
					return [];
				}

				// Try JSON format first (alternative format: ["url1", "url2"])
				if (trimmed.startsWith('[')) {
					try {
						const parsed = JSON.parse(trimmed);
						if (Array.isArray(parsed)) {
							const validUrls = parsed.filter(
								(url) => typeof url === 'string' && url.trim().length > 0
							);
							if (validUrls.length > 0) {
								console.log(
									`[FetchWebpage] Parsed ${validUrls.length} URL(s) from JSON`
								);
								return validUrls;
							}
						}
						console.error('[FetchWebpage] JSON format invalid - not an array of strings');
						return [];
					} catch (error) {
						// JSON parsing failed, will try XML
						console.warn('[FetchWebpage] JSON parsing failed, trying XML format');
					}
				}

				// Parse as XML format: <urls><url>...</url></urls>
				const parsed = parseUrlsXml(trimmed);

				if (parsed.length === 0) {
					console.error(
						'[FetchWebpage] No valid URLs found in XML. Expected format: <urls><url>https://example.com</url></urls>'
					);
				}

				return parsed;
			}

			// Invalid type
			console.error(
				`[FetchWebpage] Invalid urls type: ${typeof val}. Expected array or string.`
			);
			return [];
		},
		z
			.array(z.string().url())
			.min(1, {
				message:
					'At least one URL is required. Make sure to include <url>...</url> tags inside <urls>...</urls>.',
			})
			.max(10, {
				message: 'Maximum 10 URLs allowed.',
			})
			.describe('Array of URLs to fetch (maximum 10 URLs)')
	),
	query: z
		.string()
		.optional()
		.describe(
			'Optional search query to filter relevant content from the pages. If provided, only content matching this query will be returned.'
		),
});

const examples = [
	`<tool name="fetch_webpage">
  <urls>
    <url>https://docs.python.org/3/library/asyncio.html</url>
  </urls>
  <query>event loop</query>
</tool>`,

	`<tool name="fetch_webpage">
  <urls>
    <url>https://github.com/microsoft/vscode/blob/main/README.md</url>
  </urls>
</tool>`,

	`<tool name="fetch_webpage">
  <urls>
    <url>https://nodejs.org/api/fs.html</url>
    <url>https://nodejs.org/api/path.html</url>
  </urls>
  <query>readFile</query>
</tool>`,

	`<tool name="fetch_webpage">
  <urls>
    <url>https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise</url>
  </urls>
  <query>async await</query>
</tool>`,

	`<tool name="fetch_webpage">
  <urls>
    <url>https://www.typescriptlang.org/docs/handbook/2/generics.html</url>
    <url>https://www.typescriptlang.org/docs/handbook/2/conditional-types.html</url>
  </urls>
  <query>generic constraints</query>
</tool>`,
];

export const fetchWebpageTool = {
	schema: {
		name: 'fetch_webpage',
		schema,
	},
	examples,
};

export type FetchWebpageToolParams = {
	name: 'fetch_webpage';
	input: z.infer<typeof schema>;
};
