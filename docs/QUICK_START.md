# Quick Start Guide

## Installation

### Prerequisites

- Node.js 18 or higher
- pnpm 8 or higher
- VS Code 1.85 or higher

### Build from Source

```bash
# Clone the repository
git clone https://github.com/QuickerStudio/VlinderV2.git
cd VlinderV2/extension

# Install dependencies
pnpm install

# Build the extension
pnpm run build

# Package for VS Code
pnpm run package
```

### Install in VS Code

1. Open VS Code
2. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
3. Type "Install from VSIX"
4. Select the generated `.vsix` file

---

## Configuration

### API Key Setup

Set your API key as an environment variable:

```bash
# Anthropic (recommended)
export ANTHROPIC_API_KEY=your_api_key

# OpenAI
export OPENAI_API_KEY=your_api_key

# Google
export GOOGLE_API_KEY=your_api_key
```

Or configure in VS Code settings:

1. Open Settings (`Ctrl+,`)
2. Search for "Vlinder"
3. Enter your API key

### Model Selection

Default model is Claude 3.5 Sonnet. To change:

1. Open Vlinder panel
2. Click Settings icon
3. Select your preferred model

---

## Basic Usage

### 1. Open the Vlinder Panel

- Click the Vlinder icon in the sidebar
- Or press `Ctrl+Shift+V` (customizable)

### 2. Start a Conversation

Type your request in the input box:

```
Create a React component that displays a counter with increment and decrement buttons
```

### 3. Watch Vlinder Work

Vlinder will:
1. Analyze your request
2. Plan the implementation
3. Create/edit files
4. Run quality checks
5. Report results

### 4. Review Changes

- Check the diff view for file changes
- Review the generated code
- Accept or reject changes

---

## Examples

### Example 1: Create a New Feature

```
Add a user authentication system with login, logout, and registration
```

Vlinder will:
- Create authentication components
- Add API routes
- Set up state management
- Add form validation

### Example 2: Fix a Bug

```
Fix the bug where the counter doesn't reset to zero
```

Vlinder will:
- Locate the counter component
- Identify the bug
- Implement the fix
- Test the solution

### Example 3: Refactor Code

```
Refactor the API calls to use React Query
```

Vlinder will:
- Analyze existing API calls
- Install React Query if needed
- Migrate API calls
- Update components

---

## Advanced Usage

### Using PRD Mode

For complex tasks, use PRD (Product Requirements Document) mode:

1. Create a `prd.json` file:

```json
{
  "project": "MyApp",
  "branchName": "ralph/new-feature",
  "description": "Add new feature",
  "userStories": [
    {
      "id": "US-001",
      "title": "Create component",
      "description": "As a user, I want...",
      "acceptanceCriteria": [
        "Component renders correctly",
        "Typecheck passes"
      ],
      "priority": 1,
      "passes": false
    }
  ]
}
```

2. Run Vlinder in PRD mode:

```
Run PRD mode with prd.json
```

Vlinder will autonomously complete each user story.

### Using Skills

Skills are reusable task templates:

1. Create a `SKILL.md` file:

```markdown
---
name: create-api-endpoint
description: Create a new API endpoint
---

# Create API Endpoint

## Steps
1. Create route file
2. Add validation
3. Create controller
4. Add tests
```

2. Use the skill:

```
Use skill create-api-endpoint for /api/users
```

### Multi-Agent Tasks

For complex tasks, Vlinder uses multiple specialized agents:

```
Create a full-stack feature with frontend, backend, and tests
```

Vlinder will:
1. Spawn a Code Bee for frontend
2. Spawn a Code Bee for backend
3. Spawn a Test Bee for tests
4. Coordinate between agents

---

## Tips

### Best Practices

1. **Be Specific**: Provide clear, detailed requirements
2. **Break Down Tasks**: Split large tasks into smaller ones
3. **Review Changes**: Always review generated code
4. **Use Version Control**: Commit before running Vlinder

### Performance Tips

1. **Close Unused Files**: Reduces context size
2. **Use .vlinderignore**: Exclude large directories
3. **Clear Context**: Start fresh for new tasks

### Troubleshooting

**API Key Not Working**
- Check environment variable
- Verify key is valid
- Check rate limits

**Slow Response**
- Reduce context size
- Use a faster model
- Check network connection

**Unexpected Results**
- Provide more context
- Break down the task
- Check error messages

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+V` | Open Vlinder panel |
| `Ctrl+Enter` | Send message |
| `Ctrl+.` | Accept suggestion |
| `Ctrl+,` | Reject suggestion |
| `Escape` | Cancel operation |

---

## Next Steps

- Read the [Architecture Guide](ARCHITECTURE.md)
- Explore the [API Reference](API.md)
- Check out [Examples](EXAMPLES.md)
- Join our community discussions
