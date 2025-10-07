import { z } from 'zod';

/**
 * @tool timer
 * @description Create a simple timer that waits for a specific duration, or display local time.
 * The AI will be blocked until the timer completes (if duration is provided).
 *
 * Maximum duration: 24 hours (86400 seconds).
 * @schema
 * {
 *   duration?: number;        // Duration in seconds (max 86400). If 0 or not provided with showLocalTime=true, shows local time only
 *   note?: string;            // Optional: Note/description for this timer
 *   showLocalTime?: boolean;  // Optional: If true, displays local time instead of countdown
 * }
 * @example Simple Timer
 * ```xml
 * <tool name="timer">
 *   <duration>300</duration>
 *   <note>Wait for 5 minutes</note>
 * </tool>
 * ```
 * @example Local Time Display
 * ```xml
 * <tool name="timer">
 *   <showLocalTime>true</showLocalTime>
 *   <note>Current local time</note>
 * </tool>
 * ```
 */
const schema = z.object({
	duration: z
		.number()
		.nonnegative()
		.max(86400)
		.optional()
		.default(0)
		.describe('Duration in seconds. Maximum: 86400 seconds (24 hours). Use 0 or omit for local time display.'),
	note: z
		.string()
		.optional()
		.describe('Optional: Note/description for this timer.'),
	showLocalTime: z
		.union([z.boolean(), z.string()])
		.optional()
		.default(false)
		.transform((val) => {
			// Convert string "true"/"false" to boolean
			if (typeof val === 'string') {
				return val.toLowerCase() === 'true';
			}
			return val;
		})
		.describe('Optional: If true, displays local time instead of countdown timer.'),
});

const examples = [
	`<tool name="timer">
  <duration>300</duration>
  <note>Wait for 5 minutes</note>
</tool>`,
	`<tool name="timer">
  <showLocalTime>true</showLocalTime>
  <note>Display current local time</note>
</tool>`,
];

export const timerTool = {
	schema: {
		name: 'timer',
		schema,
	},
	examples,
};

export type TimerToolParams = {
	name: 'timer';
	input: z.infer<typeof schema>;
};

