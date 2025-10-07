import dedent from 'dedent';
import { ToolPromptSchema } from '../utils/utils';

export const renamePrompt: ToolPromptSchema = {
	name: 'rename',
	description:
		'Rename files and directories in place without changing their location. Automatically detects whether the target is a file or directory.',
	parameters: {
		path: {
			type: 'string',
			description:
				'The current path of the file or directory to rename (relative to the current working directory).',
			required: true,
		},
		new_name: {
			type: 'string',
			description:
				'The new name for the file or directory (just the name, not the full path).',
			required: true,
		},
		type: {
			type: 'string',
			description: dedent`
				Specify what type of item to rename:
				- "file": Rename a file
				- "directory": Rename a directory
				- "auto": Automatically detect the type (default)
			`,
			required: false,
		},
		overwrite: {
			type: 'boolean',
			description:
				'Whether to overwrite if a file or directory with the new name already exists in the same location. Default is false.',
			required: false,
		},
	},
	capabilities: [
		'Rename files and directories in place with automatic type detection',
		'Handle naming conflicts with overwrite option',
		'Preserve file permissions and metadata during rename',
		'Support extension changes for files',
		'Maintain directory structure and contents during directory rename',
		'Provide clear error messages for invalid operations',
	],
	examples: [
		{
			description: 'Rename a file in the current directory',
			output: dedent`
				<tool name="rename">
					<path>./old_document.txt</path>
					<new_name>new_document.txt</new_name>
				</tool>
			`,
		},
		{
			description: 'Rename a file with extension change',
			output: dedent`
				<tool name="rename">
					<path>./script.js</path>
					<new_name>script.ts</new_name>
					<type>file</type>
				</tool>
			`,
		},
		{
			description: 'Rename a directory',
			output: dedent`
				<tool name="rename">
					<path>./old_project_folder</path>
					<new_name>new_project_folder</new_name>
					<type>directory</type>
				</tool>
			`,
		},
		{
			description: 'Rename with overwrite permission',
			output: dedent`
				<tool name="rename">
					<path>./temp_config.json</path>
					<new_name>config.json</new_name>
					<overwrite>true</overwrite>
				</tool>
			`,
		},
		{
			description: 'Rename a nested file',
			output: dedent`
				<tool name="rename">
					<path>./src/components/old_component.tsx</path>
					<new_name>new_component.tsx</new_name>
				</tool>
			`,
		},
		{
			description: 'Rename a source directory',
			output: dedent`
				<tool name="rename">
					<path>./src/old_modules</path>
					<new_name>new_modules</new_name>
				</tool>
			`,
		},
	],
};
