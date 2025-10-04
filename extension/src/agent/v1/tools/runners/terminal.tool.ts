import { BaseAgentTool } from "../base-agent.tool"
import { TerminalToolParams } from "../schema/terminal"
import { ToolResponseV2 } from "../../types"
import * as vscode from "vscode"
import * as os from "os"
import * as path from "path"
import * as fs from "fs"

/**
 * Terminal Tool - Multi-platform native shell command execution
 *
 * Supports 4 main shell platforms on Windows:
 * 1. PowerShell - Windows native shell with .NET integration
 * 2. Git Bash - Unix-like environment on Windows
 * 3. Command Prompt (CMD) - Traditional Windows command line
 * 4. JavaScript Debug Terminal - VSCode's Node.js debugging terminal
 *
 * Plus cross-platform shells: bash, zsh, fish, sh
 *
 * Each shell uses its NATIVE syntax - no conversion to PowerShell!
 */
export class TerminalTool extends BaseAgentTool<TerminalToolParams> {
	async execute(): Promise<ToolResponseV2> {
		const { input, say, ask, updateAsk } = this.params
		const {
			command,
			shell = "auto",
			cwd,
			timeout = 30000,
			env,
			captureOutput = true,
			interactive = false,
			terminalName,
			reuseTerminal = false,
		} = input

		// Ask for approval
		const { response } = await ask(
			"tool",
			{
				tool: {
					tool: "terminal",
					command,
					shell,
					cwd,
					timeout,
					env,
					captureOutput,
					interactive,
					terminalName,
					reuseTerminal,
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
						tool: "terminal",
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
					tool: "terminal",
					command,
					approvalState: "loading",
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		)

		try {
			// Detect shell if auto
			const detectedShell = shell === "auto" ? this.detectDefaultShell() : shell

			// Get shell path
			const shellPath = this.getShellPath(detectedShell)
			if (!shellPath) {
				const errorDetails = `Shell '${detectedShell}' is not available on this system.

Available shells: ${this.getAvailableShells().join(", ")}`
				const errorMsg = `<terminal_result>
<status>error</status>
<shell>${detectedShell}</shell>
<error>Shell '${detectedShell}' is not available on this system</error>
<available>${this.getAvailableShells().join(", ")}</available>
</terminal_result>`

				await updateAsk(
					"tool",
					{
						tool: {
							tool: "terminal",
							command,
							output: errorMsg,
							approvalState: "error",
							ts: this.ts,
							isSubMsg: this.params.isSubMsg,
						},
					},
					this.ts
				)

				await say("error", errorDetails)
				return this.toolResponse("error", errorMsg)
			}

			// Determine working directory
			const workingDir = cwd || this.cwd

			// Create terminal with native shell
			const terminal = vscode.window.createTerminal({
				name: terminalName || `${detectedShell}-${Date.now()}`,
				shellPath: shellPath,
				cwd: workingDir,
				env: env,
			})

			terminal.show()

			// Try to use shell integration API
			if (terminal.shellIntegration) {
				return await this.executeWithShellIntegration(
					terminal,
					command,
					detectedShell,
					timeout,
					captureOutput,
					updateAsk,
					say
				)
			}

			// Wait for shell integration to activate (up to 5 seconds)
			const shellIntegrationPromise = new Promise<vscode.TerminalShellIntegration>((resolve, reject) => {
				const disposable = vscode.window.onDidChangeTerminalShellIntegration((event) => {
					if (event.terminal === terminal) {
						disposable.dispose()
						resolve(event.shellIntegration)
					}
				})

				setTimeout(() => {
					disposable.dispose()
					reject(new Error("Shell integration not available"))
				}, 5000)
			})

			try {
				const shellIntegration = await shellIntegrationPromise
				return await this.executeWithShellIntegration(
					terminal,
					command,
					detectedShell,
					timeout,
					captureOutput,
					updateAsk,
					say,
					shellIntegration
				)
			} catch (error) {
				// Fallback: Use sendText without shell integration
				return await this.executeWithFallback(terminal, command, detectedShell, timeout, updateAsk, say)
			}
		} catch (error) {
			const errorMsg = `<terminal_result>
<status>error</status>
<error>${this.escapeXml(error instanceof Error ? error.message : String(error))}</error>
</terminal_result>`

			await updateAsk(
				"tool",
				{
					tool: {
						tool: "terminal",
						command,
						output: errorMsg,
						approvalState: "error",
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			)

			await say("error", `Terminal execution failed: ${error instanceof Error ? error.message : String(error)}`)
			return this.toolResponse("error", errorMsg)
		}
	}

	/**
	 * Detect the default shell based on the operating system
	 */
	private detectDefaultShell(): string {
		const platform = os.platform()

		if (platform === "win32") {
			// Windows: Check what's available in order of preference
			// 1. PowerShell (most common on modern Windows)
			// 2. Git Bash (if Git is installed)
			// 3. CMD (always available)
			if (this.getShellPath("powershell")) {
				return "powershell"
			}
			if (this.getShellPath("git-bash")) {
				return "git-bash"
			}
			return "cmd"
		} else if (platform === "darwin" || platform === "linux") {
			// Unix-like: check SHELL environment variable
			const shellPath = process.env.SHELL || "/bin/bash"
			const shellName = path.basename(shellPath)

			// Map common shells
			if (shellName.includes("zsh")) {
				return "zsh"
			}
			if (shellName.includes("fish")) {
				return "fish"
			}
			if (shellName.includes("bash")) {
				return "bash"
			}
			return "sh"
		}

		return "bash" // Default fallback
	}

	/**
	 * Get the executable path for a given shell
	 * Returns null if shell is not available
	 */
	private getShellPath(shell: string): string | null {
		const platform = os.platform()

		if (platform === "win32") {
			// Windows shells
			switch (shell) {
				case "powershell":
					// Use VSCode's native PowerShell API - let VSCode handle PowerShell detection
					// VSCode will automatically use the best available PowerShell (pwsh or powershell.exe)
					return "powershell"

				case "cmd":
					return "cmd.exe"

				case "git-bash":
				case "bash":
					// Check common Git Bash installation paths
					const gitBashPaths = [
						"C:\\Program Files\\Git\\bin\\bash.exe",
						"C:\\Program Files (x86)\\Git\\bin\\bash.exe",
						"C:\\Program Files\\Git\\usr\\bin\\bash.exe",
						"C:\\Program Files (x86)\\Git\\usr\\bin\\bash.exe",
					]
					for (const bashPath of gitBashPaths) {
						if (fs.existsSync(bashPath)) {
							return bashPath
						}
					}
					// Try to find via git command
					try {
						const { execSync } = require("child_process")
						const gitPath = execSync("where git", { encoding: "utf-8" }).trim().split("\n")[0]
						if (gitPath) {
							const gitDir = path.dirname(path.dirname(gitPath))
							const bashPath = path.join(gitDir, "bin", "bash.exe")
							if (fs.existsSync(bashPath)) {
								return bashPath
							}
						}
					} catch (error) {
						// Git not found
					}
					return null

				default:
					return null
			}
		} else {
			// Unix-like systems (macOS, Linux)
			switch (shell) {
				case "bash":
					return "/bin/bash"
				case "zsh":
					return "/bin/zsh"
				case "fish":
					return "/usr/bin/fish"
				case "sh":
					return "/bin/sh"
				case "powershell":
					// On Unix-like systems, try to find pwsh
					return "/usr/local/bin/pwsh"
				default:
					return null
			}
		}
	}

	private getAvailableShells(): string[] {
		const platform = os.platform()
		const available: string[] = []

		if (platform === "win32") {
			// Windows
			if (this.getShellPath("powershell")) {
				available.push("powershell")
			}
			if (this.getShellPath("cmd")) {
				available.push("cmd")
			}
			if (this.getShellPath("git-bash")) {
				available.push("git-bash")
			}
			if (this.getShellPath("bash")) {
				available.push("bash")
			}
		} else {
			// Unix-like
			if (this.getShellPath("bash")) {
				available.push("bash")
			}
			if (this.getShellPath("zsh")) {
				available.push("zsh")
			}
			if (this.getShellPath("fish")) {
				available.push("fish")
			}
			if (this.getShellPath("sh")) {
				available.push("sh")
			}
		}

		return available
	}

	/**
	 * Execute command using VSCode Shell Integration API
	 * This provides accurate exit codes and reliable output capture
	 */
	private async executeWithShellIntegration(
		terminal: vscode.Terminal,
		command: string,
		shell: string,
		timeout: number,
		captureOutput: boolean,
		updateAsk: any,
		say: any,
		shellIntegration?: vscode.TerminalShellIntegration
	): Promise<ToolResponseV2> {
		const integration = shellIntegration || terminal.shellIntegration!
		const startTime = Date.now()
		let output = ""
		let exitCode: number | undefined
		let executionCompleted = false

		// Execute command using shell integration API
		const execution = integration.executeCommand(command)

		// Create promises for both output reading and execution completion
		const outputPromise = (async () => {
			if (captureOutput) {
				const outputStream = execution.read()
				try {
					for await (const data of outputStream) {
						output += data
					}
				} catch (error) {
					// Stream ended or error occurred
				}
			}
		})()

		const completionPromise = new Promise<ToolResponseV2>((resolve) => {
			const disposable = vscode.window.onDidEndTerminalShellExecution(async (event) => {
				if (event.execution === execution) {
					disposable.dispose()
					exitCode = event.exitCode
					executionCompleted = true

					// Wait for output to finish reading
					await outputPromise

					const elapsed = Date.now() - startTime

					// Clean output (remove ANSI escape sequences)
					const cleanOutput = this.cleanAnsiEscapes(output)

					const finalOutput = `<terminal_result>
<status>${exitCode === 0 ? "success" : "error"}</status>
<shell>${shell}</shell>
<command>${this.escapeXml(command)}</command>
<exitCode>${exitCode ?? "unknown"}</exitCode>
<elapsed>${elapsed}ms</elapsed>
<output>${this.escapeXml(cleanOutput || "(no output)")}</output>
</terminal_result>`

					await updateAsk(
						"tool",
						{
							tool: {
								tool: "terminal",
								command,
								result: finalOutput,
								approvalState: exitCode === 0 ? "approved" : "error",
								ts: this.ts,
								isSubMsg: this.params.isSubMsg,
							},
						},
						this.ts
					)

					if (exitCode === 0) {
						resolve(this.toolResponse("success", finalOutput))
					} else {
						await say("error", `Command failed with exit code ${exitCode}`)
						resolve(this.toolResponse("error", finalOutput))
					}
				}
			})

			// Timeout handling
			setTimeout(async () => {
				if (!executionCompleted) {
					disposable.dispose()

					// Wait for output to finish reading (with a short timeout)
					await Promise.race([outputPromise, new Promise((r) => setTimeout(r, 1000))])

					const elapsed = Date.now() - startTime
					const timeoutOutput = `<terminal_result>
<status>timeout</status>
<shell>${shell}</shell>
<command>${this.escapeXml(command)}</command>
<timeout>${timeout}ms</timeout>
<elapsed>${elapsed}ms</elapsed>
<output>${this.escapeXml(this.cleanAnsiEscapes(output))}</output>
<message>Command execution timed out after ${timeout}ms</message>
</terminal_result>`

					resolve(this.toolResponse("error", timeoutOutput))
				}
			}, timeout)
		})

		return completionPromise
	}

	/**
	 * Fallback execution when shell integration is not available
	 * Uses sendText and provides a warning message
	 */
	private async executeWithFallback(
		terminal: vscode.Terminal,
		command: string,
		shell: string,
		timeout: number,
		updateAsk: any,
		say: any
	): Promise<ToolResponseV2> {
		// Fallback: Use sendText when shell integration is not available
		terminal.sendText(command, true)

		// Simple output for all shells without shell integration
		const output = `<terminal_result>
<status>executed</status>
<shell>${shell}</shell>
<command>${this.escapeXml(command)}</command>
<note>Command executed. Output capture not available - verify results in terminal.</note>
</terminal_result>`

		await updateAsk(
			"tool",
			{
				tool: {
					tool: "terminal",
					command,
					output: output,
					approvalState: "approved",
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		)

		return this.toolResponse("success", output)
	}

	private cleanAnsiEscapes(text: string): string {
		// Remove ANSI escape sequences
		return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "").replace(/\x1b\][^\x07]*\x07/g, "")
	}

	private escapeXml(text: string): string {
		return text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&apos;")
	}
}
