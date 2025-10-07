import { useState, useCallback } from 'react';
import { rpcClient } from '@/lib/rpc-client';
import {
  ScholarDialogState,
  ScholarDialogActions,
} from '@/components/chat-view/scholar-dialog';

interface UseScholarDialogReturn {
  state: ScholarDialogState;
  actions: ScholarDialogActions;
}

/**
 * React hook for managing the Scholar dialog functionality
 * Handles state management, Scholar communication, and response handling
 */
export const useScholarDialog = (): UseScholarDialogReturn => {
  const [state, setState] = useState<ScholarDialogState>({
    isVisible: false,
    isLoading: false,
    questionText: '',
  });

  const toggleVisibility = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isVisible: !prev.isVisible,
    }));
  }, []);

  const setQuestionText = useCallback((text: string) => {
    setState((prev) => ({
      ...prev,
      questionText: text,
    }));
  }, []);

  const sendQuestion = useCallback(
    async (onResponseReceived: (response: string) => void) => {
      if (!state.questionText.trim()) {
        return;
      }

      setState((prev) => ({
        ...prev,
        isLoading: true,
      }));

      try {
        console.log('[Scholar] Sending question to Scholar Agent...');

        // Use RPC client to call the Scholar question endpoint
        const response = await rpcClient.askScholar.use({
          question: state.questionText.trim(),
        });

        if (response.success && response.answer) {
          console.log('[Scholar] Received Scholar response');
          onResponseReceived(response.answer);

          // Reset the question text after successful response
          setState((prev) => ({
            ...prev,
            questionText: '',
            isLoading: false,
          }));
        } else {
          console.error('Failed to get Scholar response:', response.error);
          setState((prev) => ({
            ...prev,
            isLoading: false,
          }));
        }
      } catch (error) {
        console.error('Error sending question:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
        }));
      }
    },
    [state.questionText]
  );

  const abortQuestion = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
    }));
  }, []);

  const actions: ScholarDialogActions = {
    toggleVisibility,
    setQuestionText,
    sendQuestion,
    abortQuestion,
  };

  return {
    state,
    actions,
  };
};
