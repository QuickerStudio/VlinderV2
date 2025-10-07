# Read-Progress Tool Comprehensive Test Plan

## 1. Overview
This document outlines the testing strategy for the `read-progress` tool. The goal is to ensure the tool is stable, reliable, and performs optimally by testing its backend logic, frontend component, state management, and overall functionality.

## 2. Testing Scope
- **Backend**: `read-progress.tool.ts`, `read-progress.ts` (schema), and its interactions with `terminal-manager.ts`.
- **Frontend**: The `ReadProgressBlock` component in `chat-tools.tsx`.
- **Integration**: The end-to-end flow from the tool's invocation to the UI rendering the result.
- **State Management**: Handling of terminal states (`busy`, `hot`, `dev_server`) and UI states.

## 3. Test Cases

### 3.1. Backend Tests (`read-progress.tool.ts`)

- **TC-BE-01 (Parameter Validation)**:
  - **Action**: Call the tool without `terminalId` or `terminalName`.
  - **Expected**: Return an error response indicating a missing identifier.
- **TC-BE-02 (Invalid Identifier)**:
  - **Action**: Call the tool with a non-existent `terminalId` or `terminalName`.
  - **Expected**: Return an error response indicating the terminal was not found.
- **TC-BE-03 (Basic Progress Read - Recent Output)**:
  - **Action**: Call the tool for a running terminal with `includeFullOutput: false` (or omitted).
  - **Expected**: Return a success response containing the last 20 lines of output and correct terminal status (`busy`, `is_hot`, etc.).
- **TC-BE-04 (Basic Progress Read - Full Output)**:
  - **Action**: Call the tool for a running terminal with `includeFullOutput: true`.
  - **Expected**: Return a success response containing the entire output log.
- **TC-BE-05 (Idle Terminal)**:
  - **Action**: Call the tool for a terminal that has completed its command and is idle.
  - **Expected**: Return a success response with `busy: false` and an appropriate analysis recommendation.
- **TC-BE-06 (Dev Server - Running)**:
  - **Action**: Call the tool for a terminal running a dev server with `status: 'running'`.
  - **Expected**: Return a success response including the `<dev_server>` block with the correct status and URL. The analysis should recommend waiting.
- **TC-BE-07 (Dev Server - Error)**:
  - **Action**: Call the tool for a terminal running a dev server with `status: 'error'`.
  - **Expected**: The analysis recommendation should suggest killing and restarting the server.
- **TC-BE-08 (XML Escaping)**:
  - **Action**: Call the tool on a terminal whose output contains XML special characters (`<`, `>`, `&`, `"`, `'`).
  - **Expected**: The output in the XML result should be properly escaped.
- **TC-BE-09 (Analysis Logic - Stuck Process)**:
  - **Action**: Simulate a terminal that is `busy: true` but `is_hot: false`.
  - **Expected**: The analysis recommendation should suggest the process might be stuck.
- **TC-BE-10 (Analysis Logic - Error in Output)**:
  - **Action**: Simulate a terminal with error-like keywords in its recent output.
  - **Expected**: The analysis recommendation should suggest terminating the process.

### 3.2. Schema Tests (`read-progress.ts`)

- **TC-SC-01 (Valid Schemas)**:
  - **Action**: Validate correct inputs (`{terminalId: 1}`, `{terminalName: 'dev'}`, `{terminalId: 1, includeFullOutput: true}`).
  - **Expected**: Schema validation passes.
- **TC-SC-02 (Invalid Schemas)**:
  - **Action**: Validate incorrect inputs (`{}`, `{terminalId: 'a'}`, `{includeFullOutput: 'yes'}`).
  - **Expected**: Schema validation fails with descriptive errors.
- **TC-SC-03 (Default Values)**:
  - **Action**: Validate input omitting `includeFullOutput`.
  - **Expected**: The parsed input should have `includeFullOutput` defaulted to `false`.

### 3.3. Frontend Tests (`ReadProgressBlock` in `chat-tools.tsx`)

- **TC-FE-01 (Component Rendering - Discrepancy Check)**:
  - **Action**: Render the `ReadProgressBlock` with `approvalState: 'pending'`.
  - **Expected**: Observe that action buttons are rendered. **Note**: This contradicts the backend's immediate execution. This test is to confirm the discrepancy. The fix will likely involve removing the approval flow from the frontend component for this tool.
- **TC-FE-02 (Component Rendering - Result Display)**:
  - **Action**: Render the block with a valid XML `result` string.
  - **Expected**: The component should parse and display the information correctly: terminal ID/Name, status, output lines, and the final analysis recommendation.
- **TC-FE-03 (Collapsible Output)**:
  - **Action**: Click the "View Details" (or equivalent) trigger on a block with results.
  - **Expected**: The output log section should expand and collapse correctly.
- **TC-FE-04 (Summary Display)**:
  - **Action**: Render the block with different parameters.
  - **Expected**: The collapsed summary line should correctly display the terminal identifier and the output mode ("Full Output" or "Recent").
- **TC-FE-05 (Error Display)**:
  - **Action**: Render the block with an error result from the backend.
  - **Expected**: A user-friendly error message should be displayed within the tool block.

## 4. Test Execution and Automation
- An automated test script (`test-read-progress-tool.js`) will be created to run the backend and schema tests.
- Frontend tests will be initially based on code analysis, with a focus on fixing the identified logic discrepancy.
- The script will perform static analysis and logical checks to verify the tool's structure, error handling, and output formats.
- An advanced test script (`test-read-progress-advanced.js`) will be created for code quality, edge cases, and stability checks.

## 5. Post-Testing Actions
1.  **Analyze Results**: Review the outputs from the test scripts.
2.  **Fix Bugs**:
    -   Address the discrepancy between backend (immediate execution) and frontend (approval flow). The likely fix is to remove the approval UI from `ReadProgressBlock`.
    -   Fix any other bugs discovered.
3.  **Improve Stability**: Enhance the schema with stricter validation (`.positive()`, `.min(1)`, etc.) and add more robust checks in the tool runner.
4.  **Optimize**: Review the `analyzeProgress` logic and terminal interactions for potential performance improvements.
5.  **Final Verification**: Re-run all tests to ensure all fixes and improvements are working and have not introduced regressions.
6.  **Reporting**: Document all findings, fixes, and improvements in a final report.
