// providers/index.ts
import { deepseekConfig } from './deepseek';
import { openaiConfig } from './openai';
import { PROVIDER_IDS } from '../constants';
import { ProviderConfig } from '../types';
import { anthropicConfig } from './anthropic';
import { moonshotConfig } from './moonshot';

export const providerConfigs: Record<string, ProviderConfig> = {
	[PROVIDER_IDS.DEEPSEEK]: deepseekConfig,
	[PROVIDER_IDS.OPENAI]: openaiConfig,
	[PROVIDER_IDS.ANTHROPIC]: anthropicConfig,
	[PROVIDER_IDS.MOONSHOT]: moonshotConfig,
	// Add other providers here as they're created
};

export const customProvidersConfigs: Record<string, ProviderConfig> =
	Object.fromEntries(Object.entries(providerConfigs));

export const models = Object.values(providerConfigs).flatMap(
	(provider) => provider.models
);

export type ProviderConfigs = typeof providerConfigs;
