import { z } from 'zod';

/**
 * Pattern Search Tool
 *
 * Search for text patterns across multiple files with advanced options.
 * Supports case-sensitive search, configurable context lines, and file filtering.
 * This tool is ideal for finding specific code patterns, text occurrences, or analyzing code structure.
 *
 * @schema
 * {
 *   searchPattern: string;        // The text pattern to search for
 *   files: string[];              // Array of file paths to search in (supports glob patterns)
 *   caseSensitive?: boolean;      // Whether search is case-sensitive (default: false)
 *   contextLinesBefore?: number;  // Number of context lines before match (default: 5, max: 20)
 *   contextLinesAfter?: number;   // Number of context lines after match (default: 5, max: 20)
 * }
 *
 * @capabilities
 * - Search across multiple files simultaneously
 * - Support for glob patterns (e.g., "src/**\/*.ts")
 * - Case-sensitive and case-insensitive search
 * - Configurable context lines for better understanding
 * - Performance limits: max 100 files, 5MB file size limit
 *
 * @use_cases
 * - Find all occurrences of a function or variable
 * - Search for TODO/FIXME comments
 * - Locate import statements
 * - Find specific code patterns
 * - Analyze code structure
 */

const patternSearchSchema = z.object({
	searchPattern: z
		.string()
		.min(1)
		.describe('The text pattern to search for in the specified files'),
	files: z.preprocess((val) => {
		// If it's already an array, return it
		if (Array.isArray(val)) {
			console.log('[PatternSearch] files is already an array with', val.length, 'items');
			return val;
		}

		// If it's a string, try to parse it as JSON
		if (typeof val === 'string') {
			const trimmed = val.trim();

			// Try JSON format (recommended format: ["file1.ts", "file2.ts"])
			if (trimmed.startsWith('[')) {
				console.log('[PatternSearch] Detected JSON format, parsing...');
				try {
					const parsed = JSON.parse(trimmed);
					if (Array.isArray(parsed)) {
						console.log('[PatternSearch] ✅ Successfully parsed JSON with', parsed.length, 'files');
						return parsed;
					} else {
						console.error('[PatternSearch] ❌ JSON parsed but not an array');
						return [];
					}
				} catch (error) {
					console.error('[PatternSearch] ❌ JSON parsing failed:', error instanceof Error ? error.message : String(error));
					console.error('[PatternSearch] Received string:', trimmed.substring(0, 200));
					return [];
				}
			}

			console.error('[PatternSearch] ❌ String does not start with [, cannot parse');
			console.error('[PatternSearch] Received string:', trimmed.substring(0, 200));
			return [];
		}

		console.error('[PatternSearch] ❌ files is neither array nor string, type:', typeof val);
		return [];
	}, z
		.array(z.string())
		.min(1)
		.describe(
			'Array of file paths (relative to workspace root) to search in. Supports glob patterns like "src/**/*.ts"'
		)),
	caseSensitive: z
		.boolean()
		.optional()
		.default(false)
		.describe('Whether the search should be case-sensitive. Default is false (case-insensitive)'),
	contextLinesBefore: z
		.number()
		.int()
		.min(0)
		.max(20)
		.optional()
		.default(5)
		.describe('Number of lines to show before each match for context. Default is 5, max is 20'),
	contextLinesAfter: z
		.number()
		.int()
		.min(0)
		.max(20)
		.optional()
		.default(5)
		.describe('Number of lines to show after each match for context. Default is 5, max is 20'),
});

const patternSearchExamples = [
	'<tool name="pattern_search">\n' +
	'  <searchPattern>fast-editor<' + '/searchPattern>\n' +
	'  <files>["extension/src/agent/v1/tools/runners/fast-editor.tool.ts"]<' + '/files>\n' +
	'  <caseSensitive>false<' + '/caseSensitive>\n' +
	'  <contextLinesBefore>5<' + '/contextLinesBefore>\n' +
	'  <contextLinesAfter>5<' + '/contextLinesAfter>\n' +
	'<' + '/tool>',

	'<tool name="pattern_search">\n' +
	'  <searchPattern>import.*React<' + '/searchPattern>\n' +
	'  <files>["src/components/Header.tsx", "src/utils/editor.ts"]<' + '/files>\n' +
	'  <caseSensitive>false<' + '/caseSensitive>\n' +
	'  <contextLinesBefore>2<' + '/contextLinesBefore>\n' +
	'  <contextLinesAfter>2<' + '/contextLinesAfter>\n' +
	'<' + '/tool>',

	'<tool name="pattern_search">\n' +
	'  <searchPattern>TODO<' + '/searchPattern>\n' +
	'  <files>["src/components/Button.tsx"]<' + '/files>\n' +
	'  <caseSensitive>true<' + '/caseSensitive>\n' +
	'  <contextLinesBefore>3<' + '/contextLinesBefore>\n' +
	'  <contextLinesAfter>3<' + '/contextLinesAfter>\n' +
	'<' + '/tool>',

	'<tool name="pattern_search">\n' +
	'  <searchPattern>function handleClick<' + '/searchPattern>\n' +
	'  <files>["src/components/Button.tsx", "src/components/Form.tsx"]<' + '/files>\n' +
	'<' + '/tool>',
];

export const patternSearchTool = {
	schema: {
		name: 'pattern_search' as const,
		schema: patternSearchSchema,
	},
	examples: patternSearchExamples,
};

export type PatternSearchToolParams = {
	name: typeof patternSearchTool.schema.name;
	input: z.infer<typeof patternSearchSchema>;
};

