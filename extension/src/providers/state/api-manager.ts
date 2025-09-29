import * as vscode from "vscode"
import { ExtensionProvider } from "../extension-provider"
import { ApiConfiguration } from "../../api"
import { getCurrentModelInfo, getProvider } from "../../router/routes/provider-router"

export class ApiManager {
	private static instance: ApiManager | null = null
	private context: ExtensionProvider

	private constructor(context: ExtensionProvider) {
		this.context = context
	}

	public static getInstance(context?: ExtensionProvider): ApiManager {
		if (!ApiManager.instance) {
			if (!context) {
				throw new Error("ExtensionProvider context must be provided when creating the ApiManager instance")
			}
			ApiManager.instance = new ApiManager(context)
		}
		return ApiManager.instance
	}

	async getCurrentModelInfo() {
		return (await getCurrentModelInfo()).model
	}
}
