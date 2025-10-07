import React, { startTransition } from 'react';
import { Button } from '../ui/button';
import { RefreshCw } from 'lucide-react';

interface ResumeTaskButtonProps {
  enabled: boolean;
  onClick: () => void;
  disabled?: boolean;
  isPending?: boolean;
}

export const ResumeTaskButton: React.FC<ResumeTaskButtonProps> = ({
  enabled,
  onClick,
  disabled = false,
  isPending = false,
}) => {
  if (!enabled) return null;

  return (
    <Button
      tabIndex={0}
      disabled={disabled || isPending}
      variant='ghost'
      className='!p-1 h-6 w-6'
      size='icon'
      aria-label='Resume Task'
      onClick={() => startTransition(() => onClick())}
    >
      <RefreshCw size={16} className={isPending ? 'animate-spin' : ''} />
    </Button>
  );
};
