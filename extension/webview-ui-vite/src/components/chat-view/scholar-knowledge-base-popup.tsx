import React, { useState, useEffect } from "react"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import { Trash2, FileText, BookOpen, X, RefreshCw } from "lucide-react"
import { rpcClient } from "@/lib/rpc-client"
import { vscode } from "@/utils/vscode"

interface ScholarFile {
	name: string
	path: string
	size: number
	lastModified: string
	type: 'knowledge' | 'pattern' | 'summary'
}

interface ScholarKnowledgeBasePopupProps {
	isOpen: boolean
	onClose: () => void
	position: { x: number; y: number }
}

export const ScholarKnowledgeBasePopup: React.FC<ScholarKnowledgeBasePopupProps> = ({
	isOpen,
	onClose,
	position
}) => {
	const [files, setFiles] = useState<ScholarFile[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [scholarStatus, setScholarStatus] = useState<string>("Ready")

	// RPC mutations
	const getScholarFilesMutation = rpcClient.getScholarFiles.useMutation()
	const openScholarFileMutation = rpcClient.openScholarFile.useMutation()
	const deleteScholarFileMutation = rpcClient.deleteScholarFile.useMutation()

	// Load Scholar files
	const loadScholarFiles = async () => {
		setIsLoading(true)
		try {
			const result = await getScholarFilesMutation.mutateAsync({})
			if (result.success) {
				// Type cast the files to match our interface
				const typedFiles: ScholarFile[] = result.files.map(file => ({
					...file,
					type: (file.type as ScholarFile['type']) || 'knowledge'
				}))
				setFiles(typedFiles)
				setScholarStatus(`${result.files.length} knowledge files available`)
			} else {
				setFiles([])
				setScholarStatus(result.error || "Error loading files")
			}
		} catch (error) {
			console.error("Failed to load Scholar files:", error)
			setFiles([])
			setScholarStatus("Error loading files")
		} finally {
			setIsLoading(false)
		}
	}

	// Open file in VS Code
	const openFile = async (file: ScholarFile) => {
		try {
			const result = await openScholarFileMutation.mutateAsync({ path: file.path })
			if (result.success) {
				setScholarStatus(`Opened ${file.name}`)
			} else {
				setScholarStatus(`Failed to open ${file.name}: ${result.error}`)
			}
		} catch (error) {
			console.error("Failed to open file:", error)
			setScholarStatus(`Error opening ${file.name}`)
		}
	}

	// Delete file
	const deleteFile = async (file: ScholarFile) => {
		try {
			const result = await deleteScholarFileMutation.mutateAsync({ path: file.path })
			if (result.success) {
				setFiles(prev => prev.filter(f => f.path !== file.path))
				setScholarStatus(`Deleted ${file.name}`)
			} else {
				setScholarStatus(`Failed to delete ${file.name}: ${result.error}`)
			}
		} catch (error) {
			console.error("Failed to delete file:", error)
			setScholarStatus(`Error deleting ${file.name}`)
		}
	}

	// Format file size
	const formatFileSize = (bytes: number): string => {
		if (bytes < 1024) return `${bytes} B`
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
	}

	// Format date
	const formatDate = (dateString: string): string => {
		const date = new Date(dateString)
		return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
	}

	// Get file type icon
	const getFileTypeIcon = (type: ScholarFile['type']) => {
		switch (type) {
			case 'knowledge': return <FileText className="w-4 h-4 text-blue-500" />
			case 'pattern': return <BookOpen className="w-4 h-4 text-green-500" />
			case 'summary': return <FileText className="w-4 h-4 text-purple-500" />
			default: return <FileText className="w-4 h-4 text-gray-500" />
		}
	}

	useEffect(() => {
		if (isOpen) {
			loadScholarFiles()
		}
	}, [isOpen])

	if (!isOpen) return null

	return (
		<div
			className="fixed bg-card border border-border rounded-lg shadow-lg w-96 max-h-96 z-50"
			style={{
				left: Math.min(position.x, window.innerWidth - 400),
				bottom: `${position.y}px`, // Use bottom positioning like Lightning dialog
			}}
			onClick={(e) => e.stopPropagation()}
			data-scholar-popup
		>
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-border">
					<div className="flex items-center gap-2">
						<BookOpen className="w-5 h-5 text-primary" />
						<h3 className="font-semibold text-sm">Scholar Knowledge Base</h3>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={loadScholarFiles}
							disabled={isLoading}
						>
							<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={onClose}
						>
							<X className="w-4 h-4" />
						</Button>
					</div>
				</div>

				{/* File List */}
				<ScrollArea className="h-64">
					<div className="p-2">
						{isLoading ? (
							<div className="flex items-center justify-center py-8">
								<RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
								<span className="ml-2 text-sm text-muted-foreground">Loading files...</span>
							</div>
						) : files.length === 0 ? (
							<div className="flex items-center justify-center py-8">
								<div className="text-center">
									<BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
									<p className="text-sm text-muted-foreground">No knowledge files found</p>
									<p className="text-xs text-muted-foreground mt-1">Scholar will create files as it learns</p>
								</div>
							</div>
						) : (
							<div className="space-y-1">
								{files.map((file, index) => (
									<div
										key={index}
										className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 group"
									>
										<div className="flex-shrink-0">
											<Button
												variant="ghost"
												size="sm"
												className="w-7 h-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-destructive/10"
												onClick={(e) => {
													e.stopPropagation()
													deleteFile(file)
												}}
											>
												<Trash2 className="w-3.5 h-3.5 text-destructive" />
											</Button>
										</div>
										{getFileTypeIcon(file.type)}
										<div
											className="flex-1 min-w-0 cursor-pointer"
											onClick={() => openFile(file)}
										>
											<div className="text-sm font-medium truncate">{file.name}</div>
											<div className="text-xs text-muted-foreground">
												{formatFileSize(file.size)} • {formatDate(file.lastModified)}
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</ScrollArea>

				{/* Status Bar */}
				<div className="p-3 border-t border-border bg-muted/30">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
							<span className="text-xs text-muted-foreground">{scholarStatus}</span>
						</div>
						<Button
							variant="outline"
							size="sm"
							className="text-xs"
							onClick={() => {
								vscode.postMessage({ type: "openKnowledgeBase" })
								setScholarStatus("Opening Scholar directory...")
							}}
						>
							Open Directory
						</Button>
					</div>
				</div>
			</div>
	)
}
