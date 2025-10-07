import { SpawnAgentOptions } from '../agent/v1/tools/schema/agents/agent-spawner';
import { ToolStatus } from './messages/extension-message';

export type { ToolStatus };

/**
 * This is the input and output for execute_command tool
 */
export type ExecuteCommandTool = {
	tool: 'execute_command';
	/**
	 * the command to execute
	 */
	command: string;
	/**
	 * the output of the command
	 */
	output?: string;
	/**
	 * this is a long running command so ask user if they want to continue
	 */
	earlyExit?: 'pending' | 'approved' | 'rejected';

	commitHash?: string;
	branch?: string;
};

export type ListFilesTool = {
	tool: 'list_files';
	path: string;
	recursive?: 'true' | 'false';
	content?: string;
};

export type ExploreRepoFolderTool = {
	tool: 'explore_repo_folder';
	path: string;
	content?: string;
};

export type SearchFilesTool = {
	tool: 'search_files';
	path: string;
	regex: string;
	filePattern?: string;
	content?: string;
};

export type ReadFileTool = {
	tool: 'read_file';
	path: string;
	content: string;
	pageNumber?: number;
	readAllPages?: boolean;
};

export type WriteToFileTool = {
	tool: 'write_to_file';
	mode?: 'inline' | 'whole';
	path: string;
	content?: string;
	diff?: string;
	notAppliedCount?: number;
	branch?: string;
	commitHash?: string;
};

export type AskFollowupQuestionTool = {
	tool: 'ask_followup_question';
	question: string;
};

export type AttemptCompletionTool = {
	tool: 'attempt_completion';
	command?: string;
	commandResult?: string;
	result: string;
};

export interface WebSearchTool {
	tool: 'web_search';
	searchQuery: string;
	baseLink?: string;
	content?: string;
	browserModel?: 'smart' | 'fast';
	browserMode?: 'api_docs' | 'generic';
	streamType?: 'start' | 'explore' | 'summarize' | 'end';
}

export type ServerRunnerTool = {
	tool: 'server_runner';
	port?: number;
	serverName?: string;
	commandType?: 'start' | 'stop' | 'restart' | 'getLogs';
	output?: string;
	commandToRun?: string;
	lines?: string;
};

export type UrlScreenshotTool = {
	tool: 'url_screenshot';
	url: string;
	base64Image?: string;
};

export type UpsertMemoryTool = {
	tool: 'upsert_memory';
	milestoneName?: string;
	summary?: string;
	content?: string;
};

export type SearchSymbolsTool = {
	tool: 'search_symbol';
	symbolName: string;
	content?: string;
};

export type AddInterestedFileTool = {
	tool: 'add_interested_file';
	path: string;
	why: string;
};

export type FileChangePlanTool = {
	tool: 'file_changes_plan';
	path: string;
	what_to_accomplish: string;
	innerThoughts?: string;
	innerSelfCritique?: string;
	rejectedString?: string;
};

export type FileEditorTool = {
	tool: 'file_editor';
	path: string;
	mode: 'edit' | 'whole_write' | 'rollback' | 'list_versions';
	content?: string;
	diff?: string;
	list_versions?: boolean;
	rollback_version?: string;
	list_versions_output?: string;
	saved_version?: string;
	notAppliedCount?: number;
	commitHash?: string;
	branch?: string;
};

export type SpawnAgentTool = {
	tool: 'spawn_agent';
	agentName: SpawnAgentOptions;
	instructions: string;
	files?: string | string[];
};

export type ExitAgentTool = {
	tool: 'exit_agent';
	agentName: SpawnAgentOptions;
	result: string;
};

export type SubmitReviewTool = {
	tool: 'submit_review';
	review: string;
};

export type MoveTool = {
	tool: 'move';
	source_path: string;
	destination_path: string;
	type?: 'file' | 'directory' | 'auto';
	overwrite?: boolean;
	merge?: boolean;
};

export type RemoveTool = {
	tool: 'remove';
	path: string;
	type?: 'file' | 'directory' | 'auto' | 'force_recursive';
	recursive?: boolean;
	force?: boolean;
};

export type RenameTool = {
	tool: 'rename';
	path: string;
	new_name: string;
	type?: 'file' | 'directory' | 'auto';
	overwrite?: boolean;
};

export type GitBashTool = {
	tool: 'git_bash';
	command: string;
	timeout?: number;
	captureOutput?: boolean;
	output?: string;
};

export type KillBashTool = {
	tool: 'kill_bash';
	terminalId?: number;
	terminalName?: string;
	lastCommand?: string;
	isBusy?: boolean;
	force?: boolean;
	result?: string;
};

export type ReadProgressTool = {
	tool: 'read_progress';
	terminalId?: number;
	terminalName?: string;
	includeFullOutput?: boolean;
	result?: string;
};

export type TerminalTool = {
	tool: 'terminal';
	command: string;
	shell?:
		| 'bash'
		| 'powershell'
		| 'cmd'
		| 'git-bash'
		| 'zsh'
		| 'fish'
		| 'sh'
		| 'auto';
	cwd?: string;
	timeout?: number;
	env?: Record<string, string>;
	captureOutput?: boolean;
	interactive?: boolean;
	terminalName?: string;
	reuseTerminal?: boolean;
	output?: string;
	result?: string;
};

export type GetErrorsTool = {
	tool: 'get_errors';
	filePaths?: string[];
	ranges?: ([number, number, number, number] | undefined)[];
	content?: string;
};

export type ReplaceStringTool = {
	tool: 'replace_string_in_file';
	explanation: string;
	filePath: string;
	oldString: string;
	newString: string;
	occurrences?: number;
};

export type MultiReplaceStringReplacement = {
	filePath: string;
	oldString: string;
	newString: string;
};

export type MultiReplaceStringTool = {
	tool: 'multi_replace_string_in_file';
	explanation: string;
	replacements?: MultiReplaceStringReplacement[]; // Optional to handle XML parsing failures
	successes?: number;
	failures?: number;
	errors?: string[];
	summary?: string[]; // Array of formatted change descriptions from backend
};

export type InsertEditTool = {
	tool: 'insert_edit_into_file';
	explanation?: string; // Optional to handle validation errors
	filePath?: string; // Optional to handle validation errors
	startLine?: number; // Optional to handle validation errors
	endLine?: number;
	code?: string; // Optional to handle validation errors
	operationType?: 'insert' | 'replace';
	lineRange?: string;
};

export type FetchWebpageTool = {
	tool: 'fetch_webpage';
	urls?: string[]; // Array of URLs (new format)
	url?: string; // Single URL (backward compatibility)
	query?: string;
	content?: string;
	error?: string;
};

export type VscodeApiTool = {
	tool: 'get_vscode_api';
	query: string;
	results?: string;
	resultCount?: number;
	error?: string;
};

export type GrepSearchTool = {
	tool: 'grep_search';
	query: string;
	isRegexp?: boolean;
	includePattern?: string;
	maxResults?: number;
	totalMatches?: number;
	filesMatched?: number;
	matches?: Array<{
		file: string;
		ranges: Array<{
			line: number;
			column: number;
			preview: string;
		}>;
	}>;
	error?: string;
};

export type GetTerminalOutputTool = {
	tool: 'get_terminal_output';
	terminalId?: number;
	maxChars?: number;
	terminalName?: string;
	shellType?: string;
	outputLength?: number;
	output?: string;
	error?: string;
};

export type ThinkTool = {
	tool: 'think';
	thoughts: string;
	/**
	 * Indicates if this is complex/multi-step thinking (planning)
	 * This is automatically determined based on thought content
	 */
	isComplexThinking?: boolean;
	/**
	 * Indicates if the thought uses the What-How-Why-Where framework
	 * This is automatically determined based on framework markers
	 */
	usesFramework?: boolean;
	/**
	 * Framework completeness score (0-1)
	 * 1.0 means all four elements (What, How, Why, Where) are present
	 */
	frameworkCompleteness?: number;
};

export type TimerTool = {
	tool: 'timer';
	duration?: number;
	note?: string;
	startTime?: number;
	endTime?: number;
	/**
	 * Timer-specific status (independent of approvalState)
	 * - 'running': Timer is actively counting down
	 * - 'completed': Timer finished naturally
	 * - 'stopped': Timer was stopped by user
	 */
	timerStatus?: 'running' | 'completed' | 'stopped';
	/**
	 * If true, displays local time instead of countdown timer
	 */
	showLocalTime?: boolean;
};

export type LocalTimeTool = {
	tool: 'local_time';
	note?: string;
	localTime: number; // Timestamp of the local time to display
};


export type FastEditorTool = {
	tool: 'fast_editor';
	edits?: Array<{ // Optional to handle validation errors
		path: string;
		oldString: string;
		newString: string;
	}>;
	explanation?: string;
	results?: Array<{
		path: string;
		success: boolean;
		error?: string;
	}>;
	successCount?: number;
	failureCount?: number;
};

export type PatternSearchTool = {
	tool: 'pattern_search';
	searchPattern: string;
	files?: string[]; // Optional to handle validation errors
	caseSensitive?: boolean;
	contextLinesBefore?: number;
	contextLinesAfter?: number;
	results?: string;
	totalMatches?: number;
	filesSearched?: number;
	error?: string;
};

export type ChatTool = (
	| ExitAgentTool
	| SpawnAgentTool
	| ExecuteCommandTool
	| ListFilesTool
	| ExploreRepoFolderTool
	| SearchFilesTool
	| ReadFileTool
	| WriteToFileTool
	| AskFollowupQuestionTool
	| AttemptCompletionTool
	| WebSearchTool
	| UrlScreenshotTool
	| ServerRunnerTool
	| SearchSymbolsTool
	| FileEditorTool
	| AddInterestedFileTool
	| FileChangePlanTool
	| SubmitReviewTool
	| MoveTool
	| RemoveTool
	| RenameTool
	| GitBashTool
	| KillBashTool
	| ReadProgressTool
	| TerminalTool
	| GetErrorsTool
	| ReplaceStringTool
	| MultiReplaceStringTool
	| InsertEditTool
	| FetchWebpageTool
	| VscodeApiTool
	| GrepSearchTool
	| GetTerminalOutputTool
	| ThinkTool
	| FastEditorTool
	| TimerTool
	| LocalTimeTool
	| PatternSearchTool
) & {
	ts: number;
	approvalState?: ToolStatus;
	/**
	 * If this is a sub message, it will force it to stick to previous tool call in the ui (same message)
	 */
	isSubMsg?: boolean;
	error?: string;
	userFeedback?: string;
};
export const readOnlyTools: ChatTool['tool'][] = [
	'read_file',
	'list_files',
	'search_files',
	'explore_repo_folder',
	'search_symbol',
	'web_search',
	'url_screenshot',
	'add_interested_file',
	'timer',
	'read_progress',
	'get_errors',
	'fetch_webpage',
	'get_vscode_api',
	'grep_search',
	'get_terminal_output',
	'pattern_search',
] as const;

export const mustRequestApprovalTypes: (ChatTool['tool'] | string)[] = [
	'completion_result',
	'resume_completed_task',
	'resume_task',
	'request_limit_reached',
	'followup',
	'ask_followup_question',
] as const;

export const mustRequestApprovalTools: ChatTool['tool'][] = [
	'ask_followup_question',
	'attempt_completion',
] as const;
