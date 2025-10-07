import React from 'react';
import { Button } from '../ui/button';
import { Zap } from 'lucide-react';
import { useSound } from '@/hooks/use-sound';

interface LightningButtonProps {
  /**
   * Whether the floating question box is currently visible
   */
  isActive: boolean;
  /**
   * Callback when the button is clicked
   */
  onClick: () => void;
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
 * Cyan lightning button component that toggles the floating question box
 */
export const LightningButton: React.FC<LightningButtonProps> = ({
  isActive,
  onClick,
  disabled = false,
  className = '',
}) => {
  const { playSound } = useSound();

  return (
    <Button
      tabIndex={0}
      disabled={disabled}
      variant='ghost'
      className={`!p-1 h-6 w-6 ${className} ${
        isActive
          ? 'text-cyan-400 hover:text-cyan-300 bg-cyan-400/10 hover:bg-cyan-400/20'
          : 'text-muted-foreground hover:text-cyan-400 hover:bg-cyan-400/10'
      }`}
      size='icon'
      aria-label={
        isActive ? 'Sleep Little Lightning' : 'Wake Up Little Lightning'
      }
      onClick={() => {
        playSound('click');
        onClick();
      }}
      title={isActive ? 'Bye Bye!' : "Hi! I'm Lightning!"}
    >
      <Zap
        size={16}
        className={`transition-colors ${isActive ? 'text-cyan-400' : ''}`}
      />
    </Button>
  );
};

export default LightningButton;
