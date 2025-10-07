import * as vscode from 'vscode';
import * as path from 'path';
import { BaseAgentTool } from '../base-agent.tool';
import { ReplaceStringToolParams } from '../schema/replace-string';
import { ToolResponseV2 } from '../../types';

/**
 * ReplaceString Tool - Find and replace exact strings in files
 *
 * This tool performs precise string replacements in files. It requires exact matches
 * including whitespace and indentation. All occurrences of the old string will be replaced.
 */
export class ReplaceStringTool extends BaseAgentTool<ReplaceStringToolParams> {
	async execute(): Promise<ToolResponseV2> {
		const { input, ask, say, updateAsk } = this.params;
		const { explanation, filePath, oldString, newString } = input;

		// Validate input
		if (!filePath || oldString === undefined || newString === undefined) {
			return this.toolResponse(
				'error',
				'Invalid input: filePath, oldString, and newString are required'
			);
		}

		// Check if old and new strings are identical
		if (oldString === newString) {
			return this.toolResponse(
				'error',
				'Old string and new string are identical - no changes needed'
			);
		}

		// Resolve file path
		const absolutePath = path.isAbsolute(filePath)
			? filePath
			: path.join(this.cwd, filePath);
		const uri = vscode.Uri.file(absolutePath);

		try {
			// Check if file exists
			try {
				await vscode.workspace.fs.stat(uri);
			} catch (error) {
				return this.toolResponse(
					'error',
					`File does not exist: ${filePath}. Use the file_editor tool to create it first.`
				);
			}

			// Read the file
			const document = await vscode.workspace.openTextDocument(uri);
			const fileContent = document.getText();

			// Find all occurrences
			const occurrences = this.findOccurrences(fileContent, oldString);

			if (occurrences.length === 0) {
				// Try to provide helpful error message
				const similarityThreshold = 0.8;
				const lines = fileContent.split('\n');
				let bestMatch = { line: -1, similarity: 0, content: '' };

				// Search for similar strings
				for (let i = 0; i < lines.length; i++) {
					const similarity = this.calculateSimilarity(oldString, lines[i]);
					if (similarity > bestMatch.similarity) {
						bestMatch = { line: i + 1, similarity, content: lines[i] };
					}
				}

				let errorMsg = `String not found in ${filePath}.`;
				if (bestMatch.similarity > similarityThreshold) {
					errorMsg += `\n\nDid you mean line ${bestMatch.line}?\n${bestMatch.content.trim()}`;
				}
				errorMsg += `\n\nMake sure the oldString matches exactly, including whitespace and indentation.`;

				return this.toolResponse('error', errorMsg);
			}

			// Ask for approval
			const { response, text } = await ask(
				'tool',
				{
					tool: {
						tool: 'replace_string_in_file',
						explanation,
						filePath,
						oldString,
						newString,
						occurrences: occurrences.length,
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
							tool: 'replace_string_in_file',
							explanation,
							filePath,
							oldString,
							newString,
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
						tool: 'replace_string_in_file',
						explanation,
						filePath,
						oldString,
						newString,
						approvalState: 'loading',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			);

			// Perform the replacement
			const edits: vscode.TextEdit[] = [];
			for (const occurrence of occurrences) {
				const range = new vscode.Range(
					document.positionAt(occurrence.start),
					document.positionAt(occurrence.end)
				);
				edits.push(vscode.TextEdit.replace(range, newString));
			}

			// Apply edits
			const workspaceEdit = new vscode.WorkspaceEdit();
			workspaceEdit.set(uri, edits);
			const success = await vscode.workspace.applyEdit(workspaceEdit);

			if (!success) {
				await updateAsk(
					'tool',
					{
						tool: {
							tool: 'replace_string_in_file',
							explanation,
							filePath,
							oldString,
							newString,
							approvalState: 'error',
							ts: this.ts,
							isSubMsg: this.params.isSubMsg,
						},
					},
					this.ts
				);
				return this.toolResponse('error', 'Failed to apply edits to file');
			}

			// Save the document
			await document.save();

			const resultMessage = `Successfully replaced ${occurrences.length} occurrence(s) in ${filePath}`;

			await updateAsk(
				'tool',
				{
					tool: {
						tool: 'replace_string_in_file',
						explanation,
						filePath,
						oldString,
						newString,
						occurrences: occurrences.length,
						approvalState: 'approved',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			);

			await say('text', resultMessage);
			return this.toolResponse('success', resultMessage);
		} catch (error) {
			const errorMsg = `Failed to replace string: ${error instanceof Error ? error.message : String(error)}`;
			await say('error', errorMsg);
			return this.toolResponse('error', errorMsg);
		}
	}

	/**
	 * Find all occurrences of a string in the content
	 */
	private findOccurrences(
		content: string,
		searchString: string
	): Array<{ start: number; end: number }> {
		const occurrences: Array<{ start: number; end: number }> = [];
		let index = 0;

		while (index < content.length) {
			const foundIndex = content.indexOf(searchString, index);
			if (foundIndex === -1) {
				break;
			}
			occurrences.push({
				start: foundIndex,
				end: foundIndex + searchString.length,
			});
			index = foundIndex + searchString.length;
		}

		return occurrences;
	}

	/**
	 * Calculate similarity between two strings (0-1)
	 * Uses a simple character-based similarity metric
	 */
	private calculateSimilarity(str1: string, str2: string): number {
		if (str1 === str2) {
			return 1.0;
		}
		if (str1.length === 0 || str2.length === 0) {
			return 0.0;
		}

		// Simple character overlap metric
		const set1 = new Set(str1.toLowerCase().split(''));
		const set2 = new Set(str2.toLowerCase().split(''));
		const intersection = new Set([...set1].filter((x) => set2.has(x)));

		return (2 * intersection.size) / (set1.size + set2.size);
	}
}
