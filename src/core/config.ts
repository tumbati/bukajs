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
`;
