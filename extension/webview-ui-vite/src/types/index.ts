// 基础类型定义 - 避免直接依赖extension目录
export interface Resource {
	id: string
	type: "file" | "folder" | "url"
	name: string
	description?: string
}

export type ClaudeAskResponse = "yesButtonTapped" | "noButtonTapped" | "messageResponse"

export interface WebviewMessage {
	type: string
	text?: string
	askResponse?: ClaudeAskResponse
	images?: string[]
	attachements?: Resource[]
	bool?: boolean
}

export interface ExtensionMessage {
	type: string
	text?: string
	claudeMessages?: ClaudeMessage[]
	claudeMessage?: ClaudeMessage
	taskId?: string
	state?: any
}

export interface ClaudeMessage {
	ts: number
	type: "ask" | "say"
	ask?: string
	say?: string
	text?: string
	images?: string[]
	autoApproved?: boolean
	v?: number
	status?: "pending" | "rejected" | "approved" | "error" | "loading"
}

export interface HistoryItem {
	id: string
	ts: number
	task: string
	tokensIn: number
	tokensOut: number
	cacheWrites?: number
	cacheReads?: number
	totalCost: number
}

export interface ChatTool {
	tool: string
	ts: number
	approvalState?: "pending" | "rejected" | "approved" | "error" | "loading"
	isSubMsg?: boolean
	error?: string
	userFeedback?: string
}