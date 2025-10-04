import { ToolPromptSchema } from "../utils/utils"

export const gitBashToolPrompt: ToolPromptSchema = {
	name: "git_bash",
	description:
		"Executes commands in Git Bash shell environment. Git Bash provides a Unix-like command-line environment on Windows with Git tools and common Unix utilities (grep, find, sed, awk, curl, jq, etc.). Uses VSCode's Shell Integration API for reliable command execution with accurate exit codes and output capture. Commands are executed from the workspace root: {{cwd}}",
	parameters: {
		command: {
			type: "string",
			description:
				"The Git Bash command to execute. Can use Unix utilities like grep, find, sed, awk, curl, jq, git, ssh, etc. Supports pipes, redirects, and command chaining.",
			required: true,
		},
		timeout: {
			type: "number",
			description:
				"Maximum execution time in milliseconds. Default is 300000 (5 minutes). Increase for long-running commands like builds or downloads.",
			required: false,
		},
		captureOutput: {
			type: "boolean",
			description:
				"Whether to capture and return command output. Default is true. Set to false for commands that don't produce useful output or for long-running processes.",
			required: false,
		},
	},
	capabilities: [
		"Uses VSCode's official Terminal Shell Integration API for reliable command execution",
		"Automatically detects Git Bash installation on Windows",
		"Captures accurate exit codes from commands (when shell integration is available)",
		"Streams command output in real-time using the shell integration API",
		"Supports all Unix utilities included with Git Bash (grep, find, sed, awk, curl, wget, ssh, etc.)",
		"Supports Git commands and operations",
		"Supports pipes, redirects, and command chaining (|, >, >>, &&, ||, ;)",
		"Configurable timeout for long-running commands",
		"Automatic ANSI escape sequence cleaning for readable output",
		"Graceful fallback when shell integration is unavailable",
		"Only available on Windows systems with Git Bash installed",
		"Shell integration may not be immediately available for new terminals (waits up to 5 seconds)",
		"Without shell integration, exit codes and output capture are not available",
		"Interactive commands (requiring user input) are not supported",
		"Commands that open GUI applications may not work as expected",
		"Long-running commands should increase timeout or use terminal tool with captureOutput=false",
		"Some Windows-specific commands may not work in Git Bash environment",
		"Best Practice: Use Git Bash for Unix-style file operations (grep, find, sed, awk)",
		"Best Practice: Use Git Bash for Git operations and repository management",
		"Best Practice: Use Git Bash for curl/wget downloads and API calls",
		"Best Practice: Check for <exitCode>0</exitCode> in results to verify command success",
		"Best Practice: Look for <status>executed_without_integration</status> to understand if shell integration was used",
		"Best Practice: Increase timeout for long-running commands (builds, downloads, tests)",
		"Best Practice: Use absolute paths or ensure correct working directory for file operations",
		"Best Practice: Avoid interactive commands - use non-interactive flags when available",
		"Best Practice: For very long-running processes, consider using terminal tool instead",
		"Best Practice: Use jq for JSON processing in Git Bash (included with Git for Windows)",
	],
	examples: [
		{
			description: "Search for TODO comments in source files",
			output: `<git_bash>
  <command>grep -r "TODO" ./src --include="*.ts" --include="*.tsx"</command>
</git_bash>`,
		},
		{
			description: "Find all JavaScript files modified in the last 7 days",
			output: `<git_bash>
  <command>find ./src -name "*.js" -mtime -7 -type f</command>
</git_bash>`,
		},
		{
			description: "Count lines of code in TypeScript files",
			output: `<git_bash>
  <command>find ./src -name "*.ts" -exec wc -l {} + | tail -1</command>
</git_bash>`,
		},
		{
			description: "Get GitHub repository information using curl and jq",
			output: `<git_bash>
  <command>curl -sL https://api.github.com/repos/microsoft/vscode | jq '.stargazers_count, .forks_count'</command>
</git_bash>`,
		},
		{
			description: "Check Git repository status",
			output: `<git_bash>
  <command>git status --short</command>
</git_bash>`,
		},
		{
			description: "List recent Git commits",
			output: `<git_bash>
  <command>git log --oneline -10</command>
</git_bash>`,
		},
		{
			description: "Run a build command with extended timeout",
			output: `<git_bash>
  <command>npm run build</command>
  <timeout>600000</timeout>
</git_bash>`,
		},
		{
			description: "Replace text in multiple files using sed",
			output: `<git_bash>
  <command>find ./src -name "*.ts" -exec sed -i 's/oldText/newText/g' {} +</command>
</git_bash>`,
		},
		{
			description: "Download a file using curl",
			output: `<git_bash>
  <command>curl -L -o package.json https://example.com/package.json</command>
</git_bash>`,
		},
		{
			description: "Check if a port is in use",
			output: `<git_bash>
  <command>netstat -ano | grep :3000</command>
</git_bash>`,
		},
	],
}

