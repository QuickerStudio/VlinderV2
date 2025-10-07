import * as vscode from 'vscode';
import { BaseAgentTool } from '../base-agent.tool';
import { ToolResponseV2 } from '../types';
import { GetTerminalOutputToolParams } from '../schema/get-terminal-output';
import { TerminalRegistry } from '../../../../integrations/terminal/terminal-manager';
// Simple ANSI escape sequence removal function
const stripAnsi = (str: string): string => {
	// Remove ANSI escape sequences
	return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
};

/**
 * Get Terminal Output Tool
 *
 * Retrieves the output buffer from a terminal (active or by ID).
 * Uses VS Code's terminal data write events to capture output.
 */
export class GetTerminalOutputTool extends BaseAgentTool<GetTerminalOutputToolParams> {
	private readonly DEFAULT_MAX_CHARS = 16000;
	private readonly MAX_CHARS_CAP = 50000;
	private readonly SENSITIVE_PATTERNS = [
		/password[\s=:]+[^\s]+/gi,
		/api[_-]?key[\s=:]+[^\s]+/gi,
		/token[\s=:]+[^\s]+/gi,
		/secret[\s=:]+[^\s]+/gi,
		/auth[\s=:]+[^\s]+/gi,
	];

	async execute(): Promise<ToolResponseV2> {
		const { terminalId, maxChars } = this.params.input;

		try {
			// Validate and cap maxChars
			const effectiveMaxChars = Math.min(
				maxChars || this.DEFAULT_MAX_CHARS,
				this.MAX_CHARS_CAP
			);

			let output: string;
			let terminalName: string;
			let shellType: string | undefined;
			let isTruncated: boolean = false;

			if (terminalId !== undefined) {
				// Get output from specific terminal by ID
				const result = this.getOutputFromTerminalId(
					terminalId,
					effectiveMaxChars
				);
				if (!result) {
					const errorMsg = this.buildXmlOutput(
						undefined,
						undefined,
						'',
						effectiveMaxChars,
						terminalId,
						false,
						`Terminal with ID ${terminalId} not found`
					);
					return this.toolResponse('error', errorMsg);
				}
				output = result.output;
				terminalName = result.name;
				shellType = result.shellType;
				isTruncated = result.isTruncated;
			} else {
				// Get output from active terminal
				const activeTerminal = vscode.window.activeTerminal;
				if (!activeTerminal) {
					const errorMsg = this.buildXmlOutput(
						undefined,
						undefined,
						'',
						effectiveMaxChars,
						undefined,
						false,
						'No active terminal found'
					);
					return this.toolResponse('error', errorMsg);
				}

				const terminalResult = this.getOutputFromVscodeTerminal(
					activeTerminal,
					effectiveMaxChars
				);
				output = terminalResult.processedOutput;
				isTruncated = terminalResult.isTruncated;
				terminalName = activeTerminal.name;
				shellType = this.detectShellType(activeTerminal);
			}

			const xmlOutput = this.buildXmlOutput(
				terminalName,
				shellType,
				output,
				effectiveMaxChars,
				terminalId,
				isTruncated
			);

			return this.toolResponse('success', xmlOutput);
		} catch (error) {
			const errorMsg = this.buildXmlOutput(
				undefined,
				undefined,
				'',
				this.DEFAULT_MAX_CHARS,
				terminalId,
				false,
				error instanceof Error ? error.message : String(error)
			);
			return this.toolResponse('error', errorMsg);
		}
	}

	/**
	 * Get output from a terminal by its ID (from TerminalRegistry)
	 */
	private getOutputFromTerminalId(
		terminalId: number,
		maxChars: number
	): {
		output: string;
		name: string;
		shellType: string | undefined;
		isTruncated: boolean;
	} | null {
		// Try to get from TerminalRegistry first (our managed terminals)
		const terminalInfo = TerminalRegistry.getAllTerminals().find(
			(t) => t.id === terminalId
		);
		if (terminalInfo) {
			// Get full output from TerminalRegistry
			const fullOutput = TerminalRegistry.getFullTerminalOutput(terminalId);

			// Process and limit output
			const { processedOutput, isTruncated } = this.processOutput(
				fullOutput,
				maxChars
			);

			// Try to detect shell type from terminal name or environment
			const shellType = this.detectShellType(terminalInfo.terminal);

			return {
				output: processedOutput,
				name: terminalInfo.terminal.name,
				shellType,
				isTruncated,
			};
		}

		return null;
	}

	/**
	 * Get output from a VS Code terminal
	 * Note: This requires terminal data write event listeners to be installed
	 */
	private getOutputFromVscodeTerminal(
		terminal: vscode.Terminal,
		maxChars: number
	): { processedOutput: string; isTruncated: boolean } {
		// Try to get from TerminalRegistry if it's a managed terminal
		const terminalInfo = TerminalRegistry.getAllTerminals().find(
			(t) => t.terminal === terminal
		);

		if (terminalInfo) {
			// Get full output from TerminalRegistry
			const fullOutput = TerminalRegistry.getFullTerminalOutput(
				terminalInfo.id
			);

			// Process and limit output
			return this.processOutput(fullOutput, maxChars);
		}

		// If not in TerminalRegistry, we can't get the output
		// VS Code doesn't provide a direct API to read terminal buffer
		return this.processOutput(
			'(Terminal output not available - terminal not managed by Vlinder)',
			maxChars
		);
	}

	/**
	 * Process terminal output: clean, filter, and truncate
	 */
	private processOutput(
		rawOutput: string,
		maxChars: number
	): { processedOutput: string; isTruncated: boolean } {
		// Step 1: Clean ANSI escape sequences
		let cleanOutput = stripAnsi(rawOutput);

		// Step 2: Remove control characters (except newlines and tabs)
		cleanOutput = cleanOutput.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

		// Step 3: Filter sensitive information
		cleanOutput = this.filterSensitiveInfo(cleanOutput);

		// Step 4: Normalize line endings
		cleanOutput = cleanOutput.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

		// Step 5: Truncate if necessary (smart truncation)
		const isTruncated = cleanOutput.length > maxChars;
		if (isTruncated) {
			// Try to truncate at line boundaries for better readability
			const truncatedOutput = this.smartTruncate(cleanOutput, maxChars);
			return { processedOutput: truncatedOutput, isTruncated: true };
		}

		return { processedOutput: cleanOutput, isTruncated: false };
	}

	/**
	 * Filter sensitive information from output
	 */
	private filterSensitiveInfo(output: string): string {
		let filteredOutput = output;

		for (const pattern of this.SENSITIVE_PATTERNS) {
			filteredOutput = filteredOutput.replace(pattern, (match) => {
				const parts = match.split(/[=:\s]+/);
				if (parts.length >= 2) {
					return `${parts[0]}=***REDACTED***`;
				}
				return '***REDACTED***';
			});
		}

		return filteredOutput;
	}

	/**
	 * Smart truncation that tries to preserve line boundaries
	 */
	private smartTruncate(output: string, maxChars: number): string {
		if (output.length <= maxChars) {
			return output;
		}

		// Strategy 1: Try to keep the most recent complete lines
		const lines = output.split('\n');
		let truncatedOutput = '';
		let currentLength = 0;

		// Start from the end and work backwards
		for (let i = lines.length - 1; i >= 0; i--) {
			const line = lines[i];
			const lineLength = line.length + 1; // +1 for newline

			if (currentLength + lineLength <= maxChars) {
				truncatedOutput = line + '\n' + truncatedOutput;
				currentLength += lineLength;
			} else {
				// If we can't fit the whole line, add a truncation indicator
				if (truncatedOutput) {
					truncatedOutput = '...[truncated]...\n' + truncatedOutput;
				} else {
					// If even one line is too long, truncate it
					const availableChars = maxChars - 20; // Reserve space for indicator
					truncatedOutput = '...[truncated]...\n' + line.slice(-availableChars);
				}
				break;
			}
		}

		return truncatedOutput.trim();
	}

	/**
	 * Detect shell type from terminal (improved)
	 */
	private detectShellType(terminal: vscode.Terminal): string | undefined {
		// Try to detect shell type from terminal name
		const name = terminal.name.toLowerCase();

		// More comprehensive shell detection
		if (name.includes('powershell') || name.includes('pwsh')) {
			return 'powershell';
		} else if (name.includes('cmd') || name.includes('command')) {
			return 'cmd';
		} else if (name.includes('bash')) {
			return 'bash';
		} else if (name.includes('zsh')) {
			return 'zsh';
		} else if (name.includes('fish')) {
			return 'fish';
		} else if (name.includes('sh') && !name.includes('fish')) {
			return 'sh';
		} else if (name.includes('git') && name.includes('bash')) {
			return 'bash';
		}

		// Check environment variables if available
		try {
			const shell = process.env.SHELL || process.env.ComSpec;
			if (shell) {
				const shellName = shell.toLowerCase();
				if (shellName.includes('powershell') || shellName.includes('pwsh')) {
					return 'powershell';
				} else if (shellName.includes('cmd')) {
					return 'cmd';
				} else if (shellName.includes('bash')) {
					return 'bash';
				} else if (shellName.includes('zsh')) {
					return 'zsh';
				} else if (shellName.includes('fish')) {
					return 'fish';
				}
			}
		} catch (error) {
			// Ignore environment variable errors
		}

		// Fallback to platform defaults
		const platform = process.platform;
		if (platform === 'win32') {
			return 'powershell'; // Default on Windows
		} else if (platform === 'darwin') {
			return 'zsh'; // Default on macOS (since Catalina)
		} else if (platform === 'linux') {
			return 'bash'; // Default on Linux
		}

		return undefined;
	}

	/**
	 * Build XML output for the tool response (enhanced)
	 */
	private buildXmlOutput(
		terminalName: string | undefined,
		shellType: string | undefined,
		output: string,
		maxChars: number,
		terminalId: number | undefined,
		isTruncated: boolean,
		error?: string
	): string {
		const parts: string[] = ['<terminal_output>'];
		const timestamp = new Date().toISOString();

		// Add timestamp
		parts.push(`  <timestamp>${timestamp}</timestamp>`);

		if (terminalId !== undefined) {
			parts.push(`  <terminal_id>${terminalId}</terminal_id>`);
		}

		if (terminalName) {
			parts.push(
				`  <terminal_name>${this.escapeXml(terminalName)}</terminal_name>`
			);
		}

		if (shellType) {
			parts.push(`  <shell_type>${this.escapeXml(shellType)}</shell_type>`);
		}

		// Add platform information
		parts.push(`  <platform>${process.platform}</platform>`);

		parts.push(`  <max_chars>${maxChars}</max_chars>`);
		parts.push(`  <output_length>${output.length}</output_length>`);
		parts.push(`  <is_truncated>${isTruncated}</is_truncated>`);

		if (error) {
			parts.push(`  <status>error</status>`);
			parts.push(`  <error>${this.escapeXml(error)}</error>`);
		} else {
			parts.push(`  <status>success</status>`);
			parts.push(`  <output>${this.escapeXml(output)}</output>`);
		}

		parts.push('</terminal_output>');

		return parts.join('\n');
	}

	/**
	 * Escape XML special characters
	 */
	private escapeXml(str: string): string {
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;');
	}
}
