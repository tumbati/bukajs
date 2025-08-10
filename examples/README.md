# BukaJS Examples

This directory contains various examples demonstrating how to use BukaJS in different scenarios and frameworks.

## Examples Overview

### 1. Basic HTML Example (`basic/`)
A simple HTML page demonstrating core BukaJS functionality:
- Loading documents from files or URLs
- Basic viewer controls (navigation, zoom, search)
- Event handling
- Sample document loading

**Run**: Open `basic/index.html` in a web browser

### 2. React Integration (`react/`)
Complete React application showcasing:
- React component wrapper for BukaJS
- Controlled and uncontrolled usage patterns
- State management integration
- Event handling with React patterns
- Advanced UI controls

**Setup**:
```bash
cd examples/react
npm install
npm run dev
```

### 3. Vue 3 Integration (`vue/`)
Vue 3 Composition API implementation featuring:
- Vue component with reactive state
- Comprehensive event handling
- Template-driven UI
- Vue-specific patterns and best practices

**Setup**:
```bash
cd examples/vue
npm install
npm run dev
```

### 4. Advanced Annotations Demo (`annotations/`)
Comprehensive annotation system demonstration:
- Multiple annotation types (highlight, note, drawing)
- Interactive annotation tools
- Color selection and customization  
- Annotation management (export/import/delete)
- Advanced mouse interaction handling

**Run**: Open `annotations/index.html` in a web browser

## Quick Start

1. **Basic Usage**: Start with the HTML example to understand core concepts
2. **Framework Integration**: Choose React or Vue example based on your framework
3. **Advanced Features**: Explore the annotations example for complex interactions

## Key Features Demonstrated

- ✅ **Document Loading**: File uploads, URL loading, sample documents
- ✅ **Navigation**: Page controls, zoom, thumbnails
- ✅ **Search**: Full-text search with highlighting
- ✅ **Annotations**: Highlights, notes, drawings with persistence
- ✅ **Events**: Comprehensive event system integration
- ✅ **Framework Integration**: React and Vue component patterns
- ✅ **Responsive Design**: Mobile-friendly layouts
- ✅ **Error Handling**: Graceful error states and user feedback

## Development Notes

Each example is self-contained and can be run independently. The React and Vue examples use modern build tools (Vite) for optimal development experience.

For production use, install BukaJS via npm:

```bash
npm install @tumbati/bukajs
```

## Support Matrix

| Feature | Basic | React | Vue | Annotations |
|---------|-------|-------|-----|-------------|
| PDF Support | ✅ | ✅ | ✅ | ✅ |
| Image Support | ✅ | ✅ | ✅ | ✅ |
| Navigation | ✅ | ✅ | ✅ | ✅ |
| Search | ✅ | ✅ | ✅ | ✅ |
| Basic Annotations | ✅ | ✅ | ✅ | ✅ |
| Advanced Annotations | ❌ | ❌ | ❌ | ✅ |
| Drawing Tools | ❌ | ❌ | ❌ | ✅ |
| Import/Export | ❌ | ✅ | ✅ | ✅ |