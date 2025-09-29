import { cn } from "@/lib/utils"

interface DiagramControlsProps {
	zoomPercentage: number
	canZoomIn: boolean
	canZoomOut: boolean
	onZoomIn: () => void
	onZoomOut: () => void
	className?: string
}

export function DiagramControls({
	zoomPercentage,
	canZoomIn,
	canZoomOut,
	onZoomIn,
	onZoomOut,
	className
}: DiagramControlsProps) {
	return (
		<div className={cn("flex items-center gap-1 bg-background/80 backdrop-blur-sm border rounded-lg p-1", className)}>
			{/* Zoom out button */}
			<button
				onClick={onZoomOut}
				disabled={!canZoomOut}
				className="p-1.5 rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				title="Zoom out (-)"
			>
				<span className="codicon codicon-zoom-out text-sm"></span>
			</button>

			{/* Zoom percentage display */}
			<div className="px-2 py-1 text-xs font-mono min-w-[50px] text-center">
				{zoomPercentage}%
			</div>

			{/* Zoom in button */}
			<button
				onClick={onZoomIn}
				disabled={!canZoomIn}
				className="p-1.5 rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				title="Zoom in (+)"
			>
				<span className="codicon codicon-zoom-in text-sm"></span>
			</button>


		</div>
	)
}
