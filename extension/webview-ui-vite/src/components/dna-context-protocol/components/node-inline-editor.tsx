import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface NodeInlineEditorProps {
  isEditing: boolean;
  nodeId?: string;
  originalText?: string;
  onFinish: (newText: string) => void;
  onCancel: () => void;
  position?: { x: number; y: number };
}

export function NodeInlineEditor({
  isEditing,
  nodeId,
  originalText = '',
  onFinish,
  onCancel,
  position,
}: NodeInlineEditorProps) {
  const [text, setText] = useState(originalText);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setText(originalText);
      // Delay focus to ensure DOM is rendered
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
    }
  }, [isEditing, originalText]);

  const handleSubmit = () => {
    if (text.trim()) {
      onFinish(text.trim());
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    // Delay processing to avoid conflicts with button clicks
    setTimeout(() => {
      if (document.activeElement !== inputRef.current) {
        handleSubmit();
      }
    }, 100);
  };

  if (!isEditing) return null;

  return (
    <>
      {/* Background overlay */}
      <div className='fixed inset-0 z-40 bg-black/10' onClick={onCancel} />

      {/* Editor */}
      <div
        className='fixed z-50 bg-background border border-border rounded-lg shadow-lg p-2 min-w-[200px]'
        style={{
          left: position?.x ? `${position.x}px` : '50%',
          top: position?.y ? `${position.y}px` : '50%',
          transform: position
            ? 'translate(-50%, -100%)'
            : 'translate(-50%, -50%)',
        }}
      >
        <div className='flex flex-col gap-2'>
          <div className='text-xs font-medium text-muted-foreground'>
            Edit Node: {nodeId}
          </div>

          <input
            ref={inputRef}
            type='text'
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className='w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/50'
            placeholder='Enter node text'
          />

          <div className='flex gap-2 justify-end'>
            <button
              onClick={onCancel}
              className='px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors'
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className='px-2 py-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
