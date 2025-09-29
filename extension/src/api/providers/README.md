# Provider Implementation Guide

## Architecture Overview
Providers consist of:
- **Configuration**: Defines models/endpoints (in `config/`)
- **Class Implementation**: Handles API calls (extends `ApiHandler`)
- **Type Definitions**: Interfaces/Schemas (in `types.ts`)
- **Frontend Integration**: Automatic UI registration

## Creating a New Provider

### 1. Configuration File
Create new config in `config/` directory:
```ts
// config/example-provider.ts
import { ProviderConfig } from "../types"

export const exampleConfig = {
  id: "example" as const,
  name: "Example Provider",
  baseUrl: "https://api.example.com/v1",
  models: [
    {
      id: "example-model",
      name: "Example Model",
      contextWindow: 128000,
      maxTokens: 4096,
      supportsImages: false,
      inputPrice: 0.5,
      outputPrice: 1.5,
      provider: "example"
    }
  ],
  requiredFields: ["apiKey"]
}
```

### 2. Register Configuration
Add to `config/index.ts`:
```ts
import { exampleConfig } from "./example-provider"

export const providerConfigs = {
  ...existingConfigs,
  [PROVIDER_IDS.EXAMPLE]: exampleConfig
}
```

### 3. Implement Provider Class
Extend `CustomApiHandler` in `custom-provider.ts`:
```ts
case PROVIDER_IDS.EXAMPLE:
  if (!settings.apiKey) throw error
  return createExampleSDK({
    apiKey: settings.apiKey
  }).languageModel(modelId)
```

### 4. Update Type Definitions
Add to `types.ts`:
```ts
export interface ExampleSettings extends BaseProviderSettings {
  providerId: "example"
  apiKey: string
  baseUrl?: string
}

// Add to ProviderSettings union
export type ProviderSettings = ... | ExampleSettings
```

## Frontend Integration
Models automatically appear in UI when:
1. Added to providerConfigs
2. ModelInfo.provider matches provider ID
3. Type definitions are properly extended

## Validation Requirements
- Implement Zod schema for custom providers
- Handle API key validation
- Throw `CustomProviderError` for provider-specific issues

## Adding a Provider

### Overview
To add a new provider to the codebase, you need to create configuration files, add type definitions, and implement the provider handler.

### Step-by-Step Process

#### 1. Add Provider Constants
**File:** `src/api/providers/constants.ts`
- Add provider ID to `PROVIDER_IDS` object
- Add provider name to `PROVIDER_NAMES` object
- Add base URL to `DEFAULT_BASE_URLS` object

#### 2. Create Provider Configuration
**File:** `src/api/providers/config/provider-name.ts`
- Create new configuration file with `ProviderConfig` object
- Define models array with `ModelInfo` objects
- Specify required fields (usually `["apiKey"]`)

#### 3. Register Provider Configuration
**File:** `src/api/providers/config/index.ts`
- Add import statement for new provider config
- Add provider entry to `providerConfigs` object

#### 4. Add Type Definitions
**File:** `src/api/providers/types.ts`
- Create provider-specific settings interface (e.g., `ProviderNameSettings`)
- Add provider settings to `ProviderSettings` union type

#### 5. Implement Provider Handler
**File:** `src/api/providers/custom-provider.ts`
- Add AI SDK import for the provider (e.g., `createProviderName`)
- Add provider config import if needed
- Add provider case to `providerToAISDKModel()` function with error handling

#### 6. Update Documentation (Optional)
**Files:** `README.md`, `package.json`
- Add provider references to documentation
- Add provider keywords to package.json

### Key Functions Involved
- `providerToAISDKModel()` - Main provider routing function in custom-provider.ts
- Provider configuration objects in config files
- Type definitions and interfaces in types.ts

### Files Modified During Addition
1. `src/api/providers/constants.ts`
2. `src/api/providers/config/provider-name.ts` (new file)
3. `src/api/providers/config/index.ts`
4. `src/api/providers/types.ts`
5. `src/api/providers/custom-provider.ts`
6. `src/api/providers/README.md` (optional)
7. `package.json` (optional)

### Verification
After addition, ensure:
- TypeScript compilation passes (`npm run check-types`)
- Linting passes (`npm run lint`)
- Provider appears in model picker UI
- Provider can be selected and used for API calls
- Error handling works correctly for missing API keys

## Removing a Provider

### Overview
To completely remove a provider from the codebase, you need to clean up references across multiple files and remove the provider's configuration.

### Step-by-Step Process

#### 1. Remove Provider Constants
**File:** `src/api/providers/constants.ts`
- Remove provider ID from `PROVIDER_IDS` object
- Remove provider name from `PROVIDER_NAMES` object
- Remove base URL from `DEFAULT_BASE_URLS` object

#### 2. Remove Provider Configuration
**File:** `src/api/providers/config/index.ts`
- Remove import statement for provider config
- Remove provider entry from `providerConfigs` object

#### 3. Remove Type Definitions
**File:** `src/api/providers/types.ts`
- Remove provider-specific settings interface (e.g., `ProviderNameSettings`)
- Remove provider settings from `ProviderSettings` union type

#### 4. Remove Provider Handler
**File:** `src/api/providers/custom-provider.ts`
- Remove AI SDK import for the provider (e.g., `createProviderName`)
- Remove provider config import if used
- Remove provider case from `providerToAISDKModel()` function

#### 5. Delete Configuration File
**File:** `src/api/providers/config/provider-name.ts`
- Delete the entire provider configuration file

#### 6. Update Documentation (Optional)
**Files:** `README.md`, `package.json`
- Remove provider references from documentation
- Remove provider keywords from package.json

### Key Functions Involved
- `providerToAISDKModel()` - Main provider routing function in custom-provider.ts
- Provider configuration objects in config files
- Type definitions and interfaces in types.ts

### Files Modified During Removal
1. `src/api/providers/constants.ts`
2. `src/api/providers/config/index.ts`
3. `src/api/providers/types.ts`
4. `src/api/providers/custom-provider.ts`
5. `src/api/providers/config/[provider-name].ts` (deleted)
6. `src/api/providers/README.md` (optional)
7. `package.json` (optional)

### Verification
After removal, ensure:
- TypeScript compilation passes (`npm run check-types`)
- Linting passes (`npm run lint`)
- No remaining references to the provider in codebase
- All other providers continue to function normally

## Testing Guidelines
1. Verify provider appears in settings
2. Test API key validation
3. Check model streaming functionality
4. Verify cost calculations
5. Confirm UI displays all model metadata