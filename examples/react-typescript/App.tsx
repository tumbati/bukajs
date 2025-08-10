import React, { useRef, useEffect, useState } from 'react';
import { BukaViewer, EVENTS, type DocumentInfo, type ViewerOptions } from '@tumbati/bukajs';
import '@tumbati/bukajs/styles';

interface BukaViewerComponentProps {
  source?: string | File | Blob;
  options?: ViewerOptions;
  onDocumentLoaded?: (data: DocumentInfo) => void;
  onError?: (error: Error) => void;
}

const BukaViewerComponent: React.FC<BukaViewerComponentProps> = ({
  source,
  options = {},
  onDocumentLoaded,
  onError
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<BukaViewer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const viewer = new BukaViewer(containerRef.current, {
      enableAnnotations: true,
      enableSearch: true,
      enableThumbnails: true,
      enableToolbar: true,
      theme: 'default',
      ...options
    });

    viewer.on(EVENTS.DOCUMENT_LOADED, (data: DocumentInfo) => {
      setIsLoading(false);
      setError(null);
      onDocumentLoaded?.(data);
    });

    viewer.on(EVENTS.ERROR, (error: Error) => {
      setIsLoading(false);
      setError(error.message);
      onError?.(error);
    });

    viewerRef.current = viewer;

    return () => {
      viewer.destroy();
    };
  }, [options, onDocumentLoaded, onError]);

  useEffect(() => {
    if (!source || !viewerRef.current) return;

    setIsLoading(true);
    setError(null);
    
    viewerRef.current.load(source).catch((error) => {
      setIsLoading(false);
      setError(error.message);
      onError?.(error);
    });
  }, [source, onError]);

  return (
    <div className="buka-react-wrapper" style={{ width: '100%', height: '100%' }}>
      {isLoading && (
        <div className="loading-overlay">
          <div>Loading document...</div>
        </div>
      )}
      {error && (
        <div className="error-overlay">
          <div>Error: {error}</div>
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDocumentLoaded = (data: DocumentInfo) => {
    setDocumentInfo(data);
    console.log('Document loaded:', data);
  };

  const handleError = (error: Error) => {
    console.error('Viewer error:', error);
  };

  return (
    <div className="app" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '20px', borderBottom: '1px solid #ccc' }}>
        <h1>BukaJS React TypeScript Example</h1>
        <div style={{ marginTop: '10px' }}>
          <input
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.svg,.csv,.pptx,.ppt"
          />
          {documentInfo && (
            <div style={{ marginTop: '10px' }}>
              <strong>Loaded:</strong> {documentInfo.title} ({documentInfo.totalPages} pages)
            </div>
          )}
        </div>
      </header>
      
      <main style={{ flex: 1 }}>
        <BukaViewerComponent
          source={selectedFile}
          options={{
            theme: 'default',
            enableThumbnails: true,
            enableSearch: true
          }}
          onDocumentLoaded={handleDocumentLoaded}
          onError={handleError}
        />
      </main>
    </div>
  );
};

export default App;