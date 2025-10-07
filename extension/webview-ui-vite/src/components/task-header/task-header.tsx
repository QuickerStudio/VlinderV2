import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import { ClaudeMessage } from 'extension/shared/messages/extension-message';
import { Button } from '../ui/button';
import { vscode } from '../../utils/vscode';
import { cn } from '@/lib/utils';

import TaskText from './task-text';
import TokenInfo from './token-info';
import HistorySwitcher from './history-switcher';
import { useExtensionState } from '@/context/extension-state-context';
import { useDnaContextProtocol } from '@/hooks/use-dna-context-protocol';

import { Pencil, Download, Dna as Book } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Input } from '../ui/input';
import { useState, useRef, useEffect } from 'react';

import { rpcClient } from '@/lib/rpc-client';
import DnaContextProtocol from '../dna-context-protocol/dna-context-protocol';
import { useSound } from '@/hooks/use-sound';

interface TaskHeaderProps {
  firstMsg?: ClaudeMessage;
  tokensIn: number;
  tokensOut: number;
  doesModelSupportPromptCache: boolean;
  cacheWrites?: number;
  cacheReads?: number;
  totalCost: number;
  onClose: () => void;
  isHidden: boolean;
  vscodeUriScheme?: string;
  elapsedTime?: number;
  lastMessageAt?: number;
}

export default function TaskHeader({
  firstMsg,
  tokensIn,
  tokensOut,
  doesModelSupportPromptCache,
  cacheWrites,
  cacheReads,
  totalCost,
  onClose,
  vscodeUriScheme: _vscodeUriScheme,
  elapsedTime: _elapsedTime,
  lastMessageAt: _lastMessageAt,
}: TaskHeaderProps) {
  const {
    currentTaskId,
    currentTask,
    currentContextTokens,
    currentContextWindow,
  } = useExtensionState();
  const {
    isDnaContextProtocolOpen,
    toggleDnaContextProtocol,
    closeDnaContextProtocol,
  } = useDnaContextProtocol();
  const { mutate: markAsComplete, isPending } =
    rpcClient.markAsDone.useMutation();
  const { playSound } = useSound();

  // 编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDownload = () => {
    playSound('click');
    vscode.postMessage({ type: 'exportCurrentTask' });
  };

  const handleStartEdit = () => {
    playSound('click');
    const currentName =
      currentTask?.name ?? currentTask?.task ?? firstMsg?.text ?? '';
    setEditValue(currentName);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (
      editValue.trim() &&
      editValue !== (currentTask?.name ?? currentTask?.task ?? firstMsg?.text)
    ) {
      // 使用 RPC 客户端调用重命名 API
      if (currentTaskId) {
        rpcClient.renameTask
          .use({
            taskId: currentTaskId,
            newName: editValue.trim(),
          })
          .catch(console.error);
      }
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // 自动聚焦输入框
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClose = async () => {
    // 如果有当前任务，先标记为完成再关闭
    if (currentTaskId) {
      await markAsComplete({ taskId: currentTaskId });
    }
    onClose();
  };

  // 获取所有历史记录（排除当前任务）
  const { taskHistory } = useExtensionState();
  const recentHistory = taskHistory.filter(
    (item) => item.ts && item.task && item.id !== currentTaskId
  );

  return (
    <section className='pb-1'>
      <div className='flex items-center gap-2'>
        <Tooltip>
          <TooltipTrigger asChild>
            <VSCodeButton appearance='icon' onClick={handleStartEdit}>
              <Pencil className='h-4 w-4' />
            </VSCodeButton>
          </TooltipTrigger>
          <TooltipContent avoidCollisions side='bottom'>
            Rename Task
          </TooltipContent>
        </Tooltip>
        <div className='flex items-center gap-2 flex-1 min-w-0'>
          {isEditing ? (
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveEdit}
              className='text-base font-bold h-8 px-2'
            />
          ) : (
            <div
              className='truncate text-base font-bold cursor-pointer hover:bg-accent/20 px-2 py-1 rounded'
              onClick={handleStartEdit}
            >
              <TaskText
                text={currentTask?.name ?? currentTask?.task ?? firstMsg?.text}
              />
            </div>
          )}
        </div>

        {/* 历史记录切换器 */}
        <HistorySwitcher
          historyItems={recentHistory}
          currentTaskId={currentTaskId}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <VSCodeButton appearance='icon' onClick={handleDownload}>
              <Download className='h-4 w-4' />
            </VSCodeButton>
          </TooltipTrigger>
          <TooltipContent avoidCollisions side='left'>
            Download
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <VSCodeButton appearance='icon' onClick={() => {
              playSound('click');
              toggleDnaContextProtocol();
            }}>
              <Book
                size={16}
                className={cn(
                  'transition-colors',
                  isDnaContextProtocolOpen && 'text-accent-foreground'
                )}
              />
            </VSCodeButton>
          </TooltipTrigger>
          <TooltipContent avoidCollisions side='left'>
            DNA Context Protocol
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <VSCodeButton
              appearance='icon'
              onClick={handleClose}
              disabled={isPending}
            >
              <span className='codicon codicon-close'></span>
            </VSCodeButton>
          </TooltipTrigger>
          <TooltipContent avoidCollisions side='left'>
            Close
          </TooltipContent>
        </Tooltip>

        {/* TokenInfo 组件隐藏但保持功能，助手需要这些参数 */}
        <div style={{ display: 'none' }}>
          <TokenInfo
            tokensIn={currentTask?.tokensIn ?? tokensIn}
            tokensOut={currentTask?.tokensOut ?? tokensOut}
            doesModelSupportPromptCache={doesModelSupportPromptCache}
            cacheWrites={currentTask?.cacheWrites ?? cacheWrites}
            cacheReads={currentTask?.cacheReads ?? cacheReads}
            totalCost={currentTask?.totalCost ?? totalCost}
            currentContextTokens={currentContextTokens}
            currentContextWindow={currentContextWindow}
          />
        </div>
      </div>

      {/* DNA Context Protocol */}
      <DnaContextProtocol
        isOpen={isDnaContextProtocolOpen}
        onClose={closeDnaContextProtocol}
      />
    </section>
  );
}
