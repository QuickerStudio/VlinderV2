import { ToolPromptSchema } from '../utils/utils';

export const fastEditorToolPrompt: ToolPromptSchema = {
	name: 'fast_editor',
	description:
		'Edit multiple files in a single operation by performing string replacements. Use this tool when you need to make coordinated changes across multiple files, such as updating imports, bumping version numbers, or refactoring API calls. Each edit specifies a file path and a string replacement to make.',
	parameters: {
		edits: {
			type: 'array',
			description:
				'Array of file edits to apply. Each edit must specify: path (relative file path), oldString (exact string to find), and newString (replacement string). All edits are applied independently.',
			required: true,
		},
		explanation: {
			type: 'string',
			description:
				'Optional explanation of what these edits accomplish together. Helps users understand the purpose of the batch edit.',
			required: false,
		},
	},
	examples: [
		{
			description: 'Update import paths across multiple components',
			output: `<tool name="fast_editor">
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
		},
		{
			description: 'Bump version number across multiple files',
			output: `<tool name="fast_editor">
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
		},
		{
			description: 'Make API URLs configurable across multiple modules',
			output: `<tool name="fast_editor">
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
		},
		{
			description: 'Rename a function across multiple files',
			output: `<tool name="fast_editor">
  <edits>
    [
      {
        "path": "src/utils/helpers.ts",
        "oldString": "export function getUserData(",
        "newString": "export function fetchUserData("
      },
      {
        "path": "src/components/Profile.tsx",
        "oldString": "const data = await getUserData(userId)",
        "newString": "const data = await fetchUserData(userId)"
      },
      {
        "path": "src/pages/Dashboard.tsx",
        "oldString": "getUserData(currentUser.id)",
        "newString": "fetchUserData(currentUser.id)"
      }
    ]
  </edits>
  <explanation>
Rename getUserData to fetchUserData for better clarity
  </explanation>
</tool>`,
		},
	],
	capabilities: [
		'Edit multiple files in a single batch operation',
		'Perform string replacements across multiple files',
		'Coordinated changes (imports, version bumps, refactoring)',
		'Independent edit processing with detailed results',
		'User approval before applying changes',
		'Success/failure reporting for each file',
	],
	usageNotes: `
## When to Use

Use the fast_editor tool when you need to:
1. **Make coordinated changes** across multiple files
2. **Update imports** when moving or renaming modules
3. **Bump version numbers** in multiple locations
4. **Refactor API calls** across different modules
5. **Update configuration values** consistently
6. **Rename functions/variables** used in multiple files
7. **Fix typos or update text** across multiple files

## How It Works

- **Batch Operation**: All edits are applied in a single operation
- **Independent Edits**: Each edit is applied independently; one failure doesn't stop others
- **Exact Matching**: The oldString must match exactly (case-sensitive, whitespace-sensitive)
- **Global Replacement**: All occurrences of oldString in each file are replaced
- **User Approval**: User must approve the batch edit before it's applied
- **Detailed Results**: Reports success/failure for each individual file edit

## Best Practices

### 1. Use Exact Strings
The oldString must match exactly:
- ✅ "import { Button } from './Button'"
- ❌ "import { Button } from './Button' " (extra space)
- ❌ "import {Button} from './Button'" (missing spaces)

### 2. Be Specific
Make oldString specific enough to avoid unintended replacements:
- ✅ "const API_URL = 'http://localhost:3000'"
- ❌ "localhost:3000" (might match comments, strings, etc.)

### 3. Include Context
Include surrounding context to ensure correct replacement:
- ✅ "export function getUserData("
- ❌ "getUserData" (might match in comments, strings, etc.)

### 4. Provide Explanation
Always include an explanation to help users understand the purpose:
- ✅ "Update all Button imports to use the new centralized UI component path"
- ❌ "" (no explanation)

### 5. Group Related Changes
Group logically related changes in a single fast_editor call:
- ✅ All import updates together
- ✅ All version bumps together
- ❌ Mixing unrelated changes

### 6. Verify File Paths
Ensure all file paths are correct and relative to the workspace:
- ✅ "src/components/Header.tsx"
- ❌ "/absolute/path/to/file.tsx"
- ❌ "components/Header.tsx" (if file is in src/components/)

## Common Patterns

### Pattern 1: Update Imports
\`\`\`xml
<tool name="fast_editor">
  <edits>
    [
      {
        "path": "src/ComponentA.tsx",
        "oldString": "import { util } from './utils'",
        "newString": "import { util } from '@/lib/utils'"
      },
      {
        "path": "src/ComponentB.tsx",
        "oldString": "import { util } from '../utils'",
        "newString": "import { util } from '@/lib/utils'"
      }
    ]
  </edits>
  <explanation>Standardize import paths to use path aliases</explanation>
</tool>
\`\`\`

### Pattern 2: Version Bump
\`\`\`xml
<tool name="fast_editor">
  <edits>
    [
      {
        "path": "package.json",
        "oldString": "\\"version\\": \\"2.0.0\\"",
        "newString": "\\"version\\": \\"2.1.0\\""
      },
      {
        "path": "src/version.ts",
        "oldString": "VERSION = '2.0.0'",
        "newString": "VERSION = '2.1.0'"
      }
    ]
  </edits>
  <explanation>Bump version to 2.1.0</explanation>
</tool>
\`\`\`

### Pattern 3: Refactor API Calls
\`\`\`xml
<tool name="fast_editor">
  <edits>
    [
      {
        "path": "src/api/client.ts",
        "oldString": "axios.get(url)",
        "newString": "apiClient.get(url)"
      },
      {
        "path": "src/services/user.ts",
        "oldString": "axios.post(endpoint, data)",
        "newString": "apiClient.post(endpoint, data)"
      }
    ]
  </edits>
  <explanation>Replace direct axios calls with apiClient wrapper</explanation>
</tool>
\`\`\`

### Pattern 4: Update Configuration
\`\`\`xml
<tool name="fast_editor">
  <edits>
    [
      {
        "path": "src/config/dev.ts",
        "oldString": "timeout: 5000",
        "newString": "timeout: 10000"
      },
      {
        "path": "src/config/prod.ts",
        "oldString": "timeout: 5000",
        "newString": "timeout: 10000"
      }
    ]
  </edits>
  <explanation>Increase API timeout to 10 seconds across all environments</explanation>
</tool>
\`\`\`

## When NOT to Use

Don't use fast_editor for:
- **Single file edits** - Use replace_string_in_file instead
- **Complex transformations** - Use insert_edit_into_file for code generation
- **Creating new files** - Use file_editor tool instead
- **Deleting files** - Use appropriate file management tools
- **Regex replacements** - This tool uses exact string matching only

## Error Handling

The tool reports detailed results for each edit:
- **Success**: File was edited successfully
- **File not found**: The specified file doesn't exist
- **String not found**: The oldString wasn't found in the file
- **No changes**: The replacement resulted in identical content
- **Apply failed**: The workspace edit couldn't be applied

Partial success is possible - some edits may succeed while others fail.

## Integration with Other Tools

Use fast_editor in combination with:

1. **Before**: Use read_file or grep_search to verify the strings to replace
2. **After**: Use get_errors to check for any issues introduced by the edits
3. **Alternative**: Use multi_replace_string_in_file for multiple replacements in a single file

## Tips for Success

1. **Read files first**: Use read_file to verify the exact strings before editing
2. **Test with one file**: If unsure, test the replacement on one file first
3. **Use grep_search**: Find all occurrences across files before editing
4. **Include whitespace**: Match whitespace exactly (spaces, tabs, newlines)
5. **Escape special characters**: In JSON, escape quotes and backslashes
6. **Provide context**: Include enough context to make replacements unambiguous
7. **Group logically**: Keep related changes together for better user understanding

## Example Workflow

\`\`\`
1. User asks to update import paths
2. Use grep_search to find all files with old import
3. Use read_file to verify exact import syntax
4. Use fast-editor to update all imports at once
5. Use get_errors to verify no issues were introduced
\`\`\`
`,
};
