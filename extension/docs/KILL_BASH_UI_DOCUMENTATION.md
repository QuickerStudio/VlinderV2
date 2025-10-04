# Kill Bash Tool - UI Component Documentation

## 📱 UI Implementation Overview

This document describes the user interface implementation for the `kill_bash` tool, following the established design patterns in the Vlinder extension.

---

## 🎨 Component Structure

### Location
**File**: `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx`

### Component Name
`KillBashBlock`

---

## 🧩 Component Architecture

### Type Definition
```typescript
export const KillBashBlock: React.FC<
  KillBashTool &
    ToolAddons & {
      hasNextMessage?: boolean
    }
>
```

### Props
- `terminalId?: number` - The unique ID of the terminal to kill
- `terminalName?: string` - The name of the terminal to kill
- `lastCommand?: string` - The last command executed in the terminal
- `isBusy?: boolean` - Whether the terminal is currently busy
- `force?: boolean` - Whether to force kill the terminal
- `result?: string` - The result/output from the kill operation
- `approvalState?: ToolStatus` - Current approval state (pending/loading/approved/rejected/error)
- `tool: "kill_bash"` - Tool identifier
- `ts: number` - Timestamp
- `...rest` - Additional ToolAddons properties

---

## 🎯 Visual Design

### Icon & Title
- **Icon**: `XCircle` (from lucide-react)
- **Title**: "Kill Terminal"
- **Variant**: `destructive` (red theme to indicate dangerous operation)

### Summary Line
Displays in collapsed state:
- Format: `{terminalName || "Terminal #" + terminalId}{force ? " (Force)" : ""}`
- Examples:
  - "dev-server"
  - "Terminal #1 (Force)"
  - "test-runner"

### Color Scheme
- **Border**: Red/destructive (indicates dangerous operation)
- **Primary Button**: Destructive variant (red)
- **Status Indicators**:
  - Busy: Warning color (yellow/orange)
  - Idle: Muted color (gray)
  - Force Kill: Destructive color with bold text

---

## 🔘 Action Buttons

### Pending State
Two icon buttons appear when `approvalState === "pending"`:

#### 1. Kill Terminal Button
- **Icon**: `XCircle`
- **Variant**: `destructive`
- **Size**: `sm` (8x8 pixels)
- **Action**: Sends `yesButtonTapped` response
- **Tooltip**: "Kill Terminal"

#### 2. Cancel Button
- **Icon**: `X`
- **Variant**: `outline`
- **Size**: `sm` (8x8 pixels)
- **Action**: Sends `noButtonTapped` response
- **Tooltip**: "Cancel"

### Button Text Configuration
**File**: `extension/webview-ui-vite/src/hooks/use-message-handler.ts`

```typescript
kill_bash: {
  ...baseState,
  primaryButtonText: "Kill Terminal",
  secondaryButtonText: "Cancel",
}
```

---

## 📋 Content Sections

### 1. Terminal Information
Displays when expanded:

```tsx
<div className="space-y-2">
  {/* Terminal ID */}
  {terminalId !== undefined && (
    <p className="text-xs">
      <span className="font-semibold">Terminal ID:</span> {terminalId}
    </p>
  )}
  
  {/* Terminal Name */}
  {terminalName && (
    <p className="text-xs">
      <span className="font-semibold">Terminal Name:</span> {terminalName}
    </p>
  )}
  
  {/* Last Command */}
  {lastCommand && (
    <div className="text-xs">
      <span className="font-semibold">Last Command:</span>
      <div className="bg-muted p-2 rounded font-mono text-xs overflow-x-auto mt-1">
        <pre className="whitespace-pre-wrap text-pretty break-all">
          <span className="text-success">$</span> {lastCommand}
        </pre>
      </div>
    </div>
  )}
  
  {/* Status */}
  {isBusy !== undefined && (
    <p className="text-xs">
      <span className="font-semibold">Status:</span>{" "}
      <span className={cn(isBusy ? "text-warning" : "text-muted-foreground")}>
        {isBusy ? "Busy" : "Idle"}
      </span>
    </p>
  )}
  
  {/* Kill Method */}
  {force !== undefined && (
    <p className="text-xs">
      <span className="font-semibold">Kill Method:</span>{" "}
      <span className={cn(force ? "text-destructive font-semibold" : "text-muted-foreground")}>
        {force ? "Force Kill" : "Graceful Termination"}
      </span>
    </p>
  )}
</div>
```

### 2. Loading State
Shows spinner when `approvalState === "loading"`:

```tsx
<div className="mt-2 flex items-center">
  <span className="text-xs mr-2">Terminating terminal...</span>
  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-destructive"></div>
</div>
```

### 3. Result Details (Collapsible)
Shows detailed output when `result` is available:

```tsx
<Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
  <CollapsibleTrigger asChild>
    <Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
      <span>View Details</span>
      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent className="mt-2">
    <ScrollArea className="h-[200px] w-full rounded-md border">
      <div className="bg-secondary/20 p-3 rounded-md text-sm">
        <pre className="whitespace-pre-wrap text-pretty break-all">{result}</pre>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  </CollapsibleContent>
</Collapsible>
```

### 4. Status Messages

#### Success State
```tsx
{approvalState === "approved" && (
  <p className="text-xs mt-2 text-success">Terminal terminated successfully.</p>
)}
```

#### Error State
```tsx
{approvalState === "error" && (
  <p className="text-xs mt-2 text-destructive">An error occurred while terminating the terminal.</p>
)}
```

---

## 🔄 State Flow

### 1. Pending State
- Shows terminal information
- Displays action buttons (Kill/Cancel)
- Border: Red (destructive)
- Icon: XCircle with alert styling

### 2. Loading State
- Shows "Terminating terminal..." message
- Displays spinning loader
- Buttons hidden
- Border: Red (destructive)
- Icon: Spinning loader

### 3. Approved State
- Shows success message
- Displays result details (if available)
- Border: Green (success)
- Icon: CheckCircle

### 4. Error State
- Shows error message
- Displays error details (if available)
- Border: Red (destructive)
- Icon: AlertCircle

### 5. Rejected State
- Shows rejection message
- Border: Red (destructive)
- Icon: XCircle

---

## 🎭 Visual States Comparison

| State | Border Color | Icon | Message | Actions |
|-------|-------------|------|---------|---------|
| Pending | Red | XCircle (alert) | Terminal info | Kill / Cancel |
| Loading | Red | Spinner | "Terminating..." | None |
| Approved | Green | CheckCircle | "Successfully terminated" | None |
| Error | Red | AlertCircle | "Error occurred" | None |
| Rejected | Red | XCircle | "Operation denied" | None |

---

## 🔌 Integration Points

### 1. Tool Renderer
**File**: `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx`

```typescript
export const ToolRenderer: React.FC<{
  tool: ChatTool
  hasNextMessage?: boolean
}> = ({ tool }) => {
  switch (tool.tool) {
    // ... other cases
    case "kill_bash":
      return <KillBashBlock {...tool} />
    default:
      return null
  }
}
```

### 2. Message Handler
**File**: `extension/webview-ui-vite/src/hooks/use-message-handler.ts`

Configures button text for the tool:
```typescript
const toolButtonMap: Record<ChatTool["tool"], Partial<ChatState>> = {
  // ... other tools
  kill_bash: {
    ...baseState,
    primaryButtonText: "Kill Terminal",
    secondaryButtonText: "Cancel",
  }
}
```

### 3. Type Definitions
**File**: `extension/src/shared/new-tools.ts`

```typescript
export type KillBashTool = {
  tool: "kill_bash"
  terminalId?: number
  terminalName?: string
  lastCommand?: string
  isBusy?: boolean
  force?: boolean
  result?: string
}

export type ChatTool = (
  // ... other types
  | KillBashTool
) & {
  ts: number
  approvalState?: ToolStatus
  isSubMsg?: boolean
  error?: string
  userFeedback?: string
}
```

---

## 🎨 Styling Details

### Typography
- **Labels**: `font-semibold` for field names
- **Values**: Regular weight
- **Code**: `font-mono` for commands
- **Size**: `text-xs` for most content

### Spacing
- **Container**: `space-y-3` between major sections
- **Info Items**: `space-y-2` between info fields
- **Padding**: `p-2` for code blocks, `p-3` for result areas

### Colors
- **Success**: Green theme (`text-success`)
- **Warning**: Yellow/orange theme (`text-warning`)
- **Destructive**: Red theme (`text-destructive`)
- **Muted**: Gray theme (`text-muted-foreground`)

### Interactive Elements
- **Hover**: `hover:bg-muted/50` on clickable areas
- **Transitions**: `transition-colors` for smooth state changes
- **Cursor**: `cursor-pointer` on interactive elements

---

## 📱 Responsive Behavior

### Collapsible Content
- Default: Collapsed
- Click header to expand/collapse
- Auto-collapse after success (if configured)

### Scrollable Areas
- Result details: Max height 200px with scroll
- Horizontal scroll for long commands
- Vertical scroll for long output

### Text Wrapping
- Commands: `whitespace-pre-wrap text-pretty break-all`
- Prevents overflow while maintaining readability

---

## ♿ Accessibility

### ARIA Labels
- Buttons have descriptive `title` attributes
- Icons are supplemented with text labels

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Tab order follows logical flow

### Visual Feedback
- Clear state indicators (icons + colors)
- Loading states with spinners
- Success/error messages

---

## 🧪 Testing Checklist

- [ ] Component renders correctly in all approval states
- [ ] Action buttons send correct messages
- [ ] Terminal information displays properly
- [ ] Collapsible sections work correctly
- [ ] Loading spinner appears during execution
- [ ] Success/error messages display appropriately
- [ ] Styling matches other tool components
- [ ] Responsive behavior works on different screen sizes
- [ ] Accessibility features function correctly

---

## 📸 Visual Examples

### Pending State (Collapsed)
```
┌─────────────────────────────────────────────────┐
│ ⊗ Kill Terminal                    [X] [Cancel] │
│   dev-server (Force)                            │
└─────────────────────────────────────────────────┘
```

### Pending State (Expanded)
```
┌─────────────────────────────────────────────────┐
│ ⊗ Kill Terminal                    [X] [Cancel] │
│   dev-server (Force)                      ▼     │
├─────────────────────────────────────────────────┤
│ Terminal ID: 1                                  │
│ Terminal Name: dev-server                       │
│ Last Command:                                   │
│ ┌─────────────────────────────────────────────┐ │
│ │ $ npm run dev                               │ │
│ └─────────────────────────────────────────────┘ │
│ Status: Busy                                    │
│ Kill Method: Force Kill                         │
└─────────────────────────────────────────────────┘
```

### Loading State
```
┌─────────────────────────────────────────────────┐
│ ⟳ Kill Terminal                                 │
│   dev-server (Force)                      ▼     │
├─────────────────────────────────────────────────┤
│ Terminating terminal... ⟳                       │
└─────────────────────────────────────────────────┘
```

### Success State
```
┌─────────────────────────────────────────────────┐
│ ✓ Kill Terminal                                 │
│   dev-server (Force)                      ▼     │
├─────────────────────────────────────────────────┤
│ Terminal ID: 1                                  │
│ Terminal Name: dev-server                       │
│ ✓ Terminal terminated successfully.             │
└─────────────────────────────────────────────────┘
```

---

## 🔗 Related Components

- **BashBlock**: Similar terminal-related tool UI
- **ExecuteCommandBlock**: Command execution UI pattern
- **DevServerToolBlock**: Server management UI pattern
- **ToolBlock**: Base component for all tools

---

## 💡 Design Decisions

1. **Destructive Variant**: Uses red theme to clearly indicate this is a dangerous operation
2. **Force Kill Indicator**: Prominently displays when force kill is enabled
3. **Terminal Status**: Shows busy/idle state to help user understand impact
4. **Last Command Display**: Helps user confirm they're killing the right terminal
5. **Collapsible Details**: Keeps UI clean while providing detailed information when needed

---

## 🚀 Future Enhancements

Potential improvements:
- [ ] Add confirmation dialog for force kill
- [ ] Show process tree before killing
- [ ] Display terminal uptime
- [ ] Add "kill all terminals" batch action
- [ ] Show terminal resource usage (CPU/memory)

---

Happy coding! 🎉

