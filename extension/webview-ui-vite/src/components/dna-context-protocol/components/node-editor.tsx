import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface NodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  position: { x: number; y: number; width: number; height: number };
  className?: string;
}

export function NodeEditor({
  value,
  onChange,
  onSave,
  onCancel,
  position,
  className,
}: NodeEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus and select text
  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  // Handle blur events
  const handleBlur = () => {
    // Delay execution to allow user to click save button
    setTimeout(() => {
      if (document.activeElement !== inputRef.current) {
        onSave();
      }
    }, 100);
  };

  return (
    <div
      className={cn(
        'absolute z-50 bg-background border border-primary rounded shadow-lg',
        className
      )}
      style={{
        left: position.x,
        top: position.y - 5,
        minWidth: Math.max(position.width + 20, 120),
      }}
    >
      {/* Input field */}
      <input
        ref={inputRef}
        type='text'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className='w-full px-2 py-1 text-sm bg-transparent border-none outline-none'
        placeholder='Enter node text...'
      />

      {/* Action buttons */}
      <div className='flex items-center justify-end gap-1 p-1 border-t bg-muted/50'>
        <button
          onClick={onCancel}
          className='px-2 py-1 text-xs rounded hover:bg-accent transition-colors'
          title='Cancel (ESC)'
        >
          <span className='codicon codicon-close'></span>
        </button>
        <button
          onClick={onSave}
          className='px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
          title='Save (Enter)'
        >
          <span className='codicon codicon-check'></span>
        </button>
      </div>

      {/* Hint text */}
      <div className='px-2 py-1 text-xs text-muted-foreground bg-muted/30 border-t'>
        Enter to save • ESC to cancel
      </div>
    </div>
  );
}
