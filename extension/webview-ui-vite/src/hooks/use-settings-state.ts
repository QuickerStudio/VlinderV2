import { useCallback, useState } from 'react';
import { GlobalState } from 'extension/providers/state/global-state-manager';
import { useExtensionState } from '../context/extension-state-context';
import { vscode } from '../utils/vscode';

export function useSettingsState() {
  const extensionState = useExtensionState();
  const [readOnly, setReadOnly] = useState(
    extensionState.alwaysAllowReadOnly || false
  );
  const [autoCloseTerminal, setAutoCloseTerminal] = useState(
    extensionState.autoCloseTerminal || false
  );
  const [gitHandlerEnabled, setGitHandlerEnabled] = useState(
    extensionState.gitHandlerEnabled ?? true
  );
  const [gitCommitterType, setGitCommitterType] = useState(
    extensionState.gitCommitterType ?? 'anthropic'
  );
  const [autoSummarize, setAutoSummarize] = useState(
    extensionState.autoSummarize || false
  );
  const [soundEnabled, setSoundEnabled] = useState(
    extensionState.soundEnabled ?? true
  );
  const [alertsEnabled, setAlertsEnabled] = useState(
    extensionState.alertsEnabled ?? true
  );
  const [timerSoundEnabled, setTimerSoundEnabled] = useState(
    extensionState.timerSoundEnabled ?? true
  );
  const [commandTimeout, setCommandTimeout] = useState(
    extensionState.commandTimeout
  );
  const [inlineEditingType, setInlineEditingType] = useState(
    extensionState.inlineEditModeType || 'full'
  );
  const [customInstructions, setCustomInstructions] = useState(
    extensionState.customInstructions || ''
  );
  const [autoSkipWrite, setAutoSkipWrite] = useState(
    extensionState.skipWriteAnimation || false
  );

  const [terminalCompressionThreshold, setTerminalCompressionThreshold] =
    useState<number | undefined>(extensionState.terminalCompressionThreshold);

  const handleAutoSkipWriteChange = useCallback((checked: boolean) => {
    setAutoSkipWrite(checked);
    vscode.postMessage({ type: 'skipWriteAnimation', bool: checked });
  }, []);

  const handleAutoSummarizeChange = useCallback(
    (checked: boolean) => {
      setAutoSummarize(checked);
      extensionState.setAutoSummarize(checked);
      vscode.postMessage({ type: 'autoSummarize', bool: checked });
    },
    [extensionState]
  );

  const handleCommandTimeout = useCallback((val: number) => {
    setCommandTimeout(val);
    vscode.postMessage({ type: 'commandTimeout', commandTimeout: val });
  }, []);

  const handleInlineEditingTypeChange = useCallback((type: 'full' | 'diff') => {
    setInlineEditingType(type);
    vscode.postMessage({
      type: 'setInlineEditMode',
      inlineEditOutputType: type,
    });
  }, []);

  const handleSetReadOnly = useCallback((checked: boolean) => {
    setReadOnly(checked);
    vscode.postMessage({ type: 'alwaysAllowReadOnly', bool: checked });
  }, []);

  const handleSetAutoCloseTerminal = useCallback((checked: boolean) => {
    setAutoCloseTerminal(checked);
    vscode.postMessage({ type: 'autoCloseTerminal', bool: checked });
  }, []);

  const handleSetGitHandlerEnabled = useCallback((checked: boolean) => {
    setGitHandlerEnabled(checked);
    vscode.postMessage({ type: 'toggleGitHandler', enabled: checked });
  }, []);

  const handleSetGitCommitterType = useCallback(
    (type: 'anthropic' | 'user') => {
      setGitCommitterType(type);
      extensionState.setGitCommitterType(type);
      vscode.postMessage({
        type: 'updateGlobalState',
        state: { gitCommitterType: type },
      });
    },
    [extensionState]
  );

  const handleCustomInstructionsChange = useCallback(
    (val: string) => {
      if (val === extensionState.customInstructions) return;
      setCustomInstructions(val);
      extensionState.setCustomInstructions(val);
      vscode.postMessage({ type: 'customInstructions', text: val });
    },
    [extensionState.customInstructions]
  );

  const handleTerminalCompressionThresholdChange = useCallback(
    (val: number | undefined) => {
      setTerminalCompressionThreshold(val);
      vscode.postMessage({ type: 'terminalCompressionThreshold', value: val });
    },
    []
  );

  const handleSoundEnabledChange = useCallback(
    (checked: boolean) => {
      setSoundEnabled(checked);
      extensionState.setSoundEnabled(checked);
      vscode.postMessage({ type: 'soundEnabled', bool: checked });
    },
    [extensionState]
  );

  const handleAlertsEnabledChange = useCallback(
    (checked: boolean) => {
      setAlertsEnabled(checked);
      extensionState.setAlertsEnabled(checked);
      vscode.postMessage({ type: 'alertsEnabled', bool: checked });
    },
    [extensionState]
  );

  const handleTimerSoundEnabledChange = useCallback(
    (checked: boolean) => {
      setTimerSoundEnabled(checked);
      extensionState.setTimerSoundEnabled(checked);
      vscode.postMessage({ type: 'timerSoundEnabled', bool: checked });
    },
    [extensionState]
  );

  return {
    readOnly,
    autoCloseTerminal,
    gitHandlerEnabled,
    gitCommitterType,
    autoSummarize,
    soundEnabled,
    alertsEnabled,
    timerSoundEnabled,
    customInstructions,
    autoSkipWrite,
    terminalCompressionThreshold,
    inlineEditingType,
    commandTimeout,
    handleCommandTimeout,
    handleInlineEditingTypeChange,
    handleTerminalCompressionThresholdChange,
    handleAutoSkipWriteChange,
    handleAutoSummarizeChange,
    handleSoundEnabledChange,
    handleAlertsEnabledChange,
    handleTimerSoundEnabledChange,
    handleSetReadOnly,
    handleSetAutoCloseTerminal,
    handleSetGitHandlerEnabled,
    handleSetGitCommitterType,
    handleCustomInstructionsChange,
  };
}
