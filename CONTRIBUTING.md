# Contributing to BukaJS

Thank you for your interest in contributing to BukaJS! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style and Standards](#code-style-and-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)
- [Architecture Overview](#architecture-overview)

## Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow. Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to ensure a welcoming environment for everyone.

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/bukajs.git
cd bukajs
```

3. Add the original repository as a remote:

```bash
git remote add upstream https://github.com/tumbati/bukajs.git
```

## Development Setup

1. Install dependencies:

```bash
npm install
```

2. Start development mode with hot reloading:

```bash
npm run dev
```

3. Run tests:

```bash
npm test
```

4. Run tests with coverage:

```bash
npm run test:coverage
```

5. Check code quality:

```bash
npm run quality
```

## Code Style and Standards

We use ESLint and Prettier to maintain consistent code style across the project.

### Code Style Rules

- **Indentation**: Use tabs (4 spaces equivalent)
- **Quotes**: Use double quotes for strings
- **Semicolons**: Always use semicolons
- **Line endings**: Use LF (Unix-style)
- **Trailing commas**: Never use trailing commas

### Before Committing

Always run the following commands before committing:

```bash
# Format code
npm run format

# Check linting
npm run lint

# Run tests
npm test

# Check TypeScript types
npm run typecheck
```

Or run all quality checks at once:

```bash
npm run quality
```

### File Structure

```
src/
├── core/           # Core viewer and base classes
├── renderers/      # Document format renderers
├── styles/         # CSS and styling
└── types/          # TypeScript definitions

tests/
├── core/           # Core functionality tests
├── renderers/      # Renderer-specific tests
└── integration/    # Integration tests

examples/
├── html/           # HTML examples
├── react/          # React examples
└── vue/            # Vue.js examples
```

## Testing

We use Vitest for testing with comprehensive coverage requirements.

### Writing Tests

- Place tests in the `tests/` directory matching the source structure
- Use descriptive test names that explain what is being tested
- Include both positive and negative test cases
- Mock external dependencies appropriately
- Aim for high code coverage (minimum 80%)

### Test Categories

1. **Unit Tests**: Test individual functions and classes
2. **Integration Tests**: Test component interactions
3. **Renderer Tests**: Test document format support

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run dev:test

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Submitting Changes

### Branch Naming

Use descriptive branch names:

- `feature/add-pdf-annotations`
- `fix/memory-leak-on-destroy`
- `docs/update-api-documentation`
- `refactor/improve-renderer-architecture`

### Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
- `feat(pdf): add text search functionality`
- `fix(image): resolve zoom reset issue`
- `docs(readme): update installation instructions`

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes following the code style guidelines
3. Add or update tests as necessary
4. Ensure all tests pass and code coverage meets requirements
5. Update documentation if needed
6. Submit a pull request with a clear description

#### Pull Request Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] Code coverage maintained

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

## Issue Reporting

When reporting issues, please include:

### Bug Reports

- BukaJS version
- Browser and version
- Operating system
- Steps to reproduce
- Expected behavior
- Actual behavior
- Sample files (if applicable)
- Console errors
- Screenshots (if visual issue)

### Template

```markdown
**BukaJS Version:** 1.0.0
**Browser:** Chrome 118
**OS:** Windows 11

**Steps to Reproduce:**
1. Load PDF document
2. Search for text
3. Click on search result

**Expected:** Should navigate to the page with highlighted text
**Actual:** Nothing happens

**Console Errors:**
```
Error: Cannot read property 'goto' of undefined
```

**Additional Context:**
The issue occurs with PDFs containing special characters.
```

## Feature Requests

Feature requests should include:

- Clear description of the problem to solve
- Proposed solution
- Alternative solutions considered
- Examples or mockups
- Potential impact on existing functionality

## Architecture Overview

### Core Components

1. **BukaViewer**: Main viewer class that orchestrates everything
2. **BaseRenderer**: Abstract base class for document renderers
3. **RendererFactory**: Factory for creating appropriate renderers
4. **DocumentDetector**: Utility for detecting document types

### Renderer Architecture

Each document format has its own renderer that extends `BaseRenderer`:

- **PDFRenderer**: Handles PDF documents using PDF.js
- **ImageRenderer**: Handles images (PNG, JPEG, SVG)
- **DocxRenderer**: Handles Word documents using Mammoth.js
- **XlsxRenderer**: Handles spreadsheets using SheetJS
- **PresentationRenderer**: Handles PowerPoint presentations

### Adding New Renderers

1. Create a new renderer class extending `BaseRenderer`
2. Implement required methods: `load()`, `render()`, `search()`
3. Register the renderer with `RendererFactory`
4. Add comprehensive tests
5. Update documentation

### Event System

BukaJS uses an event-driven architecture:

- Document loading events
- Page navigation events
- Zoom change events
- Search result events
- Annotation events

### Styling System

- Modular CSS with BEM methodology
- Theme support (default, dark, Tailwind CSS)
- Responsive design principles
- CSS custom properties for theming

## Performance Guidelines

- Lazy load resources when possible
- Use virtual scrolling for large documents
- Optimize canvas rendering
- Implement proper cleanup in `destroy()` methods
- Consider memory usage, especially for large files

## Security Considerations

- Validate all input files
- Sanitize HTML content from documents
- Avoid exposing sensitive information
- Use Content Security Policy when possible
- Handle malicious documents gracefully

## Documentation

When contributing, please update documentation:

- JSDoc comments for new APIs
- README for new features
- Examples for new functionality
- TypeScript definitions

## Questions?

If you have questions about contributing:

1. Check existing issues and discussions
2. Create a new issue with the "question" label
3. Reach out to maintainers

Thank you for contributing to BukaJS! 🎉