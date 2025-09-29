import React, { useState } from "react"
import { ContextEngineAgentTool } from "extension/shared/new-tools"
import { ToolAddons, ToolBlock } from "../chat-tools"
import { Search, Brain, GitBranch, Target, Clock, FileText, Code, History } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Progress } from "@/components/ui/progress"
import MarkdownRenderer from "../markdown-renderer"

interface ContextEngineResult {
	query: string
	searchType: string
	totalResults: number
	executionTime: number
	codeResults: Array<{
		id: string
		filePath: string
		startLine: number
		endLine: number
		content: string
		language: string
		chunkType: string
		relevanceScore: number
		metadata: {
			name?: string
			parentClass?: string
			parameters?: string[]
		}
	}>
	gitResults?: Array<{
		commitHash: string
		message: string
		author: string
		date: string
		filesChanged: string[]
		relevanceScore: number
	}>
	insights: {
		patterns: string[]
		recommendations: string[]
		relatedConcepts: string[]
		codeQuality: {
			score: number
			issues: string[]
			suggestions: string[]
		}
	}
	summary: string
}

export const ContextEngineAgentBlock: React.FC<ContextEngineAgentTool & ToolAddons> = ({
	query,
	searchType,
	scope,
	includeGitHistory,
	maxResults,
	analysisDepth,
	approvalState,
	tool,
	ts,
	...rest
}) => {
	const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["summary"]))
	const [selectedResult, setSelectedResult] = useState<number | null>(null)

	// Parse the result from the tool output if available
	const result: ContextEngineResult | null = (rest as any).result ?
		(typeof (rest as any).result === 'string' ? JSON.parse((rest as any).result) : (rest as any).result) : null

	const toggleSection = (section: string) => {
		const newExpanded = new Set(expandedSections)
		if (newExpanded.has(section)) {
			newExpanded.delete(section)
		} else {
			newExpanded.add(section)
		}
		setExpandedSections(newExpanded)
	}

	const getSearchTypeIcon = (type: string) => {
		switch (type) {
			case "semantic":
				return Brain
			case "structural":
				return Code
			case "historical":
				return History
			case "contextual":
				return Target
			default:
				return Search
		}
	}

	const getSearchTypeColor = (type: string) => {
		switch (type) {
			case "semantic":
				return "bg-blue-100 text-blue-800 border-blue-200"
			case "structural":
				return "bg-green-100 text-green-800 border-green-200"
			case "historical":
				return "bg-purple-100 text-purple-800 border-purple-200"
			case "contextual":
				return "bg-orange-100 text-orange-800 border-orange-200"
			default:
				return "bg-gray-100 text-gray-800 border-gray-200"
		}
	}

	const getChunkTypeIcon = (chunkType: string) => {
		switch (chunkType) {
			case "function":
			case "method":
				return "[F]"
			case "class":
				return "[C]"
			case "interface":
				return "[I]"
			case "type":
				return "[T]"
			case "variable":
				return "[V]"
			case "comment":
				return "[#]"
			case "import":
				return "[→]"
			default:
				return "[?]"
		}
	}

	const SearchTypeIcon = getSearchTypeIcon(searchType)

	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={SearchTypeIcon}
			title="Context Engine Agent"
			variant="info"
			approvalState={approvalState}>
			
			{/* Query Information */}
			<div className="flex flex-col space-y-3">
				<div className="flex items-center gap-2 flex-wrap">
					<Badge className={getSearchTypeColor(searchType)}>
						{searchType.charAt(0).toUpperCase() + searchType.slice(1)} Search
					</Badge>
					{scope && (
						<Badge variant="outline" className="text-xs">
							<FileText className="w-3 h-3 mr-1" />
							{scope}
						</Badge>
					)}
					{includeGitHistory && (
						<Badge variant="outline" className="text-xs">
							<GitBranch className="w-3 h-3 mr-1" />
							Git History
						</Badge>
					)}
				</div>

				<div className="bg-muted/50 rounded-lg p-3">
					<p className="text-sm font-medium mb-1">Query:</p>
					<p className="text-sm text-muted-foreground">{query}</p>
				</div>

				{/* Results Summary */}
				{result && (
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Badge variant="secondary">
									{result.totalResults} results
								</Badge>
								<Badge variant="outline" className="text-xs">
									<Clock className="w-3 h-3 mr-1" />
									{result.executionTime}ms
								</Badge>
							</div>
						</div>

						{/* Summary Section */}
						<Collapsible 
							open={expandedSections.has("summary")}
							onOpenChange={() => toggleSection("summary")}>
							<CollapsibleTrigger asChild>
								<Button variant="ghost" className="w-full justify-between p-2 h-auto">
									<span className="font-medium">📋 Summary</span>
									<span className="text-xs text-muted-foreground">
										{expandedSections.has("summary") ? "Hide" : "Show"}
									</span>
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent className="px-2 pb-2">
								<div className="bg-muted/30 rounded p-3 text-sm">
									{result.summary}
								</div>
							</CollapsibleContent>
						</Collapsible>

						{/* Code Results */}
						{result.codeResults.length > 0 && (
							<Collapsible 
								open={expandedSections.has("code")}
								onOpenChange={() => toggleSection("code")}>
								<CollapsibleTrigger asChild>
									<Button variant="ghost" className="w-full justify-between p-2 h-auto">
										<span className="font-medium">💻 Code Matches ({result.codeResults.length})</span>
										<span className="text-xs text-muted-foreground">
											{expandedSections.has("code") ? "Hide" : "Show"}
										</span>
									</Button>
								</CollapsibleTrigger>
								<CollapsibleContent className="px-2 pb-2">
									<ScrollArea className="h-64 rounded border">
										<div className="p-2 space-y-2">
											{result.codeResults.map((codeResult, index) => (
												<div 
													key={codeResult.id}
													className={`border rounded-lg p-3 cursor-pointer transition-colors ${
														selectedResult === index 
															? "border-primary bg-primary/5" 
															: "border-border hover:border-primary/50"
													}`}
													onClick={() => setSelectedResult(selectedResult === index ? null : index)}>
													
													<div className="flex items-center justify-between mb-2">
														<div className="flex items-center gap-2">
															<span className="text-sm">
																{getChunkTypeIcon(codeResult.chunkType)}
															</span>
															<span className="font-medium text-sm">
																{codeResult.metadata.name || codeResult.chunkType}
															</span>
															<Badge variant="outline" className="text-xs">
																{codeResult.language}
															</Badge>
														</div>
														<div className="flex items-center gap-2">
															<Progress 
																value={codeResult.relevanceScore} 
																className="w-16 h-2" 
															/>
															<span className="text-xs text-muted-foreground">
																{codeResult.relevanceScore.toFixed(0)}%
															</span>
														</div>
													</div>

													<div className="text-xs text-muted-foreground mb-2">
														{codeResult.filePath}:{codeResult.startLine}-{codeResult.endLine}
														{codeResult.metadata.parentClass && (
															<span className="ml-2">in {codeResult.metadata.parentClass}</span>
														)}
													</div>

													{selectedResult === index && (
														<div className="mt-3 pt-3 border-t">
															<ScrollArea className="h-32">
																<pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
																	<code>{codeResult.content}</code>
																</pre>
															</ScrollArea>
														</div>
													)}
												</div>
											))}
										</div>
									</ScrollArea>
								</CollapsibleContent>
							</Collapsible>
						)}

						{/* Git Results */}
						{result.gitResults && result.gitResults.length > 0 && (
							<Collapsible 
								open={expandedSections.has("git")}
								onOpenChange={() => toggleSection("git")}>
								<CollapsibleTrigger asChild>
									<Button variant="ghost" className="w-full justify-between p-2 h-auto">
										<span className="font-medium">📚 Git History ({result.gitResults.length})</span>
										<span className="text-xs text-muted-foreground">
											{expandedSections.has("git") ? "Hide" : "Show"}
										</span>
									</Button>
								</CollapsibleTrigger>
								<CollapsibleContent className="px-2 pb-2">
									<ScrollArea className="h-48 rounded border">
										<div className="p-2 space-y-2">
											{result.gitResults.map((gitResult) => (
												<div key={gitResult.commitHash} className="border rounded-lg p-3">
													<div className="flex items-center justify-between mb-2">
														<Badge variant="outline" className="text-xs font-mono">
															{gitResult.commitHash.substring(0, 8)}
														</Badge>
														<span className="text-xs text-muted-foreground">
															{new Date(gitResult.date).toLocaleDateString()}
														</span>
													</div>
													
													<p className="text-sm font-medium mb-1">{gitResult.message}</p>
													<p className="text-xs text-muted-foreground mb-2">by {gitResult.author}</p>
													
													{gitResult.filesChanged.length > 0 && (
														<div className="flex flex-wrap gap-1">
															{gitResult.filesChanged.slice(0, 3).map(file => (
																<Badge key={file} variant="secondary" className="text-xs">
																	{file.split('/').pop()}
																</Badge>
															))}
															{gitResult.filesChanged.length > 3 && (
																<Badge variant="secondary" className="text-xs">
																	+{gitResult.filesChanged.length - 3} more
																</Badge>
															)}
														</div>
													)}
												</div>
											))}
										</div>
									</ScrollArea>
								</CollapsibleContent>
							</Collapsible>
						)}

						{/* Insights */}
						{result.insights && (
							<Collapsible 
								open={expandedSections.has("insights")}
								onOpenChange={() => toggleSection("insights")}>
								<CollapsibleTrigger asChild>
									<Button variant="ghost" className="w-full justify-between p-2 h-auto">
										<span className="font-medium">💡 Analysis Insights</span>
										<span className="text-xs text-muted-foreground">
											{expandedSections.has("insights") ? "Hide" : "Show"}
										</span>
									</Button>
								</CollapsibleTrigger>
								<CollapsibleContent className="px-2 pb-2">
									<div className="space-y-3">
										{result.insights.patterns.length > 0 && (
											<div>
												<p className="text-sm font-medium mb-2">🔍 Patterns Detected</p>
												<ul className="text-sm text-muted-foreground space-y-1">
													{result.insights.patterns.map((pattern, index) => (
														<li key={index} className="flex items-start gap-2">
															<span className="text-primary">•</span>
															<span>{pattern}</span>
														</li>
													))}
												</ul>
											</div>
										)}

										{result.insights.recommendations.length > 0 && (
											<div>
												<p className="text-sm font-medium mb-2">💭 Recommendations</p>
												<ul className="text-sm text-muted-foreground space-y-1">
													{result.insights.recommendations.map((rec, index) => (
														<li key={index} className="flex items-start gap-2">
															<span className="text-primary">•</span>
															<span>{rec}</span>
														</li>
													))}
												</ul>
											</div>
										)}

										{result.insights.relatedConcepts.length > 0 && (
											<div>
												<p className="text-sm font-medium mb-2">🔗 Related Concepts</p>
												<div className="flex flex-wrap gap-1">
													{result.insights.relatedConcepts.map(concept => (
														<Badge key={concept} variant="secondary" className="text-xs">
															{concept}
														</Badge>
													))}
												</div>
											</div>
										)}

										{result.insights.codeQuality && (
											<div>
												<p className="text-sm font-medium mb-2">📊 Code Quality</p>
												<div className="flex items-center gap-2 mb-2">
													<Progress value={result.insights.codeQuality.score} className="flex-1" />
													<span className="text-sm font-medium">
														{result.insights.codeQuality.score}/100
													</span>
												</div>
												
												{result.insights.codeQuality.suggestions.length > 0 && (
													<ul className="text-sm text-muted-foreground space-y-1">
														{result.insights.codeQuality.suggestions.map((suggestion, index) => (
															<li key={index} className="flex items-start gap-2">
																<span className="text-yellow-500">💡</span>
																<span>{suggestion}</span>
															</li>
														))}
													</ul>
												)}
											</div>
										)}
									</div>
								</CollapsibleContent>
							</Collapsible>
						)}
					</div>
				)}

				{/* Configuration Details */}
				<Collapsible 
					open={expandedSections.has("config")}
					onOpenChange={() => toggleSection("config")}>
					<CollapsibleTrigger asChild>
						<Button variant="ghost" className="w-full justify-between p-2 h-auto">
							<span className="font-medium">⚙️ Configuration</span>
							<span className="text-xs text-muted-foreground">
								{expandedSections.has("config") ? "Hide" : "Show"}
							</span>
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="px-2 pb-2">
						<div className="grid grid-cols-2 gap-2 text-xs">
							<div>
								<span className="font-medium">Max Results:</span>
								<span className="ml-2 text-muted-foreground">{maxResults || 10}</span>
							</div>
							<div>
								<span className="font-medium">Analysis Depth:</span>
								<span className="ml-2 text-muted-foreground">{analysisDepth || "deep"}</span>
							</div>
						</div>
					</CollapsibleContent>
				</Collapsible>
			</div>
		</ToolBlock>
	)
}
