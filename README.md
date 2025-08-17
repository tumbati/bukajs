# @tumbati/bukajs

A document viewer library supporting PDF, DOCX, Images, XLSX, and PowerPoint files.

[![npm version](https://badge.fury.io/js/@tumbati%2Fbukajs.svg?icon=si%3Anpm)](https://badge.fury.io/js/@tumbati%2Fbukajs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 📄 **Multi-format Support**: PDF, DOCX, Images (PNG/JPG/SVG), XLSX, PPTX
- 🎯 **Framework Agnostic**: Works with React, Vue, Angular, or vanilla JS
- 🖼️ **Advanced Image Editing**: Professional-grade cropping, filtering, and aspect ratio controls
- 📝 **Rich Annotations**: Highlights, notes, drawings with import/export
- 🔍 **Full-text Search**: Advanced search with highlighting
- 🖥️ **Responsive UI**: Built-in toolbar, navigation, and thumbnails
- ⚡ **Performance**: Canvas rendering with text layer for PDFs
- 🎨 **Customizable**: Flexible theming and configuration options
- 💾 **Caching**: Optional offline caching with LocalForage

## Quick Start

### Installation

```bash
npm install @tumbati/bukajs
```

### Basic Usage

```html
<!DOCTYPE html>
<html>
  <head>
    <title>BukaJS Example</title>
  </head>
  <body>
    <div id="viewer" style="width: 100%; height: 600px;"></div>

    <script type="module">
      import { BukaViewer } from "@tumbati/bukajs";
      import "@tumbati/bukajs/renderers/pdf";
      import "@tumbati/bukajs/renderers/image";

      const viewer = new BukaViewer("#viewer");
      viewer.load("path/to/document.pdf");
    </script>
  </body>
</html>
```

### React Integration

```jsx
import React, { useRef, useEffect } from "react";
import { BukaViewer } from "@tumbati/bukajs";
import "@tumbati/bukajs/renderers/pdf";
import "@tumbati/bukajs/renderers/image";

function DocumentViewer({ documentUrl }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      viewerRef.current = new BukaViewer(containerRef.current, {
        enableAnnotations: true,
        enableSearch: true,
        theme: "default"
      });
    }

    return () => viewerRef.current?.destroy();
  }, []);

  useEffect(() => {
    if (documentUrl && viewerRef.current) {
      viewerRef.current.load(documentUrl);
    }
  }, [documentUrl]);

  return <div ref={containerRef} style={{ width: "100%", height: "600px" }} />;
}
```

### Vue 3 Integration

```vue
<template>
  <div ref="container" style="width: 100%; height: 600px;"></div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { BukaViewer } from "@tumbati/bukajs";
import "@tumbati/bukajs/renderers/pdf";
import "@tumbati/bukajs/renderers/image";

export default {
  props: ["documentUrl"],
  setup(props) {
    const container = ref(null);
    let viewer = null;

    onMounted(() => {
      viewer = new BukaViewer(container.value, {
        enableAnnotations: true,
        enableSearch: true,
        enableThumbnails: true
      });
    });

    onUnmounted(() => {
      viewer?.destroy();
    });

    watch(
      () => props.documentUrl,
      (url) => {
        if (url && viewer) {
          viewer.load(url);
        }
      }
    );

    return { container };
  },
};
</script>
```

## Supported Formats

| Format | MIME Type | Features | Status |
|--------|-----------|----------|--------|
| **PDF** | `application/pdf` | Canvas rendering, text layer, search, annotations | ✅ **Full** |
| **Images** | `image/png`, `image/jpeg`, `image/svg+xml` | Advanced editing, cropping, filters, aspect ratios | ✅ **Enhanced** |
| **DOCX** | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | HTML conversion, navigation | ✅ **Full** |
| **XLSX** | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | Grid display, sheet navigation | ✅ **Full** |
| **PPTX** | `application/vnd.openxmlformats-officedocument.presentationml.presentation` | Slide navigation, presenter notes | ✅ **Full** |

## 🖼️ Enhanced Image Renderer

The ImageRenderer includes professional image editing capabilities:

### Advanced Cropping
- **Interactive Selection**: Click and drag to create crop areas
- **Resize Handles**: 8 resize handles (corners + edges) for precise control
- **Draggable Crop Area**: Click and drag to reposition crop selection
- **Aspect Ratio Constraints**: Lock to common ratios (1:1, 4:3, 16:9, etc.)
- **Visual Feedback**: Live preview with dashed borders and transparency

### Image Filters & Adjustments
- **Brightness** (0-200%): Brighten or darken images
- **Contrast** (0-200%): Increase or decrease contrast
- **Saturation** (0-200%): Enhance or reduce color intensity
- **Hue Rotation** (0-360°): Color shift effects
- **Blur** (0-20px): Gaussian blur effects
- **Sepia & Grayscale**: One-click vintage effects

### Interactive Controls
- **Keyboard Shortcuts**:
  - `Ctrl+C`: Start/apply crop
  - `Ctrl+R`: Reset all changes
  - `Escape`: Cancel crop mode
- **Export Options**: Download as PNG, JPEG, or WebP
- **Real-time Preview**: See changes instantly

### API Example

```javascript
import { ImageRenderer } from "@tumbati/bukajs/renderers/image";

const container = document.getElementById("viewer");
const renderer = new ImageRenderer(container);

// Load image
await renderer.load("path/to/image.jpg");

// Start cropping with aspect ratio
renderer.setAspectRatio(16/9);
renderer.startCropping();

// Apply filters
renderer.setFilter('brightness', 120);
renderer.setFilter('contrast', 110);
renderer.toGrayscale();

// Convenience methods
renderer.brighten(10);
renderer.increaseContrast(15);

// Export edited image
const dataUrl = renderer.exportImage('png', 0.9);
const link = document.createElement('a');
link.download = 'edited-image.png';
link.href = dataUrl;
link.click();
```

## Architecture

BukaJS follows a modular architecture with pluggable renderers:

```
┌─────────────────┐
│   BukaViewer    │ ← Main viewer orchestrator
├─────────────────┤
│ RendererFactory │ ← Creates appropriate renderer
├─────────────────┤
│  BaseRenderer   │ ← Common renderer interface
├─────────────────┤
│   PDF Renderer  │ ← PDF.js integration
│  DOCX Renderer  │ ← Mammoth.js integration
│ Image Renderer  │ ← Enhanced editing capabilities
│  XLSX Renderer  │ ← SheetJS integration
│  PPTX Renderer  │ ← PowerPoint support
└─────────────────┘
```

### Core Components

- **BukaViewer**: Main orchestrator handling UI and document loading
- **BaseRenderer**: Abstract class defining standardized renderer API
- **RendererFactory**: Factory pattern for renderer instantiation
- **Event System**: Comprehensive event-driven architecture
- **DocumentDetector**: MIME type detection and format validation

## API Reference

### BukaViewer

```javascript
const viewer = new BukaViewer(container, options);
```

#### Options

```javascript
{
    enableAnnotations: true,     // Enable annotation system
    enableSearch: true,          // Enable search functionality
    enableThumbnails: true,      // Show thumbnail sidebar
    enableToolbar: true,         // Show built-in toolbar
    enableCache: true,           // Enable document caching
    theme: "default",            // Theme: "default", "dark", "tailwind"
    customCSS: "",               // Custom CSS overrides
    virtualScrolling: false,     // Virtual scrolling for large docs
    showThumbnails: true,        // Auto-show thumbnails
    autoFitSlide: true          // Auto-fit slides in presentations
}
```

#### Methods

- `load(source)` - Load document from File, Blob, or URL
- `getCurrentPage()` - Get current page number
- `getTotalPages()` - Get total page count
- `getZoom()` - Get current zoom level
- `setZoom(factor)` - Set zoom level
- `goto(page)` - Navigate to specific page
- `search(query)` - Search document text
- `addAnnotation(annotation)` - Add annotation
- `exportAnnotations()` - Export all annotations
- `importAnnotations(annotations)` - Import annotations
- `getViewInfo()` - Get current view state
- `destroy()` - Clean up resources

#### Events

```javascript
import { EVENTS } from "@tumbati/bukajs";

viewer.on(EVENTS.DOCUMENT_LOADED, (data) => {
  console.log(`Document loaded: ${data.totalPages} pages`);
});

viewer.on(EVENTS.PAGE_CHANGED, (data) => {
  console.log(`Page ${data.page} of ${data.totalPages}`);
});

viewer.on(EVENTS.ZOOM_CHANGED, (data) => {
  console.log(`Zoom: ${data.zoom}%`);
});

viewer.on(EVENTS.SEARCH_RESULT, (data) => {
  console.log(`Found ${data.results.length} results`);
});

viewer.on(EVENTS.ANNOTATION_ADDED, (annotation) => {
  console.log("New annotation:", annotation);
});

viewer.on(EVENTS.ERROR, (error) => {
  console.error("Viewer error:", error);
});
```

### Renderer API

All renderers implement the standardized BaseRenderer interface:

```javascript
class CustomRenderer extends BaseRenderer {
  async load(source) {
    // Load document from File, Blob, or URL
  }

  async render() {
    // Render current page/view
  }

  async goto(page) {
    // Navigate to specific page
  }

  async setZoom(factor) {
    // Apply zoom transformation
  }

  async search(query) {
    // Search document content
    return []; // SearchResult[]
  }

  addAnnotation(annotation) {
    // Add annotation with relative coordinates
    return annotationId;
  }

  exportAnnotations() {
    // Export annotations for persistence
    return annotations;
  }

  importAnnotations(annotations) {
    // Import previously saved annotations
  }
}
```

## Advanced Usage

### Custom Renderers

```javascript
import {
  BaseRenderer,
  RendererFactory,
  SUPPORTED_FORMATS,
} from "@tumbati/bukajs";

class CustomRenderer extends BaseRenderer {
  async load(source) {
    // Custom loading logic
  }

  async render() {
    // Custom rendering logic
  }

  async search(query) {
    // Custom search implementation
    return [];
  }
}

// Register custom renderer
RendererFactory.register("application/custom", CustomRenderer);
```

### Annotation System

```javascript
// Add highlight annotation
viewer.addAnnotation({
  type: "highlight",
  content: "Important text",
  position: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 },
  color: "#ffff00",
  page: 1
});

// Add note annotation
viewer.addAnnotation({
  type: "note",
  content: "Remember to review this section",
  position: { x: 0.5, y: 0.3, width: 0.02, height: 0.02 },
  page: 1
});

// Add drawing annotation
viewer.addAnnotation({
  type: "drawing",
  content: "svg-path-data",
  position: { x: 0.2, y: 0.4, width: 0.4, height: 0.3 },
  strokeColor: "#ff0000",
  strokeWidth: 2,
  page: 1
});

// Export annotations for persistence
const annotations = viewer.exportAnnotations();
localStorage.setItem('annotations', JSON.stringify(annotations));

// Import annotations
const savedAnnotations = JSON.parse(localStorage.getItem('annotations') || '[]');
viewer.importAnnotations(savedAnnotations);
```

### Search Functionality

```javascript
// Basic text search
const results = await viewer.search("important text");
console.log(`Found ${results.length} matches`);

// Search with options
const results = await viewer.search("query", {
  caseSensitive: false,
  wholeWords: false,
  regex: false
});

// Navigate to search results
results.forEach((result, index) => {
  console.log(`Match ${index + 1}: Page ${result.page}, Position ${result.position}`);
});
```

### Theme Customization

```javascript
// Use built-in themes
const viewer = new BukaViewer(container, {
  theme: "dark" // "default", "dark", "tailwind"
});

// Custom CSS styling
const viewer = new BukaViewer(container, {
  customCSS: `
    .buka-viewer {
      --primary-color: #2563eb;
      --background-color: #f8fafc;
      --border-color: #e2e8f0;
    }

    .buka-toolbar {
      background: var(--background-color);
      border-bottom: 1px solid var(--border-color);
    }

    .buka-btn:hover {
      background: var(--primary-color);
      color: white;
    }
  `
});
```

## Examples

Comprehensive examples are available in the `/examples` directory:

- **Basic HTML** (`examples/basic/`): Simple integration example
- **React** (`examples/react/`): Complete React application with TypeScript
- **Vue** (`examples/vue/`): Vue 3 Composition API integration
- **Annotations** (`examples/annotations/`): Advanced annotation features
- **Enhanced Image Demo** (`examples/enhanced-image-demo.html`): Image editing showcase

### Running Examples

```bash
# React example
cd examples/react
npm install
npm run dev

# Vue example
cd examples/vue
npm install
npm run dev

# Basic examples - open in browser
open examples/basic/index.html
open examples/annotations/index.html
open examples/enhanced-image-demo.html
```

## Browser Support

- **Chrome** 88+
- **Firefox** 85+
- **Safari** 14+
- **Edge** 88+

## Dependencies

### Core Dependencies
- Modern browser with ES6+ support
- Canvas API support
- File API support

### Optional Dependencies (Auto-loaded)
- `pdfjs-dist` - PDF rendering
- `mammoth` - DOCX to HTML conversion
- `xlsx` - Excel file parsing
- `localforage` - Offline caching

## Performance

BukaJS is optimized for performance:

- **Lazy Loading**: Renderers loaded on-demand
- **Virtual Scrolling**: Efficient handling of large documents
- **Canvas Optimization**: Hardware-accelerated rendering
- **Memory Management**: Proper cleanup and garbage collection
- **Caching**: Smart caching of parsed documents and resources

## Security

BukaJS includes security measures:

- **Input Validation**: All file inputs are validated
- **Sandbox Rendering**: Documents rendered in isolated contexts
- **XSS Prevention**: HTML content is sanitized
- **CSP Compatible**: Works with Content Security Policy
- **No External Dependencies**: Core functionality works offline

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Quick Development Setup

```bash
# Clone repository
git clone https://github.com/tumbati/bukajs.git
cd bukajs

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Check code quality
npm run quality

# Build for production
npm run build
```

## License

MIT © TUMBATI LTD

## Roadmap

### Completed ✅
- [x] PDF Support with PDF.js
- [x] Advanced Image Editing (cropping, filters, aspect ratios)
- [x] DOCX support with Mammoth.js
- [x] XLSX support with SheetJS
- [x] PPTX (PowerPoint) support
- [x] Rich annotation system
- [x] Full-text search with highlighting
- [x] Framework integration examples
- [x] Responsive design and theming
- [x] Performance optimizations

### In Progress 🚧
- [ ] Mobile touch gestures optimization
- [ ] Accessibility (WCAG 2.1) compliance
- [ ] Advanced drawing tools
- [ ] Collaborative annotations

### Planned 📋
- [ ] Digital signature support
- [ ] Form filling capabilities
- [ ] OCR text recognition
- [ ] Real-time collaboration
- [ ] Cloud storage integration
- [ ] Print-optimized layouts

## Support

- 📖 [Documentation](https://github.com/tumbati/bukajs#readme)
- 🐛 [Issues](https://github.com/tumbati/bukajs/issues)
- 💬 [Discussions](https://github.com/tumbati/bukajs/discussions)
- 📧 [Email Support](mailto:support@tumbati.com)

---

Built with ❤️ by the TUMBATI team
