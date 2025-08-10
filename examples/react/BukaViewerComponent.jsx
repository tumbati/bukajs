import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BukaViewer, EVENTS } from '../../src/core/index.js';
import '../../src/renderers/pdf.js';

const BukaViewerComponent = ({ 
  source, 
  options = {}, 
  onDocumentLoaded,
  onPageChanged,
  onZoomChanged,
  onSearchResult,
  onAnnotationAdded,
  onError
}) => {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [documentInfo, setDocumentInfo] = useState(null);

  // Default options
  const defaultOptions = {
    enableAnnotations: true,
    enableSearch: true,
    enableThumbnails: true,
    enableToolbar: true,
    enableCache: true,
    ...options
  };

  // Initialize viewer
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      viewerRef.current = new BukaViewer(containerRef.current, defaultOptions);
      
      // Set up event listeners
      const viewer = viewerRef.current;

      viewer.on(EVENTS.DOCUMENT_LOADED, (data) => {
        setDocumentInfo(data);
        setIsLoading(false);
        setError(null);
        onDocumentLoaded?.(data);
      });

      viewer.on(EVENTS.PAGE_CHANGED, (data) => {
        onPageChanged?.(data);
      });

      viewer.on(EVENTS.ZOOM_CHANGED, (data) => {
        onZoomChanged?.(data);
      });

      viewer.on(EVENTS.SEARCH_RESULT, (data) => {
        onSearchResult?.(data);
      });

      viewer.on(EVENTS.ANNOTATION_ADDED, (data) => {
        onAnnotationAdded?.(data);
      });

      viewer.on(EVENTS.ERROR, (error) => {
        setError(error.message || error.toString());
        setIsLoading(false);
        onError?.(error);
      });

    } catch (error) {
      console.error('Failed to initialize BukaViewer:', error);
      setError('Failed to initialize document viewer');
    }

    // Cleanup
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Load document when source changes
  useEffect(() => {
    if (!viewerRef.current || !source) return;

    const loadDocument = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await viewerRef.current.load(source);
      } catch (error) {
        console.error('Failed to load document:', error);
        setError(error.message || 'Failed to load document');
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [source]);

  // Public API methods
  const goToPage = useCallback((page) => {
    if (viewerRef.current) {
      return viewerRef.current.currentRenderer?.goto(page);
    }
    return false;
  }, []);

  const setZoom = useCallback((zoom) => {
    if (viewerRef.current) {
      return viewerRef.current.currentRenderer?.zoom(zoom);
    }
  }, []);

  const search = useCallback((query) => {
    if (viewerRef.current) {
      return viewerRef.current.currentRenderer?.search(query);
    }
    return [];
  }, []);

  const addAnnotation = useCallback((annotation) => {
    if (viewerRef.current) {
      return viewerRef.current.addAnnotation(annotation);
    }
    return null;
  }, []);

  const exportAnnotations = useCallback(() => {
    if (viewerRef.current) {
      return viewerRef.current.exportAnnotations();
    }
    return [];
  }, []);

  // Expose methods via ref (for imperative usage)
  React.useImperativeHandle(containerRef, () => ({
    goToPage,
    setZoom,
    search,
    addAnnotation,
    exportAnnotations,
    getCurrentPage: () => viewerRef.current?.getCurrentPage(),
    getTotalPages: () => viewerRef.current?.getTotalPages(),
    getZoom: () => viewerRef.current?.getZoom(),
    viewer: viewerRef.current
  }), [goToPage, setZoom, search, addAnnotation, exportAnnotations]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 1000
        }}>
          <div>Loading document...</div>
        </div>
      )}
      
      {error && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          right: 10,
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '10px',
          borderRadius: '4px',
          border: '1px solid #f5c6cb',
          zIndex: 1001
        }}>
          Error: {error}
          <button 
            onClick={() => setError(null)}
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              color: '#721c24',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ×
          </button>
        </div>
      )}
      
      <div 
        ref={containerRef}
        style={{ 
          width: '100%', 
          height: '100%',
          opacity: error ? 0.5 : 1
        }} 
      />
    </div>
  );
};

export default BukaViewerComponent;