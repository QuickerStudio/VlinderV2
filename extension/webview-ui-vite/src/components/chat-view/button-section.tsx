import { useMemo, useTransition } from "react"
import { Button } from "../ui/button"
import { useExtensionState } from "@/context/extension-state-context"

/**
 * ButtonSection component Props interface, ButtonSection is indeed the core interface component for manual mode
 * Used to define text, state, and handler functions for primary and secondary buttons
 */
interface ButtonSectionProps {
	primaryButtonText: string | undefined      // Display text for primary button
	secondaryButtonText: string | undefined    // Display text for secondary button
	enableButtons: boolean                     // Whether to enable buttons (controls button clickable state)
	handlePrimaryButtonClick: () => void       // Primary button click handler function
	handleSecondaryButtonClick: () => void     // Secondary button click handler function
	isRequestRunning: boolean                  // Whether a request is currently running
}

/**
 * Custom Hook: Check if currently in automatic mode
 * @returns {boolean} Returns the state of alwaysAllowWriteOnly
 */
const useIsAutomaticMode = () => {
	const { alwaysAllowWriteOnly } = useExtensionState()
	return useMemo(() => alwaysAllowWriteOnly, [alwaysAllowWriteOnly])
}

/**
 * Utility function: Validate if string is valid and non-empty
 * @param str - String to validate
 * @returns {boolean} Returns true if string is valid and length > 0
 */
const isValidStringOrNull = (str: string | undefined | null) => {
	return typeof str === "string" && str.length > 0
}

/**
 * ButtonSection Component
 * Responsible for rendering the button area at the bottom of the chat interface, specifically for manual mode:
 * 1. Does not display any buttons in automatic mode (unless special operations require user confirmation)
 * 2. Displays primary and secondary action buttons in manual mode
 * 3. Mode switching is completely controlled by the Auto toggle button in Input Area
 */
function ButtonSection({
	primaryButtonText,
	secondaryButtonText,
	enableButtons,
	handlePrimaryButtonClick,
	isRequestRunning,        // Although not directly used currently, kept for future extension
	handleSecondaryButtonClick,
}: ButtonSectionProps) {
	// Used to handle transition state when buttons are clicked, preventing duplicate clicks
	const [isPending, startTransition] = useTransition()

	// Get whether currently in automatic mode
	const isAutomaticMode = useIsAutomaticMode()

	/**
	 * Render Logic 1: Do not display buttons in automatic mode
	 * No buttons are displayed in automatic mode
	 * Users can only control mode through the Auto toggle button in Input Area
	 */
	if (isAutomaticMode) {
		return null
	}

	/**
	 * Render Logic 2: If there is no valid primary button text, do not render anything
	 */
	if (!isValidStringOrNull(primaryButtonText)) return null

	/**
	 * Render Logic 3: Hide Resume Task button
	 * Because Resume Task functionality is now handled by input area
	 */
	if (primaryButtonText?.includes("Resume Task")) return null

	/**
	 * Render Logic 4: Exclude specific buttons
	 * Unified handling of button types that need to be hidden
	 */
	const hiddenButtonTexts = [
		"Run Server",         // Dev Server button has been replaced by ToolBlock
		"Run Command",        // Execute Command button has been replaced by ToolBlock
		"Move",               // Move button is not displayed above input area
		"Remove",             // Remove button is not displayed above input area
		"Rename",             // Rename button is not displayed above input area
		"Approve",            // File Editor button has been replaced by ToolBlock
		"Reject",             // File Editor button has been replaced by ToolBlock
		"Start New Task",     // Hide task management button
		"Mark as Completed",  // Hide task completion button
		"Mark as Incomplete"  // Hide task incomplete button
	]

	const shouldHideButton = hiddenButtonTexts.some(text =>
		primaryButtonText?.includes(text) || secondaryButtonText?.includes(text)
	)

	if (shouldHideButton) {
		return null // 🎯 These buttons are not displayed above the input area
	}

	/**
	 * Render Logic 5: Standard primary and secondary button layout
	 * Display primary button, and also display secondary button if secondary button text exists
	 */
	return (
		<div className="z-50 flex flex-wrap gap-2 px-4 pt-2 items-stretch">
			{/* Primary action button */}
			<Button
				size="sm"
				className={"flex-1"}
				disabled={!enableButtons || isPending}
				onClick={() => startTransition(() => handlePrimaryButtonClick())}>
				{primaryButtonText}
			</Button>

			{/* Secondary action button (only displayed when text exists) */}
			{secondaryButtonText && (
				<Button
					size="sm"
					variant="secondary"
					className="flex-1"
					disabled={!enableButtons || isPending}
					onClick={() => startTransition(() => handleSecondaryButtonClick())}>
					{secondaryButtonText}
				</Button>
			)}
		</div>
	)
}

/**
 * 导出 ButtonSection 组件
 *
 * 组件功能总结：
 * 1. 手动模式专用：专门为手动模式提供操作按钮
 * 2. 清晰的模式界限：自动模式下不显示按钮，避免混淆
 * 3. 用户交互控制：处理需要用户确认的操作
 * 4. 简化的用户体验：模式切换统一由 Input Area 的 Auto 开关控制
 *
 * 主要使用场景：
 * - 手动模式下的任务操作确认
 * - 特殊操作的用户确认（即使在自动模式下）
 * - 清晰的手动/自动模式界限
 */
export default ButtonSection

/**
 * 测试记录 - ButtonSection 删除测试
 *
 * 测试日期：2025-08-13
 * 测试目的：验证删除 ButtonSection 对系统的影响，特别是对自动/手动模式界限的影响
 *
 * 测试过程：
 * 1. 删除了 button-section.tsx 文件
 * 2. 清理了所有相关引用（chat-view.tsx, chat.ts 等）
 * 3. 删除了 Pause/Resume Automatic 相关的临时暂停逻辑
 * 4. 清理了后端的 temporayPauseAutomaticMode 状态管理
 *
 * 测试结果：
 * ✅ 成功简化了自动/手动模式的界限，更加清晰
 * ✅ Input Area 的 Auto 切换按钮工作正常，不受影响
 * ✅ 发送/停止按钮作为万能控制按钮的理念得到验证
 * ❌ 删除后直接截断任务，缺少必要的确认按钮
 * ❌ 影响到终端命令执行，缺少 "Run Command" / "Cancel" 按钮
 * ❌ 其他工具确认也受影响（文件编辑的 "Approve" / "Reject" 等）
 *
 * 关键发现：
 * 1. "Run Command" / "Cancel" 按钮是通过 use-message-handler.ts 的 toolButtonMap 设置的
 * 2. 这些按钮不在 isRequireUserInput 判断逻辑中，而是标准的工具确认流程
 * 3. 删除 ButtonSection 会断开工具确认的 UI 响应链
 * 4. 需要保留工具确认功能，但可以移除模式切换的混淆逻辑
 *
 * 结论：
 * - Pause/Resume Automatic 功能确实应该删除（界限更清晰）
 * - 但需要保留基本的工具确认按钮功能
 * - 可以创建简化版的确认组件，专门处理工具确认
 * - 发送/停止按钮确实是最好的万能控制方式
 */
