import {
  AlertCircle,
  CircleX,
  X,
  ChevronDown,
  ChevronRight,
  Settings,
  Gift,
  Undo2,
} from 'lucide-react';
import { useExtensionState } from '@/context/extension-state-context';

function formatElapsedTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}
import { vscode } from '@/utils/vscode';
import { TextWithAttachments } from '@/utils/extract-attachments';
import { SyntaxHighlighterStyle } from '@/utils/get-syntax-highlighter-style-from-theme';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import React from 'react';
import {
  V1ClaudeMessage,
  ClaudeSayTool,
} from 'extension/shared/messages/extension-message';
import CodeBlock from '../code-block/code-block';
import Thumbnails from '../thumbnails/thumbnails';
import IconAndTitle from './icon-and-title';
import MarkdownRenderer from './markdown-renderer';
import { ThinkingSummaryRow, ExecutionPlanRow } from './thinking-summary-row';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Button } from '../ui/button';
import { AnimatePresence, m, motion } from 'framer-motion';
import { Badge } from '../ui/badge';
import { Avatar, AvatarImage } from '../ui/avatar';

import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSwitchToProviderManager } from '../settings-view/preferences/atoms';
import { ReasoningRow } from './reasoning-row';
import DiagnosticRow from './diagnostic-row';
import { rpcClient } from '@/lib/rpc-client';
import { useAtom } from 'jotai';
import { chatStateAtom } from '../chat-view/atoms';

function StatusIcon({ message }: { message: V1ClaudeMessage }) {
  if (message.isError || message.isAborted)
    return <XCircle className='shrink-0 h-4 w-4 text-destructive' />;
  if (message.isFetching)
    return <Loader2 className='shrink-0 h-4 w-4 animate-spin text-info' />;
  if (message.retryCount)
    return <AlertCircle className='shrink-0 h-4 w-4 text-warning' />;
  if (message.isDone)
    return <CheckCircle className='shrink-0 h-4 w-4 text-success' />;
  return null;
}

/**
 * 🎯 APIRequestMessage - 重要的界面请求样式修改函数
 *
 * 这是控制 "Making Request" 和 "Request Complete" 显示样式的核心组件
 * 负责：
 * - API请求状态的可视化显示 (Making Request / Request Complete / Request Failed)
 * - 状态图标的显示 (🔄 加载中、✅ 完成、❌ 失败)
 * - 模型信息的显示 (deepseek-chat, Claude 3.5 Sonnet 等)
 * - 自动隐藏逻辑 (所有状态3秒后自动淡出隐藏)
 *
 * 修改此组件可以改变：
 * - 请求状态的显示样式 (颜色、字体、布局等)
 * - 自动隐藏的时间和动画效果
 * - 状态图标和文字的排列方式
 */
export const APIRequestMessage: React.FC<{ message: V1ClaudeMessage }> =
  React.memo(({ message }) => {
    const { cost } = message?.apiMetrics || {};
    const apiRequestFailedMessage =
      message.errorText || message.isError ? 'Request Failed' : false;

    // 🎯 添加自动隐藏状态 - 使用消息时间戳作为唯一标识防止"诈尸"
    const hiddenMessagesKey = `hidden_api_messages`;
    const getHiddenMessages = (): Set<number> => {
      try {
        const stored = sessionStorage.getItem(hiddenMessagesKey);
        return stored ? new Set(JSON.parse(stored)) : new Set();
      } catch {
        return new Set();
      }
    };

    const setMessageHidden = (timestamp: number) => {
      const hiddenMessages = getHiddenMessages();
      hiddenMessages.add(timestamp);
      sessionStorage.setItem(
        hiddenMessagesKey,
        JSON.stringify([...hiddenMessages])
      );
    };

    const isMessageHidden = (timestamp: number): boolean => {
      return getHiddenMessages().has(timestamp);
    };

    // 检查消息是否已经被隐藏（防止诈尸）
    const [isVisible, setIsVisible] = React.useState(
      !isMessageHidden(message.ts)
    );
    const [isAnimatingOut, setIsAnimatingOut] = React.useState(false);

    const [icon, title] = IconAndTitle({
      type: 'api_req_started',
      cost: message.apiMetrics?.cost,
      isCommandExecuting: !!message.isExecutingCommand,
      apiRequestFailedMessage,
      isCompleted: message.isDone,
    });

    // 🎯 请求完成后3秒自动隐藏 (包括成功和失败的请求) - 防止诈尸
    React.useEffect(() => {
      if (message.isDone && isVisible) {
        // 只有可见且完成的消息才设置隐藏
        const timer = setTimeout(() => {
          setIsAnimatingOut(true);
          // 动画完成后隐藏并记录到持久化存储
          setTimeout(() => {
            setIsVisible(false);
            setMessageHidden(message.ts); // 🎯 记录这个消息已被隐藏，防止诈尸
          }, 300); // 300ms淡出动画
        }, 3000); // 3秒后开始淡出，足够看清楚状态

        return () => clearTimeout(timer);
      }
    }, [message.isDone, isVisible, message.ts]); // 添加 message.ts 依赖

    // 🎯 如果已隐藏，不渲染组件
    if (!isVisible) {
      return null;
    }

    if (message?.agentName) {
      // @ts-expect-error - agentName is literal string
      message.agentName = message.agentName
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    // Combine agent and model into one concise badge
    const agentModelText = [message?.agentName, message?.modelId]
      .filter(Boolean)
      .join(' @ ');

    return (
      <>
        {/* 🎯 简化为纯文本显示，保留状态图标和颜色，添加淡出动画 */}
        <div
          className={cn(
            'text-sm my-1 flex items-center gap-2 transition-opacity duration-300',
            isAnimatingOut && 'opacity-0'
          )}
        >
          {/* Status Icon */}
          <StatusIcon message={message} />

          {/* Title 作为纯文本 */}
          <span
            className={cn(
              apiRequestFailedMessage
                ? 'text-destructive'
                : message.isDone
                  ? 'text-success'
                  : 'text-info'
            )}
          >
            {title}
          </span>

          {/* Agent/Model 信息作为纯文本 */}
          {agentModelText && (
            <span className='ml-2 text-xs text-muted-foreground'>
              ({agentModelText})
            </span>
          )}
        </div>
        {message.diagnostics && (
          <div className='my-2'>
            <DiagnosticRow
              state={
                message.diagnostics?.state === 'pending' ? 'loading' : 'loaded'
              }
              diagnostics={message.diagnostics?.results}
            />
          </div>
        )}
        {message.reasoning && <ReasoningRow message={message} />}
        {message.isError && (
          <span className='text-destructive p-2 flex'>{message.errorText}</span>
        )}
      </>
    );
  });
/**
 * Extract content from tags in the message text, handling streaming content
 * that may not have a closing tag yet
 *
 * This improved version handles both streaming and completed cases to ensure
 * content is always extracted properly for display, even when a task is reopened.
 */
const extractTagContent = (
  text: string,
  tagName: string
): { content: string; remaining: string; hasOpenTag: boolean } => {
  const openTag = `<${tagName}>`;
  const closeTag = `</${tagName}>`;

  let remaining = text;
  let content = '';
  let hasOpenTag = false;

  const startIndex = remaining.indexOf(openTag);
  if (startIndex !== -1) {
    hasOpenTag = true;
    const endIndex = remaining.indexOf(closeTag, startIndex);

    if (endIndex !== -1 && endIndex > startIndex) {
      // Complete tag with opening and closing
      content = remaining
        .substring(startIndex + openTag.length, endIndex)
        .trim();
      remaining =
        remaining.substring(0, startIndex).trim() +
        remaining.substring(endIndex + closeTag.length).trim();
    } else {
      // Only opening tag found (streaming case)
      content = remaining.substring(startIndex + openTag.length).trim();
      remaining = remaining.substring(0, startIndex).trim();
    }
  }

  return { content, remaining, hasOpenTag };
};

export const TextMessage: React.FC<{ message: V1ClaudeMessage }> = React.memo(
  ({ message }) => {
    const text = message.text || '';

    // Extract thinking summary
    const {
      content: thinkingSummary,
      remaining: afterThinking,
      hasOpenTag: hasThinkingTag,
    } = extractTagContent(text, 'thinking_summary');

    // Extract execution plan from remaining text
    const {
      content: executionPlan,
      remaining: finalRemaining,
      hasOpenTag: hasExecutionTag,
    } = extractTagContent(afterThinking, 'execution_plan');

    // For thinking and execution plan, we only check if content was found
    // This ensures content continues to display when reopening a task
    const hasThinkingContent = thinkingSummary.length > 0;
    const hasExecutionContent = executionPlan.length > 0;

    // Display remaining content only if we have text after extracting special content
    const displayRemaining = finalRemaining && finalRemaining.trim().length > 0;

    // Create unique identifiers for each component's collapse state
    // This ensures they can be collapsed independently
    const thinkingTs = message.ts + 1; // Add 1 to make it unique
    const executionTs = message.ts + 2; // Add 2 to make it unique

    return (
      <div className='flex text-wrap flex-wrap w-full flex-col'>
        {hasThinkingContent && (
          <ThinkingSummaryRow
            content={thinkingSummary}
            messageTs={thinkingTs}
            forceCollapsed={false}
          />
        )}
        {hasExecutionContent && (
          <ExecutionPlanRow
            content={executionPlan}
            messageTs={executionTs}
            forceCollapsed={false}
          />
        )}
        {displayRemaining && <MarkdownRenderer markdown={finalRemaining} />}
      </div>
    );
  }
);

export const UserFeedbackMessage: React.FC<{ message: V1ClaudeMessage }> =
  React.memo(({ message }) => {
    const extensionState = useExtensionState();
    const [chatState, setChatState] = useAtom(chatStateAtom);

    const handleGitRevert = async () => {
      try {
        const result = await rpcClient.revertConversationToMessage.use({
          messageId: message.ts,
          messageText: message.text,
        });

        if (result.success) {
          // 将消息内容重新填充到聊天输入框
          setChatState((prev) => ({
            ...prev,
            inputValue: message.text || '',
          }));
          console.log(
            `Successfully reverted conversation to message ${message.ts}`
          );
        } else {
          console.error(`Failed to revert conversation: ${result.error}`);
        }
      } catch (error) {
        console.error(`Error reverting conversation: ${error}`);
      }
    };

    return (
      <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
        <Avatar style={{ marginTop: '-2px' }}>
          <AvatarImage />
        </Avatar>
        <div style={{ display: 'grid', gap: '8px', flex: 1, minWidth: 0 }}>
          <TextWithAttachments text={message.text} />
          {message.images && message.images.length > 0 && (
            <Thumbnails images={message.images} />
          )}
        </div>

        {/* 🎯 修复：限制按钮容器宽度，确保与工具消息的按钮容器宽度一致 */}
        <div className='flex items-center space-x-2 flex-shrink-0'>
          {/* Git撤销按钮 - 当gitHandlerEnabled为true时显示 */}
          {extensionState.gitHandlerEnabled && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size='sm'
                  variant='outline'
                  className='h-8 w-8 p-0'
                  onClick={handleGitRevert}
                  title='撤销对话到此节点'
                >
                  <Undo2 className='h-4 w-4 text-cyan-500' />
                </Button>
              </TooltipTrigger>
              <TooltipContent side='left'>撤销对话到此节点</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    );
  });

export const InfoMessage: React.FC<{ message: V1ClaudeMessage }> = React.memo(
  ({ message }) => (
    <div
      style={{ display: 'flex', alignItems: 'start', gap: '8px' }}
      className='text-info'
    >
      <div style={{ display: 'grid', gap: '8px' }}>
        <span className='codicon codicon-info' style={{ marginTop: '2px' }} />
        <div>{message.text}</div>
      </div>
    </div>
  )
);

export const UserFeedbackDiffMessage: React.FC<{
  message: V1ClaudeMessage;
}> = React.memo(({ message }) => {
  const [isExpanded, setToggle] = React.useState(false);
  const onToggleExpand = () => setToggle(!isExpanded);
  const tool = JSON.parse(message.text || '{}') as ClaudeSayTool;
  return (
    <div
      style={{
        backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
        borderRadius: '3px',
        padding: '8px',
        whiteSpace: 'pre-line',
        wordWrap: 'break-word',
      }}
    >
      <span
        style={{
          display: 'block',
          fontStyle: 'italic',
          marginBottom: '8px',
          opacity: 0.8,
        }}
      >
        The user made the following changes:
      </span>
      <CodeBlock
        // @ts-expect-error - diff is not always defined
        diff={tool.diff!}
        // @ts-expect-error - path is not always defined
        path={tool.path!}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />
    </div>
  );
});

export function CustomProviderSettingRequired({ text }: { text: string }) {
  const switchToProvider = useSwitchToProviderManager();
  return (
    <div className='rounded-md p-3 max-w-[360px] mx-auto bg-background/5'>
      <div className='flex items-center space-x-3' style={{ color: '#FF63CB' }}>
        <AlertCircle className='h-4 w-4 flex-shrink-0' />
        <span className='text-sm flex-1 font-semibold'>
          Please configure APIKey!
        </span>
        <button
          onClick={() => {
            let providerSettings: {
              providerId?: string;
            } = {};
            try {
              providerSettings = JSON.parse(text) as { providerId: string };
            } catch (e) {
              console.error(e);
            }
            // @ts-expect-error - providerId is not always defined
            switchToProvider(providerSettings?.providerId);
          }}
          className='flex items-center px-2 py-1 text-xs rounded transition-colors'
          style={{
            color: '#FF63CB',
            border: '1px solid #FF63CB',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#FF63CB20';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Settings className='mr-1 h-3 w-3' /> Configure Provider
        </button>
      </div>
    </div>
  );
}

// Error message component has been removed - no longer needed
