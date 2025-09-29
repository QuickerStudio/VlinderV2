import { useEffect, useRef, useCallback } from 'react'

interface ErrorInterceptorOptions {
	onError?: (message: string, level: 'error' | 'critical') => void
	onWarning?: (message: string) => void
	onInfo?: (message: string) => void
	maxMessageLength?: number
	displayDuration?: number
	enableFiltering?: boolean
	enableGrouping?: boolean
	maxErrorsPerSecond?: number
	silentMode?: boolean
}

interface ErrorStats {
	totalErrors: number
	totalWarnings: number
	lastErrorTime: number
	errorRate: number
	recentErrors: string[]
}

export function useErrorInterceptor({
	onError,
	onWarning,
	onInfo,
	maxMessageLength = 80,
	displayDuration = 4000,
	enableFiltering = true,
	enableGrouping = true,
	maxErrorsPerSecond = 3,
	silentMode = false
}: ErrorInterceptorOptions = {}) {
	const statsRef = useRef<ErrorStats>({
		totalErrors: 0,
		totalWarnings: 0,
		lastErrorTime: 0,
		errorRate: 0,
		recentErrors: []
	})

	const errorCacheRef = useRef<Map<string, number>>(new Map())
	const rateLimitRef = useRef<number[]>([])

	// Smart filter - filter out common useless errors
	const shouldFilterError = useCallback((message: string): boolean => {
		if (!enableFiltering) return false

		const ignoredPatterns = [
			// Browser-related useless errors
			/ResizeObserver loop limit exceeded/i,
			/Non-passive event listener/i,
			/Script error/i,
			/Loading chunk \d+ failed/i,
			/ChunkLoadError/i,
			/Loading CSS chunk/i,
			/Network request failed/i,
			/Failed to fetch/i,
			/AbortError/i,
			/The operation was aborted/i,

			// VS Code webview related
			/acquireVsCodeApi/i,
			/vscode-webview/i,
			/postMessage/i,

			// React development mode warnings
			/Warning: ReactDOM.render is deprecated/i,
			/Warning: componentWillMount/i,
			/Warning: componentWillReceiveProps/i,

			// Mermaid internal debug info
			/mermaid.*debug/i,
			/dagre.*layout/i,
			/d3.*selection/i,

			// Other framework noise
			/HMR.*connected/i,
			/webpack.*hot/i,
			/sockjs.*network/i
		]

		return ignoredPatterns.some(pattern => pattern.test(message))
	}, [enableFiltering])

	// Error grouping and deduplication
	const processError = useCallback((message: string, type: 'error' | 'warning'): string | null => {
		const now = Date.now()
		const stats = statsRef.current

		// Update statistics
		if (type === 'error') {
			stats.totalErrors++
		} else {
			stats.totalWarnings++
		}

		// Calculate error rate
		stats.errorRate = stats.totalErrors / Math.max(1, (now - stats.lastErrorTime) / 1000)
		stats.lastErrorTime = now

		// Rate limiting
		rateLimitRef.current.push(now)
		rateLimitRef.current = rateLimitRef.current.filter(time => now - time < 1000)

		if (rateLimitRef.current.length > maxErrorsPerSecond) {
			return null // Exceeds rate limit, ignore
		}

		// Error deduplication and grouping
		if (enableGrouping) {
			const errorKey = message.slice(0, 50) // Use first 50 characters as key
			const count = errorCacheRef.current.get(errorKey) || 0
			errorCacheRef.current.set(errorKey, count + 1)

			if (count > 0) {
				// If it's a duplicate error, only show at specific counts
				if (count === 1) {
					return `${message} (repeated 2 times)`
				} else if (count === 4) {
					return `${message} (repeated 5 times, will be silent afterwards)`
				} else if (count > 4) {
					return null // Silent after 5 times
				}
			}
		}

		return message
	}, [enableGrouping, maxErrorsPerSecond])

	// Smart error analysis and level determination
	const analyzeError = useCallback((message: string): { level: 'error' | 'critical', suggestion?: string } => {
		const analysis: { level: 'error' | 'critical', suggestion?: string } = { level: 'error', suggestion: undefined }

		// Critical error patterns
		const criticalPatterns = [
			{ pattern: /syntax error.*unexpected/i, suggestion: 'Check syntax, there may be spelling errors or missing symbols' },
			{ pattern: /parse error.*line \d+/i, suggestion: 'Syntax parsing failed, check the code on the specified line' },
			{ pattern: /cannot read prop.*undefined/i, suggestion: 'Accessed undefined property, check if object exists' },
			{ pattern: /mermaid.*render.*failed/i, suggestion: 'Diagram rendering failed, check if Mermaid syntax is correct' },
			{ pattern: /invalid.*diagram.*type/i, suggestion: 'Unsupported diagram type, please use correct Mermaid syntax' },
			{ pattern: /flowchart.*syntax/i, suggestion: 'Flowchart syntax error, check node and connection line syntax' },
			{ pattern: /sequence.*participant/i, suggestion: 'Sequence diagram participant definition error, check participant syntax' }
		]

		// Check if it's a critical error
		for (const { pattern, suggestion } of criticalPatterns) {
			if (pattern.test(message)) {
				analysis.level = 'critical'
				analysis.suggestion = suggestion
				break
			}
		}

		// Common error suggestions
		const commonErrorSuggestions = [
			{ pattern: /graph.*TD|LR|TB|RL/i, suggestion: 'Flowchart direction should be TD, LR, TB or RL' },
			{ pattern: /sequenceDiagram/i, suggestion: 'Sequence diagram syntax: participant A; A->>B: message' },
			{ pattern: /classDiagram/i, suggestion: 'Class diagram syntax: class User { +name: string }' },
			{ pattern: /stateDiagram/i, suggestion: 'State diagram syntax: [*] --> State1' },
			{ pattern: /erDiagram/i, suggestion: 'ER diagram syntax: CUSTOMER ||--o{ ORDER : places' },
			{ pattern: /gitgraph/i, suggestion: 'Git graph syntax: commit; branch feature; checkout feature' }
		]

		// If no suggestion yet, try to match common errors
		if (!analysis.suggestion) {
			for (const { pattern, suggestion } of commonErrorSuggestions) {
				if (pattern.test(message)) {
					analysis.suggestion = suggestion
					break
				}
			}
		}

		return analysis
	}, [])

	// Format message
	const formatMessage = useCallback((message: string, prefix: string): string => {
		const truncated = message.slice(0, maxMessageLength)
		const suffix = message.length > maxMessageLength ? '...' : ''
		return `${prefix}: ${truncated}${suffix}`
	}, [maxMessageLength])

	useEffect(() => {
		if (silentMode) return

		// Save original console methods
		const originalConsoleError = console.error
		const originalConsoleWarn = console.warn
		const originalConsoleInfo = console.info

		// Enhanced error interception
		console.error = (...args) => {
			const message = args.join(' ')

			if (shouldFilterError(message)) return

			const processedMessage = processError(message, 'error')
			if (!processedMessage) return

			if (onError) {
				const { level, suggestion } = analyzeError(message)
				const prefix = level === 'critical' ? '🚨 Critical Error' : '❌ Error'
				const formattedMessage = formatMessage(processedMessage, prefix)
				const finalMessage = suggestion ? `${formattedMessage}\n� Suggestion: ${suggestion}` : formattedMessage
				onError(finalMessage, level)
			}
		}

		console.warn = (...args) => {
			const message = args.join(' ')

			if (shouldFilterError(message)) return

			const processedMessage = processError(message, 'warning')
			if (!processedMessage) return

			if (onWarning) {
				const formattedMessage = formatMessage(processedMessage, '⚠️ Warning')
				onWarning(formattedMessage)
			}
		}

		console.info = (...args) => {
			const message = args.join(' ')
			if (onInfo) {
				const formattedMessage = formatMessage(message, 'ℹ️ Info')
				onInfo(formattedMessage)
			}
		}

		// Cleanup function
		return () => {
			console.error = originalConsoleError
			console.warn = originalConsoleWarn
			console.info = originalConsoleInfo
		}
	}, [onError, onWarning, onInfo, shouldFilterError, processError, analyzeError, formatMessage, silentMode])

	// Function to manually trigger error handling
	const handleError = useCallback((error: Error | string) => {
		const message = error instanceof Error ? error.message : error

		if (shouldFilterError(message)) return

		const processedMessage = processError(message, 'error')
		if (!processedMessage) return

		if (onError) {
			const { level, suggestion } = analyzeError(message)
			const prefix = level === 'critical' ? '🚨 Syntax Error' : '❌ Error'
			const formattedMessage = formatMessage(processedMessage, prefix)
			const finalMessage = suggestion ? `${formattedMessage}\n� Suggestion: ${suggestion}` : formattedMessage
			onError(finalMessage, level)
		}
	}, [onError, shouldFilterError, processError, analyzeError, formatMessage])

	const handleWarning = useCallback((warning: string) => {
		if (shouldFilterError(warning)) return

		const processedMessage = processError(warning, 'warning')
		if (!processedMessage) return

		if (onWarning) {
			const formattedMessage = formatMessage(processedMessage, '⚠️ Warning')
			onWarning(formattedMessage)
		}
	}, [onWarning, shouldFilterError, processError, formatMessage])

	const handleInfo = useCallback((info: string) => {
		if (onInfo) {
			const formattedMessage = formatMessage(info, 'ℹ️ Info')
			onInfo(formattedMessage)
		}
	}, [onInfo, formatMessage])

	// Get error statistics
	const getStats = useCallback((): ErrorStats => {
		return { ...statsRef.current }
	}, [])

	// Clear error cache
	const clearCache = useCallback(() => {
		errorCacheRef.current.clear()
		rateLimitRef.current = []
		statsRef.current = {
			totalErrors: 0,
			totalWarnings: 0,
			lastErrorTime: 0,
			errorRate: 0,
			recentErrors: []
		}
	}, [])

	// Toggle silent mode
	const toggleSilentMode = useCallback(() => {
		return !silentMode
	}, [silentMode])

	return {
		handleError,
		handleWarning,
		handleInfo,
		getStats,
		clearCache,
		toggleSilentMode,
		stats: statsRef.current
	}
}
