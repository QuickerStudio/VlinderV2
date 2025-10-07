import { fileEditorPrompt } from './file-editor';
import { exploreRepoFolderPrompt } from './explore-repo-folder';
import { searchFilesPrompt } from './search-files';
import { searchSymbolPrompt } from './search-symbol';
import { listFilesPrompt } from './list-files';
import { readFilePrompt } from './read-file';
import { executeCommandPrompt } from './execute-command';
import { serverRunnerPrompt } from './server-runner';
import { urlScreenshotPrompt } from './url-screenshot';
import { attemptCompletionPrompt } from './attempt-complete';
import { askFollowupQuestionPrompt } from './ask-followup-question';
import { spawnAgentPrompt } from './spawn-agent';
import { movePrompt } from './move';
import { removePrompt } from './remove';
import { renamePrompt } from './rename';
import { gitBashToolPrompt } from './git-bash';
import { killBashToolPrompt } from './kill-bash';
import { readProgressPrompt } from './read-progress';
import { terminalToolPrompt } from './terminal';
import { getErrorsPrompt } from './get-errors';
import { replaceStringPrompt } from './replace-string';
import { multiReplaceStringPrompt } from './multi-replace-string';
import { insertEditPrompt } from './insert-edit';
import { fetchWebpagePrompt } from './fetch-webpage';
import { vscodeApiPrompt } from './vscode-api';
import { grepSearchPrompt } from './grep-search';
import { getTerminalOutputPrompt } from './get-terminal-output';
import { thinkToolPrompt } from './think';
import { fastEditorToolPrompt } from './fast-editor';
import { timerPrompt } from './timer';
import { patternSearchPrompt } from './pattern-search';

export const toolPrompts = [
	fileEditorPrompt,
	spawnAgentPrompt,
	exploreRepoFolderPrompt,
	readFilePrompt,
	searchFilesPrompt,
	searchSymbolPrompt,
	listFilesPrompt,
	executeCommandPrompt,
	serverRunnerPrompt,
	urlScreenshotPrompt,
	askFollowupQuestionPrompt,
	attemptCompletionPrompt,
	movePrompt,
	removePrompt,
	renamePrompt,
	gitBashToolPrompt,
	killBashToolPrompt,
	readProgressPrompt,
	terminalToolPrompt,
	getErrorsPrompt,
	replaceStringPrompt,
	multiReplaceStringPrompt,
	insertEditPrompt,
	fetchWebpagePrompt,
	vscodeApiPrompt,
	grepSearchPrompt,
	getTerminalOutputPrompt,
	thinkToolPrompt,
	fastEditorToolPrompt,
	timerPrompt,
	patternSearchPrompt,
	// submitReviewPrompt,
];
