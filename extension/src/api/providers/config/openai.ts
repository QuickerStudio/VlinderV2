// providers/openai.ts
import { ProviderConfig } from '../types';
import { DEFAULT_BASE_URLS, PROVIDER_IDS, PROVIDER_NAMES } from '../constants';

export const openaiConfig: ProviderConfig = {
	id: PROVIDER_IDS.OPENAI,
	name: PROVIDER_NAMES[PROVIDER_IDS.OPENAI],
	baseUrl: DEFAULT_BASE_URLS[PROVIDER_IDS.OPENAI],
	models: [
		{
			id: 'gpt-5',
			name: 'GPT-5',
			contextWindow: 500_000,
			maxTokens: 32_000,
			supportsImages: true,
			supportsPromptCache: true,
			inputPrice: 10.0,
			outputPrice: 30.0,
			cacheReadsPrice: 10.0 * 0.5, // 50% of input price
			cacheWritesPrice: 10.0,
			provider: PROVIDER_IDS.OPENAI,
			isThinkingModel: true,
		},
		{
			id: 'gpt-4.1-preview',
			name: 'GPT-4.1 (Preview)',
			contextWindow: 1_000_000,
			maxTokens: 32_000,
			supportsImages: true,
			supportsPromptCache: true,
			inputPrice: 10.0,
			outputPrice: 30.0,
			cacheReadsPrice: 10.0 * 0.5, // 50% of input price
			cacheWritesPrice: 10.0,
			provider: PROVIDER_IDS.OPENAI,
			isThinkingModel: true,
		},
		{
			id: 'gpt-4o',
			name: 'GPT-4 O',
			contextWindow: 128000,
			maxTokens: 4096,
			supportsImages: true,
			supportsPromptCache: true,
			inputPrice: 5.0,
			outputPrice: 15.0,
			cacheReadsPrice: 5.0 * 0.5, // 50% of input price
			provider: PROVIDER_IDS.OPENAI,
			cacheWritesPrice: 5.0,
		},
	],
	requiredFields: ['apiKey'],
};
