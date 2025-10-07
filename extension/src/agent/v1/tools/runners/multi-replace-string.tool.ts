import * as vscode from 'vscode';
import { BaseAgentTool } from '../base-agent.tool';
import {
	MultiReplaceStringToolParams,
	ReplacementOperation,
} from '../schema/multi-replace-string';
import { ToolResponseV2 } from '../types';

interface ReplacementResult {
	filePath: string;
	oldString: string;
	newString: string;
	success: boolean;
	occurrences?: number;
	error?: string;
}

interface FileEdits {
	uri: vscode.Uri;
	edits: vscode.TextEdit[];
	results: ReplacementResult[];
}

/**
 * Tool for performing multiple string replacements across one or more files
 * All replacements for the same file are merged and applied atomically
 */
export class MultiReplaceStringTool extends BaseAgentTool<MultiReplaceStringToolParams> {
	async execute(): Promise<ToolResponseV2> {
		const { explanation, replacements } = this.params.input;

		// Enhanced input validation
		if (
			!replacements ||
			!Array.isArray(replacements) ||
			replacements.length === 0
		) {
			return this.toolResponse(
				'error',
				'Invalid input: replacements array is required and must not be empty'
			);
		}

		// Validate each replacement
		for (let i = 0; i < replacements.length; i++) {
			const replacement = replacements[i];
			if (!replacement.filePath || typeof replacement.filePath !== 'string') {
				return this.toolResponse(
					'error',
					`Invalid replacement at index ${i}: filePath is required and must be a string`
				);
			}
			if (
				replacement.oldString === undefined ||
				typeof replacement.oldString !== 'string'
			) {
				return this.toolResponse(
					'error',
					`Invalid replacement at index ${i}: oldString is required and must be a string`
				);
			}
			if (
				replacement.newString === undefined ||
				typeof replacement.newString !== 'string'
			) {
				return this.toolResponse(
					'error',
					`Invalid replacement at index ${i}: newString is required and must be a string`
				);
			}
			// Validate file path format
			if (replacement.filePath.trim() === '') {
				return this.toolResponse(
					'error',
					`Invalid replacement at index ${i}: filePath cannot be empty`
				);
			}
		}

		// Sort replacements by order (lower numbers first)
		const sortedReplacements = [...replacements].sort((a, b) => {
			const orderA = a.order ?? 0;
			const orderB = b.order ?? 0;
			return orderA - orderB;
		});

		// Group replacements by file (maintaining order)
		const fileMap = new Map<string, ReplacementOperation[]>();
		for (const replacement of sortedReplacements) {
			const existing = fileMap.get(replacement.filePath) || [];
			existing.push(replacement);
			fileMap.set(replacement.filePath, existing);
		}

		// Ask for approval
		const fileCount = fileMap.size;
		const replacementCount = replacements.length;
		const summary = `${replacementCount} replacement${replacementCount > 1 ? 's' : ''} across ${fileCount} file${fileCount > 1 ? 's' : ''}`;

		const { response } = await this.params.ask(
			'tool',
			{
				tool: {
					tool: 'multi_replace_string_in_file',
					explanation,
					replacements,
					approvalState: 'pending',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		if (response !== 'yesButtonTapped') {
			return this.toolResponse(
				'rejected',
				`User rejected the multi-replacement operation.`
			);
		}

		// Update to loading state
		await this.params.updateAsk(
			'tool',
			{
				tool: {
					tool: 'multi_replace_string_in_file',
					explanation,
					replacements,
					approvalState: 'loading',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		// Process each file
		const fileEditsMap = new Map<string, FileEdits>();
		let totalSuccesses = 0;
		let totalFailures = 0;

		for (const [filePath, fileReplacements] of fileMap.entries()) {
			const fileResult = await this.processFileReplacements(
				filePath,
				fileReplacements
			);
			fileEditsMap.set(filePath, fileResult);

			for (const result of fileResult.results) {
				if (result.success) {
					totalSuccesses++;
				} else {
					totalFailures++;
				}
			}
		}

		// Check if we should proceed with partial success or fail completely
		// If ALL replacements failed, abort without applying any changes
		if (totalFailures > 0 && totalSuccesses === 0) {
			const errorMessages: string[] = [];
			for (const fileEdits of fileEditsMap.values()) {
				for (const result of fileEdits.results) {
					if (!result.success) {
						errorMessages.push(`${result.filePath}: ${result.error}`);
					}
				}
			}

			await this.params.updateAsk(
				'tool',
				{
					tool: {
						tool: 'multi_replace_string_in_file',
						explanation,
						replacements,
						approvalState: 'error',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
						successes: 0,
						failures: totalFailures,
						errors: errorMessages,
					},
				},
				this.ts
			);

			return this.toolResponse(
				'error',
				`All replacements failed. No changes were applied:\n${errorMessages.join('\n')}`
			);
		}

		// If some succeeded and some failed, warn but continue
		let partialFailureWarning = '';
		if (totalFailures > 0) {
			const errorMessages: string[] = [];
			for (const fileEdits of fileEditsMap.values()) {
				for (const result of fileEdits.results) {
					if (!result.success) {
						errorMessages.push(`  - ${result.filePath}: ${result.error}`);
					}
				}
			}
			partialFailureWarning = `\n\nWarning: ${totalFailures} replacement${totalFailures !== 1 ? 's' : ''} failed:\n${errorMessages.join('\n')}`;
		}

		// Apply all edits atomically
		const workspaceEdit = new vscode.WorkspaceEdit();
		for (const fileEdits of fileEditsMap.values()) {
			if (fileEdits.edits.length > 0) {
				workspaceEdit.set(fileEdits.uri, fileEdits.edits);
			}
		}

		const applied = await vscode.workspace.applyEdit(workspaceEdit);
		if (!applied) {
			await this.params.updateAsk(
				'tool',
				{
					tool: {
						tool: 'multi_replace_string_in_file',
						explanation,
						replacements,
						approvalState: 'error',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			);
			return this.toolResponse('error', 'Failed to apply workspace edits');
		}

		// Save all modified documents
		for (const fileEdits of fileEditsMap.values()) {
			if (fileEdits.edits.length > 0) {
				try {
					const document = await vscode.workspace.openTextDocument(fileEdits.uri);
					await document.save();
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					console.error(`Failed to save ${fileEdits.uri.fsPath}: ${errorMessage}`);
					// Continue saving other files even if one fails
				}
			}
		}

		// Build detailed success response with location information
		const resultSummary: string[] = [];
		for (const fileEdits of fileEditsMap.values()) {
			const successfulResults = fileEdits.results.filter(r => r.success);
			if (successfulResults.length > 0) {
				const totalOccurrences = successfulResults.reduce(
					(sum, r) => sum + (r.occurrences || 0),
					0
				);
				const details = successfulResults.map(r => {
					const locations = r.error || ''; // We stored location info in error field
					return `    ${r.occurrences} × "${r.oldString.substring(0, 30)}${r.oldString.length > 30 ? '...' : ''}" → "${r.newString.substring(0, 30)}${r.newString.length > 30 ? '...' : ''}" ${locations ? `(${locations})` : ''}`;
				}).join('\n');
				resultSummary.push(
					`  ${fileEdits.uri.fsPath}: ${totalOccurrences} occurrence${totalOccurrences !== 1 ? 's' : ''}\n${details}`
				);
			}
		}

		await this.params.updateAsk(
			'tool',
			{
				tool: {
					tool: 'multi_replace_string_in_file',
					explanation,
					replacements,
					approvalState: totalFailures > 0 ? 'error' : 'approved',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
					successes: totalSuccesses,
					failures: totalFailures,
					summary: resultSummary,
				},
			},
			this.ts
		);

		const statusPrefix = totalFailures > 0 ? 'Partial success:' : 'Success:';
		return this.toolResponse(
			totalFailures > 0 ? 'error' : 'success',
			`${statusPrefix} Applied ${totalSuccesses} replacement${totalSuccesses !== 1 ? 's' : ''} across ${fileCount} file${fileCount !== 1 ? 's' : ''}:\n${resultSummary.join('\n')}${partialFailureWarning}`
		);
	}

	/**
	 * Process all replacements for a single file with enhanced error handling
	 */
	private async processFileReplacements(
		filePath: string,
		replacements: ReplacementOperation[]
	): Promise<FileEdits> {
		const results: ReplacementResult[] = [];
		const allEdits: vscode.TextEdit[] = [];

		// Resolve file path with better normalization
		const normalizedPath = filePath.replace(/\\/g, '/'); // Normalize path separators
		const uri = vscode.Uri.file(
			this.cwd
				? normalizedPath.startsWith('/')
					? normalizedPath
					: `${this.cwd}/${normalizedPath}`
				: normalizedPath
		);

		// Check if file exists with detailed error handling
		try {
			const stat = await vscode.workspace.fs.stat(uri);

			// Check if it's actually a file, not a directory
			if (stat.type !== vscode.FileType.File) {
				for (const replacement of replacements) {
					results.push({
						filePath,
						oldString: replacement.oldString,
						newString: replacement.newString,
						success: false,
						error: `Path exists but is not a file: ${filePath}`,
					});
				}
				return { uri, edits: [], results };
			}
		} catch (error) {
			// File doesn't exist - this might be a newly created file
			// Try to check if it's in the workspace's open text documents
			const openDoc = vscode.workspace.textDocuments.find(
				doc => doc.uri.toString() === uri.toString()
			);

			if (!openDoc) {
				// File truly doesn't exist
				for (const replacement of replacements) {
					results.push({
						filePath,
						oldString: replacement.oldString,
						newString: replacement.newString,
						success: false,
						error: `File not found: ${filePath}. Please ensure the file exists before attempting replacements.`,
					});
				}
				return { uri, edits: [], results };
			}
			// If openDoc exists, continue processing - file is open but not yet saved
			console.log(`[MultiReplaceString] File ${filePath} is open but not yet saved to disk`);
		}

		// Read file content with better error handling
		let document: vscode.TextDocument;
		try {
			document = await vscode.workspace.openTextDocument(uri);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			for (const replacement of replacements) {
				results.push({
					filePath,
					oldString: replacement.oldString,
					newString: replacement.newString,
					success: false,
					error: `Failed to read file: ${errorMessage}`,
				});
			}
			return { uri, edits: [], results };
		}

		const content = document.getText();

		// Validate file content isn't too large (safety check)
		const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
		if (content.length > MAX_FILE_SIZE) {
			for (const replacement of replacements) {
				results.push({
					filePath,
					oldString: replacement.oldString,
					newString: replacement.newString,
					success: false,
					error: `File too large (${content.length} bytes). Maximum size is ${MAX_FILE_SIZE} bytes.`,
				});
			}
			return { uri, edits: [], results };
		}

		// Process each replacement for this file
		for (const replacement of replacements) {
			const { oldString, newString, caseInsensitive, useRegex } = replacement;

			// Validate replacement strings - allow empty newString but not empty oldString
			if (oldString === '') {
				results.push({
					filePath,
					oldString,
					newString,
					success: false,
					error: `Cannot replace empty string`,
				});
				continue;
			}

			// Note: Escape sequences are already processed in the schema layer
			// No need to process them again here

			// Find all occurrences with enhanced error reporting and new options
			const occurrences = this.findOccurrences(content, oldString, {
				caseInsensitive: caseInsensitive || false,
				useRegex: useRegex || false,
			});

			if (occurrences.length === 0) {
				// Provide more helpful error message with context
				const preview = oldString.length > 50 ? oldString.substring(0, 50) + '...' : oldString;
				const displayPreview = preview.replace(/\n/g, '\\n').replace(/\t/g, '\\t');
				const modeInfo = useRegex ? ' (regex)' : caseInsensitive ? ' (case-insensitive)' : '';
				results.push({
					filePath,
					oldString: replacement.oldString, // Use original for display
					newString: replacement.newString,
					success: false,
					error: `String not found in file${modeInfo}: "${displayPreview}"`,
				});
				continue;
			}

			// Create edits for all occurrences (in reverse order to maintain positions)
			try {
				for (let i = occurrences.length - 1; i >= 0; i--) {
					const occurrence = occurrences[i];
					const startPos = document.positionAt(occurrence.start);
					const endPos = document.positionAt(occurrence.end);
					const range = new vscode.Range(startPos, endPos);

					// For regex mode, we need to handle capture groups in newString
					let replacementText = newString;
					if (useRegex && occurrence.matchedText) {
						// Simple capture group replacement (supports $1, $2, etc.)
						const regex = new RegExp(oldString, caseInsensitive ? 'i' : '');
						const match = occurrence.matchedText.match(regex);
						if (match) {
							replacementText = newString;
							for (let j = 1; j < match.length; j++) {
								replacementText = replacementText.replace(new RegExp(`\\$${j}`, 'g'), match[j] || '');
							}
						}
					}

					allEdits.push(vscode.TextEdit.replace(range, replacementText));
				}

				// Build detailed success message with locations
				const locations = occurrences.slice(0, 3).map(occ => `line ${occ.line}:${occ.column}`).join(', ');
				const moreText = occurrences.length > 3 ? ` and ${occurrences.length - 3} more` : '';

				results.push({
					filePath,
					oldString: replacement.oldString,
					newString: replacement.newString,
					success: true,
					occurrences: occurrences.length,
					error: `Replaced at ${locations}${moreText}`, // Use error field for location info
				});
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				results.push({
					filePath,
					oldString: replacement.oldString,
					newString: replacement.newString,
					success: false,
					error: `Failed to create text edits: ${errorMessage}`,
				});
			}
		}

		// Sort edits in reverse order (end to start) to maintain positions
		allEdits.sort((a, b) => {
			// Compare end positions first
			if (b.range.end.line !== a.range.end.line) {
				return b.range.end.line - a.range.end.line;
			}
			if (b.range.end.character !== a.range.end.character) {
				return b.range.end.character - a.range.end.character;
			}
			// If end positions are equal, compare start positions
			if (b.range.start.line !== a.range.start.line) {
				return b.range.start.line - a.range.start.line;
			}
			return b.range.start.character - a.range.start.character;
		});

		return { uri, edits: allEdits, results };
	}

	/**
	 * Find all occurrences of a string in content
	 * Supports case-insensitive matching and regex patterns
	 * Note: Escape sequences are already processed in the schema layer
	 */
	private findOccurrences(
		content: string,
		searchString: string,
		options: { caseInsensitive?: boolean; useRegex?: boolean } = {}
	): Array<{ start: number; end: number; line: number; column: number; matchedText: string }> {
		const occurrences: Array<{ start: number; end: number; line: number; column: number; matchedText: string }> = [];
		const { caseInsensitive = false, useRegex = false } = options;

		if (useRegex) {
			// Regex mode
			try {
				const flags = caseInsensitive ? 'gi' : 'g';
				const regex = new RegExp(searchString, flags);
				let match: RegExpExecArray | null;

				let line = 1;
				let column = 1;
				let lastIndex = 0;

				while ((match = regex.exec(content)) !== null) {
					const foundIndex = match.index;
					const matchedText = match[0];

					// Calculate line and column
					const beforeMatch = content.substring(lastIndex, foundIndex);
					const newlines = beforeMatch.split('\n').length - 1;
					line += newlines;
					if (newlines > 0) {
						column = beforeMatch.length - beforeMatch.lastIndexOf('\n');
					} else {
						column += beforeMatch.length;
					}

					occurrences.push({
						start: foundIndex,
						end: foundIndex + matchedText.length,
						line,
						column,
						matchedText,
					});

					// Update position tracking
					const matchNewlines = matchedText.split('\n').length - 1;
					line += matchNewlines;
					if (matchNewlines > 0) {
						column = matchedText.length - matchedText.lastIndexOf('\n');
					} else {
						column += matchedText.length;
					}

					lastIndex = foundIndex + matchedText.length;
				}
			} catch (error) {
				console.error('[MultiReplaceString] Regex error:', error);
				// Return empty array on regex error
				return [];
			}
		} else {
			// String mode (with optional case-insensitive)
			let index = 0;
			let line = 1;
			let column = 1;

			const searchContent = caseInsensitive ? content.toLowerCase() : content;
			const searchFor = caseInsensitive ? searchString.toLowerCase() : searchString;

			while (index < content.length) {
				const foundIndex = searchContent.indexOf(searchFor, index);
				if (foundIndex === -1) {
					break;
				}

				// Get the actual matched text from original content
				const matchedText = content.substring(foundIndex, foundIndex + searchString.length);

				// Calculate line and column for better error reporting
				const beforeMatch = content.substring(index, foundIndex);
				const newlines = beforeMatch.split('\n').length - 1;
				line += newlines;
				if (newlines > 0) {
					column = beforeMatch.length - beforeMatch.lastIndexOf('\n');
				} else {
					column += beforeMatch.length;
				}

				occurrences.push({
					start: foundIndex,
					end: foundIndex + searchString.length,
					line,
					column,
					matchedText,
				});

				// Update position tracking
				const matchNewlines = matchedText.split('\n').length - 1;
				line += matchNewlines;
				if (matchNewlines > 0) {
					column = matchedText.length - matchedText.lastIndexOf('\n');
				} else {
					column += matchedText.length;
				}

				index = foundIndex + searchString.length;
			}
		}

		return occurrences;
	}
}
