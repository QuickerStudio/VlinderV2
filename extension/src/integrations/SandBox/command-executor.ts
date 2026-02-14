/**
 * SandBox Module - Command Executor
 *
 * Executes commands within the sandbox environment with proper isolation
 * and resource management. Inspired by Codex CLI's execution model.
 *
 * @author Vlinder Team
 * @version 1.0.0
 */

import * as childProcess from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import {
	SandboxConfig,
	SandboxCommand,
	SandboxResult,
	SandboxStatus,
	SandboxStatistics,
	ISandbox,
	CreateSandboxOptions,
} from './types';
import { SandboxPolicy, detectSandboxCapabilities } from './sandbox-policy';
import { ProcessIsolation, ProcessManager, createSandboxedSpawnOptions } from './process-isolation';
import { FilesystemIsolation, SandboxedFileOperations } from './filesystem-isolation';
import { NetworkIsolation } from './network-isolation';

/**
 * Main sandbox implementation
 */
export class Sandbox implements ISandbox {
	private _id: string;
	private _config: SandboxConfig;
	private _status: SandboxStatus = SandboxStatus.Creating;
	private _context: vscode.ExtensionContext;
	private _outputChannel?: vscode.OutputChannel;
	private _verbose: boolean;

	private _processIsolation: ProcessIsolation;
	private _filesystemIsolation: FilesystemIsolation;
	private _networkIsolation: NetworkIsolation;
	private _processManager: ProcessManager;

	private _statistics: SandboxStatistics = {
		totalExecutions: 0,
		successfulExecutions: 0,
		failedExecutions: 0,
		totalExecutionTimeMs: 0,
		averageExecutionTimeMs: 0,
		timeoutCount: 0,
		resourceLimitExceededCount: 0,
	};

	private _eventListeners: Map<string, Set<Function>> = new Map();

	constructor(options: CreateSandboxOptions) {
		this._id = options.config.id;
		this._config = options.config;
		this._context = options.context;
		this._outputChannel = options.outputChannel;
		this._verbose = options.verbose ?? false;

		// Initialize isolation components
		this._processIsolation = new ProcessIsolation({
			disableCoreDumps: this._config.security?.disableCoreDumps ?? true,
			disablePtrace: this._config.security?.disablePtrace ?? true,
			removeDangerousEnvVars: this._config.security?.removeDangerousEnvVars ?? true,
		});

		this._filesystemIsolation = new FilesystemIsolation({
			workingDirectory: this._config.workingDirectory,
			accessLevel: this._config.filesystem.accessLevel,
			writableRoots: this._config.filesystem.writableRoots || [],
			readOnlyPaths: this._config.filesystem.readOnlyPaths,
			hiddenPaths: this._config.filesystem.hiddenPaths,
		});

		this._networkIsolation = new NetworkIsolation({
			accessLevel: this._config.network.accessLevel,
			allowedHosts: this._config.network.allowedHosts,
			proxy: this._config.network.proxy,
		});

		this._processManager = new ProcessManager();

		this.log('Sandbox instance created');
	}

	get id(): string {
		return this._id;
	}

	get status(): SandboxStatus {
		return this._status;
	}

	get config(): SandboxConfig {
		return this._config;
	}

	/**
	 * Initialize the sandbox environment
	 */
	async initialize(): Promise<void> {
		this._status = SandboxStatus.Creating;
		this.log('Initializing sandbox...');

		try {
			// Apply process hardening
			const hardeningResult = this._processIsolation.applyHardening();

			if (hardeningResult.errors.length > 0) {
				this.log(`Hardening errors: ${hardeningResult.errors.join(', ')}`);

				if (this._config.security?.strictMode) {
					throw new Error(
						`Process hardening failed: ${hardeningResult.errors.join(', ')}`
					);
				}
			}

			if (hardeningResult.removedEnvVars.length > 0) {
				this.log(
					`Removed dangerous env vars: ${hardeningResult.removedEnvVars.join(', ')}`
				);
			}

			// Verify filesystem access
			const fsOperations = new SandboxedFileOperations(this._filesystemIsolation);
			const workDir = this._config.workingDirectory;

			try {
				fsOperations.exists(workDir);
				this.log(`Working directory verified: ${workDir}`);
			} catch (error) {
				this.log(`Warning: Cannot access working directory: ${workDir}`);
			}

			// Detect platform capabilities
			const capabilities = detectSandboxCapabilities();

			if (!capabilities.supported) {
				this.log(`Warning: Sandbox support limited: ${capabilities.warnings.join('; ')}`);
			}

			this._status = SandboxStatus.Ready;
			this.log('Sandbox initialized successfully');
			this.emit('onStatusChange', this._status);
		} catch (error) {
			this._status = SandboxStatus.Error;
			this.log(`Failed to initialize sandbox: ${error}`);
			this.emit('onStatusChange', this._status);
			throw error;
		}
	}

	/**
	 * Execute a command in the sandbox
	 */
	async execute(command: SandboxCommand): Promise<SandboxResult> {
		if (this._status !== SandboxStatus.Ready) {
			return {
				success: false,
				exitCode: null,
				stdout: '',
				stderr: '',
				executionTimeMs: 0,
				timedOut: false,
				resourceLimitExceeded: false,
				error: `Sandbox not ready (status: ${this._status})`,
			};
		}

		this._status = SandboxStatus.Executing;
		this.emit('onStatusChange', this._status);
		this.emit('onExecutionStart', command);

		const startTime = Date.now();
		const processId = `${this._id}-${Date.now()}`;

		this.log(`Executing: ${command.command} ${(command.args || []).join(' ')}`);

		// Check filesystem permissions for the command
		const commandPath = command.command;
		if (path.isAbsolute(commandPath)) {
			const check = this._filesystemIsolation.checkExecutePermission(commandPath);
			if (!check.allowed) {
				const result: SandboxResult = {
					success: false,
					exitCode: 126,
					stdout: '',
					stderr: check.reason,
					executionTimeMs: Date.now() - startTime,
					timedOut: false,
					resourceLimitExceeded: false,
					error: check.reason,
				};

				this.updateStatistics(result);
				this._status = SandboxStatus.Ready;
				this.emit('onExecutionComplete', result);
				return result;
			}
		}

		// Build spawn options
		const spawnOptions = createSandboxedSpawnOptions({
			cwd: command.cwd || this._config.workingDirectory,
			env: {
				...this._config.environment,
				...command.env,
			},
			timeout: this._config.limits?.timeoutMs,
		});

		// Execute the command
		return new Promise((resolve) => {
			const stdoutChunks: Buffer[] = [];
			const stderrChunks: Buffer[] = [];
			let timedOut = false;
			let resourceLimitExceeded = false;

			const proc = childProcess.spawn(
				command.command,
				command.args || [],
				spawnOptions
			);

			// Register process for management
			this._processManager.register(processId, proc);

			// Set timeout
			const timeoutMs = this._config.limits?.timeoutMs || 300000;
			this._processManager.setTimeout(processId, timeoutMs, () => {
				timedOut = true;
				this.log(`Process timed out after ${timeoutMs}ms`);
			});

			// Collect output
			proc.stdout?.on('data', (data: Buffer) => {
				stdoutChunks.push(data);
				this.emit('onStdout', data.toString());
			});

			proc.stderr?.on('data', (data: Buffer) => {
				stderrChunks.push(data);
				this.emit('onStderrr', data.toString());
			});

			// Handle completion
			proc.on('close', (code, signal) => {
				this._processManager.unregister(processId);

				const stdout = Buffer.concat(stdoutChunks).toString('utf-8');
				const stderr = Buffer.concat(stderrChunks).toString('utf-8');

				const result: SandboxResult = {
					success: code === 0,
					exitCode: code,
					stdout,
					stderr,
					executionTimeMs: Date.now() - startTime,
					timedOut,
					resourceLimitExceeded,
					error: signal ? `Process killed by signal: ${signal}` : undefined,
				};

				this.updateStatistics(result);
				this._status = SandboxStatus.Ready;
				this.emit('onExecutionComplete', result);
				this.emit('onStatusChange', this._status);

				this.log(`Command completed with exit code ${code}`);
				resolve(result);
			});

			// Handle errors
			proc.on('error', (error) => {
				this._processManager.unregister(processId);

				const result: SandboxResult = {
					success: false,
					exitCode: null,
					stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
					stderr: Buffer.concat(stderrChunks).toString('utf-8'),
					executionTimeMs: Date.now() - startTime,
					timedOut: false,
					resourceLimitExceeded: false,
					error: error.message,
				};

				this.updateStatistics(result);
				this._status = SandboxStatus.Ready;
				this.emit('onExecutionComplete', result);
				this.emit('onStatusChange', this._status);

				this.log(`Command failed with error: ${error.message}`);
				resolve(result);
			});
		});
	}

	/**
	 * Terminate any running process
	 */
	async terminate(): Promise<void> {
		this.log('Terminating all processes...');
		this._processManager.killAll('SIGTERM');

		// Give processes a moment to terminate gracefully
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Force kill remaining processes
		this._processManager.killAll('SIGKILL');

		this._status = SandboxStatus.Ready;
		this.log('All processes terminated');
	}

	/**
	 * Clean up and destroy the sandbox
	 */
	async destroy(): Promise<void> {
		this.log('Destroying sandbox...');
		this._status = SandboxStatus.Cleaning;
		this.emit('onStatusChange', this._status);

		await this.terminate();
		this._processManager.cleanup();

		this._status = SandboxStatus.Destroyed;
		this.emit('onStatusChange', this._status);

		this.log('Sandbox destroyed');
	}

	/**
	 * Subscribe to sandbox events
	 */
	on<K extends keyof import('./types').SandboxEvents>(
		event: K,
		listener: import('./types').SandboxEvents[K]
	): vscode.Disposable {
		if (!this._eventListeners.has(event)) {
			this._eventListeners.set(event, new Set());
		}

		this._eventListeners.get(event)!.add(listener as Function);

		return {
			dispose: () => {
				this._eventListeners.get(event)?.delete(listener as Function);
			},
		};
	}

	/**
	 * Get execution statistics
	 */
	getStatistics(): SandboxStatistics {
		return { ...this._statistics };
	}

	/**
	 * Log a message
	 */
	private log(message: string): void {
		if (this._verbose || this._outputChannel) {
			const timestamp = new Date().toISOString();
			const logMessage = `[Sandbox:${this._id}] ${timestamp}: ${message}`;

			if (this._outputChannel) {
				this._outputChannel.appendLine(logMessage);
			}

			if (this._verbose) {
				console.log(logMessage);
			}
		}
	}

	/**
	 * Emit an event
	 */
	private emit(event: string, ...args: unknown[]): void {
		const listeners = this._eventListeners.get(event);
		if (listeners) {
			for (const listener of listeners) {
				try {
					listener(...args);
				} catch (error) {
					this.log(`Error in event listener: ${error}`);
				}
			}
		}
	}

	/**
	 * Update execution statistics
	 */
	private updateStatistics(result: SandboxResult): void {
		this._statistics.totalExecutions++;

		if (result.success) {
			this._statistics.successfulExecutions++;
		} else {
			this._statistics.failedExecutions++;
		}

		this._statistics.totalExecutionTimeMs += result.executionTimeMs;
		this._statistics.averageExecutionTimeMs =
			this._statistics.totalExecutionTimeMs / this._statistics.totalExecutions;

		if (result.timedOut) {
			this._statistics.timeoutCount++;
		}

		if (result.resourceLimitExceeded) {
			this._statistics.resourceLimitExceededCount++;
		}
	}
}

/**
 * Create a new sandbox instance
 */
export async function createSandbox(
	options: CreateSandboxOptions
): Promise<ISandbox> {
	const sandbox = new Sandbox(options);
	await sandbox.initialize();
	return sandbox;
}

/**
 * Quick execution helper for one-off commands
 */
export async function executeInSandbox(
	command: SandboxCommand,
	config: SandboxConfig,
	context: vscode.ExtensionContext
): Promise<SandboxResult> {
	const sandbox = new Sandbox({
		context,
		config,
		verbose: false,
	});

	await sandbox.initialize();

	try {
		return await sandbox.execute(command);
	} finally {
		await sandbox.destroy();
	}
}

/**
 * Execute with read-only policy
 */
export async function executeReadOnly(
	command: SandboxCommand,
	workingDirectory: string,
	context: vscode.ExtensionContext
): Promise<SandboxResult> {
	const config = SandboxPolicy.createReadOnlyPolicy(workingDirectory);
	return executeInSandbox(command, config, context);
}

/**
 * Execute with workspace write policy
 */
export async function executeWorkspaceWrite(
	command: SandboxCommand,
	workingDirectory: string,
	context: vscode.ExtensionContext,
	additionalWritableRoots?: string[]
): Promise<SandboxResult> {
	const config = SandboxPolicy.createWorkspaceWritePolicy(
		workingDirectory,
		additionalWritableRoots
	);
	return executeInSandbox(command, config, context);
}

/**
 * Execute with full access (use with caution!)
 */
export async function executeFullAccess(
	command: SandboxCommand,
	workingDirectory: string,
	context: vscode.ExtensionContext
): Promise<SandboxResult> {
	const config = SandboxPolicy.createFullDiskWritePolicy(workingDirectory);
	return executeInSandbox(command, config, context);
}
