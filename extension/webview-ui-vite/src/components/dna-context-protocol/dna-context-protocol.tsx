import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { EditorToolbar, DiagramControls, NodeEditor, EdgeEditor, NodeContextMenu, MainToolbar, VSCodeResizeHandle } from "./components"
import { MermaidMonacoEditor, type MermaidMonacoEditorRef } from "./components/mermaid-monaco-editor"
import { useHistory, useTemplates, useMermaid, useResize, useDropdowns, useDiagramInteraction, useDiagramEditor, useEdgeEditor, useNodeOperations, useEdgeManager } from "./hooks"
import { useEditHistory } from "./hooks/use-edit-history"
import { useDragImport } from "./hooks/use-drag-import"
import type { DnaContextProtocolProps } from "./types"
import { Dna } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"


export default function DnaContextProtocol({ isOpen, onClose, className }: DnaContextProtocolProps) {
	const [showHelp, setShowHelp] = useState(false)
	const [isEditorCollapsed, setIsEditorCollapsed] = useState(false)
	const editorContainerRef = useRef<HTMLDivElement>(null)
	const monacoEditorRef = useRef<MermaidMonacoEditorRef>(null)

	// Use custom hooks
	const { mermaidCode, setMermaidCode, renderedDiagram, isRendering, statusMessage, setStatusMessage, renderDiagram } = useMermaid(isOpen)
	const { edgeMap, deleteEdge: deleteEdgeFromManager, changeEdgeType, applyEdgeColor } = useEdgeManager({ mermaidCode, onCodeUpdate: setMermaidCode, onStatusMessage: setStatusMessage });
	const { editorWidth, isDragging, handleMouseDown } = useResize()
	const { showTemplateDropdown, setShowTemplateDropdown, showSaveFilesDropdown, setShowSaveFilesDropdown, showSnippetsDropdown, setShowSnippetsDropdown } = useDropdowns()
	const { selectedCategory, setSelectedCategory, filteredTemplates, applyTemplate } = useTemplates()
	const { historyRecords, saveToHistory, loadFromHistory, deleteHistoryRecord, exportHistoryRecord } = useHistory()

	// Edit history functionality
	const [showEditHistoryDropdown, setShowEditHistoryDropdown] = useState(false)

	// Auto-save functionality
	const [autoSaveEnabled, setAutoSaveEnabled] = useState(false)
	const [customSaveName, setCustomSaveName] = useState('')
	const [customInterval, setCustomInterval] = useState(30)
	const [intervalUnit, setIntervalUnit] = useState<'seconds' | 'minutes' | 'hours'>('seconds')
	const autoSaveTimerRef = useRef<NodeJS.Timeout>()

	// Clear editor undo functionality
	const [lastClearedContent, setLastClearedContent] = useState<string>('')
	const [lastClearedEditHistory, setLastClearedEditHistory] = useState<any[]>([])
	const [lastClearedEditIndex, setLastClearedEditIndex] = useState<number>(-1)
	const [canUndoClear, setCanUndoClear] = useState(false)
	const {
		editHistory,
		currentIndex: currentEditIndex,
		canUndo,
		canRedo,
		addEditRecord,
		undo,
		redo,
		jumpToHistory,
		clearHistory,
		restoreHistory,
		setAsInitialPoint,
		deleteRecord,
		togglePinRecord
	} = useEditHistory({ maxHistorySize: 50, minChangeThreshold: 3 })

	// Drag import functionality
	const { bindDragEvents } = useDragImport({
		onImport: (code: string, filename: string) => {
			setMermaidCode(code)
			setStatusMessage(`✅ File imported: ${filename}`)
			setTimeout(() => setStatusMessage(''), 3000)
		},
		onError: (message: string) => {
			setStatusMessage(message)
			setTimeout(() => setStatusMessage(''), 5000)
		},
		onInfo: (message: string) => {
			setStatusMessage(message)
			setTimeout(() => setStatusMessage(''), 3000)
		}
	})

	// Diagram editing functionality
	const {
		containerRef: editorContainerRef2,
		isEditMode,
		editingNode,
		editText,
		setEditText,
		toggleEditMode,
		saveEdit,
		cancelEdit,
		isEditing
	} = useDiagramEditor({
		mermaidCode,
		onCodeUpdate: setMermaidCode,
		onStatusMessage: setStatusMessage,
		isEnabled: true
	})

	// Connection line editing functionality
	const {
		containerRef: edgeContainerRef,
		isEdgeEditMode,
		editingEdge,
		editLabel,
		setEditLabel,
		toggleEdgeEditMode,
		saveEdit: saveEdgeEdit,
		cancelEdit: cancelEdgeEdit,
		isEditingEdge,
		connectionPreview,

	} = useEdgeEditor({
		mermaidCode,
		onCodeUpdate: setMermaidCode,
		onStatusMessage: setStatusMessage,
		isEnabled: true
	})

	// Node operation functionality
	const {
		containerRef: nodeOperationsRef,
		isOperationMode,
		contextMenu,
		draggedNode,
		addNode,
		deleteNode,
		editNodeText,
		closeContextMenu,
		changeNodeType,
		isOperating,
		renameNodeId,
		applyStyling,
		addComment
	} = useNodeOperations({
		mermaidCode,
		onCodeUpdate: setMermaidCode,
		onStatusMessage: setStatusMessage,
		isEnabled: true,
		isEditMode, // Pass edit mode state
		isEdgeEditMode,
		edgeMap,
		deleteEdge: deleteEdgeFromManager,
	})

	// Diagram interaction functionality (zoom, pan)
	const {
		containerRef: diagramContainerRef,
		zoomIn: diagramZoomIn,
		zoomOut: diagramZoomOut,
		resetView: diagramResetView,
		fitToContainer: diagramFitToContainer,
		togglePanMode,
		handleMouseDown: diagramHandleMouseDown,
		getTransformStyle,
		getContainerStyle,
		getZoomPercentage,
		canZoomIn,
		canZoomOut,
		isPanMode
	} = useDiagramInteraction({
		renderedDiagram,
		minScale: 0.1,
		maxScale: 20,
		scaleStep: 0.2,
		isEditing: isEditing || isEditingEdge || isOperating
	})

	// Bind drag events to editor container
	useEffect(() => {
		const container = editorContainerRef.current
		if (!container) return

		const cleanup = bindDragEvents(container)
		return cleanup
	}, [bindDragEvents])

	// Disable context menu in preview area
	useEffect(() => {
		const handleContextMenu = (e: Event) => {
			e.preventDefault()
			return false
		}

		// Get all elements that need context menu disabled
		const previewContainer = diagramContainerRef?.current
		if (previewContainer) {
			// Add context menu disable for preview container and all its child elements
			previewContainer.addEventListener('contextmenu', handleContextMenu, true)

			// Listen for DOM changes to disable context menu for newly added nodes
			const observer = new MutationObserver((mutations) => {
				mutations.forEach((mutation) => {
					mutation.addedNodes.forEach((node) => {
						if (node.nodeType === Node.ELEMENT_NODE) {
							const element = node as Element
							// Disable context menu for newly added elements and their children
							element.addEventListener?.('contextmenu', handleContextMenu, true)
							const children = element.querySelectorAll('*')
							children.forEach(child => {
								child.addEventListener('contextmenu', handleContextMenu, true)
							})
						}
					})
				})
			})

			observer.observe(previewContainer, {
				childList: true,
				subtree: true
			})

			return () => {
				previewContainer.removeEventListener('contextmenu', handleContextMenu, true)
				observer.disconnect()
			}
		}
	}, [diagramContainerRef, renderedDiagram])

	// Wrapper function to adapt hooks parameters
	const handleApplyTemplate = (template: any) => {
		applyTemplate(template, setMermaidCode, setStatusMessage)
		setShowTemplateDropdown(false)
		// 记录模板应用到编辑历史
		setTimeout(() => {
			addEditRecord(template.code, `应用模板: ${template.name}`)
		}, 100)
	}

	// Handle adding image node
	const handleAddImageNode = () => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/*';
		input.onchange = (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;

			const reader = new FileReader();
			reader.onload = (event) => {
				const base64Image = event.target?.result as string;
				// Mermaid requires HTML inside quotes, so we create an img tag
				const nodeText = `\"<img src='${base64Image}' width='100' alt='${file.name}' />\"`;
				addNode(nodeText, 'image');
				setStatusMessage(`✅ Image added: ${file.name}`);
				setTimeout(() => setStatusMessage(''), 3000);
			};
			reader.onerror = () => {
				setStatusMessage('❌ Failed to read image');
				setTimeout(() => setStatusMessage(''), 5000);
			}
			reader.readAsDataURL(file);
		};
		input.click();
	};

	// Handle adding text node
	const handleAddTextNode = () => {
		const textContent = prompt('Enter text content (for interface description):', 'Interface description text');
		if (textContent && textContent.trim()) {
			addNode(textContent.trim(), 'text');
			setStatusMessage('✅ Text node added');
			setTimeout(() => setStatusMessage(''), 3000);
		}
	};

	// Handle adding image to existing node
	const handleAddImageToNode = (nodeId: string) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/*';
		input.onchange = (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;

			const reader = new FileReader();
			reader.onload = (event) => {
				const base64Image = event.target?.result as string;
				const nodeText = `\"<img src='${base64Image}' width='100' alt='${file.name}' />\"`;
				editNodeText(nodeId, nodeText);
				setStatusMessage(`✅ Image added to ${nodeId}: ${file.name}`);
				setTimeout(() => setStatusMessage(''), 3000);
			};
			reader.onerror = () => {
				setStatusMessage('❌ Failed to read image');
				setTimeout(() => setStatusMessage(''), 5000);
			}
			reader.readAsDataURL(file);
		};
		input.click();
	};

	// Handle removing image from node
	const handleRemoveImageFromNode = (nodeId: string) => {
		const nodeType = nodeId.startsWith('Button') ? 'button' : 'image';
		const defaultText = nodeType === 'button' ? 'Button' : 'Image';
		editNodeText(nodeId, defaultText);
		setStatusMessage(`✅ Image removed from ${nodeId}`);
		setTimeout(() => setStatusMessage(''), 3000);
	};

	// Handle adding button node - now uses image selector like image node
	const handleAddButtonNode = () => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/*';
		input.onchange = (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;

			const reader = new FileReader();
			reader.onload = (event) => {
				const base64Image = event.target?.result as string;
				// Button nodes also use image content like image nodes
				const nodeText = `\"<img src='${base64Image}' width='100' alt='${file.name}' />\"`;
				addNode(nodeText, 'button');
				setStatusMessage(`✅ Button image added: ${file.name}`);
				setTimeout(() => setStatusMessage(''), 3000);
			};
			reader.onerror = () => {
				setStatusMessage('❌ Failed to read image');
				setTimeout(() => setStatusMessage(''), 5000);
			}
			reader.readAsDataURL(file);
		};
		input.click();
	};

		// Mutually exclusive mode switching
		const handleToggleEditMode = () => {
			if (!isEditMode) {
				if (isEdgeEditMode) toggleEdgeEditMode();
				if (isPanMode) togglePanMode();
			}
			toggleEditMode();
		};

		const handleToggleEdgeEditMode = () => {
			if (!isEdgeEditMode) {
				if (isEditMode) toggleEditMode();
				if (isPanMode) togglePanMode();
			}
			toggleEdgeEditMode();
		};



		const handleTogglePanMode = () => {
			if (!isPanMode) {
				if (isEditMode) toggleEditMode();
				if (isEdgeEditMode) toggleEdgeEditMode();
			}
			togglePanMode();
		};


	const handleSaveToHistory = () => {
		saveToHistory(mermaidCode, renderedDiagram, setStatusMessage, editHistory, currentEditIndex)
	}

	const handleLoadFromHistory = (record: any) => {
		const historyData = loadFromHistory(record, setMermaidCode, setStatusMessage)
		setShowSaveFilesDropdown(false)

		// 防御性检查：确保record存在
		if (!record) {
			console.warn('handleLoadFromHistory: record is null or undefined')
			clearHistory()
			return
		}

		// 根据History Records中的编辑历史状态决定处理方式
		if (record.editHistory && Array.isArray(record.editHistory) && record.editHistory.length > 0) {
			// 如果History Records包含编辑历史，则恢复编辑历史
			setTimeout(() => {
				try {
					const safeEditHistory = historyData.editHistory || record.editHistory || []
					const safeEditHistoryIndex = typeof historyData.editHistoryIndex === 'number'
						? historyData.editHistoryIndex
						: (typeof record.editHistoryIndex === 'number' ? record.editHistoryIndex : -1)

					restoreHistory(safeEditHistory, safeEditHistoryIndex)
				} catch (error) {
					console.error('Error restoring edit history:', error)
					clearHistory()
					addEditRecord(record.code || '', `加载历史: ${record.name || '未知'}`)
				}
			}, 100)
		} else {
			// 如果History Records的编辑历史为空，则清空当前编辑历史
			clearHistory()
			setTimeout(() => {
				addEditRecord(record.code || '', `加载历史: ${record.name || '未知'}`)
			}, 100)
		}
	}

	const handleDeleteHistoryRecord = (id: string) => {
		deleteHistoryRecord(id, setStatusMessage)
	}

	const handleExportHistoryRecord = (record: any, format: any) => {
		exportHistoryRecord(record, format, setStatusMessage)
	}

	// Handle inserting code snippet
	const handleInsertSnippet = (code: string) => {
		if (monacoEditorRef.current) {
			monacoEditorRef.current.insertSnippet(code)
		}
	}

	// Handle refresh rendering
	const handleRefreshRender = () => {
		renderDiagram()
		setStatusMessage('🔄 Refreshing render...')
	}

	// Edit history handlers
	const handleUndo = () => {
		if (monacoEditorRef.current && monacoEditorRef.current.canUndo()) {
			monacoEditorRef.current.undo()
		} else {
			const undoContent = undo()
			if (undoContent !== null) {
				setMermaidCode(undoContent)
				setStatusMessage('↶ 撤销操作')
				setTimeout(() => setStatusMessage(''), 2000)
			}
		}
	}

	const handleRedo = () => {
		if (monacoEditorRef.current && monacoEditorRef.current.canRedo()) {
			monacoEditorRef.current.redo()
		} else {
			const redoContent = redo()
			if (redoContent !== null) {
				setMermaidCode(redoContent)
				setStatusMessage('↷ 重做操作')
				setTimeout(() => setStatusMessage(''), 2000)
			}
		}
	}

	const handleJumpToEditHistory = (recordId: string) => {
		const content = jumpToHistory(recordId)
		if (content !== null) {
			setMermaidCode(content)
			setStatusMessage('📍 跳转到历史版本')
			setTimeout(() => setStatusMessage(''), 2000)
		}
	}

	const handleClearEditHistory = () => {
		clearHistory()
		setStatusMessage('🗑️ 编辑历史已清空')
		setTimeout(() => setStatusMessage(''), 2000)
	}

	// 设置为初始点处理函数
	const handleSetAsInitialPoint = (recordId: string) => {
		const newContent = setAsInitialPoint(recordId)
		if (newContent !== null) {
			setMermaidCode(newContent)
			setStatusMessage('📍 已设为初始点，后续历史已删除')
			setTimeout(() => setStatusMessage(''), 2000)
		}
	}

	// 删除记录处理函数
	const handleDeleteEditRecord = (recordId: string) => {
		const newContent = deleteRecord(recordId)
		if (newContent !== null && newContent !== undefined) {
			setMermaidCode(newContent)
			setStatusMessage('🗑️ 历史记录已删除')
		} else {
			setStatusMessage('🗑️ 历史记录已删除')
		}
		setTimeout(() => setStatusMessage(''), 2000)
	}

	// 切换pin状态处理函数
	const handleTogglePinEditRecord = (recordId: string) => {
		const result = togglePinRecord(recordId)
		if (result.success) {
			if (result.isPinned) {
				setStatusMessage('📌 记录已置顶')
			} else {
				setStatusMessage('📌 记录已取消置顶')
			}
		} else {
			setStatusMessage('❌ 操作失败')
		}
		setTimeout(() => setStatusMessage(''), 2000)
	}

	// 清空编辑器内容
	const handleClearEditor = () => {
		// 保存清空前的状态
		setLastClearedContent(mermaidCode)
		setLastClearedEditHistory([...editHistory])
		setLastClearedEditIndex(currentEditIndex)
		setCanUndoClear(true)

		// 执行清空操作
		setMermaidCode('')
		clearHistory()
		setStatusMessage('🗑️ 编辑器已清空 (右键撤销)')
		setTimeout(() => setStatusMessage(''), 3000)
	}

	// 撤销清空编辑器
	const handleUndoClearEditor = () => {
		if (canUndoClear) {
			// 恢复清空前的状态
			setMermaidCode(lastClearedContent)
			restoreHistory(lastClearedEditHistory, lastClearedEditIndex)
			setCanUndoClear(false)
			setStatusMessage('已撤销清空操作')
			setTimeout(() => setStatusMessage(''), 2000)
		}
	}

	// 自动保存处理函数
	const performAutoSave = useCallback(() => {
		if (!mermaidCode.trim()) return

		// 生成保存名称
		const saveName = customSaveName.trim() || `Auto-save ${new Date().toLocaleTimeString()}`

		// 使用现有的saveToHistory函数，传入自定义名称
		const autoSaveMessage = (msg: string) => {
			if (msg === 'Saved to history') {
				setStatusMessage(`💾 自动保存: ${saveName}`)
			} else {
				setStatusMessage(msg)
			}
			setTimeout(() => setStatusMessage(''), 2000)
		}

		saveToHistory(mermaidCode, renderedDiagram, autoSaveMessage, editHistory, currentEditIndex, saveName)
	}, [mermaidCode, renderedDiagram, editHistory, currentEditIndex, customSaveName, saveToHistory])

	// 计算毫秒间隔
	const getIntervalInMs = useCallback(() => {
		const baseMs = customInterval * 1000 // 转换为毫秒
		switch (intervalUnit) {
			case 'seconds':
				return baseMs
			case 'minutes':
				return baseMs * 60
			case 'hours':
				return baseMs * 60 * 60
			default:
				return baseMs
		}
	}, [customInterval, intervalUnit])

	// 自动保存定时器管理
	useEffect(() => {
		if (autoSaveEnabled && mermaidCode.trim()) {
			// 清除之前的定时器
			if (autoSaveTimerRef.current) {
				clearInterval(autoSaveTimerRef.current)
			}

			// 设置新的定时器，使用自定义时间间隔
			const intervalMs = getIntervalInMs()
			autoSaveTimerRef.current = setInterval(() => {
				performAutoSave()
			}, intervalMs)
		} else {
			// 如果禁用自动保存，清除定时器
			if (autoSaveTimerRef.current) {
				clearInterval(autoSaveTimerRef.current)
				autoSaveTimerRef.current = undefined
			}
		}

		// 清理函数
		return () => {
			if (autoSaveTimerRef.current) {
				clearInterval(autoSaveTimerRef.current)
			}
		}
	}, [autoSaveEnabled, mermaidCode, performAutoSave, getIntervalInMs])

	// Record edit history when mermaidCode changes
	useEffect(() => {
		// 只有当代码不为空时才记录
		if (mermaidCode.trim()) {
			addEditRecord(mermaidCode)
		}
	}, [mermaidCode, addEditRecord])



	if (!isOpen) return null

	return (
		<div className={cn("fixed inset-0 z-50 bg-background/80 backdrop-blur-sm", className)}>
			<div className="fixed inset-0 bg-background shadow-lg flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between border-b p-4">
					<div className="flex items-center gap-2">
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center gap-2">
									<Dna size={18} />
									<h2 className="text-lg font-semibold">DNA Context Protocol</h2>
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>Infuse the soul of natural language into the traditional beauty of flowcharts!</p>
							</TooltipContent>
						</Tooltip>

			{/* Style: Fix text blocking node shapes making them hard to click, disable context menu */}
			<style>
				{`
					.mermaid-diagram .node text,
					.mermaid-diagram .node tspan {
						pointer-events: none;
					}

					/* Disable context menu for nodes and diagram area */
					.mermaid-diagram,
					.mermaid-diagram *,
					.mermaid-diagram .node,
					.mermaid-diagram .node *,
					.mermaid-diagram .edgePath,
					.mermaid-diagram .edgePath *,
					.mermaid-diagram svg,
					.mermaid-diagram svg * {
						-webkit-user-select: none;
						-moz-user-select: none;
						-ms-user-select: none;
						user-select: none;
						-webkit-touch-callout: none;
						-webkit-tap-highlight-color: transparent;
					}

					/* Disable context menu via CSS */
					.mermaid-diagram {
						-webkit-context-menu: none;
						-moz-context-menu: none;
						context-menu: none;
					}
				`}
			</style>

					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={() => setShowHelp(!showHelp)}
							className="p-2 hover:bg-accent rounded"
							title="Help"
						>
							<span className="codicon codicon-question"></span>
						</button>
						<button onClick={onClose} className="p-2 hover:bg-accent rounded" title="Close">
							<span className="codicon codicon-close"></span>
						</button>
					</div>
				</div>

				{/* Help Panel */}
				{showHelp && (
					<div className="border-b bg-muted/20 p-4">
						<h3 className="font-medium mb-2">Mermaid Syntax Help</h3>
						<div className="text-sm text-muted-foreground space-y-1">
							<p>• Flowchart: graph TD; A --&gt; B</p>
							<p>• Sequence Diagram: sequenceDiagram; A-&gt;&gt;B: message</p>
							<p>• Class Diagram: classDiagram; class User</p>
							<p>• State Diagram: stateDiagram-v2; [*] --&gt; State1</p>
						</div>
					</div>
				)}

				{/* Main Content */}
				<div className="flex flex-1 min-h-0 dna-context-protocol-container">
					{/* Preview Section - Left */}
					<div className="flex-1 flex flex-col bg-background relative">
						{/* Preview Header */}
						<div className="flex items-center justify-between p-2 border-b bg-muted/50">
							<span className="text-sm font-medium">Preview</span>
							<div className="flex items-center gap-2">
								{statusMessage && (
									<span className="text-xs text-muted-foreground">{statusMessage}</span>
								)}
								{isRendering && (
									<div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
								)}
							</div>
						</div>

						{/* Diagram control toolbar */}
						{renderedDiagram && (
							<div className="absolute top-12 right-4 z-10 flex flex-col gap-2">
								<DiagramControls
									zoomPercentage={getZoomPercentage()}
									canZoomIn={canZoomIn}
									canZoomOut={canZoomOut}
									onZoomIn={diagramZoomIn}
									onZoomOut={diagramZoomOut}
								/>




							</div>
						)}

						{/* Preview Content */}
						<div
							ref={(el) => {
								// Set all four refs simultaneously
								if (diagramContainerRef && 'current' in diagramContainerRef) {
									(diagramContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el
								}
								if (editorContainerRef2 && 'current' in editorContainerRef2) {
									(editorContainerRef2 as React.MutableRefObject<HTMLDivElement | null>).current = el
								}
								if (edgeContainerRef && 'current' in edgeContainerRef) {
									(edgeContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el
								}
								if (nodeOperationsRef && 'current' in nodeOperationsRef) {
									(nodeOperationsRef as React.MutableRefObject<HTMLDivElement | null>).current = el
								}
							}}
							className="flex-1 p-4 overflow-hidden relative"
							style={getContainerStyle()}
							onMouseDown={(e) => {
								// In edge edit mode, left-click events are handled by edge editor first
								if (isEdgeEditMode && e.button === 0) {
									// Let edge editor handle first, if it handles then don't continue
									return
								}
								// Other cases are handled by diagram interaction
								diagramHandleMouseDown(e)
							}}
							tabIndex={0}
							onContextMenu={(e) => {
								// Disable default context menu, custom handling is in useDiagramInteraction hook
								e.preventDefault()
							}}
							onDragOver={(e) => {
								e.preventDefault()
								e.dataTransfer.dropEffect = 'copy'
							}}
							onDrop={(e) => {
								e.preventDefault()
								try {
									const data = JSON.parse(e.dataTransfer.getData('application/json'))
									if (data.nodeType) {
										const defaultText = `New ${data.nodeType === 'rectangle' ? 'Rectangle' :
											data.nodeType === 'rounded' ? 'Rounded' :
											data.nodeType === 'diamond' ? 'Diamond' : 'Circle'}`
										addNode(defaultText, data.nodeType)
									}
								} catch (error) {
									console.error('Failed to parse drag data:', error)
								}
							}}
						>
							{/* Figma-style floating toolbar */}
							<MainToolbar
								onAddNode={addNode}
								onDragStart={(nodeType) => {
									// Visual feedback can be added here for drag start
									console.log('Started dragging node type:', nodeType)
								}}
								onDragEnd={() => {
									// Cleanup work when drag ends
									console.log('Drag ended')
								}}
								isEditMode={isEditMode}
								isEdgeEditMode={isEdgeEditMode}
								isPanMode={isPanMode}
								onToggleEditMode={handleToggleEditMode}
								onToggleEdgeEditMode={handleToggleEdgeEditMode}
								onTogglePanMode={handleTogglePanMode}
								onAddImageNode={handleAddImageNode}
								onAddTextNode={handleAddTextNode}
								onAddButtonNode={handleAddButtonNode}
								onRefresh={handleRefreshRender}
								onFitToContainer={diagramFitToContainer}
								onResetView={diagramResetView}
							/>
							{renderedDiagram ? (
								<div
									className="mermaid-diagram w-full h-full flex items-center justify-center"
									style={getTransformStyle()}
									dangerouslySetInnerHTML={{ __html: renderedDiagram }}
								/>
							) : (
								<div className="flex items-center justify-center h-full text-muted-foreground">
									<div className="text-center">
										<span className="codicon codicon-graph text-4xl mb-4 block"></span>
										<p>Enter Mermaid code in the right editor</p>
										<p className="text-sm mt-2">Or select a template to start</p>
										<p className="text-xs mt-4 opacity-70">
											💡 Mouse wheel zoom supported<br/>
											Shortcuts: + zoom in, - zoom out, 0 reset, F fit to window<br/>
											{isEditMode && '🔧 Node edit mode: Double-click nodes to edit'}<br/>
											{isEdgeEditMode && '🔗 Edge edit mode: Double-click edges to edit'}<br/>
											{isOperationMode && '🛠️ Node operation mode: Right-click nodes for options, drag to rearrange'}
										</p>
									</div>
								</div>
							)}
								{/* Connection line preview */}
								{connectionPreview && (
									<svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
										<line
											x1={connectionPreview.x1}
											y1={connectionPreview.y1}
											x2={connectionPreview.x2}
											y2={connectionPreview.y2}
											stroke="#6c6c6c"
											strokeWidth="2"
											strokeDasharray="5,5"
										/>
									</svg>
								)}


							{/* Node editor */}
							{isEditing && editingNode && (
								<NodeEditor
									value={editText}
									onChange={setEditText}
									onSave={saveEdit}
									onCancel={cancelEdit}
									position={{
										x: editingNode.rect.x,
										y: editingNode.rect.y,
										width: editingNode.rect.width,
										height: editingNode.rect.height
									}}
								/>
							)}

							{/* Edge editor */}
							{isEditingEdge && editingEdge && (
								<EdgeEditor
									value={editLabel}
									onChange={setEditLabel}
									onSave={saveEdgeEdit}
									onCancel={cancelEdgeEdit}
									position={{
										x: editingEdge.rect.x,
										y: editingEdge.rect.y,
										width: editingEdge.rect.width,
										height: editingEdge.rect.height
									}}
								/>
							)}

							{/* Node context menu */}
							<NodeContextMenu
								isOpen={contextMenu.isOpen}
								x={contextMenu.x}
								y={contextMenu.y}
								nodeId={contextMenu.nodeId}
								isEditMode={isEditMode}
								isEdgeEditMode={contextMenu.isEdgeContext}
								outgoingEdges={contextMenu.outgoingEdges}
								onClose={closeContextMenu}
								onDelete={deleteNode}
								deleteEdge={deleteEdgeFromManager}
								onAddNode={addNode}
								onChangeNodeType={changeNodeType}
								onRenameNode={editNodeText}
								nodeText={contextMenu.nodeText}
								nodeComment={contextMenu.nodeComment}
								onRenameNodeId={renameNodeId}
								onApplyStyling={applyStyling}
								onAddComment={addComment}
								onChangeEdgeType={changeEdgeType}
								onApplyEdgeColor={applyEdgeColor}
								onAddImage={handleAddImageToNode}
								onRemoveImage={handleRemoveImageFromNode}
							/>


						</div>
					</div>

					{/* VSCode-style Resize Handle */}
					{!isEditorCollapsed && (
						<VSCodeResizeHandle
							onMouseDown={handleMouseDown}
							isDragging={isDragging}
						/>
					)}

					{/* Editor Section - Right */}
					<div
						ref={editorContainerRef}
						className="flex flex-col bg-muted/20 relative transition-all duration-200"
						style={{ width: isEditorCollapsed ? '40px' : `${editorWidth}px` }}
					>
						{/* Toolbar */}
						<EditorToolbar
							isEditorCollapsed={isEditorCollapsed}
							setIsEditorCollapsed={setIsEditorCollapsed}
							mermaidCode={mermaidCode}
							saveToHistory={handleSaveToHistory}
							showTemplateDropdown={showTemplateDropdown}
							setShowTemplateDropdown={setShowTemplateDropdown}
							selectedCategory={selectedCategory}
							setSelectedCategory={setSelectedCategory}
							filteredTemplates={filteredTemplates}
							applyTemplate={handleApplyTemplate}
							showSaveFilesDropdown={showSaveFilesDropdown}
							setShowSaveFilesDropdown={setShowSaveFilesDropdown}
							historyRecords={historyRecords}
							loadFromHistory={handleLoadFromHistory}
							deleteHistoryRecord={handleDeleteHistoryRecord}
							exportHistoryRecord={handleExportHistoryRecord}
							autoSaveEnabled={autoSaveEnabled}
							setAutoSaveEnabled={setAutoSaveEnabled}
							customSaveName={customSaveName}
							setCustomSaveName={setCustomSaveName}
							customInterval={customInterval}
							setCustomInterval={setCustomInterval}
							intervalUnit={intervalUnit}
							setIntervalUnit={setIntervalUnit}
							showSnippetsDropdown={showSnippetsDropdown}
							setShowSnippetsDropdown={setShowSnippetsDropdown}
							onInsertSnippet={handleInsertSnippet}
							showEditHistoryDropdown={showEditHistoryDropdown}
							setShowEditHistoryDropdown={setShowEditHistoryDropdown}
							editHistory={editHistory}
							currentEditIndex={currentEditIndex}
							canUndo={canUndo || (monacoEditorRef.current?.canUndo() ?? false)}
							canRedo={canRedo || (monacoEditorRef.current?.canRedo() ?? false)}
							onUndo={handleUndo}
							onRedo={handleRedo}
							onJumpToEditHistory={handleJumpToEditHistory}
							onClearEditHistory={handleClearEditHistory}
							onSetAsInitialPoint={handleSetAsInitialPoint}
							onDeleteEditRecord={handleDeleteEditRecord}
							onPinEditRecord={handleTogglePinEditRecord}
							onClearEditor={handleClearEditor}
							onUndoClearEditor={handleUndoClearEditor}
							canUndoClear={canUndoClear}
							onFormatDocument={() => monacoEditorRef.current?.formatDocument()}
						/>

						{/* Editor Content */}
						{!isEditorCollapsed && (
							<div className="flex-1 flex flex-col relative min-h-0">
								<MermaidMonacoEditor
									ref={monacoEditorRef}
									value={mermaidCode}
									onChange={setMermaidCode}
									className="flex-1"
									placeholder="Enter Mermaid code here...&#10;&#10;💡 Tip: You can also drag and drop .md, .mmd, .txt files to this area to import code"
									containerWidth={isEditorCollapsed ? 40 : editorWidth}
								/>

								{/* Drag overlay */}
								<div className="drag-overlay absolute inset-0 bg-primary/10 border-2 border-dashed border-primary/50 rounded-lg flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-200">
									<div className="text-center">
										<span className="codicon codicon-cloud-upload text-4xl text-primary mb-2 block"></span>
										<p className="text-primary font-medium">Release file to import Mermaid code</p>
										<p className="text-sm text-muted-foreground mt-1">Supports .md, .mmd, .txt, .mermaid files</p>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>




		</div>
	)
}