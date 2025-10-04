import { ToolPromptSchema } from "../utils/utils"

export const terminalToolPrompt: ToolPromptSchema = {
	name: "terminal",
	description:
		"Execute shell commands with output capture and exit codes. Supports PowerShell, Git Bash, CMD, bash, zsh, fish. Uses VSCode shell integration when available.",
	parameters: {
		command: {
			type: "string",
			description: "Command to execute",
			required: true,
		},
		shell: {
			type: "string",
			description:
				"Shell: 'auto' (default), 'git-bash', 'powershell', 'cmd', 'bash', 'zsh', 'fish', 'sh'",
			required: false,
		},
		cwd: {
			type: "string",
			description: "Working directory (default: workspace root)",
			required: false,
		},
		timeout: {
			type: "number",
			description: "Timeout in milliseconds (default: 30000)",
			required: false,
		},
		env: {
			type: "object",
			description: "Environment variables (key-value pairs)",
			required: false,
		},
		captureOutput: {
			type: "boolean",
			description: "Capture output (default: true). Set false for long-running servers.",
			required: false,
		},
		interactive: {
			type: "boolean",
			description: "Interactive mode - returns immediately (default: false)",
			required: false,
		},
		terminalName: {
			type: "string",
			description: "Terminal session name for reuse",
			required: false,
		},
		reuseTerminal: {
			type: "boolean",
			description: "Reuse terminal with same name (default: false)",
			required: false,
		},
	},
	capabilities: [
		// Shell Integration Support
		"Windows: Git Bash and PowerShell support shell integration - provides exit codes and output capture",
		"Windows: CMD does NOT support shell integration - command executes but output cannot be captured",
		"macOS/Linux: bash, zsh, fish, pwsh support shell integration",
		"PowerShell uses VSCode's native API - automatically uses best available PowerShell (pwsh or powershell.exe)",

		// Shell Selection Strategy
		"Use 'git-bash' on Windows when you need reliable output capture",
		"Use 'powershell' on Windows for PowerShell-specific commands",
		"Use 'cmd' only when CMD-specific syntax is required - accept that output cannot be captured",
		"Use 'auto' for cross-platform compatibility - detects system default shell",

		// Output Interpretation
		"<status>success</status> + <exitCode> = shell integration worked, output is reliable",
		"<status>executed</status> = command ran but output not captured (shell integration unavailable)",
		"<status>error</status> = command failed or shell not available",

		// Timeout Management
		"Default timeout: 30 seconds - increase for build commands, tests, or long operations",
		"Interactive commands (interactive=true) return immediately - use for REPL or user input scenarios",

		// Session Management
		"Set terminalName + reuseTerminal=true to run multiple commands in same shell session",
		"Use captureOutput=false for long-running servers - monitor with read_progress tool instead",

		// Environment Variables
		"PowerShell: $env:VAR_NAME",
		"CMD: %VAR_NAME%",
		"Unix shells: $VAR_NAME or export VAR_NAME=value",
	],
	examples: [
		{
			description: "Basic command (auto-detect shell)",
			output: `<tool name="terminal">
  <command>npm install</command>
</tool>`,
		},
		{
			description: "Git Bash on Windows (reliable output capture)",
			output: `<tool name="terminal">
  <command>ls -la</command>
  <shell>git-bash</shell>
</tool>`,
		},
		{
			description: "PowerShell command (uses VSCode native API)",
			output: `<tool name="terminal">
  <command>Get-Process | Where-Object {$_.CPU -gt 100}</command>
  <shell>powershell</shell>
</tool>`,
		},
		{
			description: "CMD command (no output capture)",
			output: `<tool name="terminal">
  <command>dir /s</command>
  <shell>cmd</shell>
</tool>`,
		},
		{
			description: "Long-running build (increase timeout)",
			output: `<tool name="terminal">
  <command>npm run build</command>
  <timeout>120000</timeout>
</tool>`,
		},
		{
			description: "Dev server (no output capture, monitor separately)",
			output: `<tool name="terminal">
  <command>npm run dev</command>
  <captureOutput>false</captureOutput>
  <terminalName>dev-server</terminalName>
</tool>`,
		},
		{
			description: "Reuse terminal session",
			output: `<tool name="terminal">
  <command>npm test</command>
  <terminalName>test-session</terminalName>
  <reuseTerminal>true</reuseTerminal>
</tool>`,
		},
		{
			description: "Custom working directory + environment variables",
			output: `<tool name="terminal">
  <command>node server.js</command>
  <cwd>/path/to/project</cwd>
  <env>{"NODE_ENV": "production", "PORT": "3000"}</env>
</tool>`,
		},
	],
}

