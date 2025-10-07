import * as vscode from 'vscode';
import * as path from 'path';
import { BaseAgentTool } from '../base-agent.tool';
import { ToolResponseV2 } from '../types';
import { FastEditorToolParams } from '../schema/fast-editor';

/**
 * Fast Editor Tool
 *
 * Allows editing multiple files in a single operation by performing string replacements.
 * This is useful for coordinated changes across multiple files, such as:
 * - Updating imports across multiple files
 * - Bumping version numbers in multiple locations
 * - Refactoring API calls across modules
 * - Updating configuration values consistently
 *
 * Each edit is applied independently, and the tool reports success/failure for each file.
 */
export class FastEditorTool extends BaseAgentTool<FastEditorToolParams> {
	async execute(): Promise<ToolResponseV2> {
		const { edits, explanation } = this.params.input;
		const { ask, updateAsk } = this.params;

		if (!edits || edits.length === 0) {
			return this.toolResponse('error', 'No edits provided');
		}

		// Performance: Limit number of files to edit in one batch
		if (edits.length > 50) {
			return this.toolResponse(
				'error',
				'Too many files to edit in one batch (max 50). Please split into smaller batches.'
			);
		}

		// Security: Validate file paths
		for (const edit of edits) {
			const normalizedPath = edit.path.replace(/\\/g, '/').replace(/\/+/g, '/');
			if (normalizedPath.includes('../') || normalizedPath.includes('..\\')) {
				return this.toolResponse(
					'error',
					`Invalid file path: ${edit.path}. Path traversal not allowed.`
				);
			}
		}

		// Performance: Check for excessively large strings
		for (const edit of edits) {
			if (edit.oldString.length > 10000 || edit.newString.length > 10000) {
				return this.toolResponse(
					'error',
					`String too large in ${edit.path} (max 10KB per string). Consider using file_editor for large changes.`
				);
			}
		}

		this.logger(`Executing fast_editor: ${edits.length} file(s)`, 'info');

		// Show the edits to the user for approval
		const editsSummary = edits
			.map(
				(edit: { path: string; oldString: string; newString: string }, index: number) =>
					`${index + 1}. ${edit.path}: Replace "${edit.oldString.substring(0, 50)}${edit.oldString.length > 50 ? '...' : ''}" with "${edit.newString.substring(0, 50)}${edit.newString.length > 50 ? '...' : ''}"`
			)
			.join('\n');

		const approvalMessage = `Edit ${edits.length} file${edits.length > 1 ? 's' : ''}:\n\n${editsSummary}${explanation ? `\n\nExplanation: ${explanation}` : ''}`;

		// Request user approval
		const { response } = await ask(
			'tool',
			{
				tool: {
					tool: 'fast_editor',
					edits: edits.map((e: { path: string; oldString: string; newString: string }) => ({
						path: e.path,
						oldString: e.oldString,
						newString: e.newString,
					})),
					explanation,
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
						tool: 'fast_editor',
						edits: edits.map((e: { path: string; oldString: string; newString: string }) => ({
							path: e.path,
							oldString: e.oldString,
							newString: e.newString,
						})),
						explanation,
						approvalState: 'rejected',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			);
			return this.toolResponse('rejected', 'User rejected the file edits');
		}

		// Update UI to show loading state
		await updateAsk(
			'tool',
			{
				tool: {
					tool: 'fast_editor',
					edits: edits.map((e: { path: string; oldString: string; newString: string }) => ({
						path: e.path,
						oldString: e.oldString,
						newString: e.newString,
					})),
					explanation,
					approvalState: 'loading',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		// Apply each edit
		const results: Array<{
			path: string;
			success: boolean;
			error?: string;
			occurrences?: number;
		}> = [];

		for (const edit of edits) {
			try {
				this.logger(`Processing edit for ${edit.path}`, 'debug');

				const absolutePath = path.isAbsolute(edit.path)
					? edit.path
					: path.resolve(this.cwd, edit.path);

				const uri = vscode.Uri.file(absolutePath);

				// Check if file exists
				try {
					await vscode.workspace.fs.stat(uri);
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : String(error);
					this.logger(`File not found: ${edit.path} - ${errorMessage}`, 'warn');
					results.push({
						path: edit.path,
						success: false,
						error: `File not found: ${edit.path}`,
					});
					continue;
				}

				// Read file content
				const fileContent = await vscode.workspace.fs.readFile(uri);
				const content = Buffer.from(fileContent).toString('utf-8');

				// Check if old string exists
				if (!content.includes(edit.oldString)) {
					this.logger(
						`String not found in ${edit.path}: "${edit.oldString.substring(0, 50)}..."`,
						'warn'
					);
					results.push({
						path: edit.path,
						success: false,
						error: `String not found in file: "${edit.oldString.substring(0, 100)}${edit.oldString.length > 100 ? '...' : ''}"`,
					});
					continue;
				}

				// Count occurrences
				const occurrences = (
					content.match(
						new RegExp(
							edit.oldString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
							'g'
						)
					) || []
				).length;
				this.logger(
					`Found ${occurrences} occurrence(s) of string in ${edit.path}`,
					'debug'
				);

				// Perform replacement
				const newContent = content.replace(
					new RegExp(
						edit.oldString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
						'g'
					),
					edit.newString
				);

				// Check if content actually changed
				if (newContent === content) {
					this.logger(
						`No changes made to ${edit.path} - content identical after replacement`,
						'warn'
					);
					results.push({
						path: edit.path,
						success: false,
						error: 'No changes made (content identical after replacement)',
					});
					continue;
				}

				// Write the new content
				const workspaceEdit = new vscode.WorkspaceEdit();
				const document = await vscode.workspace.openTextDocument(uri);
				const fullRange = new vscode.Range(
					document.positionAt(0),
					document.positionAt(content.length)
				);
				workspaceEdit.replace(uri, fullRange, newContent);

				const success = await vscode.workspace.applyEdit(workspaceEdit);

				if (success) {
					// Save the document
					const doc = await vscode.workspace.openTextDocument(uri);
					await doc.save();

					this.logger(
						`Successfully edited ${edit.path} (${occurrences} replacement(s))`,
						'info'
					);
					results.push({
						path: edit.path,
						success: true,
						occurrences,
					});
				} else {
					this.logger(
						`Failed to apply workspace edit for ${edit.path}`,
						'error'
					);
					results.push({
						path: edit.path,
						success: false,
						error: 'Failed to apply workspace edit',
					});
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				this.logger(`Error processing ${edit.path}: ${errorMessage}`, 'error');
				results.push({
					path: edit.path,
					success: false,
					error: errorMessage,
				});
			}
		}

		// Count successes and failures
		const successCount = results.filter((r) => r.success).length;
		const failureCount = results.filter((r) => !r.success).length;

		// Build response message with more details
		const successfulEdits = results.filter((r) => r.success);
		const failedEdits = results.filter((r) => !r.success);

		let responseText = `<fast_editor_result>\n`;
		responseText += `<summary>Successfully edited ${successCount} of ${edits.length} file(s)</summary>\n`;

		if (successfulEdits.length > 0) {
			responseText += `<successful_edits>\n`;
			successfulEdits.forEach((result) => {
				const occurrences = result.occurrences || 0;
				responseText += `  - ${result.path}: ${occurrences} replacement(s) made\n`;
			});
			responseText += `</successful_edits>\n`;
		}

		if (failedEdits.length > 0) {
			responseText += `<failed_edits>\n${failedEdits.map((f) => `  - ${f.path}: ${f.error}`).join('\n')}\n</failed_edits>\n`;
		}

		responseText += `</fast_editor_result>`;

		this.logger(
			`Fast editor completed: ${successCount} success, ${failureCount} failed`,
			'info'
		);

		// Update UI with final state
		await updateAsk(
			'tool',
			{
				tool: {
					tool: 'fast_editor',
					edits: edits.map((e: { path: string; oldString: string; newString: string }) => ({
						path: e.path,
						oldString: e.oldString,
						newString: e.newString,
					})),
					explanation,
					results,
					successCount,
					failureCount,
					approvalState: failureCount === 0 ? 'approved' : 'error',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		// Return appropriate status
		if (failureCount === 0) {
			return this.toolResponse('success', responseText);
		} else if (successCount > 0) {
			return this.toolResponse('feedback', responseText);
		} else {
			return this.toolResponse('error', responseText);
		}
	}
}
