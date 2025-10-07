# Think Tool - The "Mini-Brain" Intelligence System Upgrade

## Overview

This document describes the transformation of the Think tool into a complete **Intelligence Analysis & Decision System** - a "mini-brain" that implements a closed-loop problem-solving process.

## Upgrade Date
2025-10-05

## Motivation

The Think tool is a **high-frequency tool** used extensively by the AI agent. The previous implementation had two issues:
1. **Over-simplified**: Initial version was too minimal, lacking guidance for structured thinking
2. **Over-engineered**: Second version had 600+ lines of prompts with extensive problem-solving frameworks that could interfere with model behavior

This upgrade implements a **complete intelligence system** where each thought forms an interconnected chain: problem identification → knowledge assessment → information acquisition → solution design → action execution.

## The "Mini-Brain" Concept

The upgraded Think tool is conceptualized as a **small but complete brain** - each sentence is interconnected, forming a complete system for:
- **Intelligence Analysis** (情报分析)
- **Information Acquisition** (信息获取)
- **Solution Design** (方案指定)
- **Problem-Solving Chain** (解决问题的链路)

## The Intelligence Analysis & Decision System

### Complete Decision Flow

```
┌─────────────────────────────────────────────────────────┐
│              Intelligence Analysis & Decision System     │
│                    (The "Mini-Brain")                    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌──────────────────────────────────┐
        │   1. WHAT (Problem Identification)│
        │   Precisely describe core issue   │
        └──────────────────────────────────┘
                            │
                            ▼
        ┌──────────────────────────────────┐
        │   2. Knowledge Assessment         │
        │   Do I have enough information?   │
        └──────────────────────────────────┘
                    │               │
            ┌───────┴───────┐       │
            │ YES           │ NO    │
            ▼               ▼       │
    ┌──────────┐    ┌──────────────┴────────┐
    │ HOW      │    │  3. Information        │
    │ Solution │    │     Acquisition        │
    └──────────┘    └────────────────────────┘
            │                │
            │        ┌───────┴────────┐
            │        │                │
            │        ▼                ▼
            │   ┌─────────┐    ┌──────────┐
            │   │Local    │    │External  │
            │   │Search   │    │Resources │
            │   └─────────┘    └──────────┘
            │        │                │
            │        └────────┬───────┘
            │                 ▼
            │        ┌─────────────────┐
            │        │  Verify & Align │
            │        └─────────────────┘
            │                 │
            └─────────────────┘
                    │
                    ▼
        ┌──────────────────────────────────┐
        │   4. WHY (Reasoning Analysis)     │
        │   Explain why solution works      │
        └──────────────────────────────────┘
                    │
                    ▼
        ┌──────────────────────────────────┐
        │   5. WHERE (Action Decision)      │
        │   Determine next concrete action  │
        └──────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────┐      ┌──────────────────┐
│  Execute     │      │   Stop & Report   │
│  Solution    │      │   (if failed)     │
└──────────────┘      └──────────────────┘
        │                       │
        ▼                       │
┌──────────────┐                │
│  6. Verify   │                │
│  Run Checks  │                │
└──────────────┘                │
        │                       │
        └───────────────────────┘
                    │
                    ▼
        ┌──────────────────────────────────┐
        │   Complete / Report               │
        └──────────────────────────────────┘
```

### System Components

#### 1. WHAT - Problem Identification
- Precisely and concisely describe the core issue
- No vague descriptions - be specific

#### 2. Knowledge Assessment
- **Critical decision point**: Do I have enough information?
- If YES → proceed to solution design (HOW)
- If NO → proceed to information acquisition

#### 3. Information Acquisition Decision Tree
When knowledge is insufficient, choose the appropriate path:

- **Local resources limited?**
  - Call `codebase-retrieval` for semantic search
  - Call `grep-search` for exact pattern matching
  - Call `view` to read specific files

- **User answer vague?**
  - Ask clarifying questions
  - Request specific examples
  - Confirm understanding

- **Need external knowledge?**
  - Search online for documentation
  - Learn new concepts
  - Verify alignment with current goal

- **Complex situation?**
  - Use think tool recursively to break down
  - Decompose into smaller sub-problems
  - Analyze each component separately

- **Stubborn problem?**
  - Systematically examine code relationship chains
  - Trace execution flow
  - Map dependencies and interactions

#### 4. HOW - Solution Specification
- Specify the concrete approach
- Confirm next steps
- **Plan tool coordination** (key to solving problems)
- Consider tool interaction and sequencing

#### 5. WHY - Reasoning Analysis
- Explain why this solution works
- Provide logical justification
- **Logical rigor is essential**
- Show your reasoning chain

#### 6. WHERE - Action Decision
Determine the concrete next action:

- **Execute solution** if confident
- **Stop and report** if multiple attempts failed
  - Prevent code damage
  - Write detailed report
  - Request user guidance
- **Consult user** for UI/UX decisions
- **Run error check** after work completion

### Core Principles (The "Mini-Brain" Rules)

1. **Be honest, don't avoid problems**
   - Acknowledge when you don't know
   - Don't make assumptions

2. **Stay calm and clear-headed**
   - Efficient problem-solving requires clarity
   - Don't rush into solutions

3. **Understand fully before acting**
   - **No blind action**
   - Gather sufficient information first

4. **Combine tools strategically**
   - Tool coordination is key
   - Plan tool interaction sequences

5. **Provide high-quality, logically rigorous code**
   - Quality over speed
   - Logical rigor is essential

6. **Only add detection/logging when uncertain**
   - Don't pollute code with unnecessary logging
   - Use logging strategically

7. **Stop and report if problem persists**
   - After multiple attempts, stop before causing damage
   - Write comprehensive report
   - Seek user input

## Implementation Details

### 1. Schema Definition
**File**: `extension/src/agent/v1/tools/schema/think.ts`

- Added comprehensive framework description in the schema
- Included 3 examples demonstrating different scenarios:
  - Complex refactoring with multi-step planning
  - Simple bug fix with immediate solution
  - Investigation scenario requiring more information

**Key Changes**:
- Schema description now includes the full What-How-Why-Where framework
- Examples show proper framework usage
- Reduced from 132 lines to 72 lines (45% reduction)

### 2. Prompt Definition
**File**: `extension/src/agent/v1/prompts/tools/think.ts`

- Updated tool description to reference the framework
- Modified parameter description to guide framework usage
- Updated capabilities to reflect strategic thinking
- Added 3 examples showing framework in action

**Key Changes**:
- Reduced from 691 lines to 73 lines (89% reduction)
- Removed verbose usage notes
- Kept only essential examples
- Maintained clarity while being concise

### 3. Backend Tool Runner
**File**: `extension/src/agent/v1/tools/runners/think.tool.ts`

**New Features**:
- Added `analyzeFrameworkUsage()` method to detect framework markers
- Tracks framework completeness (0-1 score)
- Detects presence of What, How, Why, Where elements
- Enhanced tool response to indicate framework usage

**New Method**:
```typescript
private analyzeFrameworkUsage(thoughts: string): {
  usesFramework: boolean;
  hasWhat: boolean;
  hasHow: boolean;
  hasWhy: boolean;
  hasWhere: boolean;
  completeness: number;
}
```

**Enhanced Execute Method**:
- Analyzes framework usage automatically
- Passes framework metadata to UI
- Includes framework info in tool response

### 4. Type Definitions
**File**: `extension/src/shared/new-tools.ts`

**New Properties**:
```typescript
export type ThinkTool = {
  tool: 'think';
  thoughts: string;
  isComplexThinking?: boolean;
  usesFramework?: boolean;          // NEW
  frameworkCompleteness?: number;   // NEW (0-1)
};
```

## Usage Examples

### Example 1: Complex Planning
```xml
<tool name="think">
  <thoughts>
**What**: Auth module has tight coupling causing maintenance issues
**How**: Need to refactor with dependency injection pattern
**Why**: Current code violates separation of concerns, making testing difficult
**Where**: Next steps:
1. Read current auth module to understand dependencies
2. Design abstraction layer
3. Implement with tests
4. Migrate gradually
  </thoughts>
</tool>
```

### Example 2: Simple Fix
```xml
<tool name="think">
  <thoughts>
**What**: Error at line 42 - accessing user.profile.email without null check
**How**: Add defensive null check before accessing nested property
**Why**: User object exists but profile may be undefined
**Where**: Apply fix immediately, this is straightforward
  </thoughts>
</tool>
```

### Example 3: Investigation Needed
```xml
<tool name="think">
  <thoughts>
**What**: Build failing with TypeScript errors in 3 files
**How**: Not sure yet - need to investigate error messages
**Why**: Recent refactoring may have broken type definitions
**Where**: Need more info → will read error logs and examine affected files
  </thoughts>
</tool>
```

## Benefits

### 1. Structured Thinking
- Provides clear framework for organizing thoughts
- Ensures all critical aspects are considered
- Guides decision-making process

### 2. Action-Oriented
- "Where" element explicitly determines next steps
- Encourages tool coordination
- Prevents analysis paralysis

### 3. Honest Problem-Solving
- Framework encourages transparency
- Acknowledges when more information is needed
- Promotes stopping before causing damage

### 4. High-Frequency Friendly
- Concise enough to not interfere with model behavior
- Structured enough to provide value
- Balances guidance with brevity

### 5. Quality Assurance
- Principles emphasize high-quality solutions
- Encourages understanding before action
- Promotes logical rigor

## Technical Metrics

### Code Reduction
- **Schema file**: 132 lines → 72 lines (45% reduction)
- **Prompt file**: 691 lines → 73 lines (89% reduction)
- **Total reduction**: 823 lines → 145 lines (82% reduction)

### New Capabilities
- Framework usage detection
- Completeness scoring
- Enhanced metadata for UI

### Build Status
- ✅ TypeScript compilation successful
- ✅ ESLint checks passed
- ✅ VSIX package generated: `vlinder-3.7.21.vsix` (35.4 MB)
- ✅ No errors or warnings

## Future Enhancements

### Potential UI Improvements
- Display framework completeness indicator
- Highlight missing framework elements
- Show framework usage statistics

### Analytics
- Track framework adoption rate
- Measure correlation between framework usage and success
- Identify common patterns

### Adaptive Guidance
- Suggest framework elements based on context
- Provide contextual hints for "Where" decisions
- Learn from successful problem-solving patterns

## Conclusion

This upgrade successfully transforms the Think tool into a **structured thinking framework** that:
- Guides the AI agent through rigorous problem-solving
- Remains concise enough for high-frequency use
- Encourages strategic tool coordination
- Promotes honest, quality-focused solutions

The What-How-Why-Where framework provides a clear mental model for approaching problems while maintaining the flexibility needed for diverse scenarios.

