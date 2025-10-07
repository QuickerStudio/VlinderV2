import { amplitudeTracker } from '.';
import { AmplitudeWebviewMessage } from '../../shared/messages/client-message';

export class AmplitudeWebviewManager {
	static handleMessage(message: AmplitudeWebviewMessage) {
		switch (message.event_type) {
			case 'ReferralProgram':
				amplitudeTracker.referralProgramClick();
				break;
			case 'AuthStart':
				amplitudeTracker.authStart();
				break;
		}
	}
}
