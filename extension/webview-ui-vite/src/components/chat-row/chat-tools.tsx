/* eslint-disable @typescript-eslint/no-unused-vars */
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
	AlertCircle,
	Bot,
	CheckCircle,
	ChevronDown,
	ChevronUp,
	ClipboardCheck,
	Code,
	FileText,
	FolderTree,
	HelpCircle,
	Image,
	LoaderPinwheel,
	MessageCircle,
	MessageCircleReply,
	Pencil,
	Play,
	RefreshCw,
	Scissors,
	Search,
	Server,
	Square,
	Terminal,
	X,
	XCircle,
} from "lucide-react"
import React, { useMemo, useState } from "react"
import {
	AddInterestedFileTool,
	AskFollowupQuestionTool,
	AttemptCompletionTool,
	ChatTool,
	ExecuteCommandTool,
	ExploreRepoFolderTool,
	FileChangePlanTool,
	ListFilesTool,
	ReadFileTool,
	SearchFilesTool,
	SearchSymbolsTool,
	ServerRunnerTool,
	UrlScreenshotTool,
	WebFetchTool,
	SubmitReviewTool,
	MoveTool,
	RemoveTool,
	RenameTool,
	GitBashTool,
	KillBashTool,
	ReadProgressTool,
	TerminalTool,
} from "extension/shared/new-tools"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { ScrollArea, ScrollBar } from "../ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { EnhancedWebSearchBlock } from "./tools/web-search-tool"
import { EnhancedWebFetchBlock } from "./tools/web-fetch-tool"
import { FileEditorTool } from "./tools/file-editor-tool"
import { SpawnAgentBlock, ExitAgentBlock } from "./tools/agent-tools"
import MarkdownRenderer from "./markdown-renderer"
import { CodeBlock } from "./code-block"
import { getLanguageFromPath } from "@/utils/get-language-from-path"
import { rpcClient } from "@/lib/rpc-client"
import { vscode } from "@/utils/vscode"

type ApprovalState = ToolStatus
export type ToolAddons = {
	approvalState?: ApprovalState
	ts: number
	/**
	 * If this is a sub message, it will force it to stick to previous tool call in the ui (same message)
	 */
	isSubMsg?: boolean
	userFeedback?: string
}
type ToolBlockProps = {
	icon: React.FC<React.SVGProps<SVGSVGElement>>
	title: string
	children: React.ReactNode
	tool: ChatTool["tool"]
	variant: "default" | "primary" | "info" | "accent" | "info" | "success" | "info" | "destructive"
	summary?: string // New: Brief information
	collapsible?: boolean // New: Whether collapsible
	defaultExpanded?: boolean // New: Default expanded state
	autoCollapseDelay?: number // New: Auto-collapse delay time (milliseconds)
	customActions?: React.ReactNode // New: Custom action buttons
	onExpandedChange?: (expanded: boolean) => void // New: Expanded state change callback
} & ToolAddons

export const ToolBlock: React.FC<ToolBlockProps> = ({
	icon: Icon,
	title,
	children,
	variant,
	isSubMsg,
	approvalState,
	userFeedback,
	summary,
	collapsible = true,
	defaultExpanded = false,
	autoCollapseDelay,
	customActions,
	onExpandedChange,
}) => {
	const [isExpanded, setIsExpanded] = useState(defaultExpanded)

	// 🎯 Auto-collapse logic - includes success and failure states
	React.useEffect(() => {
		if (autoCollapseDelay && (approvalState === "approved" || approvalState === "error") && isExpanded) {
			const timer = setTimeout(() => {
				handleExpandedChange(false)
			}, autoCollapseDelay)

			return () => clearTimeout(timer)
		}
	}, [autoCollapseDelay, approvalState, isExpanded])

	// 🎯 When expanded state changes, notify parent component
	const handleExpandedChange = (expanded: boolean) => {
		setIsExpanded(expanded)
		onExpandedChange?.(expanded)
	}

	variant =
		approvalState === "loading"
			? "info"
			: approvalState === "error" || approvalState === "rejected"
				? "destructive"
				: approvalState === "approved"
					? "success"
					: variant
	const stateIcons = {
		pending: <AlertCircle className="w-5 h-5 text-info" />,
		approved: <CheckCircle className="w-5 h-5 text-success" />,
		rejected: <XCircle className="w-5 h-5 text-destructive" />,
		error: <AlertCircle className="w-5 h-5 text-destructive" />,
		loading: <LoaderPinwheel className="w-5 h-5 text-info animate-spin" />,
		feedback: <MessageCircleReply className="w-5 h-5 text-destructive" />,
	}

	if (!approvalState) {
		return null
	}

	return (
		<div
			className={cn(
				"border-l-4 bg-card text-card-foreground rounded-sm",
				{
					"border-primary": variant === "primary",
					"border-secondary": variant === "info",
					"border-accent": variant === "accent",
					"border-success": variant === "success",
					"border-info": variant === "info",
					"border-muted": variant === "default",
					"border-destructive": variant === "destructive",
				},
				isSubMsg && "!-mt-5"
			)}>
			{/* Flattened single-row layout - clickable to expand/collapse */}
			<div
				className={cn(
					"flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors",
					collapsible && "cursor-pointer"
				)}
				onClick={() => collapsible && handleExpandedChange(!isExpanded)}
			>
				{/* Left side: Icon + Title + Brief info */}
				<div className="flex items-center flex-1 min-w-0">
					<Icon className={cn("w-5 h-5 mr-2 flex-shrink-0", `text-${variant}`)} />
					<h3 className="text-sm font-semibold mr-3 flex-shrink-0">{title}</h3>
					{summary && (
						<span className="text-xs text-muted-foreground truncate">{summary}</span>
					)}
				</div>

				{/* Right side: Custom actions + Status icon + Expand/collapse icon */}
				<div className="flex items-center space-x-2">
					{/* 🎯 Custom action buttons */}
					{customActions && (
						<div onClick={(e) => e.stopPropagation()}>
							{customActions}
						</div>
					)}

					{userFeedback ? (
						<Tooltip>
							<TooltipTrigger>{stateIcons["feedback"]}</TooltipTrigger>
							<TooltipContent side="left">The tool got rejected with feedback</TooltipContent>
						</Tooltip>
					) : (
						stateIcons[approvalState]
					)}
					{collapsible && (
						isExpanded ?
							<ChevronUp className="w-4 h-4 text-muted-foreground" /> :
							<ChevronDown className="w-4 h-4 text-muted-foreground" />
					)}
				</div>
			</div>

			{/* Collapsible detailed content */}
			{collapsible ? (
				<Collapsible open={isExpanded} onOpenChange={handleExpandedChange}>
					<CollapsibleContent className="px-3 pb-3">
						<div className="text-sm border-t pt-3">{children}</div>
					</CollapsibleContent>
				</Collapsible>
			) : (
				<div className="px-3 pb-3 text-sm">{children}</div>
			)}
		</div>
	)
}

export const DevServerToolBlock: React.FC<ServerRunnerTool & ToolAddons> = ({
	commandType,
	commandToRun,
	approvalState,

	tool,
	serverName,
	ts,
	output,
	...rest
}) => {
	const [isOpen, setIsOpen] = useState(false)

	const getIcon = () => {
		switch (commandType) {
			case "start":
				return Play
			case "stop":
				return Square
			case "restart":
				return RefreshCw
			case "getLogs":
				return FileText
			default:
				return Server
		}
	}

	const Icon = getIcon()

	// 🎯 Custom right-side action button area
	const renderActionButtons = () => {
		if (approvalState === "pending") {
			return (
				<div className="flex items-center space-x-2">
					{/* Run Server icon button */}
					<Button
						size="sm"
						variant="default"
						className="h-8 w-8 p-0"
						onClick={() => {
							// 🎯 Use native constants and logic - send primary button click event
							vscode.postMessage({
								type: "askResponse",
								askResponse: "yesButtonTapped",
								text: "",
								images: []
							})
						}}
						title="Run Server"
					>
						<Play className="h-4 w-4" />
					</Button>

					{/* Cancel icon button */}
					<Button
						size="sm"
						variant="outline"
						className="h-8 w-8 p-0"
						onClick={() => {
							// 🎯 Use native constants and logic - send secondary button click event
							vscode.postMessage({
								type: "askResponse",
								askResponse: "noButtonTapped",
								text: "",
								images: []
							})
						}}
						title="Cancel"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			)
		}
		return null
	}

	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={Icon}
			title={`Dev Server - ${serverName}`}
			variant="primary"
			approvalState={approvalState}
			summary={commandToRun} // Display command to execute
			customActions={renderActionButtons()} // 🎯 Add custom action buttons
		>
			<div className="bg-muted p-2 rounded font-mono text-xs overflow-x-auto">
				<span className="text-success">$</span> {commandToRun}
			</div>

			{approvalState === "loading" && (
				<div className="mt-2 flex items-center">
					<span className="text-xs mr-2">
						Server is {commandType === "stop" ? "stopping" : "starting"}...
					</span>
					<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
				</div>
			)}

			{output && (
				<Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
					<CollapsibleTrigger asChild>
						<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
							<span>View Output</span>
							{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-2">
						<ScrollArea className="h-[200px] w-full rounded-md border">
							<ScrollArea className="h-[200px] w-full rounded-md border">
								<div className="p-4">
									<pre className="text-sm whitespace-pre-wrap text-pretty break-all">{output}</pre>
								</div>{" "}
								<ScrollBar orientation="vertical" />
							</ScrollArea>

							<ScrollBar orientation="vertical" />
						</ScrollArea>
					</CollapsibleContent>
				</Collapsible>
			)}

			{approvalState === "approved" && commandType === "start" && (
				<p className="text-xs mt-2 text-success">Server started successfully.</p>
			)}

			{approvalState === "approved" && commandType === "stop" && (
				<p className="text-xs mt-2 text-success">Server stopped successfully.</p>
			)}
			{approvalState === "approved" && commandType === "restart" && (
				<p className="text-xs mt-2 text-success">Server restarted successfully.</p>
			)}
			{approvalState === "approved" && commandType === "getLogs" && (
				<p className="text-xs mt-2 text-success">Server logs retrieved successfully.</p>
			)}

			{approvalState === "error" && (
				<p className="text-xs mt-2 text-destructive">An error occurred while {commandType}ing the server.</p>
			)}
		</ToolBlock>
	)
}
export const ChatTruncatedBlock = ({ ts }: { ts: number }) => {
	return (
		<ToolBlock
			ts={ts}
			tool="write_to_file"
			icon={Scissors}
			title="Chat Compressed"
			variant="info"
			approvalState="approved"
			isSubMsg={false}>
			<div className="space-y-4">
				<div className="bg-secondary/20 p-3 rounded-md">
					<p className="text-sm">
						The conversation history was compressed before reaching the maximum context window. Previous
						content may be unavailable, but the task can continue.
					</p>
				</div>
			</div>
		</ToolBlock>
	)
}

export const ChatMaxWindowBlock = ({ ts }: { ts: number }) => (
	<ToolBlock
		icon={AlertCircle}
		title="Maximum Context Reached"
		variant="destructive"
		approvalState="approved"
		isSubMsg={false}
		ts={ts}
		tool="write_to_file">
		<div className="bg-destructive/20 p-3 rounded-md">
			<p className="text-sm font-medium">This task has reached its maximum context limit and cannot continue.</p>
			<p className="text-sm mt-2">Please start a new task to continue working. Your progress has been saved.</p>
		</div>
	</ToolBlock>
)

export const ExecuteCommandBlock: React.FC<
	ExecuteCommandTool &
	ToolAddons & {
		hasNextMessage?: boolean
	}
> = ({ command, output, approvalState, tool, ts, ...rest }) => {
		const [isCopied, setIsCopied] = useState(false)
		const handleCopy = () => {
			if (command) {
				navigator.clipboard.writeText(command)
				setIsCopied(true)
				setTimeout(() => setIsCopied(false), 2000)
			}
		}
	// 🎯 自定义右侧操作按钮区域
	const renderActionButtons = () => {
		if (approvalState === "pending") {
			return (
				<div className="flex items-center space-x-2">
					{/* Run Command 图标按钮 */}
					<Button
						size="sm"
						variant="default"
						className="h-8 w-8 p-0"
						onClick={() => {
							// 🎯 使用原生常量和逻辑 - 发送主按钮点击事件
							vscode.postMessage({
								type: "askResponse",
								askResponse: "yesButtonTapped",
								text: "",
								images: []
							})
						}}
						title="Run Command"
					>
						<Play className="h-4 w-4" />
					</Button>

					{/* Cancel 图标按钮 */}
					<Button
						size="sm"
						variant="outline"
						className="h-8 w-8 p-0"
						onClick={() => {
							// 🎯 使用原生常量和逻辑 - 发送次按钮点击事件
							vscode.postMessage({
								type: "askResponse",
								askResponse: "noButtonTapped",
								text: "",
								images: []
							})
						}}
						title="Cancel"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			)
		}
		return null
	}

	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={Terminal}
			title="Execute Command"
			variant="info"
			approvalState={approvalState}
			summary={`$ ${command}`} // Display command in single-row layout
			customActions={renderActionButtons()} // 🎯 Add custom action buttons
			collapsible={true}>
			<div className="space-y-3">
				<div className="bg-muted p-2 rounded font-mono text-xs overflow-x-auto flex items-center justify-between group relative">
					<pre className="whitespace-pre-wrap text-pretty break-all">
						<span className="text-success">$</span> {command}
					</pre>
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1"
						onClick={handleCopy}
						title="Copy command"
					>
						{isCopied ? (
							<CheckCircle className="h-4 w-4 text-success" />
						) : (
							<ClipboardCheck className="h-4 w-4" />
						)}
					</Button>
				</div>

				{approvalState === "loading" && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">Executing command...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
					</div>
				)}

				{output && (
					<ScrollArea className="h-[200px] w-full rounded-md border">
						<div className="bg-secondary/20 p-3 rounded-md text-sm">
							<pre className="whitespace-pre-wrap text-pretty break-all">{output}</pre>
						</div>
						<ScrollBar orientation="vertical" />
					</ScrollArea>
				)}

				{approvalState === "approved" && (
					<p className="text-xs mt-2 text-success">Command executed successfully.</p>
				)}

				{approvalState === "error" && (
					<p className="text-xs mt-2 text-destructive">An error occurred while executing the command.</p>
				)}
			</div>
		</ToolBlock>
	)
}

export const ListFilesBlock: React.FC<ListFilesTool & ToolAddons> = ({
	path,
	recursive,
	approvalState,
	tool,
	ts,
	content,
	...rest
}) => {
	const [isOpen, setIsOpen] = React.useState(false)

	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={FolderTree}
			title="List Files"
			variant="info"
			approvalState={approvalState}>
			<p className="text-xs">
				<span className="font-semibold">Folder:</span> {path}
			</p>
			<p className="text-xs">
				<span className="font-semibold">Include subfolders:</span> {recursive || "No"}
			</p>
			{content && (
				<Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
					<CollapsibleTrigger asChild>
						<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
							<span>View Output</span>
							{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-2">
						<ScrollArea className="h-[200px] w-full rounded-md border">
							<div className="bg-secondary/20 p-3 rounded-md text-sm">
								<pre className="whitespace-pre-wrap text-pretty break-all">{content}</pre>
							</div>
							<ScrollBar orientation="vertical" />
						</ScrollArea>
					</CollapsibleContent>
				</Collapsible>
			)}
		</ToolBlock>
	)
}

export const ExploreRepoFolderBlock: React.FC<ExploreRepoFolderTool & ToolAddons> = ({
	path,
	approvalState,
	tool,
	ts,
	...rest
}) => (
	<ToolBlock
		{...rest}
		ts={ts}
		tool={tool}
		icon={Code}
		title="Explore Repository Folder"
		variant="accent"
		approvalState={approvalState}>
		<p className="text-xs">
			<span className="font-semibold">Scanning folder:</span> {path}
		</p>
	</ToolBlock>
)

export const SearchFilesBlock: React.FC<SearchFilesTool & ToolAddons> = ({
	path,
	regex,
	filePattern,
	approvalState,
	content: output,
	tool,
	ts,
	...rest
}) => {
	const [isOpen, setIsOpen] = React.useState(false)

	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={Search}
			title="Search Files"
			variant="info"
			approvalState={approvalState}>
			<p className="text-xs">
				<span className="font-semibold">Search in:</span> {path}
			</p>
			<p className="text-xs">
				<span className="font-semibold">Look for:</span> {regex}
			</p>
			{filePattern && (
				<p className="text-xs">
					<span className="font-semibold">File types:</span> {filePattern}
				</p>
			)}
			{output && (
				<Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
					<CollapsibleTrigger asChild>
						<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
							<span>View Output</span>
							{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-2">
						<ScrollArea className="h-[200px] w-full rounded-md border">
							<div className="bg-secondary/20 p-3 rounded-md text-sm">
								<pre className="whitespace-pre-wrap text-pretty">{output}</pre>
							</div>
							<ScrollBar orientation="vertical" />
							<ScrollBar orientation="horizontal" />
						</ScrollArea>
					</CollapsibleContent>
				</Collapsible>
			)}
		</ToolBlock>
	)
}

const CodeBlockMemorized = React.memo(({ content, path }: { content: string; path: string }) => {
	return (
		<ScrollArea className="h-[200px] w-full rounded-md border">
			<CodeBlock language={path} children={content} />
			<ScrollBar orientation="vertical" />
			<ScrollBar orientation="horizontal" />
		</ScrollArea>
	)
})

export const ReadFileBlock: React.FC<ReadFileTool & ToolAddons> = ({
	path,
	approvalState,
	content,
	tool,
	ts,
	...rest
}) => {
	const pathEnding = useMemo(() => getLanguageFromPath(path), [path])

	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={FileText}
			title="Read File"
			variant="primary"
			approvalState={approvalState}
			summary={path} // Display file path in single-row layout
			collapsible={true}>
			<div className="space-y-3">
				<p className="text-xs">
					<span className="font-semibold">File:</span>
					<Button
						onClick={() => {
							rpcClient.openFile.use({ filePath: path })
						}}
						variant="link"
						size="sm"
						className="ml-1 text-start">
						{path}
					</Button>
				</p>

				{content && content.length > 0 && (
					<div>
						{/* Use optimized code block component */}
						<CodeBlockMemorized content={content} path={pathEnding ?? "text"} />
					</div>
				)}
			</div>
		</ToolBlock>
	)
}

export type ToolStatus = "pending" | "rejected" | "approved" | "error" | "loading" | undefined

/**
 * 🎯 Follow-up Question Component - Important question style modification function
 *
 * This is the display component that controls AI follow-up questions
 * Responsible for:
 * - Display and formatting of question content
 * - Logic for auto-collapsing question list after 5 seconds (including success and failure states)
 * - Display of question summary in collapsed state
 *
 * Modifying this component can change:
 * - Question display style and layout
 * - Auto-collapse time (currently 5 seconds)
 * - Question content formatting method
 */
export const AskFollowupQuestionBlock: React.FC<AskFollowupQuestionTool & ToolAddons> = ({
	question,
	approvalState,

	tool,
	ts,
	...rest
}) => {
	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={HelpCircle}
			title="Follow-up Question"
			variant="info"
			approvalState={approvalState}
			summary={question} // Display question summary in collapsed state
			collapsible={true}
			defaultExpanded={true} // 🎯 Default expanded to show question
			autoCollapseDelay={5000} // 🎯 Auto-collapse after 5 seconds
		>
			<div className="bg-info/20 text-info-foreground p-2 rounded text-xs">
				<MarkdownRenderer>{question}</MarkdownRenderer>
			</div>
		</ToolBlock>
	)
}

export const AttemptCompletionBlock: React.FC<AttemptCompletionTool & ToolAddons> = ({
	result,
	approvalState,

	tool,
	ts,
	...rest
}) => (
	<ToolBlock
		{...rest}
		ts={ts}
		tool={tool}
		icon={CheckCircle}
		title="Task Completion"
		variant={approvalState === "approved" ? "success" : approvalState === "rejected" ? "destructive" : "info"}
		approvalState={approvalState}>
		{/* {command && (
			<div className="bg-muted p-2 rounded font-mono text-xs overflow-x-auto mb-2">
				<span className="text-success">$</span> {command}
			</div>
		)} */}
		<div className="bg-background text-foreground p-2 rounded text-xs w-full flex">
			<MarkdownRenderer markdown={result?.trim()} />
		</div>
	</ToolBlock>
)

export const UrlScreenshotBlock: React.FC<UrlScreenshotTool & ToolAddons> = ({
	url,
	approvalState,

	tool,
	base64Image,
	ts,
	...rest
}) => (
	<ToolBlock
		{...rest}
		ts={ts}
		tool={tool}
		icon={Image}
		title="URL Screenshot"
		variant="accent"
		approvalState={approvalState}>
		<p className="text-xs">
			<span className="font-semibold">Website:</span> {url}
		</p>
		{base64Image && (
			<div className="bg-muted rounded-md mt-2 text-xs w-full max-h-40 overflow-auto">
				<img src={`data:image/png;base64,${base64Image}`} alt="URL Screenshot" />
			</div>
		)}
	</ToolBlock>
)
export const SearchSymbolBlock: React.FC<SearchSymbolsTool & ToolAddons> = ({
	symbolName,
	content,
	approvalState,
	tool,
	ts,
	...rest
}) => {
	const [isOpen, setIsOpen] = React.useState(false)
	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={Search}
			title="Search Symbols"
			variant="accent"
			approvalState={approvalState}>
			<p className="text-xs">
				<span className="font-semibold">Symbol:</span> {symbolName}
			</p>
			{content && (
				<Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
					<CollapsibleTrigger asChild>
						<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
							<span>View Results</span>
							{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-2">
						<ScrollArea className="h-[200px] w-full rounded-md border">
							<div className="bg-secondary/20 p-3 rounded-md text-sm">
								<pre className="whitespace-pre-wrap">{content}</pre>
							</div>
							<ScrollBar orientation="vertical" />
							<ScrollBar orientation="horizontal" />
						</ScrollArea>
					</CollapsibleContent>
				</Collapsible>
			)}
		</ToolBlock>
	)
}

export const AddInterestedFileBlock: React.FC<AddInterestedFileTool & ToolAddons> = ({
	path,
	why,
	approvalState,
	tool,
	ts,
	...rest
}) => (
	<ToolBlock
		{...rest}
		ts={ts}
		tool={tool}
		icon={FileText}
		title="Track File"
		variant="info"
		approvalState={approvalState}>
		<p className="text-xs">
			<span className="font-semibold">File:</span> {path}
		</p>
		<p className="text-xs">
			<span className="font-semibold">Reason:</span> {why}
		</p>
	</ToolBlock>
)

export const FileChangesPlanBlock: React.FC<
	FileChangePlanTool &
	ToolAddons & {
		innerThoughts?: string
		innerSelfCritique?: string
		rejectedString?: string
	}
> = ({
	path,
	what_to_accomplish,
	approvalState,
	tool,
	ts,
	innerThoughts = "",
	innerSelfCritique = "",
	rejectedString,
	...rest
}) => {
		const [isReasoningOpen, setIsReasoningOpen] = React.useState(false)

		return (
			<ToolBlock
				{...rest}
				ts={ts}
				tool={tool}
				icon={FileText}
				title="File Changes Plan"
				variant="info"
				approvalState={approvalState}>
				<div className="text-xs space-y-3">
					<div className="space-y-1">
						<p>
							<span className="font-semibold">File:</span> {path}
						</p>
						<div>
							<span className="font-semibold">What to accomplish:</span>
							<div className="mt-1 bg-muted p-2 rounded-md">
								<MarkdownRenderer markdown={what_to_accomplish?.trim() ?? ""} />
							</div>
						</div>
					</div>

					{(innerThoughts.trim() || innerSelfCritique.trim()) && (
						<Collapsible
							open={isReasoningOpen}
							onOpenChange={setIsReasoningOpen}
							className="border-t pt-3 mt-3">
							<CollapsibleTrigger asChild>
								<Button variant="ghost" size="sm" className="flex items-center w-full justify-between px-0">
									<div className="flex items-center space-x-2">
										<MessageCircle className="h-4 w-4 text-info" />
										<span className="font-medium">View Vlinder Reasoning Steps</span>
									</div>
									{isReasoningOpen ? (
										<ChevronUp className="h-4 w-4" />
									) : (
										<ChevronDown className="h-4 w-4" />
									)}
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent className="mt-2 space-y-3">
								{innerThoughts.trim() && (
									<div className="bg-secondary/20 p-2 rounded-md">
										<h4 className="font-semibold flex items-center space-x-2 mb-1 text-xs uppercase tracking-wide text-secondary-foreground">
											<HelpCircle className="h-3 w-3" />
											<span>Inner Thoughts</span>
										</h4>
										<MarkdownRenderer markdown={innerThoughts.trim()} />
									</div>
								)}
								{innerSelfCritique.trim() && (
									<div className="bg-secondary/20 p-2 rounded-md">
										<h4 className="font-semibold flex items-center space-x-2 mb-1 text-xs uppercase tracking-wide text-secondary-foreground">
											<AlertCircle className="h-3 w-3" />
											<span>Inner Self-Critique</span>
										</h4>
										<MarkdownRenderer markdown={innerSelfCritique.trim()} />
									</div>
								)}
							</CollapsibleContent>
						</Collapsible>
					)}

					{rejectedString?.trim() && (
						<div className="bg-destructive/10 border border-destructive rounded-md p-3 mt-3">
							<div className="flex items-center space-x-2 mb-2 text-destructive">
								<AlertCircle className="h-4 w-4" />
								<span className="font-semibold text-sm">Plan Rejected</span>
							</div>
							<p className="text-sm text-destructive-foreground">
								Vlinder decided to reject the change plan because of:
							</p>
							<div className="bg-destructive/20 p-2 rounded-md mt-2">
								<MarkdownRenderer markdown={rejectedString.trim()} />
							</div>
						</div>
					)}
				</div>
			</ToolBlock>
		)
	}

export const SubmitReviewBlock: React.FC<SubmitReviewTool & ToolAddons> = ({
	review,
	approvalState,
	tool,
	ts,
	...rest
}) => {
	const [isOpen, setIsOpen] = React.useState(false)

	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={ClipboardCheck}
			title="Submit Review"
			variant="accent"
			approvalState={approvalState}>
			<div className="text-xs space-y-3">
				{review && (
					<Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
						<CollapsibleTrigger asChild>
							<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
								<span>View Review</span>
								{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-2">
							<ScrollArea className="h-[200px] w-full rounded-md border">
								<div className="bg-secondary/20 p-3 rounded-md text-sm">
									<MarkdownRenderer markdown={review} />
								</div>
								<ScrollBar orientation="vertical" />
							</ScrollArea>
						</CollapsibleContent>
					</Collapsible>
				)}
			</div>
		</ToolBlock>
	)
}

export const MoveBlock: React.FC<MoveTool & ToolAddons> = ({
	source_path,
	destination_path,
	type,
	overwrite,
	merge,
	approvalState,
	tool,
	ts,
	...rest
}) => {
	// 🎯 自定义右侧操作按钮区域
	const renderActionButtons = () => {
		if (approvalState === "pending") {
			return (
				<div className="flex items-center space-x-2">
					{/* Move 图标按钮 */}
					<Button
						size="sm"
						variant="default"
						className="h-8 w-8 p-0"
						onClick={() => {
							vscode.postMessage({
								type: "askResponse",
								askResponse: "yesButtonTapped",
								text: "",
								images: []
							})
						}}
						title="Move File/Directory"
					>
						<Play className="h-4 w-4" />
					</Button>

					{/* Cancel 图标按钮 */}
					<Button
						size="sm"
						variant="outline"
						className="h-8 w-8 p-0"
						onClick={() => {
							vscode.postMessage({
								type: "askResponse",
								askResponse: "noButtonTapped",
								text: "",
								images: []
							})
						}}
						title="Cancel"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			)
		}
		return null
	}

	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={FolderTree}
			title="Move File/Directory"
			variant="info"
			approvalState={approvalState}
			summary={`${source_path} → ${destination_path}`}
			customActions={renderActionButtons()}
			collapsible={true}>
			<div className="space-y-3">
				<div className="text-xs space-y-1">
					<p>
						<span className="font-semibold">From:</span> {source_path}
					</p>
					<p>
						<span className="font-semibold">To:</span> {destination_path}
					</p>
					{type && type !== "auto" && (
						<p>
							<span className="font-semibold">Type:</span> {type}
						</p>
					)}
					{overwrite && (
						<p>
							<span className="font-semibold">Overwrite:</span> Yes
						</p>
					)}
					{merge && (
						<p>
							<span className="font-semibold">Merge:</span> Yes
						</p>
					)}
				</div>

				{approvalState === "loading" && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">Moving...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
					</div>
				)}

				{approvalState === "approved" && (
					<p className="text-xs mt-2 text-success">Move operation completed successfully.</p>
				)}

				{approvalState === "error" && (
					<p className="text-xs mt-2 text-destructive">An error occurred while moving the file/directory.</p>
				)}
			</div>
		</ToolBlock>
	)
}

export const RemoveBlock: React.FC<RemoveTool & ToolAddons> = ({
	path,
	type,
	recursive,
	force,
	approvalState,
	tool,
	ts,
	...rest
}) => {
	// 🎯 自定义右侧操作按钮区域
	const renderActionButtons = () => {
		if (approvalState === "pending") {
			return (
				<div className="flex items-center space-x-2">
					{/* Remove 图标按钮 */}
					<Button
						size="sm"
						variant="destructive"
						className="h-8 w-8 p-0"
						onClick={() => {
							vscode.postMessage({
								type: "askResponse",
								askResponse: "yesButtonTapped",
								text: "",
								images: []
							})
						}}
						title="Remove File/Directory"
					>
						<X className="h-4 w-4" />
					</Button>

					{/* Cancel 图标按钮 */}
					<Button
						size="sm"
						variant="outline"
						className="h-8 w-8 p-0"
						onClick={() => {
							vscode.postMessage({
								type: "askResponse",
								askResponse: "noButtonTapped",
								text: "",
								images: []
							})
						}}
						title="Cancel"
					>
						<XCircle className="h-4 w-4" />
					</Button>
				</div>
			)
		}
		return null
	}

	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={X}
			title="Remove File/Directory"
			variant="destructive"
			approvalState={approvalState}
			summary={path}
			customActions={renderActionButtons()}
			collapsible={true}>
			<div className="space-y-3">
				<div className="text-xs space-y-1">
					<p>
						<span className="font-semibold">Path:</span> {path}
					</p>
					{type && type !== "auto" && (
						<p>
							<span className="font-semibold">Type:</span> {type}
						</p>
					)}
					{recursive !== undefined && (
						<p>
							<span className="font-semibold">Recursive:</span> {recursive ? "Yes" : "No"}
						</p>
					)}
					{force && (
						<p>
							<span className="font-semibold">Force:</span> Yes
						</p>
					)}
				</div>

				{approvalState === "loading" && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">Removing...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-destructive"></div>
					</div>
				)}

				{approvalState === "approved" && (
					<p className="text-xs mt-2 text-success">Remove operation completed successfully.</p>
				)}

				{approvalState === "error" && (
					<p className="text-xs mt-2 text-destructive">An error occurred while removing the file/directory.</p>
				)}
			</div>
		</ToolBlock>
	)
}

export const GitBashBlock: React.FC<
	GitBashTool &
		ToolAddons & {
			hasNextMessage?: boolean
		}
> = ({ command, timeout, captureOutput, output, approvalState, tool, ts, ...rest }) => {
	const [isCopied, setIsCopied] = useState(false)
	const handleCopy = () => {
		if (command) {
			navigator.clipboard.writeText(command)
			setIsCopied(true)
			setTimeout(() => setIsCopied(false), 2000)
		}
	}

	// 🎯 自定义右侧操作按钮区域
	const renderActionButtons = () => {
		if (approvalState === "pending") {
			return (
				<div className="flex items-center space-x-2">
					{/* Run Command 图标按钮 */}
					<Button
						size="sm"
						variant="default"
						className="h-8 w-8 p-0"
						onClick={() => {
							// 🎯 使用原生常量和逻辑 - 发送主按钮点击事件
							vscode.postMessage({
								type: "askResponse",
								askResponse: "yesButtonTapped",
								text: "",
								images: []
							})
						}}
						title="Run Command"
					>
						<Play className="h-4 w-4" />
					</Button>

					{/* Cancel 图标按钮 */}
					<Button
						size="sm"
						variant="outline"
						className="h-8 w-8 p-0"
						onClick={() => {
							// 🎯 使用原生常量和逻辑 - 发送次按钮点击事件
							vscode.postMessage({
								type: "askResponse",
								askResponse: "noButtonTapped",
								text: "",
								images: []
							})
						}}
						title="Cancel"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			)
		}
		return null
	}

	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={Terminal}
			title="Bash"
			variant="info"
			approvalState={approvalState}
			summary={`$ ${command}`} // Display command in single-row layout
			customActions={renderActionButtons()} // 🎯 Add custom action buttons
			collapsible={true}>
			<div className="space-y-3">
				<div className="bg-muted p-2 rounded font-mono text-xs overflow-x-auto flex items-center justify-between group relative">
					<pre className="whitespace-pre-wrap text-pretty break-all">
						<span className="text-success">$</span> {command}
					</pre>
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1"
						onClick={handleCopy}
						title="Copy command"
					>
						{isCopied ? (
							<CheckCircle className="h-4 w-4 text-success" />
						) : (
							<ClipboardCheck className="h-4 w-4" />
						)}
					</Button>
				</div>

				{approvalState === "loading" && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">Executing command...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
					</div>
				)}

				{output && (
					<ScrollArea className="h-[200px] w-full rounded-md border">
						<div className="bg-secondary/20 p-3 rounded-md text-sm">
							<pre className="whitespace-pre-wrap text-pretty break-all">{output}</pre>
						</div>
						<ScrollBar orientation="vertical" />
					</ScrollArea>
				)}

				{approvalState === "approved" && (
					<p className="text-xs mt-2 text-success">Command executed successfully.</p>
				)}

				{approvalState === "error" && (
					<p className="text-xs mt-2 text-destructive">An error occurred while executing the command.</p>
				)}
			</div>
		</ToolBlock>
	)
}

export const KillBashBlock: React.FC<
	KillBashTool &
		ToolAddons & {
			hasNextMessage?: boolean
		}
> = ({ terminalId, terminalName, lastCommand, isBusy, force, result, approvalState, tool, ts, ...rest }) => {
	const [isOpen, setIsOpen] = useState(false)

	// 🎯 自定义右侧操作按钮区域
	const renderActionButtons = () => {
		if (approvalState === "pending") {
			return (
				<div className="flex items-center space-x-2">
					{/* Kill Terminal 图标按钮 */}
					<Button
						size="sm"
						variant="destructive"
						className="h-8 w-8 p-0"
						onClick={() => {
							// 🎯 使用原生常量和逻辑 - 发送主按钮点击事件
							vscode.postMessage({
								type: "askResponse",
								askResponse: "yesButtonTapped",
								text: "",
								images: []
							})
						}}
						title="Kill Terminal"
					>
						<XCircle className="h-4 w-4" />
					</Button>

					{/* Cancel 图标按钮 */}
					<Button
						size="sm"
						variant="outline"
						className="h-8 w-8 p-0"
						onClick={() => {
							// 🎯 使用原生常量和逻辑 - 发送次按钮点击事件
							vscode.postMessage({
								type: "askResponse",
								askResponse: "noButtonTapped",
								text: "",
								images: []
							})
						}}
						title="Cancel"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			)
		}
		return null
	}

	// 构建摘要信息
	const terminalIdentifier = terminalName || `Terminal #${terminalId}`
	const summary = `${terminalIdentifier}${force ? " (Force)" : ""}`

	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={XCircle}
			title="Kill Terminal"
			variant="destructive"
			approvalState={approvalState}
			summary={summary}
			customActions={renderActionButtons()}
			collapsible={true}>
			<div className="space-y-3">
				{/* Terminal Information */}
				<div className="space-y-2">
					{terminalId !== undefined && (
						<p className="text-xs">
							<span className="font-semibold">Terminal ID:</span> {terminalId}
						</p>
					)}
					{terminalName && (
						<p className="text-xs">
							<span className="font-semibold">Terminal Name:</span> {terminalName}
						</p>
					)}
					{lastCommand && (
						<div className="text-xs">
							<span className="font-semibold">Last Command:</span>
							<div className="bg-muted p-2 rounded font-mono text-xs overflow-x-auto mt-1">
								<pre className="whitespace-pre-wrap text-pretty break-all">
									<span className="text-success">$</span> {lastCommand}
								</pre>
							</div>
						</div>
					)}
					{isBusy !== undefined && (
						<p className="text-xs">
							<span className="font-semibold">Status:</span>{" "}
							<span className={cn(isBusy ? "text-warning" : "text-muted-foreground")}>
								{isBusy ? "Busy" : "Idle"}
							</span>
						</p>
					)}
					{force !== undefined && (
						<p className="text-xs">
							<span className="font-semibold">Kill Method:</span>{" "}
							<span className={cn(force ? "text-destructive font-semibold" : "text-muted-foreground")}>
								{force ? "Force Kill" : "Graceful Termination"}
							</span>
						</p>
					)}
				</div>

				{/* Loading State */}
				{approvalState === "loading" && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">Terminating terminal...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-destructive"></div>
					</div>
				)}

				{/* Result Output */}
				{result && (
					<Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
						<CollapsibleTrigger asChild>
							<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
								<span>View Details</span>
								{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-2">
							<ScrollArea className="h-[200px] w-full rounded-md border">
								<div className="bg-secondary/20 p-3 rounded-md text-sm">
									<pre className="whitespace-pre-wrap text-pretty break-all">{result}</pre>
								</div>
								<ScrollBar orientation="vertical" />
							</ScrollArea>
						</CollapsibleContent>
					</Collapsible>
				)}

				{/* Success State */}
				{approvalState === "approved" && (
					<p className="text-xs mt-2 text-success">Terminal terminated successfully.</p>
				)}

				{/* Error State */}
				{approvalState === "error" && (
					<p className="text-xs mt-2 text-destructive">An error occurred while terminating the terminal.</p>
				)}
			</div>
		</ToolBlock>
	)
}

export const ReadProgressBlock: React.FC<ReadProgressTool & ToolAddons> = ({
	terminalId,
	terminalName,
	includeFullOutput,
	result,
	approvalState,
	tool,
	ts,
	...rest
}) => {
	const [isOpen, setIsOpen] = useState(false)

	// 自定义右侧操作按钮区域
	const renderActionButtons = () => {
		if (approvalState === "pending") {
			return (
				<div className="flex items-center space-x-2">
					{/* Read Progress 图标按钮 */}
					<Button
						size="sm"
						variant="default"
						className="h-8 w-8 p-0"
						onClick={() => {
							vscode.postMessage({
								type: "askResponse",
								askResponse: "yesButtonTapped",
								text: "",
								images: []
							})
						}}
						title="Read Progress"
					>
						<RefreshCw className="h-4 w-4" />
					</Button>

					{/* Cancel 图标按钮 */}
					<Button
						size="sm"
						variant="outline"
						className="h-8 w-8 p-0"
						onClick={() => {
							vscode.postMessage({
								type: "askResponse",
								askResponse: "noButtonTapped",
								text: "",
								images: []
							})
						}}
						title="Cancel"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			)
		}
		return null
	}

	// 构建摘要信息
	const terminalIdentifier = terminalName || `Terminal #${terminalId}`
	const summary = `${terminalIdentifier}${includeFullOutput ? " (Full Output)" : " (Recent)"}`

	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={RefreshCw}
			title="Read Terminal Progress"
			variant="info"
			approvalState={approvalState}
			summary={summary}
			customActions={renderActionButtons()}
			collapsible={true}>
			<div className="space-y-3">
				{/* Terminal Information */}
				<div className="space-y-2">
					{terminalId !== undefined && (
						<p className="text-xs">
							<span className="font-semibold">Terminal ID:</span> {terminalId}
						</p>
					)}
					{terminalName && (
						<p className="text-xs">
							<span className="font-semibold">Terminal Name:</span> {terminalName}
						</p>
					)}
					{includeFullOutput !== undefined && (
						<p className="text-xs">
							<span className="font-semibold">Output Mode:</span>{" "}
							<span className={cn(includeFullOutput ? "text-info" : "text-muted-foreground")}>
								{includeFullOutput ? "Full History" : "Recent Output (Last 20 lines)"}
							</span>
						</p>
					)}
				</div>

				{/* Loading State */}
				{approvalState === "loading" && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">Reading terminal progress...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-info"></div>
					</div>
				)}

				{/* Result Output */}
				{result && (
					<Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
						<CollapsibleTrigger asChild>
							<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
								<span>View Progress Details</span>
								{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-2">
							<ScrollArea className="h-[300px] w-full rounded-md border">
								<div className="bg-secondary/20 p-3 rounded-md text-sm">
									<pre className="whitespace-pre-wrap text-pretty break-all">{result}</pre>
								</div>
								<ScrollBar orientation="vertical" />
							</ScrollArea>
						</CollapsibleContent>
					</Collapsible>
				)}

				{/* Success State */}
				{approvalState === "approved" && (
					<p className="text-xs mt-2 text-success">Progress read successfully.</p>
				)}

				{/* Error State */}
				{approvalState === "error" && (
					<p className="text-xs mt-2 text-destructive">An error occurred while reading terminal progress.</p>
				)}
			</div>
		</ToolBlock>
	)
}

export const TerminalBlock: React.FC<TerminalTool & ToolAddons> = ({
	command,
	shell,
	cwd,
	timeout,
	env,
	captureOutput,
	interactive,
	terminalName,
	reuseTerminal,
	result,
	approvalState,
	tool,
	ts,
	...rest
}) => {
	const [isOpen, setIsOpen] = useState(false)
	const [isCopied, setIsCopied] = useState(false)

	// Copy command to clipboard
	const handleCopy = () => {
		navigator.clipboard.writeText(command)
		setIsCopied(true)
		setTimeout(() => setIsCopied(false), 2000)
	}

	// Parse XML result to extract structured data
	const parseResult = (xmlResult: string | undefined) => {
		if (!xmlResult) return null

		try {
			const statusMatch = xmlResult.match(/<status>(.*?)<\/status>/)
			const terminalIdMatch = xmlResult.match(/<id>(.*?)<\/id>/)
			const terminalNameMatch = xmlResult.match(/<name>(.*?)<\/name>/)
			const shellMatch = xmlResult.match(/<shell>(.*?)<\/shell>/)
			const commandMatch = xmlResult.match(/<command>(.*?)<\/command>/)
			const outputMatch = xmlResult.match(/<output>(.*?)<\/output>/s)
			const messageMatch = xmlResult.match(/<message>(.*?)<\/message>/)
			const elapsedMatch = xmlResult.match(/<elapsed>(.*?)<\/elapsed>/)
			const noteMatch = xmlResult.match(/<note>(.*?)<\/note>/)

			return {
				status: statusMatch?.[1] || "unknown",
				terminalId: terminalIdMatch?.[1],
				terminalName: terminalNameMatch?.[1],
				shell: shellMatch?.[1],
				command: commandMatch?.[1],
				output: outputMatch?.[1]?.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"),
				message: messageMatch?.[1],
				elapsed: elapsedMatch?.[1],
				note: noteMatch?.[1],
			}
		} catch (e) {
			return null
		}
	}

	const parsedResult = parseResult(result)

	// 自定义右侧操作按钮区域
	const customActions = approvalState === "pending" ? (
		<div className="flex items-center space-x-2">
			{/* Execute 图标按钮 */}
			<Button
				size="sm"
				variant="default"
				className="h-8 w-8 p-0"
				onClick={() => {
					vscode.postMessage({
						type: "askResponse",
						askResponse: "yesButtonTapped",
						text: "",
						images: []
					})
				}}
				title="Execute Command"
			>
				<Play className="h-4 w-4" />
			</Button>

			{/* Cancel 图标按钮 */}
			<Button
				size="sm"
				variant="outline"
				className="h-8 w-8 p-0"
				onClick={() => {
					vscode.postMessage({
						type: "askResponse",
						askResponse: "noButtonTapped",
						text: "",
						images: []
					})
				}}
				title="Cancel"
			>
				<X className="h-4 w-4" />
			</Button>
		</div>
	) : null

	// Helper function to format shell label
	const getShellLabel = (shellType: string | undefined): string => {
		if (!shellType || shellType === "auto") return "auto"
		const shellMap: Record<string, string> = {
			"powershell": "PowerShell",
			"git-bash": "Git Bash",
			"cmd": "CMD",
			"bash": "bash",
			"zsh": "zsh",
			"fish": "fish",
			"sh": "sh"
		}
		return shellMap[shellType] || shellType
	}

	// Build summary for collapsed state
	const shellLabel = getShellLabel(shell)
	const summary = `[${shellLabel}] ${command}`

	return (
		<ToolBlock
			icon={Terminal}
			title="Terminal"
			variant="default"
			approvalState={approvalState}
			customActions={customActions}
			summary={summary}
			collapsible={true}
			tool={tool}
			ts={ts}
			{...rest}
		>
			<div className="space-y-3">
				{/* Command with Shell Label */}
				<div className="space-y-2">
					<div className="flex items-center space-x-2">
						<span className="text-sm font-medium text-muted-foreground">Command:</span>
						<span className="text-xs bg-accent/50 px-2 py-0.5 rounded font-medium">
							{getShellLabel(shell)}
						</span>
						<span className="text-muted-foreground">|</span>
						<div className="flex-1 bg-muted px-3 py-1.5 rounded font-mono text-xs overflow-x-auto">
							{command}
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 flex-shrink-0"
							onClick={handleCopy}
							title="Copy command"
						>
							{isCopied ? (
								<CheckCircle className="h-4 w-4 text-success" />
							) : (
								<ClipboardCheck className="h-4 w-4" />
							)}
						</Button>
					</div>
				</div>

				{/* Working Directory */}
				{cwd && (
					<div className="flex items-start space-x-2">
						<span className="text-sm font-medium text-muted-foreground min-w-[80px]">Directory:</span>
						<code className="text-sm bg-muted px-2 py-1 rounded flex-1 break-all">{cwd}</code>
					</div>
				)}

				{/* Terminal Name */}
				{terminalName && (
					<div className="flex items-start space-x-2">
						<span className="text-sm font-medium text-muted-foreground min-w-[80px]">Terminal:</span>
						<span className="text-sm">{terminalName}</span>
					</div>
				)}

				{/* Options */}
				{(timeout || interactive || reuseTerminal || captureOutput === false) && (
					<div className="flex items-start space-x-2">
						<span className="text-sm font-medium text-muted-foreground min-w-[80px]">Options:</span>
						<div className="flex flex-wrap gap-2">
							{timeout && timeout !== 30000 && (
								<span className="text-xs bg-muted px-2 py-1 rounded">Timeout: {timeout}ms</span>
							)}
							{interactive && <span className="text-xs bg-muted px-2 py-1 rounded">Interactive</span>}
							{reuseTerminal && <span className="text-xs bg-muted px-2 py-1 rounded">Reuse Terminal</span>}
							{captureOutput === false && <span className="text-xs bg-muted px-2 py-1 rounded">No Capture</span>}
						</div>
					</div>
				)}

				{/* Environment Variables */}
				{env && Object.keys(env).length > 0 && (
					<div className="flex items-start space-x-2">
						<span className="text-sm font-medium text-muted-foreground min-w-[80px]">Env Vars:</span>
						<div className="flex flex-wrap gap-1">
							{Object.entries(env).map(([key, value]) => (
								<span key={key} className="text-xs bg-muted px-2 py-1 rounded">
									{key}={value}
								</span>
							))}
						</div>
					</div>
				)}

				{/* Status Message */}
				{parsedResult?.message && (
					<div className="flex items-start space-x-2">
						<span className="text-sm font-medium text-muted-foreground min-w-[80px]">Message:</span>
						<span className="text-sm">{parsedResult.message}</span>
					</div>
				)}

				{/* Execution Time */}
				{parsedResult?.elapsed && (
					<div className="flex items-start space-x-2">
						<span className="text-sm font-medium text-muted-foreground min-w-[80px]">Elapsed:</span>
						<span className="text-sm">{parsedResult.elapsed}</span>
					</div>
				)}

				{/* Note */}
				{parsedResult?.note && (
					<div className="flex items-start space-x-2">
						<span className="text-sm font-medium text-muted-foreground min-w-[80px]">Note:</span>
						<span className="text-sm text-yellow-600">{parsedResult.note}</span>
					</div>
				)}

				{/* Output */}
				{parsedResult?.output && (
					<Collapsible open={isOpen} onOpenChange={setIsOpen}>
						<CollapsibleTrigger asChild>
							<Button variant="ghost" size="sm" className="w-full justify-between">
								<span className="text-sm font-medium">Output</span>
								{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent>
							<ScrollArea className="h-[300px] w-full rounded-md border">
								<pre className="p-4 text-xs whitespace-pre-wrap break-words">{parsedResult.output}</pre>
								<ScrollBar orientation="horizontal" />
							</ScrollArea>
						</CollapsibleContent>
					</Collapsible>
				)}

				{/* Loading State */}
				{approvalState === "loading" && !result && (
					<div className="flex items-center space-x-2 text-sm text-muted-foreground">
						<LoaderPinwheel className="h-4 w-4 animate-spin" />
						<span>Executing command...</span>
					</div>
				)}

				{/* Status Indicators */}
				{parsedResult?.status === "success" && (
					<div className="flex items-center space-x-2 text-sm text-green-600">
						<CheckCircle className="h-4 w-4" />
						<span>Command completed successfully</span>
					</div>
				)}

				{parsedResult?.status === "timeout" && (
					<div className="flex items-center space-x-2 text-sm text-yellow-600">
						<AlertCircle className="h-4 w-4" />
						<span>Command timed out - may still be running</span>
					</div>
				)}

				{parsedResult?.status === "interactive" && (
					<div className="flex items-center space-x-2 text-sm text-blue-600">
						<Terminal className="h-4 w-4" />
						<span>Interactive mode - waiting for user input</span>
					</div>
				)}

				{approvalState === "error" && (
					<div className="flex items-center space-x-2 text-sm text-red-600">
						<XCircle className="h-4 w-4" />
						<span>Command execution failed</span>
					</div>
				)}
			</div>
		</ToolBlock>
	)
}

export const RenameBlock: React.FC<RenameTool & ToolAddons> = ({
	path,
	new_name,
	type,
	overwrite,
	approvalState,
	tool,
	ts,
	...rest
}) => {
	// 🎯 自定义右侧操作按钮区域
	const renderActionButtons = () => {
		if (approvalState === "pending") {
			return (
				<div className="flex items-center space-x-2">
					{/* Rename 图标按钮 */}
					<Button
						size="sm"
						variant="default"
						className="h-8 w-8 p-0"
						onClick={() => {
							vscode.postMessage({
								type: "askResponse",
								askResponse: "yesButtonTapped",
								text: "",
								images: []
							})
						}}
						title="Rename File/Directory"
					>
						<Pencil className="h-4 w-4" />
					</Button>

					{/* Cancel 图标按钮 */}
					<Button
						size="sm"
						variant="outline"
						className="h-8 w-8 p-0"
						onClick={() => {
							vscode.postMessage({
								type: "askResponse",
								askResponse: "noButtonTapped",
								text: "",
								images: []
							})
						}}
						title="Cancel"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			)
		}
		return null
	}

	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={Pencil}
			title="Rename File/Directory"
			variant="info"
			approvalState={approvalState}
			summary={`${path} → ${new_name}`}
			customActions={renderActionButtons()}
			collapsible={true}>
			<div className="space-y-3">
				<div className="text-xs space-y-1">
					<p>
						<span className="font-semibold">Current Path:</span> {path}
					</p>
					<p>
						<span className="font-semibold">New Name:</span> {new_name}
					</p>
					{type && type !== "auto" && (
						<p>
							<span className="font-semibold">Type:</span> {type}
						</p>
					)}
					{overwrite && (
						<p>
							<span className="font-semibold">Overwrite:</span> Yes
						</p>
					)}
				</div>

				{approvalState === "loading" && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">Renaming...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
					</div>
				)}

				{approvalState === "approved" && (
					<p className="text-xs mt-2 text-success">Rename operation completed successfully.</p>
				)}

				{approvalState === "error" && (
					<p className="text-xs mt-2 text-destructive">An error occurred while renaming the file/directory.</p>
				)}
			</div>
		</ToolBlock>
	)
}

export const ToolRenderer: React.FC<{
	tool: ChatTool
	hasNextMessage?: boolean
}> = ({ tool }) => {
	switch (tool.tool) {
		case "execute_command":
			return <ExecuteCommandBlock hasNextMessage {...tool} />
		case "list_files":
			return <ListFilesBlock {...tool} />
		case "explore_repo_folder":
			return <ExploreRepoFolderBlock {...tool} />
		case "search_files":
			return <SearchFilesBlock {...tool} />
		case "read_file":
			return <ReadFileBlock {...tool} />
		case "file_editor":
			return <FileEditorTool {...tool} />
		case "ask_followup_question":
			return <AskFollowupQuestionBlock {...tool} />
		case "attempt_completion":
			return <AttemptCompletionBlock {...tool} />
		case "web_search":
			return <EnhancedWebSearchBlock {...tool} />
		case "web_fetch":
			return <EnhancedWebFetchBlock {...tool} />
		case "url_screenshot":
			return <UrlScreenshotBlock {...tool} />
		case "server_runner":
			return <DevServerToolBlock {...tool} />
		case "search_symbol":
			return <SearchSymbolBlock {...tool} />
		case "add_interested_file":
			return <AddInterestedFileBlock {...tool} />
		case "spawn_agent":
			return <SpawnAgentBlock {...tool} />
		case "exit_agent":
			return <ExitAgentBlock {...tool} />
		case "submit_review":
			return <SubmitReviewBlock {...tool} />
		case "move":
			return <MoveBlock {...tool} />
		case "remove":
			return <RemoveBlock {...tool} />
		case "rename":
			return <RenameBlock {...tool} />
		case "git_bash":
			return <GitBashBlock {...tool} />
		case "kill_bash":
			return <KillBashBlock {...tool} />
		case "read_progress":
			return <ReadProgressBlock {...tool} />
		case "terminal":
			return <TerminalBlock {...tool} />
		default:
			return null
	}
}
