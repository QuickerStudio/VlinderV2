/**
 * @fileoverview LSP Integration - Adapted from OpenCode
 * 
 * Language Server Protocol integration for code intelligence
 * 
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createMessageConnection, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';
import type { Diagnostic as VSCodeDiagnostic } from 'vscode-languageserver-types';
import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

/**
 * LSP Diagnostic
 */
export interface Diagnostic extends VSCodeDiagnostic {}

/**
 * LSP Range
 */
export const Range = z.object({
  start: z.object({
    line: z.number(),
    character: z.number(),
  }),
  end: z.object({
    line: z.number(),
    character: z.number(),
  }),
});
export type Range = z.infer<typeof Range>;

/**
 * LSP Symbol
 */
export const Symbol = z.object({
  name: z.string(),
  kind: z.number(),
  location: z.object({
    uri: z.string(),
    range: Range,
  }),
});
export type Symbol = z.infer<typeof Symbol>;

/**
 * LSP Document Symbol
 */
export const DocumentSymbol = z.object({
  name: z.string(),
  detail: z.string().optional(),
  kind: z.number(),
  range: Range,
  selectionRange: Range,
});
export type DocumentSymbol = z.infer<typeof DocumentSymbol>;

/**
 * LSP Status
 */
export const Status = z.object({
  id: z.string(),
  name: z.string(),
  root: z.string(),
  status: z.union([z.literal('connected'), z.literal('error')]),
});
export type Status = z.infer<typeof Status>;

// ============================================================================
// Language Extensions
// ============================================================================

export const LANGUAGE_EXTENSIONS: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescriptreact',
  '.js': 'javascript',
  '.jsx': 'javascriptreact',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.rb': 'ruby',
  '.php': 'php',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.swift': 'swift',
  '.scala': 'scala',
  '.lua': 'lua',
  '.r': 'r',
  '.sql': 'sql',
  '.sh': 'shellscript',
  '.bash': 'shellscript',
  '.zsh': 'shellscript',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.xml': 'xml',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.md': 'markdown',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.astro': 'astro',
  '.nix': 'nix',
  '.tf': 'terraform',
  '.dockerfile': 'dockerfile',
};

// ============================================================================
// LSP Server
// ============================================================================

/**
 * LSP Server Handle
 */
export interface LSPServerHandle {
  process: ChildProcessWithoutNullStreams;
  initialization?: Record<string, unknown>;
}

/**
 * LSP Server Info
 */
export interface LSPServerInfo {
  id: string;
  extensions: string[];
  spawn(root: string): Promise<LSPServerHandle | undefined>;
}

/**
 * TypeScript LSP Server
 */
export const TypeScriptServer: LSPServerInfo = {
  id: 'typescript',
  extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'],
  async spawn(root: string): Promise<LSPServerHandle | undefined> {
    try {
      const proc = spawn('typescript-language-server', ['--stdio'], {
        cwd: root,
        env: process.env,
      });
      return { process: proc };
    } catch (error) {
      console.error('Failed to spawn TypeScript LSP server:', error);
      return undefined;
    }
  },
};

/**
 * Python LSP Server (Pyright)
 */
export const PythonServer: LSPServerInfo = {
  id: 'python',
  extensions: ['.py', '.pyi', '.pyw'],
  async spawn(root: string): Promise<LSPServerHandle | undefined> {
    try {
      const proc = spawn('pyright-langserver', ['--stdio'], {
        cwd: root,
        env: process.env,
      });
      return { process: proc };
    } catch (error) {
      console.error('Failed to spawn Python LSP server:', error);
      return undefined;
    }
  },
};

/**
 * Go LSP Server (gopls)
 */
export const GoServer: LSPServerInfo = {
  id: 'go',
  extensions: ['.go'],
  async spawn(root: string): Promise<LSPServerHandle | undefined> {
    try {
      const proc = spawn('gopls', ['serve'], {
        cwd: root,
        env: process.env,
      });
      return { process: proc };
    } catch (error) {
      console.error('Failed to spawn Go LSP server:', error);
      return undefined;
    }
  },
};

/**
 * Rust LSP Server (rust-analyzer)
 */
export const RustServer: LSPServerInfo = {
  id: 'rust',
  extensions: ['.rs'],
  async spawn(root: string): Promise<LSPServerHandle | undefined> {
    try {
      const proc = spawn('rust-analyzer', [], {
        cwd: root,
        env: process.env,
      });
      return { process: proc };
    } catch (error) {
      console.error('Failed to spawn Rust LSP server:', error);
      return undefined;
    }
  },
};

// ============================================================================
// LSP Client
// ============================================================================

/**
 * LSP Client Info
 */
export interface LSPClientInfo {
  serverID: string;
  root: string;
  connection: ReturnType<typeof createMessageConnection>;
  diagnostics: Map<string, Diagnostic[]>;
  shutdown(): Promise<void>;
  notify: {
    open(params: { path: string }): Promise<void>;
    close(params: { path: string }): Promise<void>;
    change(params: { path: string; content: string }): Promise<void>;
  };
  waitForDiagnostics(params: { path: string }): Promise<Diagnostic[]>;
}

/**
 * Create LSP Client
 */
export async function createLSPClient(input: {
  serverID: string;
  server: LSPServerHandle;
  root: string;
}): Promise<LSPClientInfo> {
  const connection = createMessageConnection(
    new StreamMessageReader(input.server.process.stdout),
    new StreamMessageWriter(input.server.process.stdin)
  );

  const diagnostics = new Map<string, Diagnostic[]>();

  connection.onNotification('textDocument/publishDiagnostics', (params: any) => {
    const filePath = params.uri.replace('file://', '');
    diagnostics.set(filePath, params.diagnostics);
  });

  connection.onRequest('window/workDoneProgress/create', () => null);
  connection.onRequest('workspace/configuration', async () => [{}]);
  connection.onRequest('client/registerCapability', async () => {});
  connection.onRequest('workspace/workspaceFolders', async () => [
    { name: 'workspace', uri: `file://${input.root}` },
  ]);

  connection.listen();

  // Initialize
  await connection.sendRequest('initialize', {
    processId: process.pid,
    rootUri: `file://${input.root}`,
    capabilities: {
      textDocument: {
        hover: { contentFormat: ['markdown', 'plaintext'] },
        completion: { completionItem: { snippetSupport: true } },
        definition: { linkSupport: true },
        references: {},
        documentSymbol: {},
        workspaceSymbol: {},
      },
      workspace: {
        workspaceFolders: true,
      },
    },
    workspaceFolders: [{ name: 'workspace', uri: `file://${input.root}` }],
  });

  return {
    serverID: input.serverID,
    root: input.root,
    connection,
    diagnostics,
    async shutdown() {
      await connection.sendRequest('shutdown', {});
      connection.dispose();
      input.server.process.kill();
    },
    notify: {
      async open(params: { path: string }) {
        const content = await fs.readFile(params.path, 'utf-8');
        await connection.sendNotification('textDocument/didOpen', {
          textDocument: {
            uri: `file://${params.path}`,
            languageId: LANGUAGE_EXTENSIONS[path.extname(params.path)] || 'plaintext',
            version: 1,
            text: content,
          },
        });
      },
      async close(params: { path: string }) {
        await connection.sendNotification('textDocument/didClose', {
          textDocument: { uri: `file://${params.path}` },
        });
      },
      async change(params: { path: string; content: string }) {
        await connection.sendNotification('textDocument/didChange', {
          textDocument: {
            uri: `file://${params.path}`,
            version: Date.now(),
          },
          contentChanges: [{ text: params.content }],
        });
      },
    },
    async waitForDiagnostics(params: { path: string }) {
      return new Promise((resolve) => {
        const check = () => {
          const diags = diagnostics.get(params.path);
          if (diags) resolve(diags);
          else setTimeout(check, 100);
        };
        setTimeout(check, 100);
      });
    },
  };
}

// ============================================================================
// LSP Namespace
// ============================================================================

export namespace LSP {
  const servers: LSPServerInfo[] = [
    TypeScriptServer,
    PythonServer,
    GoServer,
    RustServer,
  ];

  const clients: Map<string, LSPClientInfo> = new Map();

  /**
   * Initialize LSP
   */
  export async function init(): Promise<void> {
    console.log('LSP initialized with servers:', servers.map(s => s.id));
  }

  /**
   * Get all available servers
   */
  export function getServers(): LSPServerInfo[] {
    return servers;
  }

  /**
   * Get client for a file
   */
  export async function getClient(filePath: string): Promise<LSPClientInfo | undefined> {
    const ext = path.extname(filePath);
    const server = servers.find(s => s.extensions.includes(ext));
    if (!server) return undefined;

    const root = path.dirname(filePath);
    const key = `${server.id}:${root}`;

    if (clients.has(key)) {
      return clients.get(key);
    }

    const handle = await server.spawn(root);
    if (!handle) return undefined;

    const client = await createLSPClient({
      serverID: server.id,
      server: handle,
      root,
    });

    clients.set(key, client);
    return client;
  }

  /**
   * Get diagnostics for a file
   */
  export async function getDiagnostics(filePath: string): Promise<Diagnostic[]> {
    const client = await getClient(filePath);
    if (!client) return [];

    await client.notify.open({ path: filePath });
    return client.diagnostics.get(filePath) || [];
  }

  /**
   * Get hover info
   */
  export async function hover(input: {
    file: string;
    line: number;
    character: number;
  }): Promise<unknown> {
    const client = await getClient(input.file);
    if (!client) return null;

    return client.connection.sendRequest('textDocument/hover', {
      textDocument: { uri: `file://${input.file}` },
      position: { line: input.line, character: input.character },
    }).catch(() => null);
  }

  /**
   * Get definition
   */
  export async function definition(input: {
    file: string;
    line: number;
    character: number;
  }): Promise<unknown> {
    const client = await getClient(input.file);
    if (!client) return null;

    return client.connection.sendRequest('textDocument/definition', {
      textDocument: { uri: `file://${input.file}` },
      position: { line: input.line, character: input.character },
    }).catch(() => null);
  }

  /**
   * Get references
   */
  export async function references(input: {
    file: string;
    line: number;
    character: number;
  }): Promise<unknown> {
    const client = await getClient(input.file);
    if (!client) return null;

    return client.connection.sendRequest('textDocument/references', {
      textDocument: { uri: `file://${input.file}` },
      position: { line: input.line, character: input.character },
      context: { includeDeclaration: true },
    }).catch(() => null);
  }

  /**
   * Get document symbols
   */
  export async function documentSymbols(filePath: string): Promise<DocumentSymbol[]> {
    const client = await getClient(filePath);
    if (!client) return [];

    return client.connection.sendRequest('textDocument/documentSymbol', {
      textDocument: { uri: `file://${filePath}` },
    }).catch(() => []) as Promise<DocumentSymbol[]>;
  }

  /**
   * Get workspace symbols
   */
  export async function workspaceSymbols(query: string): Promise<Symbol[]> {
    const results: Symbol[] = [];
    for (const client of clients.values()) {
      const symbols = await client.connection.sendRequest('workspace/symbol', { query })
        .catch(() => []) as Symbol[];
      results.push(...symbols);
    }
    return results;
  }

  /**
   * Shutdown all clients
   */
  export async function shutdown(): Promise<void> {
    for (const client of clients.values()) {
      await client.shutdown();
    }
    clients.clear();
  }

  /**
   * Pretty print diagnostic
   */
  export namespace Diagnostic {
    export function pretty(diagnostic: Diagnostic): string {
      const severityMap: Record<number, string> = {
        1: 'ERROR',
        2: 'WARN',
        3: 'INFO',
        4: 'HINT',
      };
      const severity = severityMap[diagnostic.severity || 1];
      const line = diagnostic.range.start.line + 1;
      const col = diagnostic.range.start.character + 1;
      return `${severity} [${line}:${col}] ${diagnostic.message}`;
    }
  }
}

export default LSP;
