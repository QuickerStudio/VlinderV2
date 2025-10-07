// runners/kill-bash.tool.ts
import { AdvancedTerminalManager } from '../../../../integrations/terminal';
import { TerminalRegistry } from '../../../../integrations/terminal/terminal-manager';
import { BaseAgentTool } from '../base-agent.tool';
import { KillBashToolParams } from '../schema/kill-bash';
import { ToolResponseV2 } from '../../types';

export class KillBashTool extends BaseAgentTool<KillBashToolParams> {
	async execute(): Promise<ToolResponseV2> {
		const { input, say, ask, updateAsk } = this.params;
		const { terminalId, terminalName, force } = input;

		// Enhanced input validation
		if (terminalId === undefined && !terminalName) {
			await say(
				'error',
				"The 'kill_bash' tool was called without a 'terminalId' or 'terminalName'. Retrying..."
			);
			return this.toolResponse(
				'error',
				"Error: Either 'terminalId' or 'terminalName' must be provided."
			);
		}

		// Validate terminalId if provided
		if (
			terminalId !== undefined &&
			(!Number.isInteger(terminalId) || terminalId <= 0)
		) {
			await say(
				'error',
				'Invalid terminal ID provided. Terminal ID must be a positive integer.'
			);
			return this.toolResponse(
				'error',
				'Error: Terminal ID must be a positive integer.'
			);
		}

		// Validate terminalName if provided
		if (
			terminalName !== undefined &&
			(typeof terminalName !== 'string' || terminalName.trim().length === 0)
		) {
			await say(
				'error',
				'Invalid terminal name provided. Terminal name must be a non-empty string.'
			);
			return this.toolResponse(
				'error',
				'Error: Terminal name must be a non-empty string.'
			);
		}

		// Sanitize terminal name
		const sanitizedTerminalName = terminalName?.trim();

		const { terminalManager } = this.MainAgent;
		if (!(terminalManager instanceof AdvancedTerminalManager)) {
			throw new Error('AdvancedTerminalManager is not available');
		}

		// Find the terminal to kill
		let targetTerminal;
		let targetId: number | undefined;

		if (terminalId !== undefined) {
			targetTerminal = TerminalRegistry.getTerminal(terminalId);
			targetId = terminalId;
		} else if (sanitizedTerminalName) {
			targetTerminal = TerminalRegistry.getTerminalByName(
				sanitizedTerminalName
			);
			targetId = targetTerminal?.id;
		}

		if (!targetTerminal || targetId === undefined) {
			const identifier =
				terminalId !== undefined
					? `ID ${terminalId}`
					: `name "${sanitizedTerminalName || terminalName}"`;
			await say('error', `No terminal found with ${identifier}`);
			return this.toolResponse(
				'error',
				`Error: No terminal found with ${identifier}. The terminal may have already been closed or does not exist.`
			);
		}

		// Additional safety check - verify terminal is still valid
		const terminalIdentifier =
			terminalId !== undefined
				? `ID ${terminalId}`
				: `name "${sanitizedTerminalName || terminalName}"`;
		try {
			if (targetTerminal.terminal.exitStatus !== undefined) {
				await say(
					'error',
					`Terminal ${terminalIdentifier} has already been closed (exit status: ${targetTerminal.terminal.exitStatus})`
				);
				return this.toolResponse(
					'error',
					`Error: Terminal ${terminalIdentifier} has already been closed.`
				);
			}
		} catch (error) {
			// Terminal object may be invalid, proceed with caution
			console.warn(
				`Warning: Could not check terminal status for ${terminalIdentifier}:`,
				error
			);
		}

		// Get terminal info for display
		const terminalDisplayName = targetTerminal.name || `Terminal ${targetId}`;
		const lastCommand = targetTerminal.lastCommand || 'No command';
		const isBusy = targetTerminal.busy;

		// Ask for user confirmation
		const { response, text, images } = await ask(
			'tool',
			{
				tool: {
					tool: 'kill_bash',
					terminalId: targetId,
					terminalName: targetTerminal.name,
					lastCommand,
					isBusy,
					force: force ?? false,
					approvalState: 'pending',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		if (response === 'noButtonTapped' || response !== 'yesButtonTapped') {
			await updateAsk(
				'tool',
				{
					tool: {
						tool: 'kill_bash',
						terminalId: targetId,
						terminalName: targetTerminal.name,
						lastCommand,
						isBusy,
						force: force ?? false,
						approvalState: 'rejected',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			);

			if (text) {
				await say('user_feedback', text, images);
			}

			return this.toolResponse(
				'rejected',
				this.formatToolDeniedFeedback(
					text || 'User denied the terminal kill operation.'
				)
			);
		}

		// Update to loading state
		await updateAsk(
			'tool',
			{
				tool: {
					tool: 'kill_bash',
					terminalId: targetId,
					terminalName: targetTerminal.name,
					lastCommand,
					isBusy,
					force: force ?? false,
					approvalState: 'loading',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		try {
			// Check if this is a dev server
			const devServer = TerminalRegistry.getDevServer(targetId);
			const isDevServer = devServer !== undefined;

			// Attempt to kill the terminal
			let killResult: boolean;
			let killMethod: string;

			if (force) {
				// Force kill - directly dispose the terminal
				try {
					targetTerminal.terminal.dispose();
					TerminalRegistry.removeTerminal(targetId);
					killResult = true;
					killMethod = 'force';
				} catch (disposeError) {
					console.error(
						`Error during force disposal of terminal ${targetId}:`,
						disposeError
					);
					// Still try to remove from registry
					TerminalRegistry.removeTerminal(targetId);
					killResult = true;
					killMethod = 'force';
				}
			} else {
				// Graceful kill - use the terminal manager's close method
				killMethod = 'graceful';
				if (isDevServer) {
					// For dev servers, use the clearDevServer method
					try {
						TerminalRegistry.clearDevServer(targetId);
						killResult = true;
					} catch (devServerError) {
						console.error(
							`Error clearing dev server ${targetId}:`,
							devServerError
						);
						// Fallback to regular terminal closure
						killResult = terminalManager.closeTerminal(targetId);
					}
				} else {
					// For regular terminals, use closeTerminal
					killResult = terminalManager.closeTerminal(targetId);
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
    <kill_method>${killMethod}</kill_method>
  </terminal>
  <message>Terminal successfully terminated</message>
</kill_bash_result>`;

				await updateAsk(
					'tool',
					{
						tool: {
							tool: 'kill_bash',
							terminalId: targetId,
							terminalName: targetTerminal.name,
							lastCommand,
							isBusy,
							force: force ?? false,
							result: resultMessage,
							approvalState: 'approved',
							ts: this.ts,
							isSubMsg: this.params.isSubMsg,
						},
					},
					this.ts
				);

				return this.toolResponse('success', resultMessage);
			} else {
				throw new Error(
					'Failed to kill terminal - closeTerminal returned false'
				);
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			const errorResult = `
<kill_bash_result>
  <status>error</status>
  <terminal>
    <id>${targetId}</id>
    <name>${terminalDisplayName}</name>
  </terminal>
  <error>${errorMessage}</error>
  <message>Failed to terminate terminal</message>
</kill_bash_result>`;

			await updateAsk(
				'tool',
				{
					tool: {
						tool: 'kill_bash',
						terminalId: targetId,
						terminalName: targetTerminal.name,
						lastCommand,
						isBusy,
						force: force ?? false,
						error: errorMessage,
						approvalState: 'error',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			);

			return this.toolResponse('error', this.formatToolError(errorMessage));
		}
	}
}
