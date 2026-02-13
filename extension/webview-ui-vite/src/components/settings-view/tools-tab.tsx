import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ToolName } from 'extension/agent/v2/tools/types';
import { ToolPromptSchema } from 'extension/agent/v2/prompts/utils/utils';
import { toolPrompts } from 'extension/agent/v2/prompts/tools';
import { useAtom, useAtomValue } from 'jotai';
import { useEvent } from 'react-use';
import { ExtensionMessage } from 'extension/shared/messages/extension-message';
import { vscode } from '@/utils/vscode';
import { atom } from 'jotai';

// Tool data and atomic state
export const tools = toolPrompts.reduce(
  (acc, tool) => {
    acc[tool.name] = tool;
    return acc;
  },
  {} as Record<ToolName, ToolPromptSchema>
);

export const disabledToolsAtom = atom(new Set<ToolName>());
export const currentPromptContentAtom = atom('');
export const isCurrentPreviewAtom = atom(false);

/**
 * Convert tool name from snake_case to Title Case
 * @param toolName something_like_this
 * @returns Something Like This
 */
const toolNamePrettier = (toolName: ToolName) => {
  return toolName
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const ToolCards = () => {
  const [disabledTools, setDisabledTools] = useAtom(disabledToolsAtom);
  const currentPromptContent = useAtomValue(currentPromptContentAtom);
  const isCurrentPreview = useAtomValue(isCurrentPreviewAtom);

  useEvent('message', (event) => {
    const message = event.data as ExtensionMessage;
    if (message.type === 'disabledTools') {
      setDisabledTools(new Set(message.tools));
    }
  });

  console.log('tools', tools);

  return (
    <TooltipProvider>
      <ScrollArea className='h-[400px] w-full rounded-md border'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4'>
          {Object.entries(tools).map(([name, schema]) => (
            <div key={name} className='relative'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    className={`w-full text-left justify-start transition-colors font-bold text-sm ${
                      !disabledTools.has(name as ToolName)
                        ? 'bg-[#66FFDA] bg-opacity-60 text-[var(--vscode-editor-foreground)] hover:bg-[#66FFDA] hover:bg-opacity-70'
                        : 'bg-[#FF63CB] bg-opacity-30 text-[var(--vscode-editor-foreground)] hover:bg-[#FF63CB] hover:bg-opacity-40'
                    }`}
                    onClick={() => {
                      const isCurrentlyEnabled = !disabledTools.has(
                        name as ToolName
                      );
                      vscode.postMessage({
                        type: 'disableTool',
                        toolName: name as ToolName,
                        boolean: !isCurrentlyEnabled, // Toggle state
                        content: isCurrentPreview ? currentPromptContent : '',
                      });
                    }}
                  >
                    {toolNamePrettier(name as ToolName)}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side='bottom' className='max-w-sm'>
                  <div className='text-xs'>{schema.description}</div>
                </TooltipContent>
              </Tooltip>
            </div>
          ))}
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
};

const ToolsTab: React.FC = () => {
  return (
    <div className='space-y-6'>
      {/* Customize Instructions Section - moved from Advanced tab */}
      <div className='space-y-4'>
        <div className={'flex items-center justify-between'}>
          <div className={'flex-1 pr-2'}>
            <Label
              htmlFor='customizePrompt'
              className='text-xs font-medium flex items-center'
            >
              Customize Instructions
            </Label>
            <p className='text-[10px] text-muted-foreground'>
              Let's you customize the instructions that Vlinder will follow when
              executing Tasks. You can customize the tools and general
              instructions that Vlinder will follow.
            </p>
          </div>

          <Button
            size='sm'
            variant='secondary'
            onClick={() => {
              vscode.postMessage({ type: 'openPromptEditor' });
            }}
          >
            Open Editor
          </Button>
        </div>
      </div>

      {/* Tools Section */}
      <div className='space-y-4'>
        <div>
          <Label className='text-xs font-medium'>Available Tools</Label>
          <p className='text-[10px] text-muted-foreground'>
            Enable or disable tools that Vlinder can use when executing tasks.
          </p>
        </div>
        <ToolCards />
      </div>
    </div>
  );
};

export default ToolsTab;
