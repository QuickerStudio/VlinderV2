import { useState, useEffect, useCallback, useRef } from 'react'
import { vscode } from '@/utils/vscode'

export function useResize() {
	const [editorWidth, setEditorWidth] = useState(400)
	const [isDragging, setIsDragging] = useState(false)
	const rafId = useRef<number | null>(null)
	const resizeObserver = useRef<ResizeObserver | null>(null)

	// 拖拽处理
	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		// Only handle left mouse button
		if (e.button !== 0) return

		setIsDragging(true)

		// Add VSCode-style drag cursor to body
		document.body.style.cursor = 'col-resize'
		document.body.style.userSelect = 'none'

		// Prevent text selection
		e.preventDefault()

		// Store initial state for potential persistence
		vscode.setState({ editorWidth })
	}, [editorWidth])

	const handleMouseMove = useCallback((e: MouseEvent) => {
		if (!isDragging) return

		// Prevent text selection during drag
		e.preventDefault()

		// Cancel previous animation frame if it exists
		if (rafId.current) {
			cancelAnimationFrame(rafId.current)
		}

		// Use requestAnimationFrame for smooth updates
		rafId.current = requestAnimationFrame(() => {
			const container = document.querySelector('.dna-context-protocol-container')
			if (!container) return

			const rect = container.getBoundingClientRect()
			const newWidth = rect.right - e.clientX
			const clampedWidth = Math.max(200, Math.min(800, newWidth))

			// Only update if there's a meaningful change (reduces unnecessary re-renders)
			setEditorWidth(prevWidth => {
				if (Math.abs(prevWidth - clampedWidth) > 2) {
					return clampedWidth
				}
				return prevWidth
			})
		})
	}, [isDragging])

	const handleMouseUp = useCallback(() => {
		setIsDragging(false)

		// Restore default cursor and text selection
		document.body.style.cursor = ''
		document.body.style.userSelect = ''

		// Clean up any pending animation frame
		if (rafId.current) {
			cancelAnimationFrame(rafId.current)
			rafId.current = null
		}

		// Persist the final width to VSCode state
		vscode.setState({ editorWidth })
	}, [editorWidth])

	// Initialize editor width from VSCode state
	useEffect(() => {
		const savedState = vscode.getState() as { editorWidth?: number } | undefined
		if (savedState?.editorWidth) {
			setEditorWidth(savedState.editorWidth)
		}
	}, [])

	useEffect(() => {
		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove)
			document.addEventListener('mouseup', handleMouseUp)
			return () => {
				document.removeEventListener('mousemove', handleMouseMove)
				document.removeEventListener('mouseup', handleMouseUp)
			}
		}
	}, [isDragging, handleMouseMove, handleMouseUp])

	return {
		editorWidth,
		isDragging,
		handleMouseDown
	}
}
