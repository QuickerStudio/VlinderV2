# Repair Plan: Activating "Change Connection Style" Buttons

## 1. Problem Diagnosis

-   **Core Issue**: In "Edge Edit Mode", the buttons within the "Change Connection Style" section of the node context menu are unresponsive.
-   **Root Cause**: The event handling logic in `NodeContextMenu.tsx` is broken. The component lacks a state to track the selected edge, and the `onClick` events for the style buttons are not correctly wired to a function that can update the Mermaid code.

---

## 2. Repair Steps

### Step 2.1: Clean and Refactor `NodeContextMenu.tsx`

This is the primary location for the fix.

1.  **Remove Conflicting Code**:
    -   Delete any existing, conflicting functions related to edge selection or modification (e.g., `handleSelectEdge`, `handleChangeEdgeType`) to start from a clean slate.

2.  **Re-introduce State Management**:
    -   Add a `useState` hook to track the currently selected edge ID.
        ```tsx
        const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
        ```
    -   Ensure this state is reset to `null` in the `useEffect` hook when the menu is closed (`isOpen` becomes `false`).

3.  **Re-create Event Handlers**:
    -   Create a `handleSelectEdge` function to update the `selectedEdgeId` state when a user left-clicks on an edge in the list.
        ```tsx
        const handleSelectEdge = (edgeId: string) => {
            setSelectedEdgeId(edgeId);
        };
        ```
    -   Create a `handleChangeEdgeType` function to be called by the style buttons. This function will execute the code change and close the menu.
        ```tsx
        const handleChangeEdgeType = (newType: string) => {
            if (selectedEdgeId) {
                props.changeEdgeType(selectedEdgeId, newType);
                props.onClose();
            }
        };
        ```

4.  **Modify UI Rendering (JSX)**:
    -   Convert each item in the "Outgoing Connections" list into a clickable `<button>` and bind its `onClick` event to `handleSelectEdge`.
    -   Below the list, add a new section that is conditionally rendered **only when `selectedEdgeId` is not `null`**.
    -   Inside this new section, import `EDGE_TYPES` from `use-edge-manager` and map over it to create a button for each style. Bind each button's `onClick` event to `handleChangeEdgeType`.

### Step 2.2: Verify the Data Flow

Ensure the `changeEdgeType` function is correctly passed down through the component tree.

1.  **Check `use-edge-manager.ts`**:
    -   Confirm that the `changeEdgeType` function is correctly implemented and exported.
    -   Confirm that the `EDGE_TYPES` array is also exported.

2.  **Check `book-panel.tsx`**:
    -   Confirm it correctly retrieves `changeEdgeType` from the `useEdgeManager` hook.
    -   Confirm it passes this function as a prop named `changeEdgeType` to the `<NodeContextMenu />` component.

---

This plan provides a clear, step-by-step guide to fix the unresponsive buttons and implement the desired user interaction.
