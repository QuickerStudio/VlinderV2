import { useState, useEffect, useCallback, useRef } from 'react'
import mermaid from 'mermaid'
import { useErrorInterceptor } from './use-error-interceptor'

export function useMermaid(isOpen: boolean) {
	const [mermaidCode, setMermaidCode] = useState('')
	const [renderedDiagram, setRenderedDiagram] = useState('')
	const [isRendering, setIsRendering] = useState(false)
	const [statusMessage, setStatusMessage] = useState('')
	const codeRef = useRef(mermaidCode);

	useEffect(() => {
		codeRef.current = mermaidCode;
	}, [mermaidCode]);

	// Use enhanced error interceptor
	const { handleError, handleInfo } = useErrorInterceptor({
		onError: (message, level) => {
			setStatusMessage(message)
			const duration = level === 'critical' ? 6000 : 4000
			setTimeout(() => setStatusMessage(''), duration)
		},
		onWarning: (message) => {
			setStatusMessage(message)
			setTimeout(() => setStatusMessage(''), 3000)
		},
		onInfo: (message) => {
			setStatusMessage(message)
			setTimeout(() => setStatusMessage(''), 2000)
		},
		enableFiltering: true,
		enableGrouping: true,
		maxErrorsPerSecond: 2,
		maxMessageLength: 100
	})

	// Initialize Mermaid
	useEffect(() => {
		mermaid.initialize({
			startOnLoad: false,
			theme: 'dark',
			securityLevel: 'loose',
			fontFamily: 'var(--vscode-font-family, monospace)',
			logLevel: 'fatal', // Disable error log output
			suppressErrorRendering: true, // Disable error rendering
		})
	}, [])

	// Render diagram
	const renderDiagram = useCallback(async () => {
		const codeToRender = codeRef.current;
		if (!codeToRender.trim()) {
			setRenderedDiagram('')
			return
		}

		setIsRendering(true)
		setStatusMessage('Rendering...')

		try {
			// 使用时间戳确保唯一ID，避免冲突
			const diagramId = `mermaid-diagram-${Date.now()}`
			const { svg } = await mermaid.render(diagramId, codeToRender)
			setRenderedDiagram(svg)
			handleInfo('✅ 图表渲染成功')
		} catch (error) {
			// Use error interceptor to handle errors
			handleError(error instanceof Error ? error : 'Syntax error')
			setRenderedDiagram('')
		} finally {
			setIsRendering(false)
		}
	}, [])

	// Initial rendering
	useEffect(() => {
		if (isOpen && mermaidCode.trim()) {
			renderDiagram()
		}
	}, [isOpen, mermaidCode, renderDiagram])

	// Debounced auto-rendering
	useEffect(() => {
		const timer = setTimeout(() => {
			if (mermaidCode.trim()) {
				renderDiagram()
			} else {
				// When code is empty, clear preview
				setRenderedDiagram('')
				setStatusMessage('')
			}
		}, 1000) // Auto-render after 1 second

		return () => clearTimeout(timer)
	}, [mermaidCode, renderDiagram])

	return {
		mermaidCode,
		setMermaidCode,
		renderedDiagram,
		isRendering,
		statusMessage,
		setStatusMessage,
		renderDiagram
	}
}
