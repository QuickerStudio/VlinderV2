// schema/kill-bash.ts
import { z } from "zod"

/**
 * @tool kill_bash
 * @description Terminates a running bash process or terminal session. This tool is useful for stopping long-running commands, hanging processes, or cleaning up terminals. You can kill by terminal ID or by terminal name.
 * @schema
 * {
 *   terminalId?: number; // The unique ID of the terminal to kill (optional if terminalName is provided)
 *   terminalName?: string; // The name of the terminal to kill (optional if terminalId is provided)
 *   force?: boolean; // Whether to force kill the terminal (default: false)
 * }
 * @example
 * ```xml
 * <tool name="kill_bash">
 *   <terminalId>1</terminalId>
 * </tool>
 * ```
 * @example
 * ```xml
 * <tool name="kill_bash">
 *   <terminalName>dev-server</terminalName>
 *   <force>true</force>
 * </tool>
 * ```
 * @example
 * ```xml
 * <tool name="kill_bash">
 *   <terminalId>2</terminalId>
 *   <force>false</force>
 * </tool>
 * ```
 */
const schema = z.object({
	terminalId: z
		.number()
		.optional()
		.describe("The unique ID of the terminal to kill. Either terminalId or terminalName must be provided."),
	terminalName: z
		.string()
		.optional()
		.describe("The name of the terminal to kill. Either terminalId or terminalName must be provided."),
	force: z
		.boolean()
		.optional()
		.default(false)
		.describe(
			"Whether to force kill the terminal. If false, attempts graceful termination first. Default is false."
		),
})

const examples = [
	`<tool name="kill_bash">
  <terminalId>1</terminalId>
</tool>`,

	`<tool name="kill_bash">
  <terminalName>dev-server</terminalName>
  <force>true</force>
</tool>`,

	`<tool name="kill_bash">
  <terminalId>2</terminalId>
  <force>false</force>
</tool>`,
]

export const killBashTool = {
	schema: {
		name: "kill_bash",
		schema,
	},
	examples,
}

export type KillBashToolParams = {
	name: "kill_bash"
	input: z.infer<typeof schema>
}

