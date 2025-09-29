import React, { createContext, useState, useCallback } from "react"
import { ClaudeMessage, isV1ClaudeMessage } from "extension/shared/messages/extension-message"

interface CollapseContextType {
	collapsedMessages: Set<number>
	messages: ClaudeMessage[]
	isAllCollapsed: boolean
	toggleCollapse: (messageTs: number) => void
	isCollapsed: (messageTs: number) => boolean
	shouldShowMessage: (message: ClaudeMessage) => boolean
	collapseAll: () => void
	setMessages: (messages: ClaudeMessage[]) => void
	navigateToMessage: (messageTs: number) => void // 🎯 新增：导航到指定消息
}

export const CollapseContext = createContext<CollapseContextType | undefined>(undefined)

export function CollapseProvider({ children }: { children: React.ReactNode }) {
	const [messages, setMessages] = useState<ClaudeMessage[]>([])
	const [collapsedMessages, setCollapsedMessages] = useState<Set<number>>(new Set())
	const [isAllCollapsed, setIsAllCollapsed] = useState(false)

	const toggleCollapse = useCallback((messageTs: number) => {
		setCollapsedMessages((prev) => {
			const next = new Set(prev)
			if (next.has(messageTs)) {
				next.delete(messageTs)
			} else {
				next.add(messageTs)
			}
			return next
		})
	}, [])

	const isCollapsed = useCallback(
		(messageTs: number) => {
			return collapsedMessages.has(messageTs)
		},
		[collapsedMessages]
	)

	const shouldShowMessage = useCallback(
		(message: ClaudeMessage) => {
			// Only V1 messages can be collapsed
			if (!isV1ClaudeMessage(message)) {
				return true
			}

			// Always show API request messages
			if (message.say === "api_req_started") {
				return true
			}

			// Find the previous API request message
			const messageIndex = messages.findIndex((m) => m.ts === message.ts)

			// Iterate backwards from current message to find the previous API request
			let previousApiRequest: ClaudeMessage | undefined
			for (let i = messageIndex - 1; i >= 0; i--) {
				const msg = messages[i]
				if (
					isV1ClaudeMessage(msg) &&
					(msg.say === "api_req_started" || msg.say === "user_feedback" || msg.say === "info")
				) {
					previousApiRequest = msg
					break
				}
			}

			// If there's no previous API request or it's not collapsed, show the message
			if (!previousApiRequest || !collapsedMessages.has(previousApiRequest.ts)) {
				return true
			}

			// Always show user feedback messages, even when collapsed
			if (message.say === "user_feedback") {
				return true
			}

			// If the previous API request is collapsed, hide this message
			return false
		},
		[messages, collapsedMessages]
	)

	const collapseAll = useCallback(() => {
		if (isAllCollapsed) {
			// 🎯 展开所有消息 - 显示完整对话
			setCollapsedMessages(new Set())
			setIsAllCollapsed(false)
		} else {
			// 🎯 全局任务进度预览 - 只保留用户的对话内容
			// 折叠所有非用户消息（AI回复、工具执行、系统状态等）
			setCollapsedMessages(
				new Set(
					messages
						.filter(
							(message) =>
								isV1ClaudeMessage(message) &&
								// 只保留真正的用户输入，折叠其他所有内容
								!(
									// 保留用户输入消息
									(message.type === "ask" &&
									 message.ask !== "tool" &&
									 message.ask !== "api_req_failed") ||
									// 保留用户反馈消息
									message.say === "user_feedback"
								)
						)
						.map((message) => message.ts)
				)
			)
			setIsAllCollapsed(true)
		}
	}, [messages, isAllCollapsed])

	// 🎯 导航到指定消息的功能
	const navigateToMessage = useCallback((messageTs: number) => {
		// 如果当前在Quick Overview模式，先切换到完整对话
		if (isAllCollapsed) {
			// 展开所有消息 - 显示完整对话
			setCollapsedMessages(new Set())
			setIsAllCollapsed(false)
		}

		// 滚动到指定消息
		setTimeout(() => {
			const messageElement = document.querySelector(`[data-message-ts="${messageTs}"]`)
			if (messageElement) {
				messageElement.scrollIntoView({
					behavior: "smooth",
					block: "start"
				})
			}
		}, 100) // 给切换模式一点时间
	}, [isAllCollapsed])

	const value = {
		collapsedMessages,
		messages,
		isAllCollapsed,
		toggleCollapse,
		isCollapsed,
		shouldShowMessage,
		collapseAll,
		setMessages,
		navigateToMessage, // 🎯 添加导航功能
	}

	return <CollapseContext.Provider value={value}>{children}</CollapseContext.Provider>
}
