import { ToolPromptSchema } from "../utils/utils"

export const bashToolPrompt: ToolPromptSchema = {
	name: "bash",
	description:
		"Executes a shell command in a Bash environment. This tool is ideal for file manipulation, running scripts, and system interactions. Commands are executed from the workspace root: {{cwd}}",
	parameters: {
		command: {
			type: "string",
			description:
				"The Bash command to execute. The command should be safe and well-formed for a Bash environment. Avoid long-running processes or servers; use dedicated tools for those.",
			required: true,
		},
	},
	capabilities: [
		"You can use the 'bash' tool to execute any standard Bash command. This is useful for tasks like checking file contents with 'grep', finding files with 'find', or running build scripts. Ensure your commands are non-interactive.",
	],

	examples: [
		{
			description: "Find all TypeScript files in the 'src' directory",
			output: `<bash>\n  <command>find ./src -name "*.ts"</command>\n</bash>`,
		},
		{
			description: "Count the number of lines in a file",
			output: `<bash>\n  <command>wc -l ./src/agent/v1/tools/schema/Bash.ts</command>\n</bash>`,
		},
	],
}

