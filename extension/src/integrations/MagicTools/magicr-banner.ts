/**
 * Magic Banner Drop Provider - Smart Banner Drag Formatting Tool
 *
 * Feature Description:
 * - Provides code formatting functionality triggered by banner dragging
 * - Automatically detects file types and applies appropriate formatters
 * - Supports formatting for multiple programming languages (JavaScript, TypeScript, Python, Java, Go, C#, CSS, HTML, etc.)
 * - Smart recommendation and automatic installation of formatter extensions
 * - Provides user-friendly progress indicators and error handling
 *
 * Related Files:
 * - src/extension.ts - Main extension entry point, registers this provider
 * - docs/banner-drag-drop-feature.md - Feature documentation
 * - docs/BANNER_DRAG_DROP_DEMO.md - Demo documentation
 * - docs/BANNER_TECHNICAL_REPORT.md - Technical report
 * - AUTO_INSTALL_FORMATTER.md - Auto-install formatter instructions
 * - assets/demo.mp4 - Feature demo video
 * - assets/editing-demo.mp4 - Editing demo video
 *
 * @author Magic Tools Team
 * @version 2.3.13
 */

import * as vscode from 'vscode';

export const BANNER_MIME_TYPE = 'application/x-vscode-banner';

// Uses VS Code's built-in formatting API, automatically supports all installed formatters
// Including Prettier, ESLint, Black, Go fmt, etc.

export class BannerDropEditProvider implements vscode.DocumentDropEditProvider {
	async provideDocumentDropEdits(
		document: vscode.TextDocument,
		position: vscode.Position,
		dataTransfer: vscode.DataTransfer,
		token: vscode.CancellationToken
	): Promise<vscode.DocumentDropEdit | undefined> {
		const bannerData = dataTransfer.get(BANNER_MIME_TYPE);
		if (!bannerData) {
			return undefined;
		}

		// Execute formatting directly without modifying code content
		const dropEdit = new vscode.DocumentDropEdit('');

		// Execute formatting asynchronously, providing better error handling and user feedback
		this.formatDocument(document).catch((error) => {
			console.error('Banner drop format error:', error);
			vscode.window.showErrorMessage(`Formatting failed: ${error.message}`);
		});

		return dropEdit;
	}

	private async formatDocument(document: vscode.TextDocument): Promise<void> {
		try {
			const fileName = document.uri.path.split('/').pop() || document.fileName;
			const fileExtension = this.getFileExtension(fileName);
			const languageId = document.languageId;

			// Show progress indicator
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: `Formatting ${this.getLanguageDisplayName(languageId)} code...`,
					cancellable: false,
				},
				async (progress) => {
					progress.report({ increment: 30, message: 'Preparing to format' });

					// Check if formatter is available
					const hasFormatter = await this.checkFormatterAvailable(document);

					if (!hasFormatter) {
						progress.report({ increment: 30, message: 'Formatter not found' });
						// Try to install formatter
						const installed = await this.promptAndInstallFormatter(
							document.languageId
						);
						if (!installed) {
							progress.report({
								increment: 40,
								message: 'Installation cancelled',
							});
							throw new Error(
								`No formatter found for ${languageId} files, and user cancelled installation`
							);
						}
						progress.report({
							increment: 40,
							message: 'Formatter installation completed',
						});
					}

					progress.report({ increment: 40, message: 'Executing format' });
					await this.executeFormatCommand(document);
					progress.report({ increment: 30, message: 'Formatting completed' });
				}
			);

			// Show success message
			const displayName = this.getLanguageDisplayName(languageId);
			vscode.window.showInformationMessage(
				`✅ Successfully formatted ${displayName} file: ${fileName}`
			);
		} catch (error) {
			// Provide more detailed error information
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			const fileName = document.uri.path.split('/').pop() || document.fileName;
			throw new Error(`Failed to format file ${fileName}: ${errorMessage}`);
		}
	}

	private async executeFormatCommand(
		document: vscode.TextDocument
	): Promise<void> {
		// Ensure document is active
		const editor = vscode.window.activeTextEditor;
		if (editor && editor.document.uri.toString() === document.uri.toString()) {
			// Document is already active, format directly
			await vscode.commands.executeCommand('editor.action.formatDocument');
		} else {
			// If document is not active, open it first
			const doc = await vscode.workspace.openTextDocument(document.uri);
			await vscode.window.showTextDocument(doc);
			await vscode.commands.executeCommand('editor.action.formatDocument');
		}
	}

	private async checkFormatterAvailable(
		document: vscode.TextDocument
	): Promise<boolean> {
		try {
			// Check if Prettier extension is installed
			const prettierExtension = vscode.extensions.getExtension(
				'esbenp.prettier-vscode'
			);

			// For frontend files, check Prettier extension
			const frontendLanguages = [
				'javascript',
				'typescript',
				'typescriptreact',
				'javascriptreact',
				'css',
				'scss',
				'html',
				'json',
				'markdown',
			];
			if (frontendLanguages.includes(document.languageId)) {
				return prettierExtension !== undefined;
			}

			// For other file types, assume built-in or other formatters exist
			return true;
		} catch {
			// If check fails, return false to trigger installation prompt
			return false;
		}
	}

	private getFileExtension(fileName: string): string {
		if (
			fileName === 'Dockerfile' ||
			fileName.toLowerCase().includes('dockerfile')
		) {
			return 'Dockerfile';
		}
		const lastDotIndex = fileName.lastIndexOf('.');
		return lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
	}

	private getLanguageDisplayName(languageId: string): string {
		const displayNames: { [key: string]: string } = {
			javascript: 'JavaScript',
			typescript: 'TypeScript',
			typescriptreact: 'TypeScript React (TSX)',
			javascriptreact: 'JavaScript React (JSX)',
			css: 'CSS',
			scss: 'SCSS',
			sass: 'Sass',
			less: 'Less',
			html: 'HTML',
			xml: 'XML',
			json: 'JSON',
			jsonc: 'JSON with Comments',
			yaml: 'YAML',
			markdown: 'Markdown',
			vue: 'Vue',
			svelte: 'Svelte',
			python: 'Python',
			java: 'Java',
			csharp: 'C#',
			php: 'PHP',
			go: 'Go',
			rust: 'Rust',
			dockerfile: 'Dockerfile',
			toml: 'TOML',
			ini: 'INI',
		};

		return displayNames[languageId] || languageId.toUpperCase();
	}

	private async promptAndInstallFormatter(
		languageId: string
	): Promise<boolean> {
		const languageDisplayName = this.getLanguageDisplayName(languageId);

		// Recommend different formatters based on language type
		const formatterInfo = this.getRecommendedFormatter(languageId);

		const choice = await vscode.window.showWarningMessage(
			`No formatter found for ${languageDisplayName} files`,
			{
				modal: true,
				detail: `To format ${languageDisplayName} files, it's recommended to install the ${formatterInfo.name} extension.\n\nClick "Install" to automatically install the recommended formatter.`,
			},
			'Install Formatter',
			'Cancel'
		);

		if (choice === 'Install Formatter') {
			try {
				// Show installation progress
				return await vscode.window.withProgress(
					{
						location: vscode.ProgressLocation.Notification,
						title: `Installing ${formatterInfo.name}...`,
						cancellable: false,
					},
					async (progress) => {
						progress.report({
							increment: 30,
							message: 'Preparing installation',
						});

						// Execute installation command
						await vscode.commands.executeCommand(
							'workbench.extensions.installExtension',
							formatterInfo.extensionId
						);

						progress.report({
							increment: 70,
							message: 'Installation completed',
						});

						// Show success message
						vscode.window.showInformationMessage(
							`✅ ${formatterInfo.name} installed successfully! You can now format ${languageDisplayName} files.`
						);

						return true;
					}
				);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				vscode.window.showErrorMessage(
					`Failed to install ${formatterInfo.name}: ${errorMessage}`
				);
				return false;
			}
		}

		return false;
	}

	private getRecommendedFormatter(languageId: string): {
		name: string;
		extensionId: string;
	} {
		// Recommend Prettier for frontend files
		const frontendLanguages = [
			'javascript',
			'typescript',
			'typescriptreact',
			'javascriptreact',
			'css',
			'scss',
			'html',
			'json',
			'markdown',
			'vue',
		];
		if (frontendLanguages.includes(languageId)) {
			return {
				name: 'Prettier - Code formatter',
				extensionId: 'esbenp.prettier-vscode',
			};
		}

		// Recommend Black or autopep8 for Python
		if (languageId === 'python') {
			return {
				name: 'Python',
				extensionId: 'ms-python.python',
			};
		}

		// Recommend Extension Pack for Java
		if (languageId === 'java') {
			return {
				name: 'Extension Pack for Java',
				extensionId: 'vscjava.vscode-java-pack',
			};
		}

		// Recommend C# Dev Kit for C#
		if (languageId === 'csharp') {
			return {
				name: 'C# Dev Kit',
				extensionId: 'ms-dotnettools.csdevkit',
			};
		}

		// Recommend Go extension for Go
		if (languageId === 'go') {
			return {
				name: 'Go',
				extensionId: 'golang.go',
			};
		}

		// Default to Prettier (supports multiple formats)
		return {
			name: 'Prettier - Code formatter',
			extensionId: 'esbenp.prettier-vscode',
		};
	}
}
