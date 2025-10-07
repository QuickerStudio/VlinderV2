import { ChatState } from '@/components/chat-view/chat';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ClaudeMessage,
  ClaudeSay,
  ExtensionMessage,
  isV1ClaudeMessage,
} from 'extension/shared/messages/extension-message';
import { ChatTool } from 'extension/shared/new-tools';
import { Resource } from 'extension/shared/messages/client-message';
import { useEvent } from 'react-use';
import { useSound } from './use-sound';
import { useExtensionState } from '@/context/extension-state-context';

export const useChatMessageHandling = (
  messages: ClaudeMessage[],
  updateState: (updates: Partial<ChatState>) => void,
  setAttachments: (attachments: Resource[]) => void
) => {
  const { playSound, stopSound } = useSound();
  const extensionState = useExtensionState();

  // Track which tools have already played alert sound
  const alertedToolsRef = useRef<Set<number>>(new Set());

  // Track previous tool states to detect loading -> pending transition
  const previousToolStatesRef = useRef<Map<number, string>>(new Map());

  // Track timer tools that are currently playing ticking sound
  const timerTickingRef = useRef<Set<number>>(new Set());

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;
      if (message.type === 'enableTextAreas') {
        updateState({
          sendDisabled: false,
          claudeAsk: undefined,
          enableButtons: false,
          primaryButtonText: undefined,
          secondaryButtonText: undefined,
        });
      }
    },
    [updateState]
  );

  useEvent('message', handleMessage);

  const handleAskMessage = useCallback(
    (message: ClaudeMessage) => {
      if (!isV1ClaudeMessage(message)) return;

      const toolStateMap: Record<string, Partial<ChatState>> = {
        request_limit_reached: {
          sendDisabled: true,
          claudeAsk: 'request_limit_reached',
          enableButtons: true,
          primaryButtonText: 'Proceed',
          secondaryButtonText: 'Start New Task',
        },
        api_req_failed: {
          sendDisabled: false,
          claudeAsk: 'api_req_failed',
          ...(message.autoApproved
            ? {}
            : {
                enableButtons: true,
                primaryButtonText: 'Retry',
                secondaryButtonText: 'Start New Task',
              }),
        },
        followup: {
          enableButtons: false,
          primaryButtonText: undefined,
          secondaryButtonText: undefined,
          sendDisabled: false,
          claudeAsk: 'followup',
        },
        command: {
          sendDisabled: false,
          claudeAsk: 'command',
          ...(message.autoApproved
            ? {}
            : {
                enableButtons: true,
                primaryButtonText: 'Run Command',
                secondaryButtonText: 'Reject',
              }),
        },
        command_output: {
          sendDisabled: false,
          claudeAsk: 'command_output',
          ...(message.autoApproved
            ? {}
            : {
                enableButtons: true,
                primaryButtonText: 'Exit Command',
                secondaryButtonText: undefined,
              }),
        },
        completion_result: {
          sendDisabled: false,
          claudeAsk: 'completion_result',
          enableButtons: true,
          primaryButtonText: 'Start New Task',
          secondaryButtonText: undefined,
        },
        resume_completed_task: {
          sendDisabled: false,
          claudeAsk: 'resume_completed_task',
          enableButtons: true,
          primaryButtonText: 'Start New Task',
          secondaryButtonText: undefined,
        },
        resume_task: {
          sendDisabled: false,
          claudeAsk: 'resume_task',
          enableButtons: true,
          primaryButtonText: 'Resume Task',
          secondaryButtonText: undefined,
        },
      };

      if (message.ask === 'tool') {
        const tool = JSON.parse(message.text || '{}') as ChatTool;
        const baseState = {
          sendDisabled: tool.approvalState === 'pending' ? false : true,
          claudeAsk: 'tool',
          enableButtons: tool.approvalState === 'pending' ? true : false,
        };

        // Play alert sound when AI finishes outputting tool content
        // Detect transition from 'loading' to 'pending' state
        const previousState = previousToolStatesRef.current.get(tool.ts);
        const isLoadingToPendingTransition =
          previousState === 'loading' && tool.approvalState === 'pending';

        console.log('[Alert Sound Debug]', {
          tool: tool.tool,
          ts: tool.ts,
          currentState: tool.approvalState,
          previousState,
          isTransition: isLoadingToPendingTransition,
          alertsEnabled: extensionState.alertsEnabled,
          alreadyAlerted: alertedToolsRef.current.has(tool.ts),
        });

        if (
          isLoadingToPendingTransition &&
          extensionState.alertsEnabled &&
          !alertedToolsRef.current.has(tool.ts)
        ) {
          if (tool.tool === 'attempt_completion' || tool.tool === 'ask_followup_question') {
            console.log('[Alert Sound] Playing ding for', tool.tool);
            playSound('ding');
            alertedToolsRef.current.add(tool.ts);
          }
        }

        // Timer tool sound effects
        if (tool.tool === 'timer') {
          // Start ticking sound when timer starts (loading state)
          if (tool.approvalState === 'loading' && !timerTickingRef.current.has(tool.ts) && extensionState.timerSoundEnabled) {
            console.log('[Timer Sound] Starting clock ticking for timer', tool.ts);
            playSound('clockTicking', true); // Loop the ticking sound
            timerTickingRef.current.add(tool.ts);
          }

          // Stop ticking and play completion sound when timer completes
          if (tool.approvalState === 'approved' && tool.timerStatus === 'completed' && timerTickingRef.current.has(tool.ts)) {
            console.log('[Timer Sound] Timer completed, stopping ticking and playing ding');
            stopSound('clockTicking');
            if (extensionState.timerSoundEnabled) {
              // Tag ding as a timer-intent sound so it respects the Timer toggle
              playSound('ding', false, 'timer');
            }
            timerTickingRef.current.delete(tool.ts);
          }

          // Stop ticking when timer is stopped by user
          if (tool.approvalState === 'approved' && tool.timerStatus === 'stopped' && timerTickingRef.current.has(tool.ts)) {
            console.log('[Timer Sound] Timer stopped by user, stopping ticking sound');
            stopSound('clockTicking');
            timerTickingRef.current.delete(tool.ts);
          }

          // Stop ticking and play error sound on error
          if (tool.approvalState === 'error' && timerTickingRef.current.has(tool.ts)) {
            console.log('[Timer Sound] Timer error, stopping ticking and playing pop');
            stopSound('clockTicking');
            if (extensionState.timerSoundEnabled) {
              playSound('pop', false, 'timer');
            }
            timerTickingRef.current.delete(tool.ts);
          }

          // Clean up ticking sound if timer sound is disabled
          if (!extensionState.timerSoundEnabled && timerTickingRef.current.has(tool.ts)) {
            console.log('[Timer Sound] Timer sound disabled, stopping ticking');
            stopSound('clockTicking');
            timerTickingRef.current.delete(tool.ts);
          }
        }

        // Update previous state
        if (tool.approvalState) {
          previousToolStatesRef.current.set(tool.ts, tool.approvalState);
        }

        if (
          tool.tool === 'attempt_completion' &&
          tool.approvalState === 'approved'
        ) {
          updateState({
            ...baseState,
            enableButtons: true,
            sendDisabled: false,
            claudeAsk: 'completion_result',
            primaryButtonText: 'Start New Task',
            secondaryButtonText: undefined,
          });
          return;
        }

        if (
          tool.approvalState !== 'pending' &&
          tool.tool !== 'attempt_completion'
        ) {
          updateState({
            ...baseState,
            enableButtons: false,
            primaryButtonText: undefined,
            secondaryButtonText: undefined,
          });
          return;
        }
        if (tool.approvalState !== 'pending') {
          return;
        }

        const toolButtonMap: Record<ChatTool['tool'], Partial<ChatState>> = {
          file_editor: {
            ...baseState,
            primaryButtonText: 'Approve',
            secondaryButtonText: 'Reject',
          },
          attempt_completion: {
            ...baseState,
            // claudeAsk: "completion_result",
            primaryButtonText: 'Mark as Completed',
            secondaryButtonText: 'Mark as Incomplete',
            sendDisabled: false,
            enableButtons: true,
          },
          submit_review: {
            ...baseState,
            primaryButtonText: 'Submit Review',
            secondaryButtonText: 'Cancel',
          },
          write_to_file: {
            ...baseState,
            primaryButtonText: 'Save',
            secondaryButtonText: 'Cancel',
          },
          execute_command: {
            ...baseState,
            primaryButtonText: 'Run Command',
            secondaryButtonText: 'Cancel',
          },
          ask_followup_question: {
            ...baseState,
            sendDisabled: false,
            enableButtons: false,
            primaryButtonText: undefined,
            secondaryButtonText: undefined,
          },
          read_file: {
            ...baseState,
            primaryButtonText: 'Read File',
            secondaryButtonText: 'Cancel',
          },
          list_files: {
            ...baseState,
            primaryButtonText: 'List Files',
            secondaryButtonText: 'Cancel',
          },
          url_screenshot: {
            ...baseState,
            primaryButtonText: 'Take Screenshot',
            secondaryButtonText: 'Cancel',
          },
          search_files: {
            ...baseState,
            primaryButtonText: 'Search Files',
            secondaryButtonText: 'Cancel',
          },
          server_runner: {
            ...baseState,
            primaryButtonText: 'Run Server',
            secondaryButtonText: 'Cancel',
          },
          web_search: {
            ...baseState,
            primaryButtonText: 'Search',
            secondaryButtonText: 'Cancel',
          },
          explore_repo_folder: {
            ...baseState,
            primaryButtonText: 'List Definitions',
            secondaryButtonText: 'Cancel',
          },
          add_interested_file: {
            ...baseState,
            primaryButtonText: 'Add File',
            secondaryButtonText: 'Cancel',
          },
          search_symbol: {
            ...baseState,
            primaryButtonText: 'Search Symbols',
            secondaryButtonText: 'Cancel',
          },
          file_changes_plan: {
            ...baseState,
            primaryButtonText: 'Proceed with Plan',
            secondaryButtonText: 'Cancel',
          },
          exit_agent: {
            ...baseState,
            primaryButtonText: 'Exit Agent',
            secondaryButtonText: 'Cancel',
          },
          spawn_agent: {
            ...baseState,
            primaryButtonText: 'Spawn Agent',
            secondaryButtonText: 'Cancel',
          },
          move: {
            ...baseState,
            primaryButtonText: 'Move',
            secondaryButtonText: 'Cancel',
          },
          remove: {
            ...baseState,
            primaryButtonText: 'Remove',
            secondaryButtonText: 'Cancel',
          },
          rename: {
            ...baseState,
            primaryButtonText: 'Rename',
            secondaryButtonText: 'Cancel',
          },
          git_bash: {
            ...baseState,
            primaryButtonText: 'Run Command',
            secondaryButtonText: 'Cancel',
          },
          kill_bash: {
            ...baseState,
            primaryButtonText: 'Kill Terminal',
            secondaryButtonText: 'Cancel',
          },
          read_progress: {
            ...baseState,
            primaryButtonText: 'Read Progress',
            secondaryButtonText: 'Cancel',
          },
          terminal: {
            ...baseState,
            primaryButtonText: 'Execute',
            secondaryButtonText: 'Cancel',
          },
          get_errors: {
            ...baseState,
            primaryButtonText: 'Get Errors',
            secondaryButtonText: 'Cancel',
          },
          replace_string_in_file: {
            ...baseState,
            primaryButtonText: 'Replace',
            secondaryButtonText: 'Cancel',
          },
          multi_replace_string_in_file: {
            ...baseState,
            primaryButtonText: 'Replace All',
            secondaryButtonText: 'Cancel',
          },
          insert_edit_into_file: {
            ...baseState,
            primaryButtonText: 'Insert',
            secondaryButtonText: 'Cancel',
          },
          fetch_webpage: {
            ...baseState,
            primaryButtonText: 'Fetch',
            secondaryButtonText: 'Cancel',
          },
          get_vscode_api: {
            ...baseState,
            primaryButtonText: 'Search API',
            secondaryButtonText: 'Cancel',
          },
          grep_search: {
            ...baseState,
            primaryButtonText: 'Search',
            secondaryButtonText: 'Cancel',
          },
          pattern_search: {
            ...baseState,
            primaryButtonText: 'Search',
            secondaryButtonText: 'Cancel',
          },
          get_terminal_output: {
            ...baseState,
            primaryButtonText: 'Get Output',
            secondaryButtonText: 'Cancel',
          },
          think: {
            ...baseState,
            primaryButtonText: 'Continue',
            secondaryButtonText: 'Cancel',
          },
          fast_editor: {
            ...baseState,
            primaryButtonText: 'Apply Edits',
            secondaryButtonText: 'Cancel',
          },
          timer: {
            ...baseState,
            primaryButtonText: 'Wait',
            secondaryButtonText: 'Cancel',
          },
          local_time: {
            ...baseState,
            primaryButtonText: undefined,
            secondaryButtonText: undefined,
            enableButtons: false,
          },
        };

        const updates = toolButtonMap[tool.tool] || {
          ...baseState,
          primaryButtonText: 'Proceed',
          secondaryButtonText: 'Cancel',
        };

        updateState(updates);
      } else {
        const updates = toolStateMap[message.ask ?? ''];
        if (updates) {
          updateState(updates);
        }
      }
    },
    [updateState, extensionState.alertsEnabled, extensionState.timerSoundEnabled, playSound, stopSound]
  );

  const handleSayMessage = useCallback(
    (message: ClaudeMessage) => {
      const reset: Partial<ChatState> = {
        isAbortingRequest: false,
        sendDisabled: false,
        claudeAsk: undefined,
        enableButtons: false,
        primaryButtonText: undefined,
        secondaryButtonText: undefined,
      };
      const sayStateMap: Partial<Record<ClaudeSay, Partial<ChatState>>> = {
        api_req_started: {
          inputValue: '',
          isAbortingRequest: false,
          sendDisabled: true,
          selectedImages: [],
          claudeAsk: undefined,
          enableButtons: false,
        },
        payment_required: reset,
        unauthorized: reset,
        custom_provider_error: reset,
      };

      const updates = sayStateMap[message.say ?? 'text'];
      if (updates) {
        console.log('Setting state', updates);
        updateState(updates);
      }
    },
    [updateState]
  );

  useEffect(() => {
    const msgs = messages.slice().reverse();
    const lastMessage = msgs[0];
    const lastAskMessage = msgs.find((msg) => msg.type === 'ask');
    const secondToLastAskMessage = msgs.find(
      (msg) => msg.ask === 'tool' && msg.ts !== lastAskMessage?.ts
    );

    // Special case: execute_command after attempt_completion
    if (
      lastAskMessage?.ask === 'tool' &&
      secondToLastAskMessage?.ask === 'tool' &&
      !lastMessage.say
    ) {
      const lastTool = JSON.parse(lastAskMessage.text || '{}') as ChatTool;
      const secondToLastTool = JSON.parse(
        secondToLastAskMessage.text || '{}'
      ) as ChatTool;

      if (
        lastTool.tool === 'execute_command' &&
        secondToLastTool.tool === 'attempt_completion'
      ) {
        const updates =
          lastTool.approvalState === 'pending'
            ? {
                sendDisabled: false,
                claudeAsk: 'command',
                enableButtons: true,
                primaryButtonText: 'Run Command',
                secondaryButtonText: 'Cancel',
              }
            : {
                sendDisabled: false,
                claudeAsk: 'completion_result',
                enableButtons: true,
                primaryButtonText: 'Start New Task',
                secondaryButtonText: undefined,
              };
        updateState(updates);
        return;
      }
    }
    if (lastMessage?.say) {
      handleSayMessage(lastMessage);
    } else if (lastAskMessage) {
      console.log(lastAskMessage);
      handleAskMessage(lastAskMessage);
    } else if (!lastMessage && !lastAskMessage) {
      updateState({
        sendDisabled: false,
        claudeAsk: undefined,
        enableButtons: false,
        primaryButtonText: undefined,
        secondaryButtonText: undefined,
      });
      setAttachments([]);
    }
  }, [messages]);

  return { handleAskMessage, handleSayMessage };
};
