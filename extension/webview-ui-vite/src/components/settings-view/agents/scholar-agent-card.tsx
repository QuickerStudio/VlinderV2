import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { ModelSelector } from '../preferences/model-picker';
import { ChevronDown, Save } from 'lucide-react';
import { rpcClient } from '@/lib/rpc-client';
import { useSwitchToProviderManager } from '../preferences/atoms';
import { useState, useEffect } from 'react';

export const ScholarAgentCard = () => {
  const { data, refetch } = rpcClient.getScholarSettings.useQuery(
    {},
    {
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
      refetchIntervalInBackground: true,
    }
  );
  const switchToProvider = useSwitchToProviderManager();

  const {
    mutate: customizeScholarPrompt,
    isPending: customizeScholarPromptPending,
  } = rpcClient.customizeScholarPrompt.useMutation({});
  const { mutate: saveLearningKeywordsRPC, isPending: savingKeywords } =
    rpcClient.saveLearningKeywords.useMutation({
      onSuccess: () => {
        setKeywordsSaved(true);
        refetch(); // Refresh scholar settings
      },
      onError: (error) => {
        console.error('Failed to save learning keywords:', error);
      },
    });
  const { data: modelListData } = rpcClient.listModels.useQuery(
    {},
    {
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
    }
  );

  const scholarEnabled = !!data?.scholarSettings;
  const scholarSettings = data?.scholarSettings;

  // New trigger settings state
  const [taskCompletionTrigger, setTaskCompletionTrigger] = useState(true);
  const [learningOpportunityDetection, setLearningOpportunityDetection] =
    useState(true);
  const [explicitRequestTrigger, setExplicitRequestTrigger] = useState(true);

  // Learning keywords state
  const [learningKeywords, setLearningKeywords] = useState(
    'successfully, resolved, fixed, implemented, optimized, discovered, pattern, solution, effective, best practice'
  );
  const [keywordsSaved, setKeywordsSaved] = useState(true);

  // Initialize trigger settings from scholarSettings
  useEffect(() => {
    if (scholarSettings) {
      // For now, these are enabled by default since the Scholar Hook logic supports them
      // In the future, these could be stored in scholarSettings
      setTaskCompletionTrigger(true);
      setLearningOpportunityDetection(true);
      setExplicitRequestTrigger(true);

      // Load learning keywords from scholarSettings if available
      if (scholarSettings?.learningKeywords) {
        setLearningKeywords(scholarSettings.learningKeywords);
        setKeywordsSaved(true);
      }
    }
  }, [scholarSettings]);
  const {
    data: currentModelInfo,
    status: modelStatus,
    refetch: refetchModelData,
  } = rpcClient.currentScholarModel.useQuery(
    {},
    {
      refetchInterval: 5000,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      enabled: scholarEnabled, // Only run query when scholar is enabled
    }
  );
  const { mutate: setScholarEnabled } =
    rpcClient.enableScholarAgent.useMutation({
      onSuccess: () => {
        refetch();
      },
    });

  const { mutate: updateSettings } = rpcClient.updateScholarAgent.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const { mutate: selectModel } = rpcClient.selectScholarModel.useMutation({
    onSuccess: () => {
      refetch();
      refetchModelData();
    },
  });

  const handlePullMessagesChange = (value: number) => {
    if (scholarSettings) {
      updateSettings({
        scholarPullMessages: value,
      });
    }
  };

  // Save learning keywords to Scholar Prompt
  const saveLearningKeywords = () => {
    saveLearningKeywordsRPC({ keywords: learningKeywords });
  };

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-sm'>Scholar Agent</CardTitle>
          <Switch
            checked={scholarEnabled}
            onCheckedChange={(e) => setScholarEnabled({ enabled: e })}
            aria-label='Toggle scholar agent'
          />
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        <CardDescription className='text-xs'>
          An intelligent knowledge extraction agent that automatically detects
          learning opportunities and documents valuable patterns, insights, and
          best practices from successful development activities. The Scholar
          Agent helps build a persistent knowledge base for future reference and
          continuous learning.
        </CardDescription>
        {scholarEnabled && scholarSettings && (
          <div className='flex flex-col gap-4'>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-medium'>
                  Task Completion Trigger
                </Label>
                <Switch
                  checked={taskCompletionTrigger}
                  onCheckedChange={setTaskCompletionTrigger}
                />
              </div>
              <div className='text-xs text-muted-foreground'>
                Automatically trigger Scholar Agent when attempt_completion tool
                is called. This captures knowledge from completed tasks.
              </div>
            </div>

            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-medium'>
                  Learning Opportunity Detection
                </Label>
                <Switch
                  checked={learningOpportunityDetection}
                  onCheckedChange={setLearningOpportunityDetection}
                />
              </div>
              <div className='text-xs text-muted-foreground'>
                Detect learning opportunities from successful problem-solving,
                pattern discovery, and effective solutions.
              </div>
            </div>

            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-medium'>
                  Explicit Request Trigger
                </Label>
                <Switch
                  checked={explicitRequestTrigger}
                  onCheckedChange={setExplicitRequestTrigger}
                />
              </div>
              <div className='text-xs text-muted-foreground'>
                Respond to explicit knowledge requests like "summarize",
                "remember this", "save knowledge", etc.
              </div>
            </div>

            {learningOpportunityDetection && (
              <div className='space-y-3 pl-4 border-l-2 border-muted'>
                <Label className='text-xs font-medium'>Learning Keywords</Label>
                <div className='text-xs text-muted-foreground mb-2'>
                  Keywords that trigger Scholar Hook when detected in
                  conversations. System monitors for these words to
                  automatically start knowledge extraction.
                </div>
                <Textarea
                  value={learningKeywords}
                  onChange={(e) => {
                    setLearningKeywords(e.target.value);
                    setKeywordsSaved(false);
                  }}
                  placeholder='Enter keywords separated by commas...'
                  className='min-h-[80px] text-xs'
                />
                <Button
                  onClick={saveLearningKeywords}
                  size='sm'
                  variant={keywordsSaved ? 'secondary' : 'default'}
                  className='w-full'
                  disabled={savingKeywords}
                >
                  <Save className='w-3 h-3 mr-1' />
                  {savingKeywords
                    ? 'Saving...'
                    : keywordsSaved
                      ? 'Keywords Saved'
                      : 'Save Trigger Keywords'}
                </Button>
              </div>
            )}
            <div className='space-y-2'>
              <Label className='text-xs'>Messages to Analyze</Label>
              <div className='text-xs text-muted-foreground mb-2'>
                Number of previous messages the scholar will review for learning
                opportunities. More messages provide better context but may
                increase processing time.
              </div>
              <Slider
                value={[scholarSettings.scholarPullMessages]}
                onValueChange={(value) => handlePullMessagesChange(value[0])}
                min={1}
                max={10}
                step={1}
                className='w-full'
              />
              <div className='text-xs text-muted-foreground'>
                Current: {scholarSettings.scholarPullMessages} message
                {scholarSettings.scholarPullMessages > 1 ? 's' : ''}
              </div>
            </div>
            <div className='space-y-2'>
              <Label className='text-xs'>Select Scholar Model</Label>
              <div className='text-xs text-muted-foreground mb-2'>
                The AI model that will analyze development activities and
                extract knowledge. Different models may offer varying levels of
                insight and analysis depth.
              </div>
              <ModelSelector
                models={modelListData?.models ?? []}
                modelId={scholarSettings.modelId ?? null}
                providerId={scholarSettings.providerId ?? null}
                onChangeModel={selectModel}
                showDetails={false}
              >
                <Button
                  variant='ghost'
                  className='text-xs flex items-center gap-1 h-6 px-2 hover:bg-accent'
                >
                  {modelListData?.models.find(
                    (m) => m.id === scholarSettings.modelId
                  )?.name || 'Select Model'}
                  <ChevronDown className='w-4 h-4' />
                </Button>
              </ModelSelector>
              {data.scholarSettings?.providerId &&
                data.scholarSettings?.providerId !== 'anthropic' &&
                !currentModelInfo?.providerData.currentProvider && (
                  <span
                    onClick={() => {
                      switchToProvider(data.scholarSettings?.providerId!);
                    }}
                    className='text-destructive text-[11px] hover:underline cursor-pointer'
                  >
                    Requires setting up a provider key. Click here to set up a
                    provider.
                  </span>
                )}
            </div>
            <div className='space-y-2 mb-4'>
              <Label className='text-xs'>Custom Prompt</Label>
              <div className='text-xs text-muted-foreground mb-2'>
                Customize the scholar's prompt to provide special instructions
                or context for knowledge extraction and analysis.
              </div>
              <div className='flex flex-row gap-2 items-center flex-wrap'>
                <Button
                  disabled={customizeScholarPromptPending}
                  onClick={() => {
                    customizeScholarPrompt({});
                  }}
                  variant='default'
                  size='sm'
                  className='text-xs w-auto'
                >
                  Edit Prompt
                </Button>
                {scholarSettings.scholarPrompt && (
                  <Button
                    variant='destructive'
                    className='text-xs w-auto'
                    size='sm'
                    onClick={() => updateSettings({ clearPrompt: true })}
                  >
                    Clear Prompt
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
