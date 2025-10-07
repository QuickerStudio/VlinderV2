import React, { useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { ChevronDown, Wand2 } from 'lucide-react';
import { useAtom, useSetAtom } from 'jotai';
import { showSettingsAtom } from '@/context/extension-state-context';
import { rpcClient } from '@/lib/rpc-client';
import { ModelSelector } from '../settings-view/preferences/model-picker';
import { chatStateAtom } from './atoms';
import { useSound } from '@/hooks/use-sound';

export const ModelDisplay = () => {
  const [chatState, setChatState] = useAtom(chatStateAtom);
  const { playSound } = useSound();
  const { data, refetch } = rpcClient.currentModelInfo.useQuery(
    {},
    {
      refetchInterval: 5000,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    }
  );
  const { mutate: handleModelChange } = rpcClient.selectModel.useMutation({
    onSettled: () => {
      refetch();
    },
  });

  const handleModelChangeWithSound = useCallback((params: { modelId: string; providerId: string }) => {
    playSound('click');
    handleModelChange(params);
  }, [playSound, handleModelChange]);
  const { data: modelListData, status } = rpcClient.listModels.useQuery(
    {},
    {
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
    }
  );
  const supportImages = data?.model?.supportsImages ?? false;

  useEffect(() => {
    if (!supportImages) {
      setChatState((prev) => ({ ...prev, selectedImages: [] }));
    }
  }, [supportImages]);
  if (!data?.model) return null;

  return (
    <ModelSelector
      models={modelListData?.models ?? []}
      modelId={data.model.id ?? null}
      providerId={data.model.provider ?? null}
      onChangeModel={handleModelChangeWithSound}
      showDetails={false}
    >
      <Button
        variant='ghost'
        className='text-xs flex items-center gap-1 h-6 px-2 hover:bg-accent'
        onClick={() => playSound('click')}
      >
        {data.model.name}
        <ChevronDown className='w-4 h-4' />
      </Button>
    </ModelSelector>
  );
};
