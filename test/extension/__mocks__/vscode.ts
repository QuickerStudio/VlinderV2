// Mock implementation of vscode module for testing

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
}

export class Range {
	constructor(
		public start: Position,
		public end: Position
	) {}
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
}

export class TextEdit {
	static replace(range: Range, newText: string) {
		return { range, newText };
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
}

export const workspace = {
	fs: {
		stat: jest.fn(),
	},
	openTextDocument: jest.fn(),
	applyEdit: jest.fn(),
	findFiles: jest.fn(),
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
};

export const window = {
	activeTerminal: null,
	createTerminal: jest.fn(),
	onDidCloseTerminal: jest.fn(),
	onDidChangeTerminalShellIntegration: jest.fn(),
};
