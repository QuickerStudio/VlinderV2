import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import { ChatState, ChatViewProps } from './chat';
import { isV1ClaudeMessage } from 'extension/shared/messages/extension-message';
import { useAtom } from 'jotai';
import { attachmentsAtom, chatStateAtom, syntaxHighlighterAtom } from './atoms';
import { useExtensionState } from '@/context/extension-state-context';
import { useChatMessageHandling } from '@/hooks/use-message-handler';
import { useImageHandling } from '@/hooks/use-image-handler';
import { useMessageRunning } from '@/hooks/use-message-running';
import { useSelectImages } from '@/hooks/use-select-images';
import { getSyntaxHighlighterStyleFromTheme } from '@/utils/get-syntax-highlighter-style-from-theme';
import { vscode } from '@/utils/vscode';
import { ChatInput } from './chat-input';
import ButtonSection from './button-section';
import ChatScreen from './chat-screen';
import ChatMessages from './chat-messages';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import TaskHeader from '../task-header/task-header';
import { AlertCircle } from 'lucide-react';
import AnnouncementBanner from '../announcement-banner';

const ChatView: React.FC<ChatViewProps> = ({
  isHidden,
  selectedModelSupportsImages,
  selectedModelSupportsPromptCache,
  showHistoryView,
}) => {
  const [state, setState] = useAtom(chatStateAtom);
  const [isMaxContextReached, setIsMaxContextReached] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  // 监听压缩状态变化
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'compressionStatus') {
        if (message.status === 'started') {
          setIsCompressing(true);
        } else if (
          message.status === 'completed' ||
          message.status === 'error'
        ) {
          setIsCompressing(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const updateState = useCallback(
    (updates: Partial<ChatState>) => {
      setState((prev) => ({ ...prev, ...updates }));
    },
    [setState]
  );

  // Use the useSelectImages hook to handle image selection
  useSelectImages();

  const [attachments, setAttachments] = useAtom(attachmentsAtom);
  const [syntaxHighlighterStyle, setSyntaxHighlighterStyle] = useAtom(
    syntaxHighlighterAtom
  );

  const {
    claudeMessages: messages,
    themeName: vscodeThemeName,
    uriScheme,
    user,
    currentTask,
  } = useExtensionState();

  const [isPending, startTransition] = useTransition();

  const handleClaudeAskResponse = useCallback(
    (text: string) => {
      // reset the of the buttons
      updateState({
        primaryButtonText: undefined,
        secondaryButtonText: undefined,
        enableButtons: false,
      });
      vscode.postMessage({
        type: 'askResponse',
        askResponse: 'messageResponse',
        text,
        images: state.selectedImages,
      });
    },
    [state.selectedImages, updateState]
  );

  const updateButtonState = useCallback((updates: Partial<ChatState>) => {
    setState((prev) => {
      const shouldUpdate =
        prev.enableButtons !== updates.enableButtons ||
        prev.primaryButtonText !== updates.primaryButtonText ||
        prev.secondaryButtonText !== updates.secondaryButtonText ||
        prev.claudeAsk !== updates.claudeAsk ||
        prev.sendDisabled !== updates.sendDisabled;

      if (!shouldUpdate) return prev;
      return { ...prev, ...updates };
    });
  }, []);

  const handleButtonStateUpdate = useCallback(
    (updates: Partial<ChatState>) => {
      startTransition(() => {
        if (
          'enableButtons' in updates ||
          'primaryButtonText' in updates ||
          'secondaryButtonText' in updates ||
          'claudeAsk' in updates ||
          'sendDisabled' in updates
        ) {
          updateButtonState(updates);
        } else {
          setState((prev) => ({ ...prev, ...updates }));
        }
      });
    },
    [updateButtonState]
  );

  const { shouldDisableImages, handlePaste } = useImageHandling(
    selectedModelSupportsImages,
    state,
    updateState
  );

  const firstTaskMsg = useMemo(() => messages.at(0), [messages]);
  const cleanedMessages = useMemo(() => messages.slice(1), [messages]);

  const elapsedTime = useMemo(() => {
    if (!firstTaskMsg) return undefined;
    return messages.reduce((acc, msg) => {
      if (isV1ClaudeMessage(msg) && msg.completedAt) {
        return acc + msg.completedAt - msg.ts;
      }
      return acc;
    }, 0);
  }, [messages, firstTaskMsg]);

  const isMessageRunning = useMessageRunning(messages);

  useEffect(() => {
    if (!currentTask?.ts) {
      updateState({
        inputValue: '',
        sendDisabled: false,
        selectedImages: [],
        claudeAsk: undefined,
        enableButtons: false,
        primaryButtonText: undefined,
        secondaryButtonText: undefined,
      });
    }
  }, [currentTask?.ts]);

  useChatMessageHandling(
    cleanedMessages,
    handleButtonStateUpdate,
    setAttachments
  );

  const visibleMessages = useMemo(() => {
    return cleanedMessages.filter((message) => {
      if (message.say === 'shell_integration_warning') {
        return true;
      }
      if (
        message.ask === 'tool' &&
        (message.text === '' ||
          message.text === '{}' ||
          !message.text?.includes('tool":'))
      ) {
        return false;
      }
      if (
        (message.ask === 'completion_result' && message.text === '') ||
        ['resume_task', 'resume_completed_task'].includes(message.ask!)
      ) {
        return false;
      }
      if (['api_req_finished', 'api_req_retried'].includes(message.say!)) {
        return false;
      }
      // 隐藏自动恢复任务的消息，但保留在历史上下文中
      if (
        message.say === 'user_feedback' &&
        (message.text === "Let's resume the task from where we left off" ||
          message.text ===
            "Let's continue with the task, from where we left off." ||
          message.text === 'Please continue the task from where we left off.' ||
          (message.text &&
            message.text.includes('continue the task from where we left off')))
      ) {
        return false;
      }
      if (message.say === 'api_req_started') return true;
      if (
        message.say === 'text' &&
        (message.text ?? '') === '' &&
        (message.images?.length ?? 0) === 0
      ) {
        return false;
      }
      return true;
    });
  }, [cleanedMessages]);

  useEffect(() => {
    const hasMaxContext = visibleMessages.some(
      (msg) =>
        msg.say === 'chat_finished' ||
        (msg.ask === 'tool' && msg.text?.includes('"tool":"chat_finished"'))
    );

    if (hasMaxContext && !isMaxContextReached && !isCompressing) {
      setIsMaxContextReached(true);
      setIsCompressing(true);

      // 自动触发压缩
      vscode.postMessage({
        type: 'compressContext',
        messages: visibleMessages,
        currentTask,
      });
    }
  }, [visibleMessages, isMaxContextReached, isCompressing, currentTask]);

  // 处理压缩结果
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === 'contextCompressionComplete') {
        // 压缩成功，重置状态继续对话
        setIsMaxContextReached(false);
        setIsCompressing(false);
      } else if (message.type === 'contextCompressionError') {
        // 压缩失败，阻止缓存写入，保持当前状态
        setIsCompressing(false);
        // 不重置 isMaxContextReached，保持阻塞状态
        console.error(
          'Context compression failed, blocking further context writes'
        );
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (!vscodeThemeName) return;
    const theme = getSyntaxHighlighterStyleFromTheme(vscodeThemeName);
    if (theme) {
      setSyntaxHighlighterStyle(theme);
    }
  }, [vscodeThemeName]);

  const handleSendMessage = useCallback(
    (input?: string) => {
      let text = state.inputValue?.trim();
      if (!!input && input.length > 1) {
        text = input?.trim();
      }

      if (text || state.selectedImages.length > 0) {
        if (!currentTask) {
          vscode.postMessage({
            type: 'newTask',
            text,
            images: state.selectedImages,
            attachements: attachments,
          });
        } else if (state.claudeAsk) {
          handleClaudeAskResponse(text);
        } else {
          vscode.postMessage({
            type: 'askResponse',
            askResponse: 'messageResponse',
            text,
            images: state.selectedImages,
            attachements: attachments,
          });
        }
        updateState({
          inputValue: '',
          sendDisabled: true,
          selectedImages: [],
          claudeAsk: undefined,
          enableButtons: false,
          primaryButtonText: undefined,
          secondaryButtonText: undefined,
          prevInputValue: state.inputValue,
          prevImages: state.selectedImages,
        });
        setAttachments([]);
      }
    },
    [
      state.inputValue,
      state.selectedImages,
      state.claudeAsk,
      currentTask,
      updateState,
      setAttachments,
      attachments,
      handleClaudeAskResponse,
    ]
  );

  const handlePrimaryButtonClick = useCallback(() => {
    switch (state.claudeAsk) {
      case 'api_req_failed':
      case 'request_limit_reached':
      case 'command':
      case 'command_output':
      case 'tool':
      case 'resume_task':
        setTimeout(() => {
          vscode.postMessage({
            type: 'askResponse',
            askResponse: 'yesButtonTapped',
            text: "Let's resume the task from where we left off",
          });
        }, 100);
        if (state.claudeAsk === 'tool') {
          return;
        }
        break;
      case 'completion_result':
      case 'resume_completed_task':
        vscode.postMessage({ type: 'clearTask' });
        break;
    }
    updateState({
      sendDisabled: true,
      claudeAsk: undefined,
      primaryButtonText: undefined,
      secondaryButtonText: undefined,
      enableButtons: false,
    });
  }, [state.claudeAsk, updateState]);

  const handleSecondaryButtonClick = useCallback(() => {
    switch (state.claudeAsk) {
      case 'request_limit_reached':
      case 'api_req_failed':
        vscode.postMessage({ type: 'clearTask' });
        break;
      case 'command':
      case 'tool':
        vscode.postMessage({
          type: 'askResponse',
          askResponse: 'noButtonTapped',
        });
        break;
    }
    updateState({
      sendDisabled: true,
      claudeAsk: undefined,
      primaryButtonText: undefined,
      secondaryButtonText: undefined,
      enableButtons: false,
    });
  }, [state.claudeAsk, updateState]);

  return (
    <div
      className={`h-full chat-container ${isHidden ? 'hidden' : ''}`}
      style={{
        display: isHidden ? 'none' : 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        className='chat-content relative'
        style={{
          borderTop: '1px solid var(--section-border)',
          flex: '1 1 0%',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        <AnnouncementBanner />
        {!!currentTask && firstTaskMsg ? (
          <>
            <TaskHeader
              key={`header-${firstTaskMsg.ts}`}
              firstMsg={firstTaskMsg}
              tokensIn={currentTask.tokensIn}
              tokensOut={currentTask.tokensOut}
              doesModelSupportPromptCache={selectedModelSupportsPromptCache}
              cacheWrites={currentTask.cacheWrites}
              cacheReads={currentTask.cacheReads}
              totalCost={currentTask.totalCost}
              onClose={() => vscode.postMessage({ type: 'clearTask' })}
              isHidden={isHidden}
            />
            <ChatMessages
              key={`messages-${firstTaskMsg.ts}`}
              taskId={firstTaskMsg.ts}
              visibleMessages={visibleMessages}
              syntaxHighlighterStyle={syntaxHighlighterStyle}
            />
          </>
        ) : (
          <>
            <ChatScreen />
          </>
        )}
      </div>
      {!isMaxContextReached && (
        <div className='mb-0 mt-auto' style={{ padding: '0 6px 6px 6px' }}>
          {!!currentTask && (
            <ButtonSection
              primaryButtonText={state.primaryButtonText}
              secondaryButtonText={state.secondaryButtonText}
              enableButtons={state.enableButtons}
              isRequestRunning={isMessageRunning}
              handlePrimaryButtonClick={handlePrimaryButtonClick}
              handleSecondaryButtonClick={handleSecondaryButtonClick}
            />
          )}

          <ChatInput
            state={state}
            updateState={updateState}
            onSendMessage={handleSendMessage}
            shouldDisableImages={shouldDisableImages}
            handlePaste={handlePaste}
            isRequestRunning={isMessageRunning}
            isInTask={!!currentTask}
            isHidden={isHidden}
            handlePrimaryButtonClick={handlePrimaryButtonClick}
            isCompressing={isCompressing}
            isMaxContextReached={isMaxContextReached}
          />
        </div>
      )}
      {isMaxContextReached && (
        <div className='sticky bottom-0 w-full bg-blue-50 dark:bg-blue-950/20 border-t border-blue-200 dark:border-blue-800/30 p-4'>
          <div className='flex items-center gap-2'>
            {isCompressing ? (
              <>
                <div className='h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin' />
                <span className='text-sm font-medium'>
                  Optimizing conversation context...
                </span>
              </>
            ) : (
              <>
                <AlertCircle className='h-4 w-4 text-destructive' />
                <span className='text-sm font-medium text-destructive'>
                  Context optimization failed - conversation blocked
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ChatView, (prevProps, nextProps) => {
  return (
    prevProps.isHidden === nextProps.isHidden &&
    prevProps.selectedModelSupportsImages ===
      nextProps.selectedModelSupportsImages &&
    prevProps.selectedModelSupportsPromptCache ===
      nextProps.selectedModelSupportsPromptCache
  );
});
