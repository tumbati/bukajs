# @tumbati/bukajs

Universal document viewer library supporting PDF, DOCX, Images, and XLSX files with framework-agnostic design.

[![npm version](https://badge.fury.io/js/%40tumbati%2Fbukajs.svg)](https://badge.fury.io/js/%40tumbati%2Fbukajs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 📄 **Multi-format Support**: PDF, DOCX, Images (PNG/JPG/SVG), XLSX
- 🎯 **Framework Agnostic**: Works with React, Vue, Angular, or vanilla JS
- 📝 **Rich Annotations**: Highlights, notes, drawings with import/export
- 🔍 **Full-text Search**: Advanced search with highlighting
- 🖼️ **Responsive UI**: Built-in toolbar, navigation, and thumbnails
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

function DocumentViewer({ documentUrl }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      viewerRef.current = new BukaViewer(containerRef.current);
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

export default {
  props: ["documentUrl"],
  setup(props) {
    const container = ref(null);
    let viewer = null;

    onMounted(() => {
      viewer = new BukaViewer(container.value);
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

| Format | MIME Type                                                                 | Renderer            | Status |
| ------ | ------------------------------------------------------------------------- | ------------------- | ------ |
| PDF    | `application/pdf`                                                         | Canvas + Text Layer | ✅     |
| DOCX   | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | HTML Conversion     | 🚧     |
| Images | `image/png`, `image/jpeg`, `image/svg+xml`                                | Native              | 🚧     |
| XLSX   | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`       | Grid/Table          | 🚧     |

## Architecture

BukaJS follows a modular architecture with pluggable renderers:

```
┌─────────────────┐
│   BukaViewer    │ ← Main viewer class
├─────────────────┤
│ RendererFactory │ ← Creates appropriate renderer
├─────────────────┤
│  BaseRenderer   │ ← Common renderer interface
├─────────────────┤
│   PDF Renderer  │ ← PDF.js integration
│  DOCX Renderer  │ ← Mammoth.js integration
│ Image Renderer  │ ← Native image support
│  XLSX Renderer  │ ← SheetJS integration
└─────────────────┘
```

### Core Components

- **BukaViewer**: Main orchestrator handling UI and document loading
- **BaseRenderer**: Abstract class defining standardized renderer API
- **RendererFactory**: Factory pattern for renderer instantiation
- **Event System**: Comprehensive event-driven architecture

## API Reference

### BukaViewer

```javascript
const viewer = new BukaViewer(container, options);
```

#### Options

```javascript
{
    enableAnnotations: true,    // Enable annotation system
    enableSearch: true,         // Enable search functionality
    enableThumbnails: true,     // Show thumbnail sidebar
    enableToolbar: true,        // Show built-in toolbar
    enableCache: true          // Enable document caching
}
```

#### Methods

- `load(source)` - Load document from File, Blob, or URL
- `getCurrentPage()` - Get current page number
- `getTotalPages()` - Get total page count
- `getZoom()` - Get current zoom level
- `addAnnotation(annotation)` - Add annotation
- `exportAnnotations()` - Export all annotations
- `destroy()` - Clean up resources

#### Events

- `document:loaded` - Document successfully loaded
- `page:changed` - Page navigation occurred
- `zoom:changed` - Zoom level changed
- `search:result` - Search completed
- `annotation:added` - Annotation added
- `error` - Error occurred

### Renderer API

All renderers implement the standardized BaseRenderer interface:

```javascript
class CustomRenderer extends BaseRenderer {
  async load(source) {
    /* Load document */
  }
  async render() {
    /* Render current view */
  }
  async goto(page) {
    /* Navigate to page */
  }
  async zoom(factor) {
    /* Apply zoom */
  }
  async search(query) {
    /* Search content */
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
});

// Add note annotation
viewer.addAnnotation({
  type: "note",
  content: "Remember to review this section",
  position: { x: 0.5, y: 0.3, width: 0.02, height: 0.02 },
});

// Export annotations
const annotations = viewer.exportAnnotations();
console.log(annotations);
```

### Event Handling

```javascript
import { EVENTS } from "@tumbati/bukajs";

viewer.on(EVENTS.DOCUMENT_LOADED, (data) => {
  console.log(`Document loaded: ${data.totalPages} pages`);
});

viewer.on(EVENTS.PAGE_CHANGED, (data) => {
  console.log(`Page ${data.page} of ${data.totalPages}`);
});

viewer.on(EVENTS.ANNOTATION_ADDED, (annotation) => {
  console.log("New annotation:", annotation);
});
```

## Examples

Comprehensive examples are available in the `/examples` directory:

- **Basic HTML**: Simple integration example
- **React**: Complete React application with hooks
- **Vue**: Vue 3 Composition API integration
- **Annotations**: Advanced annotation features demo

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## Dependencies

### Core Dependencies

- Modern browser with ES6+ support
- Canvas API support

### Optional Dependencies

- `pdfjs-dist` - PDF rendering (auto-loaded from CDN if not bundled)
- `mammoth` - DOCX to HTML conversion
- `xlsx` - Excel file parsing
- `localforage` - Offline caching

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT © TUMBATI LTD

## Roadmap

- [x] PDF Support with PDF.js
- [x] Basic annotation system
- [x] Framework integration examples
- [ ] DOCX support with Mammoth.js
- [ ] XLSX support with SheetJS
- [ ] Image viewer with zoom/pan
- [ ] Advanced drawing annotations
- [ ] Collaborative real-time annotations
- [ ] Digital signature support
- [ ] Form filling capabilities

## Support

- 📖 [Documentation](https://github.com/TUMBATI/bukajs#readme)
- 🐛 [Issues](https://github.com/TUMBATI/bukajs/issues)
- 💬 [Discussions](https://github.com/TUMBATI/bukajs/discussions)
