// schema/rename.ts
import { z } from 'zod';

/**
 * @tool rename
 * @description Rename files and directories in place. This tool provides a simple way to rename items without changing their location:
 * 1. **Renaming Files**: Rename individual files while keeping them in the same directory.
 * 2. **Renaming Directories**: Rename entire directories while preserving all their contents.
 * The tool automatically detects whether the target is a file or directory, but you can explicitly specify the type for clarity.
 * @schema
 * {
 *   path: string;         // The current path of the file or directory to rename.
 *   new_name: string;     // The new name for the file or directory (without path).
 *   type?: "file" | "directory" | "auto"; // Optional. Specify what type of item to rename. Default is "auto" (auto-detect).
 *   overwrite?: boolean;  // Optional. Whether to overwrite if a file/directory with the new name already exists. Default is false.
 * }
 * @example (Renaming a file)
 * ```xml
 * <tool name="rename">
 *   <path>./documents/old_report.pdf</path>
 *   <new_name>new_report.pdf</new_name>
 *   <type>file</type>
 * </tool>
 * ```
 * @example (Renaming a directory)
 * ```xml
 * <tool name="rename">
 *   <path>./old_project_folder</path>
 *   <new_name>new_project_folder</new_name>
 *   <type>directory</type>
 * </tool>
 * ```
 * @example (Auto-detect with overwrite)
 * ```xml
 * <tool name="rename">
 *   <path>./temp_file.txt</path>
 *   <new_name>final_file.txt</new_name>
 *   <overwrite>true</overwrite>
 * </tool>
 * ```
 * @example (Rename with extension change)
 * ```xml
 * <tool name="rename">
 *   <path>./script.js</path>
 *   <new_name>script.ts</new_name>
 *   <type>file</type>
 * </tool>
 * ```
 */
const schema = z.object({
	path: z
		.string()
		.describe(
			'The current path of the file or directory to rename (relative to the current working directory).'
		),
	new_name: z
		.string()
		.describe(
			'The new name for the file or directory (just the name, not the full path).'
		),
	type: z
		.enum(['file', 'directory', 'auto'])
		.optional()
		.default('auto')
		.describe(
			"Specify what type of item to rename. 'auto' will automatically detect the type. Default is 'auto'."
		),
	overwrite: z
		.boolean()
		.optional()
		.describe(
			'Whether to overwrite if a file or directory with the new name already exists in the same location. Default is false.'
		),
});

const examples = [
	`<tool name="rename">
  <path>./documents/old_report.pdf</path>
  <new_name>new_report.pdf</new_name>
  <type>file</type>
</tool>`,

	`<tool name="rename">
  <path>./old_project_folder</path>
  <new_name>new_project_folder</new_name>
  <type>directory</type>
</tool>`,

	`<tool name="rename">
  <path>./temp_file.txt</path>
  <new_name>final_file.txt</new_name>
  <overwrite>true</overwrite>
</tool>`,

	`<tool name="rename">
  <path>./script.js</path>
  <new_name>script.ts</new_name>
  <type>file</type>
</tool>`,

	`<tool name="rename">
  <path>./src/components</path>
  <new_name>ui-components</new_name>
</tool>`,
];

export const renameTool = {
	schema: {
		name: 'rename',
		schema,
	},
	examples,
};

export type RenameToolParams = {
	name: 'rename';
	input: z.infer<typeof schema>;
};
