import { z } from 'zod';

const fastEditorFileEditSchema = z.object({
	path: z.string().describe('Relative path to the file to edit'),
	oldString: z
		.string()
		.describe('The exact string to find and replace in the file'),
	newString: z
		.string()
		.describe('The new string to replace the old string with'),
});

const fastEditorSchema = z.object({
	edits: z.preprocess((val) => {
		// If it's already an array, return it
		if (Array.isArray(val)) {
			console.log('[FastEditor] edits is already an array with', val.length, 'items');
			return val;
		}

		// If it's a string, try to parse it as JSON
		if (typeof val === 'string') {
			const trimmed = val.trim();

			// Try JSON format (recommended format: [{"path": "...", "oldString": "...", "newString": "..."}])
			if (trimmed.startsWith('[')) {
				console.log('[FastEditor] Detected JSON format, parsing...');
				try {
					const parsed = JSON.parse(trimmed);
					if (Array.isArray(parsed)) {
						console.log('[FastEditor] ✅ Successfully parsed JSON with', parsed.length, 'edits');
						return parsed;
					} else {
						console.error('[FastEditor] ❌ JSON parsed but not an array');
						return [];
					}
				} catch (error) {
					console.error('[FastEditor] ❌ JSON parsing failed:', error instanceof Error ? error.message : String(error));
					console.error('[FastEditor] Received string:', trimmed.substring(0, 200));
					return [];
				}
			}

			console.error('[FastEditor] ❌ String does not start with [, cannot parse');
			console.error('[FastEditor] Received string:', trimmed.substring(0, 200));
			return [];
		}

		console.error('[FastEditor] ❌ edits is neither array nor string, type:', typeof val);
		return [];
	}, z
		.array(fastEditorFileEditSchema)
		.min(1)
		.describe(
			'Array of file edits to apply. Each edit specifies a file path and a string replacement to make in that file.'
		)),
	explanation: z
		.string()
		.optional()
		.describe('Optional explanation of what these edits accomplish together'),
});

const fastEditorExamples = [
	`<tool name="fast_editor">
  <edits>
    [
      {
        "path": "src/components/Header.tsx",
        "oldString": "import { Button } from './Button'",
        "newString": "import { Button } from '@/components/ui/button'"
      },
      {
        "path": "src/components/Footer.tsx",
        "oldString": "import { Button } from './Button'",
        "newString": "import { Button } from '@/components/ui/button'"
      },
      {
        "path": "src/pages/Home.tsx",
        "oldString": "import { Button } from '../components/Button'",
        "newString": "import { Button } from '@/components/ui/button'"
      }
    ]
  </edits>
  <explanation>
Update all Button imports to use the new centralized UI component path
  </explanation>
</tool>`,
	`<tool name="fast_editor">
  <edits>
    [
      {
        "path": "package.json",
        "oldString": "\\"version\\": \\"1.0.0\\"",
        "newString": "\\"version\\": \\"1.1.0\\""
      },
      {
        "path": "src/constants.ts",
        "oldString": "export const VERSION = '1.0.0'",
        "newString": "export const VERSION = '1.1.0'"
      },
      {
        "path": "README.md",
        "oldString": "## Version 1.0.0",
        "newString": "## Version 1.1.0"
      }
    ]
  </edits>
  <explanation>
Bump version to 1.1.0 across all relevant files
  </explanation>
</tool>`,
	`<tool name="fast_editor">
  <edits>
    [
      {
        "path": "src/api/users.ts",
        "oldString": "const API_URL = 'http://localhost:3000'",
        "newString": "const API_URL = process.env.API_URL || 'http://localhost:3000'"
      },
      {
        "path": "src/api/posts.ts",
        "oldString": "const API_URL = 'http://localhost:3000'",
        "newString": "const API_URL = process.env.API_URL || 'http://localhost:3000'"
      },
      {
        "path": "src/api/comments.ts",
        "oldString": "const API_URL = 'http://localhost:3000'",
        "newString": "const API_URL = process.env.API_URL || 'http://localhost:3000'"
      }
    ]
  </edits>
  <explanation>
Make API URLs configurable via environment variables across all API modules
  </explanation>
</tool>`,
];

export const fastEditorTool = {
	schema: {
		name: 'fast_editor',
		schema: fastEditorSchema,
	},
	examples: fastEditorExamples,
};

export type FastEditorToolParams = {
	name: 'fast_editor';
	input: z.infer<typeof fastEditorSchema>;
};
