// runners/read-progress.tool.ts
import { AdvancedTerminalManager } from "../../../../integrations/terminal"
import { TerminalRegistry } from "../../../../integrations/terminal/terminal-manager"
import { BaseAgentTool } from "../base-agent.tool"
import { ReadProgressToolParams } from "../schema/read-progress"
import { ToolResponseV2 } from "../../types"

export class ReadProgressTool extends BaseAgentTool<ReadProgressToolParams> {
	async execute(): Promise<ToolResponseV2> {
		const { input, say } = this.params
		const { terminalId, terminalName, includeFullOutput } = input

		// Validate that at least one identifier is provided
		if (terminalId === undefined && !terminalName) {
			await say("error", "Either terminalId or terminalName must be provided")
			return this.toolResponse("error", "Error: Missing terminal identifier")
		}

		// Get terminal manager
		const { terminalManager } = this.MainAgent
		if (!(terminalManager instanceof AdvancedTerminalManager)) {
			throw new Error("AdvancedTerminalManager is not available")
		}

		// Find the terminal
		let terminalInfo
		if (terminalId !== undefined) {
			terminalInfo = TerminalRegistry.getTerminal(terminalId)
		} else if (terminalName) {
			terminalInfo = TerminalRegistry.getTerminalByName(terminalName)
		}

		if (!terminalInfo) {
			const identifier = terminalId !== undefined ? `ID ${terminalId}` : `name "${terminalName}"`
			await say("error", `Terminal with ${identifier} not found`)
			return this.toolResponse(
				"error",
				`<read_progress_result>
  <status>error</status>
  <error>Terminal not found: ${identifier}</error>
</read_progress_result>`
			)
		}

		// Get terminal status
		const isBusy = terminalInfo.busy
		const lastCommand = terminalInfo.lastCommand
		const isHot = terminalManager.isProcessHot(terminalInfo.id)

		// Get output
		const outputLogs = TerminalRegistry.getTerminalLogs(terminalInfo.id) || []
		const recentOutput = includeFullOutput ? outputLogs : outputLogs.slice(-20) // Last 20 lines if not full

		// Check if it's a dev server
		const devServer = TerminalRegistry.getDevServer(terminalInfo.id)
		const isDevServer = devServer !== undefined

		// Build result
		const result = `
<read_progress_result>
  <status>success</status>
  <terminal>
    <id>${terminalInfo.id}</id>
    ${terminalInfo.name ? `<name>${terminalInfo.name}</name>` : ""}
    <busy>${isBusy}</busy>
    <is_hot>${isHot}</is_hot>
    <is_dev_server>${isDevServer}</is_dev_server>
    <last_command>${this.escapeXml(lastCommand)}</last_command>
  </terminal>
  ${
		devServer
			? `<dev_server>
    <status>${devServer.status}</status>
    ${devServer.url ? `<url>${devServer.url}</url>` : ""}
    ${devServer.error ? `<error>${this.escapeXml(devServer.error)}</error>` : ""}
  </dev_server>`
			: ""
	}
  <output>
    <line_count>${recentOutput.length}</line_count>
    <showing>${includeFullOutput ? "full" : "recent"}</showing>
    <lines>
${recentOutput.map((line: string) => `      <line>${this.escapeXml(line)}</line>`).join("\n")}
    </lines>
  </output>
  <analysis>
    <process_state>${isBusy ? "running" : "idle"}</process_state>
    <activity_state>${isHot ? "active" : "inactive"}</activity_state>
    <recommendation>${this.analyzeProgress(isBusy, isHot, recentOutput, devServer)}</recommendation>
  </analysis>
</read_progress_result>
`

		return this.toolResponse("success", result.trim())
	}

	private analyzeProgress(
		isBusy: boolean,
		isHot: boolean,
		output: string[],
		devServer?: { status: string; error?: string }
	): string {
		// Check for dev server status
		if (devServer) {
			if (devServer.status === "running") {
				return "Dev server is running normally. Continue waiting or proceed with next steps."
			}
			if (devServer.status === "error") {
				return "Dev server encountered an error. Consider using kill_bash to terminate and restart."
			}
			if (devServer.status === "starting") {
				return "Dev server is still starting. Continue waiting."
			}
		}

		// Check for error patterns in output
		const recentText = output.slice(-10).join("\n").toLowerCase()
		const errorPatterns = [
			"error",
			"failed",
			"exception",
			"fatal",
			"cannot",
			"unable to",
			"not found",
			"enoent",
			"econnrefused",
		]
		const hasErrors = errorPatterns.some((pattern) => recentText.includes(pattern))

		if (hasErrors && !isHot) {
			return "Process appears to have errors and is not active. Consider using kill_bash to terminate."
		}

		if (!isBusy) {
			return "Process has completed. Check output for results."
		}

		if (isHot) {
			return "Process is actively running and producing output. Continue waiting."
		}

		// Busy but not hot - might be stuck
		if (isBusy && !isHot) {
			return "Process is running but not producing output. May be waiting for input or stuck. Consider checking manually or using kill_bash if stuck."
		}

		return "Process status unclear. Review output manually."
	}

	private escapeXml(str: string): string {
		if (!str) {
			return ""
		}
		return str
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&apos;")
	}
}

