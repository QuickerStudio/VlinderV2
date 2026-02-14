/**
 * SandBox Module - Sandbox Policy Definitions
 *
 * Predefined sandbox policies for common use cases, inspired by Codex CLI's
 * sandbox policy system. Provides different levels of isolation based on
 * security requirements.
 *
 * @author Vlinder Team
 * @version 1.0.0
 */

import {
	SandboxConfig,
	FilesystemAccessLevel,
	NetworkAccessLevel,
	WritableRoot,
	ResourceLimits,
	SandboxCapabilities,
	SandboxSupportInfo,
} from './types';

/**
 * Base resource limits that can be customized
 */
const DEFAULT_RESOURCE_LIMITS: ResourceLimits = {
	maxCpuTimeSeconds: 300, // 5 minutes
	maxMemoryMB: 1024, // 1 GB
	maxOpenFiles: 256,
	maxFileSizeMB: 100, // 100 MB per file
	maxProcesses: 10,
	timeoutMs: 300000, // 5 minutes
};

const STRICT_RESOURCE_LIMITS: ResourceLimits = {
	maxCpuTimeSeconds: 60, // 1 minute
	maxMemoryMB: 512, // 512 MB
	maxOpenFiles: 64,
	maxFileSizeMB: 10, // 10 MB per file
	maxProcesses: 3,
	timeoutMs: 60000, // 1 minute
};

/**
 * Generate a unique sandbox ID
 */
export function generateSandboxId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 10);
	return `sb-${timestamp}-${random}`;
}

/**
 * SandboxPolicy provides factory methods for creating sandbox configurations
 * with different security levels.
 */
export class SandboxPolicy {
	/**
	 * Creates a read-only policy for safe code analysis.
	 * The process can read files but cannot modify anything.
	 */
	static createReadOnlyPolicy(workingDirectory: string): SandboxConfig {
		return {
			id: generateSandboxId(),
			workingDirectory,
			environment: {},
			filesystem: {
				accessLevel: FilesystemAccessLevel.ReadOnly,
				writableRoots: [],
			},
			network: {
				accessLevel: NetworkAccessLevel.None,
			},
			limits: STRICT_RESOURCE_LIMITS,
			security: {
				disableCoreDumps: true,
				disablePtrace: true,
				removeDangerousEnvVars: true,
				strictMode: true,
			},
		};
	}

	/**
	 * Creates a workspace write policy for normal development tasks.
	 * The process can read the entire filesystem but only write to the workspace.
	 */
	static createWorkspaceWritePolicy(
		workingDirectory: string,
		additionalWritableRoots?: string[]
	): SandboxConfig {
		const writableRoots: WritableRoot[] = [
			{
				root: workingDirectory,
				protectedSubpaths: ['.git', '.env', '.credentials'],
				allowSymlinks: false,
			},
		];

		if (additionalWritableRoots) {
			for (const root of additionalWritableRoots) {
				writableRoots.push({
					root,
					protectedSubpaths: [],
					allowSymlinks: false,
				});
			}
		}

		return {
			id: generateSandboxId(),
			workingDirectory,
			environment: {},
			filesystem: {
				accessLevel: FilesystemAccessLevel.ReadOnly,
				writableRoots,
			},
			network: {
				accessLevel: NetworkAccessLevel.Isolated,
			},
			limits: DEFAULT_RESOURCE_LIMITS,
			security: {
				disableCoreDumps: true,
				disablePtrace: true,
				removeDangerousEnvVars: true,
				strictMode: false,
			},
		};
	}

	/**
	 * Creates a full disk write policy for trusted operations.
	 * The process can read and write to the entire filesystem.
	 */
	static createFullDiskWritePolicy(workingDirectory: string): SandboxConfig {
		return {
			id: generateSandboxId(),
			workingDirectory,
			environment: {},
			filesystem: {
				accessLevel: FilesystemAccessLevel.FullAccess,
			},
			network: {
				accessLevel: NetworkAccessLevel.FullAccess,
			},
			limits: DEFAULT_RESOURCE_LIMITS,
			security: {
				disableCoreDumps: true,
				disablePtrace: true,
				removeDangerousEnvVars: true,
				strictMode: false,
			},
		};
	}

	/**
	 * Creates a minimal policy for quick, safe operations.
	 * Very restrictive with short timeouts.
	 */
	static createMinimalPolicy(workingDirectory: string): SandboxConfig {
		return {
			id: generateSandboxId(),
			workingDirectory,
			environment: {},
			filesystem: {
				accessLevel: FilesystemAccessLevel.ReadOnly,
				writableRoots: [],
			},
			network: {
				accessLevel: NetworkAccessLevel.None,
			},
			limits: {
				maxCpuTimeSeconds: 10,
				maxMemoryMB: 128,
				maxOpenFiles: 32,
				maxFileSizeMB: 1,
				maxProcesses: 1,
				timeoutMs: 15000,
			},
			security: {
				disableCoreDumps: true,
				disablePtrace: true,
				removeDangerousEnvVars: true,
				strictMode: true,
			},
		};
	}

	/**
	 * Creates a build policy for compilation and build tasks.
	 * Allows network access for package downloads and more resources.
	 */
	static createBuildPolicy(workingDirectory: string): SandboxConfig {
		return {
			id: generateSandboxId(),
			workingDirectory,
			environment: {},
			filesystem: {
				accessLevel: FilesystemAccessLevel.ReadOnly,
				writableRoots: [
					{
						root: workingDirectory,
						protectedSubpaths: ['.git'],
						allowSymlinks: true,
					},
				],
			},
			network: {
				accessLevel: NetworkAccessLevel.FullAccess,
			},
			limits: {
				maxCpuTimeSeconds: 1800, // 30 minutes
				maxMemoryMB: 4096, // 4 GB
				maxOpenFiles: 1024,
				maxFileSizeMB: 500,
				maxProcesses: 50,
				timeoutMs: 1800000, // 30 minutes
			},
			security: {
				disableCoreDumps: true,
				disablePtrace: true,
				removeDangerousEnvVars: true,
				strictMode: false,
			},
		};
	}

	/**
	 * Creates a test policy for running tests.
	 * Moderate restrictions with network isolation.
	 */
	static createTestPolicy(workingDirectory: string): SandboxConfig {
		return {
			id: generateSandboxId(),
			workingDirectory,
			environment: {
				NODE_ENV: 'test',
			},
			filesystem: {
				accessLevel: FilesystemAccessLevel.ReadOnly,
				writableRoots: [
					{
						root: workingDirectory,
						protectedSubpaths: ['.git'],
						allowSymlinks: false,
					},
				],
			},
			network: {
				accessLevel: NetworkAccessLevel.Isolated,
			},
			limits: {
				maxCpuTimeSeconds: 600, // 10 minutes
				maxMemoryMB: 2048, // 2 GB
				maxOpenFiles: 512,
				maxFileSizeMB: 100,
				maxProcesses: 20,
				timeoutMs: 600000, // 10 minutes
			},
			security: {
				disableCoreDumps: true,
				disablePtrace: true,
				removeDangerousEnvVars: true,
				strictMode: false,
			},
		};
	}

	/**
	 * Creates an agent policy for AI agent operations.
	 * Balanced restrictions for AI-assisted coding tasks.
	 */
	static createAgentPolicy(workingDirectory: string): SandboxConfig {
		return {
			id: generateSandboxId(),
			workingDirectory,
			environment: {},
			filesystem: {
				accessLevel: FilesystemAccessLevel.ReadOnly,
				writableRoots: [
					{
						root: workingDirectory,
						protectedSubpaths: ['.git', '.env', '.credentials', 'secrets'],
						allowSymlinks: false,
					},
				],
			},
			network: {
				accessLevel: NetworkAccessLevel.ProxyOnly,
				allowedHosts: [
					'api.openai.com',
					'api.anthropic.com',
					'github.com',
					'npmjs.org',
					'pypi.org',
				],
			},
			limits: DEFAULT_RESOURCE_LIMITS,
			security: {
				disableCoreDumps: true,
				disablePtrace: true,
				removeDangerousEnvVars: true,
				strictMode: true,
			},
		};
	}

	/**
	 * Creates a danger full access policy - NO RESTRICTIONS.
	 * Use with extreme caution, only for trusted operations.
	 */
	static get DangerFullAccess(): typeof DANGER_FULL_ACCESS_POLICY {
		return DANGER_FULL_ACCESS_POLICY;
	}

	/**
	 * Merge a base policy with custom overrides
	 */
	static mergePolicy(
		base: SandboxConfig,
		overrides: Partial<SandboxConfig>
	): SandboxConfig {
		return {
			...base,
			...overrides,
			id: overrides.id ?? generateSandboxId(),
			filesystem: {
				...base.filesystem,
				...overrides.filesystem,
			},
			network: {
				...base.network,
				...overrides.network,
			},
			limits: {
				...base.limits,
				...overrides.limits,
			},
			security: {
				...base.security,
				...overrides.security,
			},
			environment: {
				...base.environment,
				...overrides.environment,
			},
		};
	}

	/**
	 * Validate a sandbox configuration
	 */
	static validateConfig(config: SandboxConfig): string[] {
		const errors: string[] = [];

		if (!config.id) {
			errors.push('Sandbox ID is required');
		}

		if (!config.workingDirectory) {
			errors.push('Working directory is required');
		}

		if (
			config.filesystem.accessLevel === FilesystemAccessLevel.ReadOnly &&
			(!config.filesystem.writableRoots ||
				config.filesystem.writableRoots.length === 0)
		) {
			// This is valid, just means truly read-only
		}

		if (config.limits) {
			if (
				config.limits.maxCpuTimeSeconds !== undefined &&
				config.limits.maxCpuTimeSeconds < 0
			) {
				errors.push('maxCpuTimeSeconds must be non-negative');
			}
			if (
				config.limits.maxMemoryMB !== undefined &&
				config.limits.maxMemoryMB < 0
			) {
				errors.push('maxMemoryMB must be non-negative');
			}
			if (
				config.limits.timeoutMs !== undefined &&
				config.limits.timeoutMs < 0
			) {
				errors.push('timeoutMs must be non-negative');
			}
		}

		return errors;
	}
}

/**
 * Danger full access policy - bypasses all sandbox restrictions.
 * WARNING: Use only in development or for fully trusted operations.
 */
const DANGER_FULL_ACCESS_POLICY: SandboxConfig = {
	id: 'danger-full-access',
	workingDirectory: process.cwd(),
	filesystem: {
		accessLevel: FilesystemAccessLevel.FullAccess,
	},
	network: {
		accessLevel: NetworkAccessLevel.FullAccess,
	},
	security: {
		disableCoreDumps: false,
		disablePtrace: false,
		removeDangerousEnvVars: false,
		strictMode: false,
	},
};

/**
 * Detect platform capabilities for sandbox support
 */
export function detectSandboxCapabilities(): SandboxSupportInfo {
	const platform = process.platform as 'linux' | 'darwin' | 'win32' | 'unknown';
	const warnings: string[] = [];
	const errors: string[] = [];

	let capabilities: SandboxCapabilities;

	switch (platform) {
		case 'linux':
			capabilities = detectLinuxCapabilities();
			break;
		case 'darwin':
			capabilities = detectMacOSCapabilities();
			break;
		case 'win32':
			capabilities = detectWindowsCapabilities();
			break;
		default:
			capabilities = {
				filesystemIsolation: false,
				networkIsolation: false,
				processIsolation: false,
				resourceLimits: false,
				seccompFilters: false,
				isolationBackend: 'none',
			};
			errors.push(`Unsupported platform: ${platform}`);
	}

	// Add warnings for missing features
	if (!capabilities.filesystemIsolation) {
		warnings.push(
			'Filesystem isolation not available - process will have normal filesystem access'
		);
	}
	if (!capabilities.networkIsolation) {
		warnings.push(
			'Network isolation not available - process will have normal network access'
		);
	}
	if (!capabilities.seccompFilters) {
		warnings.push(
			'Seccomp filters not available - system call filtering disabled'
		);
	}

	const supported =
		errors.length === 0 && capabilities.isolationBackend !== 'none';

	return {
		platform,
		capabilities,
		supported,
		warnings,
		errors,
	};
}

function detectLinuxCapabilities(): SandboxCapabilities {
	// Linux has the best sandbox support
	return {
		filesystemIsolation: true, // via bubblewrap/chroot
		networkIsolation: true, // via network namespaces
		processIsolation: true, // via PID namespaces
		resourceLimits: true, // via rlimit/cgroups
		seccompFilters: true, // via seccomp
		isolationBackend: 'bubblewrap',
	};
}

function detectMacOSCapabilities(): SandboxCapabilities {
	// macOS has sandbox support via Seatbelt but less granular
	return {
		filesystemIsolation: true, // via Seatbelt sandbox
		networkIsolation: true, // via Seatbelt sandbox
		processIsolation: false, // limited
		resourceLimits: true, // via setrlimit
		seccompFilters: false, // not available
		isolationBackend: 'basic',
	};
}

function detectWindowsCapabilities(): SandboxCapabilities {
	// Windows has limited sandbox support without containers
	return {
		filesystemIsolation: false, // requires containers
		networkIsolation: false, // requires containers
		processIsolation: false, // requires containers
		resourceLimits: true, // via job objects
		seccompFilters: false, // not available
		isolationBackend: 'basic',
	};
}

export type { SandboxConfig };
