// Mock implementation of vscode module for testing
/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock function helper that creates Jest-compatible mock functions
const mockFn = (implementation?: (...args: any[]) => any) => {
	let impl = implementation || ((..._args: any[]) => undefined);
	const calls: any[] = [];
	const results: any[] = [];

	const fn: any = (...args: any[]) => {
		calls.push(args);
		try {
			const result = impl(...args);
			results.push({ type: 'return', value: result });
			return result;
		} catch (error) {
			results.push({ type: 'throw', value: error });
			throw error;
		}
	};

	fn.mockReturnValue = (value: any) => {
		impl = () => value;
		return fn;
	};
	fn.mockResolvedValue = (value: any) => {
		impl = () => Promise.resolve(value);
		return fn;
	};
	fn.mockRejectedValue = (value: any) => {
		impl = () => Promise.reject(value);
		return fn;
	};
	fn.mockImplementation = (newImpl: any) => {
		impl = newImpl;
		return fn;
	};
	fn.mockClear = () => {
		calls.length = 0;
		results.length = 0;
		return fn;
	};
	fn.mockReset = () => {
		calls.length = 0;
		results.length = 0;
		impl = implementation || ((..._args: any[]) => undefined);
		return fn;
	};

	// Jest-compatible mock properties
	Object.defineProperty(fn, 'mock', {
		get() {
			return {
				calls,
				results,
				instances: [],
				contexts: [],
				lastCall: calls[calls.length - 1],
			};
		},
	});

	// Make it work with Jest matchers
	fn._isMockFunction = true;
	fn.getMockName = () => 'mockFn';

	return fn;
};

export class Uri {
	public fsPath: string;
	public path: string;
	public scheme: string;

	constructor(fsPath: string, path: string, scheme: string = 'file') {
		this.fsPath = fsPath;
		this.path = path;
		this.scheme = scheme;
	}

	static file(path: string) {
		return new Uri(path, path, 'file');
	}

	static parse(value: string) {
		return new Uri(value, value, 'file');
	}

	with(change: { scheme?: string; path?: string; fsPath?: string }) {
		return new Uri(
			change.fsPath || this.fsPath,
			change.path || this.path,
			change.scheme || this.scheme
		);
	}

	toString() {
		return `${this.scheme}://${this.path}`;
	}
}

export class Range {
	constructor(
		public start: Position,
		public end: Position
	) {}

	contains(positionOrRange: Position | Range): boolean {
		if (positionOrRange instanceof Position) {
			return this.start.compareTo(positionOrRange) <= 0 && this.end.compareTo(positionOrRange) >= 0;
		}
		return this.contains(positionOrRange.start) && this.contains(positionOrRange.end);
	}

	isEqual(other: Range): boolean {
		return this.start.isEqual(other.start) && this.end.isEqual(other.end);
	}

	isEmpty(): boolean {
		return this.start.isEqual(this.end);
	}
}

export class Position {
	constructor(
		public line: number,
		public character: number
	) {}

	compareTo(other: Position): number {
		if (this.line !== other.line) {
			return this.line - other.line;
		}
		return this.character - other.character;
	}

	isEqual(other: Position): boolean {
		return this.line === other.line && this.character === other.character;
	}

	isBefore(other: Position): boolean {
		return this.compareTo(other) < 0;
	}

	isAfter(other: Position): boolean {
		return this.compareTo(other) > 0;
	}

	translate(lineDelta?: number, characterDelta?: number): Position {
		return new Position(
			this.line + (lineDelta || 0),
			this.character + (characterDelta || 0)
		);
	}

	with(line?: number, character?: number): Position {
		return new Position(
			line !== undefined ? line : this.line,
			character !== undefined ? character : this.character
		);
	}
}

export class Selection extends Range {
	constructor(
		public anchor: Position,
		public active: Position
	) {
		super(anchor, active);
	}

	isReversed(): boolean {
		return this.anchor === this.end;
	}
}

export class TextEdit {
	constructor(
		public range: Range,
		public newText: string
	) {}

	static replace(range: Range, newText: string) {
		return new TextEdit(range, newText);
	}

	static insert(position: Position, newText: string) {
		return new TextEdit(new Range(position, position), newText);
	}

	static delete(range: Range) {
		return new TextEdit(range, '');
	}
}

export class WorkspaceEdit {
	private edits = new Map();

	set(uri: any, edits: any[]) {
		this.edits.set(uri, edits);
	}

	get(uri: any) {
		return this.edits.get(uri);
	}

	has(uri: any) {
		return this.edits.has(uri);
	}

	delete(uri: any) {
		this.edits.delete(uri);
	}

	entries() {
		return this.edits.entries();
	}
}

export enum DiagnosticSeverity {
	Error = 0,
	Warning = 1,
	Information = 2,
	Hint = 3,
}

export enum TextDocumentSaveReason {
	Manual = 1,
	AfterDelay = 2,
	FocusOut = 3,
}

export enum ViewColumn {
	Active = -1,
	Beside = -2,
	One = 1,
	Two = 2,
	Three = 3,
}

export enum StatusBarAlignment {
	Left = 1,
	Right = 2,
}

export enum QuickPickItemKind {
	Separator = -1,
	Default = 0,
}

export class Diagnostic {
	constructor(
		public range: Range,
		public message: string,
		public severity: DiagnosticSeverity = DiagnosticSeverity.Error
	) {}
}

export class EventEmitter<T> {
	private listeners: Array<(e: T) => any> = [];

	event = (listener: (e: T) => any) => {
		this.listeners.push(listener);
		return {
			dispose: () => {
				const index = this.listeners.indexOf(listener);
				if (index > -1) {
					this.listeners.splice(index, 1);
				}
			},
		};
	};

	fire(data: T) {
		this.listeners.forEach((listener) => listener(data));
	}

	dispose() {
		this.listeners = [];
	}
}

export const workspace = {
	fs: {
		stat: mockFn(),
		readFile: mockFn(),
		writeFile: mockFn(),
		delete: mockFn(),
		createDirectory: mockFn(),
		readDirectory: mockFn(),
	},
	openTextDocument: mockFn(),
	applyEdit: mockFn(),
	findFiles: mockFn(),
	getConfiguration: mockFn(() => ({
		get: mockFn(),
		has: mockFn(),
		inspect: mockFn(),
		update: mockFn(),
	})),
	onDidChangeConfiguration: mockFn(),
	onDidChangeTextDocument: mockFn(),
	onDidSaveTextDocument: mockFn(),
	onDidOpenTextDocument: mockFn(),
	onDidCloseTextDocument: mockFn(),
	workspaceFolders: [
		{
			uri: {
				fsPath: '/test/workspace',
				path: '/test/workspace',
				scheme: 'file',
			},
			name: 'test-workspace',
			index: 0,
		},
	],
	getWorkspaceFolder: mockFn(),
	asRelativePath: mockFn((pathOrUri: any) => {
		const path = typeof pathOrUri === 'string' ? pathOrUri : pathOrUri.fsPath;
		return path.replace('/test/workspace/', '');
	}),
	createFileSystemWatcher: mockFn(() => ({
		onDidCreate: mockFn(),
		onDidChange: mockFn(),
		onDidDelete: mockFn(),
		dispose: mockFn(),
	})),
};

export const window = {
	activeTerminal: null,
	activeTextEditor: null,
	visibleTextEditors: [],
	createTerminal: mockFn(),
	onDidCloseTerminal: mockFn(),
	onDidChangeTerminalShellIntegration: mockFn(),
	showInformationMessage: mockFn(),
	showWarningMessage: mockFn(),
	showErrorMessage: mockFn(),
	showQuickPick: mockFn(),
	showInputBox: mockFn(),
	createOutputChannel: mockFn(() => ({
		append: mockFn(),
		appendLine: mockFn(),
		clear: mockFn(),
		show: mockFn(),
		hide: mockFn(),
		dispose: mockFn(),
	})),
	createStatusBarItem: mockFn(() => ({
		text: '',
		tooltip: '',
		show: mockFn(),
		hide: mockFn(),
		dispose: mockFn(),
	})),
	showTextDocument: mockFn(),
	createWebviewPanel: mockFn(),
	onDidChangeActiveTextEditor: mockFn(),
	onDidChangeVisibleTextEditors: mockFn(),
	onDidChangeTextEditorSelection: mockFn(),
	withProgress: mockFn((_options: any, task: any) => task({ report: mockFn() })),
};

export const commands = {
	registerCommand: mockFn(),
	executeCommand: mockFn(),
	getCommands: mockFn(() => Promise.resolve([])),
};

export const languages = {
	createDiagnosticCollection: mockFn(() => ({
		set: mockFn(),
		delete: mockFn(),
		clear: mockFn(),
		dispose: mockFn(),
	})),
	registerCodeActionsProvider: mockFn(),
	registerCompletionItemProvider: mockFn(),
	registerHoverProvider: mockFn(),
	registerDefinitionProvider: mockFn(),
};

export const env = {
	appName: 'Visual Studio Code',
	appRoot: '/test/vscode',
	language: 'en',
	clipboard: {
		readText: mockFn(),
		writeText: mockFn(),
	},
	openExternal: mockFn(),
	asExternalUri: mockFn((uri: Uri) => Promise.resolve(uri)),
};

export const extensions = {
	getExtension: mockFn(),
	all: [],
	onDidChange: mockFn(),
};

export const debug = {
	startDebugging: mockFn(),
	stopDebugging: mockFn(),
	onDidStartDebugSession: mockFn(),
	onDidTerminateDebugSession: mockFn(),
};

export const tasks = {
	executeTask: mockFn(),
	fetchTasks: mockFn(),
	onDidStartTask: mockFn(),
	onDidEndTask: mockFn(),
};

export const ProgressLocation = {
	SourceControl: 1,
	Window: 10,
	Notification: 15,
};

export const ConfigurationTarget = {
	Global: 1,
	Workspace: 2,
	WorkspaceFolder: 3,
};

export const FileType = {
	Unknown: 0,
	File: 1,
	Directory: 2,
	SymbolicLink: 64,
};

export const OverviewRulerLane = {
	Left: 1,
	Center: 2,
	Right: 4,
	Full: 7,
};

export const DecorationRangeBehavior = {
	OpenOpen: 0,
	ClosedClosed: 1,
	OpenClosed: 2,
	ClosedOpen: 3,
};
