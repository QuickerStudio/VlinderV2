import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { NodeType, NodeTypeConfig } from '../types'

interface FigmaToolbarProps {
	onAddNode: (nodeText: string, nodeType: NodeType) => void
	onDragStart?: (nodeType: NodeType) => void
	onDragEnd?: () => void
	isEditMode?: boolean
	isEdgeEditMode?: boolean
	isPanMode?: boolean
	onToggleEditMode?: () => void
	onToggleEdgeEditMode?: () => void
	onTogglePanMode?: () => void
	onAddImageNode?: () => void
	onAddTextNode?: () => void
	onAddButtonNode?: () => void
	onRefresh?: () => void
	onFitToContainer?: () => void
	onResetView?: () => void
	className?: string
}

const nodeTypes: NodeTypeConfig[] = [
	{ value: 'rectangle', label: 'Rectangle', icon: '▭', description: 'Rectangle node' },
	{ value: 'rounded', label: 'Rounded', icon: '▢', description: 'Rounded rectangle node' },
	{ value: 'diamond', label: 'Diamond', icon: '◆', description: 'Diamond node' },
	{ value: 'circle', label: 'Circle', icon: '●', description: 'Circle node' },
	{ value: 'stadium', label: 'Stadium', icon: '⬭', description: 'Stadium/capsule shaped node' },
	{ value: 'subroutine', label: 'Subroutine', icon: '⬜', description: 'Subroutine/process node' },
	{ value: 'cylindrical', label: 'Database', icon: '🗄️', description: 'Cylindrical/database node' },
	{ value: 'hexagon', label: 'Hexagon', icon: '⬡', description: 'Hexagon node' },
	{ value: 'parallelogram', label: 'Parallel', icon: '▱', description: 'Parallelogram node' },
	{ value: 'trapezoid', label: 'Trapezoid', icon: '⏢', description: 'Trapezoid node' },
	{ value: 'doubleCircle', label: 'Double Circle', icon: '◉', description: 'Double circle node' },
	{ value: 'image', label: 'Image', icon: '🖼️', description: 'Image node - Upload and display images' },
	{ value: 'text', label: 'Text', icon: '📝', description: 'Text node - Interface description text' },
	{ value: 'button', label: 'Button', icon: '🔘', description: 'Button node - Interactive buttons and function descriptions' }
]

export function MainToolbar({
	onAddNode,
	onDragStart,
	onDragEnd,
	isEditMode = false,
	isEdgeEditMode = false,
	isPanMode = false,
	onToggleEditMode,
	onToggleEdgeEditMode,
	onTogglePanMode,
	onAddImageNode,
	onAddTextNode,
	onAddButtonNode,
	onRefresh,
	onFitToContainer,
	onResetView,
	className
}: FigmaToolbarProps) {
	const [selectedNodeType, setSelectedNodeType] = useState<NodeType>('rectangle')
	const [isDragging, setIsDragging] = useState(false)

	const handleNodeClick = (nodeType: NodeType) => {
		// Special handling for different node types
		if (nodeType === 'image') {
			onAddImageNode?.()
			return
		}

		if (nodeType === 'text') {
			onAddTextNode?.()
			return
		}

		if (nodeType === 'button') {
			onAddButtonNode?.()
			return
		}

		// Click to add node directly to the center of the preview
		const nodeConfig = nodeTypes.find(t => t.value === nodeType)
		const defaultText = `New ${nodeConfig?.label || 'Node'}`
		onAddNode(defaultText, nodeType)
	}

	const handleDragStart = (e: React.DragEvent, nodeType: NodeType) => {
		setIsDragging(true)
		setSelectedNodeType(nodeType)
		e.dataTransfer.setData('application/json', JSON.stringify({ nodeType }))
		e.dataTransfer.effectAllowed = 'copy'
		onDragStart?.(nodeType)
	}

	const handleDragEnd = () => {
		setIsDragging(false)
		onDragEnd?.()
	}

	// Split node types into two columns (7 each)
	const leftColumnNodes = nodeTypes.slice(0, 7)
	const rightColumnNodes = nodeTypes.slice(7, 14)

	return (
		<div className={cn(
			"fixed left-4 top-1/2 -translate-y-1/2 z-50",
			"bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg",
			"p-2 flex gap-2",
			"transition-all duration-200",
			isDragging && "scale-105",
			className
		)}>
			{/* Left Column */}
			<div className="flex flex-col gap-2">
				{/* Toolbar title */}
				<div className="text-xs font-medium text-muted-foreground text-center px-1">
					Nodes
				</div>

				{/* Left column node type buttons */}
				{leftColumnNodes.map((nodeType) => (
					<button
						key={nodeType.value}
						draggable
						onClick={() => handleNodeClick(nodeType.value)}
						onDragStart={(e) => handleDragStart(e, nodeType.value)}
						onDragEnd={handleDragEnd}
						className={cn(
							"w-10 h-10 rounded-lg border transition-all duration-200",
							"flex items-center justify-center",
							"hover:bg-accent hover:scale-105",
							"active:scale-95",
							"cursor-grab active:cursor-grabbing",
							selectedNodeType === nodeType.value && isDragging
								? "bg-primary text-primary-foreground border-primary shadow-md"
								: "bg-background hover:bg-accent border-border"
						)}
						title={`${nodeType.label} - Click to add or drag to canvas`}
				>
					<span className="text-lg select-none">{nodeType.icon}</span>
				</button>
			))}

			{/* Separator line */}
			<div className="h-px bg-border my-1" />

			{/* Left column tools - View tools */}
			{/* Refresh button */}
			{onRefresh && (
				<button
					onClick={onRefresh}
					className={cn(
						"w-10 h-10 rounded-lg border transition-all duration-200",
						"flex items-center justify-center",
						"hover:bg-accent hover:scale-105",
						"active:scale-95",
						"bg-background hover:bg-accent border-border"
					)}
					title="Refresh render"
				>
					<span className="codicon codicon-refresh text-sm"></span>
				</button>
			)}

			{/* Fit to window button */}
			{onFitToContainer && (
				<button
					onClick={onFitToContainer}
					className={cn(
						"w-10 h-10 rounded-lg border transition-all duration-200",
						"flex items-center justify-center",
						"hover:bg-accent hover:scale-105",
						"active:scale-95",
						"bg-background hover:bg-accent border-border"
					)}
					title="Fit to window (F)"
				>
					<span className="codicon codicon-screen-normal text-sm"></span>
				</button>
			)}

			{/* Reset view button */}
			{onResetView && (
				<button
					onClick={onResetView}
					className={cn(
						"w-10 h-10 rounded-lg border transition-all duration-200",
						"flex items-center justify-center",
						"hover:bg-accent hover:scale-105",
						"active:scale-95",
						"bg-background hover:bg-accent border-border"
					)}
					title="Reset view (0)"
				>
					<span className="codicon codicon-home text-sm"></span>
				</button>
			)}
		</div>

		{/* Right Column */}
		<div className="flex flex-col gap-2">
			{/* Toolbar title */}
			<div className="text-xs font-medium text-muted-foreground text-center px-1">
				Tools
			</div>

			{/* Right column node type buttons */}
			{rightColumnNodes.map((nodeType) => (
				<button
					key={nodeType.value}
					draggable
					onClick={() => handleNodeClick(nodeType.value)}
					onDragStart={(e) => handleDragStart(e, nodeType.value)}
					onDragEnd={handleDragEnd}
					className={cn(
						"w-10 h-10 rounded-lg border transition-all duration-200",
						"flex items-center justify-center",
						"hover:bg-accent hover:scale-105",
						"active:scale-95",
						"cursor-grab active:cursor-grabbing",
						selectedNodeType === nodeType.value && isDragging
							? "bg-primary text-primary-foreground border-primary shadow-md"
							: "bg-background hover:bg-accent border-border"
					)}
					title={`${nodeType.label} - Click to add or drag to canvas`}
				>
					<span className="text-lg select-none">{nodeType.icon}</span>
				</button>
			))}

			{/* Separator line */}
			<div className="h-px bg-border my-1" />

			{/* Right column tools - Edit tools */}
			<button
				onClick={onTogglePanMode}
				className={cn(
					"w-10 h-10 rounded-lg border transition-all duration-200",
					"flex items-center justify-center",
					"hover:bg-accent hover:scale-105",
					"active:scale-95",
					isPanMode
						? "bg-primary text-primary-foreground border-primary"
						: "bg-background hover:bg-accent border-border"
				)}
				title={isPanMode ? "Exit Pan Mode" : "Enter Pan Mode - Drag to move canvas"}
			>
				<span className="codicon codicon-move text-sm"></span>
			</button>

			<button
				onClick={onToggleEditMode}
				className={cn(
					"w-10 h-10 rounded-lg border transition-all duration-200",
					"flex items-center justify-center",
					"hover:bg-accent hover:scale-105",
					"active:scale-95",
					isEditMode
						? "bg-primary text-primary-foreground border-primary"
						: "bg-background hover:bg-accent border-border"
				)}
				title={isEditMode ? "Exit Node Edit Mode" : "Enter Node Edit Mode"}
			>
				<span className="codicon codicon-edit text-sm"></span>
			</button>

			<button
				onClick={onToggleEdgeEditMode}
				className={cn(
					"w-10 h-10 rounded-lg border transition-all duration-200",
					"flex items-center justify-center",
					"hover:bg-accent hover:scale-105",
					"active:scale-95",
					isEdgeEditMode
						? "bg-primary text-primary-foreground border-primary"
						: "bg-background hover:bg-accent border-border"
				)}
				title={isEdgeEditMode ? "Exit Edge Edit Mode" : "Enter Edge Edit Mode"}
			>
				<span className="codicon codicon-arrow-both text-sm"></span>
			</button>

			</div>
		</div>
	)
}

