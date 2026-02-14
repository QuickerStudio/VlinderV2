/**
 * SandBox Module - Filesystem Isolation
 *
 * Provides filesystem access control and isolation for sandboxed processes.
 * Implements read-only defaults with explicit writable roots, similar to
 * Codex CLI's bubblewrap-based approach.
 *
 * @author Vlinder Team
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { WritableRoot, FilesystemAccessLevel } from './types';

/**
 * Filesystem permission check result
 */
export interface PermissionCheckResult {
	/** Whether access is allowed */
	allowed: boolean;

	/** Reason for the decision */
	reason: string;

	/** Whether the path is writable */
	writable: boolean;
}

/**
 * Options for filesystem isolation
 */
export interface FilesystemIsolationOptions {
	/** The working directory for the sandbox */
	workingDirectory: string;

	/** Overall filesystem access level */
	accessLevel: FilesystemAccessLevel;

	/** Directories that can be written to */
	writableRoots: WritableRoot[];

	/** Additional read-only paths */
	readOnlyPaths?: string[];

	/** Paths to hide from the process */
	hiddenPaths?: string[];
}

/**
 * Manages filesystem access control for the sandbox
 */
export class FilesystemIsolation {
	private workingDirectory: string;
	private accessLevel: FilesystemAccessLevel;
	private writableRoots: Map<string, WritableRoot> = new Map();
	private readOnlyPaths: Set<string> = new Set();
	private hiddenPaths: Set<string> = new Set();
	private normalizedRoots: Map<string, string> = new Map();

	constructor(options: FilesystemIsolationOptions) {
		this.workingDirectory = path.resolve(options.workingDirectory);
		this.accessLevel = options.accessLevel;

		// Process writable roots
		for (const root of options.writableRoots || []) {
			const normalizedRoot = path.resolve(root.root);
			this.writableRoots.set(normalizedRoot, root);
			this.normalizedRoots.set(normalizedRoot.toLowerCase(), normalizedRoot);
		}

		// Process read-only paths
		for (const p of options.readOnlyPaths || []) {
			this.readOnlyPaths.add(path.resolve(p));
		}

		// Process hidden paths
		for (const p of options.hiddenPaths || []) {
			this.hiddenPaths.add(path.resolve(p));
		}
	}

	/**
	 * Check if a path can be accessed
	 */
	checkReadPermission(targetPath: string): PermissionCheckResult {
		const normalized = path.resolve(targetPath);

		// Check if hidden
		if (this.isHidden(normalized)) {
			return {
				allowed: false,
				reason: 'Path is hidden from sandbox',
				writable: false,
			};
		}

		// Full access mode
		if (this.accessLevel === FilesystemAccessLevel.FullAccess) {
			return {
				allowed: true,
				reason: 'Full filesystem access granted',
				writable: true,
			};
		}

		// No filesystem access
		if (this.accessLevel === FilesystemAccessLevel.None) {
			return {
				allowed: false,
				reason: 'Filesystem access denied',
				writable: false,
			};
		}

		// Read-only mode - allow all reads
		return {
			allowed: true,
			reason: 'Read access allowed in read-only mode',
			writable: false,
		};
	}

	/**
	 * Check if a path can be written to
	 */
	checkWritePermission(targetPath: string): PermissionCheckResult {
		const normalized = path.resolve(targetPath);

		// Check if hidden
		if (this.isHidden(normalized)) {
			return {
				allowed: false,
				reason: 'Path is hidden from sandbox',
				writable: false,
			};
		}

		// Full access mode
		if (this.accessLevel === FilesystemAccessLevel.FullAccess) {
			return {
				allowed: true,
				reason: 'Full filesystem access granted',
				writable: true,
			};
		}

		// No filesystem access
		if (this.accessLevel === FilesystemAccessLevel.None) {
			return {
				allowed: false,
				reason: 'Filesystem access denied',
				writable: false,
			};
		}

		// Read-only mode - check writable roots
		const writableRoot = this.findWritableRoot(normalized);

		if (!writableRoot) {
			return {
				allowed: false,
				reason: 'Path is not in any writable root',
				writable: false,
			};
		}

		// Check if path is a protected subpath
		if (this.isProtectedSubpath(normalized, writableRoot)) {
			return {
				allowed: false,
				reason: 'Path is a protected subpath within writable root',
				writable: false,
			};
		}

		// Check read-only paths
		if (this.isInReadOnlyPath(normalized)) {
			return {
				allowed: false,
				reason: 'Path is explicitly marked as read-only',
				writable: false,
			};
		}

		return {
			allowed: true,
			reason: `Write access allowed within ${writableRoot.root}`,
			writable: true,
		};
	}

	/**
	 * Check if a path can be executed
	 */
	checkExecutePermission(targetPath: string): PermissionCheckResult {
		// Execution follows read permissions
		const readResult = this.checkReadPermission(targetPath);

		if (!readResult.allowed) {
			return readResult;
		}

		// Check if file is executable
		try {
			fs.accessSync(targetPath, fs.constants.X_OK);
			return {
				allowed: true,
				reason: 'File is executable',
				writable: readResult.writable,
			};
		} catch {
			return {
				allowed: false,
				reason: 'File is not executable',
				writable: false,
			};
		}
	}

	/**
	 * Check if a path can be deleted
	 */
	checkDeletePermission(targetPath: string): PermissionCheckResult {
		// Delete requires write permission to parent directory
		const parentDir = path.dirname(targetPath);
		const writeResult = this.checkWritePermission(parentDir);

		if (!writeResult.allowed) {
			return {
				allowed: false,
				reason: `Cannot delete: ${writeResult.reason}`,
				writable: false,
			};
		}

		// Also check the target itself
		const targetWrite = this.checkWritePermission(targetPath);

		if (!targetWrite.allowed) {
			return {
				allowed: false,
				reason: `Cannot delete target: ${targetWrite.reason}`,
				writable: false,
			};
		}

		return {
			allowed: true,
			reason: 'Delete permission granted',
			writable: true,
		};
	}

	/**
	 * Get all writable roots
	 */
	getWritableRoots(): WritableRoot[] {
		return Array.from(this.writableRoots.values());
	}

	/**
	 * Check if a path is within a writable root
	 */
	private findWritableRoot(targetPath: string): WritableRoot | null {
		// Normalize for comparison
		const normalizedTarget = targetPath.toLowerCase();

		// Find the longest matching root
		let bestMatch: WritableRoot | null = null;
		let bestLength = 0;

		for (const [normalizedKey, originalPath] of this.normalizedRoots) {
			if (
				normalizedTarget.startsWith(normalizedKey + path.sep) ||
				normalizedTarget === normalizedKey
			) {
				if (normalizedKey.length > bestLength) {
					bestLength = normalizedKey.length;
					bestMatch = this.writableRoots.get(originalPath) || null;
				}
			}
		}

		return bestMatch;
	}

	/**
	 * Check if a path is a protected subpath
	 */
	private isProtectedSubpath(
		targetPath: string,
		writableRoot: WritableRoot
	): boolean {
		if (!writableRoot.protectedSubpaths) {
			return false;
		}

		const normalizedTarget = targetPath.toLowerCase();
		const normalizedRoot = path.resolve(writableRoot.root).toLowerCase();

		for (const subpath of writableRoot.protectedSubpaths) {
			const protectedPath = path.join(normalizedRoot, subpath).toLowerCase();

			if (
				normalizedTarget.startsWith(protectedPath + path.sep) ||
				normalizedTarget === protectedPath
			) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check if a path is hidden
	 */
	private isHidden(targetPath: string): boolean {
		const normalized = targetPath.toLowerCase();

		for (const hiddenPath of this.hiddenPaths) {
			const normalizedHidden = hiddenPath.toLowerCase();

			if (
				normalized.startsWith(normalizedHidden + path.sep) ||
				normalized === normalizedHidden
			) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check if a path is in read-only paths
	 */
	private isInReadOnlyPath(targetPath: string): boolean {
		const normalized = targetPath.toLowerCase();

		for (const readOnlyPath of this.readOnlyPaths) {
			const normalizedRO = readOnlyPath.toLowerCase();

			if (
				normalized.startsWith(normalizedRO + path.sep) ||
				normalized === normalizedRO
			) {
				return true;
			}
		}

		return false;
	}
}

/**
 * Utility functions for path operations
 */
export class PathUtils {
	/**
	 * Resolve a path relative to the sandbox working directory
	 */
	static resolveSandboxPath(
		sandboxPath: string,
		workingDirectory: string
	): string {
		// Handle absolute paths
		if (path.isAbsolute(sandboxPath)) {
			return path.resolve(sandboxPath);
		}

		// Resolve relative to working directory
		return path.resolve(workingDirectory, sandboxPath);
	}

	/**
	 * Check if a path is within a directory
	 */
	static isWithinDirectory(filePath: string, directory: string): boolean {
		const normalizedFile = path.resolve(filePath).toLowerCase();
		const normalizedDir = path.resolve(directory).toLowerCase();

		return (
			normalizedFile.startsWith(normalizedDir + path.sep) ||
			normalizedFile === normalizedDir
		);
	}

	/**
	 * Get relative path from sandbox root
	 */
	static getRelativePath(filePath: string, root: string): string {
		return path.relative(root, filePath);
	}

	/**
	 * Normalize a path for consistent comparison
	 */
	static normalize(filePath: string): string {
		return path.resolve(filePath).toLowerCase();
	}

	/**
	 * Check if a path is a symlink
	 */
	static isSymlink(filePath: string): boolean {
		try {
			const stats = fs.lstatSync(filePath);
			return stats.isSymbolicLink();
		} catch {
			return false;
		}
	}

	/**
	 * Resolve symlink to its target
	 */
	static resolveSymlink(filePath: string): string | null {
		try {
			return fs.realpathSync(filePath);
		} catch {
			return null;
		}
	}

	/**
	 * Find all symlinks in a path chain
	 */
	static findSymlinksInPath(filePath: string): string[] {
		const symlinks: string[] = [];
		let current = filePath;

		while (true) {
			const parent = path.dirname(current);

			if (parent === current) {
				break;
			}

			if (this.isSymlink(parent)) {
				symlinks.push(parent);
			}

			current = parent;
		}

		return symlinks;
	}
}

/**
 * File operations that respect sandbox permissions
 */
export class SandboxedFileOperations {
	private isolation: FilesystemIsolation;

	constructor(isolation: FilesystemIsolation) {
		this.isolation = isolation;
	}

	/**
	 * Read a file if permitted
	 */
	readFile(filePath: string, encoding?: BufferEncoding): string | Buffer {
		const check = this.isolation.checkReadPermission(filePath);

		if (!check.allowed) {
			throw new Error(`Read denied: ${check.reason}`);
		}

		return fs.readFileSync(filePath, encoding);
	}

	/**
	 * Write a file if permitted
	 */
	writeFile(
		filePath: string,
		data: string | Buffer,
		encoding?: BufferEncoding
	): void {
		const check = this.isolation.checkWritePermission(filePath);

		if (!check.allowed) {
			throw new Error(`Write denied: ${check.reason}`);
		}

		// Ensure parent directory exists
		const parentDir = path.dirname(filePath);
		fs.mkdirSync(parentDir, { recursive: true });

		fs.writeFileSync(filePath, data, encoding);
	}

	/**
	 * Delete a file if permitted
	 */
	deleteFile(filePath: string): void {
		const check = this.isolation.checkDeletePermission(filePath);

		if (!check.allowed) {
			throw new Error(`Delete denied: ${check.reason}`);
		}

		fs.unlinkSync(filePath);
	}

	/**
	 * Create a directory if permitted
	 */
	mkdir(dirPath: string, recursive: boolean = true): void {
		const check = this.isolation.checkWritePermission(dirPath);

		if (!check.allowed) {
			throw new Error(`mkdir denied: ${check.reason}`);
		}

		fs.mkdirSync(dirPath, { recursive });
	}

	/**
	 * Remove a directory if permitted
	 */
	rmdir(dirPath: string, recursive: boolean = false): void {
		const check = this.isolation.checkDeletePermission(dirPath);

		if (!check.allowed) {
			throw new Error(`rmdir denied: ${check.reason}`);
		}

		if (recursive) {
			fs.rmSync(dirPath, { recursive: true });
		} else {
			fs.rmdirSync(dirPath);
		}
	}

	/**
	 * List directory contents if permitted
	 */
	readdir(dirPath: string): string[] {
		const check = this.isolation.checkReadPermission(dirPath);

		if (!check.allowed) {
			throw new Error(`readdir denied: ${check.reason}`);
		}

		return fs.readdirSync(dirPath);
	}

	/**
	 * Get file stats if permitted
	 */
	stat(filePath: string): fs.Stats {
		const check = this.isolation.checkReadPermission(filePath);

		if (!check.allowed) {
			throw new Error(`stat denied: ${check.reason}`);
		}

		return fs.statSync(filePath);
	}

	/**
	 * Check if a file exists and is accessible
	 */
	exists(filePath: string): boolean {
		const check = this.isolation.checkReadPermission(filePath);

		if (!check.allowed) {
			return false;
		}

		return fs.existsSync(filePath);
	}
}
