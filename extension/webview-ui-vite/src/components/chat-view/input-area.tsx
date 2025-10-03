import React, { KeyboardEvent, startTransition, useCallback, useEffect, useState, useTransition, useMemo, useRef } from "react"
import Thumbnails from "../thumbnails/thumbnails"
import { Button } from "../ui/button"
import InputV1 from "./input-v1"
import { AtSign, ImagePlus, SendHorizonal, BookOpen } from "lucide-react"
import { AbortButton } from "./abort-button"
import { EnhancePromptButton } from "./enhance-prompt-button"
import { ResumeTaskButton } from "./resume-task-button"
import { LightningButton } from "./lightning-button"
import { Lightning } from "./lightning"
import { vscode } from "@/utils/vscode"
import { ModelDisplay } from "./model-display"
import { Switch } from "../ui/switch"
import { useExtensionState } from "@/context/extension-state-context"
import { CircularProgress } from "../ui/circular-progress"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { useLightningWindow } from "@/hooks/use-lightning-window"
import { rpcClient } from "@/lib/rpc-client"

import { ScholarKnowledgeBasePopup } from "./scholar-knowledge-base-popup"
import { ScholarDialog } from "./scholar-dialog"
import { useScholarDialog } from "@/hooks/use-scholar-dialog"


interface InputAreaProps {
	inputRef: React.RefObject<HTMLTextAreaElement>
	inputValue: string
	setInputValue: (value: string) => void
	sendDisabled: boolean
	handleSendMessage: () => void
	handleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
	handlePaste: (e: React.ClipboardEvent) => void
	placeholderText: string
	selectedImages: string[]
	setSelectedImages: (images: string[]) => void
	shouldDisableImages: boolean
	selectImages: () => void
	thumbnailsHeight: number
	handleThumbnailsHeightChange: (height: number) => void
	isRequestRunning: boolean
	isInTask: boolean
	// Resume Task button props
	enableButtons: boolean
	primaryButtonText: string | undefined
	handlePrimaryButtonClick: () => void
	// Compression states
	isCompressing?: boolean
	isMaxContextReached?: boolean
}

const useHandleAbort = (isRequestRunning: boolean) => {
	const [isAborting, setIsAborting] = useState(false)
	const handleAbort = useCallback(() => {
		if (isAborting) return
		setIsAborting(true)

		vscode.postMessage({ type: "cancelCurrentRequest" })
	}, [isAborting])

	useEffect(() => {
		if (!isRequestRunning) {
			setIsAborting(false)
		}
	}, [isRequestRunning])

	return [handleAbort, isAborting] as const
}

const InputArea: React.FC<InputAreaProps> = ({
	inputValue,
	setInputValue,
	inputRef,
	sendDisabled,
	handleSendMessage,
	handleKeyDown,
	handlePaste,
	selectedImages,
	setSelectedImages,
	shouldDisableImages,
	selectImages,
	thumbnailsHeight,
	handleThumbnailsHeightChange,
	isRequestRunning,
	enableButtons,
	primaryButtonText,
	handlePrimaryButtonClick,
	isCompressing = false,
	isMaxContextReached = false,
}) => {
	const [_, setIsTextAreaFocused] = useState(false)
	const [handleAbort, isAborting] = useHandleAbort(isRequestRunning)
	const extensionState = useExtensionState()
	
	// 压缩完成后的绿色闪烁状态
	const [showSuccessFlash, setShowSuccessFlash] = useState(false)
	
	// 监听压缩完成事件
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const message = event.data
			if (message.type === "compressionStatus" && message.status === "completed") {
				setShowSuccessFlash(true)
				setTimeout(() => {
					setShowSuccessFlash(false)
				}, 1000)
			}
		}
		
		window.addEventListener('message', handleMessage)
		return () => window.removeEventListener('message', handleMessage)
	}, [])

	// Scholar Hook state
	const [isScholarHovered, setIsScholarHovered] = useState(false)
	const [isScholarPopupOpen, setIsScholarPopupOpen] = useState(false)
	const [scholarPopupPosition, setScholarPopupPosition] = useState({ x: 0, y: 0 })

	// Get Scholar Agent settings to check if it's enabled
	const { data: scholarData } = rpcClient.getScholarSettings.useQuery({})

	// Lightning window functionality
	const lightningWindow = useLightningWindow()

	// Scholar dialog functionality
	const scholarDialog = useScholarDialog()

	// Close Scholar popup when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (isScholarPopupOpen) {
				const target = event.target as Element
				// Don't close if clicking on Scholar button or popup content
				if (!target.closest('[data-scholar-button]') && !target.closest('[data-scholar-popup]')) {
					setIsScholarPopupOpen(false)
				}
			}
		}

		if (isScholarPopupOpen) {
			document.addEventListener('mousedown', handleClickOutside)
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [isScholarPopupOpen])

	// Scholar Hook functionality - Left click opens dialog
	const handleScholarHookClick = () => {
		scholarDialog.actions.toggleVisibility()
	}

	// Scholar Hook right-click functionality - Right click toggles Knowledge Base
	const handleScholarHookRightClick = (event: React.MouseEvent) => {
		event.preventDefault() // Prevent default context menu

		if (isScholarPopupOpen) {
			// If popup is already open, close it
			setIsScholarPopupOpen(false)
		} else {
			// If popup is closed, open it
			// Get button position for popup placement
			const rect = event.currentTarget.getBoundingClientRect()
			setScholarPopupPosition({
				x: rect.left,
				y: 52 // Same bottom position as Lightning dialog (52px from bottom)
			})
			setIsScholarPopupOpen(true)
		}
	}

	// Handle Scholar dialog response
	const handleScholarResponse = (response: string) => {
		// Insert Scholar response into the input field
		setInputValue(inputValue + response)
		// Hide the dialog after response
		scholarDialog.actions.toggleVisibility()
	}

	// Check if Scholar Agent is enabled
	const isScholarEnabled = !!scholarData?.scholarSettings



	const handleQuestionResponse = useCallback((response: string) => {
		// Insert the AI response into the main input field
		setInputValue(response)
		// Focus the main input after insertion
		setTimeout(() => {
			if (inputRef.current) {
				inputRef.current.focus()
				inputRef.current.setSelectionRange(response.length, response.length)
			}
		}, 0)
	}, [setInputValue, inputRef])

	// Add transition state for Resume Task button (similar to button-section.tsx)
	const [isPending] = useTransition()

	// Resume Task should always be shown when available, even in automatic mode
	// because it requires user input (unlike other buttons that can be automated)

	// Validation function from button-section.tsx
	const isValidStringOrNull = (str: string | undefined | null) => {
		return typeof str === "string" && str.length > 0
	}

	const handleAutomaticModeToggle = useCallback((checked: boolean) => {
		extensionState.setAlwaysAllowWriteOnly(checked)
		vscode.postMessage({ type: "alwaysAllowWriteOnly", bool: checked })
	}, [extensionState])

	const handlePromptEnhanced = useCallback((enhancedPrompt: string) => {
		setInputValue(enhancedPrompt)
		// Focus the input after enhancement
		setTimeout(() => {
			if (inputRef.current) {
				inputRef.current.focus()
				inputRef.current.setSelectionRange(enhancedPrompt.length, enhancedPrompt.length)
			}
		}, 0)
	}, [setInputValue, inputRef])

	// Drag handle state and logic
	const dragHandleRef = useRef<HTMLDivElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const [isDragging, setIsDragging] = useState(false)
	const [initialHeight, setInitialHeight] = useState(0)
	const [initialMouseY, setInitialMouseY] = useState(0)
	const [textareaHeight, setTextareaHeight] = useState(120) // Control textarea height

	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault()
		setIsDragging(true)
		setInitialMouseY(e.clientY)
		setInitialHeight(textareaHeight)
	}, [textareaHeight])

	const handleMouseMove = useCallback((e: MouseEvent) => {
		if (!isDragging) return

		const deltaY = initialMouseY - e.clientY // Reverse direction: drag up to increase height
		const newHeight = Math.max(120, initialHeight + deltaY) // Minimum height changed to 120px, consistent with original InputTextArea
		setTextareaHeight(newHeight)
	}, [isDragging, initialMouseY, initialHeight])

	const handleMouseUp = useCallback(() => {
		setIsDragging(false)
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
	return (
		<>
			<Lightning
				state={lightningWindow.state}
				actions={lightningWindow.actions}
				onResponseReceived={handleQuestionResponse}
			/>
			<div style={{ position: 'relative' }}>
				{/* Drag handle - located on the right, 20px from right window margin */}
				<div
					ref={dragHandleRef}
					onMouseDown={handleMouseDown}
					className="cursor-ns-resize transition-colors duration-200"
					style={{
						position: 'absolute',
						right: '20px',
						top: '-8px',
						width: '40px',
						height: '4px',
						backgroundColor: 'rgba(128, 128, 128, 0.3)',
						borderRadius: '2px',
						zIndex: 10
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.backgroundColor = '#66FFDA'
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.3)'
					}}
					title="Drag to resize input area"
				/>
			<div
				ref={containerRef}
				className="flex flex-col justify-end"
				style={{
					padding: "8px 8px",
					position: "relative",
					backgroundColor: "var(--vscode-input-background, #1f1f1fff)",
					borderRadius: "16px",
					border: "1px solid var(--vscode-input-border, rgba(255, 255, 255, 0.1))",
					// Remove fixed height, let container auto-adjust based on content
				}}
			>
				<div className="relative">
					<InputV1
						isRequestRunning={isRequestRunning}
						thumbnailsHeight={thumbnailsHeight}
						ref={inputRef}
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onInsertAt={() => {
							const newText = inputValue + "@"
							setInputValue(newText)
							setTimeout(() => {
								if (inputRef.current) {
									inputRef.current.focus()
									inputRef.current.setSelectionRange(newText.length, newText.length)
								}
							}, 0)
						}}
						onKeyDown={handleKeyDown}
						onFocus={() => setIsTextAreaFocused(true)}
						onBlur={() => setIsTextAreaFocused(false)}
						onPaste={handlePaste}
						height={textareaHeight}
					/>
					<Thumbnails
						images={selectedImages}
						setImages={setSelectedImages}
						onHeightChange={handleThumbnailsHeightChange}
						style={{
							position: "absolute",
							paddingTop: 4,
							bottom: 8,
							left: 8,
							// right: 67,
						}}
					/>


				</div>

				<div className="flex justify-between items-center px-1 pt-1">
					<div className="flex items-center gap-2">
						{/* Memory使用进度环 - 放置在模型选择器左边 */}
						{(extensionState.currentContextWindow ?? 0) > 0 && (
							<Tooltip>
								<TooltipTrigger asChild>
									<div>
										<CircularProgress
											value={extensionState.currentContextWindow ? Math.round((extensionState.currentContextTokens ?? 0) / extensionState.currentContextWindow * 100) : 0}
											size={20}
											strokeWidth={2}
											animationState={
												showSuccessFlash 
													? 'success-flash' 
													: isCompressing 
														? 'compressing' 
														: isRequestRunning 
															? 'breathing' 
															: 'normal'
											}
										/>
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p>Context Window: {extensionState.currentContextTokens?.toLocaleString() ?? 0} / {extensionState.currentContextWindow?.toLocaleString() ?? 0} tokens ({extensionState.currentContextWindow ? Math.round((extensionState.currentContextTokens ?? 0) / extensionState.currentContextWindow * 100) : 0}%)</p>
								</TooltipContent>
							</Tooltip>
						)}
						<ModelDisplay />
						<div className="flex items-center gap-1">
							<span className="text-xs text-muted-foreground">Auto</span>
							<Switch
								checked={extensionState.alwaysAllowWriteOnly}
								onCheckedChange={handleAutomaticModeToggle}
								aria-label="Automatic Mode"
							/>
						</div>
					</div>
					<div className="flex items-center gap-1">
						{/* <Button
							tabIndex={0}
							variant="ghost"
							className="!p-1 h-6 w-6"
							size="icon"
							aria-label="Insert @"
							onClick={() => {
								const newText = inputValue + "@"
								setInputValue(newText)
								setTimeout(() => {
									if (inputRef.current) {
										inputRef.current.focus()
										inputRef.current.setSelectionRange(newText.length, newText.length)
									}
								}, 0)
							}}>
							<AtSign size={16} />
						</Button> */}
						{/* Scholar Hook Button - Only show when Scholar Agent is enabled */}
						{isScholarEnabled && (
							<div className="relative" data-scholar-button>
								<Button
									tabIndex={0}
									variant="ghost"
									className="!p-1 h-6 w-6"
									size="icon"
									aria-label="Scholar Knowledge Base"
									onClick={handleScholarHookClick}
									onContextMenu={handleScholarHookRightClick}
									onMouseEnter={() => setIsScholarHovered(true)}
									onMouseLeave={() => setIsScholarHovered(false)}>
									<BookOpen size={16} />
								</Button>
								{/* Simplified hover tooltip - only show Scholar status */}
								{isScholarHovered && (
									<div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 w-40 p-2 rounded-md z-50 border border-border shadow-lg bg-card">
										<div className="flex items-center gap-2 text-xs">
											<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
											<span className="text-muted-foreground">Scholar Agent: Ready</span>
										</div>
									</div>
								)}
							</div>
						)}

						<LightningButton
							isActive={lightningWindow.state.isVisible}
							onClick={lightningWindow.actions.toggleVisibility}
						/>

						<Button
							tabIndex={0}
							disabled={shouldDisableImages}
							variant="ghost"
							className="!p-1 h-6 w-6"
							size="icon"
							aria-label="Attach Images"
							onClick={selectImages}>
							<ImagePlus size={16} />
						</Button>
						<EnhancePromptButton
							inputValue={inputValue}
							onPromptEnhanced={handlePromptEnhanced}
							disabled={sendDisabled || isRequestRunning}
						/>
						{isRequestRunning ? (
							<AbortButton isAborting={isAborting} onAbort={handleAbort} />
						) : (
							<>
								{/* Show Resume Task arrow when input is empty and Resume Task is available, otherwise show send button */}
								{!inputValue.trim() &&
								 isValidStringOrNull(primaryButtonText) &&
								 primaryButtonText?.includes("Resume Task") &&
								 enableButtons ? (
									<ResumeTaskButton
										enabled={true}
										onClick={handlePrimaryButtonClick}
										disabled={!enableButtons}
										isPending={isPending}
									/>
								) : (
									<Button
										tabIndex={0}
										disabled={sendDisabled}
										variant="ghost"
										className="!p-1 h-6 w-6"
										size="icon"
										aria-label="Send Message"
										onClick={handleSendMessage}>
										<SendHorizonal size={16} />
									</Button>
								)}
							</>
						)}
					</div>
				</div>


			</div>
		</div>

		{/* Scholar Knowledge Base Popup */}
		<ScholarKnowledgeBasePopup
			isOpen={isScholarPopupOpen}
			onClose={() => setIsScholarPopupOpen(false)}
			position={scholarPopupPosition}
		/>

		{/* Scholar Dialog */}
		<ScholarDialog
			state={scholarDialog.state}
			actions={scholarDialog.actions}
			onResponseReceived={handleScholarResponse}
		/>
	</>
)
}

export default InputArea
