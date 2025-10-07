import * as path from 'path';
import * as fs from 'fs/promises';
import { serializeError } from 'serialize-error';
import { getReadablePath } from '../../utils';
import { BaseAgentTool } from '../base-agent.tool';
import { RenameToolParams } from '../schema/rename';

export class RenameTool extends BaseAgentTool<RenameToolParams> {
	async execute() {
		const { input, ask, say } = this.params;
		const {
			path: targetPath,
			new_name,
			type = 'auto',
			overwrite = false,
		} = input;

		if (!targetPath?.trim()) {
			await say(
				'error',
				"Vlinder tried to use rename without value for required parameter 'path'. Retrying..."
			);
			const errorMsg = `
			<rename_response>
				<status>
					<result>error</result>
					<operation>rename</operation>
					<timestamp>${new Date().toISOString()}</timestamp>
				</status>
				<error_details>
					<type>missing_parameter</type>
					<message>Missing required parameter 'path'</message>
					<help>
						<example_usage>
						<action>
						<tool name="rename">
						  <path>./old_name.txt</path>
						  <new_name>new_name.txt</new_name>
						</tool>
						</action>
						</example_usage>
						<note>A valid path is required to rename files or directories</note>
					</help>
				</error_details>
			</rename_response>`;
			return this.toolResponse('error', errorMsg);
		}

		if (!new_name?.trim()) {
			await say(
				'error',
				"Vlinder tried to use rename without value for required parameter 'new_name'. Retrying..."
			);
			const errorMsg = `
			<rename_response>
				<status>
					<result>error</result>
					<operation>rename</operation>
					<timestamp>${new Date().toISOString()}</timestamp>
				</status>
				<error_details>
					<type>missing_parameter</type>
					<message>Missing required parameter 'new_name'</message>
					<help>
						<example_usage>
						<action>
						<tool name="rename">
						  <path>./old_name.txt</path>
						  <new_name>new_name.txt</new_name>
						</tool>
						</action>
						</example_usage>
						<note>A valid new name is required to rename files or directories</note>
					</help>
				</error_details>
			</rename_response>`;
			return this.toolResponse('error', errorMsg);
		}

		try {
			const absoluteTargetPath = path.resolve(this.cwd, targetPath);
			const targetDir = path.dirname(absoluteTargetPath);
			const absoluteNewPath = path.join(targetDir, new_name);

			// Check if source exists
			let targetStats;
			try {
				targetStats = await fs.stat(absoluteTargetPath);
			} catch (error) {
				await say(
					'error',
					`Target path does not exist: ${getReadablePath(targetPath, this.cwd)}`
				);
				const errorMsg = `
				<rename_response>
					<status>
						<result>error</result>
						<operation>rename</operation>
						<timestamp>${new Date().toISOString()}</timestamp>
					</status>
					<error_details>
						<type>target_not_found</type>
						<message>Target path '${getReadablePath(targetPath, this.cwd)}' does not exist</message>
						<target_path>${getReadablePath(targetPath, this.cwd)}</target_path>
					</error_details>
				</rename_response>`;
				return this.toolResponse('error', errorMsg);
			}

			// Determine actual type
			const isDirectory = targetStats.isDirectory();
			const isFile = targetStats.isFile();

			if (!isDirectory && !isFile) {
				await say(
					'error',
					`Target path is neither a file nor a directory: ${getReadablePath(targetPath, this.cwd)}`
				);
				const errorMsg = `
				<rename_response>
					<status>
						<result>error</result>
						<operation>rename</operation>
						<timestamp>${new Date().toISOString()}</timestamp>
					</status>
					<error_details>
						<type>invalid_target_type</type>
						<message>Target path '${getReadablePath(targetPath, this.cwd)}' is neither a file nor a directory</message>
						<target_path>${getReadablePath(targetPath, this.cwd)}</target_path>
					</error_details>
				</rename_response>`;
				return this.toolResponse('error', errorMsg);
			}

			const actualType: 'file' | 'directory' = isDirectory
				? 'directory'
				: 'file';

			// Validate type parameter if specified
			if (type !== 'auto' && type !== actualType) {
				await say(
					'error',
					`Type mismatch: specified '${type}' but target is a '${actualType}'`
				);
				const errorMsg = `
				<rename_response>
					<status>
						<result>error</result>
						<operation>rename</operation>
						<timestamp>${new Date().toISOString()}</timestamp>
					</status>
					<error_details>
						<type>type_mismatch</type>
						<message>Specified type '${type}' does not match actual type '${actualType}'</message>
						<specified_type>${type}</specified_type>
						<actual_type>${actualType}</actual_type>
					</error_details>
				</rename_response>`;
				return this.toolResponse('error', errorMsg);
			}

			// Check if destination already exists
			let destinationExists = false;
			try {
				await fs.stat(absoluteNewPath);
				destinationExists = true;
			} catch (error) {
				// Destination doesn't exist, which is fine
			}

			// Handle conflicts
			if (destinationExists && !overwrite) {
				await say(
					'error',
					`A ${actualType} with the name '${new_name}' already exists and overwrite is not enabled`
				);
				const errorMsg = `
				<rename_response>
					<status>
						<result>error</result>
						<operation>rename</operation>
						<timestamp>${new Date().toISOString()}</timestamp>
					</status>
					<error_details>
						<type>destination_exists</type>
						<message>A ${actualType} with the name '${new_name}' already exists and overwrite is not enabled</message>
						<new_name>${new_name}</new_name>
						<suggestion>Set overwrite=true to replace the existing ${actualType}</suggestion>
					</error_details>
				</rename_response>`;
				return this.toolResponse('error', errorMsg);
			}

			// Ask for user approval if not in auto mode
			if (!this.alwaysAllowWriteOnly) {
				const { response } = await ask(
					'tool',
					{
						tool: {
							tool: 'rename',
							path: getReadablePath(targetPath, this.cwd),
							new_name,
							type: actualType,
							overwrite: destinationExists ? overwrite : undefined,
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
								tool: 'rename',
								path: getReadablePath(targetPath, this.cwd),
								new_name,
								type: actualType,
								overwrite: destinationExists ? overwrite : undefined,
								approvalState: 'rejected',
								ts: this.ts,
							},
						},
						this.ts
					);

					const errorMsg = `
					<rename_response>
						<status>
							<result>rejected</result>
							<operation>rename</operation>
							<timestamp>${new Date().toISOString()}</timestamp>
						</status>
						<details>
							<message>Rename operation was rejected by user</message>
							<target_path>${getReadablePath(targetPath, this.cwd)}</target_path>
							<new_name>${new_name}</new_name>
							<type>${actualType}</type>
						</details>
					</rename_response>`;
					return this.toolResponse('error', errorMsg);
				}

				// Update approval state to approved
				await this.params.updateAsk(
					'tool',
					{
						tool: {
							tool: 'rename',
							path: getReadablePath(targetPath, this.cwd),
							new_name,
							type: actualType,
							overwrite: destinationExists ? overwrite : undefined,
							approvalState: 'approved',
							ts: this.ts,
						},
					},
					this.ts
				);
			}

			// Perform the rename operation
			await fs.rename(absoluteTargetPath, absoluteNewPath);

			const successMsg = `
			<rename_response>
				<status>
					<result>success</result>
					<operation>rename</operation>
					<timestamp>${new Date().toISOString()}</timestamp>
				</status>
				<details>
					<message>Successfully renamed ${actualType}</message>
					<old_path>${getReadablePath(targetPath, this.cwd)}</old_path>
					<new_path>${getReadablePath(path.join(path.dirname(targetPath), new_name), this.cwd)}</new_path>
					<new_name>${new_name}</new_name>
					<type>${actualType}</type>
					${destinationExists && overwrite ? '<overwrite>true</overwrite>' : ''}
				</details>
			</rename_response>`;

			return this.toolResponse('success', successMsg);
		} catch (error) {
			const errorMsg = `
			<rename_response>
				<status>
					<result>error</result>
					<operation>rename</operation>
					<timestamp>${new Date().toISOString()}</timestamp>
				</status>
				<error_details>
					<type>operation_failed</type>
					<message>Failed to rename: ${error instanceof Error ? error.message : String(error)}</message>
					<target_path>${getReadablePath(targetPath, this.cwd)}</target_path>
					<new_name>${new_name}</new_name>
					<error>${serializeError(error)}</error>
				</error_details>
			</rename_response>`;
			return this.toolResponse('error', errorMsg);
		}
	}
}
