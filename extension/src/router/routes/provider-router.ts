import { z } from "zod"
import { procedure } from "../utils"
import { router } from "../utils/router"
import { models, providerConfigs } from "../../api/providers/config"
import { GlobalState, GlobalStateManager } from "../../providers/state/global-state-manager"
import { SecretStateManager } from "../../providers/state/secret-state-manager"
import { ProviderId } from "../../api/providers/constants"
import { ApiConstructorOptions, ProviderSettings, providerSettingsSchema } from "../../api"

export async function getCurrentModelInfo(apiConfig?: GlobalState["apiConfig"]) {
	if (!apiConfig) {
		apiConfig = GlobalStateManager.getInstance().getGlobalState("apiConfig")
	}
	
	const providerId = apiConfig?.providerId ?? "anthropic"
	const modelId = apiConfig?.modelId
	
	const providerConfig = providerConfigs[providerId]
	if (!providerConfig) {
		throw new Error(`Provider not found: ${providerId}`)
	}
	
	const model = providerConfig.models.find((m: any) => m.id === modelId)
	if (!model) {
		throw new Error(`Model not found: ${modelId}`)
	}
	
	return { 
		model,
		providerData: {
			providerId,
			models: providerConfig.models,
			currentProvider: null
		}
	}
}

export async function getCurrentApiSettings(): Promise<ApiConstructorOptions | null> {
	const globalState = GlobalStateManager.getInstance()
	const secretState = SecretStateManager.getInstance()
	const apiConfig = globalState.getGlobalState("apiConfig")

	if (!apiConfig?.providerId || !apiConfig?.modelId) {
		return null
	}

	const providerConfig = providerConfigs[apiConfig.providerId]
	if (!providerConfig) {
		throw new Error(`Provider not found: ${apiConfig.providerId}`)
	}

	const model = providerConfig.models.find((m: any) => m.id === apiConfig.modelId)
	if (!model) {
		throw new Error(`Model not found: ${apiConfig.modelId}`)
	}

	// Get saved provider settings from secure storage (VS Code secrets)
	const savedProviderSettings = await secretState.getProviderSettings()
	const matchingProviderSettings = savedProviderSettings.find((p: ProviderSettings) => p.providerId === apiConfig.providerId)

	// Create provider settings object, merging apiConfig with saved provider settings
	const providerSettings = {
		providerId: apiConfig.providerId,
		...(apiConfig as any), // Include basic API configuration
		...(matchingProviderSettings || {}), // Include saved provider settings (API keys, etc.)
	}

	return {
		providerSettings,
		models: providerConfig.models,
		model,
	}
}

export async function getProvider(providerId: ProviderId) {
	const providerConfig = providerConfigs[providerId]
	if (!providerConfig) {
		throw new Error(`Provider not found: ${providerId}`)
	}
	return providerConfig
}

const providerRouter = router({
	getGlobalState: procedure.input(z.object({ key: z.string() })).resolve(async (ctx, input) => {
		return GlobalStateManager.getInstance().getGlobalState(input.key as keyof GlobalState)
	}),

	updateGlobalState: procedure.input(z.object({ key: z.string(), value: z.any() })).resolve(async (ctx, input) => {
		await GlobalStateManager.getInstance().updateGlobalState(input.key as keyof GlobalState, input.value)
		return { success: true }
	}),

	listModels: procedure.input(z.object({})).resolve(async (ctx, input) => {
		return {
			models: [...models],
		}
	}),

	currentObserverModel: procedure.input(z.object({})).resolve(async (ctx, input) => {
		const observerModel = GlobalStateManager.getInstance().getGlobalState("observerSettings")
		if (!observerModel) {
			throw new Error("No observer model configured")
		}
		return await getCurrentModelInfo({
			providerId: observerModel.providerId,
			modelId: observerModel.modelId,
		})
	}),

	selectObserverModel: procedure
		.input(z.object({ providerId: z.string(), modelId: z.string() }))
		.resolve(async (ctx, input) => {
			await GlobalStateManager.getInstance().updatePartialGlobalState("observerSettings", {
				providerId: input.providerId as ProviderId,
				modelId: input.modelId,
			})
			return { success: true }
		}),

	currentModelInfo: procedure.input(z.object({})).resolve(async (ctx, input) => {
		return await getCurrentModelInfo()
	}),

	selectModel: procedure
		.input(z.object({ providerId: z.string(), modelId: z.string() }))
		.resolve(async (ctx, input) => {
			const providerConfig = providerConfigs[input.providerId]
			if (!providerConfig) {
				throw new Error(`Invalid provider: ${input.providerId}`)
			}
			let modelExists = false
			modelExists = providerConfig.models.some((m) => m.id === input.modelId)
			if (!modelExists) {
				throw new Error(`Invalid model for provider ${input.providerId}: ${input.modelId}`)
			}
			let thinkingConfig: GlobalState["thinking"] | undefined
			if (input.modelId.includes("claude-3-7-sonnet")) {
				thinkingConfig = { type: "enabled", budget_tokens: 32_000 }
				await GlobalStateManager.getInstance().updateGlobalState("thinking", thinkingConfig)
			}

			await GlobalStateManager.getInstance().updateGlobalState("apiConfig", {
				providerId: input.providerId as ProviderId,
				modelId: input.modelId,
			})

			return { success: true }
		}),

	listProviders: procedure.input(z.object({})).resolve(async (ctx, input) => {
		const secretState = SecretStateManager.getInstance()
		const providerSettings = await secretState.getProviderSettings()
		return {
			providers: providerSettings
		}
	}),

	createProvider: procedure
		.input(providerSettingsSchema)
		.resolve(async (ctx, input) => {
			const secretState = SecretStateManager.getInstance()

			// Use the upsertProviderSetting method which handles both create and update
			await secretState.upsertProviderSetting(input as ProviderSettings)
			return { success: true }
		}),

	updateProvider: procedure
		.input(providerSettingsSchema)
		.resolve(async (ctx, input) => {
			const secretState = SecretStateManager.getInstance()

			// Use the upsertProviderSetting method which handles both create and update
			await secretState.upsertProviderSetting(input as ProviderSettings)
			return { success: true }
		}),

	deleteProvider: procedure
		.input(z.object({
			id: z.string(),
		}))
		.resolve(async (ctx, input) => {
			const secretState = SecretStateManager.getInstance()

			// Remove provider by providerId
			await secretState.removeProviderSetting(input.id)
			return { success: true }
		}),

	currentScholarModel: procedure.input(z.object({})).resolve(async (ctx, input) => {
		const scholarModel = GlobalStateManager.getInstance().getGlobalState("scholarSettings")
		if (!scholarModel) {
			throw new Error("No scholar model configured")
		}
		return await getCurrentModelInfo({
			providerId: scholarModel.providerId,
			modelId: scholarModel.modelId,
		})
	}),

	selectScholarModel: procedure
		.input(z.object({ providerId: z.string(), modelId: z.string() }))
		.resolve(async (ctx, input) => {
			await GlobalStateManager.getInstance().updatePartialGlobalState("scholarSettings", {
				providerId: input.providerId as ProviderId,
				modelId: input.modelId,
			})
			return { success: true }
		}),

})

export default providerRouter
