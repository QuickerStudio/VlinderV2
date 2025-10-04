# Terminal Block UI Update

## Overview
Updated the `TerminalBlock` component to display command execution information in a more user-friendly format, similar to `BashBlock` and `ExecuteCommandBlock`.

## Changes Made

### File Modified
**Path**: `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx`

### Key Improvements

#### 1. Summary Line (Collapsed State)
Added a summary line that displays when the ToolBlock is collapsed:
- Format: `[ShellType] command`
- Example: `[PowerShell] npm install`
- Example: `[Git Bash] ls -la`
- Example: `[auto] node server.js`

This provides quick visibility of both the shell type and command without expanding the block.

#### 2. Shell Type Label
Added a visual shell type label that displays the shell being used:
- **PowerShell** - for `powershell` shell
- **Git Bash** - for `git-bash` shell
- **CMD** - for `cmd` shell
- **bash** - for `bash` shell
- **zsh** - for `zsh` shell
- **fish** - for `fish` shell
- **sh** - for `sh` shell
- **auto** - for auto-detected shell

The label is displayed as a small badge next to "Command:" label with accent background color.

#### 3. Command Display Format
Changed from:
```tsx
<div className="flex items-start space-x-2">
  <span className="text-sm font-medium text-muted-foreground min-w-[80px]">Command:</span>
  <code className="text-sm bg-muted px-2 py-1 rounded flex-1 break-all">{command}</code>
</div>
```

To:
```tsx
<div className="space-y-2">
  <div className="flex items-center space-x-2">
    <span className="text-sm font-medium text-muted-foreground">Command:</span>
    <span className="text-xs bg-accent/50 px-2 py-0.5 rounded font-medium">
      {getShellLabel(shell)}
    </span>
  </div>
  <div className="bg-muted p-2 rounded font-mono text-xs overflow-x-auto">
    <pre className="whitespace-pre-wrap text-pretty break-all">{command}</pre>
  </div>
</div>
```

#### 4. Copy Command Functionality
Added copy-to-clipboard functionality with visual feedback:
```typescript
const [isCopied, setIsCopied] = useState(false)

const handleCopy = () => {
  navigator.clipboard.writeText(command)
  setIsCopied(true)
  setTimeout(() => setIsCopied(false), 2000)
}
```

The copy button shows a checkmark icon for 2 seconds after copying.

#### 5. Helper Function
Added `getShellLabel()` function to map shell type strings to user-friendly display names:
```typescript
const getShellLabel = (shellType: string | undefined): string => {
  if (!shellType || shellType === "auto") return "auto"
  const shellMap: Record<string, string> = {
    "powershell": "PowerShell",
    "git-bash": "Git Bash",
    "cmd": "CMD",
    "bash": "bash",
    "zsh": "zsh",
    "fish": "fish",
    "sh": "sh"
  }
  return shellMap[shellType] || shellType
}
```

## Visual Layout

### Before
```
┌─────────────────────────────────────────────────────────┐
│ Terminal                                                │
├─────────────────────────────────────────────────────────┤
│ Command: npm install                                    │
│ Shell: powershell                                       │
│ ...                                                     │
└─────────────────────────────────────────────────────────┘
```

### After (Expanded)
```
┌─────────────────────────────────────────────────────────┐
│ Terminal                                            ▼   │
├─────────────────────────────────────────────────────────┤
│ Command: [PowerShell] | npm install              [📋]  │
│                                                         │
│ Directory: /path/to/project                             │
│ ...                                                     │
└─────────────────────────────────────────────────────────┘
```

### After (Collapsed)
```
┌─────────────────────────────────────────────────────────┐
│ Terminal                                            ▶   │
│ [PowerShell] npm install                                │
└─────────────────────────────────────────────────────────┘
```

**Layout breakdown (expanded state):**
```
Command: [PowerShell] | npm install [📋]
         ^^^^^^^^^^^^   ^^^^^^^^^^^  ^^^
         Shell badge    Command box  Copy button
```

## Benefits

1. **Horizontal Layout**: All command information is displayed in a single, compact horizontal line
2. **Clarity**: Shell type is immediately visible as a badge in both collapsed and expanded states
3. **Readability**: Command is displayed in a dedicated text box with monospace font
4. **Better UX**: Users can quickly identify which shell is being used without reading through metadata
5. **Quick Copy**: One-click copy button with visual feedback (checkmark appears for 2 seconds)
6. **Quick Overview**: Collapsed state shows both shell type and command at a glance
7. **Collapsible**: Users can collapse the block to save screen space while still seeing the essential information
8. **Visual Separation**: The "|" separator clearly distinguishes the shell type from the command

## Related Components

- **BashBlock**: Similar command display pattern
- **ExecuteCommandBlock**: Similar command display pattern
- **ToolBlock**: Base component for all tool displays

## Testing Recommendations

1. Test with different shell types (PowerShell, Git Bash, CMD, bash, zsh, fish)
2. Test with long commands that wrap
3. Test with special characters in commands
4. Verify the shell label displays correctly for all shell types
5. Test with `shell: "auto"` to ensure it displays "auto" label

