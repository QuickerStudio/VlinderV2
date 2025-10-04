import { fileEditorPrompt } from "./file-editor"
import { exploreRepoFolderPrompt } from "./explore-repo-folder"
import { searchFilesPrompt } from "./search-files"
import { searchSymbolPrompt } from "./search-symbol"
import { listFilesPrompt } from "./list-files"
import { readFilePrompt } from "./read-file"
import { executeCommandPrompt } from "./execute-command"
import { serverRunnerPrompt } from "./server-runner"
import { urlScreenshotPrompt } from "./url-screenshot"
import { webFetchPrompt } from "./web-fetch"
import { attemptCompletionPrompt } from "./attempt-complete"
import { askFollowupQuestionPrompt } from "./ask-followup-question"
import { spawnAgentPrompt } from "./spawn-agent"
import { movePrompt } from "./move"
import { removePrompt } from "./remove"
import { renamePrompt } from "./rename"
import { gitBashToolPrompt } from "./git-bash"
import { killBashToolPrompt } from "./kill-bash"
import { readProgressPrompt } from "./read-progress"
import { terminalToolPrompt } from "./terminal"

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
	webFetchPrompt,
	askFollowupQuestionPrompt,
	attemptCompletionPrompt,
	movePrompt,
	removePrompt,
	renamePrompt,
	gitBashToolPrompt,
	killBashToolPrompt,
	readProgressPrompt,
	terminalToolPrompt,
	// submitReviewPrompt,
]
