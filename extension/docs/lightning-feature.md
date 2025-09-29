# Floating Question Box Feature

## Overview

The Floating Question Box feature adds a cyan lightning button to the left side of the chat input area. When clicked, this button toggles a floating rich text input box that allows users to ask quick questions to the AI without affecting the main conversation history.

## Features

### 1. Lightning Button
- **Location**: Left side of the input area, next to the model display
- **Color**: Cyan (#00FFFF)
- **Icon**: Lightning bolt (Zap icon from Lucide React)
- **States**:
  - Inactive: Gray with hover effect to cyan
  - Active: Cyan background with cyan text
- **Functionality**: Toggles the visibility of the floating question box

### 2. Floating Question Box
- **Position**: Fixed position in the top-right corner of the interface
- **Design**: Modern card-style with border and shadow
- **Components**:
  - Header with "Ask AI" title and animated cyan dot
  - Close button (X) in the top-right corner
  - Rich text input area (textarea)
  - Send button with loading state
  - Footer with usage instructions

### 3. AI Integration
- **Backend**: Uses the `askFloatingQuestion` RPC endpoint
- **Model**: Uses observer model if configured, falls back to current main model
- **Processing**: Questions are processed independently from main conversation
- **Response Handling**: AI responses are automatically inserted into the main input field

## Technical Implementation

### Frontend Components

1. **useFloatingQuestionBox Hook** (`webview-ui-vite/src/hooks/use-floating-question-box.tsx`)
   - Manages state for visibility, loading, and question text
   - Handles AI communication via RPC client
   - Provides actions for toggling, sending, and resetting

2. **LightningButton Component** (`webview-ui-vite/src/components/chat-view/lightning-button.tsx`)
   - Cyan lightning button with active/inactive states
   - Accessible with proper ARIA labels
   - Hover effects and transitions

3. **FloatingQuestionBox Component** (`webview-ui-vite/src/components/chat-view/floating-question-box.tsx`)
   - Floating modal-style input box
   - Rich text input with keyboard shortcuts
   - Loading states and error handling

### Backend Integration

1. **RPC Endpoint** (`src/router/routes/agent-router.ts`)
   - `askFloatingQuestion` procedure
   - Validates input and processes questions
   - Uses ApiManager for AI communication
   - Returns structured response with success/error states

### Integration Points

1. **InputArea Component** (`webview-ui-vite/src/components/chat-view/input-area.tsx`)
   - Lightning button added to the left side of controls
   - FloatingQuestionBox component rendered at root level
   - Response handling to insert AI answers into main input

## Usage Instructions

### For Users

1. **Opening the Question Box**:
   - Click the cyan lightning button on the left side of the input area
   - The floating question box will appear in the top-right corner

2. **Asking Questions**:
   - Type your question in the text area
   - Press Enter to send (Shift+Enter for new line)
   - Or click the Send button

3. **Receiving Answers**:
   - AI responses are automatically inserted into the main input field
   - The question box clears after successful response
   - Focus returns to the main input area

4. **Closing the Question Box**:
   - Click the lightning button again
   - Or click the X button in the question box header

### Key Benefits

- **Non-intrusive**: Questions don't appear in main conversation history
- **Quick Access**: Fast way to get AI assistance without interrupting workflow
- **Auto-insertion**: Responses automatically populate the main input field
- **Independent Operation**: Works separately from main chat system
- **Visual Feedback**: Clear active/inactive states and loading indicators

## Keyboard Shortcuts

- **Enter**: Send question
- **Shift+Enter**: New line in question text
- **Escape**: Close question box (if implemented)

## Error Handling

- Network errors are logged to console
- Failed requests show in console with error details
- Loading states prevent multiple simultaneous requests
- Graceful fallback if AI service is unavailable

## Future Enhancements

Potential improvements for future versions:
- Question history within the floating box
- Customizable positioning
- Keyboard shortcuts for opening/closing
- Integration with different AI models
- Question templates or suggestions
