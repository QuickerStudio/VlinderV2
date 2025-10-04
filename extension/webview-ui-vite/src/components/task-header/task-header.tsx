
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { ClaudeMessage } from "extension/shared/messages/extension-message"
import { Button } from "../ui/button"
import { vscode } from "../../utils/vscode"
import { cn } from "@/lib/utils"

import TaskText from "./task-text"
import TokenInfo from "./token-info"
import { useExtensionState } from "@/context/extension-state-context"
import { useCollapseState } from "@/hooks/use-collapse-state"
import { useDnaContextProtocol } from "@/hooks/use-dna-context-protocol"

import { FoldVertical, Pencil, Download, Dna as Book } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { Input } from "../ui/input"
import { useState, useRef, useEffect } from "react"

import { rpcClient } from "@/lib/rpc-client"
import DnaContextProtocol from "../dna-context-protocol/dna-context-protocol"


interface TaskHeaderProps {
	firstMsg?: ClaudeMessage
	tokensIn: number
	tokensOut: number
	doesModelSupportPromptCache: boolean
	cacheWrites?: number
	cacheReads?: number
	totalCost: number
	onClose: () => void
	isHidden: boolean
	vscodeUriScheme?: string
	elapsedTime?: number
	lastMessageAt?: number
}



export default function TaskHeader({
	firstMsg,
	tokensIn,
	tokensOut,
	doesModelSupportPromptCache,
	cacheWrites,
	cacheReads,
	totalCost,
	onClose,
	vscodeUriScheme: _vscodeUriScheme,
	elapsedTime: _elapsedTime,
	lastMessageAt: _lastMessageAt,
}: TaskHeaderProps) {
	const { currentTaskId, currentTask, currentContextTokens, currentContextWindow } = useExtensionState()
	const { collapseAll, isAllCollapsed } = useCollapseState()
	const { isDnaContextProtocolOpen, toggleDnaContextProtocol, closeDnaContextProtocol } = useDnaContextProtocol()
	const { mutate: markAsComplete, isPending } = rpcClient.markAsDone.useMutation()


	// 编辑状态
	const [isEditing, setIsEditing] = useState(false)
	const [editValue, setEditValue] = useState("")
	const inputRef = useRef<HTMLInputElement>(null)

	const handleDownload = () => {
		vscode.postMessage({ type: "exportCurrentTask" })
	}

	const handleStartEdit = () => {
		const currentName = currentTask?.name ?? currentTask?.task ?? firstMsg?.text ?? ""
		setEditValue(currentName)
		setIsEditing(true)
	}

	const handleSaveEdit = () => {
		if (editValue.trim() && editValue !== (currentTask?.name ?? currentTask?.task ?? firstMsg?.text)) {
			// 使用 RPC 客户端调用重命名 API
			if (currentTaskId) {
				rpcClient.renameTask.use({
					taskId: currentTaskId,
					newName: editValue.trim()
				}).catch(console.error)
			}
		}
		setIsEditing(false)
	}

	const handleCancelEdit = () => {
		setIsEditing(false)
		setEditValue("")
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSaveEdit()
		} else if (e.key === "Escape") {
			handleCancelEdit()
		}
	}

	// 自动聚焦输入框
	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus()
			inputRef.current.select()
		}
	}, [isEditing])

	const handleClose = async () => {
		// 如果有当前任务，先标记为完成再关闭
		if (currentTaskId) {
			await markAsComplete({ taskId: currentTaskId })
		}
		onClose()
	}

	// 获取所有历史记录（排除当前任务）
	const { taskHistory } = useExtensionState()
	const recentHistory = taskHistory
		.filter((item) => item.ts && item.task && item.id !== currentTaskId)
		// 不限制数量，显示所有历史记录

	// 动态颜色生成器 - 使用黄金角度分布确保颜色不重复且醒目
	const generateVibrantColor = (index: number): string => {
		// 使用黄金角度 (137.508°) 来分布色相，确保颜色均匀分布且不重复
		const goldenAngle = 137.508
		const hue = (index * goldenAngle) % 360

		// 高饱和度和适中的亮度，确保颜色醒目
		const saturation = 70 + (index % 3) * 10 // 70-90% 饱和度
		const lightness = 55 + (index % 4) * 5   // 55-70% 亮度

		return `hsl(${hue}, ${saturation}%, ${lightness}%)`
	}

	// 为每个历史记录分配唯一颜色
	const getColorForIndex = (index: number) => {
		return generateVibrantColor(index)
	}

	// 高亮状态管理 - 使用 localStorage 持久化
	const HIGHLIGHTED_IDS_KEY = 'vlinder-highlighted-history-ids'

	// 从 localStorage 加载高亮状态
	const loadHighlightedIds = (): Set<string> => {
		try {
			const stored = localStorage.getItem(HIGHLIGHTED_IDS_KEY)
			if (stored) {
				const array = JSON.parse(stored) as string[]
				return new Set(array)
			}
		} catch (error) {
			console.error('Failed to load highlighted IDs:', error)
		}
		return new Set()
	}

	// 保存高亮状态到 localStorage
	const saveHighlightedIds = (ids: Set<string>) => {
		try {
			const array = Array.from(ids)
			localStorage.setItem(HIGHLIGHTED_IDS_KEY, JSON.stringify(array))
		} catch (error) {
			console.error('Failed to save highlighted IDs:', error)
		}
	}

	const [highlightedIds, setHighlightedIds] = useState<Set<string>>(loadHighlightedIds)

	const handleHistoryItemClick = (id: string) => {
		vscode.postMessage({ type: "showTaskWithId", text: id })
	}

	// 右键点击切换高亮
	const handleContextMenu = (e: React.MouseEvent, id: string) => {
		e.preventDefault()
		setHighlightedIds((prev) => {
			const newSet = new Set(prev)
			if (newSet.has(id)) {
				newSet.delete(id)
			} else {
				newSet.add(id)
			}
			// 保存到 localStorage
			saveHighlightedIds(newSet)
			return newSet
		})
	}

	// 格式化任务名称用于tooltip
	const formatTaskName = (name: string | undefined, task: string) => {
		return name || task
	}

	// 横向滚动容器的ref
	const scrollContainerRef = useRef<HTMLDivElement>(null)

	// 处理鼠标滚轮横向滚动 - 一格滚动一个按钮宽度
	const handleWheel = (e: React.WheelEvent) => {
		if (scrollContainerRef.current) {
			e.preventDefault()
			// 一个按钮的宽度 = 按钮宽度(28px) + 间距(8px) = 36px
			const buttonWidth = 36
			// 根据滚动方向决定移动距离
			const scrollAmount = e.deltaY > 0 ? buttonWidth : -buttonWidth
			scrollContainerRef.current.scrollLeft += scrollAmount
		}
	}

	return (
		<section className="pb-1">
			<div className="flex items-center gap-2">
					<Tooltip>
						<TooltipTrigger asChild>
							<VSCodeButton appearance="icon" onClick={handleStartEdit}>
								<Pencil className="h-4 w-4" />
							</VSCodeButton>
						</TooltipTrigger>
						<TooltipContent avoidCollisions side="bottom">
							Rename Task
						</TooltipContent>
					</Tooltip>
					<div className="flex items-center gap-2 flex-1 min-w-0">
						{isEditing ? (
							<Input
								ref={inputRef}
								value={editValue}
								onChange={(e) => setEditValue(e.target.value)}
								onKeyDown={handleKeyDown}
								onBlur={handleSaveEdit}
								className="text-base font-bold h-8 px-2"
							/>
						) : (
							<div
								className="truncate text-base font-bold cursor-pointer hover:bg-accent/20 px-2 py-1 rounded"
								onClick={handleStartEdit}
							>
								<TaskText text={currentTask?.name ?? currentTask?.task ?? firstMsg?.text} />
							</div>
						)}
					</div>

					{/* 历史记录横向滚动容器 - 容器宽度为3个按钮 */}
					{recentHistory.length > 0 && (
						<div
							ref={scrollContainerRef}
							onWheel={handleWheel}
							style={{
								display: 'flex',
								gap: '8px',
								overflowX: 'auto',
								overflowY: 'hidden',
								maxWidth: '72px', // 减少一个按钮宽度: 72px 等于 3个按钮 + 间距
								scrollbarWidth: 'none', // Firefox
								msOverflowStyle: 'none', // IE and Edge
								WebkitOverflowScrolling: 'touch',
							}}
							className="history-scroll-container"
						>
							<style>{`
								.history-scroll-container::-webkit-scrollbar {
									display: none;
								}
								.history-dot {
									width: 12px;
									height: 12px;
									border-radius: 50%;
									transition: all 0.2s ease;
								}
								.history-dot.highlighted {
									box-shadow: 0 0 12px 4px currentColor;
									animation: pulse 1.5s ease-in-out infinite;
								}
								@keyframes pulse {
									0%, 100% {
										box-shadow: 0 0 12px 4px currentColor;
									}
									50% {
										box-shadow: 0 0 20px 6px currentColor;
									}
								}
							`}</style>
							{recentHistory.map((item, index) => {
								const dotColor = getColorForIndex(index)
								const isHighlighted = highlightedIds.has(item.id)
								return (
									<Tooltip key={item.id}>
										<TooltipTrigger asChild>
											<VSCodeButton
												appearance="icon"
												onClick={() => handleHistoryItemClick(item.id)}
												onContextMenu={(e) => handleContextMenu(e, item.id)}
												style={{
													flexShrink: 0,
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
												}}
											>
												<div
													className={`history-dot ${isHighlighted ? 'highlighted' : ''}`}
													style={{
														backgroundColor: dotColor,
														color: dotColor,
													}}
												/>
											</VSCodeButton>
										</TooltipTrigger>
										<TooltipContent avoidCollisions side="bottom">
											{formatTaskName(item.name, item.task)}
										</TooltipContent>
									</Tooltip>
								)
							})}
						</div>
					)}
					<Tooltip>
						<TooltipTrigger asChild>
							<VSCodeButton appearance="icon" onClick={handleDownload}>
								<Download className="h-4 w-4" />
							</VSCodeButton>
						</TooltipTrigger>
						<TooltipContent avoidCollisions side="left">
							Download
						</TooltipContent>
					</Tooltip>


					<Tooltip>
						<TooltipTrigger asChild>
							<VSCodeButton appearance="icon" onClick={toggleDnaContextProtocol}>
								<Book
									size={16}
									className={cn("transition-colors", isDnaContextProtocolOpen && "text-accent-foreground")}
								/>
							</VSCodeButton>
						</TooltipTrigger>
						<TooltipContent avoidCollisions side="left">
							DNA Context Protocol
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<VSCodeButton appearance="icon" onClick={collapseAll}>
								<FoldVertical
									size={16}
									className={cn("transition-transform", isAllCollapsed && "rotate-180")}
								/>
							</VSCodeButton>
						</TooltipTrigger>
						<TooltipContent avoidCollisions side="left">
							Quick Overview
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<VSCodeButton
								appearance="icon"
								onClick={handleClose}
								disabled={isPending}>
								<span className="codicon codicon-close"></span>
							</VSCodeButton>
						</TooltipTrigger>
						<TooltipContent avoidCollisions side="left">
							Close
						</TooltipContent>
					</Tooltip>

					{/* TokenInfo 组件隐藏但保持功能，助手需要这些参数 */}
					<div style={{ display: 'none' }}>
						<TokenInfo
							tokensIn={currentTask?.tokensIn ?? tokensIn}
							tokensOut={currentTask?.tokensOut ?? tokensOut}
							doesModelSupportPromptCache={doesModelSupportPromptCache}
							cacheWrites={currentTask?.cacheWrites ?? cacheWrites}
							cacheReads={currentTask?.cacheReads ?? cacheReads}
							totalCost={currentTask?.totalCost ?? totalCost}
							currentContextTokens={currentContextTokens}
							currentContextWindow={currentContextWindow}
						/>
					</div>
				
		</div>

		{/* DNA Context Protocol */}
		<DnaContextProtocol
			isOpen={isDnaContextProtocolOpen}
			onClose={closeDnaContextProtocol}
		/>
	</section>
	)
}
