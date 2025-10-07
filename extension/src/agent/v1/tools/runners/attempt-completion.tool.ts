import { attemptCompletionPrompt } from '../../prompts/tools/attempt-complete';
import { BaseAgentTool } from '../base-agent.tool';
import { AttemptCompletionToolParams } from '../schema/attempt_completion';

export class AttemptCompletionTool extends BaseAgentTool<AttemptCompletionToolParams> {
	async execute() {
		const { input, ask, say } = this.params;
		const { result } = input;

		if (result === undefined) {
			await say(
				'error',
				"Vlinder tried to use attempt_completion without value for required parameter 'result'. Retrying..."
			);
			const errorMsg = `
			<completion_tool_response>
				<status>
					<result>error</result>
					<operation>attempt_completion</operation>
					<timestamp>${new Date().toISOString()}</timestamp>
				</status>
				<error_details>
					<type>missing_parameter</type>
					<message>Missing required parameter 'result'</message>
					<help>
						<example_usage>
						<action>${attemptCompletionPrompt.examples[0].output}</action>
						</example_usage>
						<note>Completion attempts require a valid result parameter to proceed</note>
					</help>
				</error_details>
			</completion_tool_response>`;
			return this.toolResponse('error', errorMsg);
		}

		let resultToSend = result;

		const { response, text, images } = await ask(
			'tool',
			{
				tool: {
					tool: 'attempt_completion',
					result: resultToSend,
					approvalState: 'pending',
					ts: this.ts,
				},
			},
			this.ts,
			true
		);
		if (response === 'yesButtonTapped') {
			await this.MainAgent.providerRef
				.deref()
				?.getTaskManager()
				?.markTaskAsCompleted(this.MainAgent.getStateManager().taskId, {
					manual: true,
				});

			await this.params.updateAsk(
				'tool',
				{
					tool: {
						tool: 'attempt_completion',
						result: resultToSend,
						approvalState: 'approved',
						ts: this.ts,
					},
				},
				this.ts
			);
			return this.toolResponse(
				'success',
				`<completion_tool_response>
					<status>
						<result>success</result>
						<operation>attempt_completion</operation>
						<timestamp>${new Date().toISOString()}</timestamp>
					</status>
					<completion_details>
						<state>approved</state>
						<message>The user is happy with the results</message>
						${images ? `<has_images>true</has_images>` : '<has_images>false</has_images>'}
					</completion_details>
				</completion_tool_response>`,
				images
			);
		}

		await this.params.updateAsk(
			'tool',
			{
				tool: {
					tool: 'attempt_completion',
					result: resultToSend,
					approvalState: 'rejected',
					ts: this.ts,
					userFeedback: response === 'noButtonTapped' ? undefined : text,
				},
			},
			this.ts
		);

		await say('user_feedback', text ?? '', images);
		return this.toolResponse(
			'feedback',
			`<completion_tool_response>
				<status>
					<result>feedback</result>
					<operation>attempt_completion</operation>
					<timestamp>${new Date().toISOString()}</timestamp>
				</status>
				<feedback_details>
					<state>needs_improvement</state>
					<message>The user is not pleased with the results</message>
					<action_required>The user has rejected your completion attempt. You must address their feedback by making the necessary changes first. Do NOT call attempt_completion again immediately - you should only use this tool ONCE per completion attempt after implementing all requested improvements.</action_required>
					<user_feedback>Here is the user feedback - you must address these concerns before attempting completion again:\`\`\`
					${text || 'No specific feedback provided'}
					${images ? `<has_images>true</has_images>` : '<has_images>false</has_images>'}
					\`\`\`
					</user_feedback>
				</feedback_details>
			</completion_tool_response>`,
			images
		);
	}
}
