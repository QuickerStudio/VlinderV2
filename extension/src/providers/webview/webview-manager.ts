import { readdir } from 'fs/promises';
import path from 'path';
import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import { extensionName } from '../../shared/constants';
import { GitHandler } from '../../agent/v1/handlers/git-handler';
import {
	BaseExtensionState,
	ClaudeMessage,
	ExtensionMessage,
	ExtensionState,
} from '../../shared/messages/extension-message';
import {
	WebviewMessage,
	ActionMessage,
} from '../../shared/messages/client-message';
import { getNonce, getUri } from '../../utils';
import { AmplitudeWebviewManager } from '../../utils/amplitude/manager';
import { ExtensionProvider } from '../extension-provider';
import { GlobalStateManager } from '../state/global-state-manager';
import { PromptStateManager } from '../state/prompt-state-manager';
import { PromptManager } from './prompt-manager';
import { ExtensionContext } from '../../router/utils/context';
import { abortLightning } from '../../agent/v1/hooks/lightning';
import { ExtensionServer } from '../../router/utils/extension-server';

/**
 * Represents an item in the file tree structure.
 * Used to display and manage hierarchical file/folder organization in the webview.
 */
interface FileTreeItem {
	/** Unique identifier for the item */
	id: string;
	/** Display name of the file or folder */
	name: string;
	/** Child items for folders */
	children?: FileTreeItem[];
	/** Nesting level in the tree structure */
	depth: number;
	/** Indicates whether this is a file or folder */
	type: 'file' | 'folder';
}

/**
 * Directories that should be excluded from the file tree
 * to avoid cluttering the view with non-essential files
 */
const excludedDirectories = [
	'node_modules',
	'venv',
	'.venv',
	'__pycache__',
	'.git',
	'dist',
	'build',
	'target',
	'vendor',
	'modules',
	'packages',
];

/**
 * Manages the webview interface for the Vlinder extension.
 * Handles communication between the extension and webview, manages state updates,
 * and provides functionality for file system operations and user interactions.
 */
export class WebviewManager {
	/** ID of the latest announcement to show to users */
	private static readonly latestAnnouncementId = 'sep-13-2024';
	private promptManager: PromptManager;

	/**
	 * Creates a new WebviewManager instance
	 * @param provider The extension provider that owns this webview manager
	 */
	constructor(public readonly provider: ExtensionProvider) {
		this.promptManager = new PromptManager(this);
	}

	/**
	 * Initializes and configures a webview instance
	 * Sets up message listeners, HTML content, and visibility handlers
	 * @param webviewView The webview or webview panel to setup
	 */
	setupWebview(webviewView: vscode.WebviewView | vscode.WebviewPanel) {
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.provider.getContext().extensionUri],
		};
		webviewView.webview.html = this.getHtmlContent(webviewView.webview);
		// your extension context
		const ctx: ExtensionContext = {
			provider: this.provider,
			userId: 'someUser',
		};

		// attach the server
		new ExtensionServer(webviewView.webview, ctx);
		this.setWebviewMessageListener(webviewView.webview);

		if ('onDidChangeViewState' in webviewView) {
			webviewView.onDidChangeViewState(
				() => {
					if (webviewView.visible) {
						this.postMessageToWebview({
							type: 'action',
							action: 'didBecomeVisible',
						});
					}
				},
				null,
				this.provider['disposables']
			);
		} else if ('onDidChangeVisibility' in webviewView) {
			webviewView.onDidChangeVisibility(
				() => {
					if (webviewView.visible) {
						this.postMessageToWebview({
							type: 'action',
							action: 'didBecomeVisible',
						});
					}
				},
				null,
				this.provider['disposables']
			);
		}
	}

	/**
	 * Shows an input box to collect user input
	 * @param options Configuration options for the input box
	 * @returns Promise that resolves to the user's input or undefined if cancelled
	 */
	async showInputBox(
		options: vscode.InputBoxOptions
	): Promise<string | undefined> {
		return vscode.window.showInputBox(options);
	}

	/**
	 * Posts a message to the webview with debouncing to prevent too frequent updates
	 * while ensuring messages are not delayed too long
	 * @param message The message to send to the webview
	 */
	async postMessageToWebview(message: ExtensionMessage) {
		return await this.provider['view']?.webview.postMessage(message);
	}

	/**
	 * only post claude messages to webview
	 */
	async postClaudeMessagesToWebview(msgs?: ClaudeMessage[] | null) {
		const claudeMessages =
			this.provider.getMainAgent()?.getStateManager().state.claudeMessages ??
			[];
		const taskId = this.provider.getMainAgent()?.getStateManager().state.taskId;
		if (!taskId) {
			// reset
			return await this.postMessageToWebview({
				type: 'claudeMessages',
				claudeMessages: [],
				taskId: '',
			});
		}
		return await this.postMessageToWebview({
			type: 'claudeMessages',
			claudeMessages: msgs ?? claudeMessages,
			taskId,
		});
	}

	async postClaudeMessageToWebview(msg: ClaudeMessage) {
		const taskId = this.provider.getMainAgent()?.getStateManager().state.taskId;
		if (!taskId) {
			// reset
			return await this.postMessageToWebview({
				type: 'claudeMessage',
				claudeMessage: undefined,
				taskId: '',
			});
		}
		// return await this.postClaudeMessagesToWebview()
		return await this.postMessageToWebview({
			type: 'claudeMessage',
			claudeMessage: msg,
			taskId,
		});
	}

	async postBaseStateToWebview() {
		const state = await this.getBaseStateToPostToWebview();
		await this.postMessageToWebview({ type: 'state', state });
	}

	private async getBaseStateToPostToWebview() {
		const state = await this.provider.getStateManager().getState();
		const extensionName =
			this.provider.getContext().extension?.packageJSON?.name;
		const { claudeMessages, ...rest } = state;

		return {
			...rest,
			version: this.provider.getContext().extension?.packageJSON?.version ?? '',
			themeName: vscode.workspace
				.getConfiguration('workbench')
				.get<string>('colorTheme'),
			uriScheme: vscode.env.uriScheme,
			extensionName,
			taskHistory: (state.taskHistory || [])
				.filter((item) => item.ts && item.task)
				.sort((a, b) => b.ts - a.ts),
			shouldShowAnnouncement: false,
		} satisfies BaseExtensionState;
	}

	private getHtmlContent(webview: vscode.Webview): string {
		const localPort = '5173';
		const localServerUrl = `localhost:${localPort}`;
		let scriptUri;
		const isProd =
			this.provider.getContext().extensionMode ===
			vscode.ExtensionMode.Production;

		if (isProd) {
			scriptUri = getUri(webview, this.provider.getContext().extensionUri, [
				'webview-ui-vite',
				'build',
				'assets',
				'index.js',
			]);
		} else {
			scriptUri = `http://${localServerUrl}/src/index.tsx`;
		}

		const stylesUri = getUri(webview, this.provider.getContext().extensionUri, [
			'webview-ui-vite',
			'build',
			'assets',
			'index.css',
		]);

		// Updated codicons path and error handling
		const codiconsUri = webview.asWebviewUri(
			vscode.Uri.joinPath(
				this.provider.getContext().extensionUri,
				'dist',
				'codicons',
				'codicon.css'
			)
		);

		const nonce = getNonce();

		const csp = [
			`default-src 'none';`,
			`script-src 'unsafe-eval' https://* vscode-webview: ${
				isProd
					? `'nonce-${nonce}'`
					: `http://${localServerUrl} http://0.0.0.0:${localPort} 'unsafe-inline'`
			}`,
			`style-src ${webview.cspSource} 'self' 'unsafe-inline' https://* vscode-webview:`,
			`font-src ${webview.cspSource} vscode-webview:`,
			`img-src ${webview.cspSource} data: vscode-webview:`,
			`media-src ${webview.cspSource} vscode-webview:`,
			`connect-src https://* vscode-webview: ${
				isProd
					? ``
					: `ws://${localServerUrl} ws://0.0.0.0:${localPort} http://${localServerUrl} http://0.0.0.0:${localPort}`
			}`,
		];

		return /*html*/ `
			<!DOCTYPE html>
			<html lang="en">
			  <head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
				<meta name="theme-color" content="#000000">
				<meta http-equiv="Content-Security-Policy" content="${csp.join('; ')}">
				<link rel="stylesheet" type="text/css" href="${stylesUri}">
				<link href="${codiconsUri}" rel="stylesheet" />
				<title>Vlinder</title>
			  </head>
			  <body>
				<noscript>You need to enable JavaScript to run this app.</noscript>
				<div id="root"></div>
				${
					isProd
						? ''
						: `
					<script type="module">
					  import RefreshRuntime from "http://${localServerUrl}/@react-refresh"
					  RefreshRuntime.injectIntoGlobalHook(window)
					  window.$RefreshReg$ = () => {}
					  window.$RefreshSig$ = () => (type) => type
					  window.__vite_plugin_react_preamble_installed__ = true
					</script>
					`
				}
				<script type="module" src="${scriptUri}"></script>
			  </body>
			</html>
		`;
	}

	/**
	 * Recursively builds a tree structure of files and folders in a directory
	 * Excludes specified directories to keep the tree clean and relevant
	 * @param dir The directory path to scan
	 * @param parentId The ID of the parent node in the tree
	 * @returns Promise resolving to an array of FileTreeItems representing the directory structure
	 */
	async getFileTree(
		dir: string,
		parentId: string = ''
	): Promise<FileTreeItem[]> {
		const entries = await readdir(dir, { withFileTypes: true });
		const items: FileTreeItem[] = [];

		for (const entry of entries) {
			if (excludedDirectories.includes(entry.name)) {
				continue;
			}

			const id = parentId ? `${parentId}/${entry.name}` : entry.name;
			const fullPath = path.join(dir, entry.name);

			if (entry.isDirectory()) {
				const children = await this.getFileTree(fullPath, id);
				items.push({
					id,
					depth: parentId.split('-').length,
					name: entry.name,
					children,
					type: 'folder',
				});
			} else {
				items.push({
					id,
					depth: parentId.split('-').length,
					name: entry.name,
					type: 'file',
				});
			}
		}

		return items;
	}

	/**
	 * Sets up message handling for the webview
	 * Processes various message types from the webview and triggers appropriate actions
	 * @param webview The webview instance to attach the message listener to
	 */
	private setWebviewMessageListener(webview: vscode.Webview) {
		webview.onDidReceiveMessage(
			async (message: WebviewMessage) => {
				await this.promptManager.handleMessage(message);
				switch (message.type) {
					case 'terminalCompressionThreshold':
						await this.provider
							.getStateManager()
							.setTerminalCompressionThreshold(message.value);
						await this.postBaseStateToWebview();
						break;
					case 'skipWriteAnimation':
						await this.provider
							.getStateManager()
							.setSkipWriteAnimation(!!message.bool);
						await this.postBaseStateToWebview();
						break;
					case 'updateGlobalState':
						for (const [key, value] of Object.entries(message.state)) {
							await this.provider
								.getGlobalStateManager()
								.updateGlobalState(key as keyof typeof message.state, value);
						}
						break;
					case 'clearHistory':
						await this.provider.getStateManager().clearHistory();
						await this.provider.getTaskManager().clearAllTasks();
						await this.postBaseStateToWebview();
						break;
					case 'fileTree':
						const workspaceFolders = vscode.workspace.workspaceFolders;
						if (workspaceFolders && workspaceFolders.length > 0) {
							const rootPath = workspaceFolders[0].uri.fsPath;
							const fileTree = await this.getFileTree(rootPath);
							this.postMessageToWebview({
								type: 'fileTree',
								tree: fileTree,
							});
						}
						break;
					case 'renameTask':
						await this.provider.getTaskManager().renameTask(
							message.isCurentTask
								? {
										isCurentTask: true,
									}
								: {
										taskId: message.taskId!,
									}
						);
						break;
					case 'openExternalLink':
						vscode.env.openExternal(vscode.Uri.parse(message.url));
						break;

					case 'amplitude':
						AmplitudeWebviewManager.handleMessage(message);
						break;
					case 'cancelCurrentRequest':
						await this.provider.getMainAgent()?.taskExecutor.abortTask();
						break;
					case 'cancelLightning':
						// Abort only the Lightning, do not affect main task
						abortLightning();
						break;
					case 'autoSummarize':
						await this.provider
							.getStateManager()
							.setAutoSummarize(message.bool);
						if (this.provider.MainAgent) {
							this.provider.MainAgent.getStateManager().setAutoSummarize(
								message.bool
							);
						}
						await this.postBaseStateToWebview();
						break;
					case 'soundEnabled':
						await GlobalStateManager.getInstance().updateGlobalState(
							'soundEnabled',
							message.bool
						);
						await this.postBaseStateToWebview();
						break;
					case 'alertsEnabled':
						await GlobalStateManager.getInstance().updateGlobalState(
							'alertsEnabled',
							message.bool
						);
						await this.postBaseStateToWebview();
						break;
					case 'timerSoundEnabled':
						await GlobalStateManager.getInstance().updateGlobalState(
							'timerSoundEnabled',
							message.bool
						);
						await this.postBaseStateToWebview();
						break;
					case 'stopTimer':
						// Stop the timer using the timestamp
						const { stopTimerByTimestamp } = await import(
							'../../agent/v1/tools/runners/timer.tool'
						);
						const timerId = message.timerId;
						const timerTs = parseInt(timerId, 10);

						if (!isNaN(timerTs)) {
							const stopped = stopTimerByTimestamp(timerTs);
							if (stopped) {
								console.log(`Timer ${timerId} stopped by user`);
							} else {
								console.log(`Timer ${timerId} not found or already completed`);
							}
						}
						await this.postBaseStateToWebview();
						break;

					case 'getSoundUris':
						// Send sound file URIs to webview
						const webview = this.provider['view']?.webview;
						if (webview) {
							const soundUris = {
								pop: webview.asWebviewUri(
									vscode.Uri.joinPath(
										this.provider.getContext().extensionUri,
										'assets',
										'tone',
										'pop.mp3'
									)
								).toString(),
								ding: webview.asWebviewUri(
									vscode.Uri.joinPath(
										this.provider.getContext().extensionUri,
										'assets',
										'tone',
										'ding.mp3'
									)
								).toString(),
								click: webview.asWebviewUri(
									vscode.Uri.joinPath(
										this.provider.getContext().extensionUri,
										'assets',
										'tone',
										'mouse-click.mp3'
									)
								).toString(),
								clockTicking: webview.asWebviewUri(
									vscode.Uri.joinPath(
										this.provider.getContext().extensionUri,
										'assets',
										'tone',
										'Clock-Ticking.mp3'
									)
								).toString(),
							};
							await this.postMessageToWebview({
								type: 'soundUris',
								uris: soundUris,
							});
						}
						break;
					case 'getWorkspaceInfo':
						// Send workspace folder information to webview
						await this.handleGetWorkspaceInfo();
						break;
					case 'selectWorkspaceFolder':
						// Handle workspace folder selection
						if (typeof message.folderIndex === 'number') {
							await this.handleSelectWorkspaceFolder(message.folderIndex);
						}
						break;
					case 'getOpenFiles':
						// Send open files information to webview
						await this.handleGetOpenFiles();
						break;
					case 'closeFile':
						// Close a file tab
						if (message.fileUri) {
							await this.handleCloseFile(message.fileUri);
						}
						break;
					case 'togglePinFile':
						// Toggle pin state of a file tab
						if (message.fileUri) {
							await this.handleTogglePinFile(message.fileUri);
						}
						break;
					case 'openFile':
						// Open/focus a file
						if (message.fileUri) {
							await this.handleOpenFile(message.fileUri);
						}
						break;
					case 'webviewDidLaunch':
						await this.postBaseStateToWebview();
						// Also send disabled tools list to main webview
						const disabledTools =
							GlobalStateManager.getInstance().getGlobalState(
								'disabledTools'
							) ?? [];
						await this.postMessageToWebview({
							type: 'disabledTools',
							tools: disabledTools,
						});
						break;
					case 'newTask':
						await this.provider
							.getTaskManager()
							.handleNewTask(
								message.text,
								message.images,
								message.attachements
							);
						break;
					// case ""

					case 'autoCloseTerminal':
						await this.provider
							.getStateManager()
							.setAutoCloseTerminal(message.bool);
						await this.postBaseStateToWebview();
						break;
					case 'customInstructions':
						await this.provider
							.getStateManager()
							.setCustomInstructions(message.text || undefined);
						await this.postBaseStateToWebview();
						break;
					case 'alwaysAllowReadOnly':
						await this.provider
							.getStateManager()
							.setAlwaysAllowReadOnly(message.bool ?? false);
						await this.postBaseStateToWebview();
						break;
					case 'alwaysAllowWriteOnly':
						await this.provider
							.getStateManager()
							.setAlwaysAllowWriteOnly(message.bool ?? false);
						await this.postBaseStateToWebview();
						break;
					case 'askResponse':
						await this.provider
							.getTaskManager()
							.handleAskResponse(
								message.askResponse!,
								message.text,
								message.images,
								message.attachements
							);
						break;
					case 'toggleGitHandler':
						this.provider.MainAgent?.getStateManager().setGitHandlerEnabled(
							message.enabled
						);
						await this.provider
							.getStateManager()
							.setGitHandlerEnabled(message.enabled);
						await this.postBaseStateToWebview();
						break;
					case 'clearTask':
						await this.provider.getTaskManager().clearTask();
						await this.postBaseStateToWebview();
						await this.postClaudeMessagesToWebview(undefined);
						break;
					case 'setApiKeyDialog':
						// API key dialog disabled - using unlimited access
						console.log('API key dialog disabled - using unlimited access');
						break;

					case 'pauseNext':
						await this.provider.getMainAgent()?.taskExecutor.pauseNextRequest();
						break;
					case 'didCloseAnnouncement':
						const packageJSON =
							this.provider.getContext().extension?.packageJSON;
						await this.provider
							.getGlobalStateManager()
							.updateGlobalState(
								'lastShownAnnouncementId',
								packageJSON?.version
							);
						await this.postBaseStateToWebview();
						break;
					case 'selectImages':
						const images = await this.provider.getTaskManager().selectImages();
						await this.postMessageToWebview({
							type: 'selectedImages',
							images: images.map((img) => img),
						});
						break;
					case 'openKnowledgeBase':
						try {
							const workspaceRoot =
								vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
							if (!workspaceRoot) {
								vscode.window.showErrorMessage('No workspace folder found');
								break;
							}

							// Create knowledge base directory if it doesn't exist
							const knowledgeBasePath = path.join(
								workspaceRoot,
								'.Scholar',
								'Skills'
							);

							try {
								await fs.access(knowledgeBasePath);
							} catch {
								// Directory doesn't exist, create it
								await fs.mkdir(knowledgeBasePath, { recursive: true });
							}

							// Open the knowledge base directory in VS Code explorer
							const knowledgeBaseUri = vscode.Uri.file(knowledgeBasePath);
							await vscode.commands.executeCommand(
								'revealInExplorer',
								knowledgeBaseUri
							);

							vscode.window.showInformationMessage(
								`Scholar Knowledge Base opened: ${knowledgeBasePath}`
							);
						} catch (error) {
							console.error('Error opening knowledge base:', error);
							vscode.window.showErrorMessage(
								'Failed to open Scholar Knowledge Base'
							);
						}
						break;

					case 'exportCurrentTask':
						await this.provider.getTaskManager().exportCurrentTask();
						break;
					case 'showTaskWithId':
						await this.provider.getTaskManager().showTaskWithId(message.text!);
						break;
					case 'deleteTaskWithId':
						await this.provider
							.getTaskManager()
							.deleteTaskWithId(message.text!);
						break;
					case 'exportTaskWithId':
						await this.provider
							.getTaskManager()
							.exportTaskWithId(message.text!);
						break;
					case 'togglePinTask':
						await this.provider
							.getTaskManager()
							.togglePinTask(message.text!);
						break;
					case 'commandTimeout':
						await GlobalStateManager.getInstance().updateGlobalState(
							'commandTimeout',
							message.commandTimeout
						);
						await this.postBaseStateToWebview();
						break;
					case 'setInlineEditMode':
						await this.provider
							.getStateManager()
							.setInlineEditModeType(message.inlineEditOutputType ?? 'full');
						await this.postBaseStateToWebview();
						break;
					case 'viewFile':
						// await this.provider.getMainAgent()?.viewFileInDiff(message.path, message.version)
						break;
					// case "rollbackToCheckpoint":
					// 	await this.provider
					// 		.getMainAgent()
					// 		?.rollbackToCheckpoint(message.path, message.version, message.ts)
					// 	break
					case 'resetState':
						await this.provider.getGlobalStateManager().resetState();
						await this.provider.getSecretStateManager().resetState();
						await this.postBaseStateToWebview();
						break;

					case 'debug':
						await this.handleDebugInstruction();
						break;
					case 'saveFile':
						await this.handleSaveFile(message);
						break;
					case 'compressContext':
						await this.handleCompressContext(message);
						break;
					case 'showContextCompressionDetails':
						await this.handleShowContextCompressionDetails();
						break;
				}
			},
			null,
			this.provider['disposables']
		);
	}

	private async handleSaveFile(message: any): Promise<void> {
		try {
			const { filename, content, format } = message;

			// Set file filters based on format
			let filters: { [name: string]: string[] } = {};
			let defaultUri = vscode.Uri.file(filename);

			switch (format) {
				case 'json':
					filters = {
						'JSON Files': ['json'],
						'All Files': ['*'],
					};
					break;
				case 'md':
					filters = {
						'Markdown Files': ['md'],
						'All Files': ['*'],
					};
					break;
				case 'svg':
					filters = {
						'SVG Files': ['svg'],
						'All Files': ['*'],
					};
					break;
				default:
					filters = {
						'All Files': ['*'],
					};
			}

			// Let user choose save location
			const saveUri = await vscode.window.showSaveDialog({
				defaultUri,
				filters,
			});

			if (saveUri) {
				await vscode.workspace.fs.writeFile(
					saveUri,
					Buffer.from(content, 'utf8')
				);
				vscode.window.showInformationMessage(`File saved: ${saveUri.fsPath}`);
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to save file: ${error}`);
		}
	}

	private async handleDebugInstruction(): Promise<void> {
		let agent = this.provider.getMainAgent();
		let noTask = false;
		const openFolders = vscode.workspace.workspaceFolders;
		if (!openFolders) {
			vscode.window.showErrorMessage(
				'No open workspaces, please open a workspace.'
			);
			return;
		}

		if (openFolders.length > 1) {
			vscode.window.showErrorMessage(
				'Multiple workspaces detected! Please open only one workspace.'
			);
			return;
		}

		if (!agent) {
			// create a new task
			await this.provider.initWithNoTask();
			agent = this.provider.getMainAgent()!;
			noTask = true;
		}
		vscode.window.showInformationMessage(
			'Debugging open tabs in workspace. if you want to debug a specific tab, please open it.'
		);
		// now get diagnostics for all the open tabs
		const openTabs = vscode.window.visibleTextEditors;
		for (const tab of openTabs) {
			agent.getStateManager().addErrorPath(tab.document.uri.fsPath);
		}

		const problemsString = 'Check system logs for more information.';
		if (noTask) {
			const task = `I am working on debugging issues related to the open tabs in my workspace. I've attached the diagnostics for the open tabs. Please provide a step-by-step approach to analyze and resolve any potential issues or inefficiencies based on the provided information. Focus on clarity and actionable steps, and suggest best practices where applicable.`;

			await agent.startTask(task);
			return;
		}
		// flag this is legacy it should actually be handled by the task executor
		return await agent.handleWebviewAskResponse(
			'messageResponse',
			problemsString
		);
	}

	/**
	 * Handles context compression requests from the webview
	 */
	private async handleCompressContext(message: any): Promise<void> {
		try {
			const { messages, currentTask } = message;

			// Check if auto summarize is enabled
			const state = await this.provider.getStateManager().getState();
			if (!state.autoSummarize) {
				console.log('AutoSummarize is disabled');
				await this.postMessageToWebview({
					type: 'contextCompressionError',
					error: 'AutoSummarize is disabled in settings',
				});
				return;
			}

			console.log('Starting context compression...');

			// Use the existing compression utilities
			const { truncateHalfConversation } = await import(
				'../../utils/context-managment/index'
			);

			// Convert messages to the format expected by the compression function
			const anthropicMessages = messages.map((msg: any) => ({
				role: msg.role || 'user',
				content: msg.content || msg.text || '',
			}));

			// Perform the compression
			const compressedMessages = truncateHalfConversation(anthropicMessages);

			// Create a simple summary including task info if available
			const taskInfo = currentTask
				? ` for task: ${currentTask.title || currentTask.id}`
				: '';
			const summary = `Context compressed: Reduced from ${messages.length} to ${compressedMessages.length} messages while preserving recent conversation flow${taskInfo}.`;

			const result = {
				messages: compressedMessages,
				summary,
			};

			// Send the result back to the webview
			await this.postMessageToWebview({
				type: 'contextCompressionComplete',
				result,
			});

			console.log('Context compression completed successfully');
		} catch (error) {
			console.error('Failed to compress context:', error);
			await this.postMessageToWebview({
				type: 'contextCompressionError',
				error: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	/**
	 * Handles requests to show context compression details
	 */
	private async handleShowContextCompressionDetails(): Promise<void> {
		try {
			// This could show a dialog or panel with compression details
			vscode.window.showInformationMessage(
				'Context compression helps optimize memory usage by intelligently summarizing conversation history while preserving important information.'
			);
		} catch (error) {
			console.error('Failed to show context compression details:', error);
		}
	}

	/**
	 * Handles workspace info request from webview
	 */
	private async handleGetWorkspaceInfo(): Promise<void> {
		try {
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders || workspaceFolders.length === 0) {
				await this.postMessageToWebview({
					type: 'workspaceInfo',
					folders: [],
					activeFolder: null,
				});
				return;
			}

			const folders = workspaceFolders.map((folder, index) => ({
				name: folder.name,
				uri: folder.uri.toString(),
				index,
			}));

			// For now, we'll consider the first folder as active
			// In a multi-root workspace, you might want to track this differently
			const activeFolder = folders[0];

			await this.postMessageToWebview({
				type: 'workspaceInfo',
				folders,
				activeFolder,
			});
		} catch (error) {
			console.error('Failed to get workspace info:', error);
		}
	}

	/**
	 * Handles workspace folder selection
	 */
	private async handleSelectWorkspaceFolder(folderIndex: number): Promise<void> {
		try {
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders || folderIndex >= workspaceFolders.length) {
				return;
			}

			// In VSCode, you can't really "switch" the active workspace folder
			// But you can open a new window with that folder
			// For now, we'll just send back the workspace info
			await this.handleGetWorkspaceInfo();
		} catch (error) {
			console.error('Failed to select workspace folder:', error);
		}
	}

	/**
	 * Handles open files info request from webview
	 */
	private async handleGetOpenFiles(): Promise<void> {
		try {
			const tabs = vscode.window.tabGroups.all
				.flatMap(group => group.tabs)
				.filter(tab => tab.input instanceof vscode.TabInputText);

			const files = tabs.map(tab => {
				const input = tab.input as vscode.TabInputText;
				return {
					uri: input.uri.toString(),
					fileName: input.uri.path.split('/').pop() || '',
					filePath: input.uri.fsPath,
					isPinned: tab.isPinned,
					isDirty: tab.isDirty,
					isActive: tab.isActive,
				};
			});

			await this.postMessageToWebview({
				type: 'openFilesInfo',
				files,
			});
		} catch (error) {
			console.error('Failed to get open files:', error);
		}
	}

	/**
	 * Handles file close request
	 */
	private async handleCloseFile(fileUri: string): Promise<void> {
		try {
			const tabs = vscode.window.tabGroups.all
				.flatMap(group => group.tabs)
				.filter(tab => {
					if (tab.input instanceof vscode.TabInputText) {
						return tab.input.uri.toString() === fileUri;
					}
					return false;
				});

			for (const tab of tabs) {
				await vscode.window.tabGroups.close(tab);
			}

			// Send updated file list
			await this.handleGetOpenFiles();
		} catch (error) {
			console.error('Failed to close file:', error);
		}
	}

	/**
	 * Handles toggle pin file request
	 */
	private async handleTogglePinFile(fileUri: string): Promise<void> {
		try {
			const tabs = vscode.window.tabGroups.all
				.flatMap(group => group.tabs)
				.filter(tab => {
					if (tab.input instanceof vscode.TabInputText) {
						return tab.input.uri.toString() === fileUri;
					}
					return false;
				});

			for (const tab of tabs) {
				// Toggle pin state
				if (tab.isPinned) {
					await vscode.commands.executeCommand('workbench.action.unpinEditor');
				} else {
					await vscode.commands.executeCommand('workbench.action.pinEditor');
				}
			}

			// Send updated file list
			await this.handleGetOpenFiles();
		} catch (error) {
			console.error('Failed to toggle pin file:', error);
		}
	}

	/**
	 * Handles open file request
	 */
	private async handleOpenFile(fileUri: string): Promise<void> {
		try {
			const uri = vscode.Uri.parse(fileUri);
			await vscode.window.showTextDocument(uri, { preview: false });

			// Send updated file list
			await this.handleGetOpenFiles();
		} catch (error) {
			console.error('Failed to open file:', error);
		}
	}

	/**
	 * Cleanup method to be called when the webview manager is disposed
	 */
	dispose() {}
}
