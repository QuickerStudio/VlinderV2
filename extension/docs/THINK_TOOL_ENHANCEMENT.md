# Think Tool Enhancement: Complex vs Simple Thinking

## Overview

The Think Tool has been enhanced to automatically detect and differentiate between **Complex Thinking (Planning)** and **Simple Thinking** based on the content and structure of the agent's thoughts. This provides better user experience by showing appropriate UI feedback and helps guide the agent to use the right level of thinking for different situations.

## Features

### Automatic Detection

The tool analyzes the thought content using multiple heuristics to determine complexity:

1. **Length Analysis**: Thoughts longer than 200 characters are considered complex
2. **Structure Detection**: Numbered lists (1., 2., 3.) or bullet points (-, *, •) indicate complex thinking
3. **Keyword Analysis**: Planning keywords like "plan", "step", "phase", "approach", "strategy" suggest complex thinking
4. **Paragraph Count**: Multiple paragraphs (3+) indicate detailed analysis
5. **Analysis Patterns**: Words like "pros", "cons", "trade-offs", "alternatives" suggest complex reasoning

### UI Feedback

- **Complex Thinking**: Shows "Planning..." in the UI while the agent is thinking
- **Simple Thinking**: Shows "Think...." in the UI for quick reasoning

### Backend Implementation

The detection logic is implemented in `ThinkTool.isComplexThinking()` method:

```typescript
private isComplexThinking(thoughts: string): boolean {
    // Analyzes content using multiple heuristics
    // Returns true for complex thinking, false for simple thinking
}
```

## Usage Guidelines

### When to Use Complex Thinking

Use structured, detailed format for:

- **Multi-step planning**: Breaking down tasks into phases
- **Detailed analysis**: Analyzing problems from multiple angles
- **Comparing alternatives**: Evaluating different approaches with pros/cons
- **Strategic planning**: Designing implementation strategies
- **Risk assessment**: Considering edge cases and mitigation

**Example:**
```xml
<tool name="think">
  <thoughts>
Let me plan this refactoring carefully:

**Phase 1: Analysis**
1. Review current architecture
2. Identify coupling issues
3. Document dependencies

**Phase 2: Design**
1. Design new abstraction layer
2. Plan migration strategy
3. Consider backward compatibility

**Phase 3: Implementation**
1. Implement new interfaces
2. Migrate modules gradually
3. Update tests

I'll start with Phase 1 by reading the authentication module.
  </thoughts>
</tool>
```

### When to Use Simple Thinking

Use concise, direct format for:

- **Quick observations**: Noticing obvious issues
- **Brief analysis**: Understanding straightforward problems
- **Simple decisions**: Choosing the next obvious action
- **Status updates**: Noting what you've learned

**Example:**
```xml
<tool name="think">
  <thoughts>
The error is at line 42 - missing null check before accessing user.profile.email. I'll add the check.
  </thoughts>
</tool>
```

## Benefits

1. **Better User Experience**: Users see appropriate feedback based on thinking complexity
2. **Guided Agent Behavior**: The tool encourages appropriate thinking depth for different tasks
3. **Transparency**: Users understand when the agent is doing deep planning vs quick reasoning
4. **Efficiency**: Simple tasks don't require elaborate thinking, complex tasks get proper planning

## Technical Details

### Type Definition

```typescript
export type ThinkTool = {
    tool: "think"
    thoughts: string
    isComplexThinking?: boolean  // Automatically determined
}
```

### Detection Algorithm

The algorithm uses a scoring system:

1. Check length (>200 chars) → Complex
2. Check for lists (numbered or bulleted) → Complex
3. Count planning keywords (2+ matches) → Complex
4. Count paragraphs (3+ paragraphs) → Complex
5. Check analysis patterns (2+ matches) → Complex
6. Default → Simple

### Frontend Integration

The frontend component (`think-tool.tsx`) already has the logic to display different text based on `isComplexThinking`:

```typescript
const getDisplayText = () => {
    if (approvalState === "loading") {
        return isComplexThinking ? "Planning..." : "Think...."
    }
    // ...
}
```

## Testing

Comprehensive tests are provided in `think.tool.test.ts` covering:

- Detection of complex thinking for various patterns
- Detection of simple thinking for brief thoughts
- Edge cases and error handling
- Response format validation

## Prompt Engineering

The system prompts have been updated to guide the agent:

1. **Tool Description**: Explains the difference between complex and simple thinking
2. **Examples**: Provides clear examples of both types
3. **Usage Notes**: Detailed guidelines on when to use each type
4. **Best Practices**: Tips for effective thinking at appropriate complexity levels

## Migration Notes

This is a backward-compatible enhancement:

- Existing code continues to work without changes
- The `isComplexThinking` field is optional
- Frontend gracefully handles both old and new format
- No breaking changes to the API

## Future Enhancements

Potential improvements:

1. **Machine Learning**: Train a model to better detect thinking complexity
2. **User Preferences**: Allow users to customize detection thresholds
3. **Analytics**: Track thinking patterns to improve agent performance
4. **Adaptive Prompts**: Adjust prompts based on detected thinking patterns

## References

- Frontend Implementation: `extension/webview-ui-vite/src/components/chat-row/tools/think-tool.tsx`
- Backend Implementation: `extension/src/agent/v1/tools/runners/think.tool.ts`
- Schema Definition: `extension/src/agent/v1/tools/schema/think.ts`
- Prompt Engineering: `extension/src/agent/v1/prompts/tools/think.ts`
- Type Definition: `extension/src/shared/new-tools.ts`

