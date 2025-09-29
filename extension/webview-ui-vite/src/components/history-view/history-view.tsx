import { useState, useEffect, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useExtensionState } from "@/context/extension-state-context"
import { vscode } from "@/utils/vscode"
import { Virtuoso } from "react-virtuoso"
import Fuse, { FuseResult } from "fuse.js"
import HistoryItem from "./history-item"
import { type HistoryItem as HistoryItemT } from "extension/shared/history-item"
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTrigger,
} from "../ui/dialog"
import { ArchiveRestore } from "lucide-react"
import { rpcClient } from "@/lib/rpc-client"

type HistoryViewProps = {
	onDone: () => void
}

const highlight = (fuseSearchResult: FuseResult<HistoryItemT>[]) => {
	const set = (obj: Record<string, any>, path: string, value: any) => {
		const pathValue = path.split(".")
		let i: number

		for (i = 0; i < pathValue.length - 1; i++) {
			obj = obj[pathValue[i]] as Record<string, any>
		}

		obj[pathValue[i]] = value
	}

	const generateHighlightedText = (inputText: string, regions: [number, number][] = []) => {
		let content = ""
		let nextUnhighlightedRegionStartingIndex = 0

		regions.forEach((region) => {
			const lastRegionNextIndex = region[1] + 1

			content += [
				inputText.substring(nextUnhighlightedRegionStartingIndex, region[0]),
				`<span class="text-primary">`,
				inputText.substring(region[0], lastRegionNextIndex),
				"</span>",
			].join("")

			nextUnhighlightedRegionStartingIndex = lastRegionNextIndex
		})

		content += inputText.substring(nextUnhighlightedRegionStartingIndex)

		return content
	}

	return fuseSearchResult
		.filter(({ matches }) => matches && matches.length)
		.map(({ item, matches }) => {
			const highlightedItem = { ...item }

			matches?.forEach((match) => {
				if (match.key && typeof match.value === "string") {
					set(highlightedItem, match.key, generateHighlightedText(match.value, [...match.indices]))
				}
			})

			return highlightedItem
		})
}

const HistoryView = ({ onDone }: HistoryViewProps) => {
	// Create a typed client *only using the type* AppRouter
	const { taskHistory } = useExtensionState()
	const [searchQuery, setSearchQuery] = useState("")
	const [debouncedQuery, setDebouncedQuery] = useState("")

	// Debounce search input
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedQuery(searchQuery)
		}, 100) // 100ms debounce

		return () => clearTimeout(timer)
	}, [searchQuery])
	const { mutate: restoreTaskFromDisk } = rpcClient.restoreTaskFromDisk.useMutation({})

	const presentableTasks = useMemo(() => {
		return taskHistory.filter((item) => item.ts && item.task)
	}, [taskHistory])

	const fuse = useMemo(() => {
		// Pre-process tasks to create searchable text
		const processedTasks = presentableTasks.map((task) => ({
			...task,
			searchText: `${task.task} ${task.name || ""}`.toLowerCase(),
		}))

		return new Fuse(processedTasks, {
			keys: ["searchText"],
			threshold: 0.3,
			shouldSort: false,
			isCaseSensitive: false,
			ignoreLocation: true,
			includeMatches: true,
			minMatchCharLength: 2,
			distance: 20, // Reduced distance for better performance
		})
	}, [presentableTasks])

	const taskHistorySearchResults = useMemo(() => {
		const trimmedQuery = debouncedQuery.trim().toLowerCase()
		let results: HistoryItemT[] = []

		if (trimmedQuery) {
			// Quick exact match check first
			const exactMatches = presentableTasks.filter(
				(task) =>
					task.task.toLowerCase().includes(trimmedQuery) ||
					(task.name && task.name.toLowerCase().includes(trimmedQuery))
			)

			if (exactMatches.length > 0) {
				results = exactMatches
			} else {
				// Fall back to fuzzy search with limit
				const searchResults = fuse.search(trimmedQuery).slice(0, 50) // Limit results after search
				results = highlight(searchResults)
			}
		} else {
			results = [...presentableTasks]
		}

		// Sort by newest first (default behavior)
		results.sort((a, b) => b.ts - a.ts)

		return results
	}, [presentableTasks, debouncedQuery, fuse])

	return (
		<div className="fixed inset-0 flex flex-col overflow-hidden">
			<div className="flex justify-between items-center p-4 pb-0">
				<h3 className="text-lg font-semibold">History</h3>
				<div className="flex flex-wrap gap-2">
					<Button
						onClick={() => {
							restoreTaskFromDisk({})
						}}
						size="sm"
						variant="ghost">
						<ArchiveRestore className="w-4 h-4" />
					</Button>
					<Dialog>
						<DialogTrigger asChild>
							<Button size="sm" variant="destructive">
								Clear History
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader className="pt-2">Are you sure you want to clear your history?</DialogHeader>
							<DialogDescription>
								This action cannot be undone. All history will be permanently deleted
							</DialogDescription>
							<DialogFooter className="gap-2">
								<DialogClose asChild>
									<Button variant="outline">Cancel</Button>
								</DialogClose>
								<DialogClose asChild>
									<Button
										variant="destructive"
										onClick={() => vscode.postMessage({ type: "clearHistory" })}>
										Delete All
									</Button>
								</DialogClose>
							</DialogFooter>
						</DialogContent>
					</Dialog>
					<Button size="sm" onClick={onDone}>
						Done
					</Button>
				</div>
			</div>
			<div className="p-4">
				<div className="flex flex-col gap-4">
					<Input
						className="w-full"
						placeholder="Name or task content"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>

				</div>
			</div>
			<div className="flex-grow overflow-y-auto">
				<Virtuoso
					className="h-full"
					data={taskHistorySearchResults}
					itemContent={(_index, item) => (
						<HistoryItem
							key={item.id}
							item={item}
							onSelect={() => vscode.postMessage({ type: "showTaskWithId", text: item.id })}
							onDelete={() => vscode.postMessage({ type: "deleteTaskWithId", text: item.id })}
							onExport={() => vscode.postMessage({ type: "exportTaskWithId", text: item.id })}
						/>
					)}
				/>
			</div>
		</div>
	)
}

export default HistoryView
