# Contributing to Vlinder V2

Thank you for your interest in contributing to Vlinder V2! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Please be considerate of others and follow standard open-source community guidelines.

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- VS Code 1.85+
- Git

### Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/VlinderV2.git
cd VlinderV2/extension
```

---

## Development Setup

### Install Dependencies

```bash
pnpm install
```

### Build the Extension

```bash
# Development build with watch mode
pnpm run dev

# Production build
pnpm run build
```

### Run Tests

```bash
pnpm run test
```

### Lint Code

```bash
pnpm run lint
```

### Package Extension

```bash
pnpm run package
```

---

## Project Structure

```
extension/src/
├── agent/v2/           # V2 Agent System (Main focus)
│   ├── types/          # Type definitions
│   ├── AgentSwarm/     # Agent orchestration
│   ├── Engines/        # Engine implementations
│   └── ...
├── api/                # API layer
├── db/                 # Database layer
├── integrations/       # External integrations
├── providers/          # VS Code providers
└── shared/             # Shared utilities
```

---

## Coding Standards

### TypeScript

- Use TypeScript 5.0+ features
- Enable strict mode
- Prefer interfaces over types for object shapes
- Use Zod for runtime validation

### Code Style

- Use 2-space indentation
- Use semicolons
- Maximum line length: 100 characters
- Use meaningful variable and function names

### File Naming

- Use kebab-case for file names: `my-component.ts`
- Use PascalCase for class names: `MyClass`
- Use camelCase for function and variable names: `myFunction`

### Documentation

- Add JSDoc comments for public APIs
- Include examples in documentation
- Update README.md for new features

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style changes |
| `refactor` | Code refactoring |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |

### Examples

```bash
feat(agent): add handoff system for Bee agents
fix(apply-engine): resolve dependency cycle detection
docs(readme): update installation instructions
test(context-engine): add unit tests for search
```

---

## Pull Request Process

### Before Submitting

1. **Update from main**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run all checks**
   ```bash
   pnpm run lint
   pnpm run test
   pnpm run build
   ```

3. **Update documentation**
   - Update README.md if needed
   - Update CHANGELOG.md with your changes
   - Add JSDoc comments for new APIs

### Submitting

1. Create a feature branch
   ```bash
   git checkout -b feat/my-feature
   ```

2. Make your changes and commit
   ```bash
   git add .
   git commit -m "feat: my feature description"
   ```

3. Push to your fork
   ```bash
   git push origin feat/my-feature
   ```

4. Open a Pull Request on GitHub

### PR Requirements

- [ ] Code compiles without errors
- [ ] All tests pass
- [ ] Lint checks pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] PR description is clear

---

## Areas for Contribution

### High Priority

- Engine implementations completion
- Test coverage improvement
- Documentation enhancement
- Bug fixes

### Medium Priority

- New provider integrations
- Performance optimizations
- UI/UX improvements

### Low Priority

- Code refactoring
- Example additions
- Translation support

---

## Questions?

Feel free to open an issue for:
- Bug reports
- Feature requests
- Questions about the codebase
- Documentation improvements

---

Thank you for contributing to Vlinder V2! 🦋
