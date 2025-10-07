import React, { FC, useState, useMemo } from 'react';
import {
  Check,
  Image,
  ChevronsUpDown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import Fuse from 'fuse.js';

import { ModelInfo } from 'extension/api/providers/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';
import { Separator } from '@/components/ui/separator';
import { rpcClient } from '@/lib/rpc-client';

/**
 * ModelSelector Props
 *
 * @param modelId        The currently selected model ID (string)
 * @param providerId     The currently selected provider ID (string)
 * @param onChangeModel  Handler to set the new model ID when a user selects a model from the list
 * @param models         Optional record of models; defaults to VlinderModels
 * @param showDetails    Whether to show the selected model's details (CPM, contextWindow, output limit, badges) below the popover
 * @param isProviderSettingsExpanded Whether the provider settings panel is expanded
 * @param onToggleProviderSettings Handler to toggle provider settings panel
 */
interface ModelSelectorProps {
  modelId: string | null;
  providerId: string | null;
  onChangeModel: ReturnType<typeof rpcClient.selectModel.useMutation>['mutate'];
  models: ModelInfo[];
  showDetails?: boolean;
  children?: React.ReactNode;
  isProviderSettingsExpanded?: boolean;
  onToggleProviderSettings?: () => void;
}

/**
 * A reusable "Select with Autocomplete" for picking a model:
 * - Clicking the button triggers a popover with a Command list
 * - Searching filters models by name + description
 * - Selecting calls `onChangeModel`
 * - Optionally displays the selected model's info below
 */
export const ModelSelector: FC<ModelSelectorProps> = ({
  modelId,
  providerId,
  onChangeModel,
  models,
  showDetails = true,
  children,
  isProviderSettingsExpanded = false,
  onToggleProviderSettings,
}) => {
  // Popover open/close state
  const [open, setOpen] = useState(false);
  // Add search query state
  const [searchQuery, setSearchQuery] = useState('');
  // Currently selected model info
  const selectedModel: ModelInfo | undefined = models.find(
    (model) => model.id === modelId && model.provider === providerId
  );

  // Create a Fuse instance for fuzzy searching
  const fuse = useMemo(() => {
    return new Fuse(models, {
      keys: [
        { name: 'provider', weight: 1 },
        { name: 'id', weight: 1 },
        { name: 'name', weight: 2 }, // Give name a higher weight for better matches
      ],
      threshold: 0.3,
      ignoreLocation: true,
      minMatchCharLength: 1,
    });
  }, [models]);

  // Create filtered models array based on search query with fuzzy matching
  const filteredModels = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return models;

    // First try exact matching for better performance
    const exactMatches = models.filter((model) => {
      const providerModel =
        `${model.provider}/${model.id}/${model.name}`.toLowerCase();
      return providerModel.includes(query);
    });

    if (exactMatches.length > 0) {
      return exactMatches;
    }

    // Fall back to fuzzy search
    const fuzzyResults = fuse.search(query);
    return fuzzyResults.map((result) => result.item);
  }, [models, searchQuery, fuse]);

  // Render badges for capabilities
  const renderBadges = (model: ModelInfo, renderProvider = true) => (
    <div className='flex flex-wrap gap-2'>
      {renderProvider && <Badge variant='default'>{model.provider}</Badge>}
      {model.supportsImages && (
        <Badge variant='secondary' className='flex items-center gap-1'>
          <Image className='w-3 h-3' />
          <span className='text-xs'>Vision</span>
        </Badge>
      )}

      {model.isRecommended && <Badge variant='default'>Recommended</Badge>}
    </div>
  );

  return (
    <div className='space-y-4'>
      {/* Title row with toggle button for provider settings */}
      {!children && (
        <div className='flex items-center justify-between'>
          <span className='text-sm font-medium'>Pick a Model</span>

          {/* Toggle button for provider settings */}
          {onToggleProviderSettings && (
            <Button
              variant='outline'
              size='icon'
              onClick={onToggleProviderSettings}
              aria-label={isProviderSettingsExpanded ? 'Collapse Provider Settings' : 'Expand Provider Settings'}
              className='h-8 w-8 hover:bg-[#181818]'
              style={{ backgroundColor: '#2D2D2D' }}
            >
              {isProviderSettingsExpanded ? (
                <ChevronUp className='w-4 h-4' />
              ) : (
                <ChevronDown className='w-4 h-4' />
              )}
            </Button>
          )}
        </div>
      )}

      {/* The Popover + Command-based autocomplete */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {children ?? (
            <Button
              variant='outline'
              className='w-full justify-between text-sm'
            >
              {selectedModel ? selectedModel.name : 'Select a Model'}
              <ChevronsUpDown className='ml-2 h-4 w-4 opacity-50' />
            </Button>
          )}
        </PopoverTrigger>

        {/* The popover content: up to 80vw on sm: screens, max 24rem */}
        <PopoverContent className='w-full p-0'>
          <Command
            shouldFilter={false}
            style={{ width: '80vw', maxWidth: '400px' }}
          >
            <CommandInput
              placeholder='Search models...'
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>No models found.</CommandEmpty>
              <CommandGroup>
                <Virtuoso
                  style={{ height: '280px' }}
                  // totalCount={filteredModels.length}
                  data={filteredModels}
                  // Find the index of the selected model to scroll to it initially
                  initialTopMostItemIndex={
                    filteredModels.findIndex(
                      (model) =>
                        model.id === modelId && model.provider === providerId
                    ) > 0
                      ? filteredModels.findIndex(
                          (model) =>
                            model.id === modelId &&
                            model.provider === providerId
                        )
                      : 0
                  }
                  overscan={20}
                  itemContent={(index, model) => {
                    const isSelected =
                      model.id === modelId && model.provider === providerId;
                    return (
                      <CommandItem
                        value={model.name}
                        key={model.id}
                        onSelect={() => {
                          onChangeModel({
                            modelId: model.id,
                            providerId: model.provider,
                          });
                          setOpen(false);
                        }}
                        className='flex flex-col items-start gap-1'
                      >
                        <div className='w-full flex justify-between text-sm font-medium'>
                          <span>{model.name}</span>
                          {isSelected && (
                            <Check className='h-4 w-4 text-primary' />
                          )}
                        </div>

                        {/* CPM, context window, output limit inline */}
                        <span className='text-[11px] text-muted-foreground'>
                          Input: ${model.inputPrice?.toFixed(2)} | Output: $
                          {model.outputPrice?.toFixed(2)} |{' '}
                          {model.cacheWritesPrice &&
                            model.cacheReadsPrice &&
                            'Cache Writes: $' +
                              model.cacheWritesPrice?.toFixed(2) +
                              ' | Cache Reads: $' +
                              model.cacheReadsPrice?.toFixed(2) +
                              ' | '}
                          Context: {model.contextWindow} | Output:{' '}
                          {model.maxTokens}
                        </span>
                        <span className='text-[11px] text-muted-foreground'>
                          Prices are shown per million tokens
                        </span>
                        {renderBadges(model)}
                      </CommandItem>
                    );
                  }}
                />
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* If showDetails is true and provider settings are expanded, display the separator */}
      {showDetails && isProviderSettingsExpanded && <Separator />}
    </div>
  );
};
