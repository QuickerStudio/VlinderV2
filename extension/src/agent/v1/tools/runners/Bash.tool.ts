// runners/Bash.tool.ts
import { AdvancedTerminalManager } from "../../../../integrations/terminal"
import { BaseAgentTool } from "../base-agent.tool"
import { BashToolParams } from "../schema/Bash"
import { ToolResponseV2 } from "../../types"

export class BashTool extends BaseAgentTool<BashToolParams> {
	private output: string = ""

	async execute(): Promise<ToolResponseV2> {
		const { input, say, ask, updateAsk } = this.params
		const command = input.command

		if (!command?.trim()) {
			await say("error", "The 'bash' tool was called without a 'command'. Retrying...")
			return this.toolResponse("error", "Error: Missing or empty 'command' parameter.")
		}

		const { response } = await ask(
			"tool",
			{
				tool: {
					tool: "bash",
					command,
					approvalState: "pending",
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		)

		if (response !== "yesButtonTapped") {
			await updateAsk(
				"tool",
				{
					tool: {
						tool: "bash",
						command,
						approvalState: "rejected",
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			)
			return this.toolResponse("rejected", this.formatToolDenied())
		}

		await updateAsk(
			"tool",
			{
				tool: {
					tool: "bash",
					command,
					approvalState: "loading",
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		)

		const { terminalManager } = this.MainAgent
		if (!(terminalManager instanceof AdvancedTerminalManager)) {
			throw new Error("AdvancedTerminalManager is not available")
		}

		const terminalInfo = await terminalManager.getOrCreateTerminal(this.cwd)
		terminalInfo.terminal.show()

		const process = terminalManager.runCommand(terminalInfo, command, { autoClose: false })

		return new Promise<ToolResponseV2>((resolve) => {
			process.on("line", (line) => {
				this.output += line + "\n"
			})

			process.once("completed", async () => {
				await updateAsk(
					"tool",
					{
						tool: {
							tool: "bash",
							command,
							output: this.output,
							approvalState: "approved",
							ts: this.ts,
							isSubMsg: this.params.isSubMsg,
						},
					},
					this.ts
				)
				const toolRes = `<bash_output>\n${this.output}\n</bash_output>`
				resolve(this.toolResponse("success", toolRes))
			})

			process.once("no_shell_integration", async () => {
				await say("error", "Shell integration is not available. Output cannot be captured.")
				resolve(this.toolResponse("error", "Shell integration not available."))
			})
		})
	}
}

