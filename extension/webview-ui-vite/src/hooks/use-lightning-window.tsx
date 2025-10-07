import { useState, useCallback } from 'react';
import { rpcClient } from '@/lib/rpc-client';
import { vscode } from '@/utils/vscode';

export interface LightningWindowState {
  isVisible: boolean;
  isLoading: boolean;
  questionText: string;
}

export interface LightningWindowActions {
  toggleVisibility: () => void;
  setQuestionText: (text: string) => void;
  sendQuestion: (
    onResponseReceived: (response: string) => void
  ) => Promise<void>;
  abortQuestion: () => void;
  reset: () => void;
}

export interface UseLightningWindowReturn {
  state: LightningWindowState;
  actions: LightningWindowActions;
}

/**
 * React hook for managing the Lightning window functionality
 * Handles state management, Lightning communication, and response handling
 */
export const useLightningWindow = (): UseLightningWindowReturn => {
  const [state, setState] = useState<LightningWindowState>({
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
        console.log('[Lightning] Sending question to Lightning...');

        // Use RPC client to call the Lightning question endpoint
        const response = await rpcClient.askLightning.use({
          question: state.questionText.trim(),
        });

        if (response.success && response.answer) {
          console.log('[Lightning] Received Lightning response');
          onResponseReceived(response.answer);

          // Reset the question text after successful response
          setState((prev) => ({
            ...prev,
            questionText: '',
            isLoading: false,
          }));
        } else {
          console.error('Failed to get Lightning response:', response.error);
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
    console.log('[Lightning] Aborting Lightning request...');

    // Send abort message to extension
    vscode.postMessage({ type: 'cancelLightning' });

    // Reset loading state
    setState((prev) => ({
      ...prev,
      isLoading: false,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isVisible: false,
      isLoading: false,
      questionText: '',
    });
  }, []);

  return {
    state,
    actions: {
      toggleVisibility,
      setQuestionText,
      sendQuestion,
      abortQuestion,
      reset,
    },
  };
};
