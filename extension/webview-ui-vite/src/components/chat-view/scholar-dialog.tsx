import React, { useRef, useEffect, KeyboardEvent, useState } from 'react';
import { Button } from '../ui/button';
import { BookOpen, Send, X } from 'lucide-react';

export interface ScholarDialogState {
  isVisible: boolean;
  isLoading: boolean;
  questionText: string;
}

export interface ScholarDialogActions {
  toggleVisibility: () => void;
  setQuestionText: (text: string) => void;
  sendQuestion: (onResponseReceived: (response: string) => void) => void;
  abortQuestion: () => void;
}

interface ScholarDialogProps {
  state: ScholarDialogState;
  actions: ScholarDialogActions;
  onResponseReceived: (response: string) => void;
}

/**
 * Scholar Dialog component for asking Scholar Agent questions
 * Similar to Lightning but searches through .Scholar files
 */
export const ScholarDialog: React.FC<ScholarDialogProps> = ({
  state,
  actions,
  onResponseReceived,
}) => {
  const textAreaRef = useRef<HTMLInputElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Focus the textarea when the dialog becomes visible and show tooltip
  useEffect(() => {
    if (state.isVisible && textAreaRef.current) {
      setTimeout(() => {
        textAreaRef.current?.focus();
      }, 100);

      // Show tooltip for 2 seconds
      setShowTooltip(true);
      const timer = setTimeout(() => {
        setShowTooltip(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [state.isVisible]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const isComposing = event.nativeEvent?.isComposing ?? false;
    if (event.key === 'Enter' && !isComposing) {
      event.preventDefault();
      if (!state.isLoading && state.questionText.trim()) {
        handleSendQuestion();
      }
    }
    if (event.key === 'Escape') {
      actions.toggleVisibility();
    }
  };

  const handleSendQuestion = () => {
    actions.sendQuestion((response: string) => {
      // Call the original callback
      onResponseReceived(response);
    });
  };

  const handleAbortQuestion = () => {
    actions.abortQuestion();
  };

  if (!state.isVisible) {
    return null;
  }

  return (
    <div
      className='fixed z-50 bg-background rounded-lg shadow-lg transition-all duration-300'
      style={{
        width: '400px',
        height: '80px',
        bottom: '52px', // Position above the input area
        right: '20px', // Align with right side of input area
        border: '2px solid #8B5CF6', // Purple border for Scholar
      }}
    >
      <div className='relative w-full h-full flex items-center px-3'>
        {/* Scholar icon */}
        <div className='flex-shrink-0 mr-3'>
          <BookOpen className='w-5 h-5 text-purple-500' />
        </div>

        {/* Input field */}
        <input
          ref={textAreaRef}
          type='text'
          value={state.questionText}
          onChange={(e) => actions.setQuestionText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Ask Scholar about your knowledge base...'
          className='flex-1 bg-transparent border-none outline-none text-sm placeholder-muted-foreground'
          disabled={state.isLoading}
        />

        {/* Close button */}
        <Button
          variant='ghost'
          size='sm'
          className='flex-shrink-0 w-6 h-6 p-0 mr-2 hover:bg-muted'
          onClick={actions.toggleVisibility}
        >
          <X className='w-4 h-4' />
        </Button>

        {/* Send button */}
        <div className='flex-shrink-0'>
          <div className='relative'>
            {/* Tooltip */}
            {showTooltip && (
              <div className='absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap z-10'>
                Press Enter to send
                <div className='absolute top-full right-2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800'></div>
              </div>
            )}
            <Button
              variant='ghost'
              size='sm'
              className='w-8 h-8 p-0 rounded-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30'
              disabled={!state.isLoading && !state.questionText.trim()}
              onClick={
                state.isLoading ? handleAbortQuestion : handleSendQuestion
              }
            >
              {state.isLoading ? (
                <div className='w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin' />
              ) : (
                <Send className='w-4 h-4 text-purple-500' />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Loading indicator bar */}
      {state.isLoading && (
        <div className='absolute bottom-0 left-0 right-0 h-1 bg-purple-500/20 rounded-b-lg overflow-hidden'>
          <div className='h-full bg-purple-500 animate-pulse' />
        </div>
      )}
    </div>
  );
};

export default ScholarDialog;
