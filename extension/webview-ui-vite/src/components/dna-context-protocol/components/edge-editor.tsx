import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface EdgeEditorProps {
	value: string
	onChange: (value: string) => void
	onSave: () => void
	onCancel: () => void
	position: {
		x: number
		y: number
		width: number
		height: number
	}
	className?: string
}

export function EdgeEditor({
	value,
	onChange,
	onSave,
	onCancel,
	position,
	className
}: EdgeEditorProps) {
	const inputRef = useRef<HTMLInputElement>(null)

	// Auto focus and select text
	useEffect(() => {
		if (inputRef.current) {
			inputRef.current.focus()
			inputRef.current.select()
		}
	}, [])

	// Handle keyboard events
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			onSave()
		} else if (e.key === 'Escape') {
			e.preventDefault()
			onCancel()
		}
	}

	// Handle blur events
	const handleBlur = () => {
		// Delay execution to allow user to click save/cancel buttons
		setTimeout(() => {
			onSave()
		}, 100)
	}

	return (
		<div
			className={cn(
				"absolute z-50 bg-background border border-border rounded-lg shadow-lg min-w-[200px]",
				className
			)}
			style={{
				left: Math.max(10, position.x - 100), // Center display, but don't exceed left boundary
				top: position.y - 50, // Display above the connection line
			}}
		>
			<div className="p-3">
				<div className="mb-2">
					<label className="text-xs font-medium text-muted-foreground block mb-1">
						Connection Label
					</label>
					<input
						ref={inputRef}
						type="text"
						value={value}
						onChange={(e) => onChange(e.target.value)}
						onKeyDown={handleKeyDown}
						onBlur={handleBlur}
						className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
						placeholder="Enter connection label"
					/>
				</div>
				<div className="flex gap-2 justify-end">
					<button
						onClick={onCancel}
						className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
					>
						Cancel
					</button>
					<button
						onClick={onSave}
						className="px-2 py-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded transition-colors"
					>
						Save
					</button>
				</div>
			</div>

			{/* Small triangle indicator */}
			<div 
				className="absolute w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-border"
				style={{
					left: '50%',
					bottom: '-4px',
					transform: 'translateX(-50%)'
				}}
			/>
		</div>
	)
}