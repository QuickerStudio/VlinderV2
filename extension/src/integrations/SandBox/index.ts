/**
 * SandBox Module - Main Entry Point
 *
 * A comprehensive execution environment isolation system for VSCode extensions.
 * Inspired by OpenAI Codex CLI's sandbox implementation, this module provides:
 *
 * - Filesystem isolation with read-only defaults and explicit writable roots
 * - Network isolation with configurable access levels
 * - Process isolation and hardening measures
 * - Resource limits and timeout management
 * - Event-driven architecture for monitoring
 *
 * @example
 * ```typescript
 * import { createSandbox, SandboxPolicy } from './integrations/SandBox';
 *
 * // Create a read-only sandbox
 * const config = SandboxPolicy.createReadOnlyPolicy('/path/to/workspace');
 * const sandbox = await createSandbox({ context, config });
 *
 * // Execute a command
 * const result = await sandbox.execute({
 *   command: 'npm',
 *   args: ['test'],
 * });
 *
 * // Cleanup
 * await sandbox.destroy();
 * ```
 *
 * @author Vlinder Team
 * @version 1.0.0
 */

// Re-export types
export * from './types';

// Re-export sandbox policy
export {
	SandboxPolicy,
	detectSandboxCapabilities,
	generateSandboxId,
} from './sandbox-policy';

// Re-export process isolation
export {
	ProcessIsolation,
	ProcessManager,
	globalProcessManager,
	createSandboxedSpawnOptions,
} from './process-isolation';

// Re-export filesystem isolation
export {
	FilesystemIsolation,
	SandboxedFileOperations,
	PathUtils,
} from './filesystem-isolation';

// Re-export network isolation
export {
	NetworkIsolation,
	NetworkInterceptor,
	createSandboxedHttpAgent,
	createSandboxedHttpsAgent,
	NetworkConnectivityChecker,
} from './network-isolation';

// Re-export command executor
export {
	Sandbox,
	createSandbox,
	executeInSandbox,
	executeReadOnly,
	executeWorkspaceWrite,
	executeFullAccess,
} from './command-executor';

// Import for convenience default export
import { Sandbox } from './command-executor';
import { SandboxPolicy } from './sandbox-policy';
import { createSandbox } from './command-executor';
import {
	SandboxConfig,
	SandboxCommand,
	SandboxResult,
	SandboxStatus,
	NetworkAccessLevel,
	FilesystemAccessLevel,
} from './types';

/**
 * Convenience object for quick access to sandbox functionality
 */
export const SandBox = {
	/**
	 * Create a new sandbox instance
	 */
	create: createSandbox,

	/**
	 * Predefined sandbox policies
	 */
	Policy: SandboxPolicy,

	/**
	 * Execute a command in a read-only sandbox
	 */
	async executeReadOnly(
		command: string,
		args: string[],
		workingDirectory: string,
		context: unknown
	): Promise<SandboxResult> {
		const config = SandboxPolicy.createReadOnlyPolicy(workingDirectory);
		const sandbox = new Sandbox({
			context: context as any,
			config,
			verbose: false,
		});

		await sandbox.initialize();

		try {
			return await sandbox.execute({ command, args });
		} finally {
			await sandbox.destroy();
		}
	},

	/**
	 * Execute a command in a sandboxed workspace
	 */
	async executeWorkspace(
		command: string,
		args: string[],
		workingDirectory: string,
		context: unknown
	): Promise<SandboxResult> {
		const config = SandboxPolicy.createWorkspaceWritePolicy(workingDirectory);
		const sandbox = new Sandbox({
			context: context as any,
			config,
			verbose: false,
		});

		await sandbox.initialize();

		try {
			return await sandbox.execute({ command, args });
		} finally {
			await sandbox.destroy();
		}
	},

	/**
	 * Execute a command with full access (use with caution!)
	 */
	async executeFullAccess(
		command: string,
		args: string[],
		workingDirectory: string,
		context: unknown
	): Promise<SandboxResult> {
		const config = SandboxPolicy.createFullDiskWritePolicy(workingDirectory);
		const sandbox = new Sandbox({
			context: context as any,
			config,
			verbose: false,
		});

		await sandbox.initialize();

		try {
			return await sandbox.execute({ command, args });
		} finally {
			await sandbox.destroy();
		}
	},
};

export default SandBox;
