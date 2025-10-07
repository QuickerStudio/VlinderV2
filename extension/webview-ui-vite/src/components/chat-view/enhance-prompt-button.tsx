import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { rpcClient } from '@/lib/rpc-client';
import { useSound } from '@/hooks/use-sound';

interface EnhancePromptButtonProps {
  /**
   * Current input value to enhance
   */
  inputValue: string;
  /**
   * Callback when prompt is enhanced
   */
  onPromptEnhanced: (enhancedPrompt: string) => void;
  /**
   * Whether the button should be disabled
   */
  disabled?: boolean;
  /**
   * Custom class name
   */
  className?: string;
}

/**
 * Button component for enhancing user prompts using AI
 */
export const EnhancePromptButton: React.FC<EnhancePromptButtonProps> = ({
  inputValue,
  onPromptEnhanced,
  disabled = false,
  className = '',
}) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const { playSound } = useSound();

  const handleEnhancePrompt = async () => {
    if (!inputValue.trim() || isEnhancing || disabled) {
      return;
    }

    playSound('click');
    setIsEnhancing(true);

    try {
      console.log(
        '[EnhancePromptButton] Starting two-stage prompt enhancement...'
      );

      // Use RPC client to call the enhancePrompt route
      const response = await rpcClient.enhancePrompt.use({
        prompt: inputValue.trim(),
      });

      if (response.success && response.enhancedPrompt) {
        console.log('[EnhancePromptButton] Prompt enhanced successfully');
        onPromptEnhanced(response.enhancedPrompt);
      } else {
        console.error('Failed to enhance prompt:', response.error);
        // TODO: Show user-friendly error notification
        // For now, we'll just log the error
      }
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      // TODO: Show user-friendly error notification
      // For now, we'll just log the error
    } finally {
      setIsEnhancing(false);
    }
  };

  const isDisabled = disabled || isEnhancing || !inputValue.trim();

  return (
    <Button
      tabIndex={0}
      disabled={isDisabled}
      variant='ghost'
      className={`!p-1 h-6 w-6 ${className}`}
      size='icon'
      aria-label={isEnhancing ? 'Enhancing prompt...' : 'Enhance Prompt'}
      onClick={handleEnhancePrompt}
      title={isEnhancing ? 'Enhancing prompt...' : 'Enhance Prompt with AI'}
    >
      {isEnhancing ? (
        <Loader2 size={16} className='animate-spin' />
      ) : (
        <Sparkles size={16} />
      )}
    </Button>
  );
};

export default EnhancePromptButton;
