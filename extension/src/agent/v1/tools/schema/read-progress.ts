// schema/read-progress.ts
import { z } from "zod"

/**
 * @tool read_progress
 * @description Reads the current progress and output of a running terminal process. Use this to check if a long-running command is progressing normally or has encountered issues. Useful for monitoring build processes, dev servers, or any command that takes time to complete.
 * @schema
 * {
 *   terminalId?: number; // The unique ID of the terminal to check (optional if terminalName is provided)
 *   terminalName?: string; // The name of the terminal to check (optional if terminalId is provided)
 *   includeFullOutput?: boolean; // Whether to include full output history (default: false, only recent output)
 * }
 * @example
 * ```xml
 * <tool name="read_progress">
 *   <terminalId>1</terminalId>
 * </tool>
 * ```
 * @example
 * ```xml
 * <tool name="read_progress">
 *   <terminalName>dev-server</terminalName>
 *   <includeFullOutput>true</includeFullOutput>
 * </tool>
 * ```
 */
const schema = z.object({
	terminalId: z
		.number()
		.optional()
		.describe("The unique ID of the terminal to check. Either terminalId or terminalName must be provided."),
	terminalName: z
		.string()
		.optional()
		.describe("The name of the terminal to check. Either terminalId or terminalName must be provided."),
	includeFullOutput: z
		.boolean()
		.optional()
		.default(false)
		.describe("Whether to include full output history. Default is false (only recent output)."),
})

const examples = [
	`<tool name="read_progress">
  <terminalId>1</terminalId>
</tool>`,

	`<tool name="read_progress">
  <terminalName>dev-server</terminalName>
  <includeFullOutput>true</includeFullOutput>
</tool>`,

	`<tool name="read_progress">
  <terminalId>2</terminalId>
  <includeFullOutput>false</includeFullOutput>
</tool>`,
]

export const readProgressTool = {
	schema: {
		name: "read_progress",
		schema,
	},
	examples,
}

export type ReadProgressToolParams = {
	name: "read_progress"
	input: z.infer<typeof schema>
}

