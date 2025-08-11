# Contributing to BukaJS

Thank you for your interest in contributing to BukaJS! This document provides comprehensive guidelines and instructions for contributing to this universal document viewer library.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Code Style and Standards](#code-style-and-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)
- [Architecture Overview](#architecture-overview)
- [Renderer Development](#renderer-development)
- [Performance Guidelines](#performance-guidelines)
- [Security Considerations](#security-considerations)

## Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow. Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to ensure a welcoming environment for everyone.

## Getting Started

### Prerequisites

- **Node.js** (version 16 or higher)
- **npm** or **yarn**
- **Git**
- Modern browser for testing (Chrome 88+, Firefox 85+, Safari 14+, Edge 88+)

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

1. **Install dependencies:**

```bash
npm install
```

2. **Start development mode with hot reloading:**

```bash
npm run dev
```

3. **Run tests:**

```bash
npm test
```

4. **Run tests with coverage:**

```bash
npm run test:coverage
```

5. **Check code quality:**

```bash
npm run quality
```

6. **Build for production:**

```bash
npm run build
```

## Project Structure

```
bukajs/
├── src/
│   ├── core/                 # Core viewer and base classes
│   │   ├── base-renderer.ts  # Abstract renderer base class
│   │   ├── buka-viewer.ts    # Main viewer orchestrator
│   │   ├── config.ts         # Constants and configurations
│   │   ├── document-detector.ts # MIME type detection
│   │   └── render-factory.ts # Renderer factory pattern
│   ├── renderers/            # Document format renderers
│   │   ├── pdf.ts           # PDF renderer (PDF.js integration)
│   │   ├── image.ts         # Enhanced image renderer
│   │   ├── docx.ts          # DOCX renderer (Mammoth.js)
│   │   ├── xlsx.ts          # Excel renderer (SheetJS)
│   │   └── presentation.ts  # PowerPoint renderer
│   ├── styles/              # CSS and styling
│   │   ├── core.css         # Base styles
│   │   ├── tailwind.css     # Tailwind theme
│   │   └── index.ts         # Style exports
│   └── types/               # TypeScript definitions
│       ├── index.d.ts       # Main type definitions
│       └── external.d.ts    # External library types
├── tests/
│   ├── core/                # Core functionality tests
│   ├── renderers/           # Renderer-specific tests
│   ├── integration/         # Integration tests
│   └── data/                # Test data and fixtures
├── examples/
│   ├── basic/               # HTML examples
│   ├── react/               # React integration example
│   ├── vue/                 # Vue.js integration example
│   ├── annotations/         # Advanced annotations demo
│   └── enhanced-image-demo.html # Image editing showcase
├── dist/                    # Built files (generated)
└── coverage/                # Coverage reports (generated)
```

## Code Style and Standards

We use **ESLint** and **Prettier** to maintain consistent code style across the project.

### Code Style Rules

- **Language**: TypeScript with strict mode enabled
- **Indentation**: Use tabs (4 spaces equivalent)
- **Quotes**: Use double quotes for strings
- **Semicolons**: Always use semicolons
- **Line endings**: Use LF (Unix-style)
- **Trailing commas**: Never use trailing commas
- **Naming conventions**:
  - Classes: PascalCase (`BukaViewer`, `BaseRenderer`)
  - Functions/methods: camelCase (`loadDocument`, `renderPage`)
  - Constants: UPPER_SNAKE_CASE (`SUPPORTED_FORMATS`, `EVENTS`)
  - Interfaces: PascalCase with descriptive names (`DocumentInfo`, `ViewerOptions`)

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

### Code Organization

- **Imports**: Group imports logically (external libraries, internal modules, types)
- **Exports**: Use named exports, avoid default exports except for main classes
- **Comments**: Use JSDoc for public APIs, inline comments for complex logic
- **Error handling**: Always handle errors gracefully with meaningful messages

### TypeScript Guidelines

- Use strict type checking
- Avoid `any` types (use proper interfaces or `unknown`)
- Prefer interfaces over types for object definitions
- Use union types for multiple possibilities
- Document complex types with JSDoc comments

## Testing

We use **Vitest** for testing with comprehensive coverage requirements.

### Test Structure

- **Unit Tests**: Test individual functions and classes in isolation
- **Integration Tests**: Test component interactions and workflows
- **Renderer Tests**: Test document format support and rendering accuracy
- **Visual Regression**: Test UI components (future enhancement)

### Writing Tests

1. **Descriptive Names**: Use clear, descriptive test names that explain what is being tested
2. **AAA Pattern**: Follow Arrange, Act, Assert pattern
3. **Positive and Negative Cases**: Include both success and failure scenarios
4. **Mock Dependencies**: Mock external dependencies appropriately
5. **Coverage**: Aim for high code coverage (minimum 80%)

### Test Categories

```javascript
describe('BukaViewer', () => {
  describe('Document Loading', () => {
    test('should load PDF documents successfully', async () => {
      // Arrange
      const viewer = new BukaViewer(container);
      const pdfFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
      
      // Act
      await viewer.load(pdfFile);
      
      // Assert
      expect(viewer.getTotalPages()).toBeGreaterThan(0);
    });
    
    test('should handle invalid file formats gracefully', async () => {
      // Arrange
      const viewer = new BukaViewer(container);
      const invalidFile = new File(['invalid'], 'test.invalid');
      
      // Act & Assert
      await expect(viewer.load(invalidFile)).rejects.toThrow('Unsupported format');
    });
  });
});
```

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

# Run specific test file
npm test -- image-renderer.test.js
```

## Submitting Changes

### Branch Naming

Use descriptive branch names following this pattern:

- `feature/add-digital-signatures` - New features
- `fix/memory-leak-on-destroy` - Bug fixes
- `docs/update-api-documentation` - Documentation updates
- `refactor/improve-renderer-architecture` - Code refactoring
- `test/add-integration-tests` - Test improvements
- `chore/update-dependencies` - Maintenance tasks

### Commit Messages

Follow **conventional commit** format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples:**
- `feat(image): add advanced cropping with aspect ratios`
- `fix(pdf): resolve zoom reset issue on page navigation`
- `docs(readme): update installation instructions`
- `refactor(renderers): improve error handling consistency`
- `test(integration): add comprehensive viewer tests`

### Pull Request Process

1. **Create Feature Branch**: Always branch from `main`
2. **Implement Changes**: Follow code style and architectural guidelines
3. **Add Tests**: Ensure new functionality is thoroughly tested
4. **Update Documentation**: Update README, JSDoc, and examples as needed
5. **Run Quality Checks**: Ensure all tests pass and code quality standards are met
6. **Submit PR**: Create pull request with clear description and context

#### Pull Request Template

```markdown
## Description
Brief description of the changes and their purpose.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Testing
- [ ] Tests added/updated for new functionality
- [ ] All existing tests pass
- [ ] Code coverage maintained/improved
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots to help explain your changes, especially for UI modifications.

## Checklist
- [ ] Code follows the style guidelines of this project
- [ ] Self-review of the code completed
- [ ] Code is commented, particularly in hard-to-understand areas
- [ ] Corresponding documentation updated
- [ ] Changes generate no new warnings
- [ ] Added tests prove that the fix is effective or that the feature works
- [ ] New and existing unit tests pass locally
- [ ] Any dependent changes have been merged and published

## Breaking Changes
Describe any breaking changes and migration steps if applicable.

## Additional Notes
Any additional information, considerations, or context.
```

## Issue Reporting

When reporting issues, please include detailed information to help us reproduce and fix the problem.

### Bug Reports

**Template:**

```markdown
**BukaJS Version:** 1.0.0
**Browser:** Chrome 118.0.0.0
**Operating System:** Windows 11
**Document Type:** PDF / Image / DOCX / XLSX / PPTX

**Steps to Reproduce:**
1. Load document using `viewer.load('path/to/file')`
2. Navigate to page 5
3. Search for text "example"
4. Click on search result

**Expected Behavior:**
Should navigate to the page with highlighted search result.

**Actual Behavior:**
Nothing happens, page doesn't navigate.

**Console Errors:**
```
Error: Cannot read property 'goto' of undefined
    at SearchResult.onClick (viewer.js:234)
```

**Additional Context:**
- Issue occurs only with PDFs containing special characters
- Works correctly in Firefox
- File size: 2.3MB, 50 pages

**Sample File:**
[Attach or provide link to problematic file if possible]
```

### Performance Issues

For performance-related issues, include:

- File size and complexity
- Browser performance profiling data
- Memory usage patterns
- Network conditions (if applicable)

## Feature Requests

Feature requests should include:

### Template

```markdown
**Feature Summary:**
Brief description of the requested feature.

**Problem Statement:**
Clear description of the problem this feature would solve.

**Proposed Solution:**
Detailed description of how you envision this feature working.

**Alternative Solutions:**
Other approaches you've considered.

**Use Cases:**
Specific scenarios where this feature would be beneficial.

**Implementation Considerations:**
- Performance implications
- Browser compatibility
- API design
- Breaking changes

**Examples/Mockups:**
Visual examples or code snippets demonstrating the feature.
```

## Architecture Overview

### Core Architecture Principles

1. **Modular Design**: Each document format has its own renderer
2. **Plugin System**: Renderers are dynamically loaded and registered
3. **Event-Driven**: Loose coupling through comprehensive event system
4. **Performance-First**: Lazy loading, virtual scrolling, and efficient rendering
5. **Framework Agnostic**: Works with any framework or vanilla JavaScript

### Core Components

#### BukaViewer
The main orchestrator that manages the overall viewing experience:

```typescript
class BukaViewer {
  constructor(container: HTMLElement, options: ViewerOptions)
  
  // Document management
  async load(source: DocumentSource): Promise<void>
  getCurrentPage(): number
  getTotalPages(): number
  
  // Navigation and view control
  async goto(page: number): Promise<boolean>
  getZoom(): number
  async setZoom(factor: number): Promise<void>
  
  // Search functionality
  async search(query: string): Promise<SearchResult[]>
  
  // Annotation system
  addAnnotation(annotation: Annotation): string
  removeAnnotation(id: string): boolean
  exportAnnotations(): Annotation[]
  importAnnotations(annotations: Annotation[]): void
  
  // Event handling
  on(event: string, callback: EventCallback): void
  off(event: string, callback: EventCallback): void
  emit(event: string, data: any): void
  
  // Lifecycle
  destroy(): void
}
```

#### BaseRenderer
Abstract base class that all renderers must implement:

```typescript
abstract class BaseRenderer {
  // Required methods
  abstract load(source: DocumentSource): Promise<void>
  abstract render(): Promise<void>
  abstract search(query: string): Promise<SearchResult[]>
  
  // Optional methods with default implementations
  async goto(page: number): Promise<boolean>
  async setZoom(factor: number): Promise<void>
  
  // Annotation system
  addAnnotation(annotation: Annotation): string
  removeAnnotation(id: string): boolean
  exportAnnotations(): Annotation[]
  importAnnotations(annotations: Annotation[]): void
  
  // Event handling
  on(event: string, callback: EventCallback): void
  off(event: string, callback: EventCallback): void
  emit(event: string, data: any): void
  
  // Lifecycle
  destroy(): void
}
```

## Renderer Development

### Creating a New Renderer

1. **Extend BaseRenderer**: Create a new class extending the base renderer
2. **Implement Required Methods**: Implement `load()`, `render()`, and `search()`
3. **Register with Factory**: Register the renderer for appropriate MIME types
4. **Add Tests**: Create comprehensive test suite
5. **Update Documentation**: Document the new renderer capabilities

### Example Renderer Implementation

```typescript
import { BaseRenderer, RendererFactory, SUPPORTED_FORMATS } from '../core';

export class CustomRenderer extends BaseRenderer {
  private document: CustomDocument | null = null;

  async load(source: DocumentSource): Promise<void> {
    try {
      // Load and parse the document
      this.document = await this.parseDocument(source);
      
      // Update renderer state
      this.totalPages = this.document.getPageCount();
      this.currentPage = 1;
      
      // Emit loaded event
      this.emit(EVENTS.DOCUMENT_LOADED, {
        totalPages: this.totalPages,
        title: this.document.getTitle()
      });
    } catch (error) {
      this.emit(EVENTS.ERROR, { error: error.message });
      throw error;
    }
  }

  async render(): Promise<void> {
    if (!this.document) return;
    
    try {
      // Clear container
      this.container.innerHTML = '';
      
      // Render current page
      const pageElement = await this.document.renderPage(this.currentPage);
      this.container.appendChild(pageElement);
      
      // Apply zoom and transformations
      this.applyTransformations(pageElement);
    } catch (error) {
      this.emit(EVENTS.ERROR, { error: error.message });
      throw error;
    }
  }

  async search(query: string): Promise<SearchResult[]> {
    if (!this.document || !query.trim()) return [];
    
    const results = this.document.search(query);
    
    this.emit(EVENTS.SEARCH_RESULT, {
      query,
      results,
      currentIndex: 0
    });
    
    return results;
  }

  // Helper methods
  private async parseDocument(source: DocumentSource): Promise<CustomDocument> {
    // Implementation specific parsing logic
  }
  
  private applyTransformations(element: HTMLElement): void {
    // Apply zoom, rotation, etc.
  }
}

// Register the renderer
RendererFactory.register('application/custom', CustomRenderer);
```

### Enhanced Image Renderer Features

The ImageRenderer includes advanced editing capabilities:

#### Cropping System
- **Interactive crop selection** with mouse/touch support
- **8 resize handles** (4 corners + 4 edges) for precise control
- **Draggable crop area** for repositioning
- **Aspect ratio constraints** with common presets
- **Live preview** with visual feedback

#### Filter System
- **7 different filters**: brightness, contrast, saturation, hue, blur, sepia, grayscale
- **Real-time application** with canvas-based rendering
- **Chainable effects** for complex editing
- **Export functionality** in multiple formats (PNG, JPEG, WebP)

#### Implementation Details

```typescript
// Cropping API
renderer.startCropping();
renderer.setAspectRatio(16/9); // Lock aspect ratio
renderer.applyCrop();

// Filter API
renderer.setFilter('brightness', 120); // 120%
renderer.setFilter('contrast', 110);   // 110%
renderer.toGrayscale(); // Quick effect

// Convenience methods
renderer.brighten(10);
renderer.darken(5);
renderer.increaseContrast(15);

// Export edited image
const dataUrl = renderer.exportImage('png', 0.9);
```

## Performance Guidelines

### General Principles

1. **Lazy Loading**: Load resources only when needed
2. **Virtual Scrolling**: Efficiently handle large documents
3. **Canvas Optimization**: Use hardware acceleration when possible
4. **Memory Management**: Implement proper cleanup in `destroy()` methods
5. **Debouncing**: Debounce expensive operations like search and zoom
6. **Caching**: Cache parsed documents and rendered content

### Specific Optimizations

#### Document Loading
- Stream large files instead of loading entirely into memory
- Parse documents progressively
- Use Web Workers for CPU-intensive tasks

#### Rendering Performance
- Implement viewport-based rendering for large documents
- Use `requestAnimationFrame` for smooth animations
- Optimize Canvas drawing operations
- Implement dirty region updates

#### Memory Management
```typescript
class Renderer extends BaseRenderer {
  destroy(): void {
    // Clean up event listeners
    this.eventListeners.clear();
    
    // Release object URLs
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }
    
    // Clear DOM references
    this.container.innerHTML = '';
    
    // Release large objects
    this.documentData = null;
    
    // Call parent cleanup
    super.destroy();
  }
}
```

## Security Considerations

### Input Validation

Always validate and sanitize input:

```typescript
// File type validation
private validateFileType(file: File): boolean {
  const allowedTypes = Object.values(SUPPORTED_FORMATS);
  return allowedTypes.includes(file.type);
}

// Content sanitization for HTML-based renderers
private sanitizeHTML(html: string): string {
  // Use DOMPurify or similar library
  return DOMPurify.sanitize(html);
}
```

### Secure Practices

1. **Input Validation**: Validate all file inputs and MIME types
2. **Content Sanitization**: Sanitize HTML content from documents
3. **XSS Prevention**: Avoid innerHTML with unsanitized content
4. **CSP Compliance**: Ensure compatibility with Content Security Policy
5. **Error Handling**: Don't expose internal system information in errors
6. **Resource Limits**: Implement limits on file size and processing time

### Handling Malicious Content

```typescript
private async loadDocument(source: DocumentSource): Promise<void> {
  try {
    // Validate file size
    if (source.file && source.file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds maximum limit');
    }
    
    // Validate MIME type
    if (!this.isValidMimeType(source.file?.type)) {
      throw new Error('Unsupported file type');
    }
    
    // Process with timeout
    const result = await Promise.race([
      this.parseDocument(source),
      this.createTimeoutPromise(PROCESSING_TIMEOUT)
    ]);
    
    return result;
  } catch (error) {
    // Log securely without exposing details
    console.error('Document loading failed', { type: source.file?.type });
    throw new Error('Failed to load document');
  }
}
```

## Documentation

When contributing, please update documentation:

### JSDoc Comments
```typescript
/**
 * Loads a document from various sources
 * @param source - Document source (File, Blob, or URL)
 * @param options - Loading options
 * @returns Promise that resolves when document is loaded
 * @throws {Error} When document format is unsupported
 * @example
 * ```typescript
 * await viewer.load(pdfFile);
 * await viewer.load('https://example.com/document.pdf');
 * ```
 */
async load(source: DocumentSource, options?: LoadOptions): Promise<void>
```

### README Updates
- Update feature lists for new capabilities
- Add examples for new functionality
- Update browser compatibility if needed
- Add performance notes for significant changes

### TypeScript Definitions
- Update interfaces for new options or data structures
- Add proper type annotations for new methods
- Document complex types with comments
- Export new types that might be used by consumers

## Testing Strategy

### Unit Tests
Focus on individual components and functions:

```typescript
describe('DocumentDetector', () => {
  test('should detect PDF files correctly', () => {
    const detector = new DocumentDetector();
    const pdfFile = new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' });
    
    expect(detector.detect(pdfFile)).toBe(SUPPORTED_FORMATS.PDF);
  });
});
```

### Integration Tests
Test component interactions:

```typescript
describe('BukaViewer Integration', () => {
  test('should load and render PDF documents', async () => {
    const viewer = new BukaViewer(container);
    const mockPdfFile = createMockPdfFile();
    
    await viewer.load(mockPdfFile);
    
    expect(viewer.getTotalPages()).toBeGreaterThan(0);
    expect(container.querySelector('.buka-document')).toBeTruthy();
  });
});
```

### Visual Regression Tests (Future)
Test UI components and rendering accuracy:

```typescript
describe('Visual Regression', () => {
  test('should render PDF pages consistently', async () => {
    const screenshot = await captureScreenshot();
    expect(screenshot).toMatchSnapshot();
  });
});
```

## Release Process

### Version Numbering
We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Incompatible API changes
- **MINOR**: New functionality in a backwards compatible manner
- **PATCH**: Backwards compatible bug fixes

### Release Checklist

1. **Update Version**: Update version in `package.json`
2. **Update Changelog**: Document all changes
3. **Run Full Test Suite**: Ensure all tests pass
4. **Quality Check**: Run linting and formatting
5. **Build and Test**: Test built artifacts
6. **Update Documentation**: Ensure docs are current
7. **Create Release**: Tag and publish release

## Questions and Support

If you have questions about contributing:

1. **Check Documentation**: Review existing docs and examples
2. **Search Issues**: Look for similar questions or issues
3. **Create Discussion**: Use GitHub Discussions for questions
4. **Open Issue**: Create an issue with the "question" label
5. **Contact Maintainers**: Reach out to the development team

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and community discussions
- **Email**: support@tumbati.com for direct communication

Thank you for contributing to BukaJS! Your contributions help make document viewing better for everyone. 🎉