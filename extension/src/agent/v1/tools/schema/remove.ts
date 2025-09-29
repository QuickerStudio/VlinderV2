// schema/remove.ts
import { z } from "zod"

/**
 * @tool remove
 * @description Remove files and directories from the filesystem. This tool has multiple modes of operation:
 * 1. **Removing Files**: Delete individual files from the filesystem.
 * 2. **Removing Directories**: Delete entire directories with all their contents recursively.
 * 3. **Force Recursive**: Forcefully delete non-empty directories.
 * The tool automatically detects whether the target is a file or directory, but you can explicitly specify the type for clarity.
 * All operations execute immediately without user confirmation for streamlined workflow.
 * @schema
 * {
 *   path: string;                 // The path of the file or directory to remove.
 *   type?: "file" | "directory" | "auto" | "force_recursive"; // Optional. Specify what type of item to remove. Default is "auto" (auto-detect).
 *   recursive?: boolean;          // Optional. Whether to remove directories recursively (directories only). Default is true.
 *   force?: boolean;              // Optional. Whether to use force flag for filesystem operations. Default is false.
 * }
 * @example (Removing a file)
 * ```xml
 * <tool name="remove">
 *   <path>./temp/old_file.txt</path>
 *   <type>file</type>
 * </tool>
 * ```
 * @example (Removing a directory)
 * ```xml
 * <tool name="remove">
 *   <path>./old_project</path>
 *   <type>directory</type>
 *   <recursive>true</recursive>
 * </tool>
 * ```
 * @example (Auto-detect with force)
 * ```xml
 * <tool name="remove">
 *   <path>./temp_files</path>
 *   <force>true</force>
 * </tool>
 * ```
 * @example (Remove empty directory)
 * ```xml
 * <tool name="remove">
 *   <path>./empty_folder</path>
 *   <type>directory</type>
 *   <recursive>false</recursive>
 * </tool>
 * ```
 * @example (Force remove non-empty directory)
 * ```xml
 * <tool name="remove">
 *   <path>./non_empty_folder</path>
 *   <type>force_recursive</type>
 * </tool>
 * ```
 */
const schema = z.object({
	path: z
		.string()
		.describe("The path of the file or directory to remove (relative to the current working directory)."),
	type: z
		.enum(["file", "directory", "auto", "force_recursive"])
		.optional()
		.default("auto")
		.describe("Specify what type of item to remove. 'auto' will automatically detect the type, 'force_recursive' will forcefully remove non-empty directories. Default is 'auto'."),
	recursive: z
		.boolean()
		.optional()
		.default(true)
		.describe(
			"Whether to remove directories recursively with all contents (applies to directories only). Default is true."
		),
	force: z
		.boolean()
		.optional()
		.describe(
			"Whether to use force flag for filesystem operations. Default is false."
		),
})

const examples = [
	`<tool name="remove">
  <path>./temp/old_file.txt</path>
  <type>file</type>
</tool>`,

	`<tool name="remove">
  <path>./old_project</path>
  <type>directory</type>
  <recursive>true</recursive>
</tool>`,

	`<tool name="remove">
  <path>./temp_files</path>
  <force>true</force>
</tool>`,

	`<tool name="remove">
  <path>./empty_folder</path>
  <type>directory</type>
  <recursive>false</recursive>
</tool>`,

	`<tool name="remove">
  <path>./cache</path>
</tool>`,

	`<tool name="remove">
  <path>./non_empty_folder</path>
  <type>force_recursive</type>
</tool>`,
]

export const removeTool = {
	schema: {
		name: "remove",
		schema,
	},
	examples,
}

export type RemoveToolParams = {
	name: "remove"
	input: z.infer<typeof schema>
}
