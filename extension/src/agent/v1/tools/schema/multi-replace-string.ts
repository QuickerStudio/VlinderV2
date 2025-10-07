import { z } from 'zod';

/**
 * Schema for a single replacement operation
 */
const replacementSchema = z.object({
	filePath: z.string().describe('Path to the file to edit'),
	oldString: z.string().describe('The exact string to find and replace'),
	newString: z
		.string()
		.describe('The new string to replace the old string with'),
	caseInsensitive: z
		.boolean()
		.optional()
		.describe('If true, perform case-insensitive matching. Default: false'),
	useRegex: z
		.boolean()
		.optional()
		.describe('If true, treat oldString as a regular expression pattern. Default: false'),
	order: z
		.number()
		.optional()
		.describe('Execution order for this replacement. Lower numbers execute first. Default: 0'),
});

/**
 * Unescape XML entities and numeric character references
 *
 * Supports:
 * - Named entities: &lt; &gt; &amp; &quot; &apos;
 * - Decimal entities: &#10; (newline), &#9; (tab), &#13; (carriage return)
 * - Hex entities: &#xA; (newline), &#x9; (tab), &#xD; (carriage return)
 *
 * This must be done BEFORE processing escape sequences
 *
 * Examples:
 * - "&lt;tag&gt;" → "<tag>"
 * - "line1&#10;line2" → "line1\nline2"
 * - "col1&#9;col2" → "col1\tcol2"
 * - "line1&#xA;line2" → "line1\nline2"
 */
function unescapeXml(str: string): string {
	return str
		// First, process numeric character references (decimal)
		.replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(parseInt(dec, 10)))
		// Then, process numeric character references (hexadecimal)
		.replace(/&#x([0-9A-Fa-f]+);/g, (_match, hex) => String.fromCharCode(parseInt(hex, 16)))
		// Finally, process named entities
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, '&'); // Must be last to avoid double-unescaping
}

/**
 * Process escape sequences in strings - DISABLED BY DEFAULT
 *
 * IMPORTANT DESIGN DECISION:
 * We DO NOT automatically process \n, \t, etc. because it causes problems:
 * - User input: "C:\Users\Test\file.txt"
 * - If we process \t: "C:\Users\Te<TAB>ile.txt" ❌ WRONG!
 *
 * Instead, users should use XML numeric entities for special characters:
 * - Newline: &#10; or &#xA;
 * - Tab: &#9; or &#x9;
 * - Carriage return: &#13; or &#xD;
 *
 * This function now ONLY processes:
 * - \\ → \ (double backslash to single backslash, for escaping)
 *
 * Examples:
 * - "C:\\Users\\Test\\file.txt" → "C:\Users\Test\file.txt" ✅
 * - "C:\Users\Test\file.txt" → "C:\Users\Test\file.txt" ✅
 * - "line1&#10;line2" → "line1\nline2" ✅ (XML entity, processed by unescapeXml)
 *
 * @param str - The string to process
 * @returns The processed string with \\ converted to \
 */
function processEscapeSequences(str: string): string {
	// Only process \\ → \ (double backslash to single backslash)
	// This allows users to escape backslashes if needed
	// All other backslashes are preserved as-is
	return str.replace(/\\\\/g, '\\');
}

/**
 * Helper function to parse XML string containing replacement elements into an array
 * Handles the format: <replacements><replacement>...</replacement><replacement>...</replacement></replacements>
 */
function parseReplacementsXml(xmlString: string): any[] {
	const replacements: any[] = [];

	// Log the input for debugging
	console.log('[MultiReplaceString] Parsing XML:', xmlString.substring(0, 200) + (xmlString.length > 200 ? '...' : ''));

	// Match all <replacement>...</replacement> blocks
	const replacementRegex = /<replacement>([\s\S]*?)<\/replacement>/g;
	let match: RegExpExecArray | null;
	let matchCount = 0;

	while ((match = replacementRegex.exec(xmlString)) !== null) {
		matchCount++;
		const replacementContent = match[1];

		// Extract filePath, oldString, and newString from each replacement block
		const filePathMatch = replacementContent.match(
			/<filePath>([\s\S]*?)<\/filePath>/
		);
		const oldStringMatch = replacementContent.match(
			/<oldString>([\s\S]*?)<\/oldString>/
		);
		const newStringMatch = replacementContent.match(
			/<newString>([\s\S]*?)<\/newString>/
		);

		if (filePathMatch && oldStringMatch && newStringMatch) {
			// Step 1: Unescape XML entities and numeric character references
			// - Named entities: &lt; &gt; &amp; &quot; &apos;
			// - Decimal: &#10; (newline), &#9; (tab), &#13; (CR)
			// - Hex: &#xA; (newline), &#x9; (tab), &#xD; (CR)
			const oldStringUnescaped = unescapeXml(oldStringMatch[1]);
			const newStringUnescaped = unescapeXml(newStringMatch[1]);

			// Step 2: Process escape sequences (only \\ → \)
			// NOTE: We do NOT process \n, \t, etc. to avoid breaking Windows paths
			// Users should use XML numeric entities for special characters
			const oldString = processEscapeSequences(oldStringUnescaped);
			const newString = processEscapeSequences(newStringUnescaped);

			// Step 3: Extract optional flags
			const caseInsensitiveMatch = replacementContent.match(
				/<caseInsensitive>([\s\S]*?)<\/caseInsensitive>/
			);
			const useRegexMatch = replacementContent.match(
				/<useRegex>([\s\S]*?)<\/useRegex>/
			);
			const orderMatch = replacementContent.match(
				/<order>([\s\S]*?)<\/order>/
			);

			const caseInsensitive = caseInsensitiveMatch ?
				caseInsensitiveMatch[1].trim().toLowerCase() === 'true' : false;
			const useRegex = useRegexMatch ?
				useRegexMatch[1].trim().toLowerCase() === 'true' : false;
			const order = orderMatch ?
				parseInt(orderMatch[1].trim(), 10) : 0;

			console.log('[MultiReplaceString] Processing strings:');
			console.log('  oldString raw:', oldStringMatch[1].substring(0, 80));
			console.log('  oldString after XML unescape:', oldStringUnescaped.substring(0, 80).replace(/\n/g, '\\n').replace(/\t/g, '\\t'));
			console.log('  oldString final:', oldString.substring(0, 80).replace(/\n/g, '\\n').replace(/\t/g, '\\t'));
			console.log('  newString raw:', newStringMatch[1].substring(0, 80));
			console.log('  newString after XML unescape:', newStringUnescaped.substring(0, 80).replace(/\n/g, '\\n').replace(/\t/g, '\\t'));
			console.log('  newString final:', newString.substring(0, 80).replace(/\n/g, '\\n').replace(/\t/g, '\\t'));
			console.log('  caseInsensitive:', caseInsensitive);
			console.log('  useRegex:', useRegex);
			console.log('  order:', order);

			replacements.push({
				filePath: filePathMatch[1].trim(),
				oldString: oldString,
				newString: newString,
				caseInsensitive: caseInsensitive,
				useRegex: useRegex,
				order: order,
			});
		} else {
			console.warn('[MultiReplaceString] Incomplete replacement block:', {
				hasFilePath: !!filePathMatch,
				hasOldString: !!oldStringMatch,
				hasNewString: !!newStringMatch,
				content: replacementContent.substring(0, 100),
			});
		}
	}

	console.log(`[MultiReplaceString] Parsed ${replacements.length} replacements from ${matchCount} blocks`);
	return replacements;
}

/**
 * @tool multi_replace_string_in_file
 * @description Perform multiple string replacements across multiple files in a single batch operation.
 *
 * USE THIS TOOL FOR:
 * Multi-file batch editing scenarios:
 * - Renaming a function or variable used across multiple files
 * - Updating the same constant or configuration in multiple files
 * - Refactoring that requires changes in multiple files
 * - Batch updates across the codebase (e.g., updating API endpoints)
 * - Consistent changes across multiple files in one operation
 * - Cross-file dependency updates
 *
 * DO NOT USE THIS TOOL FOR:
 * Single-file scenarios (use replace_string_in_file instead):
 * - Editing only one file
 * - Quick single-file fixes
 * - Simple one-time replacements
 *
 * SPECIAL CHARACTER HANDLING:
 * - Windows paths: Use directly without escaping (e.g., C:\Users\Test\file.txt)
 * - Newlines: Use XML numeric entity &#10; or &#xA;
 * - Tabs: Use XML numeric entity &#9; or &#x9;
 * - Carriage return: Use XML numeric entity &#13; or &#xD;
 * - Double backslash: Use \\ to represent a single backslash
 * - XML special chars: Use &lt; &gt; &amp; &quot; &apos;
 *
 * ADVANCED FEATURES:
 * - Case-insensitive matching: Add <caseInsensitive>true</caseInsensitive> to replacement
 * - Regex patterns: Add <useRegex>true</useRegex> to use oldString as regex pattern
 * - Capture groups: In regex mode, use $1, $2, etc. in newString to reference captured groups
 * - Execution order: Add <order>1</order> to control replacement order (lower numbers execute first)
 *
 * EXAMPLES:
 *
 * Example 1: Case-insensitive replacement
 * <replacement>
 *   <filePath>file.txt</filePath>
 *   <oldString>hello</oldString>
 *   <newString>hi</newString>
 *   <caseInsensitive>true</caseInsensitive>
 * </replacement>
 *
 * Example 2: Regex pattern with capture groups
 * <replacement>
 *   <filePath>file.txt</filePath>
 *   <oldString>user_(\d+)</oldString>
 *   <newString>customer_$1</newString>
 *   <useRegex>true</useRegex>
 * </replacement>
 *
 * Example 3: Ordered replacements (chain replacements)
 * <replacement>
 *   <filePath>file.txt</filePath>
 *   <oldString>A</oldString>
 *   <newString>B</newString>
 *   <order>1</order>
 * </replacement>
 * <replacement>
 *   <filePath>file.txt</filePath>
 *   <oldString>B</oldString>
 *   <newString>C</newString>
 *   <order>2</order>
 * </replacement>
 *
 * Schema for multi_replace_string_in_file tool
 * Performs multiple string replacements across one or more files in a single atomic operation
 */
const schema = z.object({
	explanation: z
		.string()
		.describe('Brief explanation of why these replacements are being made. Describe the overall goal of the batch operation.'),
	replacements: z.preprocess((val) => {
		console.log('[MultiReplaceString] z.preprocess called with type:', typeof val);
		console.log('[MultiReplaceString] Value is undefined:', val === undefined);
		console.log('[MultiReplaceString] Value is null:', val === null);

		// If it's already an array, return it as-is (for testing or direct API calls)
		if (Array.isArray(val)) {
			console.log('[MultiReplaceString] Received array with', val.length, 'items');
			return val;
		}

		// If it's undefined or null, log detailed error and return empty array to trigger min(1) validation
		if (val === undefined || val === null) {
			console.error('[MultiReplaceString] ❌ CRITICAL: replacements parameter is', val === undefined ? 'undefined' : 'null');
			console.error('[MultiReplaceString] This means tool-parser did not capture the <replacements> parameter');
			console.error('[MultiReplaceString] Possible causes:');
			console.error('[MultiReplaceString]   1. AI did not send <replacements> tag');
			console.error('[MultiReplaceString]   2. Tool-parser failed to parse the XML');
			console.error('[MultiReplaceString]   3. Streaming was interrupted before <replacements> was sent');
			// Return empty array to trigger the min(1) validation error with a clear message
			return [];
		}

		// If it's a string, try to parse it (JSON or XML format)
		if (typeof val === 'string') {
			console.log('[MultiReplaceString] Received string, length:', val.length);
			console.log('[MultiReplaceString] First 100 chars:', val.substring(0, 100));

			// Check if string is empty or whitespace only
			if (val.trim().length === 0) {
				console.error('[MultiReplaceString] ❌ Received empty or whitespace-only string');
				return [];
			}

			// Try JSON format first (recommended format)
			const trimmed = val.trim();
			if (trimmed.startsWith('[')) {
				console.log('[MultiReplaceString] Detected JSON format, parsing...');
				try {
					const parsed = JSON.parse(trimmed);
					if (Array.isArray(parsed)) {
						console.log('[MultiReplaceString] ✅ Successfully parsed JSON with', parsed.length, 'replacements');
						return parsed;
					} else {
						console.error('[MultiReplaceString] ❌ JSON parsed but not an array');
						return [];
					}
				} catch (error) {
					console.error('[MultiReplaceString] ❌ JSON parsing failed:', error instanceof Error ? error.message : String(error));
					console.error('[MultiReplaceString] Will try XML parsing as fallback...');
				}
			}

			// Fallback to XML format
			console.log('[MultiReplaceString] Parsing as XML format...');
			const parsed = parseReplacementsXml(val);

			// If parsing failed or returned empty array
			if (parsed.length === 0) {
				console.error('[MultiReplaceString] ❌ XML parsing returned empty array');
				console.error('[MultiReplaceString] Raw content:', val);
				return [];
			}

			console.log('[MultiReplaceString] ✅ Successfully parsed XML with', parsed.length, 'replacements');
			return parsed;
		}

		// Otherwise, return empty array to trigger validation error
		console.error('[MultiReplaceString] ❌ Invalid replacements type:', typeof val);
		console.error('[MultiReplaceString] Value:', val);
		return [];
	}, z.array(replacementSchema).min(1).describe('Array of replacement operations to perform. Must contain at least one replacement.')),
});

const examples = [
	`<tool name="multi_replace_string_in_file">
  <explanation>Rename getUserData to fetchUserData across the codebase</explanation>
  <replacements>
    <replacement>
      <filePath>src/api/users.ts</filePath>
      <oldString>getUserData</oldString>
      <newString>fetchUserData</newString>
    </replacement>
    <replacement>
      <filePath>src/components/UserProfile.tsx</filePath>
      <oldString>getUserData</oldString>
      <newString>fetchUserData</newString>
    </replacement>
  </replacements>
</tool>`,

	`<tool name="multi_replace_string_in_file">
  <explanation>Update API endpoints across multiple files</explanation>
  <replacements>
    <replacement>
      <filePath>src/config/api.ts</filePath>
      <oldString>const API_URL = 'http://localhost:3000'</oldString>
      <newString>const API_URL = 'https://api.production.com'</newString>
    </replacement>
    <replacement>
      <filePath>src/services/auth.ts</filePath>
      <oldString>const API_URL = 'http://localhost:3000'</oldString>
      <newString>const API_URL = 'https://api.production.com'</newString>
    </replacement>
  </replacements>
</tool>`,

	`<tool name="multi_replace_string_in_file">
  <explanation>Fix typo in variable name across codebase</explanation>
  <replacements>
    <replacement>
      <filePath>src/utils/helpers.ts</filePath>
      <oldString>const calcualteTotal</oldString>
      <newString>const calculateTotal</newString>
    </replacement>
    <replacement>
      <filePath>src/components/Cart.tsx</filePath>
      <oldString>calcualteTotal()</oldString>
      <newString>calculateTotal()</newString>
    </replacement>
  </replacements>
</tool>`,
];

export const multiReplaceStringTool = {
	schema: {
		name: 'multi_replace_string_in_file',
		schema,
	},
	examples,
};

export type MultiReplaceStringToolParams = {
	name: 'multi_replace_string_in_file';
	input: z.infer<typeof schema>;
};

export type ReplacementOperation = z.infer<typeof replacementSchema>;
