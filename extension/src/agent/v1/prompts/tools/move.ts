import dedent from 'dedent';
import { ToolPromptSchema } from '../utils/utils';

export const movePrompt: ToolPromptSchema = {
	name: 'move',
	description:
		'Move or rename files and directories from one location to another. Automatically detects whether the source is a file or directory.',
	parameters: {
		source_path: {
			type: 'string',
			description:
				'The current path of the file or directory to move (relative to the current working directory).',
			required: true,
		},
		destination_path: {
			type: 'string',
			description:
				'The new path where the item should be moved to (relative to the current working directory).',
			required: true,
		},
		type: {
			type: 'string',
			description: dedent`
				Specify what type of item to move:
				- "file": Move a file
				- "directory": Move a directory
				- "auto": Automatically detect the type (default)
			`,
			required: false,
		},
		overwrite: {
			type: 'boolean',
			description:
				'Whether to overwrite the destination file if it already exists (applies to files only). Default is false.',
			required: false,
		},
		merge: {
			type: 'boolean',
			description:
				'Whether to merge with the destination directory if it already exists (applies to directories only). Default is false.',
			required: false,
		},
	},
	capabilities: [
		'Move or rename files and directories with automatic type detection',
		'Handle file conflicts with overwrite option',
		'Handle directory conflicts with merge option',
		"Automatically create destination directories if they don't exist",
		'Preserve file permissions and metadata during moves',
	],
	examples: [
		{
			description: 'Move a file to a new location',
			output: dedent`
				<tool name="move">
					<source_path>./old_location/document.txt</source_path>
					<destination_path>./new_location/document.txt</destination_path>
				</tool>
			`,
		},
		{
			description: 'Rename a file in the same directory',
			output: dedent`
				<tool name="move">
					<source_path>./old_name.js</source_path>
					<destination_path>./new_name.js</destination_path>
					<type>file</type>
				</tool>
			`,
		},
		{
			description: 'Move a directory with all contents',
			output: dedent`
				<tool name="move">
					<source_path>./old_project</source_path>
					<destination_path>./projects/new_project</destination_path>
					<type>directory</type>
				</tool>
			`,
		},
		{
			description: 'Move file with overwrite permission',
			output: dedent`
				<tool name="move">
					<source_path>./temp/config.json</source_path>
					<destination_path>./config/config.json</destination_path>
					<overwrite>true</overwrite>
				</tool>
			`,
		},
		{
			description: 'Merge directory contents',
			output: dedent`
				<tool name="move">
					<source_path>./temp_assets</source_path>
					<destination_path>./assets</destination_path>
					<type>directory</type>
					<merge>true</merge>
				</tool>
			`,
		},
	],
};
