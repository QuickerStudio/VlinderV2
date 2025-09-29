import React, { useState, useCallback, useEffect, useRef } from "react"
import { vscode } from "@/utils/vscode"
import { Button } from "@/components/ui/button"
import { Save, Copy, RefreshCw, FolderOpen, X, Fullscreen, FileEdit } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PromptActions } from "./prompt-actions"
import { useEvent } from "react-use"
import * as monaco from "monaco-editor"
import { ScrollArea, ScrollBar } from "../ui/scroll-area"
import { cn } from "@/lib/utils"
import { useAtom } from "jotai"
import { currentPromptContentAtom, isCurrentPreviewAtom } from "../settings-view/tools-tab"
import { editorVariable, TEMPLATE_PLACEHOLDERS, TemplateInfo } from "extension/shared/agent/prompt"

// 1) REGISTER YOUR CUSTOM LANGUAGE (without defining a theme).
//    This still enables syntax highlighting for your placeholders.
monaco.languages.register({ id: "promptTemplate" })

monaco.languages.setMonarchTokensProvider("promptTemplate", {
	tokenizer: {
		root: [
			[
				/{{([^}]+)}}/,
				{
					cases: {
						"^#vision\\}}": "vision.start",
						"^/vision\\}}": "vision.end",
						[editorVariable]: "variable",
						"@default": "invalid",
					},
				},
			],
		],
	},
})
interface PromptEditorProps {}

const promptActions = PromptActions.getInstance()

function useVSCodeTheme() {
	const [theme, setTheme] = useState({
		kind: document.body.getAttribute("data-vscode-theme-kind"),
		name: document.body.getAttribute("data-vscode-theme-name"),
	})

	useEffect(() => {
		// Create observer for theme changes
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.type === "attributes") {
					setTheme({
						kind: document.body.getAttribute("data-vscode-theme-kind"),
						name: document.body.getAttribute("data-vscode-theme-name"),
					})
				}
			})
		})

		// Start observing the body element
		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ["data-vscode-theme-kind", "data-vscode-theme-name"],
		})

		// You can also access CSS variables directly:
		const style = getComputedStyle(document.documentElement)
		const foreground = style.getPropertyValue("--vscode-editor-foreground")
		const background = style.getPropertyValue("--vscode-editor-background")

		return () => observer.disconnect()
	}, [])

	// Optional: listen for CSS variable changes
	useEffect(() => {
		const styleObserver = new MutationObserver(() => {
			// Handle CSS variable changes
			const style = getComputedStyle(document.documentElement)
			// Access updated CSS variables...
		})

		styleObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["style"],
		})

		return () => styleObserver.disconnect()
	}, [])

	return theme
}
export const PromptEditor: React.FC<PromptEditorProps> = () => {
	const [value, setValue] = useAtom(currentPromptContentAtom)
	const [previewValue, setPreviewValue] = useState<string>("")
	const [showCopiedAlert, setShowCopiedAlert] = useState<boolean>(false)
	const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false)
	const [showLoadDialog, setShowLoadDialog] = useState<boolean>(false)
	const [templateName, setTemplateName] = useState<string>("")
	const [templates, setTemplates] = useState<TemplateInfo[]>([])
	const [activeTemplate, setActiveTemplate] = useState<string | null>(null)
	const [loadedTemplateName, setLoadedTemplateName] = useState<string | null>(null)
	const monacoContainerRef = useRef<HTMLDivElement | null>(null)
	const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
	const [originalTemplateName, setOriginalTemplateName] = useState<string | null>(null)
	const [originalTemplateContent, setOriginalTemplateContent] = useState<string>("")
	const [preview, setPreview] = useAtom(isCurrentPreviewAtom)

	const theme = useVSCodeTheme()

	useEffect(() => {
		if (!editorRef.current) return
		// editorRef.current.updateOptions({ theme: theme.name?.includes("light") ? "vs" : "vs-dark" })
		editorRef.current.updateOptions({
			theme: theme.kind?.includes("light") ? "vs" : "vs-dark",
		})
	}, [theme])

	// 4) Initialize Monaco Editor once.
	useEffect(() => {
		if (!monacoContainerRef.current) return

		editorRef.current = monaco.editor.create(monacoContainerRef.current, {
			value,
			language: "promptTemplate",
			// Rely on VS Code’s default theme or manually set it if needed
			theme: theme.kind?.includes("light") ? "vs" : "vs-dark",
			placeholder: "Enter your prompt template here... or {{ to see placeholders }}",
			automaticLayout: true,
			minimap: { enabled: false },
			fontSize: 13,
			lineNumbers: "off",
		})

		const model = editorRef.current.getModel()
		const onChangeSubscription = model?.onDidChangeContent(() => {
			const newValue = model?.getValue() || ""
			setValue(newValue)
		})

		// 5) Only register once. We'll check if the text ends with "{{".
		const completionProvider = monaco.languages.registerCompletionItemProvider("promptTemplate", {
			triggerCharacters: ["{"],
			provideCompletionItems: (model, position) => {
				const textUntilPosition = model.getValueInRange({
					startLineNumber: position.lineNumber,
					startColumn: 1,
					endLineNumber: position.lineNumber,
					endColumn: position.column,
				})

				// We only trigger if the user typed exactly '{{'
				if (!textUntilPosition.endsWith("{{")) {
					return { suggestions: [] }
				}

				// Build suggestions from placeholders
				const suggestions: monaco.languages.CompletionItem[] = Object.keys(TEMPLATE_PLACEHOLDERS).map((key) => {
					let insertText = `{${key}}}`
					let label = `{{${key}}}`

					// If it's 'vision', insert a snippet block
					if (key === "vision") {
						insertText = `{#vision}}\nYour vision analysis here...\n{{/vision}}`
						label = "{{#vision}} ... {{/vision}}"
					}

					// Provide better documentation as markdown
					return {
						label,
						kind: monaco.languages.CompletionItemKind.Snippet,
						insertText,
						insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
						detail: key,
						documentation: {
							value: `**${key}**\n\n${
								TEMPLATE_PLACEHOLDERS[key as keyof typeof TEMPLATE_PLACEHOLDERS].description
							}`,
							isTrusted: true,
						},
						range: new monaco.Range(
							position.lineNumber,
							position.column - 1,
							position.lineNumber,
							position.column
						),
					}
				})

				return { suggestions }
			},
		})

		return () => {
			onChangeSubscription?.dispose()
			completionProvider.dispose()
			editorRef.current?.dispose()
		}
	}, [])

	// 6) Prompt actions messaging
	const handleMessage = useCallback((event: MessageEvent) => {
		promptActions.handleMessage(event.data, {
			onTemplateLoaded: (content, name) => {
				setValue(content)
				editorRef.current?.setValue(content)
				setLoadedTemplateName(name)
				// record the original state so we can detect unsaved changes
				setOriginalTemplateName(name)
				setOriginalTemplateContent(content)
			},
			onTemplateSaved: (savedName) => {
				// Once saved, reflect that in local state as well
				setLoadedTemplateName(savedName)
				// Because we just successfully saved, treat the
				// current content as the "original" now
				setOriginalTemplateName(savedName)
				setOriginalTemplateContent(value)
			},
			onPromptPreviewed: (content, visible) => {
				setPreview(visible)
				setPreviewValue(content)
			},
			onTemplatesList: (templatesList, activeName) => {
				setTemplates(
					templatesList.map((name) => ({
						name,
						isActive: name === activeName,
					}))
				)
				setActiveTemplate(activeName)
			},
			onActiveTemplateUpdated: (templateName) => {
				setActiveTemplate(templateName)
				setTemplates((prev) => prev.map((t) => ({ ...t, isActive: t.name === templateName })))
			},
		})
	}, [])

	useEvent("message", handleMessage)

	useEffect(() => {
		if (showLoadDialog) {
			promptActions.listTemplates()
		}
	}, [showLoadDialog])

	useEffect(() => {
		// Load the template list on mount
		promptActions.listTemplates()
	}, [])

	useEffect(() => {
		vscode.postMessage({ type: "promptEditorLoaded" })
	}, [])

	// 7) Save / Load
	const handleSave = useCallback(() => {
		if (templateName.trim()) {
			promptActions.saveTemplate(templateName.trim(), value)
			setShowSaveDialog(false)
			setTemplateName("")
		}
	}, [templateName, value])

	const handleLoad = useCallback((template: string) => {
		promptActions.loadTemplate(template)
		setShowLoadDialog(false)
	}, [])

	const handleSetActive = useCallback((templateName: string | null) => {
		promptActions.setActiveTemplate(templateName)
	}, [])

	// 8) Misc. Editor actions
	const clearEditor = () => {
		setValue("")
		setPreviewValue("")
		editorRef.current?.setValue("")
	}

	const handleCopy = useCallback(() => {
		navigator.clipboard.writeText(value).then(() => {
			setShowCopiedAlert(true)
			setTimeout(() => setShowCopiedAlert(false), 2000)
		})
	}, [value])

	/**
	 * Decide what to show as "Viewing:":
	 * 1) If no loaded template => "None"
	 * 2) If loadedTemplateName is not in templates => "Unsaved template"
	 * 3) If the content changed => "Unsaved changes"
	 * 4) Else => show the loadedTemplateName
	 */
	const getViewingLabel = (): string => {
		if (!loadedTemplateName) {
			return "None"
		}
		const exists = templates.some((t) => t.name === loadedTemplateName)
		if (!exists) {
			return "Unsaved template"
		}
		// check for changes in name or content
		const nameChanged = loadedTemplateName !== originalTemplateName
		const contentChanged = value !== originalTemplateContent
		if (nameChanged || contentChanged) {
			return "Unsaved changes"
		}
		return loadedTemplateName
	}

	return (
		<>
			<TooltipProvider>
				<div className="w-full h-full flex flex-col bg-[var(--vscode-editor-background)]">
					{/* Toolbar in rounded border container */}
					<div className="border border-[var(--vscode-widget-border)] rounded-lg p-3 mb-4 bg-[var(--vscode-editor-background)]">
						{/* Responsive layout: single row on wide screens, multi-row on narrow screens */}
						<div className="flex flex-col gap-3">
							{/* First layer: Title */}
							<div className="flex items-center">
								<Tooltip>
									<TooltipTrigger asChild>
										<span className="text-[var(--vscode-editor-foreground)] font-medium cursor-help">
											Prompt Template Editor
										</span>
									</TooltipTrigger>
									<TooltipContent side="bottom" className="max-w-sm">
										<div className="text-sm">
											<div className="font-medium mb-2">Advanced Prompt Template Management System</div>
											<div className="space-y-1 text-xs">
												<div>1. Create and edit custom prompt templates with dynamic variables</div>
												<div>2. Preview templates with real-time syntax highlighting and validation</div>
												<div>3. Save templates for reuse across different AI tasks and workflows</div>
												<div>4. Load existing templates and modify them to suit specific needs</div>
												<div>5. Copy generated prompts to clipboard for use in external applications</div>
												<div>6. Switch between edit and preview modes for optimal workflow</div>
												<div>7. Manage multiple template versions with active/viewing status tracking</div>
											</div>
										</div>
									</TooltipContent>
								</Tooltip>
							</div>

							{/* Wide screen layout */}
							<div className="hidden lg:flex items-center justify-between w-full">
								<div className="flex items-center gap-2">
									{activeTemplate && (
										<span className="text-xs bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] px-2 py-1 rounded">
											Active: {activeTemplate}
										</span>
									)}
									<span className="text-xs text-[var(--vscode-descriptionForeground)] bg-[var(--vscode-badge-background)] px-2 py-1 rounded">
										Viewing: {getViewingLabel()}
									</span>
								</div>
								<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										promptActions.previewPrompt(value, !preview)
									}}
									className="flex items-center gap-2 h-7 px-3 text-xs border-[var(--vscode-widget-border)] text-[var(--vscode-editor-foreground)] hover:bg-[var(--vscode-toolbar-hoverBackground)]">
									{preview ? <FileEdit className="w-3 h-3" /> : <Fullscreen className="w-3 h-3" />}
									{preview ? "Show Editor" : "Show Preview"}
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setShowLoadDialog(true)}
									className="flex items-center gap-2 h-7 px-3 text-xs border-[var(--vscode-widget-border)] text-[var(--vscode-editor-foreground)] hover:bg-[var(--vscode-toolbar-hoverBackground)]">
									<FolderOpen className="w-3 h-3" />
									Load
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={handleCopy}
									className="flex items-center gap-2 h-7 px-3 text-xs border-[var(--vscode-widget-border)] text-[var(--vscode-editor-foreground)] hover:bg-[var(--vscode-toolbar-hoverBackground)]">
									<Copy className="w-3 h-3" />
									Copy
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={clearEditor}
									className="flex items-center gap-2 h-7 px-3 text-xs border-[var(--vscode-widget-border)] text-[var(--vscode-editor-foreground)] hover:bg-[var(--vscode-toolbar-hoverBackground)]">
									<RefreshCw className="w-3 h-3" />
									Clear
								</Button>
								<Button
									size="sm"
									onClick={() => setShowSaveDialog(true)}
									className="flex items-center gap-2 h-7 px-3 text-xs bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)]">
									<Save className="w-3 h-3" />
									Save
								</Button>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => promptActions.closeEditor()}
											className="flex items-center gap-2 h-7 px-2 text-[var(--vscode-editor-foreground)] hover:bg-[var(--vscode-toolbar-hoverBackground)]">
											<X className="w-4 h-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent side="bottom">
										<div className="text-xs">Close Prompt Template Editor</div>
									</TooltipContent>
								</Tooltip>
							</div>
						</div>

						{/* Narrow screen layout - multi-row */}
						<div className="lg:hidden space-y-2">
							{/* Second layer: Status badges + Show Preview */}
							<div className="flex items-center gap-2 flex-wrap">
								{activeTemplate && (
									<span className="text-xs bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] px-2 py-1 rounded">
										Active: {activeTemplate}
									</span>
								)}
								<span className="text-xs text-[var(--vscode-descriptionForeground)] bg-[var(--vscode-badge-background)] px-2 py-1 rounded">
									Viewing: {getViewingLabel()}
								</span>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										promptActions.previewPrompt(value, !preview)
									}}
									className="flex items-center gap-2 h-7 px-3 text-xs border-[var(--vscode-widget-border)] text-[var(--vscode-editor-foreground)] hover:bg-[var(--vscode-toolbar-hoverBackground)]">
									{preview ? <FileEdit className="w-3 h-3" /> : <Fullscreen className="w-3 h-3" />}
									{preview ? "Show Editor" : "Show Preview"}
								</Button>
							</div>

							{/* Third layer: Load, Copy, Clear */}
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setShowLoadDialog(true)}
									className="flex items-center gap-2 h-7 px-3 text-xs border-[var(--vscode-widget-border)] text-[var(--vscode-editor-foreground)] hover:bg-[var(--vscode-toolbar-hoverBackground)]">
									<FolderOpen className="w-3 h-3" />
									Load
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={handleCopy}
									className="flex items-center gap-2 h-7 px-3 text-xs border-[var(--vscode-widget-border)] text-[var(--vscode-editor-foreground)] hover:bg-[var(--vscode-toolbar-hoverBackground)]">
									<Copy className="w-3 h-3" />
									Copy
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={clearEditor}
									className="flex items-center gap-2 h-7 px-3 text-xs border-[var(--vscode-widget-border)] text-[var(--vscode-editor-foreground)] hover:bg-[var(--vscode-toolbar-hoverBackground)]">
									<RefreshCw className="w-3 h-3" />
									Clear
								</Button>
							</div>

							{/* Fourth layer: Save, X */}
							<div className="flex items-center gap-2">
								<Button
									size="sm"
									onClick={() => setShowSaveDialog(true)}
									className="flex items-center gap-2 h-7 px-3 text-xs bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)]">
									<Save className="w-3 h-3" />
									Save
								</Button>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => promptActions.closeEditor()}
											className="flex items-center gap-2 h-7 px-2 text-[var(--vscode-editor-foreground)] hover:bg-[var(--vscode-toolbar-hoverBackground)]">
											<X className="w-4 h-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent side="bottom">
										<div className="text-xs">Close Prompt Template Editor</div>
									</TooltipContent>
								</Tooltip>
							</div>
						</div>
					</div>
				</div>

				{/* Editor container - flat design, no border */}
				<div className="flex-1 relative">
					{preview && (
						<ScrollArea
							viewProps={{
								className: "h-full px-4 pt-0 bg-[var(--vscode-editor-background)]",
							}}>
							<div className="whitespace-pre-wrap text-[var(--vscode-editor-foreground)] font-mono text-sm leading-relaxed">
								{previewValue}
							</div>
							<ScrollBar forceMount />
						</ScrollArea>
					)}
					<div
						ref={monacoContainerRef}
						className={cn("w-full h-full", preview && "hidden")}
						style={{
							backgroundColor: 'var(--vscode-editor-background)',
							color: 'var(--vscode-editor-foreground)'
						}}
					/>
				</div>

				{/* Bottom padding with alignment */}
				<div className="h-5 flex-shrink-0" />
			</div>

			{/* SAVE DIALOG */}
			<Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Save Template</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="template-name">Template Name</Label>
							<Input
								id="template-name"
								value={templateName}
								onChange={(e) => setTemplateName(e.target.value)}
								placeholder="Enter template name..."
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowSaveDialog(false)}>
							Cancel
						</Button>
						<Button onClick={handleSave} disabled={!templateName.trim()}>
							Save Template
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* LOAD DIALOG */}
			<Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Load Template</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							{templates.length === 0 ? (
								<div className="text-center text-muted-foreground">No templates found</div>
							) : (
								<div className="space-y-2">
									{templates.map((template) => (
										<div key={template.name} className="flex items-center gap-2">
											<Button
												variant={template.isActive ? "default" : "outline"}
												className="w-full justify-start"
												onClick={() => handleLoad(template.name)}>
												{template.name}
												{template.isActive && (
													<span className="ml-2 text-xs bg-primary/20 px-2 py-1 rounded">
														Active
													</span>
												)}
											</Button>
											<div className="flex gap-2">
												<Button
													variant="ghost"
													size="sm"
													onClick={() =>
														handleSetActive(template.isActive ? null : template.name)
													}>
													{template.isActive ? "Deactivate" : "Set Active"}
												</Button>
												{template.name !== "default" && (
													<Button
														variant="ghost"
														size="sm"
														onClick={() => {
															promptActions.deleteTemplate(template.name)
														}}>
														Delete
													</Button>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowLoadDialog(false)}>
							Cancel
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

				{showCopiedAlert && (
					<Alert variant="info" className="fixed bottom-4 right-4 w-auto">
						<AlertDescription>Template copied to clipboard!</AlertDescription>
					</Alert>
				)}
			</TooltipProvider>
		</>
	)
}

export default PromptEditor
