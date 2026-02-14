# SandBox Module

A comprehensive execution environment isolation system for the Vlinder VSCode extension, inspired by OpenAI Codex CLI's sandbox implementation.

## Overview

This module provides secure execution environments for AI-assisted coding operations, with multiple layers of isolation:

- **Filesystem Isolation**: Read-only defaults with explicit writable roots
- **Network Isolation**: Configurable access levels from full access to complete isolation
- **Process Isolation**: Hardening measures including ptrace disabling and dangerous env var removal
- **Resource Limits**: CPU, memory, file descriptors, and execution timeouts

## Architecture

```
SandBox/
├── index.ts                 # Main entry point with convenience exports
├── types.ts                 # TypeScript type definitions
├── sandbox-policy.ts        # Predefined sandbox policies
├── process-isolation.ts     # Process hardening and management
├── filesystem-isolation.ts  # Filesystem access control
├── network-isolation.ts     # Network access control
├── command-executor.ts      # Main sandbox implementation
└── README.md               # This documentation
```

## Quick Start

### Basic Usage

```typescript
import { createSandbox, SandboxPolicy } from './integrations/SandBox';

// Create a sandbox with read-only filesystem access
const config = SandboxPolicy.createReadOnlyPolicy('/path/to/workspace');

const sandbox = await createSandbox({
  context: extensionContext,
  config,
  verbose: true,
});

// Execute a command
const result = await sandbox.execute({
  command: 'npm',
  args: ['test'],
});

console.log(`Exit code: ${result.exitCode}`);
console.log(`Output: ${result.stdout}`);

// Cleanup
await sandbox.destroy();
```

### Using Predefined Policies

```typescript
import { SandboxPolicy } from './integrations/SandBox';

// Read-only - Safe for code analysis
const readOnlyConfig = SandboxPolicy.createReadOnlyPolicy(workspacePath);

// Workspace write - Normal development tasks
const workspaceConfig = SandboxPolicy.createWorkspaceWritePolicy(workspacePath);

// Build - For compilation and build tasks
const buildConfig = SandboxPolicy.createBuildPolicy(workspacePath);

// Test - For running tests
const testConfig = SandboxPolicy.createTestPolicy(workspacePath);

// Agent - For AI agent operations
const agentConfig = SandboxPolicy.createAgentPolicy(workspacePath);

// Full access - NO RESTRICTIONS (use with caution!)
const fullAccessConfig = SandboxPolicy.DangerFullAccess;
```

### Convenience Methods

```typescript
import { SandBox } from './integrations/SandBox';

// Quick read-only execution
const result = await SandBox.executeReadOnly(
  'git',
  ['status'],
  workspacePath,
  context
);

// Quick workspace execution
const result = await SandBox.executeWorkspace(
  'npm',
  ['install'],
  workspacePath,
  context
);
```

## Sandbox Policies

### ReadOnly Policy
- **Filesystem**: Read-only access to entire filesystem
- **Network**: No network access
- **Use Case**: Safe code analysis, file inspection

### WorkspaceWrite Policy
- **Filesystem**: Read-only base, writable workspace
- **Network**: Isolated (localhost only)
- **Use Case**: Normal development tasks, file editing

### Build Policy
- **Filesystem**: Read-only base, writable workspace with symlinks allowed
- **Network**: Full access (for package downloads)
- **Use Case**: Compilation, building, installing dependencies

### Test Policy
- **Filesystem**: Read-only base, writable workspace
- **Network**: Isolated
- **Use Case**: Running automated tests

### Agent Policy
- **Filesystem**: Read-only base, writable workspace with protected paths
- **Network**: Proxy-only (allowed hosts)
- **Use Case**: AI agent operations

### DangerFullAccess Policy
- **Filesystem**: Full read/write access
- **Network**: Full access
- **Use Case**: Trusted operations only!

## Custom Policies

```typescript
import { SandboxPolicy, FilesystemAccessLevel, NetworkAccessLevel } from './integrations/SandBox';

const customConfig = SandboxPolicy.mergePolicy(
  SandboxPolicy.createWorkspaceWritePolicy(workspacePath),
  {
    network: {
      accessLevel: NetworkAccessLevel.ProxyOnly,
      allowedHosts: ['api.openai.com', 'github.com'],
    },
    limits: {
      maxCpuTimeSeconds: 120,
      maxMemoryMB: 2048,
      timeoutMs: 60000,
    },
  }
);
```

## Filesystem Isolation

### Writable Roots with Protected Subpaths

```typescript
const config: SandboxConfig = {
  // ...
  filesystem: {
    accessLevel: FilesystemAccessLevel.ReadOnly,
    writableRoots: [
      {
        root: '/path/to/workspace',
        protectedSubpaths: ['.git', '.env', 'secrets'],
        allowSymlinks: false,
      },
    ],
  },
};
```

### Permission Checks

```typescript
import { FilesystemIsolation } from './integrations/SandBox';

const fsIsolation = new FilesystemIsolation({
  workingDirectory: workspacePath,
  accessLevel: FilesystemAccessLevel.ReadOnly,
  writableRoots: [...],
});

// Check read permission
const readCheck = fsIsolation.checkReadPermission('/some/path');

// Check write permission
const writeCheck = fsIsolation.checkWritePermission('/some/path');

// Check execute permission
const execCheck = fsIsolation.checkExecutePermission('/some/executable');
```

## Network Isolation

### Access Levels

- `FullAccess`: No network restrictions
- `Isolated`: Only localhost connections allowed
- `None`: No network access at all
- `ProxyOnly`: Only specific hosts allowed

### Host Whitelisting

```typescript
const config: SandboxConfig = {
  // ...
  network: {
    accessLevel: NetworkAccessLevel.ProxyOnly,
    allowedHosts: [
      'api.openai.com',
      '*.github.com',  // Wildcard support
    ],
  },
};
```

## Process Isolation

### Security Hardening

The sandbox automatically applies:

1. **Core dump disabling**: Prevents memory dumps
2. **Ptrace disabling**: Prevents debugger attachment
3. **Dangerous env var removal**: Removes LD_PRELOAD, DYLD_*, etc.

### Process Management

```typescript
import { ProcessManager, globalProcessManager } from './integrations/SandBox';

// Kill all tracked processes on cleanup
globalProcessManager.killAll('SIGTERM');

// Check if process is running
const running = globalProcessManager.isRunning('process-id');
```

## Event Handling

```typescript
const sandbox = await createSandbox({ context, config });

// Subscribe to events
sandbox.on('onExecutionStart', (command) => {
  console.log(`Starting: ${command.command}`);
});

sandbox.on('onStdout', (data) => {
  console.log(`stdout: ${data}`);
});

sandbox.on('onStderrr', (data) => {
  console.error(`stderr: ${data}`);
});

sandbox.on('onExecutionComplete', (result) => {
  console.log(`Completed with exit code: ${result.exitCode}`);
});

sandbox.on('onStatusChange', (status) => {
  console.log(`Status changed to: ${status}`);
});
```

## Platform Support

| Platform | Filesystem | Network | Process | Seccomp |
|----------|------------|---------|---------|---------|
| Linux    | ✓ (bubblewrap/chroot) | ✓ (namespaces) | ✓ (namespaces) | ✓ |
| macOS    | ✓ (Seatbelt) | ✓ (Seatbelt) | Limited | ✗ |
| Windows  | Limited | Limited | Limited | ✗ |

### Detection

```typescript
import { detectSandboxCapabilities } from './integrations/SandBox';

const support = detectSandboxCapabilities();

console.log(`Platform: ${support.platform}`);
console.log(`Supported: ${support.supported}`);
console.log(`Warnings: ${support.warnings}`);
console.log(`Errors: ${support.errors}`);
```

## Resource Limits

```typescript
const config: SandboxConfig = {
  // ...
  limits: {
    maxCpuTimeSeconds: 300,    // 5 minutes
    maxMemoryMB: 1024,         // 1 GB
    maxOpenFiles: 256,
    maxFileSizeMB: 100,        // 100 MB per file
    maxProcesses: 10,
    timeoutMs: 300000,         // 5 minutes
  },
};
```

## Error Handling

```typescript
const result = await sandbox.execute({ command: 'some-command' });

if (!result.success) {
  if (result.timedOut) {
    console.error('Command timed out');
  } else if (result.resourceLimitExceeded) {
    console.error('Resource limit exceeded');
  } else {
    console.error(`Failed: ${result.error}`);
  }
}
```

## Best Practices

1. **Always use the most restrictive policy** that meets your needs
2. **Never use DangerFullAccess** for untrusted operations
3. **Always call destroy()** when done with a sandbox
4. **Handle timeout and error cases** appropriately
5. **Monitor execution statistics** for performance insights

## Comparison with Codex CLI

| Feature | Codex CLI | Vlinder SandBox |
|---------|-----------|-----------------|
| Filesystem Isolation | bubblewrap | Node.js fs + permission checks |
| Network Isolation | seccomp + namespaces | Permission checks + agents |
| Process Hardening | seccomp + prctl | Environment sanitization |
| Platform Support | Linux/macOS | Linux/macOS/Windows |
| Integration | CLI tool | VSCode extension module |

## License

MIT License - Part of the Vlinder project
