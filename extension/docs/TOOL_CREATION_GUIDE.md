# Quick Tool Creation Guide

## 🚀 Step-by-Step Checklist

### Step 1: Create Schema File
**Location**: `extension/src/agent/v1/tools/schema/your-tool.ts`

```typescript
import { z } from "zod"

const schema = z.object({
  param1: z.string().describe("Description of param1"),
  param2: z.number().optional().describe("Optional param2"),
})

const examples = [
  `<tool name="your_tool">
  <param1>value</param1>
</tool>`,
]

export const yourTool = {
  schema: {
    name: "your_tool",
    schema,
  },
  examples,
}

export type YourToolParams = {
  name: "your_tool"
  input: z.infer<typeof schema>
}
```

### Step 2: Create Runner File
**Location**: `extension/src/agent/v1/tools/runners/your-tool.tool.ts`

```typescript
import { BaseAgentTool } from "../base-agent.tool"
import { YourToolParams } from "../schema/your-tool"
import { ToolResponseV2 } from "../../types"

export class YourTool extends BaseAgentTool<YourToolParams> {
  async execute(): Promise<ToolResponseV2> {
    const { input, say, ask, updateAsk } = this.params
    
    // 1. Validate inputs
    if (!input.param1) {
      await say("error", "Missing required parameter")
      return this.toolResponse("error", "Error: param1 is required")
    }
    
    // 2. Request user approval
    const { response, text, images } = await ask(
      "tool",
      {
        tool: {
          tool: "your_tool",
          param1: input.param1,
          approvalState: "pending",
          ts: this.ts,
        },
      },
      this.ts
    )
    
    // 3. Handle rejection
    if (response !== "yesButtonTapped") {
      await updateAsk(
        "tool",
        {
          tool: {
            tool: "your_tool",
            param1: input.param1,
            approvalState: "rejected",
            ts: this.ts,
          },
        },
        this.ts
      )
      return this.toolResponse("rejected", this.formatToolDenied())
    }
    
    // 4. Update to loading state
    await updateAsk(
      "tool",
      {
        tool: {
          tool: "your_tool",
          param1: input.param1,
          approvalState: "loading",
          ts: this.ts,
        },
      },
      this.ts
    )
    
    // 5. Execute tool logic
    try {
      // Your tool logic here
      const result = "Success!"
      
      // 6. Update to approved state
      await updateAsk(
        "tool",
        {
          tool: {
            tool: "your_tool",
            param1: input.param1,
            result,
            approvalState: "approved",
            ts: this.ts,
          },
        },
        this.ts
      )
      
      return this.toolResponse("success", result)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      await updateAsk(
        "tool",
        {
          tool: {
            tool: "your_tool",
            param1: input.param1,
            error: errorMessage,
            approvalState: "error",
            ts: this.ts,
          },
        },
        this.ts
      )
      
      return this.toolResponse("error", this.formatToolError(errorMessage))
    }
  }
}
```

### Step 3: Create Prompt File
**Location**: `extension/src/agent/v1/prompts/tools/your-tool.ts`

```typescript
import { ToolPromptSchema } from "../utils/utils"

export const yourToolPrompt: ToolPromptSchema = {
  name: "your_tool",
  description: "Brief description of what your tool does",
  parameters: {
    param1: {
      type: "string",
      description: "Description of param1",
      required: true,
    },
    param2: {
      type: "number",
      description: "Description of param2",
      required: false,
    },
  },
  capabilities: [
    "List what your tool can do",
    "Provide usage guidelines",
  ],
  examples: [
    {
      description: "Example use case 1",
      output: `<your_tool>\n  <param1>value</param1>\n</your_tool>`,
    },
  ],
}
```

### Step 4: Register in Schema Index
**File**: `extension/src/agent/v1/tools/schema/index.ts`

```typescript
// Add import
import { yourTool } from "./your-tool"

// Add to tools array
export const tools = [
  // ... existing tools
  yourTool,
] as const

// Add to exports
export {
  // ... existing exports
  yourTool,
}
```

### Step 5: Export Runner
**File**: `extension/src/agent/v1/tools/index.ts`

```typescript
// Add export
export * from "./runners/your-tool.tool"
```

### Step 6: Add to Types
**File**: `extension/src/agent/v1/tools/types/index.ts`

```typescript
// Add import
import { YourToolParams } from "../schema/your-tool"

// Add to ToolParams union
export type ToolParams =
  // ... existing types
  | YourToolParams
```

### Step 7: Register in Tool Executor
**File**: `extension/src/agent/v1/tools/tool-executor.ts`

```typescript
// Add import
import {
  // ... existing imports
  YourTool,
} from "."

// Add to toolMap in createTool method
private createTool(params: FullToolParams<any>) {
  const toolMap = {
    // ... existing tools
    your_tool: YourTool,
  } as const
  // ...
}
```

### Step 8: Register Prompt
**File**: `extension/src/agent/v1/prompts/tools/index.ts`

```typescript
// Add import
import { yourToolPrompt } from "./your-tool"

// Add to toolPrompts array
export const toolPrompts = [
  // ... existing prompts
  yourToolPrompt,
]
```

### Step 9: Add Shared Type
**File**: `extension/src/shared/new-tools.ts`

```typescript
// Add type definition
export type YourTool = {
  tool: "your_tool"
  param1: string
  param2?: number
  result?: string
}

// Add to ChatTool union
export type ChatTool = (
  // ... existing types
  | YourTool
) & {
  ts: number
  approvalState?: ToolStatus
  isSubMsg?: boolean
  error?: string
  userFeedback?: string
}
```

---

## 📋 Verification Checklist

After creating your tool, verify:

- [ ] Schema file created with Zod validation
- [ ] Runner file created extending BaseAgentTool
- [ ] Prompt file created with documentation
- [ ] Schema registered in `schema/index.ts`
- [ ] Runner exported in `tools/index.ts`
- [ ] Type added to `types/index.ts`
- [ ] Tool mapped in `tool-executor.ts`
- [ ] Prompt added to `prompts/tools/index.ts`
- [ ] Shared type added to `new-tools.ts`
- [ ] No TypeScript errors
- [ ] Tool follows approval workflow pattern
- [ ] Error handling implemented
- [ ] State updates (pending → loading → approved/rejected)

---

## 🎯 Common Patterns

### Read-Only Tools
For tools that only read data (no modifications):
- Skip user approval if `alwaysAllowReadOnly` is true
- Still validate inputs
- Return data in structured format

### Write Tools
For tools that modify state:
- Always request user approval
- Show what will be changed
- Provide rollback information if possible

### Long-Running Tools
For tools with async operations:
- Use `updateAsk` to show progress
- Handle cancellation via AbortController
- Provide intermediate feedback

### Resource Management
For tools managing resources (terminals, files, etc.):
- Use registry pattern for tracking
- Implement cleanup methods
- Handle resource not found gracefully

---

## 🔍 Testing Your Tool

1. **Build the extension**: `npm run build`
2. **Test in VSCode**: Press F5 to launch extension host
3. **Invoke tool**: Use AI agent to call your tool
4. **Verify**:
   - Parameters are validated
   - User approval works
   - State updates correctly
   - Success/error handling works
   - UI displays properly

---

## 💡 Tips

1. **Use descriptive parameter names** - Make it clear what each parameter does
2. **Provide good examples** - Help the AI understand usage patterns
3. **Handle edge cases** - Check for null, undefined, empty strings
4. **Return structured data** - Use XML or JSON for consistency
5. **Log important events** - Use `this.logger()` for debugging
6. **Follow existing patterns** - Look at similar tools for reference
7. **Test error paths** - Make sure errors are handled gracefully

---

## 📚 Reference Tools

Good examples to study:
- **Simple tool**: `bash.tool.ts` - Basic command execution
- **Complex tool**: `dev-server.tool.ts` - State management, long-running
- **Resource tool**: `kill-bash.tool.ts` - Resource management, cleanup
- **File tool**: `read-file.tool.ts` - File operations, validation

---

## 🆘 Troubleshooting

**Tool not appearing in AI context?**
- Check if registered in `prompts/tools/index.ts`
- Verify schema is in `schema/index.ts`

**TypeScript errors?**
- Ensure all imports are correct
- Check type definitions match schema
- Verify union types include your tool

**Tool not executing?**
- Check if mapped in `tool-executor.ts`
- Verify class name matches import
- Check for runtime errors in console

**Approval not working?**
- Ensure `ask` and `updateAsk` are called correctly
- Check tool name matches in all places
- Verify `ts` timestamp is passed

---

Happy tool building! 🎉

