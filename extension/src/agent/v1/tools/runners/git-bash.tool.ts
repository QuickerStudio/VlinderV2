// runners/git-bash.tool.ts
import { BaseAgentTool } from "../base-agent.tool"
import { GitBashToolParams } from "../schema/git-bash"
import { ToolResponseV2 } from "../../types"
import * as vscode from "vscode"
import * as fs from "fs"
import * as path from "path"

export class GitBashTool extends BaseAgentTool<GitBashToolParams> {
	async execute(): Promise<ToolResponseV2> {
		const { input, say, ask, updateAsk } = this.params
		const command = input.command
		const timeout = input.timeout ?? 300000
		const captureOutput = input.captureOutput ?? true

		if (!command?.trim()) {
			await say("error", "The 'git_bash' tool was called without a 'command'. Retrying...")
			return this.toolResponse("error", "Error: Missing or empty 'command' parameter.")
		}

		const { response } = await ask(
			"tool",
			{
				tool: {
					tool: "git_bash",
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
						tool: "git_bash",
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
					tool: "git_bash",
					command,
					approvalState: "loading",
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		)

		// Detect Git Bash path
		const gitBashPath = this.detectGitBashPath()
		if (!gitBashPath) {
			const errorMsg = `<git_bash_output>
<error>Git Bash not found</error>

Git Bash is not installed or could not be detected on this system.

To install Git Bash:
1. Download Git for Windows from https://git-scm.com/download/win
2. Run the installer and ensure "Git Bash Here" option is selected
3. Restart VSCode after installation

Common installation paths checked:
- C:\\Program Files\\Git\\bin\\bash.exe
- C:\\Program Files (x86)\\Git\\bin\\bash.exe
- Git in PATH environment variable
</git_bash_output>`

			await updateAsk(
				"tool",
				{
					tool: {
						tool: "git_bash",
						command,
						output: errorMsg,
						approvalState: "error",
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			)

			await say("error", errorMsg)
			return this.toolResponse("error", errorMsg)
		}

		// Create Git Bash terminal
		const terminal = vscode.window.createTerminal({
			name: `git-bash-${Date.now()}`,
			shellPath: gitBashPath,
			cwd: this.cwd,
		})

		terminal.show()

		// Try to use shell integration API
		if (terminal.shellIntegration) {
			return await this.executeWithShellIntegration(
				terminal,
				command,
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
				timeout,
				captureOutput,
				updateAsk,
				say,
				shellIntegration
			)
		} catch (error) {
			// Fallback: Use sendText without shell integration
			return await this.executeWithFallback(terminal, command, timeout, updateAsk, say)
		}
	}

	private detectGitBashPath(): string | null {
		// Common Git Bash installation paths on Windows
		const commonPaths = [
			"C:\\Program Files\\Git\\bin\\bash.exe",
			"C:\\Program Files (x86)\\Git\\bin\\bash.exe",
			"C:\\Program Files\\Git\\usr\\bin\\bash.exe",
			"C:\\Program Files (x86)\\Git\\usr\\bin\\bash.exe",
		]

		// Check common paths
		for (const bashPath of commonPaths) {
			if (fs.existsSync(bashPath)) {
				return bashPath
			}
		}

		// Check if git is in PATH and try to find bash.exe
		try {
			const { execSync } = require("child_process")
			const gitPath = execSync("where git", { encoding: "utf-8" }).trim().split("\n")[0]
			if (gitPath) {
				// Git path is usually: C:\Program Files\Git\cmd\git.exe
				// Bash is at: C:\Program Files\Git\bin\bash.exe
				const gitDir = path.dirname(path.dirname(gitPath))
				const bashPath = path.join(gitDir, "bin", "bash.exe")
				if (fs.existsSync(bashPath)) {
					return bashPath
				}
			}
		} catch (error) {
			// Git not in PATH
		}

		return null
	}

	private async executeWithShellIntegration(
		terminal: vscode.Terminal,
		command: string,
		timeout: number,
		captureOutput: boolean,
		updateAsk: any,
		say: any,
		shellIntegration?: vscode.TerminalShellIntegration
	): Promise<ToolResponseV2> {
		const integration = shellIntegration || terminal.shellIntegration!
		let output = ""
		let exitCode: number | undefined
		const startTime = Date.now()
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

					const finalOutput = `<git_bash_output>
<command>${this.escapeXml(command)}</command>
<exitCode>${exitCode ?? "unknown"}</exitCode>
<elapsed>${elapsed}ms</elapsed>
<output>${this.escapeXml(cleanOutput || "(no output)")}</output>
</git_bash_output>`

					await updateAsk(
						"tool",
						{
							tool: {
								tool: "git_bash",
								command,
								output: finalOutput,
								approvalState: exitCode === 0 ? "approved" : "error",
								ts: this.ts,
								isSubMsg: this.params.isSubMsg,
							},
						},
						this.ts
					)

					if (exitCode === undefined) {
						await say(
							"warning",
							`Command completed but exit code is unknown. Output:\n${cleanOutput || "(no output)"}`
						)
						resolve(this.toolResponse("success", finalOutput))
					} else if (exitCode === 0) {
						resolve(this.toolResponse("success", finalOutput))
					} else {
						await say("error", `Command failed with exit code ${exitCode}. Output:\n${cleanOutput}`)
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
					const timeoutOutput = `<git_bash_output>
<command>${this.escapeXml(command)}</command>
<status>timeout</status>
<elapsed>${elapsed}ms</elapsed>
<timeout>${timeout}ms</timeout>
<output>${this.escapeXml(this.cleanAnsiEscapes(output))}</output>
<message>Command execution timed out after ${timeout}ms</message>
</git_bash_output>`

					resolve(this.toolResponse("error", timeoutOutput))
				}
			}, timeout)
		})

		return completionPromise
	}

	private async executeWithFallback(
		terminal: vscode.Terminal,
		command: string,
		timeout: number,
		updateAsk: any,
		say: any
	): Promise<ToolResponseV2> {
		// Fallback: Use sendText when shell integration is not available
		terminal.sendText(command, true)

		const warningOutput = `<git_bash_output>
<command>${this.escapeXml(command)}</command>
<status>executed_without_integration</status>
<message>Shell integration is not available. The command was executed but output cannot be reliably captured.</message>

<note>
To enable shell integration for Git Bash:
1. Update VSCode to the latest version
2. Add the following to your ~/.bashrc file in Git Bash:
   
   if [ -n "$VSCODE_SHELL_INTEGRATION" ]; then
       . "$(code --locate-shell-integration-path bash)"
   fi

3. Restart the terminal

Without shell integration:
- Exit codes are not available
- Output capture is unreliable
- Command completion detection is not accurate

The command has been executed in the terminal. Please verify the results manually.
</note>
</git_bash_output>`

		await updateAsk(
			"tool",
			{
				tool: {
					tool: "git_bash",
					command,
					output: warningOutput,
					approvalState: "error",
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		)

		await say("shell_integration_warning", warningOutput)
		return this.toolResponse("success", warningOutput)
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

