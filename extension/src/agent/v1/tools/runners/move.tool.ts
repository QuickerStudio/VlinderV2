import * as path from "path"
import * as fs from "fs/promises"
import { serializeError } from "serialize-error"
import { getReadablePath } from "../../utils"
import { BaseAgentTool } from "../base-agent.tool"
import { MoveToolParams } from "../schema/move"

export class MoveTool extends BaseAgentTool<MoveToolParams> {
	async execute() {
		const { input, ask, say } = this.params
		const { source_path, destination_path, type = "auto", overwrite = false, merge = false } = input

		if (!source_path?.trim()) {
			await say("error", "Vlinder tried to use move without value for required parameter 'source_path'. Retrying...")
			const errorMsg = `
			<move_response>
				<status>
					<result>error</result>
					<operation>move</operation>
					<timestamp>${new Date().toISOString()}</timestamp>
				</status>
				<error_details>
					<type>missing_parameter</type>
					<message>Missing required parameter 'source_path'</message>
					<help>
						<example_usage>
						<action>
						<tool name="move">
						  <source_path>./old_location/file.txt</source_path>
						  <destination_path>./new_location/file.txt</destination_path>
						</tool>
						</action>
						</example_usage>
						<note>A valid source path is required to move files or directories</note>
					</help>
				</error_details>
			</move_response>`
			return this.toolResponse("error", errorMsg)
		}

		if (!destination_path?.trim()) {
			await say("error", "Vlinder tried to use move without value for required parameter 'destination_path'. Retrying...")
			const errorMsg = `
			<move_response>
				<status>
					<result>error</result>
					<operation>move</operation>
					<timestamp>${new Date().toISOString()}</timestamp>
				</status>
				<error_details>
					<type>missing_parameter</type>
					<message>Missing required parameter 'destination_path'</message>
					<help>
						<example_usage>
						<action>
						<tool name="move">
						  <source_path>./source/item</source_path>
						  <destination_path>./destination/item</destination_path>
						</tool>
						</action>
						</example_usage>
						<note>A valid destination path is required to move files or directories</note>
					</help>
				</error_details>
			</move_response>`
			return this.toolResponse("error", errorMsg)
		}

		try {
			const absoluteSourcePath = path.resolve(this.cwd, source_path)
			const absoluteDestinationPath = path.resolve(this.cwd, destination_path)

			// Check if source exists
			let sourceStats
			try {
				sourceStats = await fs.stat(absoluteSourcePath)
			} catch (error) {
				await say("error", `Source path does not exist: ${getReadablePath(source_path, this.cwd)}`)
				const errorMsg = `
				<move_response>
					<status>
						<result>error</result>
						<operation>move</operation>
						<timestamp>${new Date().toISOString()}</timestamp>
					</status>
					<error_details>
						<type>source_not_found</type>
						<message>Source path '${getReadablePath(source_path, this.cwd)}' does not exist</message>
						<source_path>${getReadablePath(source_path, this.cwd)}</source_path>
					</error_details>
				</move_response>`
				return this.toolResponse("error", errorMsg)
			}

			// Determine actual type
			const isDirectory = sourceStats.isDirectory()
			const isFile = sourceStats.isFile()

			if (!isDirectory && !isFile) {
				await say("error", `Source path is neither a file nor a directory: ${getReadablePath(source_path, this.cwd)}`)
				const errorMsg = `
				<move_response>
					<status>
						<result>error</result>
						<operation>move</operation>
						<timestamp>${new Date().toISOString()}</timestamp>
					</status>
					<error_details>
						<type>invalid_source_type</type>
						<message>Source path '${getReadablePath(source_path, this.cwd)}' is neither a file nor a directory</message>
						<source_path>${getReadablePath(source_path, this.cwd)}</source_path>
					</error_details>
				</move_response>`
				return this.toolResponse("error", errorMsg)
			}

			const actualType: "file" | "directory" = isDirectory ? "directory" : "file"

			// Validate type parameter if specified
			if (type !== "auto" && type !== actualType) {
				await say("error", `Type mismatch: specified '${type}' but source is a '${actualType}'`)
				const errorMsg = `
				<move_response>
					<status>
						<result>error</result>
						<operation>move</operation>
						<timestamp>${new Date().toISOString()}</timestamp>
					</status>
					<error_details>
						<type>type_mismatch</type>
						<message>Specified type '${type}' does not match actual type '${actualType}'</message>
						<specified_type>${type}</specified_type>
						<actual_type>${actualType}</actual_type>
					</error_details>
				</move_response>`
				return this.toolResponse("error", errorMsg)
			}

			// Check if destination exists
			let destinationExists = false
			let destinationStats
			try {
				destinationStats = await fs.stat(absoluteDestinationPath)
				destinationExists = true
			} catch (error) {
				// Destination doesn't exist, which is fine
			}

			// Handle conflicts
			if (destinationExists) {
				if (isFile && !overwrite) {
					await say("error", `Destination file already exists and overwrite is not enabled`)
					const errorMsg = `
					<move_response>
						<status>
							<result>error</result>
							<operation>move</operation>
							<timestamp>${new Date().toISOString()}</timestamp>
						</status>
						<error_details>
							<type>destination_exists</type>
							<message>Destination file already exists and overwrite is not enabled</message>
							<destination_path>${getReadablePath(destination_path, this.cwd)}</destination_path>
							<suggestion>Set overwrite=true to replace the existing file</suggestion>
						</error_details>
					</move_response>`
					return this.toolResponse("error", errorMsg)
				}

				if (isDirectory && !merge) {
					await say("error", `Destination directory already exists and merge is not enabled`)
					const errorMsg = `
					<move_response>
						<status>
							<result>error</result>
							<operation>move</operation>
							<timestamp>${new Date().toISOString()}</timestamp>
						</status>
						<error_details>
							<type>destination_exists</type>
							<message>Destination directory already exists and merge is not enabled</message>
							<destination_path>${getReadablePath(destination_path, this.cwd)}</destination_path>
							<suggestion>Set merge=true to merge with the existing directory</suggestion>
						</error_details>
					</move_response>`
					return this.toolResponse("error", errorMsg)
				}
			}

			// Ask for user approval if not in auto mode
			if (!this.alwaysAllowWriteOnly) {
				const { response } = await ask(
					"tool",
					{
						tool: {
							tool: "move",
							source_path: getReadablePath(source_path, this.cwd),
							destination_path: getReadablePath(destination_path, this.cwd),
							type: actualType,
							overwrite: isFile ? overwrite : undefined,
							merge: isDirectory ? merge : undefined,
							approvalState: "pending",
							ts: this.ts,
						},
					},
					this.ts
				)

				if (response !== "yesButtonTapped") {
					await this.params.updateAsk(
						"tool",
						{
							tool: {
								tool: "move",
								source_path: getReadablePath(source_path, this.cwd),
								destination_path: getReadablePath(destination_path, this.cwd),
								type: actualType,
								overwrite: isFile ? overwrite : undefined,
								merge: isDirectory ? merge : undefined,
								approvalState: "rejected",
								ts: this.ts,
							},
						},
						this.ts
					)

					const errorMsg = `
					<move_response>
						<status>
							<result>rejected</result>
							<operation>move</operation>
							<timestamp>${new Date().toISOString()}</timestamp>
						</status>
						<details>
							<message>Move operation was rejected by user</message>
							<source_path>${getReadablePath(source_path, this.cwd)}</source_path>
							<destination_path>${getReadablePath(destination_path, this.cwd)}</destination_path>
							<type>${actualType}</type>
						</details>
					</move_response>`
					return this.toolResponse("error", errorMsg)
				}

				// Update approval state to approved
				await this.params.updateAsk(
					"tool",
					{
						tool: {
							tool: "move",
							source_path: getReadablePath(source_path, this.cwd),
							destination_path: getReadablePath(destination_path, this.cwd),
							type: actualType,
							overwrite: isFile ? overwrite : undefined,
							merge: isDirectory ? merge : undefined,
							approvalState: "approved",
							ts: this.ts,
						},
					},
					this.ts
				)
			}

			// Create destination directory if needed
			const destinationDir = path.dirname(absoluteDestinationPath)
			await fs.mkdir(destinationDir, { recursive: true })

			// Perform the move operation
			if (isDirectory && merge && destinationExists) {
				// For directory merge, we need to move contents individually
				await this.mergeDirectories(absoluteSourcePath, absoluteDestinationPath)
			} else {
				// Simple move/rename operation
				await fs.rename(absoluteSourcePath, absoluteDestinationPath)
			}

			const successMsg = `
			<move_response>
				<status>
					<result>success</result>
					<operation>move</operation>
					<timestamp>${new Date().toISOString()}</timestamp>
				</status>
				<details>
					<message>Successfully moved ${actualType}</message>
					<source_path>${getReadablePath(source_path, this.cwd)}</source_path>
					<destination_path>${getReadablePath(destination_path, this.cwd)}</destination_path>
					<type>${actualType}</type>
					${isFile && overwrite ? '<overwrite>true</overwrite>' : ''}
					${isDirectory && merge ? '<merge>true</merge>' : ''}
				</details>
			</move_response>`

			return this.toolResponse("success", successMsg)

		} catch (error) {
			const errorMsg = `
			<move_response>
				<status>
					<result>error</result>
					<operation>move</operation>
					<timestamp>${new Date().toISOString()}</timestamp>
				</status>
				<error_details>
					<type>operation_failed</type>
					<message>Failed to move: ${error instanceof Error ? error.message : String(error)}</message>
					<source_path>${getReadablePath(source_path, this.cwd)}</source_path>
					<destination_path>${getReadablePath(destination_path, this.cwd)}</destination_path>
					<error>${serializeError(error)}</error>
				</error_details>
			</move_response>`
			return this.toolResponse("error", errorMsg)
		}
	}

	private async mergeDirectories(sourcePath: string, destinationPath: string): Promise<void> {
		const entries = await fs.readdir(sourcePath, { withFileTypes: true })
		
		for (const entry of entries) {
			const sourceEntryPath = path.join(sourcePath, entry.name)
			const destEntryPath = path.join(destinationPath, entry.name)
			
			if (entry.isDirectory()) {
				await fs.mkdir(destEntryPath, { recursive: true })
				await this.mergeDirectories(sourceEntryPath, destEntryPath)
				await fs.rmdir(sourceEntryPath)
			} else {
				await fs.rename(sourceEntryPath, destEntryPath)
			}
		}
		
		// Remove the now-empty source directory
		await fs.rmdir(sourcePath)
	}
}
