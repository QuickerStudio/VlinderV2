import { BaseAgentTool } from '../base-agent.tool';
import { TerminalToolParams } from '../schema/terminal';
import { ToolResponseV2 } from '../../types';
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

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
		const { input, say, ask, updateAsk } = this.params;
		const {
			command,
			shell = 'auto',
			cwd,
			timeout = 30000,
			env,
			captureOutput = true,
			interactive = false,
			terminalName,
			reuseTerminal = false,
		} = input;

		// Ask for approval
		const { response } = await ask(
			'tool',
			{
				tool: {
					tool: 'terminal',
					command,
					shell,
					cwd,
					timeout,
					env,
					captureOutput,
					interactive,
					terminalName,
					reuseTerminal,
					approvalState: 'pending',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		if (response !== 'yesButtonTapped') {
			await updateAsk(
				'tool',
				{
					tool: {
						tool: 'terminal',
						command,
						approvalState: 'rejected',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			);
			return this.toolResponse('rejected', this.formatToolDenied());
		}

		await updateAsk(
			'tool',
			{
				tool: {
					tool: 'terminal',
					command,
					approvalState: 'loading',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		try {
			// Detect shell if auto
			const detectedShell =
				shell === 'auto' ? await this.detectDefaultShell() : shell;

			// Get shell path
			const shellPath = await this.getShellPath(detectedShell);
			if (!shellPath) {
				const availableShells = await this.getAvailableShells();
				const errorDetails = `Shell '${detectedShell}' is not available on this system.

Available shells: ${availableShells.join(', ')}`;
				const errorMsg = `<terminal_result>
<status>error</status>
<shell>${detectedShell}</shell>
<error>Shell '${detectedShell}' is not available on this system</error>
<available>${availableShells.join(', ')}</available>
</terminal_result>`;

				await updateAsk(
					'tool',
					{
						tool: {
							tool: 'terminal',
							command,
							output: errorMsg,
							approvalState: 'error',
							ts: this.ts,
							isSubMsg: this.params.isSubMsg,
						},
					},
					this.ts
				);

				await say('error', errorDetails);
				return this.toolResponse('error', errorMsg);
			}

			// Determine working directory
			const workingDir = cwd || this.cwd;

			// Create terminal with native shell
			const terminal = vscode.window.createTerminal({
				name: terminalName || `${detectedShell}-${Date.now()}`,
				shellPath: shellPath,
				cwd: workingDir,
				env: env,
			});

			terminal.show();

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
				);
			}

			// Wait for shell integration to activate (up to 5 seconds)
			const shellIntegrationPromise =
				new Promise<vscode.TerminalShellIntegration>((resolve, reject) => {
					const disposable = vscode.window.onDidChangeTerminalShellIntegration(
						(event) => {
							if (event.terminal === terminal) {
								disposable.dispose();
								resolve(event.shellIntegration);
							}
						}
					);

					setTimeout(() => {
						disposable.dispose();
						reject(new Error('Shell integration not available'));
					}, 5000);
				});

			try {
				const shellIntegration = await shellIntegrationPromise;
				return await this.executeWithShellIntegration(
					terminal,
					command,
					detectedShell,
					timeout,
					captureOutput,
					updateAsk,
					say,
					shellIntegration
				);
			} catch (error) {
				// Fallback: Use sendText without shell integration
				return await this.executeWithFallback(
					terminal,
					command,
					detectedShell,
					timeout,
					updateAsk,
					say
				);
			}
		} catch (error) {
			const errorMsg = `<terminal_result>
<status>error</status>
<error>${this.escapeXml(error instanceof Error ? error.message : String(error))}</error>
</terminal_result>`;

			await updateAsk(
				'tool',
				{
					tool: {
						tool: 'terminal',
						command,
						output: errorMsg,
						approvalState: 'error',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			);

			await say(
				'error',
				`Terminal execution failed: ${error instanceof Error ? error.message : String(error)}`
			);
			return this.toolResponse('error', errorMsg);
		}
	}

	/**
	 * Detect the default shell based on the operating system
	 */
	private async detectDefaultShell(): Promise<string> {
		const platform = os.platform();

		if (platform === 'win32') {
			// Windows: Check what's available in order of preference
			// 1. PowerShell (most common on modern Windows)
			// 2. Git Bash (if Git is installed)
			// 3. CMD (always available)
			if (await this.getShellPath('powershell')) {
				return 'powershell';
			}
			if (await this.getShellPath('git-bash')) {
				return 'git-bash';
			}
			return 'cmd';
		} else if (platform === 'darwin' || platform === 'linux') {
			// Unix-like: check SHELL environment variable
			const shellPath = process.env.SHELL || '/bin/bash';
			const shellName = path.basename(shellPath);

			// Map common shells
			if (shellName.includes('zsh')) {
				return 'zsh';
			}
			if (shellName.includes('fish')) {
				return 'fish';
			}
			if (shellName.includes('bash')) {
				return 'bash';
			}
			return 'sh';
		}

		return 'bash'; // Default fallback
	}

	/**
	 * Enhanced shell path detection with dynamic resolution
	 */
	private async getShellPath(shell: string): Promise<string | null> {
		const platform = os.platform();

		if (platform === 'win32') {
			// Windows shells
			switch (shell) {
				case 'powershell':
					// Try pwsh first (PowerShell Core), then fallback to Windows PowerShell
					const pwshPath = await this.findExecutable('pwsh');
					if (pwshPath) {
						return pwshPath;
					}

					const psPath = await this.findExecutable('powershell');
					if (psPath) {
						return psPath;
					}

					// Fallback to VSCode's PowerShell handling
					return 'powershell';

				case 'cmd':
					return 'cmd.exe';

				case 'git-bash':
				case 'bash':
					return await this.findGitBash();

				default:
					return await this.findExecutable(shell);
			}
		} else {
			// Unix-like systems (macOS, Linux)
			switch (shell) {
				case 'bash':
					return (await this.findExecutable('bash')) || '/bin/bash';
				case 'zsh':
					return (await this.findExecutable('zsh')) || '/bin/zsh';
				case 'fish':
					return (await this.findExecutable('fish')) || '/usr/bin/fish';
				case 'sh':
					return (await this.findExecutable('sh')) || '/bin/sh';
				case 'powershell':
					// On Unix-like systems, try to find pwsh
					return (await this.findExecutable('pwsh')) || '/usr/local/bin/pwsh';
				default:
					return await this.findExecutable(shell);
			}
		}
	}

	/**
	 * Find executable in system PATH
	 */
	private async findExecutable(command: string): Promise<string | null> {
		try {
			const { execSync } = require('child_process');
			const result =
				os.platform() === 'win32'
					? execSync(`where ${command}`, {
							encoding: 'utf-8',
							timeout: 5000,
						}).trim()
					: execSync(`which ${command}`, {
							encoding: 'utf-8',
							timeout: 5000,
						}).trim();

			const firstPath = result.split('\n')[0];
			return firstPath && fs.existsSync(firstPath) ? firstPath : null;
		} catch {
			return null;
		}
	}

	/**
	 * Enhanced Git Bash detection
	 */
	private async findGitBash(): Promise<string | null> {
		// Try common installation paths first
		const commonPaths = [
			'C:\\Program Files\\Git\\bin\\bash.exe',
			'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
			'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
			'C:\\Program Files (x86)\\Git\\usr\\bin\\bash.exe',
		];

		for (const bashPath of commonPaths) {
			if (fs.existsSync(bashPath)) {
				// Verify it's actually executable
				if (await this.validateShell(bashPath, 'bash')) {
					return bashPath;
				}
			}
		}

		// Try to find via git command
		try {
			const gitPath = await this.findExecutable('git');
			if (gitPath) {
				const gitDir = path.dirname(path.dirname(gitPath));
				const bashPath = path.join(gitDir, 'bin', 'bash.exe');
				if (
					fs.existsSync(bashPath) &&
					(await this.validateShell(bashPath, 'bash'))
				) {
					return bashPath;
				}
			}
		} catch {}

		return null;
	}

	/**
	 * Validate shell compatibility and basic functionality
	 */
	private async validateShell(
		shellPath: string,
		shellType: string
	): Promise<boolean> {
		try {
			const { execSync } = require('child_process');

			// Test basic shell functionality
			const testCommand =
				shellType === 'powershell'
					? `"${shellPath}" -Command "echo test"`
					: `"${shellPath}" -c "echo test"`;

			const result = execSync(testCommand, {
				timeout: 3000,
				stdio: 'pipe',
				encoding: 'utf-8',
			});

			return result.trim() === 'test';
		} catch {
			return false;
		}
	}

	private async getAvailableShells(): Promise<string[]> {
		const platform = os.platform();
		const available: string[] = [];

		if (platform === 'win32') {
			// Windows
			if (await this.getShellPath('powershell')) {
				available.push('powershell');
			}
			if (await this.getShellPath('cmd')) {
				available.push('cmd');
			}
			if (await this.getShellPath('git-bash')) {
				available.push('git-bash');
			}
			if (await this.getShellPath('bash')) {
				available.push('bash');
			}
		} else {
			// Unix-like
			if (await this.getShellPath('bash')) {
				available.push('bash');
			}
			if (await this.getShellPath('zsh')) {
				available.push('zsh');
			}
			if (await this.getShellPath('fish')) {
				available.push('fish');
			}
			if (await this.getShellPath('sh')) {
				available.push('sh');
			}
		}

		return available;
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
		const integration = shellIntegration || terminal.shellIntegration!;
		const startTime = Date.now();
		let output = '';
		let exitCode: number | undefined;
		let executionCompleted = false;

		// Execute command using shell integration API
		const execution = integration.executeCommand(command);

		// Create promises for both output reading and execution completion
		const outputPromise = (async () => {
			if (captureOutput) {
				const outputStream = execution.read();
				try {
					for await (const data of outputStream) {
						output += data;
					}
				} catch (error) {
					// Stream ended or error occurred
				}
			}
		})();

		const completionPromise = new Promise<ToolResponseV2>((resolve) => {
			const disposable = vscode.window.onDidEndTerminalShellExecution(
				async (event) => {
					if (event.execution === execution) {
						disposable.dispose();
						exitCode = event.exitCode;
						executionCompleted = true;

						// Wait for output to finish reading
						await outputPromise;

						const elapsed = Date.now() - startTime;

						// Clean and process output
						const cleanOutput = this.cleanAnsiEscapes(output);
						const { truncated: processedOutput, isTruncated } =
							this.smartTruncateOutput(cleanOutput);

						const finalOutput = `<terminal_result>
<status>${exitCode === 0 ? 'success' : 'error'}</status>
<shell>${shell}</shell>
<command>${this.escapeXml(command)}</command>
<exitCode>${exitCode ?? 'unknown'}</exitCode>
<elapsed>${elapsed}ms</elapsed>
<output_length>${cleanOutput.length}</output_length>
<is_truncated>${isTruncated}</is_truncated>
<output>${this.escapeXml(processedOutput || '(no output)')}</output>
</terminal_result>`;

						await updateAsk(
							'tool',
							{
								tool: {
									tool: 'terminal',
									command,
									result: finalOutput,
									approvalState: exitCode === 0 ? 'approved' : 'error',
									ts: this.ts,
									isSubMsg: this.params.isSubMsg,
								},
							},
							this.ts
						);

						if (exitCode === 0) {
							resolve(this.toolResponse('success', finalOutput));
						} else {
							await say('error', `Command failed with exit code ${exitCode}`);
							resolve(this.toolResponse('error', finalOutput));
						}
					}
				}
			);

			// Timeout handling
			setTimeout(async () => {
				if (!executionCompleted) {
					disposable.dispose();

					// Wait for output to finish reading (with a short timeout)
					await Promise.race([
						outputPromise,
						new Promise((r) => setTimeout(r, 1000)),
					]);

					const elapsed = Date.now() - startTime;
					const cleanOutput = this.cleanAnsiEscapes(output);
					const { truncated: processedOutput, isTruncated } =
						this.smartTruncateOutput(cleanOutput);

					const timeoutOutput = `<terminal_result>
<status>timeout</status>
<shell>${shell}</shell>
<command>${this.escapeXml(command)}</command>
<timeout>${timeout}ms</timeout>
<elapsed>${elapsed}ms</elapsed>
<output_length>${cleanOutput.length}</output_length>
<is_truncated>${isTruncated}</is_truncated>
<output>${this.escapeXml(processedOutput)}</output>
<message>Command execution timed out after ${timeout}ms</message>
</terminal_result>`;

					resolve(this.toolResponse('error', timeoutOutput));
				}
			}, timeout);
		});

		return completionPromise;
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
		terminal.sendText(command, true);

		// Simple output for all shells without shell integration
		const output = `<terminal_result>
<status>executed</status>
<shell>${shell}</shell>
<command>${this.escapeXml(command)}</command>
<note>Command executed. Output capture not available - verify results in terminal.</note>
</terminal_result>`;

		await updateAsk(
			'tool',
			{
				tool: {
					tool: 'terminal',
					command,
					output: output,
					approvalState: 'approved',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		return this.toolResponse('success', output);
	}

	/**
	 * Comprehensive ANSI escape sequence removal and text cleaning
	 */
	private cleanAnsiEscapes(text: string): string {
		return (
			text
				// Remove color codes
				.replace(/\x1b\[[0-9;]*m/g, '')
				// Remove cursor movement
				.replace(/\x1b\[[0-9;]*[ABCD]/g, '')
				// Remove clear screen
				.replace(/\x1b\[[0-9;]*[JK]/g, '')
				// Remove title sequences
				.replace(/\x1b\][^\x07]*\x07/g, '')
				// Remove other escape sequences
				.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
				// Remove control characters except newlines and tabs
				.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
				// Normalize line endings
				.replace(/\r\n/g, '\n')
				.replace(/\r/g, '\n')
				// Remove excessive whitespace
				.replace(/\n{3,}/g, '\n\n')
				.trim()
		);
	}

	/**
	 * Smart output truncation with context preservation
	 */
	private smartTruncateOutput(
		output: string,
		maxLength: number = 10000
	): {
		truncated: string;
		isTruncated: boolean;
	} {
		if (output.length <= maxLength) {
			return { truncated: output, isTruncated: false };
		}

		const lines = output.split('\n');
		let result = '';
		let lineCount = 0;

		// Keep first part (70% of max length)
		const firstPart = Math.floor(maxLength * 0.7);
		for (const line of lines) {
			if (result.length + line.length + 1 > firstPart) {
				break;
			}
			result += line + '\n';
			lineCount++;
		}

		// Add truncation indicator
		const skippedLines = lines.length - lineCount;
		const truncationInfo = `\n... [Output truncated - ${skippedLines} more lines omitted] ...\n`;
		result += truncationInfo;

		// Keep last part if there's remaining space
		const remainingLength = maxLength - result.length;
		if (remainingLength > 200 && skippedLines > 5) {
			const lastLinesToShow = Math.floor(remainingLength / 50);
			const lastLines = lines.slice(-lastLinesToShow);
			result += lastLines.join('\n');
		}

		return { truncated: result, isTruncated: true };
	}

	private escapeXml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;');
	}
}
