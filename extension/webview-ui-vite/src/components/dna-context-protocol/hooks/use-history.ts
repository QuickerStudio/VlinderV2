import { useState, useCallback, useEffect } from 'react'
import { vscode } from '@/utils/vscode'
import type { HistoryRecord, ExportFormat, EditHistoryRecord } from '../types'

const STORAGE_KEY = 'mermaid-history-records'
const NEXT_ID_KEY = 'mermaid-next-history-id'

export function useHistory() {
	const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([])
	const [nextHistoryId, setNextHistoryId] = useState(1)

	// Load history records from localStorage
	useEffect(() => {
		try {
			const savedRecords = localStorage.getItem(STORAGE_KEY)
			const savedNextId = localStorage.getItem(NEXT_ID_KEY)

			if (savedRecords) {
				const records = JSON.parse(savedRecords).map((record: any) => ({
					...record,
					createdAt: new Date(record.createdAt)
				}))
				setHistoryRecords(records)
			}

			if (savedNextId) {
				setNextHistoryId(parseInt(savedNextId, 10))
			}
		} catch (error) {
			console.warn('Failed to load history from localStorage:', error)
		}
	}, [])

	// Save to localStorage
	const saveToStorage = useCallback((records: HistoryRecord[], nextId: number) => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
			localStorage.setItem(NEXT_ID_KEY, nextId.toString())
		} catch (error) {
			console.warn('Failed to save history to localStorage:', error)
		}
	}, [])

	// Save to history records
	const saveToHistory = useCallback((
		mermaidCode: string,
		renderedDiagram: string,
		setStatusMessage: (msg: string) => void,
		editHistory?: EditHistoryRecord[],
		editHistoryIndex?: number,
		customName?: string
	) => {
		if (!mermaidCode.trim()) return

		const newRecord: HistoryRecord = {
			id: `history-${nextHistoryId}`,
			name: customName || `Diagram ${nextHistoryId}`,
			code: mermaidCode,
			createdAt: new Date(),
			svg: renderedDiagram,
			editHistory: editHistory ? [...editHistory] : undefined,
			editHistoryIndex: editHistoryIndex
		}

		const newRecords = [newRecord, ...historyRecords.slice(0, 19)] // Save up to 20 records
		const newNextId = nextHistoryId + 1

		setHistoryRecords(newRecords)
		setNextHistoryId(newNextId)
		saveToStorage(newRecords, newNextId)

		setStatusMessage('Saved to history')
		setTimeout(() => setStatusMessage(''), 2000)
	}, [nextHistoryId, historyRecords, saveToStorage])

	// Load from history records
	const loadFromHistory = useCallback((
		record: HistoryRecord,
		setMermaidCode: (code: string) => void,
		setStatusMessage: (msg: string) => void
	) => {
		setMermaidCode(record.code)
		setStatusMessage(`Loaded: ${record.name}`)
		setTimeout(() => setStatusMessage(''), 2000)

		// 返回编辑历史数据
		return {
			editHistory: record.editHistory || [],
			editHistoryIndex: record.editHistoryIndex || -1
		}
	}, [])

	// Delete history record
	const deleteHistoryRecord = useCallback((id: string, setStatusMessage: (msg: string) => void) => {
		const newRecords = historyRecords.filter(record => record.id !== id)
		setHistoryRecords(newRecords)
		saveToStorage(newRecords, nextHistoryId)

		setStatusMessage('History record deleted')
		setTimeout(() => setStatusMessage(''), 2000)
	}, [historyRecords, nextHistoryId, saveToStorage])

	// Export history record
	const exportHistoryRecord = useCallback((record: HistoryRecord, format: ExportFormat, setStatusMessage: (msg: string) => void) => {
		const timestamp = record.createdAt.toISOString().slice(0, 19).replace(/:/g, '-')
		const filename = `${record.name}-${timestamp}`

		let content = ''
		let extension = ''

		switch (format) {
			case 'json':
				content = JSON.stringify({
					name: record.name,
					code: record.code,
					createdAt: record.createdAt,
					svg: record.svg
				}, null, 2)
				extension = 'json'
				break
			case 'md':
				content = `# ${record.name}\n\nCreated: ${record.createdAt.toLocaleString()}\n\n\`\`\`mermaid\n${record.code}\n\`\`\``
				extension = 'md'
				break
			case 'svg':
				if (!record.svg) {
					setStatusMessage('This record has no SVG data')
					setTimeout(() => setStatusMessage(''), 2000)
					return
				}
				content = record.svg
				extension = 'svg'
				break
		}

		// Use VS Code API to save file
		vscode.postMessage({
			type: 'saveFile',
			filename: `${filename}.${extension}`,
			content: content,
			format: format
		})
		setStatusMessage(`Saving ${format.toUpperCase()} file...`)

		setTimeout(() => setStatusMessage(''), 2000)
	}, [])

	return {
		historyRecords,
		saveToHistory,
		loadFromHistory,
		deleteHistoryRecord,
		exportHistoryRecord
	}
}
