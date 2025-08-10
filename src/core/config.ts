export const SUPPORTED_FORMATS = {
	PDF: "application/pdf",
	DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	IMAGE_PNG: "image/png",
	IMAGE_JPEG: "image/jpeg",
	IMAGE_SVG: "image/svg+xml",
	XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	CSV: "text/csv",
	PPTX: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
	PPT: "application/vnd.ms-powerpoint"
} as const;

export const EVENTS = {
	DOCUMENT_LOADED: "document:loaded",
	PAGE_CHANGED: "page:changed",
	ZOOM_CHANGED: "zoom:changed",
	SEARCH_RESULT: "search:result",
	ANNOTATION_ADDED: "annotation:added",
	ANNOTATION_REMOVED: "annotation:removed",
	ERROR: "error"
} as const;

export const DEFAULT_STYLES = `
.buka-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: system-ui, sans-serif;
}

.buka-toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem;
  border-bottom: 1px solid #ddd;
  background: #f5f5f5;
}

.buka-btn {
  padding: 0.25rem 0.5rem;
  border: 1px solid #ccc;
  background: white;
  cursor: pointer;
  border-radius: 3px;
}

.buka-btn:hover {
  background: #e9e9e9;
}

.buka-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.buka-sidebar {
  width: 200px;
  border-right: 1px solid #ddd;
  background: #fafafa;
  overflow-y: auto;
}

.buka-content {
  flex: 1;
  position: relative;
  overflow: auto;
}

.buka-document-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.buka-annotation-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.buka-page-info {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.buka-search-controls {
  display: flex;
  gap: 0.25rem;
}

#searchInput {
  padding: 0.25rem;
  border: 1px solid #ccc;
  border-radius: 3px;
}

/* Loading indicator styles */
.buka-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
  color: #666;
  font-size: 14px;
}

.buka-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: buka-spin 1s linear infinite;
}

@keyframes buka-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Search highlighting styles */
.buka-search-highlight {
  position: absolute;
  background: rgba(255, 255, 0, 0.4);
  border: 1px solid rgba(255, 165, 0, 0.8);
  pointer-events: none;
  z-index: 15;
  border-radius: 2px;
}

/* Thumbnail styles */
.buka-thumbnails {
  padding: 10px;
}

.buka-thumbnail {
  width: 100%;
  margin-bottom: 10px;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 4px;
  overflow: hidden;
  transition: border-color 0.2s;
}

.buka-thumbnail:hover {
  border-color: #3498db;
}

.buka-thumbnail.active {
  border-color: #2980b9;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.buka-thumbnail-label {
  text-align: center;
  padding: 4px;
  background: #f8f8f8;
  font-size: 12px;
  color: #666;
}

.buka-thumbnail-placeholder {
  background: #f0f0f0;
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 12px;
}
`;
