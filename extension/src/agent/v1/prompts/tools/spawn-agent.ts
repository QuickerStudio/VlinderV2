import { ToolPromptSchema } from '../utils/utils';

export const spawnAgentPrompt: ToolPromptSchema = {
	name: 'spawn_agent',
	description:
		'Request to spawn a specialized sub-agent with specific instructions and capabilities. This tool allows you to create specialized agents for different purposes: sub_task (for executing specific sub-components), planner (for analyzing and planning tasks), or tester (for comprehensive testing and quality assurance). The tool requires user approval before creating the agent.',
	parameters: {
		agentName: {
			type: 'string',
			description:
				"The type of agent to spawn. Must be one of: 'sub_task', 'planner', 'tester'. Each type is specialized for different tasks:\n- sub_task: For handling specific sub-components of a larger task (e.g., installing dependencies, running tests, making focused code changes)\n- planner: For analyzing complex tasks and creating detailed execution plans with dependencies\n- tester: For comprehensive testing and quality assurance (e.g., creating integration tests, finding bugs, verifying fixes, generating test reports)",
			required: true,
		},
		instructions: {
			type: 'string',
			description:
				'Detailed instructions for the sub-agent, describing its task and objectives, this is will be the meta prompt for the sub-agent. give few shots examples if possible',
			required: true,
		},
		files: {
			type: 'string',
			description:
				'Comma-separated list of files that the sub-agent should focus on or work with. no spaces between files just comma separated values',
			required: false,
		},
	},
	capabilities: [
		"You can use spawn_agent tool to create specialized sub-agents for specific tasks. Each agent type has its own specialized capabilities:\n- sub_task: Executes specific sub-components efficiently\n- planner: Creates detailed execution plans and identifies dependencies\n- tester: Performs comprehensive testing, finds bugs, and ensures quality\nThe tool requires user approval before creating the agent and allows you to specify which files the agent should work with.",
		'Spawning a sub-agent is a great way to delegate specialized work. For example:\n- Use "tester" when you need comprehensive testing, bug discovery, or quality verification\n- Use "planner" when you need to analyze complex tasks and create execution plans\n- Use "sub_task" when you need to execute a specific focused task',
		'When to use tester agent:\n- User asks to "test" something comprehensively\n- You need to verify a fix or feature works correctly\n- You want to create integration tests for a tool or feature\n- You need to find bugs or quality issues\n- You want a quality report with metrics',
	],
	examples: [
		{
			description:
				'Spawn an agent to install the dependencies and run the unit tests',
			output: `<spawn_agent>
<agentName>sub_task</agentName>
<instructions>Take a look at the project files and install the dependencies. Run the unit tests and report back the results with any failures.</instructions>
<files>package.json,README.md</files>
</spawn_agent>`,
		},
		{
			description: 'Spawn a planner agent to break down a task',
			output: `<spawn_agent>
<agentName>planner</agentName>
<instructions>Create a detailed plan for implementing a new user dashboard feature. Break down the requirements into manageable sub-tasks and identify dependencies.</instructions>
</spawn_agent>`,
		},
		{
			description: 'Spawn a tester agent to test a tool comprehensively',
			output: `<spawn_agent>
<agentName>tester</agentName>
<instructions>Create comprehensive integration tests for the pattern-search tool. Generate diverse test data, write real integration tests, run them, analyze results, fix any issues, and iterate until 100% pass rate. Document all findings and provide quality metrics.</instructions>
<files>extension/src/agent/v1/tools/runners/pattern-search.tool.ts</files>
</spawn_agent>`,
		},
		{
			description: 'Spawn a tester agent when user asks to test something',
			output: `<spawn_agent>
<agentName>tester</agentName>
<instructions>Test the new search feature comprehensively. Create test cases covering normal usage, edge cases, and error handling. Write integration tests, run them, fix any bugs found, and provide a quality report.</instructions>
<files>src/search/new-search.ts</files>
</spawn_agent>`,
		},
	],
};
