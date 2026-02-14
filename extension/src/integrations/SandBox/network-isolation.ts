/**
 * SandBox Module - Network Isolation
 *
 * Provides network access control for sandboxed processes.
 * Implements different network access levels from full access to complete isolation.
 *
 * @author Vlinder Team
 * @version 1.0.0
 */

import * as net from 'net';
import * as http from 'http';
import * as https from 'https';
import { NetworkAccessLevel } from './types';

/**
 * Network permission check result
 */
export interface NetworkPermissionResult {
	/** Whether the network access is allowed */
	allowed: boolean;

	/** Reason for the decision */
	reason: string;
}

/**
 * Host access rule
 */
export interface HostAccessRule {
	/** The host pattern (can include wildcards) */
	host: string;

	/** Allowed ports (empty means all ports) */
	ports?: number[];

	/** Whether this rule allows or denies access */
	allow: boolean;
}

/**
 * Options for network isolation
 */
export interface NetworkIsolationOptions {
	/** Network access level */
	accessLevel: NetworkAccessLevel;

	/** List of allowed hosts (for ProxyOnly mode) */
	allowedHosts?: string[];

	/** List of denied hosts */
	deniedHosts?: string[];

	/** Host access rules */
	hostRules?: HostAccessRule[];

	/** Proxy configuration */
	proxy?: {
		http?: string;
		https?: string;
	};

	/** Whether to allow localhost connections */
	allowLocalhost?: boolean;
}

/**
 * Manages network access control for the sandbox
 */
export class NetworkIsolation {
	private accessLevel: NetworkAccessLevel;
	private allowedHosts: Set<string>;
	private deniedHosts: Set<string>;
	private hostRules: HostAccessRule[];
	private proxy: { http?: string; https?: string };
	private allowLocalhost: boolean;

	constructor(options: NetworkIsolationOptions) {
		this.accessLevel = options.accessLevel;
		this.allowedHosts = new Set(options.allowedHosts || []);
		this.deniedHosts = new Set(options.deniedHosts || []);
		this.hostRules = options.hostRules || [];
		this.proxy = options.proxy || {};
		this.allowLocalhost = options.allowLocalhost ?? true;
	}

	/**
	 * Check if a network connection is allowed
	 */
	checkConnectionPermission(
		host: string,
		port: number
	): NetworkPermissionResult {
		// Full access mode
		if (this.accessLevel === NetworkAccessLevel.FullAccess) {
			return {
				allowed: true,
				reason: 'Full network access granted',
			};
		}

		// No network access
		if (this.accessLevel === NetworkAccessLevel.None) {
			return {
				allowed: false,
				reason: 'Network access is disabled',
			};
		}

		// Check localhost
		if (this.isLocalhost(host)) {
			if (this.allowLocalhost) {
				return {
					allowed: true,
					reason: 'Localhost connections allowed',
				};
			}
			return {
				allowed: false,
				reason: 'Localhost connections are not allowed',
			};
		}

		// Isolated mode - only allow localhost
		if (this.accessLevel === NetworkAccessLevel.Isolated) {
			return {
				allowed: false,
				reason: 'Network is isolated - only localhost allowed',
			};
		}

		// Proxy-only mode - check allowed hosts
		if (this.accessLevel === NetworkAccessLevel.ProxyOnly) {
			if (this.allowedHosts.size === 0) {
				return {
					allowed: false,
					reason: 'No hosts are allowed in proxy-only mode',
				};
			}

			if (!this.isHostAllowed(host)) {
				return {
					allowed: false,
					reason: `Host '${host}' is not in the allowed list`,
				};
			}
		}

		// Check denied hosts
		if (this.deniedHosts.has(host)) {
			return {
				allowed: false,
				reason: `Host '${host}' is explicitly denied`,
			};
		}

		// Check host rules
		const ruleResult = this.checkHostRules(host, port);
		if (ruleResult !== null) {
			return ruleResult;
		}

		return {
			allowed: true,
			reason: 'Network access allowed',
		};
	}

	/**
	 * Check if an HTTP request is allowed
	 */
	checkHttpRequest(url: string): NetworkPermissionResult {
		try {
			const parsed = new URL(url);
			const port =
				parsed.port ||
				(parsed.protocol === 'https:' ? 443 : 80);

			return this.checkConnectionPermission(parsed.hostname, parseInt(port));
		} catch {
			return {
				allowed: false,
				reason: 'Invalid URL',
			};
		}
	}

	/**
	 * Get proxy configuration for a URL
	 */
	getProxyForUrl(url: string): string | undefined {
		try {
			const parsed = new URL(url);
			const isHttps = parsed.protocol === 'https:';
			return isHttps ? this.proxy.https : this.proxy.http;
		} catch {
			return undefined;
		}
	}

	/**
	 * Check if a host is localhost
	 */
	private isLocalhost(host: string): boolean {
		const localhostPatterns = [
			'localhost',
			'127.0.0.1',
			'::1',
			'0.0.0.0',
			'::',
		];

		if (localhostPatterns.includes(host.toLowerCase())) {
			return true;
		}

		// Check for 127.x.x.x
		if (/^127\.\d+\.\d+\.\d+$/.test(host)) {
			return true;
		}

		// Check for local IPv6
		if (host.startsWith('::ffff:127.')) {
			return true;
		}

		return false;
	}

	/**
	 * Check if a host matches the allowed list
	 */
	private isHostAllowed(host: string): boolean {
		const normalizedHost = host.toLowerCase();

		// Exact match
		if (this.allowedHosts.has(normalizedHost)) {
			return true;
		}

		// Wildcard match
		for (const allowed of this.allowedHosts) {
			if (allowed.startsWith('*.')) {
				const domain = allowed.slice(2); // Remove '*.'
				if (
					normalizedHost === domain ||
					normalizedHost.endsWith('.' + domain)
				) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Check host access rules
	 */
	private checkHostRules(
		host: string,
		port: number
	): NetworkPermissionResult | null {
		for (const rule of this.hostRules) {
			if (this.hostMatchesRule(host, rule)) {
				// Check port restriction
				if (rule.ports && rule.ports.length > 0) {
					if (!rule.ports.includes(port)) {
						return {
							allowed: false,
							reason: `Port ${port} is not allowed for host ${host}`,
						};
					}
				}

				return {
					allowed: rule.allow,
					reason: rule.allow
						? `Access allowed by rule for ${rule.host}`
						: `Access denied by rule for ${rule.host}`,
				};
			}
		}

		return null;
	}

	/**
	 * Check if a host matches a rule pattern
	 */
	private hostMatchesRule(host: string, rule: HostAccessRule): boolean {
		const normalizedHost = host.toLowerCase();
		const pattern = rule.host.toLowerCase();

		if (pattern.startsWith('*.')) {
			const domain = pattern.slice(2);
			return (
				normalizedHost === domain ||
				normalizedHost.endsWith('.' + domain)
			);
		}

		if (pattern.endsWith('.*')) {
			const prefix = pattern.slice(0, -2);
			return normalizedHost.startsWith(prefix);
		}

		if (pattern.includes('*')) {
			// Simple wildcard matching
			const regex = new RegExp(
				'^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
			);
			return regex.test(normalizedHost);
		}

		return normalizedHost === pattern;
	}
}

/**
 * Network request interceptor for sandboxed environments
 */
export class NetworkInterceptor {
	private isolation: NetworkIsolation;
	private requestLog: Array<{
		timestamp: Date;
		url: string;
		allowed: boolean;
		reason: string;
	}> = [];

	constructor(isolation: NetworkIsolation) {
		this.isolation = isolation;
	}

	/**
	 * Intercept an HTTP request
	 */
	interceptHttpRequest(
		url: string,
		method: string = 'GET'
	): { allowed: boolean; proxy?: string; error?: string } {
		const check = this.isolation.checkHttpRequest(url);

		// Log the request
		this.requestLog.push({
			timestamp: new Date(),
			url,
			allowed: check.allowed,
			reason: check.reason,
		});

		if (!check.allowed) {
			return {
				allowed: false,
				error: check.reason,
			};
		}

		const proxy = this.isolation.getProxyForUrl(url);

		return {
			allowed: true,
			proxy,
		};
	}

	/**
	 * Get the request log
	 */
	getRequestLog(): Array<{
		timestamp: Date;
		url: string;
		allowed: boolean;
		reason: string;
	}> {
		return [...this.requestLog];
	}

	/**
	 * Clear the request log
	 */
	clearLog(): void {
		this.requestLog = [];
	}

	/**
	 * Get statistics about network access
	 */
	getStats(): {
		totalRequests: number;
		allowedRequests: number;
		deniedRequests: number;
	} {
		const total = this.requestLog.length;
		const allowed = this.requestLog.filter((r) => r.allowed).length;

		return {
			totalRequests: total,
			allowedRequests: allowed,
			deniedRequests: total - allowed,
		};
	}
}

/**
 * Create a sandboxed HTTP agent
 */
export function createSandboxedHttpAgent(
	isolation: NetworkIsolation,
	options?: http.AgentOptions
): http.Agent {
	return new http.Agent({
		...options,
		createConnection: (
			options: net.NetConnectOpts,
			callback: (err: Error | null, socket?: net.Socket) => void
		) => {
			const host =
				typeof options.host === 'string' ? options.host : '';
			const port = options.port || 80;

			const check = isolation.checkConnectionPermission(host, port);

			if (!check.allowed) {
				callback(new Error(`Network access denied: ${check.reason}`));
				return;
			}

			// Create normal connection
			const socket = net.connect(options, () => {
				callback(null, socket);
			});

			socket.on('error', (err) => {
				callback(err);
			});
		},
	});
}

/**
 * Create a sandboxed HTTPS agent
 */
export function createSandboxedHttpsAgent(
	isolation: NetworkIsolation,
	options?: https.AgentOptions
): https.Agent {
	return new https.Agent({
		...options,
		createConnection: (
			options: net.NetConnectOpts,
			callback: (err: Error | null, socket?: net.Socket) => void
		) => {
			const host =
				typeof options.host === 'string' ? options.host : '';
			const port = options.port || 443;

			const check = isolation.checkConnectionPermission(host, port);

			if (!check.allowed) {
				callback(new Error(`Network access denied: ${check.reason}`));
				return;
			}

			// Create normal connection
			const socket = net.connect(options, () => {
				callback(null, socket);
			});

			socket.on('error', (err) => {
				callback(err);
			});
		},
	});
}

/**
 * Utility to check network connectivity
 */
export class NetworkConnectivityChecker {
	/**
	 * Check if a host is reachable
	 */
	static async checkConnectivity(
		host: string,
		port: number,
		timeoutMs: number = 5000
	): Promise<boolean> {
		return new Promise((resolve) => {
			const socket = new net.Socket();
			const timeout = setTimeout(() => {
				socket.destroy();
				resolve(false);
			}, timeoutMs);

			socket.connect(port, host, () => {
				clearTimeout(timeout);
				socket.destroy();
				resolve(true);
			});

			socket.on('error', () => {
				clearTimeout(timeout);
				resolve(false);
			});
		});
	}

	/**
	 * Check if DNS resolution works
	 */
	static async checkDns(hostname: string): Promise<boolean> {
		return new Promise((resolve) => {
			require('dns').lookup(hostname, (err: Error | null) => {
				resolve(err === null);
			});
		});
	}

	/**
	 * Check if internet connectivity is available
	 */
	static async checkInternetConnectivity(): Promise<boolean> {
		const testHosts = [
			{ host: 'google.com', port: 80 },
			{ host: 'cloudflare.com', port: 80 },
			{ host: 'github.com', port: 443 },
		];

		for (const target of testHosts) {
			const reachable = await this.checkConnectivity(
				target.host,
				target.port,
				3000
			);
			if (reachable) {
				return true;
			}
		}

		return false;
	}
}
