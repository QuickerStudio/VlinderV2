/**
 * SandBox Module - Type Definitions
 *
 * This module defines the core types and interfaces for the execution environment
 * isolation sandbox system, inspired by Codex CLI's sandbox implementation.
 *
 * @author Vlinder Team
 * @version 1.0.0
 */

import * as vscode from 'vscode';

/**
 * Network access level for sandboxed processes
 */
export enum NetworkAccessLevel {
	/** Full network access - no restrictions */
	FullAccess = 'full-access',
	/** Isolated network - only local loopback */
	Isolated = 'isolated',
	/** No network access at all */
	None = 'none',
	/** Proxy-only access - restricted to configured proxy */
	ProxyOnly = 'proxy-only',
}

/**
 * Filesystem access level for sandboxed processes
 */
export enum FilesystemAccessLevel {
	/** Full read/write access to entire filesystem */
	FullAccess = 'full-access',
	/** Read-only access to filesystem, with specific writable roots */
	ReadOnly = 'read-only',
	/** No filesystem access */
	None = 'none',
}

/**
 * Defines a writable root directory with optional protected subpaths
 */
export interface WritableRoot {
	/** The root path that will be writable */
	root: string;

	/** Subpaths under the root that should remain read-only */
	protectedSubpaths?: string[];

	/** Whether to allow symlinks to escape the root */
	allowSymlinks?: boolean;
}

/**
 * Resource limits for sandboxed processes
 */
export interface ResourceLimits {
	/** Maximum CPU time in seconds (0 = unlimited) */
	maxCpuTimeSeconds?: number;

	/** Maximum memory in megabytes (0 = unlimited) */
	maxMemoryMB?: number;

	/** Maximum number of open file descriptors */
	maxOpenFiles?: number;

	/** Maximum file size that can be created in megabytes */
	maxFileSizeMB?: number;

	/** Maximum number of processes */
	maxProcesses?: number;

	/** Maximum execution time in milliseconds */
	timeoutMs?: number;
}

/**
 * Configuration for the sandbox environment
 */
export interface SandboxConfig {
	/** Unique identifier for this sandbox instance */
	id: string;

	/** Working directory for the sandboxed process */
	workingDirectory: string;

	/** Environment variables to pass to the process */
	environment?: Record<string, string>;

	/** Environment variables to remove/unset */
	removeEnvironment?: string[];

	/** Filesystem access configuration */
	filesystem: {
		/** Overall filesystem access level */
		accessLevel: FilesystemAccessLevel;

		/** Directories that can be written to (when accessLevel is ReadOnly) */
		writableRoots?: WritableRoot[];

		/** Additional read-only paths to expose */
		readOnlyPaths?: string[];

		/** Paths to completely hide from the process */
		hiddenPaths?: string[];
	};

	/** Network access configuration */
	network: {
		/** Network access level */
		accessLevel: NetworkAccessLevel;

		/** Allowed hosts (when accessLevel is ProxyOnly or custom) */
		allowedHosts?: string[];

		/** Proxy configuration */
		proxy?: {
			http?: string;
			https?: string;
		};
	};

	/** Resource limits */
	limits?: ResourceLimits;

	/** Security options */
	security?: {
		/** Disable core dumps */
		disableCoreDumps?: boolean;

		/** Disable ptrace attachment */
		disablePtrace?: boolean;

		/** Remove dangerous environment variables (LD_PRELOAD, DYLD_*) */
		removeDangerousEnvVars?: boolean;

		/** Enable strict mode (fails closed on errors) */
		strictMode?: boolean;
	};
}

/**
 * Represents a command to be executed in the sandbox
 */
export interface SandboxCommand {
	/** The command to execute (executable path or name) */
	command: string;

	/** Arguments to pass to the command */
	args?: string[];

	/** Working directory override (optional) */
	cwd?: string;

	/** Environment variable overrides */
	env?: Record<string, string>;
}

/**
 * Result of a sandbox execution
 */
export interface SandboxResult {
	/** Whether the execution was successful */
	success: boolean;

	/** Exit code of the process */
	exitCode: number | null;

	/** Standard output from the process */
	stdout: string;

	/** Standard error from the process */
	stderr: string;

	/** Execution time in milliseconds */
	executionTimeMs: number;

	/** Whether the process was killed due to timeout */
	timedOut: boolean;

	/** Whether the process was killed due to resource limit */
	resourceLimitExceeded: boolean;

	/** Error message if execution failed */
	error?: string;

	/** Additional metadata about the execution */
	metadata?: {
		/** Peak memory usage in bytes */
		peakMemoryBytes?: number;

		/** CPU time used in milliseconds */
		cpuTimeMs?: number;

		/** Number of file descriptors used */
		fileDescriptorsUsed?: number;
	};
}

/**
 * Status of a sandbox instance
 */
export enum SandboxStatus {
	/** Sandbox is being created */
	Creating = 'creating',
	/** Sandbox is ready to execute commands */
	Ready = 'ready',
	/** Sandbox is currently executing a command */
	Executing = 'executing',
	/** Sandbox is being cleaned up */
	Cleaning = 'cleaning',
	/** Sandbox has been destroyed */
	Destroyed = 'destroyed',
	/** Sandbox encountered an error */
	Error = 'error',
}

/**
 * Events emitted by the sandbox
 */
export interface SandboxEvents {
	/** Emitted when a command starts executing */
	onExecutionStart: (command: SandboxCommand) => void;

	/** Emitted when a command completes */
	onExecutionComplete: (result: SandboxResult) => void;

	/** Emitted when stdout data is received */
	onStdout: (data: string) => void;

	/** Emitted when stderr data is received */
	onStderrr: (data: string) => void;

	/** Emitted when sandbox status changes */
	onStatusChange: (status: SandboxStatus) => void;

	/** Emitted when an error occurs */
	onError: (error: Error) => void;
}

/**
 * Options for creating a sandbox instance
 */
export interface CreateSandboxOptions {
	/** VSCode extension context */
	context: vscode.ExtensionContext;

	/** Output channel for logging */
	outputChannel?: vscode.OutputChannel;

	/** Whether to enable detailed logging */
	verbose?: boolean;

	/** Custom sandbox configuration */
	config: SandboxConfig;
}

/**
 * Interface for sandbox implementations
 */
export interface ISandbox {
	/** Unique identifier for this sandbox */
	readonly id: string;

	/** Current status of the sandbox */
	readonly status: SandboxStatus;

	/** The sandbox configuration */
	readonly config: SandboxConfig;

	/**
	 * Initialize the sandbox environment
	 */
	initialize(): Promise<void>;

	/**
	 * Execute a command in the sandbox
	 */
	execute(command: SandboxCommand): Promise<SandboxResult>;

	/**
	 * Terminate any running process
	 */
	terminate(): Promise<void>;

	/**
	 * Clean up and destroy the sandbox
	 */
	destroy(): Promise<void>;

	/**
	 * Subscribe to sandbox events
	 */
	on<K extends keyof SandboxEvents>(
		event: K,
		listener: SandboxEvents[K]
	): vscode.Disposable;
}

/**
 * Factory function type for creating sandbox instances
 */
export type SandboxFactory = (options: CreateSandboxOptions) => Promise<ISandbox>;

/**
 * Platform-specific sandbox capabilities
 */
export interface SandboxCapabilities {
	/** Whether filesystem isolation is supported */
	filesystemIsolation: boolean;

	/** Whether network isolation is supported */
	networkIsolation: boolean;

	/** Whether process isolation is supported */
	processIsolation: boolean;

	/** Whether resource limits are supported */
	resourceLimits: boolean;

	/** Whether seccomp filters are supported */
	seccompFilters: boolean;

	/** The isolation backend to use */
	isolationBackend: 'none' | 'basic' | 'bubblewrap' | 'containers' | 'chroot';
}

/**
 * Detection result for sandbox support
 */
export interface SandboxSupportInfo {
	/** The current platform */
	platform: 'linux' | 'darwin' | 'win32' | 'unknown';

	/** Available capabilities on this platform */
	capabilities: SandboxCapabilities;

	/** Whether sandbox is fully supported */
	supported: boolean;

	/** Warning messages about missing features */
	warnings: string[];

	/** Error messages about critical missing features */
	errors: string[];
}

/**
 * Statistics about sandbox usage
 */
export interface SandboxStatistics {
	/** Total number of commands executed */
	totalExecutions: number;

	/** Number of successful executions */
	successfulExecutions: number;

	/** Number of failed executions */
	failedExecutions: number;

	/** Total execution time in milliseconds */
	totalExecutionTimeMs: number;

	/** Average execution time in milliseconds */
	averageExecutionTimeMs: number;

	/** Number of timeout events */
	timeoutCount: number;

	/** Number of resource limit exceeded events */
	resourceLimitExceededCount: number;
}
