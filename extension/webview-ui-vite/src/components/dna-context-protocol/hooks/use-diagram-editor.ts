import { useState, useCallback, useRef, useEffect } from 'react'

interface EditingNode {
	id: string
	originalText: string
	element: SVGElement
	rect: DOMRect
}

interface DiagramEditorOptions {
	mermaidCode: string
	onCodeUpdate: (newCode: string) => void
	onStatusMessage: (message: string) => void
	isEnabled?: boolean
}

export function useDiagramEditor({
	mermaidCode,
	onCodeUpdate,
	onStatusMessage,
	isEnabled = false
}: DiagramEditorOptions) {
	const [isEditMode, setIsEditMode] = useState(false)
	const [editingNode, setEditingNode] = useState<EditingNode | null>(null)
	const [editText, setEditText] = useState('')
	const containerRef = useRef<HTMLDivElement>(null)

	// 解析节点文本的正则表达式
	const parseNodeText = useCallback((nodeId: string, code: string): string | null => {
		// 匹配不同类型的节点定义
		const patterns = [
			// 基本节点: A[文本] 或 A(文本) 或 A{文本} 等
			new RegExp(`${nodeId}\\s*[\\[\\(\\{]([^\\]\\)\\}]+)[\\]\\)\\}]`, 'g'),
			// 简单节点: A --> B : 文本
			new RegExp(`${nodeId}\\s*-->\\s*\\w+\\s*:\\s*(.+)`, 'g'),
			// 标签节点: A["文本"] 或 A('文本')
			new RegExp(`${nodeId}\\s*[\\[\\(]["']([^"']+)["'][\\]\\)]`, 'g')
		]

		for (const pattern of patterns) {
			const match = pattern.exec(code)
			if (match && match[1]) {
				return match[1].trim()
			}
		}

		return null
	}, [])

	// 更新节点文本
	const updateNodeText = useCallback((nodeId: string, oldText: string, newText: string, code: string): string => {
		if (!newText.trim()) return code

		// 替换不同格式的节点文本
		const patterns = [
			// 基本节点格式
			{
				search: new RegExp(`(${nodeId}\\s*[\\[\\(\\{])([^\\]\\)\\}]+)([\\]\\)\\}])`, 'g'),
				replace: `$1${newText}$3`
			},
			// 标签节点格式
			{
				search: new RegExp(`(${nodeId}\\s*[\\[\\(]["'])([^"']+)(["'][\\]\\)])`, 'g'),
				replace: `$1${newText}$3`
			}
		]

		let updatedCode = code
		for (const pattern of patterns) {
			if (pattern.search.test(updatedCode)) {
				updatedCode = updatedCode.replace(pattern.search, pattern.replace)
				break
			}
		}

		return updatedCode
	}, [])

	// 获取节点ID从SVG元素
	const getNodeId = useCallback((element: SVGElement): string | null => {
		// 尝试从不同的属性中获取节点ID
		const possibleIds = [
			element.getAttribute('id'),
			element.getAttribute('data-id'),
			element.getAttribute('data-node-id'),
			element.closest('[id]')?.getAttribute('id'),
			element.closest('[data-id]')?.getAttribute('data-id')
		]

		for (const id of possibleIds) {
			if (id && id.includes('flowchart-')) {
				// 提取实际的节点ID (去掉前缀)
				return id.replace(/^flowchart-/, '').replace(/-\d+$/, '')
			}
		}

		return null
	}, [])

	// 检查元素是否是可编辑的节点
	const isEditableNode = useCallback((element: SVGElement): boolean => {
		// 检查是否是文本元素或包含文本的组
		const isTextElement = element.tagName === 'text' || element.tagName === 'tspan'
		const isNodeGroup = element.tagName === 'g' && (
			!!element.querySelector('text') ||
			!!element.querySelector('tspan') ||
			element.classList.contains('node')
		)

		return isTextElement || isNodeGroup
	}, [])



	// 保存编辑
	const saveEdit = useCallback(() => {
		if (!editingNode) return

		const newText = editText.trim()
		if (!newText) {
			onStatusMessage('❌ 文本不能为空')
			return
		}

		if (newText === editingNode.originalText) {
			setEditingNode(null)
			setEditText('')
			onStatusMessage('📝 未修改')
			return
		}

		const updatedCode = updateNodeText(
			editingNode.id,
			editingNode.originalText,
			newText,
			mermaidCode
		)

		onCodeUpdate(updatedCode)
		setEditingNode(null)
		setEditText('')
		onStatusMessage(`✅ 已更新节点: ${editingNode.id}`)
	}, [editingNode, editText, mermaidCode, updateNodeText, onCodeUpdate, onStatusMessage])

	// 取消编辑
	const cancelEdit = useCallback(() => {
		setEditingNode(null)
		setEditText('')
		onStatusMessage('❌ 已取消编辑')
	}, [onStatusMessage])

	// 处理键盘事件
	const handleKeyDown = useCallback((e: KeyboardEvent) => {
		if (!editingNode) return

		// 在编辑模式下，阻止其他键盘处理
		if (e.key === 'Enter') {
			e.preventDefault()
			e.stopPropagation()
			saveEdit()
		} else if (e.key === 'Escape') {
			e.preventDefault()
			e.stopPropagation()
			cancelEdit()
		}
	}, [editingNode, saveEdit, cancelEdit])

	// 绑定事件监听器
	useEffect(() => {
		const container = containerRef.current
		if (!container || !isEnabled) return

		document.addEventListener('keydown', handleKeyDown)

		return () => {
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [handleKeyDown, isEnabled])

	// 切换编辑模式
	const toggleEditMode = useCallback(() => {
		setIsEditMode(prev => {
			const newMode = !prev
			if (!newMode) {
				// 退出编辑模式时清理状态
				setEditingNode(null)
				setEditText('')
			}
			onStatusMessage(newMode ? '🔧 编辑模式已开启，单击节点进行重命名编辑' : '👁️ 编辑模式已关闭')
			return newMode
		})
	}, [onStatusMessage])

	return {
		containerRef,
		isEditMode,
		editingNode,
		editText,
		setEditText,
		toggleEditMode,
		saveEdit,
		cancelEdit,
		isEditing: !!editingNode
	}
}
