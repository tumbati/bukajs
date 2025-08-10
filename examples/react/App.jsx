import React, { useState, useRef } from 'react';
import BukaViewerComponent from './BukaViewerComponent.jsx';

const App = () => {
  const [documentSource, setDocumentSource] = useState(null);
  const [documentInfo, setDocumentInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const viewerRef = useRef(null);

  // Sample documents for demonstration
  const sampleDocuments = [
    {
      name: 'Sample PDF',
      url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'
    },
    {
      name: 'Sample Image',
      url: 'https://via.placeholder.com/800x600/4A90E2/FFFFFF?text=Sample+Document'
    }
  ];

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setDocumentSource(file);
    }
  };

  const handleUrlLoad = () => {
    const url = prompt('Enter document URL:');
    if (url) {
      setDocumentSource(url);
    }
  };

  const handleSampleLoad = (sampleUrl) => {
    setDocumentSource(sampleUrl);
  };

  const handleSearch = () => {
    if (viewerRef.current && searchQuery.trim()) {
      viewerRef.current.search(searchQuery);
    }
  };

  const handlePageChange = (page) => {
    if (viewerRef.current) {
      viewerRef.current.goToPage(page);
    }
  };

  const handleZoomChange = (newZoom) => {
    if (viewerRef.current) {
      const zoomFactor = newZoom / 100;
      viewerRef.current.setZoom(zoomFactor);
      setZoom(newZoom);
    }
  };

  const addHighlightAnnotation = () => {
    if (viewerRef.current) {
      const annotation = {
        type: 'highlight',
        content: 'Sample highlight annotation',
        position: {
          x: 0.1,
          y: 0.1,
          width: 0.3,
          height: 0.05
        }
      };
      viewerRef.current.addAnnotation(annotation);
    }
  };

  const addNoteAnnotation = () => {
    if (viewerRef.current) {
      const annotation = {
        type: 'note',
        content: 'This is a sample note annotation',
        position: {
          x: 0.5,
          y: 0.2,
          width: 0.02,
          height: 0.02
        }
      };
      viewerRef.current.addAnnotation(annotation);
    }
  };

  const exportAnnotations = () => {
    if (viewerRef.current) {
      const annotations = viewerRef.current.exportAnnotations();
      console.log('Exported annotations:', annotations);
      alert(`Exported ${annotations.length} annotations. Check console for details.`);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <div style={{ 
        width: '300px', 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRight: '1px solid #dee2e6',
        overflowY: 'auto'
      }}>
        <h2 style={{ marginTop: 0 }}>BukaJS React Example</h2>
        
        {/* File Upload */}
        <div style={{ marginBottom: '20px' }}>
          <h4>Load Document</h4>
          <input
            type="file"
            accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.svg"
            onChange={handleFileUpload}
            style={{ marginBottom: '10px', width: '100%' }}
          />
          <button 
            onClick={handleUrlLoad}
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
          >
            Load from URL
          </button>
        </div>

        {/* Sample Documents */}
        <div style={{ marginBottom: '20px' }}>
          <h4>Sample Documents</h4>
          {sampleDocuments.map((doc, index) => (
            <button
              key={index}
              onClick={() => handleSampleLoad(doc.url)}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px',
                marginBottom: '5px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {doc.name}
            </button>
          ))}
        </div>

        {/* Document Info */}
        {documentInfo && (
          <div style={{ marginBottom: '20px' }}>
            <h4>Document Info</h4>
            <div style={{ fontSize: '14px', color: '#666' }}>
              <div>Total Pages: {documentInfo.totalPages}</div>
              <div>Current Page: {currentPage}</div>
              <div>Zoom: {zoom}%</div>
              {documentInfo.title && <div>Title: {documentInfo.title}</div>}
            </div>
          </div>
        )}

        {/* Navigation */}
        {documentInfo && (
          <div style={{ marginBottom: '20px' }}>
            <h4>Navigation</h4>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
              <button onClick={() => handlePageChange(currentPage - 1)}>←</button>
              <input
                type="number"
                value={currentPage}
                onChange={(e) => setCurrentPage(parseInt(e.target.value) || 1)}
                onKeyPress={(e) => e.key === 'Enter' && handlePageChange(currentPage)}
                style={{ width: '60px', textAlign: 'center' }}
                min="1"
                max={documentInfo.totalPages}
              />
              <span style={{ alignSelf: 'center' }}>/ {documentInfo.totalPages}</span>
              <button onClick={() => handlePageChange(currentPage + 1)}>→</button>
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <label>Zoom: </label>
              <input
                type="range"
                min="50"
                max="200"
                value={zoom}
                onChange={(e) => handleZoomChange(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ textAlign: 'center', fontSize: '12px' }}>{zoom}%</div>
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{ marginBottom: '20px' }}>
          <h4>Search</h4>
          <div style={{ display: 'flex', gap: '5px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search text..."
              style={{ flex: 1, padding: '5px' }}
            />
            <button onClick={handleSearch}>🔍</button>
          </div>
        </div>

        {/* Annotations */}
        <div style={{ marginBottom: '20px' }}>
          <h4>Annotations</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <button onClick={addHighlightAnnotation} style={{ padding: '5px' }}>
              Add Highlight
            </button>
            <button onClick={addNoteAnnotation} style={{ padding: '5px' }}>
              Add Note
            </button>
            <button onClick={exportAnnotations} style={{ padding: '5px' }}>
              Export Annotations
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewer */}
      <div style={{ flex: 1, height: '100vh' }}>
        <BukaViewerComponent
          ref={viewerRef}
          source={documentSource}
          options={{
            enableAnnotations: true,
            enableSearch: true,
            enableThumbnails: true,
            enableToolbar: true
          }}
          onDocumentLoaded={(data) => {
            console.log('Document loaded:', data);
            setDocumentInfo(data);
            setCurrentPage(1);
          }}
          onPageChanged={(data) => {
            console.log('Page changed:', data);
            setCurrentPage(data.page);
          }}
          onZoomChanged={(data) => {
            console.log('Zoom changed:', data);
            setZoom(Math.round(data.zoom * 100));
          }}
          onSearchResult={(data) => {
            console.log('Search results:', data);
          }}
          onAnnotationAdded={(annotation) => {
            console.log('Annotation added:', annotation);
          }}
          onError={(error) => {
            console.error('Viewer error:', error);
          }}
        />
      </div>
    </div>
  );
};

export default App;