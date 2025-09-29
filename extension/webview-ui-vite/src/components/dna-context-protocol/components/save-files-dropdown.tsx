import type { HistoryRecord, ExportFormat } from '../types'

interface SaveFilesDropdownProps {
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
}

export function SaveFilesDropdown({
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
	setIntervalUnit
}: SaveFilesDropdownProps) {
	return (
		<div className="relative save-files-dropdown-container">
			<button
				onClick={() => setShowSaveFilesDropdown(!showSaveFilesDropdown)}
				className="p-1 hover:bg-accent rounded flex items-center gap-1"
				title="Files"
			>
				<span className="codicon codicon-folder"></span>
				<span className="text-xs hidden lg:inline">Files</span>
				<span className={`codicon codicon-chevron-${showSaveFilesDropdown ? 'up' : 'down'} hidden lg:inline`}></span>
			</button>

			{/* Save files dropdown menu content */}
			{showSaveFilesDropdown && (
				<div className="absolute top-full right-0 mt-1 w-96 bg-background border rounded-md shadow-lg z-50 max-h-96 overflow-hidden">
					<div className="p-3 border-b bg-muted/30 space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">保存文档</span>
						</div>

						{/* Auto-save controls */}
						<div className="flex items-center gap-2 flex-wrap">
							<label className="flex items-center gap-2 text-xs">
								<input
									type="checkbox"
									checked={autoSaveEnabled}
									onChange={(e) => setAutoSaveEnabled(e.target.checked)}
									className="w-3 h-3"
								/>
								<span>自动保存</span>
							</label>

							<input
								type="text"
								value={customSaveName}
								onChange={(e) => setCustomSaveName(e.target.value)}
								placeholder="自定义保存名称"
								className="flex-1 min-w-[120px] px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
							/>

							<div className="flex items-center gap-1">
								<input
									type="number"
									value={customInterval}
									onChange={(e) => setCustomInterval(Math.max(1, parseInt(e.target.value) || 1))}
									min="1"
									className="w-12 px-1 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary text-center"
								/>
								<select
									value={intervalUnit}
									onChange={(e) => setIntervalUnit(e.target.value as 'seconds' | 'minutes' | 'hours')}
									className="px-1 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
								>
									<option value="seconds">秒</option>
									<option value="minutes">分钟</option>
									<option value="hours">小时</option>
								</select>
							</div>
						</div>
					</div>

					<div className="max-h-80 overflow-y-auto">
						{historyRecords.length === 0 ? (
							<div className="p-4 text-center text-muted-foreground text-sm">
								No saved files
							</div>
						) : (
							historyRecords.map(record => (
								<div key={record.id} className="p-3 border-b last:border-b-0 hover:bg-muted/30">
									<div className="flex items-center justify-between gap-2">
										<button
											onClick={() => loadFromHistory(record)}
											className="flex-1 text-left min-w-0"
											title={`Load: ${record.name}`}
										>
											<div className="font-medium text-sm truncate">{record.name}</div>
											<div className="text-xs text-muted-foreground">
												{record.createdAt.toLocaleString()}
											</div>
										</button>
										
										<div className="flex items-center gap-1 flex-shrink-0">
											{/* Export button group */}
											<button
												onClick={(e) => {
													e.stopPropagation()
													exportHistoryRecord(record, 'json')
												}}
												className="px-2 py-1 hover:bg-accent rounded text-xs"
												title="Export as JSON"
											>
												JSON
											</button>
											<button
												onClick={(e) => {
													e.stopPropagation()
													exportHistoryRecord(record, 'md')
												}}
												className="px-2 py-1 hover:bg-accent rounded text-xs"
												title="Export as Markdown"
											>
												MD
											</button>
											<button
												onClick={(e) => {
													e.stopPropagation()
													exportHistoryRecord(record, 'svg')
												}}
												className="px-2 py-1 hover:bg-accent rounded text-xs"
												title="Export as SVG"
												disabled={!record.svg}
											>
												SVG
											</button>

											{/* Delete button */}
											<button
												onClick={(e) => {
													e.stopPropagation()
													deleteHistoryRecord(record.id)
												}}
												className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-xs"
												title="Delete"
											>
												<span className="codicon codicon-trash"></span>
											</button>
										</div>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			)}
		</div>
	)
}
