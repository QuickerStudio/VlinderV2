import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle, Globe, Download } from "lucide-react"
import React, { useEffect, useState } from "react"

import { ToolAddons, ToolBlock } from "../chat-tools"
import { WebFetchTool } from "extension/shared/new-tools"
import MarkdownRenderer from "../markdown-renderer"

type EnhancedWebFetchBlockProps = WebFetchTool & ToolAddons

export const EnhancedWebFetchBlock: React.FC<EnhancedWebFetchBlockProps> = ({
	url,
	content,
	approvalState,
	ts,
}) => {
	const [currentStep, setCurrentStep] = useState("Initializing request")
	const [fetchContent, setFetchContent] = useState("")

	useEffect(() => {
		if (approvalState === "loading") {
			const steps = ["Connecting to URL", "Fetching content", "Converting to Markdown", "Processing complete"]
			let currentStepIndex = 0

			const interval = setInterval(() => {
				setCurrentStep(steps[currentStepIndex])
				currentStepIndex = (currentStepIndex + 1) % steps.length
			}, 2000)

			return () => clearInterval(interval)
		}
	}, [approvalState])

	useEffect(() => {
		if (content) {
			setFetchContent(content)
		}
	}, [content])

	const renderContent = () => {
		if (approvalState === "loading") {
			return (
				<div className="flex items-center space-x-2 p-4">
					<Download className="h-4 w-4 animate-spin" />
					<span className="text-sm text-muted-foreground">{currentStep}</span>
				</div>
			)
		}

		if (approvalState === "error") {
			return (
				<div className="flex items-center space-x-2 p-4 text-destructive">
					<AlertCircle className="h-4 w-4" />
					<span className="text-sm">Failed to fetch content from URL</span>
				</div>
			)
		}

		if (approvalState === "approved" && fetchContent) {
			return (
				<ScrollArea className="max-h-96 w-full">
					<div className="p-4">
						<MarkdownRenderer markdown={fetchContent} />
					</div>
				</ScrollArea>
			)
		}

		return null
	}

	return (
		<ToolBlock
			icon={Globe}
			title="Web Fetch"
			summary={approvalState === "approved" ? "Content fetched successfully" : "Fetching content from URL"}
			tool="web_fetch"
			variant={approvalState === "approved" ? "success" : approvalState === "error" ? "destructive" : "default"}
			approvalState={approvalState}
			ts={ts}
		>
			<div className="mb-2">
				<span className="text-xs text-muted-foreground">
					{approvalState === "approved" ? "Content fetched from: " : "Fetching content from: "}
				</span>
				<a
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					className="text-xs text-blue-500 hover:text-blue-700 underline break-all"
					onClick={(e) => e.stopPropagation()}
				>
					{url}
				</a>
			</div>
			{renderContent()}
		</ToolBlock>
	)
}
