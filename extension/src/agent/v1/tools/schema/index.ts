// schema/index.ts
import { executeCommandTool } from "./execute_command"
import { listFilesTool } from "./list_files"
import { ExploreRepoFolderTool } from "./explore-repo-folder.schema"
import { searchFilesTool } from "./search_files"
import { readFileTool } from "./read_file"
import { writeToFileTool } from "./write_to_file"
import { askFollowupQuestionTool } from "./ask_followup_question"
import { attemptCompletionTool } from "./attempt_completion"
import { webSearchTool } from "./web_search"
import { webFetchTool } from "./web_fetch"
import { urlScreenshotTool } from "./url_screenshot"
import { devServerTool } from "./dev_server"
import { searchSymbolTool } from "./search_symbols"
import { addInterestedFileTool } from "./add_interested_file"
import { fileEditorTool } from "./file_editor_tool"
import { spawnAgentTool } from "./agents/agent-spawner"
import { exitAgentTool } from "./agents/agent-exit"
import { moveTool } from "./move"
import { removeTool } from "./remove"
import { renameTool } from "./rename"
import { bashTool } from "./Bash"
import { contextEngineAgentTool } from "./context-engine-agent"

export const tools = [
	executeCommandTool,
	listFilesTool,
	ExploreRepoFolderTool,
	searchFilesTool,
	readFileTool,
	askFollowupQuestionTool,
	attemptCompletionTool,
	webSearchTool,
	webFetchTool,
	urlScreenshotTool,
	devServerTool,
	searchSymbolTool,
	addInterestedFileTool,
	fileEditorTool,
	spawnAgentTool,
	exitAgentTool,
	moveTool,
	removeTool,
	renameTool,
	bashTool,
	contextEngineAgentTool,
] as const

export type Tool = (typeof tools)[number]
export {
	executeCommandTool,
	listFilesTool,
	ExploreRepoFolderTool,
	searchFilesTool,
	readFileTool,
	writeToFileTool,
	askFollowupQuestionTool,
	attemptCompletionTool,
	webSearchTool,
	webFetchTool,
	urlScreenshotTool,
	searchSymbolTool as searchSymbolsTool,
	addInterestedFileTool,
	fileEditorTool,
	spawnAgentTool as subAgentTool,
	exitAgentTool as exitSubAgentTool,
	moveTool,
	removeTool,
	renameTool,
	bashTool,
	contextEngineAgentTool,
}

/**
 * 🔧 COMPLETE TOOL REGISTRATION GUIDE (Updated 2024)
 *
 * Complete tool registration process guide based on web_fetch tool practical experience
 *
 * ==================== Core Implementation Steps ====================
 *
 * 📝 1. Tool Schema Definition (Required)
 *    File: src/agent/v1/tools/schema/[tool-name].ts
 *    ✅ Use zod to define parameter structure and validation rules
 *    ✅ Add detailed JSDoc documentation and @tool annotations
 *    ✅ Provide multiple practical usage examples
 *    ✅ Export toolSchema and ToolParams types
 *
 *    Key Points:
 *    - Parameters must have .describe() descriptions
 *    - URL parameters use z.string().url() validation
 *    - examples array provides XML format examples
 *
 * 🔨 2. Tool Runner Implementation (Required)
 *    File: src/agent/v1/tools/runners/[tool-name].tool.ts
 *    ✅ Inherit from BaseAgentTool<ToolParams> class
 *    ✅ Implement execute() method
 *    ✅ Add abortToolExecution() support
 *    ✅ Use this.toolResponse() to return results
 *    ✅ Error handling and user confirmation logic
 *
 *    Key Points:
 *    - Use await say("text", message) instead of say("tool_name", message)
 *    - fetch() doesn't support timeout property, use AbortController
 *    - Avoid unused parameters, use _match prefix
 *    - Return formatted XML response
 *
 * 🧠 3. Tool Prompt Definition (Required)
 *    File: src/agent/v1/prompts/tools/[tool-name].ts
 *    ✅ Implement ToolPromptSchema interface
 *    ✅ Define how AI understands and uses the tool
 *    ✅ Include description, parameters, capabilities, examples
 *
 *    Key Points:
 *    - limitations and usage_notes properties are not supported
 *    - examples use { description, output } format
 *    - output must be XML format string
 *    - capabilities array can include limitation descriptions (prefix "LIMITATIONS:")
 *
 * 🔗 4. Type System Integration (Required)
 *    A. src/agent/v1/tools/types/index.ts
 *       ✅ Import ToolParams: import { WebFetchToolParams } from "../schema/web_fetch"
 *       ✅ Add to ToolParams union type
 *
 *    B. src/shared/new-tools.ts
 *       ✅ Define interface: export interface WebFetchTool { tool: "web_fetch", ... }
 *       ✅ Add to ChatTool union type
 *       ✅ Add read-only tools to readOnlyTools array
 *
 * 📋 5. Tool Registration (Required)
 *    A. src/agent/v1/tools/schema/index.ts (current file)
 *       ✅ Import: import { webFetchTool } from "./web_fetch"
 *       ✅ Add to tools array
 *       ✅ Add to export statement
 *
 *    B. src/agent/v1/tools/index.ts
 *       ✅ Export: export * from "./runners/web-fetch.tool"
 *
 *    C. src/agent/v1/tools/tool-executor.ts
 *       ✅ Import: import { WebFetchTool } from "."
 *       ✅ Add to toolMap: web_fetch: WebFetchTool
 *
 *    D. src/agent/v1/prompts/tools/index.ts
 *       ✅ Import: import { webFetchPrompt } from "./web-fetch"
 *       ✅ Add to toolPrompts array
 *
 * 🎨 6. UI Integration (Required)
 *    A. webview-ui-vite/src/components/chat-row/tools/[tool-name]-tool.tsx
 *       ✅ Create React component to handle tool UI display
 *       ✅ Use ToolAddons type to extend tool properties
 *       ✅ Implement loading, error, and success state displays
 *       ✅ Use ToolBlock component to wrap content
 *
 *       Key Points:
 *       - icon property passes component reference (Globe) not JSX (<Globe />)
 *       - ToolBlock requires tool, variant, summary and other required properties
 *       - No subtitle property, use summary instead
 *
 *    B. webview-ui-vite/src/components/chat-row/chat-tools.tsx
 *       ✅ Import tool type: import { WebFetchTool } from "extension/shared/new-tools"
 *       ✅ Import UI component: import { EnhancedWebFetchBlock } from "./tools/web-fetch-tool"
 *       ✅ Add case in ToolRenderer switch: case "web_fetch": return <EnhancedWebFetchBlock {...tool} />
 *
 *    C. webview-ui-vite/src/hooks/use-message-handler.ts
 *       ✅ Add button configuration in toolButtonMap
 *       ✅ Define primaryButtonText and secondaryButtonText
 *       ✅ Use ...baseState to inherit base state
 *
 * ✅ 7. Validation & Testing (Required)
 *    ✅ Run pnpm run check-types (check TypeScript types)
 *    ✅ Run pnpm run lint (code style check)
 *    ✅ Run pnpm run build (complete build test)
 *    ✅ Test tool display and interaction in UI
 *
 * ==================== Common Problem Solutions ====================
 *
 * � TypeScript Error Fixes:
 * - "timeout does not exist in RequestInit" → Remove timeout option from fetch
 * - "match is declared but never used" → Use _match prefix
 * - "Property 'subtitle' does not exist" → Use summary instead of subtitle
 * - "Property 'web_fetch' is missing" → Add configuration in toolButtonMap
 * - "input does not exist in ToolExample" → Use { description, output } format
 *
 * 📚 Reference Examples:
 * - web_fetch.ts - Complete implementation example (recommended reference)
 * - url_screenshot.ts - Network requests and error handling
 * - move.ts - File operations and user confirmation
 * - read_file.ts - Simple tool example
 * - execute_command.ts - Complex interaction example
 *
 * ==================== Complete Checklist ====================
 *
 * When creating new tools, ensure all the following steps are completed:
 *
 * 🔧 Backend Implementation:
 * - [ ] 1.  Create Schema definition file (schema/[tool-name].ts)
 * - [ ] 2.  Create Runner executor file (runners/[tool-name].tool.ts)
 * - [ ] 3.  Create Prompt definition file (prompts/tools/[tool-name].ts) ⭐
 * - [ ] 4.  Update backend type definitions (tools/types/index.ts)
 * - [ ] 5.  Update frontend type definitions (shared/new-tools.ts)
 * - [ ] 6.  Register Schema (schema/index.ts)
 * - [ ] 7.  Register executor (tools/index.ts, tool-executor.ts)
 * - [ ] 8.  Register prompts (prompts/tools/index.ts)
 *
 * 🎨 Frontend Implementation:
 * - [ ] 9.  Create UI component (webview-ui-vite/src/components/chat-row/tools/[tool-name]-tool.tsx)
 * - [ ] 10. Register UI component (chat-tools.tsx import and ToolRenderer)
 * - [ ] 11. Configure button mapping (toolButtonMap in use-message-handler.ts)
 * - [ ] 12. Configure button hiding (button-section.tsx, if needed)
 *
 * 🧪 Validation Testing:
 * - [ ] 13. Run type checking (pnpm run check-types)
 * - [ ] 14. Run code checking (pnpm run lint)
 * - [ ] 15. Run complete build (pnpm run build)
 * - [ ] 16. Test tool functionality and UI display
 *
 * 🎯 Completion Criteria: Successful build with no TypeScript/ESLint errors, tool displays and works properly in UI
 */

