import { BaseAgentTool } from '../base-agent.tool';
import { TimerToolParams } from '../schema/timer';
import { ToolResponseV2 } from '../../types';
import dedent from 'dedent';

// Timer completion notification interface
export interface TimerCompletionNotification {
	timerId: string;
	timerType: string;
	note?: string;
	duration: number;
	completedAt: number;
}

// Global map to track active timers that can be stopped
const activeTimers = new Map<number, { stopped: boolean; timeoutId?: NodeJS.Timeout; resolve?: () => void }>();

// Static queue for timer completion notifications
let pendingNotifications: TimerCompletionNotification[] = [];

// Timer notification management functions
export function addTimerNotification(notification: TimerCompletionNotification): void {
	pendingNotifications.push(notification);
	console.log(`[TimerTool] Added notification for timer ${notification.timerId}. Queue size: ${pendingNotifications.length}`);
}

export function hasPendingTimerNotifications(): boolean {
	return pendingNotifications.length > 0;
}

export function clearTimerNotifications(): void {
	pendingNotifications = [];
}

export function getTimerNotifications(): TimerCompletionNotification[] {
	return [...pendingNotifications];
}

export function formatTimerNotifications(): string | null {
	if (!hasPendingTimerNotifications()) {
		return null;
	}

	console.log(`[TimerTool] Formatting ${pendingNotifications.length} pending notifications`);

	// Build notification messages
	const notifications = pendingNotifications.map((notification) => {
		const { timerId, note, duration, completedAt } = notification;
		const completedTime = new Date(completedAt).toLocaleTimeString();

		return dedent`
			## Timer Completed: ${timerId} ##
			${note ? `Note: ${note}` : ''}
			Duration: ${duration}s (${Math.floor(duration / 60)}m ${duration % 60}s)
			Completed at: ${completedTime}
			
			The timer has finished running in the background.
		`;
	});

	// Clear notifications after processing
	clearTimerNotifications();

	// Join all notifications
	const message = dedent`
		# System Notification: Background Timer(s) Completed #
		
		${notifications.join('\n\n---\n\n')}
		
		# End of Timer Notifications #
	`;

	console.log(`[TimerTool] Formatted timer notifications for AI injection`);
	return message;
}

// Function to stop a timer by timestamp
export function stopTimerByTimestamp(timestamp: number): boolean {
	const timer = activeTimers.get(timestamp);
	if (timer) {
		timer.stopped = true;
		if (timer.timeoutId) {
			clearTimeout(timer.timeoutId);
		}
        // Resolve the pending wait promise to unblock the tool execution
        if (typeof timer.resolve === 'function') {
            try {
                timer.resolve();
            } catch {}
        }
		activeTimers.delete(timestamp);
		return true;
	}
	return false;
}

export class TimerTool extends BaseAgentTool<TimerToolParams> {
	async execute(): Promise<ToolResponseV2> {
		const { duration = 0, note, showLocalTime = false } = this.params.input;
		const { updateAsk } = this.params;

		console.log(`[TimerTool] execute() called with params:`, { duration, note, showLocalTime, ts: this.ts });

		// ✅ FIX: If showLocalTime is true, send local_time tool type directly WITHOUT showing timer UI first
		if (showLocalTime) {
			console.log(`[TimerTool] showLocalTime=true, sending local_time tool type directly (ts: ${this.ts})`);

			const currentTime = Date.now();
			const localTimeString = new Date(currentTime).toLocaleString('en-US', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				hour12: false
			});

			// Send local_time tool type (not timer) to avoid any confusion
			// ✅ CRITICAL: Do NOT send timer UI update before this - go directly to local_time
			await updateAsk(
				'tool',
				{
					tool: {
						tool: 'local_time',  // ✅ Clean tool type
						note,
						localTime: currentTime,
						approvalState: 'approved',
						ts: this.ts,
					},
				},
				this.ts
			);

			console.log(`[TimerTool] local_time tool sent successfully (ts: ${this.ts})`);

			return this.toolResponse(
				'success',
				`Current local time: ${localTimeString}${note ? ` (${note})` : ''}`
			);
		}

		console.log(`[TimerTool] showLocalTime=false, executing countdown timer (ts: ${this.ts})`);


		// ✅ Only execute countdown timer logic if showLocalTime is false
		// Validate duration for countdown timer
		if (duration <= 0) {
			return this.toolResponse('error', 'duration must be a positive number for countdown timer');
		}

		// Maximum duration: 24 hours (86400 seconds)
		if (duration > 86400) {
			return this.toolResponse(
				'error',
				'duration cannot exceed 86400 seconds (24 hours). Please use a shorter duration.'
			);
		}

		// Warning for long durations
		if (duration > 3600) {
			console.warn(`[Timer] Long duration detected: ${duration}s (${Math.floor(duration / 3600)} hours ${Math.floor((duration % 3600) / 60)} minutes)`);
		}

		const startTime = Date.now();
		const endTime = startTime + duration * 1000;

		// Register this timer as active
		const timerInfo: { stopped: boolean; timeoutId?: NodeJS.Timeout } = { stopped: false };
		activeTimers.set(this.ts, timerInfo);

		// Show timer UI with loading state
		await updateAsk(
			'tool',
			{
				tool: {
					tool: 'timer',
					duration,
					note,
					startTime,
					endTime,
					timerStatus: 'running',
					approvalState: 'loading',
					ts: this.ts,
				},
			},
			this.ts
		);

		// Wait for the specified duration with ability to be interrupted
        await new Promise<void>((resolve) => {
			const timeoutId = setTimeout(() => {
				resolve();
			}, duration * 1000);

			// Store timeout ID so it can be cleared if stopped
            timerInfo.timeoutId = timeoutId;
            // Store resolve to allow external stop to unblock the promise
            (timerInfo as { resolve?: () => void }).resolve = resolve;
		});

		// Check if timer was stopped
		if (timerInfo.stopped) {
			activeTimers.delete(this.ts);

			// Update to approved state with stopped status
			await updateAsk(
				'tool',
				{
					tool: {
						tool: 'timer',
						duration,
						note,
						startTime,
						endTime,
						timerStatus: 'stopped',
						approvalState: 'approved',
						ts: this.ts,
					},
				},
				this.ts
			);

			return this.toolResponse(
				'success',
				`Timer stopped by user after ${Math.floor((Date.now() - startTime) / 1000)} seconds.${note ? ` Note: ${note}` : ''}`
			);
		}

		// Clean up
		activeTimers.delete(this.ts);

		// Add completion notification for AI
		addTimerNotification({
			timerId: `timer_${this.ts}`,
			timerType: 'countdown',
			note,
			duration,
			completedAt: Date.now(),
		});

		// Update to completed state
		await updateAsk(
			'tool',
			{
				tool: {
					tool: 'timer',
					duration,
					note,
					startTime,
					endTime,
					timerStatus: 'completed',
					approvalState: 'approved',
					ts: this.ts,
				},
			},
			this.ts
		);

		return this.toolResponse(
			'success',
			`Timer completed. Waited for ${duration} seconds.${note ? ` Note: ${note}` : ''}`
		);
	}
}

