import { vscode } from '@/utils/vscode';
import React, {
  memo,
  useCallback,
  useRef,
  useEffect,
  KeyboardEvent,
} from 'react';
import InputArea from './input-area';
import { ChatState } from './chat';

interface ChatInputProps {
  state: ChatState;
  updateState: (updates: Partial<ChatState>) => void;
  onSendMessage: (text?: string) => void;
  shouldDisableImages: boolean;
  handlePaste: (e: React.ClipboardEvent) => void;
  isRequestRunning: boolean;
  isInTask: boolean;
  isHidden: boolean;
  handlePrimaryButtonClick: () => void;
  isCompressing?: boolean;
  isMaxContextReached?: boolean;
}

export const ChatInput = memo(function ChatInput({
  state,
  updateState,
  onSendMessage,
  shouldDisableImages,
  handlePaste,
  isRequestRunning,
  isInTask,
  isHidden,
  handlePrimaryButtonClick,
  isCompressing = false,
  isMaxContextReached = false,
}: ChatInputProps) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Handle Ctrl+Enter: interrupt and send new message
  const handleInterruptAndSend = useCallback(() => {
    if (isRequestRunning) {
      // Cancel current request
      vscode.postMessage({ type: 'cancelCurrentRequest' });

      // Wait a bit for cancellation to be processed, then send new message
      setTimeout(() => {
        onSendMessage();
      }, 150);
    } else {
      // If not running, just send normally
      onSendMessage();
    }
  }, [isRequestRunning, onSendMessage]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      const isComposing = event.nativeEvent?.isComposing ?? false;
      if (event.key === 'Enter' && !event.shiftKey && !isComposing) {
        event.preventDefault();

        // Handle Ctrl+Enter: always allow interrupt and send
        if (event.ctrlKey) {
          handleInterruptAndSend();
        } else if (!isRequestRunning && !state.sendDisabled) {
          // Normal Enter: only send if not running and not disabled
          onSendMessage();
        }
        // If running and not Ctrl+Enter, or if sendDisabled, do nothing (ignore the Enter key)
      }
    },
    [
      handleInterruptAndSend,
      onSendMessage,
      isRequestRunning,
      state.sendDisabled,
    ]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isHidden && !state.enableButtons) {
        textAreaRef.current?.focus();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [isHidden, state.enableButtons]);

  return (
    <InputArea
      inputRef={textAreaRef}
      inputValue={state.inputValue}
      setInputValue={(value) => updateState({ inputValue: value })}
      sendDisabled={state.sendDisabled}
      handleSendMessage={onSendMessage}
      placeholderText={
        isInTask ? 'Type a message...' : 'Type your task here...'
      }
      selectedImages={state.selectedImages}
      setSelectedImages={(images) => updateState({ selectedImages: images })}
      shouldDisableImages={shouldDisableImages}
      selectImages={() => vscode.postMessage({ type: 'selectImages' })}
      thumbnailsHeight={state.thumbnailsHeight}
      handleThumbnailsHeightChange={(height) =>
        updateState({ thumbnailsHeight: height })
      }
      isRequestRunning={isRequestRunning}
      isInTask={isInTask}
      handleKeyDown={handleKeyDown}
      handlePaste={handlePaste}
      enableButtons={state.enableButtons}
      primaryButtonText={state.primaryButtonText}
      handlePrimaryButtonClick={handlePrimaryButtonClick}
      isCompressing={isCompressing}
      isMaxContextReached={isMaxContextReached}
    />
  );
});
