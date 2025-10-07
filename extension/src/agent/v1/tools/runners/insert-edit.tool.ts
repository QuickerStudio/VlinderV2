import * as vscode from 'vscode';
import { BaseAgentTool } from '../base-agent.tool';
import { InsertEditToolParams } from '../schema/insert-edit';
import { ToolResponseV2 } from '../types';

/**
 * Tool for inserting or replacing code at specific line numbers in a file
 */
export class InsertEditTool extends BaseAgentTool<InsertEditToolParams> {
	async execute(): Promise<ToolResponseV2> {
		const { explanation, filePath, startLine, endLine, code } =
			this.params.input;

		this.logger(
			`Executing insert_edit_into_file: ${filePath} at line ${startLine}${endLine ? `-${endLine}` : ''}`,
			'info'
		);

		// Enhanced input validation
		if (startLine < 1) {
			return this.toolResponse(
				'error',
				'startLine must be a positive integer (1-based line numbers)'
			);
		}

		if (endLine !== undefined && endLine < startLine) {
			return this.toolResponse(
				'error',
				'endLine must be greater than or equal to startLine'
			);
		}

		// Security: Path validation
		const normalizedPath = filePath.replace(/\\/g, '/').replace(/\/+/g, '/');
		if (normalizedPath.includes('../') || normalizedPath.includes('..\\')) {
			return this.toolResponse(
				'error',
				'Invalid file path: Path traversal not allowed'
			);
		}

		// Performance: Code size validation
		if (code.length > 100000) {
			// 100KB limit
			return this.toolResponse(
				'error',
				'Code content too large (max 100KB). Please split into smaller chunks.'
			);
		}

		// Security: Basic malicious code detection
		const suspiciousPatterns = [
			/eval\s*\(/i,
			/exec\s*\(/i,
			/system\s*\(/i,
			/shell_exec\s*\(/i,
			/__import__\s*\(/i,
			/document\.write\s*\(/i,
		];

		for (const pattern of suspiciousPatterns) {
			if (pattern.test(code)) {
				this.logger(
					`Potentially suspicious code detected in ${filePath}`,
					'warn'
				);
				// 不阻止执行，但记录警告
				break;
			}
		}

		// Resolve file path
		const uri = vscode.Uri.file(
			this.cwd
				? filePath.startsWith('/')
					? filePath
					: `${this.cwd}/${filePath}`
				: filePath
		);

		// Check if file exists
		let document: vscode.TextDocument;
		try {
			document = await vscode.workspace.openTextDocument(uri);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			this.logger(`Failed to open file ${filePath}: ${errorMessage}`, 'error');

			// 提供更具体的错误信息
			if (errorMessage.includes('ENOENT')) {
				return this.toolResponse(
					'error',
					`File not found: ${filePath}. Please check the file path and try again.`
				);
			} else if (errorMessage.includes('EACCES')) {
				return this.toolResponse(
					'error',
					`Permission denied: Cannot access ${filePath}. Please check file permissions.`
				);
			} else if (errorMessage.includes('EISDIR')) {
				return this.toolResponse(
					'error',
					`Path is a directory: ${filePath}. Please specify a file path.`
				);
			} else {
				return this.toolResponse(
					'error',
					`Failed to open file ${filePath}: ${errorMessage}`
				);
			}
		}

		const totalLines = document.lineCount;

		// Performance: Large file warning
		if (totalLines > 10000) {
			this.logger(
				`Working with large file: ${filePath} (${totalLines} lines)`,
				'warn'
			);
			// 可以考虑添加用户确认，但这里只记录警告
		}

		// Validate line numbers
		if (startLine > totalLines + 1) {
			return this.toolResponse(
				'error',
				`startLine (${startLine}) is beyond the end of the file (${totalLines} lines). Maximum allowed is ${totalLines + 1}.`
			);
		}

		if (endLine !== undefined && endLine > totalLines) {
			return this.toolResponse(
				'error',
				`endLine (${endLine}) is beyond the end of the file (${totalLines} lines). Maximum allowed is ${totalLines}.`
			);
		}

		// Determine operation type
		const isInsertion = endLine === undefined;
		const operationType = isInsertion ? 'insert' : 'replace';
		const lineRange = isInsertion
			? `line ${startLine}`
			: `lines ${startLine}-${endLine}`;

		// Ask for approval
		const { response } = await this.params.ask(
			'tool',
			{
				tool: {
					tool: 'insert_edit_into_file',
					explanation,
					filePath,
					startLine,
					endLine,
					code,
					operationType,
					lineRange,
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
				`User rejected the ${operationType} operation.`
			);
		}

		// Update to loading state
		await this.params.updateAsk(
			'tool',
			{
				tool: {
					tool: 'insert_edit_into_file',
					explanation,
					filePath,
					startLine,
					endLine,
					code,
					operationType,
					lineRange,
					approvalState: 'loading',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		// Create the edit
		const workspaceEdit = new vscode.WorkspaceEdit();

		if (isInsertion) {
			// Insert at the specified line
			// Line numbers are 1-based in the tool, but 0-based in VS Code
			const insertPosition = new vscode.Position(startLine - 1, 0);

			// Ensure code ends with newline for insertion
			const codeToInsert = code.endsWith('\n') ? code : code + '\n';
			workspaceEdit.insert(uri, insertPosition, codeToInsert);
		} else {
			// Replace the specified line range
			// Convert 1-based inclusive range to 0-based VS Code range
			const startPos = new vscode.Position(startLine - 1, 0);
			const endPos = new vscode.Position(endLine!, 0);
			const range = new vscode.Range(startPos, endPos);

			// Get the indentation of the first line being replaced for better formatting
			const firstLine = document.lineAt(startLine - 1);
			const indentation = firstLine.text.match(/^\s*/)?.[0] || '';

			// Smart indentation: Apply base indentation to multi-line code
			let processedCode = code;
			if (indentation && code.includes('\n')) {
				const lines = code.split('\n');
				processedCode = lines
					.map((line, index) => {
						// Don't indent the first line if it already has content
						if (index === 0 && line.trim()) {
							return line;
						}
						// Apply indentation to non-empty lines
						return line.trim() ? indentation + line : line;
					})
					.join('\n');
			}

			// Ensure code ends with newline for replacement
			const codeToReplace = processedCode.endsWith('\n')
				? processedCode
				: processedCode + '\n';

			workspaceEdit.replace(uri, range, codeToReplace);
		}

		// Apply the edit
		const applied = await vscode.workspace.applyEdit(workspaceEdit);
		if (!applied) {
			await this.params.updateAsk(
				'tool',
				{
					tool: {
						tool: 'insert_edit_into_file',
						explanation,
						filePath,
						startLine,
						endLine,
						code,
						operationType,
						lineRange,
						approvalState: 'error',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			);
			return this.toolResponse('error', 'Failed to apply workspace edit');
		}

		// Success
		await this.params.updateAsk(
			'tool',
			{
				tool: {
					tool: 'insert_edit_into_file',
					explanation,
					filePath,
					startLine,
					endLine,
					code,
					operationType,
					lineRange,
					approvalState: 'approved',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		const linesAffected = isInsertion
			? code.split('\n').length
			: endLine! - startLine + 1;
		const operation = operationType === 'insert' ? 'inserted' : 'replaced';
		const successMessage = `Successfully ${operation} ${linesAffected} line${linesAffected !== 1 ? 's' : ''} at ${lineRange} in ${filePath}`;

		this.logger(`${successMessage}`, 'info');

		// 提供更详细的成功信息
		const detailedMessage = isInsertion
			? `${successMessage}. New content added before line ${startLine}.`
			: `${successMessage}. Lines ${startLine}-${endLine} have been updated.`;

		return this.toolResponse('success', detailedMessage);
	}
}
