import * as vscode from "vscode"
import { ProviderSettings } from "../../api"

const secretKeys = ["VlinderApiKey", "providerSettings"] as const

type SecretState = {
	VlinderApiKey: string
	fp: string
	providerSettings?: string // JSON string of ProviderSettings[]
}

export class SecretStateManager {
	private static instance: SecretStateManager | null = null
	private context: vscode.ExtensionContext

	private constructor(context: vscode.ExtensionContext) {
		this.context = context
	}

	public static getInstance(context?: vscode.ExtensionContext): SecretStateManager {
		if (!SecretStateManager.instance) {
			if (!context) {
				throw new Error("Context must be provided when creating the SecretStateManager instance")
			}
			SecretStateManager.instance = new SecretStateManager(context)
		}
		return SecretStateManager.instance
	}

	async updateSecretState<K extends keyof SecretState>(key: K, value: SecretState[K]): Promise<void> {
		await this.context.secrets.store(key, value!)
	}

	async deleteSecretState<K extends keyof SecretState>(key: K): Promise<void> {
		await this.context.secrets.delete(key)
	}

	getSecretState<K extends keyof SecretState>(key: K): Promise<SecretState[K]> {
		return this.context.secrets.get(key) as Promise<SecretState[K]>
	}

	async resetState(): Promise<void> {
		for (const key of secretKeys) {
			await this.context.secrets.delete(key)
		}
	}

	// Helper methods for provider settings
	async getProviderSettings(): Promise<ProviderSettings[]> {
		const settingsJson = await this.getSecretState("providerSettings")
		if (!settingsJson) {
			return []
		}
		try {
			return JSON.parse(settingsJson)
		} catch (error) {
			console.error("Failed to parse provider settings:", error)
			return []
		}
	}

	async setProviderSettings(settings: ProviderSettings[]): Promise<void> {
		const settingsJson = JSON.stringify(settings)
		await this.updateSecretState("providerSettings", settingsJson)
	}

	async upsertProviderSetting(setting: ProviderSettings): Promise<void> {
		const currentSettings = await this.getProviderSettings()
		const existingIndex = currentSettings.findIndex(p => p.providerId === setting.providerId)

		if (existingIndex >= 0) {
			currentSettings[existingIndex] = setting
		} else {
			currentSettings.push(setting)
		}

		await this.setProviderSettings(currentSettings)
	}

	async removeProviderSetting(providerId: string): Promise<void> {
		const currentSettings = await this.getProviderSettings()
		const filteredSettings = currentSettings.filter(p => p.providerId !== providerId)
		await this.setProviderSettings(filteredSettings)
	}
}
