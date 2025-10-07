import * as path from 'path';
import * as fs from 'fs/promises';
import { serializeError } from 'serialize-error';
import { getReadablePath } from '../../utils';
import { BaseAgentTool } from '../base-agent.tool';
import { RemoveToolParams } from '../schema/remove';

export class RemoveTool extends BaseAgentTool<RemoveToolParams> {
	async execute() {
		const { input, ask } = this.params;
		let {
			path: targetPath,
			type = 'auto',
			recursive = true,
			force = false,
		} = input;

		if (!targetPath?.trim()) {
			const errorMsg = `
			<remove_response>
				<status>
					<result>error</result>
					<operation>remove</operation>
					<timestamp>${new Date().toISOString()}</timestamp>
				</status>
				<error_details>
					<type>missing_parameter</type>
					<message>Missing required parameter 'path'</message>
					<help>
						<example_usage>
						<action>
						<tool name="remove">
						  <path>./file_or_directory</path>
						</tool>
						</action>
						</example_usage>
						<note>A valid path is required to remove files or directories</note>
					</help>
				</error_details>
			</remove_response>`;
			return this.toolResponse('error', errorMsg);
		}

		try {
			const absolutePath = path.resolve(this.cwd, targetPath);

			// Check if target exists
			let targetStats;
			try {
				targetStats = await fs.stat(absolutePath);
			} catch (error) {
				const errorMsg = `
				<remove_response>
					<status>
						<result>error</result>
						<operation>remove</operation>
						<timestamp>${new Date().toISOString()}</timestamp>
					</status>
					<error_details>
						<type>target_not_found</type>
						<message>Target path '${getReadablePath(targetPath, this.cwd)}' does not exist</message>
						<target_path>${getReadablePath(targetPath, this.cwd)}</target_path>
					</error_details>
				</remove_response>`;
				return this.toolResponse('error', errorMsg);
			}

			// Determine actual type
			const isDirectory = targetStats.isDirectory();
			const isFile = targetStats.isFile();

			if (!isDirectory && !isFile) {
				const errorMsg = `
				<remove_response>
					<status>
						<result>error</result>
						<operation>remove</operation>
						<timestamp>${new Date().toISOString()}</timestamp>
					</status>
					<error_details>
						<type>invalid_target_type</type>
						<message>Target path '${getReadablePath(targetPath, this.cwd)}' is neither a file nor a directory</message>
						<target_path>${getReadablePath(targetPath, this.cwd)}</target_path>
					</error_details>
				</remove_response>`;
				return this.toolResponse('error', errorMsg);
			}

			const actualType: 'file' | 'directory' = isDirectory
				? 'directory'
				: 'file';

			// Handle force_recursive type
			let effectiveType = type;
			let isForceRecursive = false;

			if (type === 'force_recursive') {
				if (!isDirectory) {
					const errorMsg = `
					<remove_response>
						<status>
							<result>error</result>
							<operation>remove</operation>
							<timestamp>${new Date().toISOString()}</timestamp>
						</status>
						<error_details>
							<type>invalid_force_recursive</type>
							<message>force_recursive type can only be used with directories, but target '${getReadablePath(targetPath, this.cwd)}' is a file</message>
							<target_path>${getReadablePath(targetPath, this.cwd)}</target_path>
							<actual_type>${actualType}</actual_type>
						</error_details>
					</remove_response>`;
					return this.toolResponse('error', errorMsg);
				}
				effectiveType = 'directory';
				isForceRecursive = true;
				// Override recursive and force settings for force_recursive
				recursive = true;
				force = true;
			}

			// Validate type parameter if specified (excluding force_recursive which is handled above)
			if (
				effectiveType !== 'auto' &&
				effectiveType !== actualType &&
				type !== 'force_recursive'
			) {
				const errorMsg = `
				<remove_response>
					<status>
						<result>error</result>
						<operation>remove</operation>
						<timestamp>${new Date().toISOString()}</timestamp>
					</status>
					<error_details>
						<type>type_mismatch</type>
						<message>Specified type '${type}' does not match actual type '${actualType}'</message>
						<specified_type>${type}</specified_type>
						<actual_type>${actualType}</actual_type>
					</error_details>
				</remove_response>`;
				return this.toolResponse('error', errorMsg);
			}

			// Check if directory is empty when recursive is false
			if (isDirectory && !recursive) {
				try {
					const entries = await fs.readdir(absolutePath);
					if (entries.length > 0) {
						const errorMsg = `
						<remove_response>
							<status>
								<result>error</result>
								<operation>remove</operation>
								<timestamp>${new Date().toISOString()}</timestamp>
							</status>
							<error_details>
								<type>directory_not_empty</type>
								<message>Directory '${getReadablePath(targetPath, this.cwd)}' is not empty and recursive removal is disabled</message>
								<target_path>${getReadablePath(targetPath, this.cwd)}</target_path>
								<suggestion>Set recursive=true to remove directory with contents</suggestion>
							</error_details>
						</remove_response>`;
						return this.toolResponse('error', errorMsg);
					}
				} catch (error) {
					// If we can't read the directory, we'll let the removal attempt handle it
				}
			}

			// Ask for user approval if not in auto mode
			if (!this.alwaysAllowWriteOnly) {
				const { response } = await ask(
					'tool',
					{
						tool: {
							tool: 'remove',
							path: getReadablePath(targetPath, this.cwd),
							type: actualType,
							recursive: isDirectory ? recursive : undefined,
							force: force ? true : undefined,
							approvalState: 'pending',
							ts: this.ts,
						},
					},
					this.ts
				);

				if (response !== 'yesButtonTapped') {
					await this.params.updateAsk(
						'tool',
						{
							tool: {
								tool: 'remove',
								path: getReadablePath(targetPath, this.cwd),
								type: actualType,
								recursive: isDirectory ? recursive : undefined,
								force: force ? true : undefined,
								approvalState: 'rejected',
								ts: this.ts,
							},
						},
						this.ts
					);

					const errorMsg = `
					<remove_response>
						<status>
							<result>rejected</result>
							<operation>remove</operation>
							<timestamp>${new Date().toISOString()}</timestamp>
						</status>
						<details>
							<message>Remove operation was rejected by user</message>
							<target_path>${getReadablePath(targetPath, this.cwd)}</target_path>
							<type>${actualType}</type>
						</details>
					</remove_response>`;
					return this.toolResponse('error', errorMsg);
				}

				// Update approval state to approved
				await this.params.updateAsk(
					'tool',
					{
						tool: {
							tool: 'remove',
							path: getReadablePath(targetPath, this.cwd),
							type: actualType,
							recursive: isDirectory ? recursive : undefined,
							force: force ? true : undefined,
							approvalState: 'approved',
							ts: this.ts,
						},
					},
					this.ts
				);
			}

			// Perform the remove operation
			if (isDirectory) {
				if (recursive) {
					await fs.rm(absolutePath, { recursive: true, force: true });
				} else {
					await fs.rmdir(absolutePath);
				}
			} else {
				await fs.unlink(absolutePath);
			}

			const successMsg = `
			<remove_response>
				<status>
					<result>success</result>
					<operation>remove</operation>
					<timestamp>${new Date().toISOString()}</timestamp>
				</status>
				<details>
					<message>Successfully removed ${actualType}${isForceRecursive ? ' (force recursive)' : ''}</message>
					<target_path>${getReadablePath(targetPath, this.cwd)}</target_path>
					<type>${actualType}</type>
					${isDirectory ? `<recursive>${recursive}</recursive>` : ''}
					${force ? '<force>true</force>' : ''}
					${isForceRecursive ? '<force_recursive>true</force_recursive>' : ''}
				</details>
			</remove_response>`;

			return this.toolResponse('success', successMsg);
		} catch (error) {
			const errorMsg = `
			<remove_response>
				<status>
					<result>error</result>
					<operation>remove</operation>
					<timestamp>${new Date().toISOString()}</timestamp>
				</status>
				<error_details>
					<type>operation_failed</type>
					<message>Failed to remove: ${error instanceof Error ? error.message : String(error)}</message>
					<target_path>${getReadablePath(targetPath, this.cwd)}</target_path>
					<error>${serializeError(error)}</error>
				</error_details>
			</remove_response>`;
			return this.toolResponse('error', errorMsg);
		}
	}
}
