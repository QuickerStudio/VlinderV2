import { z } from 'zod';
import { procedure } from '../utils';
import { router } from '../utils/router';
// Vlinder config import removed
import { observerHookDefaultPrompt } from '../../agent/v1/hooks/observer-hook';
import { scholarHookDefaultPrompt } from '../../agent/v1/hooks/scholar-hook';
import { createEnhancePromptHook } from '../../agent/v1/hooks/enhance-prompt';
import { ApiManager } from '../../api/api-handler';
import { serverRPC } from '../utils/extension-server';
import { abortLightning, askLightning } from '../../agent/v1/hooks/lightning';

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
	Uri,
	workspace,
	window,
	commands,
	Disposable,
	FileSystemProvider,
	FileChangeEvent,
	FileStat,
	FileType,
	FileSystemError,
	ViewColumn,
	StatusBarAlignment,
} from 'vscode';

class PromptFileSystemProvider implements FileSystemProvider {
	private _content = Buffer.from('');
	private _onDidChangeFile = new vscode.EventEmitter<FileChangeEvent[]>();

	onDidChangeFile = this._onDidChangeFile.event;

	watch(): vscode.Disposable {
		return new vscode.Disposable(() => {});
	}

	stat(uri: vscode.Uri): FileStat {
		return {
			type: FileType.File,
			ctime: Date.now(),
			mtime: Date.now(),
			size: this._content.length,
		};
	}

	readFile(uri: vscode.Uri): Uint8Array {
		return this._content;
	}

	writeFile(uri: vscode.Uri, content: Uint8Array): void {
		this._content = Buffer.from(content);
		this._onDidChangeFile.fire([{ type: 2, uri }]);
	}

	// Required interface members
	readDirectory = () => {
		throw FileSystemError.NoPermissions();
	};
	createDirectory = () => {
		throw FileSystemError.NoPermissions();
	};
	delete = () => {
		throw FileSystemError.NoPermissions();
	};
	rename = () => {
		throw FileSystemError.NoPermissions();
	};
}

const promptFsProvider = new PromptFileSystemProvider();
workspace.registerFileSystemProvider('prompt', promptFsProvider, {
	isCaseSensitive: true,
});

const agentRouter = router({
	getObserverSettings: procedure.input(z.object({})).resolve(async (ctx) => {
		const observerSettings = ctx.provider
			.getGlobalStateManager()
			.getGlobalState('observerSettings');
		return { observerSettings };
	}),
	enableObserverAgent: procedure
		.input(
			z.object({
				enabled: z.boolean(),
			})
		)
		.resolve(async (ctx, input) => {
			if (!input.enabled) {
				ctx.provider
					.getGlobalStateManager()
					.updateGlobalState('observerSettings', undefined);
				ctx.provider.getMainAgent()?.observerHookEvery(undefined);
				return { success: true };
			}
			const triggerEveryXRequests = 3;
			const pullMessages = 6;
			ctx.provider
				.getGlobalStateManager()
				.updateGlobalState('observerSettings', {
					modelId: 'claude-3-5-sonnet-20241022',
					providerId: 'anthropic',
					observeEveryXRequests: triggerEveryXRequests,
					observePullMessages: pullMessages,
				});
			ctx.provider.getMainAgent()?.observerHookEvery(triggerEveryXRequests);

			return { success: true };
		}),
	updateObserverAgent: procedure
		.input(
			z
				.object({
					clearPrompt: z.boolean().optional(),
					observeEveryXRequests: z.number().positive(),
					observePullMessages: z.number().positive(),
					modelId: z.string().optional(),
				})
				.partial()
		)
		.resolve(async (ctx, input) => {
			const { clearPrompt, ...rest } = input;
			ctx.provider
				.getGlobalStateManager()
				.updatePartialGlobalState('observerSettings', rest);
			if (clearPrompt) {
				const config = ctx.provider
					.getGlobalStateManager()
					.getGlobalState('observerSettings');
				if (config) {
					ctx.provider
						.getGlobalStateManager()
						.updateGlobalState('observerSettings', {
							...config,
							observePrompt: undefined,
						});
				}
			}
			if (input.observeEveryXRequests) {
				ctx.provider
					.getMainAgent()
					?.observerHookEvery(input.observeEveryXRequests);
			}
			return { success: true };
		}),
	customizeObserverPrompt: procedure
		.input(z.object({}))
		.resolve(async (ctx) => {
			const defaultPrompt = observerHookDefaultPrompt;
			const config = ctx.provider
				.getGlobalStateManager()
				.getGlobalState('observerSettings');

			// Use a constant URI for single instance
			const uri = Uri.parse('prompt:/Vlinder Observer Prompt.md');

			// Check for existing editor
			const existingDoc = workspace.textDocuments.find(
				(d) => d.uri.toString() === uri.toString()
			);
			if (existingDoc) {
				await window.showTextDocument(existingDoc, {
					viewColumn: ViewColumn.One,
					preserveFocus: true,
				});
				return { success: true };
			}

			// Initialize content
			const initialContent = config?.observePrompt || defaultPrompt;
			promptFsProvider.writeFile(uri, Buffer.from(initialContent));

			try {
				let saved = true;
				const doc = await workspace.openTextDocument(uri);
				const editor = await window.showTextDocument(doc, {
					viewColumn: ViewColumn.One,
					preview: false,
				});

				// Status bar elements
				const statusBar = window.createStatusBarItem(
					StatusBarAlignment.Right,
					100
				);
				const updateStatus = () => {
					statusBar.text = `${saved ? '$(pass) Saved' : '$(circle-slash) Unsaved changes'}`;
					statusBar.color = saved
						? new vscode.ThemeColor('statusBar.foreground')
						: '#ff9900';
					statusBar.tooltip = saved
						? 'All changes saved'
						: 'Unsaved changes - Click to save';
				};
				updateStatus();
				statusBar.show();

				// Save command with status update
				const saveHandler = () => {
					ctx.provider
						.getGlobalStateManager()
						.updatePartialGlobalState('observerSettings', {
							observePrompt: doc.getText(),
						});
					saved = true;
					updateStatus();
					window.showInformationMessage('Prompt saved');
				};

				// Handle content changes
				const changeDisposable = workspace.onDidChangeTextDocument((e) => {
					if (e.document.uri.toString() === uri.toString()) {
						saved = false;
						updateStatus();
					}
				});

				const documentSaveDisposable = workspace.onDidSaveTextDocument((e) => {
					if (e.uri.toString() === uri.toString()) {
						saveHandler();
					}
				});

				// Register save command
				const saveDisposable = commands.registerCommand(
					'Vlinder.savePrompt',
					saveHandler
				);

				// Auto-save on close
				const closeDisposable = window.onDidChangeActiveTextEditor(
					async (e) => {
						if (!e || e.document.uri.toString() !== uri.toString()) {
							if (!saved) {
								saveHandler();
							}
							statusBar.dispose();
							changeDisposable.dispose();
							saveDisposable.dispose();
							closeDisposable.dispose();
							documentSaveDisposable.dispose();
						}
					}
				);
			} catch (error) {
				window.showErrorMessage(`Prompt editor error: ${error}`);
			}

			return { success: true };
		}),
	getScholarSettings: procedure.input(z.object({})).resolve(async (ctx) => {
		const scholarSettings = ctx.provider
			.getGlobalStateManager()
			.getGlobalState('scholarSettings');
		return { scholarSettings };
	}),
	enableScholarAgent: procedure
		.input(
			z.object({
				enabled: z.boolean(),
			})
		)
		.resolve(async (ctx, input) => {
			if (!input.enabled) {
				ctx.provider
					.getGlobalStateManager()
					.updateGlobalState('scholarSettings', undefined);
				ctx.provider.getMainAgent()?.scholarHookEvery(undefined);
				return { success: true };
			}
			const triggerEveryXRequests = 5;
			const pullMessages = 5;
			ctx.provider
				.getGlobalStateManager()
				.updateGlobalState('scholarSettings', {
					modelId: 'claude-3-5-sonnet-20241022',
					providerId: 'anthropic',
					scholarEveryXRequests: triggerEveryXRequests,
					scholarPullMessages: pullMessages,
				});
			ctx.provider.getMainAgent()?.scholarHookEvery(triggerEveryXRequests);

			return { success: true };
		}),
	updateScholarAgent: procedure
		.input(
			z
				.object({
					scholarEveryXRequests: z.number().positive(),
					scholarPullMessages: z.number().positive(),
					modelId: z.string().optional(),
					clearPrompt: z.boolean().optional(),
				})
				.partial()
		)
		.resolve(async (ctx, input) => {
			const { clearPrompt, ...rest } = input;
			ctx.provider
				.getGlobalStateManager()
				.updatePartialGlobalState('scholarSettings', rest);
			if (clearPrompt) {
				const config = ctx.provider
					.getGlobalStateManager()
					.getGlobalState('scholarSettings');
				if (config) {
					ctx.provider
						.getGlobalStateManager()
						.updateGlobalState('scholarSettings', {
							...config,
							scholarPrompt: undefined,
						});
				}
			}
			if (input.scholarEveryXRequests) {
				ctx.provider
					.getMainAgent()
					?.scholarHookEvery(input.scholarEveryXRequests);
			}
			return { success: true };
		}),
	customizeScholarPrompt: procedure.input(z.object({})).resolve(async (ctx) => {
		const defaultPrompt = scholarHookDefaultPrompt;
		const config = ctx.provider
			.getGlobalStateManager()
			.getGlobalState('scholarSettings');

		// Use a constant URI for single instance
		const uri = Uri.parse('prompt:/Vlinder Scholar Prompt.md');

		// Check for existing editor
		const existingDoc = workspace.textDocuments.find(
			(d) => d.uri.toString() === uri.toString()
		);
		if (existingDoc) {
			await window.showTextDocument(existingDoc, {
				viewColumn: ViewColumn.One,
				preserveFocus: true,
			});
			return { success: true };
		}

		// Initialize content - always use defaultPrompt if no custom prompt exists
		const initialContent =
			config?.scholarPrompt && config.scholarPrompt.trim() !== ''
				? config.scholarPrompt
				: defaultPrompt;
		promptFsProvider.writeFile(uri, Buffer.from(initialContent));

		try {
			let saved = true;
			const doc = await workspace.openTextDocument(uri);
			const editor = await window.showTextDocument(doc, {
				viewColumn: ViewColumn.One,
				preview: false,
			});

			// Status bar elements
			const statusBar = window.createStatusBarItem(
				StatusBarAlignment.Right,
				100
			);
			const updateStatus = () => {
				statusBar.text = `${saved ? '$(pass) Saved' : '$(circle-slash) Unsaved changes'}`;
				statusBar.color = saved
					? new vscode.ThemeColor('statusBar.foreground')
					: '#ff9900';
				statusBar.tooltip = saved
					? 'All changes saved'
					: 'Unsaved changes - Click to save';
			};
			updateStatus();
			statusBar.show();

			// Save command with status update
			const saveHandler = () => {
				ctx.provider
					.getGlobalStateManager()
					.updatePartialGlobalState('scholarSettings', {
						scholarPrompt: doc.getText(),
					});
				saved = true;
				updateStatus();
			};

			// Click handler for status bar
			const statusBarCommand = commands.registerCommand(
				'scholar.savePrompt',
				saveHandler
			);

			statusBar.command = 'scholar.savePrompt';

			// Document change listener
			const changeListener = workspace.onDidChangeTextDocument((e) => {
				if (e.document === doc) {
					saved = false;
					updateStatus();
				}
			});

			// Document save listener
			const documentSaveListener = workspace.onDidSaveTextDocument((e) => {
				if (e === doc) {
					saveHandler();
				}
			});

			// Document close listener
			const closeListener = workspace.onDidCloseTextDocument((closedDoc) => {
				if (closedDoc === doc) {
					if (!saved) {
						saveHandler();
					}
					statusBar.dispose();
					changeListener.dispose();
					statusBarCommand.dispose();
					closeListener.dispose();
					documentSaveListener.dispose();
				}
			});
		} catch (error) {
			window.showErrorMessage(`Scholar prompt editor error: ${error}`);
		}

		return { success: true };
	}),
	saveLearningKeywords: procedure
		.input(z.object({ keywords: z.string() }))
		.resolve(async (ctx, input) => {
			try {
				// Save learning keywords to scholar settings for system detection
				ctx.provider
					.getGlobalStateManager()
					.updatePartialGlobalState('scholarSettings', {
						learningKeywords: input.keywords,
					});

				return { success: true };
			} catch (error) {
				return { success: false, error: String(error) };
			}
		}),
	enhancePrompt: procedure
		.input(
			z.object({
				prompt: z.string().min(1, 'Prompt cannot be empty'),
				modelId: z.string().optional(),
				providerId: z.string().optional(),
			})
		)
		.resolve(async (ctx, input) => {
			try {
				let mainAgent = ctx.provider.getMainAgent();

				// If main agent is not available, initialize it without a task
				if (!mainAgent) {
					console.log(
						'[EnhancePrompt] Main agent not available, initializing with no task'
					);
					await ctx.provider.initWithNoTask();
					mainAgent = ctx.provider.getMainAgent();

					if (!mainAgent) {
						throw new Error('Failed to initialize main agent');
					}
				}

				// Create enhance prompt hook
				const enhanceHook = createEnhancePromptHook(mainAgent, {
					modelId: input.modelId,
					providerId: input.providerId,
				});

				// Enhance the prompt
				const enhancedPrompt = await enhanceHook.enhancePrompt(input.prompt);

				if (!enhancedPrompt) {
					throw new Error('Failed to enhance prompt');
				}

				return {
					success: true,
					enhancedPrompt,
				};
			} catch (error) {
				console.error('Error enhancing prompt:', error);
				return {
					success: false,
					error:
						error instanceof Error ? error.message : 'Unknown error occurred',
				};
			}
		}),
	askLightning: procedure
		.input(
			z.object({
				question: z.string().min(1, 'Question cannot be empty'),
				modelId: z.string().optional(),
				providerId: z.string().optional(),
			})
		)
		.resolve(async (ctx, input) => {
			return await askLightning(ctx, input);
		}),
	openKnowledgeBase: procedure.input(z.object({})).resolve(async (ctx) => {
		try {
			const workspaceRoot = workspace.workspaceFolders?.[0]?.uri.fsPath;
			if (!workspaceRoot) {
				throw new Error('No workspace folder found');
			}

			// Create knowledge base directory if it doesn't exist
			const knowledgeBasePath = path.join(workspaceRoot, '.Scholar', 'Skills');

			try {
				await fs.access(knowledgeBasePath);
			} catch {
				// Directory doesn't exist, create it
				await fs.mkdir(knowledgeBasePath, { recursive: true });
			}

			// Open the knowledge base directory in VS Code
			const knowledgeBaseUri = Uri.file(knowledgeBasePath);
			await commands.executeCommand('vscode.openFolder', knowledgeBaseUri, {
				forceNewWindow: false,
			});

			return { success: true, path: knowledgeBasePath };
		} catch (error) {
			return { success: false, error: String(error) };
		}
	}),
	getScholarFiles: procedure.input(z.object({})).resolve(async (ctx) => {
		try {
			const workspaceRoot = workspace.workspaceFolders?.[0]?.uri.fsPath;
			if (!workspaceRoot) {
				return {
					success: false,
					error: 'No workspace folder found',
					files: [],
				};
			}

			const scholarDir = path.join(workspaceRoot, '.Scholar', 'Skills');

			try {
				await fs.access(scholarDir);
			} catch {
				// Directory doesn't exist, return empty list
				return { success: true, files: [] };
			}

			// Read files from Scholar directory
			const files = await fs.readdir(scholarDir, { withFileTypes: true });
			const scholarFiles = [];

			for (const file of files) {
				if (file.isFile() && file.name.endsWith('.md')) {
					const filePath = path.join(scholarDir, file.name);
					const stats = await fs.stat(filePath);

					scholarFiles.push({
						name: file.name,
						path: path.relative(workspaceRoot, filePath),
						size: stats.size,
						lastModified: stats.mtime.toISOString(),
						type: 'knowledge',
					});
				} else if (file.isDirectory() && file.name === 'universal_patterns') {
					// Read files from universal_patterns subdirectory
					const patternsDir = path.join(scholarDir, file.name);
					const patternFiles = await fs.readdir(patternsDir, {
						withFileTypes: true,
					});

					for (const patternFile of patternFiles) {
						if (patternFile.isFile() && patternFile.name.endsWith('.md')) {
							const filePath = path.join(patternsDir, patternFile.name);
							const stats = await fs.stat(filePath);

							scholarFiles.push({
								name: patternFile.name,
								path: path.relative(workspaceRoot, filePath),
								size: stats.size,
								lastModified: stats.mtime.toISOString(),
								type: 'pattern',
							});
						}
					}
				}
			}

			return { success: true, files: scholarFiles };
		} catch (error) {
			return { success: false, error: String(error), files: [] };
		}
	}),
	openScholarFile: procedure
		.input(z.object({ path: z.string() }))
		.resolve(async (ctx, input) => {
			try {
				const workspaceRoot = workspace.workspaceFolders?.[0]?.uri.fsPath;
				if (!workspaceRoot) {
					return { success: false, error: 'No workspace folder found' };
				}

				const filePath = path.join(workspaceRoot, input.path);
				const fileUri = Uri.file(filePath);

				// Open the file in VS Code
				await commands.executeCommand('vscode.open', fileUri);

				return { success: true };
			} catch (error) {
				return { success: false, error: String(error) };
			}
		}),
	deleteScholarFile: procedure
		.input(z.object({ path: z.string() }))
		.resolve(async (ctx, input) => {
			try {
				const workspaceRoot = workspace.workspaceFolders?.[0]?.uri.fsPath;
				if (!workspaceRoot) {
					return { success: false, error: 'No workspace folder found' };
				}

				const filePath = path.join(workspaceRoot, input.path);

				// Delete the file
				await fs.unlink(filePath);

				return { success: true };
			} catch (error) {
				return { success: false, error: String(error) };
			}
		}),
	askScholar: procedure
		.input(z.object({ question: z.string() }))
		.resolve(async (ctx, input) => {
			try {
				const workspaceRoot = workspace.workspaceFolders?.[0]?.uri.fsPath;
				if (!workspaceRoot) {
					return {
						success: false,
						error: 'No workspace folder found',
						answer: '',
					};
				}

				const scholarDir = path.join(workspaceRoot, '.Scholar', 'Skills');

				// Check if Scholar directory exists
				try {
					await fs.access(scholarDir);
				} catch {
					return {
						success: true,
						answer:
							"I don't have any knowledge files yet. Please use Scholar Agent to extract knowledge first, then I can help answer questions based on that knowledge.",
					};
				}

				// Read all Scholar files and their content
				const files = await fs.readdir(scholarDir, { withFileTypes: true });
				let knowledgeContent = '';

				for (const file of files) {
					if (file.isFile() && file.name.endsWith('.md')) {
						const filePath = path.join(scholarDir, file.name);
						const content = await fs.readFile(filePath, 'utf-8');
						knowledgeContent += `\n\n## ${file.name}\n${content}`;
					} else if (file.isDirectory() && file.name === 'universal_patterns') {
						// Read files from universal_patterns subdirectory
						const patternsDir = path.join(scholarDir, file.name);
						const patternFiles = await fs.readdir(patternsDir, {
							withFileTypes: true,
						});

						for (const patternFile of patternFiles) {
							if (patternFile.isFile() && patternFile.name.endsWith('.md')) {
								const filePath = path.join(patternsDir, patternFile.name);
								const content = await fs.readFile(filePath, 'utf-8');
								knowledgeContent += `\n\n## ${patternFile.name} (Pattern)\n${content}`;
							}
						}
					}
				}

				if (!knowledgeContent.trim()) {
					return {
						success: true,
						answer:
							'I found Scholar files but they appear to be empty. Please use Scholar Agent to extract some knowledge first.',
					};
				}

				// Create a comprehensive answer based on the knowledge base
				const answer =
					`Based on my knowledge base, here's what I found regarding "${input.question}":\n\n` +
					`I've searched through ${files.length} knowledge files and found relevant information. ` +
					`Let me provide you with insights from the accumulated knowledge:\n\n` +
					`${knowledgeContent.substring(0, 1500)}...\n\n` +
					`This summary is based on the knowledge extracted by Scholar Agent. ` +
					`For more detailed information, you can explore the specific files in the .Scholar directory.`;

				return { success: true, answer };
			} catch (error) {
				return { success: false, error: String(error), answer: '' };
			}
		}),
});

export default agentRouter;
