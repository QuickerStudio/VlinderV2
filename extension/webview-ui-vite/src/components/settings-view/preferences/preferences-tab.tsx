'use client';

import React, { memo, useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';

import { ModelSelector } from './model-picker';
import { ThinkingConfigComponent } from './thinking-config';
import { rpcClient } from '@/lib/rpc-client';
import ProviderManager from './provider-manager';

/**
 * PreferencesTab
 * A "Select with Autocomplete" using Popover + Command, now with contextWindow + maxTokens.
 */
const PreferencesTabNew: React.FC = () => {
  const [isProviderSettingsExpanded, setIsProviderSettingsExpanded] = useState(false);

  const { data: currentModelData, refetch } =
    rpcClient.currentModelInfo.useQuery(
      {},
      {
        refetchInterval: 5000,
        refetchIntervalInBackground: true,
      }
    );

  const selectedModelId = currentModelData?.model?.id || null;
  const providerId = currentModelData?.providerData?.providerId || null;
  const { mutate: handleModelChange } = rpcClient.selectModel.useMutation({
    onSuccess: () => {
      refetch();
    },
  });
  const { data } = rpcClient.listModels.useQuery(
    {},
    {
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
    }
  );

  if (!data) return null;
  return (
    <Card className='max-w-md w-full mx-auto'>
      <CardHeader>
        <CardTitle className='text-base sm:text-lg'>
          Main Architecture Model
        </CardTitle>
      </CardHeader>

      <CardContent className='space-y-4'>
        <ModelSelector
          models={data.models ?? []}
          modelId={selectedModelId ?? null}
          providerId={providerId ?? null}
          onChangeModel={handleModelChange}
          showDetails={true}
          isProviderSettingsExpanded={isProviderSettingsExpanded}
          onToggleProviderSettings={() => setIsProviderSettingsExpanded(!isProviderSettingsExpanded)}
        />
        {isProviderSettingsExpanded && <ProviderManager />}
        <ThinkingConfigComponent modelId={selectedModelId ?? undefined} />
      </CardContent>
    </Card>
  );
};

export default memo(PreferencesTabNew);
