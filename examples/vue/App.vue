<template>
  <div class="app">
    <!-- Sidebar -->
    <div class="sidebar">
      <h2>BukaJS Vue Example</h2>
      
      <!-- File Upload -->
      <div class="section">
        <h4>Load Document</h4>
        <input
          type="file"
          accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.svg"
          @change="handleFileUpload"
          class="file-input"
        />
        <button @click="handleUrlLoad" class="btn btn-primary">
          Load from URL
        </button>
      </div>

      <!-- Sample Documents -->
      <div class="section">
        <h4>Sample Documents</h4>
        <button
          v-for="(doc, index) in sampleDocuments"
          :key="index"
          @click="loadSample(doc.url)"
          class="btn btn-sample"
        >
          {{ doc.name }}
        </button>
      </div>

      <!-- Document Info -->
      <div v-if="documentInfo" class="section">
        <h4>Document Info</h4>
        <div class="info-grid">
          <div>Total Pages: {{ documentInfo.totalPages }}</div>
          <div>Current Page: {{ currentPage }}</div>
          <div>Zoom: {{ zoom }}%</div>
          <div v-if="documentInfo.title">Title: {{ documentInfo.title }}</div>
        </div>
      </div>

      <!-- Navigation -->
      <div v-if="documentInfo" class="section">
        <h4>Navigation</h4>
        <div class="nav-controls">
          <button @click="goToPrevPage" :disabled="currentPage <= 1">←</button>
          <input
            v-model.number="pageInput"
            @keyup.enter="goToPage(pageInput)"
            type="number"
            :min="1"
            :max="documentInfo.totalPages"
            class="page-input"
          />
          <span>/ {{ documentInfo.totalPages }}</span>
          <button @click="goToNextPage" :disabled="currentPage >= documentInfo.totalPages">→</button>
        </div>
        
        <div class="zoom-controls">
          <label>Zoom:</label>
          <input
            v-model.number="zoomInput"
            @input="handleZoomChange"
            type="range"
            min="50"
            max="200"
            class="zoom-slider"
          />
          <div class="zoom-display">{{ zoom }}%</div>
        </div>
      </div>

      <!-- Search -->
      <div class="section">
        <h4>Search</h4>
        <div class="search-controls">
          <input
            v-model="searchQuery"
            @keyup.enter="handleSearch"
            type="text"
            placeholder="Search text..."
            class="search-input"
          />
          <button @click="handleSearch" class="btn btn-search">🔍</button>
        </div>
        <div v-if="searchResults" class="search-results">
          Found {{ searchResults.length }} results
        </div>
      </div>

      <!-- Annotations -->
      <div class="section">
        <h4>Annotations</h4>
        <div class="annotation-controls">
          <button @click="addHighlightAnnotation" class="btn">Add Highlight</button>
          <button @click="addNoteAnnotation" class="btn">Add Note</button>
          <button @click="exportAnnotations" class="btn">Export</button>
        </div>
        <div v-if="annotationCount > 0" class="annotation-info">
          {{ annotationCount }} annotations
        </div>
      </div>
    </div>

    <!-- Main Viewer -->
    <div class="main-content">
      <BukaViewerComponent
        ref="viewerRef"
        :source="documentSource"
        :options="viewerOptions"
        @document-loaded="onDocumentLoaded"
        @page-changed="onPageChanged"
        @zoom-changed="onZoomChanged"
        @search-result="onSearchResult"
        @annotation-added="onAnnotationAdded"
        @error="onError"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import BukaViewerComponent from './BukaViewerComponent.vue'

export default {
  name: 'App',
  components: {
    BukaViewerComponent
  },
  setup() {
    const viewerRef = ref(null)
    const documentSource = ref(null)
    const documentInfo = ref(null)
    const currentPage = ref(1)
    const pageInput = ref(1)
    const zoom = ref(100)
    const zoomInput = ref(100)
    const searchQuery = ref('')
    const searchResults = ref(null)
    const annotationCount = ref(0)

    // Sample documents
    const sampleDocuments = [
      {
        name: 'Sample PDF',
        url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'
      },
      {
        name: 'Sample Image', 
        url: 'https://via.placeholder.com/800x600/4A90E2/FFFFFF?text=Sample+Document'
      }
    ]

    // Viewer options
    const viewerOptions = {
      enableAnnotations: true,
      enableSearch: true,
      enableThumbnails: true,
      enableToolbar: true
    }

    // File upload handler
    const handleFileUpload = (event) => {
      const file = event.target.files[0]
      if (file) {
        documentSource.value = file
      }
    }

    // URL load handler
    const handleUrlLoad = () => {
      const url = prompt('Enter document URL:')
      if (url) {
        documentSource.value = url
      }
    }

    // Load sample document
    const loadSample = (url) => {
      documentSource.value = url
    }

    // Navigation methods
    const goToPage = (page) => {
      if (viewerRef.value) {
        viewerRef.value.goToPage(page)
      }
    }

    const goToPrevPage = () => {
      if (currentPage.value > 1) {
        goToPage(currentPage.value - 1)
      }
    }

    const goToNextPage = () => {
      if (documentInfo.value && currentPage.value < documentInfo.value.totalPages) {
        goToPage(currentPage.value + 1)
      }
    }

    // Zoom handler
    const handleZoomChange = () => {
      if (viewerRef.value) {
        const zoomFactor = zoomInput.value / 100
        viewerRef.value.setZoom(zoomFactor)
      }
    }

    // Search handler
    const handleSearch = () => {
      if (viewerRef.value && searchQuery.value.trim()) {
        viewerRef.value.search(searchQuery.value)
      }
    }

    // Annotation methods
    const addHighlightAnnotation = () => {
      if (viewerRef.value) {
        const annotation = {
          type: 'highlight',
          content: 'Sample highlight annotation',
          position: {
            x: 0.1,
            y: 0.1,
            width: 0.3,
            height: 0.05
          }
        }
        viewerRef.value.addAnnotation(annotation)
      }
    }

    const addNoteAnnotation = () => {
      if (viewerRef.value) {
        const annotation = {
          type: 'note',
          content: 'This is a sample note annotation',
          position: {
            x: 0.5,
            y: 0.2,
            width: 0.02,
            height: 0.02
          }
        }
        viewerRef.value.addAnnotation(annotation)
      }
    }

    const exportAnnotations = () => {
      if (viewerRef.value) {
        const annotations = viewerRef.value.exportAnnotations()
        console.log('Exported annotations:', annotations)
        alert(`Exported ${annotations.length} annotations. Check console for details.`)
      }
    }

    // Event handlers
    const onDocumentLoaded = (data) => {
      console.log('Document loaded:', data)
      documentInfo.value = data
      currentPage.value = 1
      pageInput.value = 1
    }

    const onPageChanged = (data) => {
      console.log('Page changed:', data)
      currentPage.value = data.page
      pageInput.value = data.page
    }

    const onZoomChanged = (data) => {
      console.log('Zoom changed:', data)
      const newZoom = Math.round(data.zoom * 100)
      zoom.value = newZoom
      zoomInput.value = newZoom
    }

    const onSearchResult = (data) => {
      console.log('Search results:', data)
      searchResults.value = data.results
    }

    const onAnnotationAdded = (annotation) => {
      console.log('Annotation added:', annotation)
      annotationCount.value++
    }

    const onError = (error) => {
      console.error('Viewer error:', error)
    }

    // Sync pageInput with currentPage when currentPage changes externally
    watch(currentPage, (newPage) => {
      pageInput.value = newPage
    })

    return {
      // Refs
      viewerRef,
      documentSource,
      documentInfo,
      currentPage,
      pageInput,
      zoom,
      zoomInput,
      searchQuery,
      searchResults,
      annotationCount,

      // Data
      sampleDocuments,
      viewerOptions,

      // Methods
      handleFileUpload,
      handleUrlLoad,
      loadSample,
      goToPage,
      goToPrevPage,
      goToNextPage,
      handleZoomChange,
      handleSearch,
      addHighlightAnnotation,
      addNoteAnnotation,
      exportAnnotations,

      // Event handlers
      onDocumentLoaded,
      onPageChanged,
      onZoomChanged,
      onSearchResult,
      onAnnotationAdded,
      onError
    }
  }
}
</script>

<style scoped>
.app {
  display: flex;
  height: 100vh;
  font-family: system-ui, sans-serif;
}

.sidebar {
  width: 300px;
  padding: 20px;
  background-color: #f8f9fa;
  border-right: 1px solid #dee2e6;
  overflow-y: auto;
}

.sidebar h2 {
  margin-top: 0;
  color: #333;
}

.section {
  margin-bottom: 24px;
}

.section h4 {
  margin: 0 0 12px 0;
  color: #555;
  font-size: 14px;
  font-weight: 600;
}

.file-input {
  width: 100%;
  margin-bottom: 10px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.btn {
  padding: 8px 12px;
  border: 1px solid #ccc;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-bottom: 5px;
}

.btn:hover {
  background: #f5f5f5;
}

.btn-primary {
  background: #007bff;
  color: white;
  border-color: #007bff;
  width: 100%;
}

.btn-primary:hover {
  background: #0056b3;
  border-color: #0056b3;
}

.btn-sample {
  display: block;
  width: 100%;
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.btn-sample:hover {
  background: #218838;
  border-color: #218838;
}

.btn-search {
  background: #ffc107;
  border-color: #ffc107;
}

.info-grid {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.page-input {
  width: 50px;
  padding: 4px;
  text-align: center;
  border: 1px solid #ccc;
  border-radius: 3px;
}

.zoom-controls {
  margin-top: 12px;
}

.zoom-controls label {
  display: block;
  font-size: 12px;
  margin-bottom: 4px;
}

.zoom-slider {
  width: 100%;
  margin-bottom: 4px;
}

.zoom-display {
  text-align: center;
  font-size: 11px;
  color: #666;
}

.search-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.search-input {
  flex: 1;
  padding: 6px;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-size: 14px;
}

.search-results {
  font-size: 12px;
  color: #666;
}

.annotation-controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.annotation-info {
  font-size: 12px;
  color: #666;
  margin-top: 8px;
}

.main-content {
  flex: 1;
  height: 100vh;
  overflow: hidden;
}
</style>