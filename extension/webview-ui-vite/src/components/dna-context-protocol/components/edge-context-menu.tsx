import { cn } from '@/lib/utils';

interface EdgeContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  edgeId?: string;
  onClose: () => void;
  onDelete: (edgeId: string) => void;
  className?: string;
}

export function EdgeContextMenu({
  isOpen,
  x,
  y,
  edgeId,
  onClose,
  onDelete,
  className,
}: EdgeContextMenuProps) {
  if (!isOpen || !edgeId) return null;

  const handleDelete = () => {
    onDelete(edgeId);
    onClose();
  };

  return (
    <>
      {/* Background overlay to close menu on click outside */}
      <div className='fixed inset-0 z-40' onClick={onClose} />

      {/* Context Menu */}
      <div
        className={cn(
          'absolute z-50 bg-background border border-border rounded-lg shadow-lg p-2 min-w-[150px]',
          className
        )}
        style={{
          left: Math.min(x, window.innerWidth - 170),
          top: Math.min(y, window.innerHeight - 100),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex flex-col gap-1'>
          <button
            onClick={handleDelete}
            className='w-full px-3 py-2 text-sm text-left hover:bg-destructive/10 text-destructive transition-colors flex items-center gap-2 rounded-md'
          >
            <span className='codicon codicon-trash text-xs'></span>
            Delete Connection
          </button>
          <div className='border-t my-1'></div>
          <button
            onClick={onClose}
            className='w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors flex items-center gap-2 rounded-md'
          >
            <span className='codicon codicon-close text-xs'></span>
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
