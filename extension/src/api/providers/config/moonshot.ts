// providers/moonshot.ts
import { ProviderConfig } from "../types"
import { DEFAULT_BASE_URLS, PROVIDER_IDS, PROVIDER_NAMES } from "../constants"

export const moonshotConfig: ProviderConfig = {
	id: PROVIDER_IDS.MOONSHOT,
	name: PROVIDER_NAMES[PROVIDER_IDS.MOONSHOT],
	baseUrl: DEFAULT_BASE_URLS[PROVIDER_IDS.MOONSHOT],
	models: [
		{
			id: "kimi-k2-0711-preview",
			name: "Kimi K2 0711 Preview",
			contextWindow: 131072, // 128K context window
			maxTokens: 4096,
			supportsImages: false,
			inputPrice: 1.0, // $1.00 per 1M tokens
			outputPrice: 3.0, // $3.00 per 1M tokens
			cacheReadsPrice: 0.5, // $0.50 per 1M tokens (cached input)
			cacheWritesPrice: 1.0, // Same as input price
			supportsPromptCache: true,
			isRecommended: true,
			provider: PROVIDER_IDS.MOONSHOT,
		},
		{
			id: "kimi-k2-turbo-preview",
			name: "Kimi K2 Turbo Preview",
			contextWindow: 131072, // 128K context window
			maxTokens: 4096,
			supportsImages: false,
			inputPrice: 1.0, // $1.00 per 1M tokens (estimated)
			outputPrice: 3.0, // $3.00 per 1M tokens (estimated)
			cacheReadsPrice: 0.5, // $0.50 per 1M tokens (cached input)
			cacheWritesPrice: 1.0, // Same as input price
			supportsPromptCache: true,
			provider: PROVIDER_IDS.MOONSHOT,
		},
		{
			id: "Kimi-Researcher",
			name: "Kimi Researcher",
			contextWindow: 131072, // 128K context window
			maxTokens: 4096,
			supportsImages: false,
			inputPrice: 1.0, // $1.00 per 1M tokens (estimated)
			outputPrice: 3.0, // $3.00 per 1M tokens (estimated)
			cacheReadsPrice: 0.5, // $0.50 per 1M tokens (cached input)
			cacheWritesPrice: 1.0, // Same as input price
			supportsPromptCache: true,
			provider: PROVIDER_IDS.MOONSHOT,
		},
	],
	requiredFields: ["apiKey"],
}
