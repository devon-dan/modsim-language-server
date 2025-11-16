# Contributing to MODSIM III Language Server

Thank you for your interest in contributing to the MODSIM III Language Server! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project follows a standard code of conduct:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Assume good faith in all interactions

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/yourusername/modsim-language-server.git
   cd modsim-language-server/lsp
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/original/modsim-language-server.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```

## Development Setup

### Prerequisites

- **Node.js** 14.x or higher
- **npm** 6.x or higher
- **Git** for version control
- A code editor with TypeScript support (VS Code recommended)

### Build and Run

```bash
# Build the project
npm run build

# Run tests
npm test

# Run specific test file
npm test -- lexer.test.ts

# Run tests in watch mode
npm test -- --watch

# Lint code
npm run lint

# Fix linting issues
npm run lint -- --fix

# Format code
npm run format

# Start language server (for manual testing)
npm start -- --stdio
```

### VS Code Development

For the best development experience:

1. Open the `lsp/` directory in VS Code
2. Install recommended extensions (TypeScript, ESLint, Prettier)
3. Use `F5` to run tests with debugging
4. Use `Ctrl+Shift+B` to build the project

## Project Structure

```
lsp/
├── src/
│   ├── language/          # Core language implementation
│   │   ├── lexer.ts       # Tokenizer - converts text to tokens
│   │   ├── parser.ts      # Parser - builds AST from tokens
│   │   ├── analyzer.ts    # Semantic analyzer - type checking, validation
│   │   ├── symbols.ts     # Symbol table - scope and symbol management
│   │   ├── types.ts       # Type system definitions
│   │   ├── ast.ts         # AST node type definitions
│   │   └── diagnostics.ts # Error and warning generation
│   ├── features/          # LSP feature providers
│   │   ├── completion.ts      # Auto-completion
│   │   ├── definition.ts      # Go-to-definition
│   │   ├── references.ts      # Find references
│   │   ├── hover.ts           # Hover information
│   │   ├── semanticTokens.ts  # Semantic highlighting
│   │   ├── documentSymbols.ts # Document outline
│   │   ├── signatureHelp.ts   # Parameter hints
│   │   ├── codeAction.ts      # Quick fixes and refactorings
│   │   ├── rename.ts          # Rename refactoring
│   │   ├── documentHighlight.ts # Highlight occurrences
│   │   └── foldingRanges.ts   # Code folding
│   ├── utils/             # Utility modules
│   │   ├── logging.ts     # Winston logging
│   │   ├── workspace.ts   # Multi-file management
│   │   └── astPosition.ts # AST position utilities
│   ├── server.ts          # LSP server implementation
│   ├── connection.ts      # Connection management
│   └── cli.ts             # CLI entry point
├── test/
│   └── fixtures/          # Test MODSIM files
│       ├── sample-module.mod
│       ├── sample-object.mod
│       ├── sample-procedure.mod
│       └── sample-errors.mod
├── scripts/               # Build and test scripts
├── docs/                  # Documentation
└── test-results/          # Validation results and reports
```

## Development Workflow

### Branching Strategy

- `main` - Production-ready code, always stable
- `develop` - Integration branch for features
- `feature/feature-name` - New features
- `fix/bug-name` - Bug fixes
- `docs/doc-name` - Documentation updates

### Creating a Feature Branch

```bash
# Update your local repository
git checkout main
git pull upstream main

# Create a new feature branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. **Write Code** - Implement your feature or fix
2. **Write Tests** - Add unit tests for new functionality
3. **Run Tests** - Ensure all tests pass: `npm test`
4. **Format Code** - Run `npm run format`
5. **Lint Code** - Run `npm run lint` and fix issues
6. **Commit Changes** - Write clear commit messages

### Commit Message Guidelines

Use conventional commit format:

```
type(scope): short description

Longer description if needed

Fixes #123
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Adding or updating tests
- `refactor:` Code refactoring
- `perf:` Performance improvement
- `chore:` Build/tooling changes

**Examples:**
```
feat(parser): add support for REPEAT-UNTIL loops

fix(lexer): handle apostrophe character literals correctly

docs(readme): add installation instructions

test(analyzer): add tests for type checking
```

## Testing

### Writing Tests

Tests use Jest and are colocated with source files:

```typescript
// src/language/lexer.test.ts
import { Lexer } from './lexer';

describe('Lexer', () => {
  it('should tokenize keywords', () => {
    const lexer = new Lexer('PROCEDURE Test');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe('PROCEDURE');
    expect(tokens[1].type).toBe('IDENTIFIER');
    expect(tokens[1].value).toBe('Test');
  });
});
```

### Test Categories

1. **Unit Tests** - Test individual components in isolation
2. **Integration Tests** - Test feature interactions
3. **Validation Tests** - Test against real MODSIM code

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- lexer.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should tokenize"

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode (auto-rerun on changes)
npm test -- --watch
```

### Test Requirements

- All new features must have unit tests
- Aim for >80% code coverage on new code
- Include both positive and negative test cases
- Test edge cases and error conditions

## Code Style

### TypeScript Guidelines

- Use **strict mode** - All TypeScript strict checks enabled
- Use **explicit types** - Avoid `any`, prefer specific types
- Use **interfaces** for public APIs
- Use **type aliases** for complex types
- Use **enums** for finite sets of values

### Code Conventions

```typescript
// Good: Explicit return type
function parseExpression(): Expression {
  // ...
}

// Bad: Inferred any return
function parseExpression() {
  // ...
}

// Good: Specific error type
catch (error: ParseError) {
  // ...
}

// Bad: Catch any
catch (error) {
  // ...
}

// Good: Descriptive names
const symbolTable = new SymbolTable();
const currentToken = tokens[index];

// Bad: Abbreviations and unclear names
const st = new SymbolTable();
const t = tokens[i];
```

### Formatting

- **Indentation**: 2 spaces (no tabs)
- **Line Length**: 120 characters max
- **Quotes**: Single quotes for strings
- **Semicolons**: Always use semicolons
- **Trailing Commas**: Use in multi-line arrays/objects

Run `npm run format` to auto-format code with Prettier.

### Naming Conventions

- **Classes**: PascalCase (`SymbolTable`, `Parser`)
- **Interfaces**: PascalCase (`Statement`, `Expression`)
- **Functions/Methods**: camelCase (`parseStatement`, `tokenize`)
- **Variables**: camelCase (`currentToken`, `symbolTable`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_DEPTH`, `TOKEN_TYPES`)
- **Private members**: prefix with `_` or use `private` keyword

## Pull Request Process

### Before Submitting

1. ✅ All tests pass (`npm test`)
2. ✅ Code is formatted (`npm run format`)
3. ✅ No linting errors (`npm run lint`)
4. ✅ Commits follow conventional commit format
5. ✅ Branch is up to date with `main`

### Submitting a PR

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request** on GitHub:
   - Set base to `main` (or `develop` if using GitFlow)
   - Write clear title following conventional commit format
   - Fill out PR template with:
     - Description of changes
     - Motivation and context
     - How changes were tested
     - Screenshots (if UI changes)
     - Related issues

3. **PR Template Example**:
   ```markdown
   ## Description
   Added support for REPEAT-UNTIL loops in the parser.

   ## Motivation
   REPEAT-UNTIL is used in ~5% of RAMS files and was causing parse errors.

   ## Changes
   - Added REPEAT and UNTIL keywords to lexer
   - Implemented RepeatUntilStatement AST node
   - Updated parser to handle REPEAT...UNTIL syntax
   - Added 3 unit tests

   ## Testing
   - All existing tests pass
   - New tests added for REPEAT-UNTIL
   - Validated on RAMS files containing REPEAT

   ## Related Issues
   Fixes #42
   ```

### Review Process

1. **Automated Checks** - CI runs tests and linting
2. **Code Review** - Maintainer reviews changes
3. **Feedback** - Address any requested changes
4. **Approval** - Maintainer approves PR
5. **Merge** - PR is merged to main branch

### After Merge

1. Pull latest from upstream:
   ```bash
   git checkout main
   git pull upstream main
   ```

2. Delete feature branch:
   ```bash
   git branch -d feature/your-feature-name
   git push origin --delete feature/your-feature-name
   ```

## Reporting Issues

### Bug Reports

Use the bug report template and include:

1. **MODSIM code sample** that reproduces the issue
2. **Expected behavior**
3. **Actual behavior** (error message, incorrect output)
4. **Environment**:
   - Language server version
   - Editor/IDE and version
   - Operating system
5. **Steps to reproduce**

### Feature Requests

Use the feature request template and include:

1. **Use case** - What problem does this solve?
2. **Proposed solution** - How should it work?
3. **Alternatives considered** - Other approaches?
4. **MODSIM code examples** - Show the feature in use

### Questions

For questions:
- Check [README.md](README.md) FAQ section
- Search existing issues
- Open a new issue with "Question:" prefix

## Development Tips

### Debugging

1. **VS Code Debugging**:
   - Set breakpoints in `.ts` files
   - Press F5 to run with debugger
   - Inspect variables, call stack, etc.

2. **Logging**:
   ```typescript
   import { logger } from './utils/logging';

   logger.debug('Parsing statement', { token: currentToken });
   logger.info('Workspace indexed', { fileCount: files.length });
   logger.error('Parse error', { error, line, column });
   ```

3. **Test-Driven Development**:
   - Write failing test first
   - Implement feature to make test pass
   - Refactor while keeping tests green

### Common Tasks

**Adding a new keyword:**
1. Add to `TokenType` enum in `ast.ts`
2. Add to `KEYWORDS` map in `lexer.ts`
3. Add parser logic in `parser.ts`
4. Add unit tests
5. Update documentation

**Adding a new LSP feature:**
1. Create feature file in `src/features/`
2. Implement feature interface
3. Register handler in `server.ts`
4. Add unit tests in `.test.ts` file
5. Update README features list

**Fixing a parse error:**
1. Create minimal test case
2. Add failing test
3. Debug parser/lexer logic
4. Fix issue
5. Verify test passes
6. Test on RAMS codebase

## Resources

### MODSIM III Documentation
- [Language Guide](../modsim-docs/docs/manuals/llm-modsim-guide.md)
- [Reference Manual](../modsim-docs/docs/manuals/extracted/MSref.pdf.md)

### Language Server Protocol
- [LSP Specification](https://microsoft.github.io/language-server-protocol/)
- [LSP Types (TypeScript)](https://github.com/microsoft/vscode-languageserver-node)

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

### Testing
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## Questions?

If you have questions not covered here:
- Open an issue with "Question:" prefix
- Check existing issues and discussions
- Reach out to maintainers

Thank you for contributing to MODSIM III Language Server! 🎉
