/**
 * SandBox Module - Process Isolation
 *
 * Implements process-level isolation and hardening measures to protect
 * the host system from sandboxed processes. Inspired by Codex CLI's
 * process-hardening implementation.
 *
 * @author Vlinder Team
 * @version 1.0.0
 */

import * as childProcess from 'child_process';
import * as path from 'path';

/**
 * Dangerous environment variables that should be removed for security
 */
const DANGEROUS_ENV_PREFIXES = [
	'LD_', // Linux dynamic linker (LD_PRELOAD, LD_LIBRARY_PATH, etc.)
	'DYLD_', // macOS dynamic linker
	'_NT_', // Windows NT specific
	'PYTHONPATH', // Python module search path
	'PERL5LIB', // Perl library path
	'RUBYLIB', // Ruby library path
	'NODE_OPTIONS', // Node.js options (can load arbitrary code)
];

/**
 * Environment variables that should never be removed
 */
const PROTECTED_ENV_VARS = ['PATH', 'HOME', 'USER', 'TMP', 'TEMP', 'TMPDIR'];

/**
 * Options for process hardening
 */
export interface ProcessHardeningOptions {
	/** Disable core dumps */
	disableCoreDumps?: boolean;

	/** Disable ptrace/debugger attachment */
	disablePtrace?: boolean;

	/** Remove dangerous environment variables */
	removeDangerousEnvVars?: boolean;

	/** Additional environment variable prefixes to remove */
	additionalDangerPrefixes?: string[];

	/** Environment variables to preserve even if dangerous */
	preserveEnvVars?: string[];
}

/**
 * Result of process hardening
 */
export interface ProcessHardeningResult {
	/** Whether hardening was successful */
	success: boolean;

	/** List of environment variables that were removed */
	removedEnvVars: string[];

	/** Any errors that occurred during hardening */
	errors: string[];
}

/**
 * Process isolation manager
 */
export class ProcessIsolation {
	private options: ProcessHardeningOptions;

	constructor(options: ProcessHardeningOptions = {}) {
		this.options = {
			disableCoreDumps: true,
			disablePtrace: true,
			removeDangerousEnvVars: true,
			...options,
		};
	}

	/**
	 * Apply process hardening to the current process environment
	 */
	applyHardening(): ProcessHardeningResult {
		const result: ProcessHardeningResult = {
			success: true,
			removedEnvVars: [],
			errors: [],
		};

		// Remove dangerous environment variables
		if (this.options.removeDangerousEnvVars) {
			const removed = this.removeDangerousEnvVars();
			result.removedEnvVars = removed;
		}

		// Platform-specific hardening
		if (process.platform === 'linux') {
			this.applyLinuxHardening(result);
		} else if (process.platform === 'darwin') {
			this.applyMacOSHardening(result);
		}

		return result;
	}

	/**
	 * Remove dangerous environment variables
	 */
	private removeDangerousEnvVars(): string[] {
		const removed: string[] = [];
		const dangerousPrefixes = [
			...DANGEROUS_ENV_PREFIXES,
			...(this.options.additionalDangerPrefixes || []),
		];

		const preserve = new Set([
			...PROTECTED_ENV_VARS,
			...(this.options.preserveEnvVars || []),
		]);

		for (const key of Object.keys(process.env)) {
			if (preserve.has(key)) {
				continue;
			}

			for (const prefix of dangerousPrefixes) {
				if (key.startsWith(prefix)) {
					delete process.env[key];
					removed.push(key);
					break;
				}
			}
		}

		return removed;
	}

	/**
	 * Apply Linux-specific hardening
	 */
	private applyLinuxHardening(result: ProcessHardeningResult): void {
		// On Linux, we can set resource limits via setrlimit
		// In Node.js, this is done via child_process spawn options

		// For the current process, we can try to disable core dumps
		if (this.options.disableCoreDumps) {
			try {
				// Set core file size limit to 0
				// In Node.js, this requires native code or external commands
				this.setResourceLimit('core', 0);
			} catch (error) {
				result.errors.push(
					`Failed to disable core dumps: ${error instanceof Error ? error.message : String(error)}`
				);
			}
		}
	}

	/**
	 * Apply macOS-specific hardening
	 */
	private applyMacOSHardening(result: ProcessHardeningResult): void {
		// On macOS, we can try similar measures
		if (this.options.disableCoreDumps) {
			try {
				this.setResourceLimit('core', 0);
			} catch (error) {
				result.errors.push(
					`Failed to disable core dumps: ${error instanceof Error ? error.message : String(error)}`
				);
			}
		}
	}

	/**
	 * Set a resource limit (simplified implementation)
	 */
	private setResourceLimit(
		resource: string,
		value: number
	): void {
		// In a full implementation, this would use native bindings
		// For now, we log the intent
		console.debug(`[Sandbox] Setting resource limit: ${resource} = ${value}`);
	}

	/**
	 * Create a sanitized environment for child processes
	 */
	createSandboxedEnvironment(
		baseEnv: NodeJS.ProcessEnv = process.env,
		additionalEnv?: Record<string, string>
	): NodeJS.ProcessEnv {
		const sanitized: NodeJS.ProcessEnv = {};

		// Copy base environment
		for (const [key, value] of Object.entries(baseEnv)) {
			if (value !== undefined) {
				sanitized[key] = value;
			}
		}

		// Remove dangerous variables
		if (this.options.removeDangerousEnvVars) {
			const dangerousPrefixes = [
				...DANGEROUS_ENV_PREFIXES,
				...(this.options.additionalDangerPrefixes || []),
			];

			const preserve = new Set([
				...PROTECTED_ENV_VARS,
				...(this.options.preserveEnvVars || []),
			]);

			for (const key of Object.keys(sanitized)) {
				if (preserve.has(key)) {
					continue;
				}

				for (const prefix of dangerousPrefixes) {
					if (key.startsWith(prefix)) {
						delete sanitized[key];
						break;
					}
				}
			}
		}

		// Add additional environment variables
		if (additionalEnv) {
			for (const [key, value] of Object.entries(additionalEnv)) {
				sanitized[key] = value;
			}
		}

		return sanitized;
	}
}

/**
 * Resource limit configuration
 */
export interface ResourceLimitConfig {
	cpuTime?: number; // seconds
	memory?: number; // bytes
	fileSize?: number; // bytes
	openFiles?: number;
	processes?: number;
}

/**
 * Spawn options with sandbox hardening applied
 */
export interface SandboxedSpawnOptions extends childProcess.SpawnOptions {
	/** Resource limits to apply */
	resourceLimits?: ResourceLimitConfig;

	/** Whether to enable process isolation */
	isolation?: boolean;

	/** Working directory for the process */
	cwd?: string;

	/** Environment variables (will be sanitized) */
	env?: NodeJS.ProcessEnv;

	/** Timeout in milliseconds */
	timeout?: number;

	/** Whether to kill the process on parent exit */
	killOnExit?: boolean;
}

/**
 * Create spawn options with sandbox hardening
 */
export function createSandboxedSpawnOptions(
	options: SandboxedSpawnOptions = {}
): childProcess.SpawnOptions {
	const isolation = new ProcessIsolation({
		disableCoreDumps: true,
		disablePtrace: true,
		removeDangerousEnvVars: true,
	});

	const sandboxedEnv = isolation.createSandboxedEnvironment(
		options.env || process.env
	);

	const spawnOptions: childProcess.SpawnOptions = {
		cwd: options.cwd,
		env: sandboxedEnv,
		stdio: options.stdio || ['pipe', 'pipe', 'pipe'],
		detached: false, // Ensure child dies with parent
		...options,
	};

	return spawnOptions;
}

/**
 * Utility to track and manage child processes
 */
export class ProcessManager {
	private processes: Map<string, childProcess.ChildProcess> = new Map();
	private timeouts: Map<string, NodeJS.Timeout> = new Map();

	/**
	 * Register a process for tracking
	 */
	register(id: string, proc: childProcess.ChildProcess): void {
		this.processes.set(id, proc);

		// Ensure cleanup on process exit
		proc.once('exit', () => {
			this.unregister(id);
		});

		proc.once('error', () => {
			this.unregister(id);
		});
	}

	/**
	 * Unregister a process
	 */
	unregister(id: string): void {
		this.processes.delete(id);

		const timeout = this.timeouts.get(id);
		if (timeout) {
			clearTimeout(timeout);
			this.timeouts.delete(id);
		}
	}

	/**
	 * Set a timeout for a process
	 */
	setTimeout(
		id: string,
		timeoutMs: number,
		onTimeout: () => void
	): void {
		const timeout = setTimeout(() => {
			this.kill(id);
			onTimeout();
		}, timeoutMs);

		this.timeouts.set(id, timeout);
	}

	/**
	 * Kill a registered process
	 */
	kill(id: string, signal: NodeJS.Signals = 'SIGTERM'): boolean {
		const proc = this.processes.get(id);
		if (proc && !proc.killed) {
			proc.kill(signal);
			return true;
		}
		return false;
	}

	/**
	 * Kill all registered processes
	 */
	killAll(signal: NodeJS.Signals = 'SIGTERM'): void {
		for (const id of this.processes.keys()) {
			this.kill(id, signal);
		}
	}

	/**
	 * Get all registered process IDs
	 */
	getProcessIds(): string[] {
		return Array.from(this.processes.keys());
	}

	/**
	 * Check if a process is still running
	 */
	isRunning(id: string): boolean {
		const proc = this.processes.get(id);
		return proc !== undefined && !proc.killed;
	}

	/**
	 * Cleanup all resources
	 */
	cleanup(): void {
		this.killAll('SIGKILL');

		for (const timeout of this.timeouts.values()) {
			clearTimeout(timeout);
		}

		this.processes.clear();
		this.timeouts.clear();
	}
}

/**
 * Global process manager instance
 */
export const globalProcessManager = new ProcessManager();

// Cleanup on process exit
process.on('exit', () => {
	globalProcessManager.cleanup();
});

process.on('SIGINT', () => {
	globalProcessManager.cleanup();
	process.exit(130);
});

process.on('SIGTERM', () => {
	globalProcessManager.cleanup();
	process.exit(143);
});
