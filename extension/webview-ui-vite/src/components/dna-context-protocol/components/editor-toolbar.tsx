import { TemplateDropdown } from './template-dropdown'
import { SaveFilesDropdown } from './save-files-dropdown'
import { SnippetsDropdown } from './snippets-dropdown'
import { EditHistoryDropdown } from './edit-history-dropdown'
import type { HistoryRecord, ExportFormat, EditHistoryRecord } from '../types'
import type { MermaidTemplate } from '../hooks/mermaid-templates'

interface EditorToolbarProps {
	isEditorCollapsed: boolean
	setIsEditorCollapsed: (collapsed: boolean) => void
	mermaidCode: string
	saveToHistory: () => void

	// Template related
	showTemplateDropdown: boolean
	setShowTemplateDropdown: (show: boolean) => void
	selectedCategory: string
	setSelectedCategory: (category: string) => void
	filteredTemplates: MermaidTemplate[]
	applyTemplate: (template: MermaidTemplate) => void

	// Save files related
	showSaveFilesDropdown: boolean
	setShowSaveFilesDropdown: (show: boolean) => void
	historyRecords: HistoryRecord[]
	loadFromHistory: (record: HistoryRecord) => void
	deleteHistoryRecord: (id: string) => void
	exportHistoryRecord: (record: HistoryRecord, format: ExportFormat) => void

	// Auto-save related
	autoSaveEnabled: boolean
	setAutoSaveEnabled: (enabled: boolean) => void
	customSaveName: string
	setCustomSaveName: (name: string) => void
	customInterval: number
	setCustomInterval: (interval: number) => void
	intervalUnit: 'seconds' | 'minutes' | 'hours'
	setIntervalUnit: (unit: 'seconds' | 'minutes' | 'hours') => void

	// Snippets related
	showSnippetsDropdown: boolean
	setShowSnippetsDropdown: (show: boolean) => void
	onInsertSnippet: (code: string) => void

	// Edit history related
	showEditHistoryDropdown: boolean
	setShowEditHistoryDropdown: (show: boolean) => void
	editHistory: EditHistoryRecord[]
	currentEditIndex: number
	canUndo: boolean
	canRedo: boolean
	onUndo: () => void
	onRedo: () => void
	onJumpToEditHistory: (recordId: string) => void
	onClearEditHistory: () => void
	onSetAsInitialPoint: (recordId: string) => void
	onDeleteEditRecord: (recordId: string) => void
	onPinEditRecord: (recordId: string) => void

	// Editor actions
	onClearEditor: () => void
	onUndoClearEditor: () => void
	canUndoClear: boolean
	onFormatDocument: () => void
}

export function EditorToolbar({
	isEditorCollapsed,
	setIsEditorCollapsed,
	mermaidCode,
	saveToHistory,
	showTemplateDropdown,
	setShowTemplateDropdown,
	selectedCategory,
	setSelectedCategory,
	filteredTemplates,
	applyTemplate,
	showSaveFilesDropdown,
	setShowSaveFilesDropdown,
	historyRecords,
	loadFromHistory,
	deleteHistoryRecord,
	exportHistoryRecord,
	autoSaveEnabled,
	setAutoSaveEnabled,
	customSaveName,
	setCustomSaveName,
	customInterval,
	setCustomInterval,
	intervalUnit,
	setIntervalUnit,
	showSnippetsDropdown,
	setShowSnippetsDropdown,
	onInsertSnippet,
	showEditHistoryDropdown,
	setShowEditHistoryDropdown,
	editHistory,
	currentEditIndex,
	canUndo,
	canRedo,
	onUndo,
	onRedo,
	onJumpToEditHistory,
	onClearEditHistory,
	onSetAsInitialPoint,
	onDeleteEditRecord,
	onPinEditRecord,
	onClearEditor,
	onUndoClearEditor,
	canUndoClear,
	onFormatDocument
}: EditorToolbarProps) {
	return (
		<div className="flex items-center justify-between p-2 border-b bg-muted/50">
			{!isEditorCollapsed && <span className="text-sm font-medium hidden lg:block">Code Editor</span>}
			<div className="flex items-center gap-1 lg:gap-2 flex-wrap">
				{!isEditorCollapsed && (
					<>
						{/* Undo/Redo buttons */}
						<div className="flex items-center gap-1">
							<button
								onClick={onUndo}
								className="p-1 hover:bg-accent rounded"
								title="撤销 (Ctrl+Z)"
								disabled={!canUndo}
							>
								<span className="codicon codicon-discard"></span>
							</button>
							<button
								onClick={onRedo}
								className="p-1 hover:bg-accent rounded"
								title="重做 (Ctrl+Y)"
								disabled={!canRedo}
							>
								<span className="codicon codicon-redo"></span>
							</button>
						</div>

						{/* Format button */}
						<button
							onClick={onFormatDocument}
							className="p-1 hover:bg-accent rounded"
							title="格式化代码"
							disabled={!mermaidCode.trim()}
						>
							<span className="codicon codicon-symbol-namespace"></span>
						</button>

						{/* Separator */}
						<div className="w-px h-4 bg-border"></div>

						{/* Edit History dropdown menu */}
						<EditHistoryDropdown
							showEditHistoryDropdown={showEditHistoryDropdown}
							setShowEditHistoryDropdown={setShowEditHistoryDropdown}
							editHistory={editHistory}
							currentIndex={currentEditIndex}
							onJumpToHistory={onJumpToEditHistory}
							onClearHistory={onClearEditHistory}
							onSetAsInitialPoint={onSetAsInitialPoint}
							onDeleteRecord={onDeleteEditRecord}
							onPinRecord={onPinEditRecord}
						/>

						{/* Separator */}
						<div className="w-px h-4 bg-border"></div>

						{/* Template dropdown menu */}
						<TemplateDropdown
							showTemplateDropdown={showTemplateDropdown}
							setShowTemplateDropdown={setShowTemplateDropdown}
							selectedCategory={selectedCategory}
							setSelectedCategory={setSelectedCategory}
							filteredTemplates={filteredTemplates}
							applyTemplate={applyTemplate}
						/>

						{/* Snippets dropdown menu */}
						<SnippetsDropdown
							showSnippetsDropdown={showSnippetsDropdown}
							setShowSnippetsDropdown={setShowSnippetsDropdown}
							onInsertSnippet={onInsertSnippet}
						/>

						{/* Save files dropdown menu */}
						<SaveFilesDropdown
							showSaveFilesDropdown={showSaveFilesDropdown}
							setShowSaveFilesDropdown={setShowSaveFilesDropdown}
							historyRecords={historyRecords}
							loadFromHistory={loadFromHistory}
							deleteHistoryRecord={deleteHistoryRecord}
							exportHistoryRecord={exportHistoryRecord}
							autoSaveEnabled={autoSaveEnabled}
							setAutoSaveEnabled={setAutoSaveEnabled}
							customSaveName={customSaveName}
							setCustomSaveName={setCustomSaveName}
							customInterval={customInterval}
							setCustomInterval={setCustomInterval}
							intervalUnit={intervalUnit}
							setIntervalUnit={setIntervalUnit}
						/>

						{/* Save button */}
						<button
							onClick={saveToHistory}
							className="p-1 hover:bg-accent rounded"
							title="Save"
							disabled={!mermaidCode.trim()}
						>
							<span className="codicon codicon-save"></span>
						</button>

						{/* Clear editor button */}
						<button
							onClick={onClearEditor}
							onContextMenu={(e) => {
								e.preventDefault()
								if (canUndoClear) {
									onUndoClearEditor()
								}
							}}
							className={`
								p-1 rounded transition-colors
								${canUndoClear
									? 'bg-orange-100 hover:bg-orange-200 text-orange-700 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:text-orange-300'
									: 'hover:bg-accent'
								}
							`}
							title={canUndoClear ? "左键清空编辑器 | 右键撤销上次清空" : "清空编辑器"}
							disabled={!mermaidCode.trim() && !canUndoClear}
						>
							<span className="codicon codicon-clear-all"></span>
						</button>
					</>
				)}
				<button
					onClick={() => setIsEditorCollapsed(!isEditorCollapsed)}
					className="p-1 hover:bg-accent rounded"
					title={isEditorCollapsed ? 'Expand code editor' : 'Collapse code editor'}
				>
					<span className={`codicon ${isEditorCollapsed ? 'codicon-chevron-left' : 'codicon-chevron-right'}`}></span>
				</button>
			</div>
		</div>
	)
}
