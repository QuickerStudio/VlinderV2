import * as vscode from 'vscode';
import * as path from 'path';
import { BaseAgentTool } from '../base-agent.tool';
import { GetErrorsToolParams } from '../schema/get-errors';
import { ToolResponseV2 } from '../../types';

/**
 * GetErrors Tool - Retrieves diagnostics (errors and warnings) from workspace files
 *
 * This tool helps the agent understand compilation errors, linting issues, and warnings
 * in the codebase to provide better assistance with fixing issues.
 */
export class GetErrorsTool extends BaseAgentTool<GetErrorsToolParams> {
	async execute(): Promise<ToolResponseV2> {
		const { input } = this.params;
		const { filePaths, ranges } = input;

		try {
			// Validate input parameters
			const validationResult = this.validateInput(filePaths, ranges);
			if (!validationResult.isValid) {
				return this.toolResponse(
					'error',
					`Invalid input: ${validationResult.error}`
				);
			}
			let diagnosticsData: Array<{
				uri: vscode.Uri;
				diagnostics: vscode.Diagnostic[];
			}> = [];

			if (filePaths && filePaths.length > 0) {
				// Get diagnostics for specific files
				const fileResults: Array<{
					uri: vscode.Uri;
					diagnostics: vscode.Diagnostic[];
				}> = [];

				for (let index = 0; index < filePaths.length; index++) {
					const filePath = filePaths[index];

					// Validate file path
					const fileValidation = await this.validateFilePath(filePath);
					if (!fileValidation.isValid) {
						// Log warning but continue with other files
						console.warn(`Skipping invalid file: ${fileValidation.error}`);
						continue;
					}

					const absolutePath = path.isAbsolute(filePath)
						? filePath
						: path.join(this.cwd, filePath);
					const uri = vscode.Uri.file(absolutePath);

					let diagnostics = vscode.languages.getDiagnostics(uri);

					// Filter by range if provided
					if (ranges && ranges[index]) {
						const range = ranges[index];
						if (range) {
							const [startLine, startChar, endLine, endChar] = range;
							const targetRange = new vscode.Range(
								startLine,
								startChar,
								endLine,
								endChar
							);
							diagnostics = diagnostics.filter(
								(d) => d.range.intersection(targetRange) !== undefined
							);
						}
					}

					// Filter to only errors and warnings
					diagnostics = diagnostics.filter(
						(d) =>
							d.severity === vscode.DiagnosticSeverity.Error ||
							d.severity === vscode.DiagnosticSeverity.Warning
					);

					fileResults.push({ uri, diagnostics });
				}

				diagnosticsData = fileResults;
			} else {
				// Get all diagnostics from workspace
				const allDiagnostics = vscode.languages.getDiagnostics();
				diagnosticsData = allDiagnostics
					.map(([uri, diagnostics]) => ({
						uri,
						diagnostics: diagnostics.filter(
							(d) =>
								d.severity === vscode.DiagnosticSeverity.Error ||
								d.severity === vscode.DiagnosticSeverity.Warning
						),
					}))
					.filter((d) => d.diagnostics.length > 0);
			}

			// Format the output
			const output = await this.formatDiagnostics(diagnosticsData);

			return this.toolResponse('success', output);
		} catch (error) {
			const errorMsg = `Failed to get errors: ${error instanceof Error ? error.message : String(error)}`;
			return this.toolResponse('error', errorMsg);
		}
	}

	private async formatDiagnostics(
		diagnosticsData: Array<{
			uri: vscode.Uri;
			diagnostics: vscode.Diagnostic[];
		}>
	): Promise<string> {
		if (diagnosticsData.length === 0) {
			return `<errors_result>
<status>success</status>
<message>No errors or warnings found</message>
<timestamp>${new Date().toISOString()}</timestamp>
</errors_result>`;
		}

		// Apply limits to prevent excessive output
		const MAX_FILES = 50;
		const MAX_DIAGNOSTICS_PER_FILE = 20;
		const MAX_TOTAL_DIAGNOSTICS = 200;

		let totalDiagnosticsCount = 0;
		const limitedDiagnosticsData = diagnosticsData
			.slice(0, MAX_FILES)
			.map(({ uri, diagnostics }) => {
				const remainingQuota = MAX_TOTAL_DIAGNOSTICS - totalDiagnosticsCount;
				const limitedDiagnostics = diagnostics.slice(
					0,
					Math.min(MAX_DIAGNOSTICS_PER_FILE, remainingQuota)
				);

				totalDiagnosticsCount += limitedDiagnostics.length;

				return { uri, diagnostics: limitedDiagnostics };
			})
			.filter((d) => d.diagnostics.length > 0);

		const totalErrors = diagnosticsData.reduce(
			(sum, d) =>
				sum +
				d.diagnostics.filter(
					(diag) => diag.severity === vscode.DiagnosticSeverity.Error
				).length,
			0
		);
		const totalWarnings = diagnosticsData.reduce(
			(sum, d) =>
				sum +
				d.diagnostics.filter(
					(diag) => diag.severity === vscode.DiagnosticSeverity.Warning
				).length,
			0
		);

		const isLimited =
			diagnosticsData.length > limitedDiagnosticsData.length ||
			totalDiagnosticsCount >= MAX_TOTAL_DIAGNOSTICS;

		let output = `<errors_result>
<status>success</status>
<timestamp>${new Date().toISOString()}</timestamp>
<summary>
  <total_files>${diagnosticsData.length}</total_files>
  <displayed_files>${limitedDiagnosticsData.length}</displayed_files>
  <total_errors>${totalErrors}</total_errors>
  <total_warnings>${totalWarnings}</total_warnings>
  <is_limited>${isLimited}</is_limited>
  <limits>
    <max_files>${MAX_FILES}</max_files>
    <max_diagnostics_per_file>${MAX_DIAGNOSTICS_PER_FILE}</max_diagnostics_per_file>
    <max_total_diagnostics>${MAX_TOTAL_DIAGNOSTICS}</max_total_diagnostics>
  </limits>
</summary>
<files>`;

		for (const { uri, diagnostics } of limitedDiagnosticsData) {
			const relativePath = path.relative(this.cwd, uri.fsPath);
			const fileErrors = diagnostics.filter(
				(d) => d.severity === vscode.DiagnosticSeverity.Error
			).length;
			const fileWarnings = diagnostics.filter(
				(d) => d.severity === vscode.DiagnosticSeverity.Warning
			).length;

			output += `
  <file>
    <path>${this.escapeXml(relativePath)}</path>
    <error_count>${fileErrors}</error_count>
    <warning_count>${fileWarnings}</warning_count>
    <diagnostics>`;

			for (const diagnostic of diagnostics) {
				const severity =
					diagnostic.severity === vscode.DiagnosticSeverity.Error
						? 'error'
						: 'warning';
				const source = diagnostic.source ? diagnostic.source : 'unknown';

				output += `
      <diagnostic>
        <severity>${severity}</severity>
        <source>${this.escapeXml(source)}</source>
        <line>${diagnostic.range.start.line + 1}</line>
        <column>${diagnostic.range.start.character + 1}</column>
        <end_line>${diagnostic.range.end.line + 1}</end_line>
        <end_column>${diagnostic.range.end.character + 1}</end_column>
        <message>${this.escapeXml(diagnostic.message)}</message>
        <code>${diagnostic.code || 'N/A'}</code>
        <tags>${diagnostic.tags ? diagnostic.tags.join(',') : ''}</tags>
      </diagnostic>`;
			}

			output += `
    </diagnostics>
  </file>`;
		}

		output += `
</files>
</errors_result>`;

		return output;
	}

	/**
	 * Validate input parameters
	 */
	private validateInput(
		filePaths?: string[],
		ranges?: Array<[number, number, number, number] | undefined>
	): { isValid: boolean; error?: string } {
		// Validate file paths
		if (filePaths) {
			if (!Array.isArray(filePaths)) {
				return { isValid: false, error: 'filePaths must be an array' };
			}

			if (filePaths.length > 100) {
				return {
					isValid: false,
					error: 'Too many files specified (maximum 100)',
				};
			}

			for (const filePath of filePaths) {
				if (typeof filePath !== 'string' || filePath.trim().length === 0) {
					return {
						isValid: false,
						error: 'All file paths must be non-empty strings',
					};
				}

				// Basic path validation
				if (filePath.includes('..') && !path.isAbsolute(filePath)) {
					return {
						isValid: false,
						error:
							"Relative paths with '..' are not allowed for security reasons",
					};
				}
			}
		}

		// Validate ranges
		if (ranges) {
			if (!Array.isArray(ranges)) {
				return { isValid: false, error: 'ranges must be an array' };
			}

			if (filePaths && ranges.length > filePaths.length) {
				return {
					isValid: false,
					error: 'ranges array cannot be longer than filePaths array',
				};
			}

			for (let i = 0; i < ranges.length; i++) {
				const range = ranges[i];
				if (range !== null) {
					if (!Array.isArray(range) || range.length !== 4) {
						return {
							isValid: false,
							error: `Range at index ${i} must be a 4-element array [startLine, startChar, endLine, endChar]`,
						};
					}

					const [startLine, startChar, endLine, endChar] = range;
					if (
						!Number.isInteger(startLine) ||
						!Number.isInteger(startChar) ||
						!Number.isInteger(endLine) ||
						!Number.isInteger(endChar)
					) {
						return {
							isValid: false,
							error: `Range at index ${i} must contain only integers`,
						};
					}

					if (startLine < 0 || startChar < 0 || endLine < 0 || endChar < 0) {
						return {
							isValid: false,
							error: `Range at index ${i} cannot contain negative values`,
						};
					}

					if (
						startLine > endLine ||
						(startLine === endLine && startChar > endChar)
					) {
						return {
							isValid: false,
							error: `Range at index ${i} has invalid start/end positions`,
						};
					}
				}
			}
		}

		return { isValid: true };
	}

	/**
	 * Validate file existence and accessibility
	 */
	private async validateFilePath(
		filePath: string
	): Promise<{ isValid: boolean; error?: string }> {
		try {
			const absolutePath = path.isAbsolute(filePath)
				? filePath
				: path.join(this.cwd, filePath);

			// Check if file exists using VS Code workspace API
			const uri = vscode.Uri.file(absolutePath);
			await vscode.workspace.fs.stat(uri);

			return { isValid: true };
		} catch (error) {
			return {
				isValid: false,
				error: `File not accessible: ${filePath} (${error instanceof Error ? error.message : String(error)})`,
			};
		}
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
