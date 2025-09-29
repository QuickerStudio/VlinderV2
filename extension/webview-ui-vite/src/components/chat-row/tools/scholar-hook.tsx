import React, { useState, useEffect } from "react"
import { BookOpen, ChevronsUpDown, Brain, Search, FileText, Lightbulb } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface ApiMetrics {
	cost: number
	inputTokens: number
	outputTokens: number
	inputCacheRead: number
	inputCacheWrite: number
}

interface ScholarBadgeProps {
	state?: "extracting" | "searching" | "summarizing" | "complete"
	output?: string
	apiMetrics?: ApiMetrics
	modelId?: string
	mode?: "extract" | "search" | "summarize"
	input?: string
}

const LoadingDots = () => {
	const [dots, setDots] = useState("")
	useEffect(() => {
		const interval = setInterval(() => {
			setDots((prev) => (prev.length >= 3 ? "" : prev + "."))
		}, 500)
		return () => clearInterval(interval)
	}, [])
	return <span className="w-6 inline-block">{dots}</span>
}

const getModeIcon = (mode?: string) => {
	switch (mode) {
		case "extract":
			return Brain
		case "search":
			return Search
		case "summarize":
			return FileText
		default:
			return BookOpen
	}
}

const getModeLabel = (mode?: string, state?: string) => {
	const baseLabels = {
		extract: "Knowledge Extraction",
		search: "Knowledge Search",
		summarize: "Knowledge Summary",
	}
	
	if (state === "complete") {
		return baseLabels[mode as keyof typeof baseLabels] || "Scholar Analysis Complete"
	}
	
	const activeLabels = {
		extract: "Extracting Knowledge",
		search: "Searching Knowledge",
		summarize: "Summarizing Knowledge",
	}
	
	return activeLabels[mode as keyof typeof activeLabels] || "Scholar Working"
}

const getModeColor = (mode?: string) => {
	switch (mode) {
		case "extract":
			return "text-blue-500"
		case "search":
			return "text-green-500"
		case "summarize":
			return "text-purple-500"
		default:
			return "text-primary"
	}
}

export const ScholarBadge: React.FC<ScholarBadgeProps> = ({
	state = "extracting",
	output = "Scholar has identified valuable development patterns and extracted key insights for future reference.",
	apiMetrics,
	modelId,
	mode = "extract",
	input,
}) => {
	const [isHovered, setIsHovered] = useState(false)
	const Icon = getModeIcon(mode)
	const modeLabel = getModeLabel(mode, state)
	const modeColor = getModeColor(mode)

	return (
		<div
			className="relative inline-block"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}>
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50 border border-secondary cursor-pointer">
				<Icon className={`w-3.5 h-3.5 ${modeColor}`} />
				<AnimatePresence mode="wait">
					<motion.span
						key={state}
						initial={{ opacity: 0, x: -5 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: 5 }}
						className="text-xs font-mono text-secondary-foreground">
						{state !== "complete" ? (
							<span className="flex items-center">
								{modeLabel}
								<LoadingDots />
							</span>
						) : (
							modeLabel
						)}
					</motion.span>
				</AnimatePresence>
				<ChevronsUpDown className="w-3 h-3 text-muted-foreground" />
			</motion.div>

			<AnimatePresence>
				{isHovered && (
					<motion.div
						initial={{ opacity: 0, y: 5 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 5 }}
						className="absolute top-full mt-2 left-0 w-96 p-3 rounded-md z-10 border border-border shadow-lg bg-card">
						<div className="space-y-3 text-xs">
							<div className="space-y-1.5">
								<span className="text-muted-foreground font-mono">Model:</span>
								<p className="text-primary-foreground font-mono">{modelId}</p>
							</div>

							<div className="space-y-1.5">
								<span className="text-muted-foreground font-mono">Mode:</span>
								<div className="flex items-center gap-2">
									<Icon className={`w-4 h-4 ${modeColor}`} />
									<p className="text-primary-foreground font-mono capitalize">{mode}</p>
								</div>
							</div>

							{input && (
								<div className="space-y-1.5 border-t border-border pt-2">
									<span className="text-muted-foreground font-mono">Input Context:</span>
									<p className="text-primary-foreground text-xs bg-muted/50 p-2 rounded max-h-20 overflow-y-auto">
										{input.length > 200 ? `${input.substring(0, 200)}...` : input}
									</p>
								</div>
							)}

							{apiMetrics && (
								<div className="space-y-2 border-t border-border pt-2">
									<div className="grid grid-cols-2 gap-2">
										<div>
											<span className="text-muted-foreground font-mono">Cost:</span>
											<p className="text-primary-foreground font-mono">
												${apiMetrics.cost?.toFixed(4)}
											</p>
										</div>
										<div>
											<span className="text-muted-foreground font-mono">Tokens:</span>
											<p className="text-primary-foreground font-mono">
												{apiMetrics.inputTokens} → {apiMetrics.outputTokens}
											</p>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-2">
										<div>
											<span className="text-muted-foreground font-mono">Cache Read:</span>
											<p className="text-primary-foreground font-mono">
												{apiMetrics.inputCacheRead}
											</p>
										</div>
										<div>
											<span className="text-muted-foreground font-mono">Cache Write:</span>
											<p className="text-primary-foreground font-mono">
												{apiMetrics.inputCacheWrite}
											</p>
										</div>
									</div>
								</div>
							)}

							<div className="border-t border-border pt-2">
								<div className="flex items-center gap-2 mb-1">
									<Lightbulb className="w-3 h-3 text-yellow-500" />
									<span className="text-muted-foreground font-mono">Scholar Output:</span>
								</div>
								<p className="mt-1 text-primary-foreground text-xs bg-muted/50 p-2 rounded max-h-32 overflow-y-auto">
									{output}
								</p>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}
