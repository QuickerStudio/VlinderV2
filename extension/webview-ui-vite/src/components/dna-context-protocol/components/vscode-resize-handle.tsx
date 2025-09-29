import React, { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface VSCodeResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void
  isDragging: boolean
  className?: string
}

export function VSCodeResizeHandle({ onMouseDown, isDragging, className }: VSCodeResizeHandleProps) {
  const handleRef = useRef<HTMLDivElement>(null)

  // Add VSCode-style hover effects
  useEffect(() => {
    const handle = handleRef.current
    if (!handle) return

    const handleMouseEnter = () => {
      handle.style.backgroundColor = 'var(--vscode-sash-hoverBorder)'
    }

    const handleMouseLeave = () => {
      if (!isDragging) {
        handle.style.backgroundColor = ''
      }
    }

    handle.addEventListener('mouseenter', handleMouseEnter)
    handle.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      handle.removeEventListener('mouseenter', handleMouseEnter)
      handle.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [isDragging])

  // Update handle appearance during drag
  useEffect(() => {
    const handle = handleRef.current
    if (!handle) return

    if (isDragging) {
      handle.style.backgroundColor = 'var(--vscode-sash-hoverBorder)'
      handle.style.opacity = '1'
    } else {
      handle.style.backgroundColor = ''
      handle.style.opacity = ''
    }
  }, [isDragging])

  return (
    <div
      ref={handleRef}
      className={cn(
        // Base VSCode sash styles
        "w-1 h-full cursor-col-resize flex-shrink-0 relative",
        // VSCode-style background
        "bg-transparent hover:bg-[var(--vscode-sash-hoverBorder)]",
        // Transition for smooth hover effects
        "transition-colors duration-150",
        // Active state
        isDragging && "bg-[var(--vscode-sash-hoverBorder)] opacity-100",
        className
      )}
      onMouseDown={onMouseDown}
      style={{
        // VSCode sash styling
        borderLeft: '1px solid var(--vscode-panel-border)',
        borderRight: '1px solid var(--vscode-panel-border)',
        // Ensure proper z-index for dragging
        zIndex: isDragging ? 1000 : 1,
      }}
      title="Drag to resize editor"
    >
      {/* VSCode-style resize indicator */}
      <div 
        className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-px"
        style={{
          backgroundColor: 'var(--vscode-sash-hoverBorder)',
          opacity: isDragging ? 1 : 0,
          transition: 'opacity 150ms ease-in-out'
        }}
      />
      
      {/* Invisible wider hit area for easier grabbing */}
      <div 
        className="absolute inset-y-0 -left-2 -right-2 cursor-col-resize"
        style={{ zIndex: 1 }}
      />
    </div>
  )
}
