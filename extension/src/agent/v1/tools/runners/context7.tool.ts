import { BaseAgentTool } from '../base-agent.tool';
import { Context7ToolParams } from '../schema/context7';
import { ToolResponseV2 } from '../types';

/**
 * Library to GitHub Repository Mapping
 */
interface LibraryMapping {
	/** GitHub repository path (e.g., "facebook/react") */
	repo: string;
	/** Default branch name (e.g., "main", "master", "canary") */
	branch: string;
	/** Whether the repository has an llms.txt file */
	hasLlmsTxt: boolean;
	/** Alternative documentation path if llms.txt doesn't exist */
	docsPath?: string;
	/** Alternative branches to try */
	altBranches?: string[];
}

/**
 * Mapping of library names to GitHub repositories
 *
 * To add a new library:
 * 1. Find the GitHub repository
 * 2. Check if it has an llms.txt file
 * 3. Determine the default branch
 * 4. Add entry to this map
 */
const LIBRARY_REPOS: Record<string, LibraryMapping> = {
	// ==================== Frontend Frameworks ====================
	'react': { repo: 'facebook/react', branch: 'main', hasLlmsTxt: true, altBranches: ['master'] },
	'vue': { repo: 'vuejs/core', branch: 'main', hasLlmsTxt: true, altBranches: ['master'] },
	'angular': { repo: 'angular/angular', branch: 'main', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master'] },
	'svelte': { repo: 'sveltejs/svelte', branch: 'main', hasLlmsTxt: true, altBranches: ['master'] },

	// ==================== Meta Frameworks ====================
	'next.js': { repo: 'vercel/next.js', branch: 'canary', hasLlmsTxt: true, altBranches: ['main', 'master'] },
	'nuxt': { repo: 'nuxt/nuxt', branch: 'main', hasLlmsTxt: true, altBranches: ['master'] },
	'gatsby': { repo: 'gatsbyjs/gatsby', branch: 'master', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['main'] },
	'remix': { repo: 'remix-run/remix', branch: 'main', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master'] },

	// ==================== State Management ====================
	'redux': { repo: 'reduxjs/redux', branch: 'master', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['main'] },
	'mobx': { repo: 'mobxjs/mobx', branch: 'main', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master'] },
	'zustand': { repo: 'pmndrs/zustand', branch: 'main', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master'] },

	// ==================== Backend Frameworks ====================
	'express': { repo: 'expressjs/express', branch: 'master', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['main'] },
	'fastify': { repo: 'fastify/fastify', branch: 'main', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master'] },
	'koa': { repo: 'koajs/koa', branch: 'master', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['main'] },
	'nest.js': { repo: 'nestjs/nest', branch: 'master', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['main'] },
	'hapi': { repo: 'hapijs/hapi', branch: 'master', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['main'] },

	// ==================== Databases ====================
	'mongodb': { repo: 'mongodb/docs', branch: 'master', hasLlmsTxt: true, altBranches: ['main'] },
	'postgresql': { repo: 'postgres/postgres', branch: 'master', hasLlmsTxt: false, docsPath: 'README', altBranches: ['main'] },
	'mysql': { repo: 'mysql/mysql-server', branch: 'trunk', hasLlmsTxt: false, docsPath: 'README', altBranches: ['master', 'main'] },
	'redis': { repo: 'redis/redis', branch: 'unstable', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master', 'main'] },
	'elasticsearch': { repo: 'elastic/elasticsearch', branch: 'main', hasLlmsTxt: false, docsPath: 'README.asciidoc', altBranches: ['master'] },

	// ==================== ORMs & Database Tools ====================
	'prisma': { repo: 'prisma/prisma', branch: 'main', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master'] },
	'typeorm': { repo: 'typeorm/typeorm', branch: 'master', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['main'] },
	'sequelize': { repo: 'sequelize/sequelize', branch: 'main', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master'] },

	// ==================== Build Tools ====================
	'webpack': { repo: 'webpack/webpack', branch: 'main', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master'] },
	'vite': { repo: 'vitejs/vite', branch: 'main', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master'] },
	'rollup': { repo: 'rollup/rollup', branch: 'master', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['main'] },
	'parcel': { repo: 'parcel-bundler/parcel', branch: 'v2', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master', 'main'] },
	'esbuild': { repo: 'evanw/esbuild', branch: 'main', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master'] },

	// ==================== Languages & Compilers ====================
	'typescript': { repo: 'microsoft/TypeScript', branch: 'main', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master'] },
	'babel': { repo: 'babel/babel', branch: 'main', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master'] },
	'rust': { repo: 'rust-lang/rust', branch: 'master', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['main'] },
	'go': { repo: 'golang/go', branch: 'master', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['main'] },
	'python': { repo: 'python/cpython', branch: 'main', hasLlmsTxt: false, docsPath: 'README.rst', altBranches: ['master'] },
	'java': { repo: 'openjdk/jdk', branch: 'master', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['main'] },
	'kotlin': { repo: 'JetBrains/kotlin', branch: 'master', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['main'] },
	'swift': { repo: 'apple/swift', branch: 'main', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master'] },
	'ruby': { repo: 'ruby/ruby', branch: 'master', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['main'] },
	'php': { repo: 'php/php-src', branch: 'master', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['main'] },
	'c++': { repo: 'isocpp/CppCoreGuidelines', branch: 'master', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['main'] },
	'c#': { repo: 'dotnet/csharplang', branch: 'main', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master'] },

	// ==================== Testing ====================
	'jest': { repo: 'jestjs/jest', branch: 'main', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master'] },
	'vitest': { repo: 'vitest-dev/vitest', branch: 'main', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master'] },
	'cypress': { repo: 'cypress-io/cypress', branch: 'develop', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master', 'main'] },
	'playwright': { repo: 'microsoft/playwright', branch: 'main', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master'] },

	// ==================== Linting & Formatting ====================
	'eslint': { repo: 'eslint/eslint', branch: 'main', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master'] },
	'prettier': { repo: 'prettier/prettier', branch: 'main', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master'] },

	// ==================== Cloud & Services ====================
	'aws-sdk': { repo: 'aws/aws-sdk-js-v3', branch: 'main', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['master'] },
	'supabase': { repo: 'supabase/supabase', branch: 'master', hasLlmsTxt: true, altBranches: ['main'] },
	'firebase': { repo: 'firebase/firebase-js-sdk', branch: 'master', hasLlmsTxt: false, docsPath: 'README.md', altBranches: ['main'] },
};

/**
 * Tool for fetching library documentation from GitHub repositories
 *
 * This is a self-hosted alternative to the Context7 API.
 * It fetches llms.txt files and documentation directly from GitHub.
 *
 * Features:
 * 1. Fetches llms.txt files from GitHub repositories
 * 2. Falls back to README.md if llms.txt doesn't exist
 * 3. Supports topic filtering
 * 4. Supports token limiting
 * 5. No API key required - completely free
 * 6. Auto-discovery of library repositories
 */
export class Context7Tool extends BaseAgentTool<Context7ToolParams> {
	private readonly GITHUB_RAW_URL = 'https://raw.githubusercontent.com';
	private readonly TIMEOUT_MS = 30000; // 30 seconds
	private readonly MAX_RETRIES = 2;
	private readonly RETRY_DELAY_MS = 1000;

	// Cache for auto-discovered library mappings
	private static discoveredMappings: Map<string, LibraryMapping> = new Map();

	async execute(): Promise<ToolResponseV2> {
		const { libraryName, topic, tokens } = this.params.input;

		this.logger(
			`Fetching documentation for "${libraryName}"${topic ? ` (topic: ${topic})` : ''} with max ${tokens || 5000} tokens`
		);

		try {
			// Resolve library to mapping
			const mapping = await this.resolveLibrary(libraryName);

			// Build list of URLs to try
			const urls = this.buildSourceUrls(mapping);

			// Try each URL until one succeeds
			let content: string | null = null;
			let source: string | undefined;

			for (const url of urls) {
				content = await this.fetchUrl(url);
				if (content) {
					source = url;
					break;
				}
			}

			if (!content) {
				return this.toolResponse(
					'error',
					`Documentation not found for ${libraryName}. Tried ${urls.length} sources.`
				);
			}

			// Filter by topic if specified
			const filtered = topic ? this.filterByTopic(content, topic) : content;

			// Truncate by tokens if specified
			const truncated = this.truncateByTokens(filtered, tokens || 5000);

			// Determine library ID for output
			const libraryId = libraryName.startsWith('/')
				? libraryName
				: `/${libraryName}`;

			// Format and return the documentation
			const formattedOutput = this.formatDocumentation(
				libraryName,
				libraryId,
				topic,
				truncated,
				source
			);

			this.logger(`Successfully fetched documentation from ${source}`);
			return this.toolResponse('success', formattedOutput);
		} catch (error) {
			this.logger(
				`Unexpected error fetching documentation: ${error instanceof Error ? error.message : String(error)}`,
				'error'
			);
			return this.toolResponse(
				'error',
				`Unexpected error: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Resolve library name to mapping information
	 *
	 * Three-tier strategy optimized for AI Agent:
	 * 1. Direct lookup in LIBRARY_REPOS (fast path for known libraries)
	 * 2. Context7 ID format (/org/project) for explicit paths
	 * 3. Auto-discovery by trying common patterns (for unknown libraries)
	 */
	private async resolveLibrary(libraryName: string): Promise<LibraryMapping> {
		// Normalize library name
		const normalized = this.normalizeLibraryName(libraryName);

		// Tier 1: Direct lookup in predefined mappings (fastest)
		const mapping = LIBRARY_REPOS[normalized];
		if (mapping) {
			this.logger(`Found in mappings: ${libraryName} -> ${mapping.repo}`);
			return mapping;
		}

		// Tier 2: Context7 ID format (/org/project or /org/project/version)
		if (libraryName.startsWith('/')) {
			this.logger(`Using Context7 ID: ${libraryName}`);
			return this.parseLibraryId(libraryName);
		}

		// Tier 3: Auto-discovery for unknown libraries
		this.logger(`Attempting auto-discovery for: ${libraryName}`);
		const discovered = await this.autoDiscoverLibrary(normalized);
		if (discovered) {
			this.logger(`Auto-discovered: ${libraryName} -> ${discovered.repo}`);
			return discovered;
		}

		// Failed to resolve - provide helpful suggestions
		const suggestions = this.getSuggestions(normalized);
		const suggestionText = suggestions.length > 0
			? `\n\nDid you mean one of these?\n${suggestions.map(s => `  - ${s}`).join('\n')}`
			: '';

		throw new Error(
			`Cannot find library: ${libraryName}. ` +
			`Try using Context7 ID format: /org/project (e.g., /rust-lang/rust)${suggestionText}`
		);
	}

	/**
	 * Get suggestions for similar library names
	 */
	private getSuggestions(libraryName: string): string[] {
		const allLibraries = Object.keys(LIBRARY_REPOS);
		const suggestions: string[] = [];

		// Find libraries that start with the same letter
		const sameStart = allLibraries.filter(lib =>
			lib.startsWith(libraryName[0])
		).slice(0, 3);

		// Find libraries that contain the search term
		const contains = allLibraries.filter(lib =>
			lib.includes(libraryName) || libraryName.includes(lib)
		).slice(0, 3);

		// Combine and deduplicate
		const combined = [...new Set([...contains, ...sameStart])];
		return combined.slice(0, 5);
	}

	/**
	 * Normalize library name for lookup
	 * Handles common variations that Agent might use
	 */
	private normalizeLibraryName(name: string): string {
		let normalized = name.toLowerCase().trim();

		// Remove common prefixes
		normalized = normalized.replace(/^@[\w-]+\//, ''); // @vue/core -> core
		normalized = normalized.replace(/^npm:/, ''); // npm:react -> react

		// Remove file extensions
		normalized = normalized.replace(/\.js$/, ''); // react.js -> react
		normalized = normalized.replace(/\.ts$/, ''); // react.ts -> react

		// Handle common aliases
		const aliases: Record<string, string> = {
			'reactjs': 'react',
			'vuejs': 'vue',
			'nextjs': 'next.js',
			'nestjs': 'nest.js',
			'node-postgres': 'postgresql',
			'pg': 'postgresql',
		};

		return aliases[normalized] || normalized;
	}

	/**
	 * Auto-discover library by trying multiple strategies in parallel
	 * This allows Agent to find libraries not in LIBRARY_REPOS
	 *
	 * Strategy:
	 * 1. Try package registry APIs (npm, crates.io, etc.) - FAST
	 * 2. Try GitHub search API - MEDIUM
	 * 3. Try common patterns in parallel - SLOW
	 */
	private async autoDiscoverLibrary(libraryName: string): Promise<LibraryMapping | null> {
		// Check cache first
		const cached = Context7Tool.discoveredMappings.get(libraryName);
		if (cached) {
			this.logger(`Using cached discovery: ${libraryName}`);
			return cached;
		}

		this.logger(`Auto-discovering: ${libraryName}`);

		// Strategy 1: Try package registries (fastest, most accurate)
		const registryResult = await this.discoverFromPackageRegistry(libraryName);
		if (registryResult) {
			Context7Tool.discoveredMappings.set(libraryName, registryResult);
			return registryResult;
		}

		// Strategy 2: Try GitHub search API (fast, accurate)
		const githubResult = await this.discoverFromGitHubSearch(libraryName);
		if (githubResult) {
			Context7Tool.discoveredMappings.set(libraryName, githubResult);
			return githubResult;
		}

		// Strategy 3: Try common patterns in parallel (slow, less accurate)
		const patternResult = await this.discoverFromPatterns(libraryName);
		if (patternResult) {
			Context7Tool.discoveredMappings.set(libraryName, patternResult);
			return patternResult;
		}

		return null;
	}

	/**
	 * Discover library from package registries (npm, crates.io, etc.)
	 * This is the fastest and most accurate method
	 */
	private async discoverFromPackageRegistry(libraryName: string): Promise<LibraryMapping | null> {
		try {
			// Try npm registry first (most common)
			const npmUrl = `https://registry.npmjs.org/${libraryName}`;
			const response = await this.fetchUrl(npmUrl, { timeout: 3000 });

			if (response) {
				const data = JSON.parse(response);
				const repoUrl = data.repository?.url || data.homepage;

				if (repoUrl) {
					const repo = this.extractGitHubRepo(repoUrl);
					if (repo) {
						this.logger(`Found via npm: ${libraryName} -> ${repo}`);
						return await this.verifyAndCreateMapping(repo);
					}
				}
			}
		} catch (error) {
			// Try crates.io for Rust packages
			if (libraryName === 'rust' || libraryName.includes('rust')) {
				try {
					const cratesUrl = `https://crates.io/api/v1/crates/${libraryName}`;
					const response = await this.fetchUrl(cratesUrl, { timeout: 3000 });

					if (response) {
						const data = JSON.parse(response);
						const repoUrl = data.crate?.repository;

						if (repoUrl) {
							const repo = this.extractGitHubRepo(repoUrl);
							if (repo) {
								this.logger(`Found via crates.io: ${libraryName} -> ${repo}`);
								return await this.verifyAndCreateMapping(repo);
							}
						}
					}
				} catch (cratesError) {
					// Continue to next strategy
				}
			}
		}

		return null;
	}

	/**
	 * Discover library using GitHub search API
	 * Fast and accurate for popular libraries
	 */
	private async discoverFromGitHubSearch(libraryName: string): Promise<LibraryMapping | null> {
		try {
			const searchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(libraryName)}&sort=stars&order=desc&per_page=5`;
			const response = await this.fetchUrl(searchUrl, {
				timeout: 5000,
				headers: {
					'Accept': 'application/vnd.github.v3+json',
					'User-Agent': 'Vlinder-Context7-Tool',
				}
			});

			if (response) {
				const data = JSON.parse(response);
				const items = data.items || [];

				// Find best match (exact name match or highest stars)
				for (const item of items) {
					const repoName = item.name.toLowerCase();
					const fullName = item.full_name;

					// Exact match or very close match
					if (repoName === libraryName ||
						repoName === `${libraryName}.js` ||
						repoName === `${libraryName}-js` ||
						fullName.toLowerCase().includes(libraryName)) {

						this.logger(`Found via GitHub search: ${libraryName} -> ${fullName}`);
						return await this.verifyAndCreateMapping(fullName, item.default_branch);
					}
				}
			}
		} catch (error) {
			this.logger(`GitHub search failed: ${error}`);
		}

		return null;
	}

	/**
	 * Discover library by trying common patterns in parallel
	 * This is the slowest method but covers edge cases
	 */
	private async discoverFromPatterns(libraryName: string): Promise<LibraryMapping | null> {
		const possibleRepos = this.generatePossibleRepos(libraryName);
		const possibleBranches = ['main', 'master'];

		// Try all combinations in parallel (much faster!)
		const promises: Promise<LibraryMapping | null>[] = [];

		for (const repo of possibleRepos.slice(0, 5)) { // Limit to top 5 to avoid too many requests
			for (const branch of possibleBranches) {
				promises.push(this.tryRepoAndBranch(repo, branch));
			}
		}

		// Wait for first successful result
		const results = await Promise.allSettled(promises);
		for (const result of results) {
			if (result.status === 'fulfilled' && result.value) {
				return result.value;
			}
		}

		return null;
	}

	/**
	 * Try a specific repo and branch combination
	 */
	private async tryRepoAndBranch(repo: string, branch: string): Promise<LibraryMapping | null> {
		// Try llms.txt first
		const llmsTxtUrl = `${this.GITHUB_RAW_URL}/${repo}/${branch}/llms.txt`;
		const hasLlmsTxt = await this.checkUrlExists(llmsTxtUrl);

		if (hasLlmsTxt) {
			return {
				repo,
				branch,
				hasLlmsTxt: true,
				altBranches: ['main', 'master'].filter(b => b !== branch),
			};
		}

		// Try README.md as fallback
		const readmeUrl = `${this.GITHUB_RAW_URL}/${repo}/${branch}/README.md`;
		const hasReadme = await this.checkUrlExists(readmeUrl);

		if (hasReadme) {
			return {
				repo,
				branch,
				hasLlmsTxt: false,
				docsPath: 'README.md',
				altBranches: ['main', 'master'].filter(b => b !== branch),
			};
		}

		return null;
	}

	/**
	 * Extract GitHub repo from various URL formats
	 */
	private extractGitHubRepo(url: string): string | null {
		if (!url) return null;

		// Remove git+, git://, https://, etc.
		let cleaned = url.replace(/^(git\+)?(https?|git):\/\//, '');
		cleaned = cleaned.replace(/\.git$/, '');
		cleaned = cleaned.replace(/^github\.com\//, '');

		// Extract org/repo pattern
		const match = cleaned.match(/^([^\/]+\/[^\/]+)/);
		return match ? match[1] : null;
	}

	/**
	 * Verify repo exists and create mapping
	 */
	private async verifyAndCreateMapping(repo: string, defaultBranch: string = 'main'): Promise<LibraryMapping | null> {
		const branches = [defaultBranch, 'main', 'master'].filter((v, i, a) => a.indexOf(v) === i);

		for (const branch of branches) {
			const llmsTxtUrl = `${this.GITHUB_RAW_URL}/${repo}/${branch}/llms.txt`;
			const hasLlmsTxt = await this.checkUrlExists(llmsTxtUrl);

			if (hasLlmsTxt) {
				return {
					repo,
					branch,
					hasLlmsTxt: true,
					altBranches: branches.filter(b => b !== branch),
				};
			}

			const readmeUrl = `${this.GITHUB_RAW_URL}/${repo}/${branch}/README.md`;
			const hasReadme = await this.checkUrlExists(readmeUrl);

			if (hasReadme) {
				return {
					repo,
					branch,
					hasLlmsTxt: false,
					docsPath: 'README.md',
					altBranches: branches.filter(b => b !== branch),
				};
			}
		}

		return null;
	}

	/**
	 * Generate possible GitHub repository paths for a library name
	 * Uses common patterns observed in popular libraries
	 */
	private generatePossibleRepos(libraryName: string): string[] {
		const repos: string[] = [];
		const baseLibName = libraryName.replace(/\.js$/, '').replace(/-js$/, '').replace(/_/g, '-');

		// Pattern 1: Known org patterns (highest priority)
		const orgPatterns: Record<string, string[]> = {
			'react': ['facebook', 'reactjs'],
			'vue': ['vuejs'],
			'angular': ['angular'],
			'svelte': ['sveltejs'],
			'next': ['vercel'],
			'nuxt': ['nuxt'],
			'express': ['expressjs'],
			'fastify': ['fastify'],
			'nest': ['nestjs'],
			'prisma': ['prisma'],
			'supabase': ['supabase'],
			'firebase': ['firebase'],
			'rust': ['rust-lang'],
			'go': ['golang'],
			'python': ['python'],
			'java': ['openjdk'],
			'kotlin': ['JetBrains'],
			'swift': ['apple'],
			'ruby': ['ruby'],
			'php': ['php'],
		};

		const orgs = orgPatterns[baseLibName] || [];
		for (const org of orgs) {
			repos.push(`${org}/${libraryName}`);
			repos.push(`${org}/${baseLibName}`);
			if (!libraryName.includes('js')) {
				repos.push(`${org}/${libraryName}.js`);
			}
		}

		// Pattern 2: org/library (most common)
		const commonOrgs = [
			libraryName, // react/react
			`${libraryName}js`, // reactjs/react
			`${libraryName}-lang`, // rust-lang/rust
			baseLibName, // next/next.js
		];

		for (const org of commonOrgs) {
			repos.push(`${org}/${libraryName}`);
			repos.push(`${org}/${baseLibName}`);
		}

		// Pattern 3: Language-specific patterns
		if (libraryName.includes('rust') || libraryName.endsWith('-rs')) {
			repos.push(`rust-lang/${libraryName}`);
			repos.push(`${libraryName.replace('-rs', '')}/${libraryName}`);
		}

		if (libraryName.startsWith('go-') || libraryName.endsWith('-go')) {
			repos.push(`golang/${libraryName}`);
			repos.push(`${libraryName.replace(/^go-|-go$/, '')}/${libraryName}`);
		}

		if (libraryName.startsWith('py-') || libraryName.endsWith('-py')) {
			repos.push(`python/${libraryName}`);
			repos.push(`${libraryName.replace(/^py-|-py$/, '')}/${libraryName}`);
		}

		return [...new Set(repos)]; // Remove duplicates
	}

	/**
	 * Check if a URL exists (HEAD request)
	 * Optimized with shorter timeout for faster discovery
	 */
	private async checkUrlExists(url: string): Promise<boolean> {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout (faster)

			const response = await fetch(url, {
				method: 'HEAD',
				signal: controller.signal,
				headers: {
					'User-Agent': 'Mozilla/5.0 (compatible; VlinderBot/1.0)',
					'Cache-Control': 'no-cache',
				},
			});

			clearTimeout(timeoutId);
			return response.ok;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Parse Context7-style library ID
	 * Format: /org/project or /org/project/version
	 */
	private parseLibraryId(libraryId: string): LibraryMapping {
		const parts = libraryId.split('/').filter((p) => p);

		if (parts.length < 2) {
			throw new Error(`Invalid library ID: ${libraryId}. Expected format: /org/project or /org/project/version`);
		}

		const [org, project, version] = parts;

		return {
			repo: `${org}/${project}`,
			branch: version || 'main',
			hasLlmsTxt: true, // Assume true for direct IDs
			altBranches: ['main', 'master', 'canary'],
		};
	}

	/**
	 * Build list of URLs to try for documentation
	 */
	private buildSourceUrls(mapping: LibraryMapping): string[] {
		const { repo, branch, hasLlmsTxt, docsPath, altBranches = [] } = mapping;
		const urls: string[] = [];

		// Priority 1: llms.txt on default branch
		if (hasLlmsTxt) {
			urls.push(`${this.GITHUB_RAW_URL}/${repo}/${branch}/llms.txt`);
		}

		// Priority 2: llms.txt on alternative branches
		for (const altBranch of altBranches) {
			if (altBranch !== branch) {
				urls.push(`${this.GITHUB_RAW_URL}/${repo}/${altBranch}/llms.txt`);
			}
		}

		// Priority 3: Specified docs path
		if (docsPath) {
			urls.push(`${this.GITHUB_RAW_URL}/${repo}/${branch}/${docsPath}`);
			for (const altBranch of altBranches) {
				if (altBranch !== branch) {
					urls.push(`${this.GITHUB_RAW_URL}/${repo}/${altBranch}/${docsPath}`);
				}
			}
		}

		// Priority 4: README.md fallback
		if (!docsPath || !docsPath.includes('README')) {
			urls.push(`${this.GITHUB_RAW_URL}/${repo}/${branch}/README.md`);
			for (const altBranch of altBranches) {
				if (altBranch !== branch) {
					urls.push(`${this.GITHUB_RAW_URL}/${repo}/${altBranch}/README.md`);
				}
			}
		}

		return urls;
	}

	/**
	 * Fetch content from URL with retry logic
	 */
	private async fetchUrl(
		url: string,
		options?: {
			timeout?: number;
			headers?: Record<string, string>;
			attempt?: number;
		}
	): Promise<string | null> {
		const attempt = options?.attempt || 0;
		const timeout = options?.timeout || this.TIMEOUT_MS;
		const customHeaders = options?.headers || {};

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		try {
			const response = await fetch(url, {
				signal: controller.signal,
				headers: {
					'User-Agent': 'Mozilla/5.0 (compatible; VlinderBot/1.0)',
					Accept: 'text/plain, text/markdown, application/json, */*',
					...customHeaders,
				},
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				return null;
			}

			return await response.text();
		} catch (error) {
			clearTimeout(timeoutId);

			// Retry on network errors
			if (attempt < this.MAX_RETRIES) {
				const isRetryable =
					error instanceof Error &&
					(error.name === 'AbortError' ||
						error.message.includes('ETIMEDOUT') ||
						error.message.includes('ECONNRESET') ||
						error.message.includes('fetch failed'));

				if (isRetryable) {
					await this.sleep(this.RETRY_DELAY_MS * (attempt + 1));
					return this.fetchUrl(url, { ...options, attempt: attempt + 1 });
				}
			}

			return null;
		}
	}

	/**
	 * Filter content by topic
	 * Extracts sections that contain the topic keyword
	 */
	private filterByTopic(content: string, topic: string): string {
		const topicLower = topic.toLowerCase();
		const lines = content.split('\n');
		const filtered: string[] = [];
		let inRelevantSection = false;
		let sectionLevel = 0;
		let currentSection: string[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Detect heading
			const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
			if (headingMatch) {
				const level = headingMatch[1].length;
				const title = headingMatch[2].toLowerCase();

				// Check if heading contains topic keyword
				if (title.includes(topicLower)) {
					// Save previous section if any
					if (currentSection.length > 0) {
						filtered.push(...currentSection);
						currentSection = [];
					}

					inRelevantSection = true;
					sectionLevel = level;
					currentSection.push(line);
				} else if (inRelevantSection && level <= sectionLevel) {
					// End of current section
					filtered.push(...currentSection);
					currentSection = [];
					inRelevantSection = false;
				} else if (inRelevantSection) {
					currentSection.push(line);
				}
			} else if (inRelevantSection) {
				currentSection.push(line);
			} else if (line.toLowerCase().includes(topicLower)) {
				// Line contains topic keyword even outside headings
				currentSection.push(line);
			}
		}

		// Add remaining section
		if (currentSection.length > 0) {
			filtered.push(...currentSection);
		}

		// If no relevant content found, return original
		return filtered.length > 0 ? filtered.join('\n') : content;
	}

	/**
	 * Truncate content by approximate token count
	 * Estimation: 1 token ≈ 4 characters
	 */
	private truncateByTokens(content: string, maxTokens: number): string {
		const maxChars = maxTokens * 4;

		if (content.length <= maxChars) {
			return content;
		}

		// Try to truncate at paragraph boundary
		const truncated = content.substring(0, maxChars);
		const lastParagraph = truncated.lastIndexOf('\n\n');

		if (lastParagraph > maxChars * 0.8) {
			// If we can find a paragraph break in the last 20%, use it
			return truncated.substring(0, lastParagraph) + '\n\n[... content truncated ...]';
		}

		// Otherwise truncate at last newline
		const lastNewline = truncated.lastIndexOf('\n');
		if (lastNewline > 0) {
			return truncated.substring(0, lastNewline) + '\n[... content truncated ...]';
		}

		return truncated + '\n[... content truncated ...]';
	}

	/**
	 * Sleep for specified milliseconds
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Format documentation output as XML
	 */
	private formatDocumentation(
		libraryName: string,
		libraryId: string,
		topic: string | undefined,
		documentation: string,
		source?: string
	): string {
		const parts: string[] = [];
		parts.push('<context7_documentation>');
		parts.push(`  <library_name>${this.escapeXml(libraryName)}</library_name>`);
		parts.push(`  <library_id>${this.escapeXml(libraryId)}</library_id>`);

		if (topic) {
			parts.push(`  <topic>${this.escapeXml(topic)}</topic>`);
		}

		if (source) {
			parts.push(`  <source>${this.escapeXml(source)}</source>`);
		}

		parts.push('  <documentation>');
		parts.push(this.escapeXml(documentation));
		parts.push('  </documentation>');
		parts.push('</context7_documentation>');

		return parts.join('\n');
	}

	/**
	 * Escape XML special characters
	 */
	private escapeXml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;');
	}
}

