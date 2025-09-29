import * as vscode from "vscode"
import { ExtensionProvider } from "./providers/extension-provider"
import { amplitudeTracker } from "./utils/amplitude"
import * as path from "path"
import { extensionName } from "./shared/constants"
import "./utils/path-helpers"
import {
	DIFF_VIEW_URI_SCHEME,
	INLINE_DIFF_VIEW_URI_SCHEME,
	INLINE_MODIFIED_URI_SCHEME,
	MODIFIED_URI_SCHEME,
} from "./integrations/editor/decoration-controller"
import { PromptStateManager } from "./providers/state/prompt-state-manager"
import { BannerDropEditProvider } from "./integrations/MagicTools/magicr-banner"
import DB from "./db"

/*
Built using https://github.com/microsoft/vscode-webview-ui-toolkit

Inspired by
https://github.com/microsoft/vscode-webview-ui-toolkit-samples/tree/main/default/weather-webview
https://github.com/microsoft/vscode-webview-ui-toolkit-samples/tree/main/frameworks/hello-world-react-cra

*/

let outputChannel: vscode.OutputChannel

function handleFirstInstall(context: vscode.ExtensionContext) {
	const isFirstInstall = context.globalState.get("isFirstInstall", true)
	console.log(`Extension is first install (isFirstInstall=${isFirstInstall})`)
	if (isFirstInstall) {
		context.globalState.update("isFirstInstall", false)
		amplitudeTracker.extensionActivateSuccess(!!isFirstInstall)
	}
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log(`Current time of activation: ${new Date().toLocaleTimeString()}`)
	
	// DB.init(path.join(context.globalStorageUri.fsPath, "db", "Vlinder.db"), context)

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	//console.log('Congratulations, your extension "Vlinder" is now active!')
	outputChannel = vscode.window.createOutputChannel("Vlinder")
	const version = context.extension.packageJSON.version ?? "0.0.0"
	amplitudeTracker
		.initialize(context.globalState, false, vscode.env.sessionId, context.extension.id, version, undefined)
		.then(() => {
			handleFirstInstall(context)
		})
	outputChannel.appendLine("Vlinder extension activated")
	const sidebarProvider = new ExtensionProvider(context, outputChannel)
	context.subscriptions.push(outputChannel)
	console.log(`Vlinder extension activated`)

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ExtensionProvider.sideBarId, sidebarProvider, {
			webviewOptions: { retainContextWhenHidden: true },
		})
	)

	// Post initial state
	setTimeout(async () => {
		await sidebarProvider.getWebviewManager().postBaseStateToWebview()
	}, 100)

	// Authentication and payment related commands removed - using unlimited access

	context.subscriptions.push(
		vscode.commands.registerCommand(`${extensionName}.plusButtonTapped`, async () => {
			outputChannel.appendLine("Plus button tapped")
			await sidebarProvider?.getTaskManager().clearTask()
			await sidebarProvider?.getWebviewManager().postBaseStateToWebview()
			await sidebarProvider?.getWebviewManager().postClaudeMessagesToWebview([])
			await sidebarProvider
				?.getWebviewManager()
				.postMessageToWebview({ type: "action", action: "chatButtonTapped" })
		})
	)

	const openExtensionInNewTab = async () => {
		outputChannel.appendLine("Opening Vlinder in new tab")
		// (this example uses webviewProvider activation event which is necessary to deserialize cached webview, but since we use retainContextWhenHidden, we don't need to use that event)
		// https://github.com/microsoft/vscode-extension-samples/blob/main/webview-sample/src/extension.ts
		const tabProvider = new ExtensionProvider(context, outputChannel)
		//const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined
		const lastCol = Math.max(...vscode.window.visibleTextEditors.map((editor) => editor.viewColumn || 0))
		const targetCol = Math.max(lastCol + 1, 1)
		const panel = vscode.window.createWebviewPanel(ExtensionProvider.tabPanelId, "Vlinder", targetCol, {
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: [context.extensionUri],
		})
		// Check if there are any visible text editors, otherwise open a new group to the right
		const hasVisibleEditors = vscode.window.visibleTextEditors.length > 0
		if (!hasVisibleEditors) {
			await vscode.commands.executeCommand("workbench.action.newGroupRight")
		}
		// TODO: use better svg icon with light and dark variants (see https://stackoverflow.com/questions/58365687/vscode-extension-iconpath)
		panel.iconPath = vscode.Uri.joinPath(context.extensionUri, "assets/icon.png")
		tabProvider.resolveWebviewView(panel)
		console.log("Opened Vlinder in new tab")

		// Lock the editor group so clicking on files doesn't open over the panel
		new Promise((resolve) => setTimeout(resolve, 100)).then(() => {
			vscode.commands.executeCommand("workbench.action.lockEditorGroup")
		})
	}
	PromptStateManager.init(context)

	context.subscriptions.push(
		vscode.commands.registerCommand(`${extensionName}.popoutButtonTapped`, openExtensionInNewTab)
	)
	context.subscriptions.push(vscode.commands.registerCommand(`${extensionName}.openInNewTab`, openExtensionInNewTab))

	context.subscriptions.push(
		vscode.commands.registerCommand(`${extensionName}.settingsButtonTapped`, () => {
			//const message = "main.settingsButtonTapped!"
			//vscode.window.showInformationMessage(message)
			sidebarProvider
				?.getWebviewManager()
				?.postMessageToWebview({ type: "action", action: "settingsButtonTapped" })
		})
	)

	context.subscriptions.push(
		vscode.commands.registerCommand(`${extensionName}.historyButtonTapped`, () => {
			sidebarProvider
				?.getWebviewManager()
				?.postMessageToWebview({ type: "action", action: "historyButtonTapped" })
		})
	)

	// Register Banner Drop Edit Provider for drag and drop functionality
	const bannerDropProvider = new BannerDropEditProvider()
	context.subscriptions.push(
		vscode.languages.registerDocumentDropEditProvider(
			{ scheme: 'file' }, // Apply to all file schemes
			bannerDropProvider
		)
	)

	/*
	We use the text document content provider API to show a diff view for new files/edits by creating a virtual document for the new content.

	- This API allows you to create readonly documents in VSCode from arbitrary sources, and works by claiming an uri-scheme for which your provider then returns text contents. The scheme must be provided when registering a provider and cannot change afterwards.
	- Note how the provider doesn't create uris for virtual documents - its role is to provide contents given such an uri. In return, content providers are wired into the open document logic so that providers are always considered.
	https://code.visualstudio.com/api/extension-guides/virtual-documents
	*/
	const diffContentProvider = new (class implements vscode.TextDocumentContentProvider {
		provideTextDocumentContent(uri: vscode.Uri): string {
			return Buffer.from(uri.query, "base64").toString("utf-8")
		}
	})()

	const modifiedContentProvider = new (class implements vscode.TextDocumentContentProvider {
		private content = new Map<string, string>()

		provideTextDocumentContent(uri: vscode.Uri): string {
			return this.content.get(uri.toString()) || ""
		}

		// Method to update content
		updateContent(uri: vscode.Uri, content: string) {
			this.content.set(uri.toString(), content)
			this._onDidChange.fire(uri)
		}

		private _onDidChange = new vscode.EventEmitter<vscode.Uri>()
		onDidChange = this._onDidChange.event
	})()

	const inlineDiffContentProvider = new (class implements vscode.TextDocumentContentProvider {
		provideTextDocumentContent(uri: vscode.Uri): string {
			return Buffer.from(uri.query, "base64").toString("utf-8")
		}
	})()

	const inlineModifiedContentProvider = new (class implements vscode.TextDocumentContentProvider {
		private content = new Map<string, string>()

		provideTextDocumentContent(uri: vscode.Uri): string {
			return this.content.get(uri.toString()) || ""
		}

		// Method to update content
		updateContent(uri: vscode.Uri, content: string) {
			this.content.set(uri.toString(), content)
			this._onDidChange.fire(uri)
		}

		private _onDidChange = new vscode.EventEmitter<vscode.Uri>()
		onDidChange = this._onDidChange.event
	})()
	vscode.workspace.registerTextDocumentContentProvider(DIFF_VIEW_URI_SCHEME, diffContentProvider),
		vscode.workspace.registerTextDocumentContentProvider(MODIFIED_URI_SCHEME, modifiedContentProvider)
	vscode.workspace.registerTextDocumentContentProvider(INLINE_DIFF_VIEW_URI_SCHEME, inlineDiffContentProvider),
		vscode.workspace.registerTextDocumentContentProvider(INLINE_MODIFIED_URI_SCHEME, inlineModifiedContentProvider)
	
	// URI Handler removed - authentication disabled

	// Add a status bar button to open the plugin's main window
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = '$(extensions) Vlinder'; // Icon + Plugin Name
	statusBarItem.tooltip = 'Open Vlinder Main Window';
	statusBarItem.command = `${extensionName}.openInNewTab`;
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);
}

// This method is called when your extension is deactivated
export function deactivate() {
	DB.disconnect()
	outputChannel.appendLine("Vlinder extension deactivated")
}
