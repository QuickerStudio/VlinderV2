// runners/kill-bash.tool.ts
import { AdvancedTerminalManager } from "../../../../integrations/terminal"
import { TerminalRegistry } from "../../../../integrations/terminal/terminal-manager"
import { BaseAgentTool } from "../base-agent.tool"
import { KillBashToolParams } from "../schema/kill-bash"
import { ToolResponseV2 } from "../../types"

export class KillBashTool extends BaseAgentTool<KillBashToolParams> {
	async execute(): Promise<ToolResponseV2> {
		const { input, say, ask, updateAsk } = this.params
		const { terminalId, terminalName, force } = input

		// Validate that at least one identifier is provided
		if (terminalId === undefined && !terminalName) {
			await say(
				"error",
				"The 'kill_bash' tool was called without a 'terminalId' or 'terminalName'. Retrying..."
			)
			return this.toolResponse("error", "Error: Either 'terminalId' or 'terminalName' must be provided.")
		}

		const { terminalManager } = this.MainAgent
		if (!(terminalManager instanceof AdvancedTerminalManager)) {
			throw new Error("AdvancedTerminalManager is not available")
		}

		// Find the terminal to kill
		let targetTerminal
		let targetId: number | undefined

		if (terminalId !== undefined) {
			targetTerminal = TerminalRegistry.getTerminal(terminalId)
			targetId = terminalId
		} else if (terminalName) {
			targetTerminal = TerminalRegistry.getTerminalByName(terminalName)
			targetId = targetTerminal?.id
		}

		if (!targetTerminal || targetId === undefined) {
			const identifier = terminalId !== undefined ? `ID ${terminalId}` : `name "${terminalName}"`
			await say("error", `No terminal found with ${identifier}`)
			return this.toolResponse(
				"error",
				`Error: No terminal found with ${identifier}. The terminal may have already been closed or does not exist.`
			)
		}

		// Get terminal info for display
		const terminalDisplayName = targetTerminal.name || `Terminal ${targetId}`
		const lastCommand = targetTerminal.lastCommand || "No command"
		const isBusy = targetTerminal.busy

		// Ask for user confirmation
		const { response, text, images } = await ask(
			"tool",
			{
				tool: {
					tool: "kill_bash",
					terminalId: targetId,
					terminalName: targetTerminal.name,
					lastCommand,
					isBusy,
					force: force ?? false,
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
						tool: "kill_bash",
						terminalId: targetId,
						terminalName: targetTerminal.name,
						lastCommand,
						isBusy,
						force: force ?? false,
						approvalState: "rejected",
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			)

			if (text) {
				await say("user_feedback", text, images)
			}

			return this.toolResponse(
				"rejected",
				this.formatToolDeniedFeedback(text || "User denied the terminal kill operation.")
			)
		}

		// Update to loading state
		await updateAsk(
			"tool",
			{
				tool: {
					tool: "kill_bash",
					terminalId: targetId,
					terminalName: targetTerminal.name,
					lastCommand,
					isBusy,
					force: force ?? false,
					approvalState: "loading",
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		)

		try {
			// Check if this is a dev server
			const devServer = TerminalRegistry.getDevServer(targetId)
			const isDevServer = devServer !== undefined

			// Attempt to kill the terminal
			let killResult: boolean

			if (force) {
				// Force kill - directly dispose the terminal
				targetTerminal.terminal.dispose()
				TerminalRegistry.removeTerminal(targetId)
				killResult = true
			} else {
				// Graceful kill - use the terminal manager's close method
				if (isDevServer) {
					// For dev servers, use the clearDevServer method
					TerminalRegistry.clearDevServer(targetId)
					killResult = true
				} else {
					// For regular terminals, use closeTerminal
					killResult = terminalManager.closeTerminal(targetId)
				}
			}

			if (killResult) {
				const resultMessage = `
<kill_bash_result>
  <status>success</status>
  <terminal>
    <id>${targetId}</id>
    <name>${terminalDisplayName}</name>
    <last_command>${lastCommand}</last_command>
    <was_busy>${isBusy}</was_busy>
    <was_dev_server>${isDevServer}</was_dev_server>
    <kill_method>${force ? "force" : "graceful"}</kill_method>
  </terminal>
  <message>Terminal successfully terminated</message>
</kill_bash_result>`

				await updateAsk(
					"tool",
					{
						tool: {
							tool: "kill_bash",
							terminalId: targetId,
							terminalName: targetTerminal.name,
							lastCommand,
							isBusy,
							force: force ?? false,
							result: resultMessage,
							approvalState: "approved",
							ts: this.ts,
							isSubMsg: this.params.isSubMsg,
						},
					},
					this.ts
				)

				return this.toolResponse("success", resultMessage)
			} else {
				throw new Error("Failed to kill terminal - closeTerminal returned false")
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			const errorResult = `
<kill_bash_result>
  <status>error</status>
  <terminal>
    <id>${targetId}</id>
    <name>${terminalDisplayName}</name>
  </terminal>
  <error>${errorMessage}</error>
  <message>Failed to terminate terminal</message>
</kill_bash_result>`

			await updateAsk(
				"tool",
				{
					tool: {
						tool: "kill_bash",
						terminalId: targetId,
						terminalName: targetTerminal.name,
						lastCommand,
						isBusy,
						force: force ?? false,
						error: errorMessage,
						approvalState: "error",
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			)

			return this.toolResponse("error", this.formatToolError(errorMessage))
		}
	}
}

