import { BaseAgentTool } from "../base-agent.tool"
import { WebFetchToolParams } from "../schema/web_fetch"
import { ToolResponseV2 } from "../../types"
import { serializeError } from "serialize-error"

export class WebFetchTool extends BaseAgentTool<WebFetchToolParams> {
	private abortController: AbortController = new AbortController()
	private isAborting: boolean = false

	override async abortToolExecution() {
		const { didAbort } = await super.abortToolExecution()
		if (didAbort) {
			this.isAborting = true
			this.abortController.abort()
			return { didAbort: true }
		}
		return { didAbort }
	}

	async execute() {
		const url = this.params.input.url
		const useContext7 = this.params.input.use_context7

		if (!url) {
			return await this.onBadInputReceived()
		}

		try {
			// Create a promise that resolves when aborted
			const abortPromise = new Promise<ToolResponseV2>((_, reject) => {
				this.abortController?.signal?.addEventListener("abort", () => {
					reject(new Error("Tool execution was aborted"))
				})
			})

			// Create the main execution promise
			const execPromise = this.executeWebFetch(url, useContext7)

			// Race between execution and abort
			return await Promise.race([execPromise, abortPromise])
		} catch (err) {
			if (this.isAborting) {
				return this.toolResponse(
					"error",
					`<web_fetch_response>
						<status>
							<result>error</result>
							<operation>web_fetch</operation>
							<timestamp>${new Date().toISOString()}</timestamp>
						</status>
						<error_details>
							<type>execution_aborted</type>
							<message>The tool execution was aborted</message>
							<url>${url}</url>
						</error_details>
					</web_fetch_response>`
				)
			}
			throw err
		}
	}

	private async executeWebFetch(url: string, useContext7?: boolean): Promise<ToolResponseV2> {
		const { ask, say, updateAsk } = this.params

		try {
			// First, ask for permission and show loading state
			const { response, text, images } = await ask(
				"tool",
				{
					tool: {
						tool: "web_fetch",
						url,
						approvalState: "pending",
						ts: this.ts,
					},
				},
				this.ts
			)

			if (response !== "yesButtonTapped") {
				await updateAsk(
					"tool",
					{
						tool: {
							tool: "web_fetch",
							url,
							approvalState: "rejected",
							userFeedback: text,
							ts: this.ts,
						},
					},
					this.ts
				)
				await say("user_feedback", text ?? "The user denied this operation.", images)
				return this.toolResponse("feedback", `Request rejected: web fetch from ${url}${text ? `\n<user_feedback>${text}</user_feedback>` : ""}`, images)
			}

			// Remove the say call to avoid duplicate text outside the tool block

			// Check if aborted before fetch
			if (this.abortController?.signal?.aborted) {
				throw new Error("Tool execution was aborted")
			}

			// Fetch the webpage content
			const fetchResponse = await fetch(url, {
				signal: this.abortController.signal,
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
				}
			})

			if (!fetchResponse.ok) {
				throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`)
			}

			const html = await fetchResponse.text()

			// Check if aborted before processing
			if (this.abortController?.signal?.aborted) {
				throw new Error("Tool execution was aborted")
			}

			// Convert HTML to markdown
			let markdown = this.htmlToMarkdown(html, url)

			// Add Context7 MCP support if requested
			if (useContext7) {
				markdown += '\n\n---\n\n## Context7 MCP Enhancement\n\n'

				const context7Info = await this.tryContext7Enhancement(url, markdown)
				if (context7Info) {
					markdown += context7Info
				} else {
					// Add a note that Context7 was attempted but no enhancement was found
					markdown += '*Context7 MCP enhancement was requested but no matching library documentation was found for this URL.*\n\n'
					markdown += '**Supported Libraries:** React, Vue, MongoDB, Next.js, Supabase, Prisma, TailwindCSS, Node.js, Express, Python\n\n'
					markdown += '**Usage:** Add `use_context7: true` when fetching documentation for popular libraries to get enhanced information.'
				}
			}

			// Update the tool state to approved with content
			await updateAsk(
				"tool",
				{
					tool: {
						tool: "web_fetch",
						url,
						content: markdown,
						approvalState: "approved",
						ts: this.ts,
					},
				},
				this.ts
			)

			const successResponse = `<web_fetch_response>
				<status>
					<result>success</result>
					<operation>web_fetch</operation>
					<timestamp>${new Date().toISOString()}</timestamp>
				</status>
				<fetch_details>
					<url>${url}</url>
					<content_length>${markdown.length}</content_length>
					<status_code>${fetchResponse.status}</status_code>
				</fetch_details>
				<content>
${markdown}
				</content>
			</web_fetch_response>`

			return this.toolResponse("success", successResponse)

		} catch (error) {
			if (this.isAborting || this.abortController?.signal?.aborted) {
				throw error // Re-throw to be handled by the outer catch
			}

			const errorMessage = error instanceof Error ? error.message : String(error)
			const serializedError = serializeError(error)

			// Update the tool state to error
			await this.params.updateAsk(
				"tool",
				{
					tool: {
						tool: "web_fetch",
						url,
						approvalState: "error",
						error: errorMessage,
						ts: this.ts,
					},
				},
				this.ts
			)

			const errorResponse = `<web_fetch_response>
				<status>
					<result>error</result>
					<operation>web_fetch</operation>
					<timestamp>${new Date().toISOString()}</timestamp>
				</status>
				<error_details>
					<type>fetch_error</type>
					<message>${errorMessage}</message>
					<url>${url}</url>
					<details>${JSON.stringify(serializedError, null, 2)}</details>
				</error_details>
			</web_fetch_response>`

			return this.toolResponse("error", errorResponse)
		}
	}

	private htmlToMarkdown(html: string, baseUrl: string): string {
		// Enhanced HTML to Markdown conversion with better content preservation
		const images: Array<{url: string, alt: string, title?: string, context?: string}> = []

		// Remove script, style, and other non-content tags
		let markdown = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
		markdown = markdown.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
		markdown = markdown.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
		markdown = markdown.replace(/<!--[\s\S]*?-->/g, '')

		// Convert headings with better formatting
		markdown = markdown.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n\n')
		markdown = markdown.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n\n')
		markdown = markdown.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n\n')
		markdown = markdown.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n\n')
		markdown = markdown.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n##### $1\n\n')
		markdown = markdown.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n###### $1\n\n')

		// Convert blockquotes
		markdown = markdown.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_match, content) => {
			const lines = content.trim().split('\n')
			return '\n' + lines.map((line: string) => `> ${line.trim()}`).join('\n') + '\n\n'
		})

		// Convert code blocks with language detection
		markdown = markdown.replace(/<pre[^>]*><code[^>]*class=["']?language-([^"'\s>]+)["']?[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```$1\n$2\n```\n\n')
		markdown = markdown.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n')
		markdown = markdown.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '```\n$1\n```\n\n')

		// Convert inline code
		markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')

		// Convert tables
		markdown = markdown.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_match, tableContent) => {
			let result = '\n'

			// Extract table rows
			const rows = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || []

			rows.forEach((row: string, index: number) => {
				// Extract cells (th or td)
				const cells = row.match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi) || []
				const cellContents = cells.map((cell: string) => {
					return cell.replace(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi, '$1').trim()
				})

				if (cellContents.length > 0) {
					result += '| ' + cellContents.join(' | ') + ' |\n'

					// Add header separator for first row
					if (index === 0) {
						result += '| ' + cellContents.map(() => '---').join(' | ') + ' |\n'
					}
				}
			})

			return result + '\n'
		})

		// Collect images but don't display them in main content
		markdown = markdown.replace(/<img[^>]*>/gi, (match) => {
			const srcMatch = match.match(/src=["']([^"']*)["']/)
			const altMatch = match.match(/alt=["']([^"']*)["']/)
			const titleMatch = match.match(/title=["']([^"']*)["']/)

			if (srcMatch) {
				let src = srcMatch[1]
				const alt = altMatch ? altMatch[1] : ''
				const title = titleMatch ? ` "${titleMatch[1]}"` : ''

				// Convert relative URLs to absolute URLs
				if (src.startsWith('/')) {
					const urlObj = new URL(baseUrl)
					src = `${urlObj.protocol}//${urlObj.host}${src}`
				} else if (src.startsWith('./') || (!src.startsWith('http') && !src.startsWith('data:'))) {
					try {
						src = new URL(src, baseUrl).href
					} catch (e) {
						// Keep original src if URL parsing fails
					}
				}

				// Collect image information
				images.push({
					url: src,
					alt: alt || 'Image',
					title: title || undefined
				})

				// Return placeholder text instead of image markdown
				return alt ? `[Image: ${alt}]` : '[Image]'
			}
			return ''
		})

		// Convert links with better URL handling
		markdown = markdown.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_match, href, text) => {
			let url = href

			// Convert relative URLs to absolute URLs
			if (url.startsWith('/')) {
				const urlObj = new URL(baseUrl)
				url = `${urlObj.protocol}//${urlObj.host}${url}`
			} else if (url.startsWith('./') || (!url.startsWith('http') && !url.startsWith('mailto:') && !url.startsWith('#'))) {
				try {
					url = new URL(url, baseUrl).href
				} catch (e) {
					// Keep original URL if parsing fails
				}
			}

			return `[${text.trim()}](${url})`
		})

		// Convert lists with better nesting support
		markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_match, content) => {
			const items = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || []
			const listItems = items.map((item: string) => {
				const itemContent = item.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '$1').trim()
				return `- ${itemContent}`
			}).join('\n')
			return '\n' + listItems + '\n\n'
		})

		markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_match, content) => {
			const items = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || []
			const listItems = items.map((item: string, index: number) => {
				const itemContent = item.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '$1').trim()
				return `${index + 1}. ${itemContent}`
			}).join('\n')
			return '\n' + listItems + '\n\n'
		})

		// Convert emphasis and strong
		markdown = markdown.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
		markdown = markdown.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
		markdown = markdown.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
		markdown = markdown.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')

		// Convert horizontal rules
		markdown = markdown.replace(/<hr[^>]*>/gi, '\n---\n\n')

		// Convert paragraphs
		markdown = markdown.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n\n')

		// Convert divs to paragraphs (common in modern web)
		markdown = markdown.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '\n$1\n')

		// Convert line breaks
		markdown = markdown.replace(/<br[^>]*\/?>/gi, '\n')

		// Remove remaining HTML tags but preserve their content
		markdown = markdown.replace(/<[^>]*>/g, '')

		// Decode HTML entities
		markdown = markdown.replace(/&amp;/g, '&')
		markdown = markdown.replace(/&lt;/g, '<')
		markdown = markdown.replace(/&gt;/g, '>')
		markdown = markdown.replace(/&quot;/g, '"')
		markdown = markdown.replace(/&#39;/g, "'")
		markdown = markdown.replace(/&nbsp;/g, ' ')
		markdown = markdown.replace(/&mdash;/g, '—')
		markdown = markdown.replace(/&ndash;/g, '–')
		markdown = markdown.replace(/&hellip;/g, '…')
		markdown = markdown.replace(/&copy;/g, '©')
		markdown = markdown.replace(/&reg;/g, '®')
		markdown = markdown.replace(/&trade;/g, '™')

		// Clean up extra whitespace and normalize line breaks
		markdown = markdown.replace(/\n\s*\n\s*\n/g, '\n\n')
		markdown = markdown.replace(/^\s+|\s+$/gm, '') // Trim each line
		markdown = markdown.replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
		markdown = markdown.trim()

		// Add images list at the end if there are any images
		if (images.length > 0) {
			markdown += '\n\n---\n\n## Images found on this page\n\n'
			images.forEach((img, index) => {
				const description = img.alt || 'Image'
				const titleText = img.title ? ` (${img.title})` : ''
				markdown += `${index + 1}. **${description}**${titleText}\n   - URL: ${img.url}\n\n`
			})
		}

		return markdown
	}

	/**
	 * Try to enhance the web fetch result with Context7 MCP library documentation
	 */
	private async tryContext7Enhancement(url: string, markdown: string): Promise<string | null> {
		try {
			// Detect if this URL is for a popular library/framework documentation
			const libraryInfo = this.detectLibraryFromUrl(url, markdown)

			if (!libraryInfo) {
				return null
			}

			// Try to get enhanced documentation from Context7
			const context7Content = await this.getContext7Documentation(libraryInfo)

			if (context7Content) {
				return `\n\n---\n\n## Enhanced Documentation (Context7 MCP)\n\n${context7Content}`
			}

			return null
		} catch (error) {
			// Silently fail - Context7 is optional enhancement
			console.warn('Context7 enhancement failed:', error)
			return null
		}
	}

	/**
	 * Detect library/framework from URL and content
	 */
	private detectLibraryFromUrl(url: string, markdown: string): { name: string; type: string } | null {
		const urlLower = url.toLowerCase()
		const markdownLower = markdown.toLowerCase()

		// Popular libraries/frameworks detection
		const libraries = [
			{ patterns: ['docs.react.dev', 'reactjs.org', 'react'], name: 'react', type: 'framework' },
			{ patterns: ['vuejs.org', 'vue'], name: 'vue', type: 'framework' },
			{ patterns: ['docs.mongodb.com', 'mongodb'], name: 'mongodb', type: 'database' },
			{ patterns: ['nextjs.org', 'next.js'], name: 'next.js', type: 'framework' },
			{ patterns: ['docs.supabase.com', 'supabase'], name: 'supabase', type: 'backend' },
			{ patterns: ['docs.prisma.io', 'prisma'], name: 'prisma', type: 'orm' },
			{ patterns: ['tailwindcss.com', 'tailwind'], name: 'tailwindcss', type: 'css' },
			{ patterns: ['nodejs.org', 'node.js'], name: 'nodejs', type: 'runtime' },
			{ patterns: ['expressjs.com', 'express'], name: 'express', type: 'framework' },
			{ patterns: ['docs.python.org', 'python'], name: 'python', type: 'language' },
		]

		for (const lib of libraries) {
			if (lib.patterns.some(pattern => urlLower.includes(pattern) || markdownLower.includes(pattern))) {
				return { name: lib.name, type: lib.type }
			}
		}

		return null
	}

	/**
	 * Get enhanced documentation from Context7 MCP (simulated)
	 */
	private async getContext7Documentation(libraryInfo: { name: string; type: string }): Promise<string | null> {
		// This is a placeholder implementation
		// In a real implementation, this would call the actual Context7 MCP tools
		// like resolve-library-id_Context_7 and get-library-docs_Context_7

		try {
			// Simulate Context7 MCP call
			const enhancedDocs = `### ${libraryInfo.name} (${libraryInfo.type})

**Context7 Enhanced Information:**

This library documentation has been enhanced with Context7 MCP. Context7 provides:
- Up-to-date API references
- Code examples and best practices
- Common patterns and usage scenarios
- Integration guides and troubleshooting

*Note: This is a placeholder implementation. In production, this would integrate with actual Context7 MCP tools to provide real enhanced documentation.*

**Suggested Actions:**
- Use \`resolve-library-id_Context_7\` to get the exact library ID
- Use \`get-library-docs_Context_7\` to fetch comprehensive documentation
- Focus on specific topics like 'getting-started', 'api-reference', or 'examples'`

			return enhancedDocs
		} catch (error) {
			console.warn('Failed to get Context7 documentation:', error)
			return null
		}
	}

	private async onBadInputReceived(): Promise<ToolResponseV2> {
		return this.toolResponse(
			"error",
			`<web_fetch_response>
				<status>
					<result>error</result>
					<operation>web_fetch</operation>
					<timestamp>${new Date().toISOString()}</timestamp>
				</status>
				<error_details>
					<type>invalid_input</type>
					<message>URL parameter is required</message>
				</error_details>
			</web_fetch_response>`
		)
	}
}
