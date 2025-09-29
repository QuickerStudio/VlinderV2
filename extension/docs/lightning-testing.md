# Floating Question Box - Testing Guide

## Manual Testing Checklist

### Prerequisites
1. Build the extension: `npm run build`
2. Install the extension in VS Code
3. Open a project and activate the extension
4. Ensure you have a valid API key configured

### Test Cases

#### 1. Lightning Button Visibility and Positioning
- [ ] Lightning button appears on the left side of the input area
- [ ] Button is positioned next to the model display
- [ ] Button has cyan color scheme
- [ ] Button shows proper hover effects

#### 2. Lightning Button Functionality
- [ ] Clicking the button toggles the floating question box
- [ ] Button state changes (active/inactive) when toggled
- [ ] Button is disabled when a request is running
- [ ] Button tooltip shows correct text

#### 3. Floating Question Box Appearance
- [ ] Box appears in the top-right corner when activated
- [ ] Box has proper styling (border, shadow, background)
- [ ] Header shows "Ask AI" with animated cyan dot
- [ ] Close button (X) is visible and functional
- [ ] Text area is properly sized and styled

#### 4. Question Input Functionality
- [ ] Can type text in the question area
- [ ] Text area auto-resizes appropriately
- [ ] Placeholder text is visible when empty
- [ ] Enter key sends the question
- [ ] Shift+Enter creates a new line
- [ ] Send button is enabled/disabled based on text content

#### 5. AI Communication
- [ ] Questions are sent to the AI successfully
- [ ] Loading state is shown during processing
- [ ] AI responses are received
- [ ] Responses are automatically inserted into main input field
- [ ] Question text is cleared after successful response
- [ ] Focus returns to main input area after response

#### 6. Error Handling
- [ ] Network errors are handled gracefully
- [ ] Invalid responses don't crash the interface
- [ ] Loading state is cleared on errors
- [ ] Console shows appropriate error messages

#### 7. Integration with Main Chat
- [ ] Questions don't appear in main conversation history
- [ ] AI responses don't appear in chat messages
- [ ] Main chat functionality remains unaffected
- [ ] Can use main chat while question box is open

#### 8. User Experience
- [ ] Smooth animations and transitions
- [ ] Proper keyboard navigation
- [ ] Accessible ARIA labels
- [ ] Responsive design works on different screen sizes

### Test Scenarios

#### Scenario 1: Basic Question Flow
1. Click lightning button to open question box
2. Type "What is React?"
3. Press Enter or click Send
4. Verify loading state appears
5. Verify response is inserted into main input
6. Verify question box clears

#### Scenario 2: Multiple Questions
1. Open question box
2. Ask first question and wait for response
3. Ask second question immediately
4. Verify both responses are handled correctly

#### Scenario 3: Closing and Reopening
1. Open question box
2. Type some text
3. Close using X button
4. Reopen question box
5. Verify text is cleared

#### Scenario 4: Keyboard Navigation
1. Open question box using lightning button
2. Use Tab to navigate between elements
3. Use Enter to send question
4. Use Shift+Enter for new lines

#### Scenario 5: Error Conditions
1. Disconnect internet
2. Try to send a question
3. Verify error handling
4. Reconnect and try again

### Expected Behaviors

#### Lightning Button States
- **Inactive**: Gray color, hover shows cyan
- **Active**: Cyan background and text
- **Disabled**: Grayed out when request is running

#### Question Box States
- **Hidden**: Not visible when lightning button is inactive
- **Visible**: Appears in top-right corner when activated
- **Loading**: Send button shows spinner, text area disabled
- **Error**: Console shows error, loading state cleared

#### Response Handling
- **Success**: Response inserted into main input, question cleared
- **Failure**: Error logged, user can retry
- **Empty Response**: Handled gracefully

### Performance Considerations
- [ ] No memory leaks when opening/closing repeatedly
- [ ] Smooth animations without lag
- [ ] Quick response times for AI requests
- [ ] No impact on main chat performance

### Browser Compatibility
- [ ] Works in VS Code's embedded browser
- [ ] Proper styling across different themes
- [ ] Responsive design on different screen sizes

### Accessibility Testing
- [ ] Screen reader compatibility
- [ ] Keyboard-only navigation
- [ ] High contrast mode support
- [ ] Proper focus management

## Debugging Tips

### Console Logs
Look for these log messages:
- `[FloatingQuestionBox] Sending question to AI...`
- `[FloatingQuestionBox] Received AI response`
- `[FloatingQuestion] Using observer model:` or `[FloatingQuestion] Using current main model:`

### Common Issues
1. **Button not appearing**: Check if imports are correct in input-area.tsx
2. **Question box not opening**: Verify hook state management
3. **AI not responding**: Check API configuration and network
4. **Responses not inserting**: Verify callback function in input-area.tsx

### Development Mode
For development testing:
1. Use `npm run dev` in webview-ui-vite directory
2. Enable developer tools in VS Code
3. Check console for errors and logs
4. Use React Developer Tools if available
