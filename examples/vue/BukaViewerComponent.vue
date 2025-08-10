<template>
  <div class="buka-viewer-wrapper">
    <!-- Loading overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner">Loading document...</div>
    </div>
    
    <!-- Error display -->
    <div v-if="error" class="error-overlay">
      <div class="error-message">
        Error: {{ error }}
        <button @click="error = null" class="close-btn">×</button>
      </div>
    </div>
    
    <!-- Viewer container -->
    <div 
      ref="containerRef"
      class="buka-viewer-container"
      :class="{ 'has-error': error }"
    />
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { BukaViewer, EVENTS } from '../../src/core/index.js'
import '../../src/renderers/pdf.js' // Ensure PDF renderer is registered

export default {
  name: 'BukaViewerComponent',
  props: {
    source: {
      type: [String, File, Blob],
      default: null
    },
    options: {
      type: Object,
      default: () => ({})
    }
  },
  emits: [
    'document-loaded',
    'page-changed', 
    'zoom-changed',
    'search-result',
    'annotation-added',
    'error'
  ],
  setup(props, { emit, expose }) {
    const containerRef = ref(null)
    const viewer = ref(null)
    const isLoading = ref(false)
    const error = ref(null)
    const documentInfo = ref(null)

    // Default options
    const defaultOptions = {
      enableAnnotations: true,
      enableSearch: true,
      enableThumbnails: true,
      enableToolbar: true,
      enableCache: true,
      ...props.options
    }

    // Initialize viewer
    const initViewer = async () => {
      if (!containerRef.value) return

      try {
        viewer.value = new BukaViewer(containerRef.value, defaultOptions)
        
        // Set up event listeners
        viewer.value.on(EVENTS.DOCUMENT_LOADED, (data) => {
          documentInfo.value = data
          isLoading.value = false
          error.value = null
          emit('document-loaded', data)
        })

        viewer.value.on(EVENTS.PAGE_CHANGED, (data) => {
          emit('page-changed', data)
        })

        viewer.value.on(EVENTS.ZOOM_CHANGED, (data) => {
          emit('zoom-changed', data)
        })

        viewer.value.on(EVENTS.SEARCH_RESULT, (data) => {
          emit('search-result', data)
        })

        viewer.value.on(EVENTS.ANNOTATION_ADDED, (data) => {
          emit('annotation-added', data)
        })

        viewer.value.on(EVENTS.ERROR, (errorData) => {
          error.value = errorData.message || errorData.toString()
          isLoading.value = false
          emit('error', errorData)
        })

      } catch (err) {
        console.error('Failed to initialize BukaViewer:', err)
        error.value = 'Failed to initialize document viewer'
      }
    }

    // Load document
    const loadDocument = async (source) => {
      if (!viewer.value || !source) return

      try {
        isLoading.value = true
        error.value = null
        await viewer.value.load(source)
      } catch (err) {
        console.error('Failed to load document:', err)
        error.value = err.message || 'Failed to load document'
        isLoading.value = false
      }
    }

    // Public API methods
    const goToPage = (page) => {
      if (viewer.value?.currentRenderer) {
        return viewer.value.currentRenderer.goto(page)
      }
      return false
    }

    const setZoom = (zoom) => {
      if (viewer.value?.currentRenderer) {
        return viewer.value.currentRenderer.zoom(zoom)
      }
    }

    const search = (query) => {
      if (viewer.value?.currentRenderer) {
        return viewer.value.currentRenderer.search(query)
      }
      return []
    }

    const addAnnotation = (annotation) => {
      if (viewer.value) {
        return viewer.value.addAnnotation(annotation)
      }
      return null
    }

    const exportAnnotations = () => {
      if (viewer.value) {
        return viewer.value.exportAnnotations()
      }
      return []
    }

    const getCurrentPage = () => {
      return viewer.value?.getCurrentPage() || 1
    }

    const getTotalPages = () => {
      return viewer.value?.getTotalPages() || 1
    }

    const getZoom = () => {
      return viewer.value?.getZoom() || 1.0
    }

    // Expose methods to parent
    expose({
      goToPage,
      setZoom,
      search,
      addAnnotation,
      exportAnnotations,
      getCurrentPage,
      getTotalPages,
      getZoom,
      viewer
    })

    // Lifecycle hooks
    onMounted(async () => {
      await nextTick()
      await initViewer()
    })

    onUnmounted(() => {
      if (viewer.value) {
        viewer.value.destroy()
        viewer.value = null
      }
    })

    // Watch for source changes
    watch(() => props.source, (newSource) => {
      if (newSource) {
        loadDocument(newSource)
      }
    }, { immediate: true })

    return {
      containerRef,
      isLoading,
      error,
      documentInfo,
      // Methods for template usage
      goToPage,
      setZoom,
      search,
      addAnnotation,
      exportAnnotations
    }
  }
}
</script>

<style scoped>
.buka-viewer-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.buka-viewer-container {
  width: 100%;
  height: 100%;
}

.buka-viewer-container.has-error {
  opacity: 0.5;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 1000;
}

.loading-spinner {
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.error-overlay {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  z-index: 1001;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #f5c6cb;
  position: relative;
}

.close-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #721c24;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
}

.close-btn:hover {
  opacity: 0.7;
}
</style>