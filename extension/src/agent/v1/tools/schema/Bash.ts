// schema/Bash.ts
import { z } from "zod"

/**
 * @tool bash
 * @description Executes a shell command in a Bash environment. This tool is ideal for file manipulation, running scripts, and system interactions. Commands are executed from the workspace root. Use this tool for complex operations that are well-suited for the command line.
 * @schema
 * {
 *   command: string; // The Bash command to execute.
 * }
 * @example
 * ```xml
 * <tool name="bash">
 *   <command>grep -r "TODO" ./src</command>
 * </tool>
 * ```
 * @example
 * ```xml
 * <tool name="bash">
 *   <command>find ./dist -name "*.js" -delete</command>
 * </tool>
 * ```
 * @example
 * ```xml
 * <tool name="bash">
 *   <command>curl -sL https://example.com/data.json | jq .items[0].name</command>
 * </tool>
 * ```
 */
const schema = z.object({
	command: z
		.string()
		.describe(
			"The Bash command to execute. The command should be safe and well-formed for a Bash environment."
		),
})

const examples = [
	`<tool name="bash">
  <command>grep -r "TODO" ./src</command>
</tool>`,

	`<tool name="bash">
  <command>find ./dist -name "*.js" -delete</command>
</tool>`,

	`<tool name="bash">
  <command>curl -sL https://example.com/data.json | jq .items[0].name</command>
</tool>`,
]

export const bashTool = {
	schema: {
		name: "bash",
		schema,
	},
	examples,
}

export type BashToolParams = {
	name: "bash"
	input: z.infer<typeof schema>
}

