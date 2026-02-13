/**
 * VS Code API Mock for Testing
 */

const mockExtensionContext = {
  subscriptions: [],
  globalState: {
    get: jest.fn().mockReturnValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    keys: jest.fn().mockReturnValue([]),
  },
  workspaceState: {
    get: jest.fn().mockReturnValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
  },
  globalStorageUri: { fsPath: '/tmp/vlinder-test' },
  extensionUri: { fsPath: '/tmp/extension' },
  extensionPath: '/tmp/extension',
  asAbsolutePath: jest.fn((path: string) => `/tmp/extension/${path}`),
};

const mockWindow = {
  createOutputChannel: jest.fn().mockReturnValue({
    appendLine: jest.fn(),
    append: jest.fn(),
    clear: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
  }),
  showInformationMessage: jest.fn().mockResolvedValue(undefined),
  showWarningMessage: jest.fn().mockResolvedValue(undefined),
  showErrorMessage: jest.fn().mockResolvedValue(undefined),
  showInputBox: jest.fn().mockResolvedValue(''),
  showQuickPick: jest.fn().mockResolvedValue(undefined),
  activeTextEditor: undefined,
  createTextEditorDecorationType: jest.fn().mockReturnValue({}),
  onDidChangeActiveTextEditor: jest.fn(() => ({ dispose: jest.fn() })),
};

const mockWorkspace = {
  workspaceFolders: undefined,
  getConfiguration: jest.fn().mockReturnValue({
    get: jest.fn().mockReturnValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
  }),
  onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
  onDidChangeTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
  onDidSaveTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
  fs: {
    readFile: jest.fn().mockResolvedValue(Buffer.from('')),
    writeFile: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ type: 1, size: 0, mtime: 0 }),
    createDirectory: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  },
};

const mockCommands = {
  registerCommand: jest.fn().mockReturnValue({ dispose: jest.fn() }),
  executeCommand: jest.fn().mockResolvedValue(undefined),
};

const mockUri = {
  parse: jest.fn((str: string) => ({ toString: () => str, fsPath: str })),
  file: jest.fn((path: string) => ({ fsPath: path, toString: () => path })),
  joinPath: jest.fn((...args: any[]) => ({ fsPath: args.join('/') })),
};

const mockRange = jest.fn().mockImplementation((startLine, startChar, endLine, endChar) => ({
  start: { line: startLine, character: startChar },
  end: { line: endLine, character: endChar },
}));

const mockPosition = jest.fn().mockImplementation((line, character) => ({
  line,
  character,
}));

const mockTextDocument = {
  uri: { fsPath: '/tmp/test.ts', toString: () => '/tmp/test.ts' },
  getText: jest.fn().mockReturnValue(''),
  lineAt: jest.fn().mockReturnValue({ text: '', lineNumber: 0 }),
  lineCount: 0,
  save: jest.fn().mockResolvedValue(true),
};

const mockTextEditor = {
  document: mockTextDocument,
  edit: jest.fn().mockResolvedValue(true),
  setDecorations: jest.fn(),
  revealRange: jest.fn(),
};

module.exports = {
  ExtensionContext: mockExtensionContext,
  window: mockWindow,
  workspace: mockWorkspace,
  commands: mockCommands,
  Uri: mockUri,
  Range: mockRange,
  Position: mockPosition,
  TextDocument: mockTextDocument,
  TextEditor: mockTextEditor,
  env: {
    sessionId: 'test-session-id',
    machineId: 'test-machine-id',
  },
  version: '1.96.0',
  extensions: {
    getExtension: jest.fn(),
  },
  languages: {
    createDiagnosticCollection: jest.fn().mockReturnValue({
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      dispose: jest.fn(),
    }),
  },
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3,
  },
};
