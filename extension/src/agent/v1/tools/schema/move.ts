// schema/move.ts
import { z } from 'zod';

/**
 * @tool move
 * @description Move or rename files and directories from one location to another. This tool has two modes of operation:
 * 1. **Moving Files**: Move or rename individual files. If the destination directory doesn't exist, it will be created automatically.
 * 2. **Moving Directories**: Move or rename entire directories with all their contents recursively.
 * The tool automatically detects whether the source is a file or directory, but you can explicitly specify the type for clarity.
 * @schema
 * {
 *   source_path: string;      // The current path of the file or directory to move.
 *   destination_path: string; // The new path where the item should be moved to.
 *   type?: "file" | "directory" | "auto"; // Optional. Specify what type of item to move. Default is "auto" (auto-detect).
 *   overwrite?: boolean;      // Optional. Whether to overwrite the destination if it exists (files only). Default is false.
 *   merge?: boolean;          // Optional. Whether to merge with existing destination directory (directories only). Default is false.
 * }
 * @example (Moving a file)
 * ```xml
 * <tool name="move">
 *   <source_path>./old_location/file.txt</source_path>
 *   <destination_path>./new_location/file.txt</destination_path>
 *   <type>file</type>
 * </tool>
 * ```
 * @example (Moving a directory)
 * ```xml
 * <tool name="move">
 *   <source_path>./old_folder</source_path>
 *   <destination_path>./new_location/old_folder</destination_path>
 *   <type>directory</type>
 * </tool>
 * ```
 * @example (Auto-detect with overwrite)
 * ```xml
 * <tool name="move">
 *   <source_path>./documents/report.pdf</source_path>
 *   <destination_path>./archive/2024/report.pdf</destination_path>
 *   <overwrite>true</overwrite>
 * </tool>
 * ```
 * @example (Directory merge)
 * ```xml
 * <tool name="move">
 *   <source_path>./temp_project</source_path>
 *   <destination_path>./projects/my_project</destination_path>
 *   <type>directory</type>
 *   <merge>true</merge>
 * </tool>
 * ```
 */
const schema = z.object({
	source_path: z
		.string()
		.describe(
			'The current path of the file or directory to move (relative to the current working directory).'
		),
	destination_path: z
		.string()
		.describe(
			'The new path where the item should be moved to (relative to the current working directory).'
		),
	type: z
		.enum(['file', 'directory', 'auto'])
		.optional()
		.default('auto')
		.describe(
			"Specify what type of item to move. 'auto' will automatically detect the type. Default is 'auto'."
		),
	overwrite: z
		.boolean()
		.optional()
		.describe(
			'Whether to overwrite the destination file if it already exists (applies to files only). Default is false.'
		),
	merge: z
		.boolean()
		.optional()
		.describe(
			'Whether to merge with the destination directory if it already exists (applies to directories only). Default is false.'
		),
});

const examples = [
	`<tool name="move">
  <source_path>./old_location/file.txt</source_path>
  <destination_path>./new_location/file.txt</destination_path>
  <type>file</type>
</tool>`,

	`<tool name="move">
  <source_path>./old_folder</source_path>
  <destination_path>./new_location/old_folder</destination_path>
  <type>directory</type>
</tool>`,

	`<tool name="move">
  <source_path>./documents/report.pdf</source_path>
  <destination_path>./archive/2024/report.pdf</destination_path>
  <overwrite>true</overwrite>
</tool>`,

	`<tool name="move">
  <source_path>./temp_project</source_path>
  <destination_path>./projects/my_project</destination_path>
  <type>directory</type>
  <merge>true</merge>
</tool>`,

	`<tool name="move">
  <source_path>./src/old_components</source_path>
  <destination_path>./src/components</destination_path>
</tool>`,
];

export const moveTool = {
	schema: {
		name: 'move',
		schema,
	},
	examples,
};

export type MoveToolParams = {
	name: 'move';
	input: z.infer<typeof schema>;
};

// Type aliases for backward compatibility
export type MoveFileToolParams = MoveToolParams;
export type MoveDirectoryToolParams = MoveToolParams;
