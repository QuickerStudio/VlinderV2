import dedent from 'dedent';
import { ToolPromptSchema } from '../utils/utils';

export const removePrompt: ToolPromptSchema = {
	name: 'remove',
	description:
		'Remove files and directories from the filesystem. Automatically detects whether the target is a file or directory. Executes immediately without user confirmation for streamlined workflow.',
	parameters: {
		path: {
			type: 'string',
			description:
				'The path of the file or directory to remove (relative to the current working directory).',
			required: true,
		},
		type: {
			type: 'string',
			description: dedent`
				Specify what type of item to remove:
				- "file": Remove a file
				- "directory": Remove a directory
				- "auto": Automatically detect the type (default)
				- "force_recursive": Forcefully remove non-empty directories without confirmation
			`,
			required: false,
		},
		recursive: {
			type: 'boolean',
			description:
				'Whether to remove directories recursively with all contents (applies to directories only). Default is true.',
			required: false,
		},
		force: {
			type: 'boolean',
			description:
				'Whether to use force flag for filesystem operations. Default is false.',
			required: false,
		},
	},
	capabilities: [
		'Remove files and directories with automatic type detection',
		'Handle recursive directory removal with all contents',
		'Execute removal operations immediately without user confirmation',
		'Support force removal for automated workflows',
		'Handle empty directory removal with non-recursive option',
		'Force recursive removal for non-empty directories',
		'Provide transparent logging of all removal operations',
	],
	examples: [
		{
			description: 'Remove a temporary file',
			output: dedent`
				<tool name="remove">
					<path>./temp/old_file.txt</path>
					<type>file</type>
				</tool>
			`,
		},
		{
			description: 'Remove a directory with all contents',
			output: dedent`
				<tool name="remove">
					<path>./old_project</path>
					<type>directory</type>
					<recursive>true</recursive>
				</tool>
			`,
		},
		{
			description: 'Auto-detect and remove with force',
			output: dedent`
				<tool name="remove">
					<path>./temp_files</path>
					<force>true</force>
				</tool>
			`,
		},
		{
			description: 'Remove empty directory only',
			output: dedent`
				<tool name="remove">
					<path>./empty_folder</path>
					<type>directory</type>
					<recursive>false</recursive>
				</tool>
			`,
		},
		{
			description: 'Remove cache directory',
			output: dedent`
				<tool name="remove">
					<path>./node_modules/.cache</path>
				</tool>
			`,
		},
		{
			description: 'Force remove non-empty directory',
			output: dedent`
				<tool name="remove">
					<path>./problematic_folder</path>
					<type>force_recursive</type>
				</tool>
			`,
		},
	],
};
