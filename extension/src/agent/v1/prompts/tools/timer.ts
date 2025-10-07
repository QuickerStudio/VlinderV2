import { ToolPromptSchema } from '../utils/utils';

export const timerPrompt: ToolPromptSchema = {
	name: 'timer',
	description:
		'Create a simple timer that waits for a specific duration, or display the current local time. The AI will be blocked until the timer completes (if duration is provided). Maximum duration: 24 hours (86400 seconds).',
	parameters: {
		duration: {
			type: 'number',
			description:
				'Duration in seconds. Maximum: 86400 seconds (24 hours). Use 0 or omit for local time display.',
			required: false,
		},
		note: {
			type: 'string',
			description:
				'Optional: Note/description for this timer.',
			required: false,
		},
		showLocalTime: {
			type: 'boolean',
			description:
				'Optional: If true, displays current local time instead of countdown timer. IMPORTANT: When showLocalTime is true, do NOT set duration parameter.',
			required: false,
		},
	},
	capabilities: [
		'Set a timer for a specific duration. Timer waits for the full duration before completing.',
		'Display current local time by setting showLocalTime to true (do NOT set duration when using this).',
		'Maximum duration is 86400 seconds (24 hours).',
		'Use NOTE parameter to describe the purpose of the timer.',
	],
	examples: [
		{
			description: 'Simple timer: Wait for 5 minutes',
			output: `<timer>
<duration>300</duration>
<note>Wait for 5 minutes</note>
</timer>`,
		},
		{
			description: 'Display current local time',
			output: `<timer>
<showLocalTime>true</showLocalTime>
<note>Current local time</note>
</timer>`,
		},
	],
};

