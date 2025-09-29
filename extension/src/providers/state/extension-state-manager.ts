import { GlobalStateManager } from "./global-state-manager"
import { HistoryItem, isSatifiesHistoryItem } from "../../shared/history-item"
import { SecretStateManager } from "./secret-state-manager"
import { ExtensionProvider } from "../extension-provider"
import { ExtensionState, isV1ClaudeMessage, V1ClaudeMessage } from "../../shared/messages/extension-message"

/**
 * this at the current form can't be a singleton because it has dependicies on the MainAgent instance, and one extension can have multiple MainAgent instances
 */
export class ExtensionStateManager {
	private globalStateManager: GlobalStateManager
	private secretStateManager: SecretStateManager

	constructor(private context: ExtensionProvider) {
		this.globalStateManager = GlobalStateManager.getInstance(context.context)
		this.secretStateManager = SecretStateManager.getInstance(context.context)
	}

	async getState() {
		const [
			user,
			lastShownAnnouncementId,
			customInstructions,
			alwaysAllowReadOnly,
			alwaysAllowWriteOnly,
			taskHistory,
			autoCloseTerminal,
			skipWriteAnimation,
			autoSummarize,
			terminalCompressionThreshold,
			commandTimeout,
			gitHandlerEnabled,
			inlineEditOutputType,
			observerSettings,
			apiConfig,
			VlinderApiKey,
			gitCommitterType,
		] = await Promise.all([
			this.globalStateManager.getGlobalState("user"),
			this.globalStateManager.getGlobalState("lastShownAnnouncementId"),
			this.globalStateManager.getGlobalState("customInstructions"),
			this.globalStateManager.getGlobalState("alwaysAllowReadOnly"),
			this.globalStateManager.getGlobalState("alwaysAllowWriteOnly"),
			this.globalStateManager.getGlobalState("taskHistory"),
			this.globalStateManager.getGlobalState("autoCloseTerminal"),
			this.globalStateManager.getGlobalState("skipWriteAnimation"),
			this.globalStateManager.getGlobalState("autoSummarize"),
			this.globalStateManager.getGlobalState("terminalCompressionThreshold"),
			this.globalStateManager.getGlobalState("commandTimeout"),
			this.globalStateManager.getGlobalState("gitHandlerEnabled"),
			this.globalStateManager.getGlobalState("inlineEditOutputType"),
			this.globalStateManager.getGlobalState("observerSettings"),
			this.globalStateManager.getGlobalState("apiConfig"),
			this.secretStateManager.getSecretState("VlinderApiKey"),
			this.globalStateManager.getGlobalState("gitCommitterType"),
		])

		const currentTaskId = this.context.getMainAgent()?.getStateManager()?.state.taskId
		const currentClaudeMessage = this.context.getMainAgent()?.getStateManager()?.state.claudeMessages

		const clone = [...(currentClaudeMessage ?? [])]?.reverse()
		const lastClaudeApiFinished = clone?.find(
			(m) =>
				isV1ClaudeMessage(m) &&
				m.type === "say" &&
				m.say === "api_req_started" &&
				!m.errorText &&
				m.isDone &&
				!m.isError &&
				(m.apiMetrics?.outputTokens ||
					m.apiMetrics?.inputTokens ||
					m.apiMetrics?.inputCacheRead ||
					m.apiMetrics?.inputCacheWrite)
		) as V1ClaudeMessage | undefined
		const tokens =
			(lastClaudeApiFinished?.apiMetrics?.inputTokens ?? 0) +
			(lastClaudeApiFinished?.apiMetrics?.outputTokens ?? 0) +
			(lastClaudeApiFinished?.apiMetrics?.inputCacheRead ?? 0) +
			(lastClaudeApiFinished?.apiMetrics?.inputCacheWrite ?? 0)
		const currentContextWindow = this.context
			.getMainAgent()
			?.getStateManager()
			?.apiManager.getModelInfo()?.contextWindow
		if (apiConfig) {
			apiConfig.apiKey = VlinderApiKey
		}

		return {
			user,
			terminalCompressionThreshold,
			lastShownAnnouncementId,
			customInstructions,
			commandTimeout: commandTimeout ?? 120,
			currentTaskId,
			alwaysAllowReadOnly:
				alwaysAllowReadOnly === undefined || alwaysAllowReadOnly === null ? true : alwaysAllowReadOnly,
			shouldShowAnnouncement: lastShownAnnouncementId === undefined,
			claudeMessages: currentClaudeMessage ?? [],
			version: this.context.context.extension.packageJSON.version,
			alwaysAllowWriteOnly: alwaysAllowWriteOnly ?? false,
			taskHistory: taskHistory ?? [],

			autoCloseTerminal: autoCloseTerminal ?? false,
			skipWriteAnimation: skipWriteAnimation ?? false,
			currentContextWindow: currentContextWindow ?? 0,
			currentContextTokens: tokens ?? 0,
			autoSummarize: autoSummarize ?? false,
			inlineEditOutputType: inlineEditOutputType ?? "full",
			gitHandlerEnabled: gitHandlerEnabled ?? true,
			observerSettings,
			apiConfig,
			gitCommitterType,
		} satisfies ExtensionState
	}

	async clearHistory() {
		await this.globalStateManager.updateGlobalState("taskHistory", [])
	}

	async setAutoCloseTerminal(value: boolean) {
		this.context.getMainAgent()?.getStateManager()?.setAutoCloseTerminal(value)
		return this.globalStateManager.updateGlobalState("autoCloseTerminal", value)
	}

	async setTerminalCompressionThreshold(value: number | undefined) {
		this.context.getMainAgent()?.getStateManager()?.setTerminalCompressionThreshold(value)
		return this.globalStateManager.updateGlobalState("terminalCompressionThreshold", value)
	}

	async setInlineEditModeType(value: "full" | "diff") {
		this.context.getMainAgent()?.getStateManager()?.setInlineEditOutputType(value)
		return this.globalStateManager.updateGlobalState("inlineEditOutputType", value)
	}

	async updateTaskHistory(
		item: Partial<HistoryItem> & { id: string },
		metadata?: {
			lastMessageAt?: number
		}
	): Promise<HistoryItem[]> {
		const history = (await this.globalStateManager.getGlobalState("taskHistory")) ?? []
		const existingItemIndex = history.findIndex((h) => h.id === item.id)

		// Include timing information from metadata
		const itemWithTiming = {
			...item,
			...(metadata?.lastMessageAt && { lastMessageAt: metadata.lastMessageAt }),
		}

		if (existingItemIndex !== -1) {
			history[existingItemIndex] = {
				...history[existingItemIndex],
				...itemWithTiming,
			}
		} else {
			if (isSatifiesHistoryItem(itemWithTiming)) {
				history.push(itemWithTiming)
			}
		}
		await this.globalStateManager.updateGlobalState("taskHistory", history)
		await this.context.getWebviewManager().postBaseStateToWebview()
		return history
	}

	async clearTaskHistory() {
		await this.globalStateManager.updateGlobalState("taskHistory", [])
	}

	async setSkipWriteAnimation(value: boolean) {
		this.context.getMainAgent()?.getStateManager()?.setSkipWriteAnimation(value)
		return this.globalStateManager.updateGlobalState("skipWriteAnimation", value)
	}

	setCustomInstructions(value: string | undefined) {
		this.context.getMainAgent()?.getStateManager()?.setCustomInstructions(value)
		return this.globalStateManager.updateGlobalState("customInstructions", value)
	}

	setAutoSummarize(value: boolean) {
		this.context.getMainAgent()?.getStateManager()?.setAutoSummarize(value)
		return this.globalStateManager.updateGlobalState("autoSummarize", value)
	}

	setGitHandlerEnabled(value: boolean) {
		this.context.getMainAgent()?.getStateManager()?.setGitHandlerEnabled(value)
		return this.globalStateManager.updateGlobalState("gitHandlerEnabled", value)
	}

	setAlwaysAllowReadOnly(value: boolean) {
		this.context.getMainAgent()?.getStateManager()?.setAlwaysAllowReadOnly(value)
		return this.globalStateManager.updateGlobalState("alwaysAllowReadOnly", value)
	}

	setAlwaysAllowWriteOnly(value: boolean) {
		this.context.getMainAgent()?.getStateManager()?.setAlwaysAllowWriteOnly(value)
		return this.globalStateManager.updateGlobalState("alwaysAllowWriteOnly", value)
	}
}
