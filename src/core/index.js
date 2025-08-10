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
};

export const EVENTS = {
	DOCUMENT_LOADED: "document:loaded",
	PAGE_CHANGED: "page:changed",
	ZOOM_CHANGED: "zoom:changed",
	SEARCH_RESULT: "search:result",
	ANNOTATION_ADDED: "annotation:added",
	ANNOTATION_REMOVED: "annotation:removed",
	ERROR: "error"
};

/**
 * Base Document Renderer Interface
 * All specific renderers must implement these methods
 */
export class BaseRenderer {
	constructor(container, options = {}) {
		this.container = container;
		this.options = options;
		this.currentPage = 1;
		this.totalPages = 1;
		this.zoom = 1.0;
		this.annotations = new Map();
		this.eventListeners = new Map();
	}

	async load(source) {
		throw new Error("load() must be implemented by subclass");
	}

	async render() {
		throw new Error("render() must be implemented by subclass");
	}

	async goto(page) {
		if (page < 1 || page > this.totalPages) return false;
		this.currentPage = page;
		await this.render();
		this.emit(EVENTS.PAGE_CHANGED, { page, totalPages: this.totalPages });
		return true;
	}

	async zoom(factor) {
		this.zoom = Math.max(0.1, Math.min(5.0, factor));
		await this.render();
		this.emit(EVENTS.ZOOM_CHANGED, { zoom: this.zoom });
	}

	async search(query) {
		throw new Error("search() must be implemented by subclass");
	}

	addAnnotation(annotation) {
		const id = `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const fullAnnotation = {
			id,
			page: this.currentPage,
			timestamp: new Date().toISOString(),
			...annotation
		};
		this.annotations.set(id, fullAnnotation);
		this.emit(EVENTS.ANNOTATION_ADDED, fullAnnotation);
		return id;
	}

	removeAnnotation(id) {
		const annotation = this.annotations.get(id);
		if (annotation) {
			this.annotations.delete(id);
			this.emit(EVENTS.ANNOTATION_REMOVED, annotation);
			return true;
		}
		return false;
	}

	exportAnnotations() {
		return Array.from(this.annotations.values());
	}

	importAnnotations(annotations) {
		annotations.forEach((ann) => {
			this.annotations.set(ann.id, ann);
		});
	}

	on(event, callback) {
		if (!this.eventListeners.has(event)) {
			this.eventListeners.set(event, new Set());
		}
		this.eventListeners.get(event).add(callback);
	}

	off(event, callback) {
		const listeners = this.eventListeners.get(event);
		if (listeners) {
			listeners.delete(callback);
		}
	}

	emit(event, data) {
		const listeners = this.eventListeners.get(event);
		if (listeners) {
			listeners.forEach((callback) => callback(data));
		}
	}

	destroy() {
		this.eventListeners.clear();
		this.annotations.clear();
		if (this.container) {
			this.container.innerHTML = "";
		}
	}
}

/**
 * Document Type Detector
 */
export class DocumentDetector {
	static async detectType(source) {
		if (typeof source === "string") {
			const extension = source.split(".").pop().toLowerCase();
			switch (extension) {
				case "pdf":
					return SUPPORTED_FORMATS.PDF;
				case "docx":
					return SUPPORTED_FORMATS.DOCX;
				case "xlsx":
					return SUPPORTED_FORMATS.XLSX;
				case "png":
					return SUPPORTED_FORMATS.IMAGE_PNG;
				case "jpg":
				case "jpeg":
					return SUPPORTED_FORMATS.IMAGE_JPEG;
				case "svg":
					return SUPPORTED_FORMATS.IMAGE_SVG;
				case "csv":
					return SUPPORTED_FORMATS.CSV;
				case "pptx":
					return SUPPORTED_FORMATS.PPTX;
				case "ppt":
					return SUPPORTED_FORMATS.PPT;
			}
		} else if (source instanceof File || source instanceof Blob) {
			return source.type;
		}

		throw new Error("Unable to detect document type");
	}
}

/**
 * Renderer Factory
 */
export class RendererFactory {
	static renderers = new Map();

	static register(mimeType, rendererClass) {
		this.renderers.set(mimeType, rendererClass);
	}

	static create(mimeType, container, options) {
		const RendererClass = this.renderers.get(mimeType);
		if (!RendererClass) {
			throw new Error(`No renderer available for type: ${mimeType}`);
		}
		return new RendererClass(container, options);
	}
}

/**
 * Main BukaJS Document Viewer Class
 */
export class BukaViewer {
	constructor(container, options = {}) {
		this.container =
			typeof container === "string" ? document.querySelector(container) : container;

		if (!this.container) {
			throw new Error("Container element not found");
		}

		this.options = {
			enableAnnotations: true,
			enableSearch: true,
			enableThumbnails: true,
			enableToolbar: true,
			enableCache: true,
			theme: "default", // 'default', 'dark', 'tailwind'
			customCSS: null,
			...options
		};

		this.currentRenderer = null;
		this.ui = null;
		this.thumbnails = [];
		this.currentThumbnailPage = 0;

		this.init();

		this.on(EVENTS.DOCUMENT_LOADED, (data) => {
			this.container.querySelector("#pageTotal").textContent = `/ ${data.totalPages}`;
			this.container.querySelector("#pageInput").value = 1;
		});

		this.on(EVENTS.PAGE_CHANGED, (data) => {
			this.container.querySelector("#pageInput").value = data.page;
		});
	}

	async init() {
		await this.initializeStyles();

		this.container.classList.add("buka-viewer");

		if (this.options.theme !== "default") {
			this.container.setAttribute("data-buka-theme", this.options.theme);
		}

		this.createUIStructure();
	}

	async initializeStyles() {
		if (this.options.customCSS) {
			const styleEl = document.createElement("style");
			styleEl.textContent = this.options.customCSS;
			document.head.appendChild(styleEl);
		}

		if (this.options.theme === "dark") {
			this.container.setAttribute("data-buka-theme", "dark");
		} else if (this.options.theme === "tailwind") {
			this.container.setAttribute("data-buka-theme", "tailwind");
		}
	}

	getThemeClasses() {
		const baseClasses = {
			viewer: "buka-viewer",
			toolbar: "buka-toolbar",
			toolbarSection: "buka-toolbar-section",
			main: "buka-main",
			sidebar: "buka-sidebar",
			content: "buka-content",
			documentContainer: "buka-document-container",
			annotationLayer: "buka-annotation-layer",
			btn: "buka-btn",
			pageInfo: "buka-page-info",
			pageInput: "buka-page-input",
			searchInput: "buka-search-input",
			thumbnails: "buka-thumbnails"
		};

		if (this.options.theme === "tailwind") {
			return {
				...baseClasses,
				viewer: "buka-viewer-tw",
				toolbar: "buka-toolbar-tw",
				toolbarSection: "buka-toolbar-section-tw",
				main: "buka-main-tw",
				sidebar: "buka-sidebar-tw",
				content: "buka-content-tw",
				documentContainer: "buka-document-container-tw",
				btn: "buka-btn-tw",
				pageInfo: "buka-page-info-tw",
				pageInput: "buka-page-input-tw",
				searchInput: "buka-search-input-tw",
				thumbnails: "buka-thumbnails-tw"
			};
		}

		return baseClasses;
	}

	createUIStructure() {
		const classes = this.getThemeClasses();

		this.container.innerHTML = `
      <div class="${classes.toolbar}" style="display: ${
			this.options.enableToolbar ? "flex" : "none"
		}">
        <div class="${classes.toolbarSection}">
          <div class="buka-nav-controls">
            <button class="${classes.btn}" id="prevPage" title="Previous page">←</button>
            <div class="${classes.pageInfo}">
              <input type="number" class="${classes.pageInput}" id="pageInput" value="1" min="1">
              <span id="pageTotal">/ 1</span>
            </div>
            <button class="${classes.btn}" id="nextPage" title="Next page">→</button>
          </div>
        </div>

        <div class="${classes.toolbarSection}">
          <div class="buka-zoom-controls">
            <button class="${classes.btn}" id="zoomOut" title="Zoom out">−</button>
            <span class="buka-zoom-level" id="zoomLevel">100%</span>
            <button class="${classes.btn}" id="zoomIn" title="Zoom in">+</button>
            <button class="${classes.btn}" id="fitWidth" title="Fit to width">⭤</button>
            <button class="${classes.btn}" id="fitPage" title="Fit to page">⭘</button>
          </div>
        </div>

        <div class="${classes.toolbarSection}" style="display: ${
			this.options.enableSearch ? "flex" : "none"
		}">
          <div class="buka-search-controls">
            <input type="text" class="${
				classes.searchInput
			}" id="searchInput" placeholder="Search..." />
            <button class="${classes.btn}" id="searchBtn" title="Search">🔍</button>
            <div id="searchResults" class="buka-search-results" style="display: none;"></div>
          </div>
        </div>

        <div class="${classes.toolbarSection}">
          <button class="${
				classes.btn
			}" id="thumbnailToggle" title="Toggle thumbnails" style="display: ${
				this.options.enableThumbnails ? "inline-flex" : "none"
			}">☰</button>
          <button class="${classes.btn}" id="fullscreenBtn" title="Fullscreen">⛶</button>
        </div>
      </div>

      <div class="${classes.main}">
        <div class="${classes.sidebar}" id="sidebar" style="display: ${
			this.options.enableThumbnails ? "block" : "none"
		}">
          <div class="buka-sidebar-header">
            <h4>Pages</h4>
            <button class="${classes.btn} buka-btn-sm" id="closeSidebar">×</button>
          </div>
          <div class="${classes.thumbnails}" id="thumbnails">
            <div class="buka-loading">
              <div class="buka-spinner"></div>
              Loading thumbnails...
            </div>
          </div>
        </div>

        <div class="${classes.content}">
          <div class="${classes.documentContainer}" id="documentContainer">
            <div class="buka-loading" id="loadingIndicator">
              <div class="buka-spinner"></div>
              Loading document...
            </div>
          </div>
          <div class="${classes.annotationLayer}" id="annotationLayer"></div>
        </div>
      </div>
    `;

		this.bindEvents();
	}

	bindEvents() {
		this.container.querySelector("#prevPage").addEventListener("click", () => {
			if (this.currentRenderer) {
				this.currentRenderer.goto(this.currentRenderer.currentPage - 1);
			}
		});

		this.container.querySelector("#nextPage").addEventListener("click", () => {
			if (this.currentRenderer) {
				this.currentRenderer.goto(this.currentRenderer.currentPage + 1);
			}
		});

		this.container.querySelector("#pageInput").addEventListener("change", (e) => {
			if (this.currentRenderer) {
				this.currentRenderer.goto(parseInt(e.target.value));
			}
		});

		this.container.querySelector("#zoomOut").addEventListener("click", () => {
			console.log(this.currentRenderer);
			if (this.currentRenderer) {
				// this.currentRenderer.zoom(this.currentRenderer.zoom * 0.8);
			}
		});

		this.container.querySelector("#zoomIn").addEventListener("click", () => {
			console.log(this.currentRenderer);
			if (this.currentRenderer) {
				// this.currentRenderer.zoom(this.currentRenderer.zoom * 1.25);
			}
		});

		const fitWidthBtn = this.container.querySelector("#fitWidth");
		if (fitWidthBtn) {
			fitWidthBtn.addEventListener("click", () => {
				if (this.currentRenderer && this.currentRenderer.fitToWidth) {
					this.currentRenderer.fitToWidth();
				}
			});
		}

		const fitPageBtn = this.container.querySelector("#fitPage");
		if (fitPageBtn) {
			fitPageBtn.addEventListener("click", () => {
				if (this.currentRenderer && this.currentRenderer.fitToPage) {
					this.currentRenderer.fitToPage();
				}
			});
		}

		const searchInput = this.container.querySelector("#searchInput");
		const searchBtn = this.container.querySelector("#searchBtn");

		searchBtn.addEventListener("click", () => {
			this.performSearch();
		});

		searchInput.addEventListener("keyup", (e) => {
			if (e.key === "Enter") {
				this.performSearch();
			} else if (e.key === "Escape") {
				this.clearSearch();
			}
		});

		const thumbnailToggle = this.container.querySelector("#thumbnailToggle");
		if (thumbnailToggle) {
			thumbnailToggle.addEventListener("click", () => {
				this.toggleThumbnails();
			});
		}

		const closeSidebar = this.container.querySelector("#closeSidebar");
		if (closeSidebar) {
			closeSidebar.addEventListener("click", () => {
				this.hideThumbnails();
			});
		}

		const fullscreenBtn = this.container.querySelector("#fullscreenBtn");
		if (fullscreenBtn) {
			fullscreenBtn.addEventListener("click", () => {
				this.toggleFullscreen();
			});
		}

		document.addEventListener("keydown", (e) => {
			if (!this.currentRenderer || this.isInputFocused()) return;

			switch (e.key) {
				case "ArrowLeft":
					e.preventDefault();
					this.currentRenderer.goto(this.currentRenderer.currentPage - 1);
					break;
				case "ArrowRight":
					e.preventDefault();
					this.currentRenderer.goto(this.currentRenderer.currentPage + 1);
					break;
				case "Home":
					e.preventDefault();
					this.currentRenderer.goto(1);
					break;
				case "End":
					e.preventDefault();
					this.currentRenderer.goto(this.currentRenderer.totalPages);
					break;
				case "+":
				case "=":
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault();
						this.currentRenderer.zoom(this.currentRenderer.zoom * 1.25);
					}
					break;
				case "-":
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault();
						this.currentRenderer.zoom(this.currentRenderer.zoom * 0.8);
					}
					break;
				case "0":
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault();
						this.currentRenderer.zoom(1.0);
					}
					break;
				case "f":
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault();
						searchInput.focus();
					}
					break;
			}
		});
	}

	isInputFocused() {
		const activeElement = document.activeElement;
		return (
			activeElement &&
			(activeElement.tagName === "INPUT" ||
				activeElement.tagName === "TEXTAREA" ||
				activeElement.contentEditable === "true")
		);
	}

	performSearch() {
		const query = this.container.querySelector("#searchInput").value;
		if (this.currentRenderer && query.trim()) {
			this.currentRenderer.search(query);
		}
	}

	clearSearch() {
		const searchInput = this.container.querySelector("#searchInput");
		searchInput.value = "";
		if (this.currentRenderer) {
			this.currentRenderer.search("");
		}
		this.hideSearchResults();
	}

	showSearchResults(results) {
		const searchResults = this.container.querySelector("#searchResults");
		if (!results.length) {
			searchResults.style.display = "none";
			return;
		}

		const resultItems = results
			.slice(0, 10)
			.map((result, index) => {
				const context = result.context || {
					before: "",
					match: result.text || result.match,
					after: ""
				};
				return `
        <div class="buka-search-result-item" data-result-index="${index}">
          <div class="result-context">
            ${context.before}<mark>${context.match}</mark>${context.after}
          </div>
          <div class="result-info">
            ${result.page ? `Page ${result.page}` : ""}
            ${result.slideIndex !== undefined ? `Slide ${result.slideIndex + 1}` : ""}
            ${result.address ? `Cell ${result.address}` : ""}
          </div>
        </div>
      `;
			})
			.join("");

		searchResults.innerHTML = resultItems;
		searchResults.style.display = "block";

		searchResults.querySelectorAll(".buka-search-result-item").forEach((item) => {
			item.addEventListener("click", (e) => {
				const index = parseInt(e.currentTarget.dataset.resultIndex);
				this.navigateToSearchResult(results[index]);
			});
		});
	}

	hideSearchResults() {
		const searchResults = this.container.querySelector("#searchResults");
		searchResults.style.display = "none";
	}

	navigateToSearchResult(result) {
		if (result.page) {
			this.currentRenderer.goto(result.page);
		} else if (result.slideIndex !== undefined) {
			this.currentRenderer.goto(result.slideIndex + 1);
		}
	}

	showThumbnails() {
		const sidebar = this.container.querySelector("#sidebar");
		sidebar.style.display = "block";

		if (this.thumbnails.length === 0 && this.currentRenderer) {
			this.generateThumbnails();
		}
	}

	hideThumbnails() {
		const sidebar = this.container.querySelector("#sidebar");
		sidebar.style.display = "none";
	}

	toggleFullscreen() {
		if (document.fullscreenElement) {
			document.exitFullscreen();
		} else {
			this.container.requestFullscreen().catch((err) => {
				console.warn("Failed to enter fullscreen:", err);
			});
		}
	}

	async load(source) {
		try {
			this.showLoading(true);

			const mimeType = await DocumentDetector.detectType(source);

			if (this.currentRenderer) {
				this.currentRenderer.destroy();
			}
			this.thumbnails = [];

			const documentContainer = this.container.querySelector("#documentContainer");
			this.currentRenderer = RendererFactory.create(
				mimeType,
				documentContainer,
				this.options
			);

			this.currentRenderer.on(EVENTS.DOCUMENT_LOADED, (data) => {
				this.showLoading(false);
				this.updateUI(data);
				this.generateThumbnails();
				this.emit(EVENTS.DOCUMENT_LOADED, data);
			});

			this.currentRenderer.on(EVENTS.PAGE_CHANGED, (data) => {
				this.updatePageInfo(data);
				this.updateThumbnailSelection(data.page);
				this.emit(EVENTS.PAGE_CHANGED, data);
			});

			this.currentRenderer.on(EVENTS.ZOOM_CHANGED, (data) => {
				this.updateZoomInfo(data);
				this.emit(EVENTS.ZOOM_CHANGED, data);
			});

			this.currentRenderer.on(EVENTS.SEARCH_RESULT, (data) => {
				this.showSearchResults(data.results);
				this.emit(EVENTS.SEARCH_RESULT, data);
			});

			await this.currentRenderer.load(source);
		} catch (error) {
			this.showLoading(false);
			this.showError(error.message);
			console.error("Failed to load document:", error);
			this.emit(EVENTS.ERROR, error);
			throw error;
		}
	}

	showLoading(show = true) {
		const loadingIndicator = this.container.querySelector("#loadingIndicator");
		if (loadingIndicator) {
			loadingIndicator.style.display = show ? "flex" : "none";
		}
	}

	showError(message) {
		const documentContainer = this.container.querySelector("#documentContainer");
		documentContainer.innerHTML = `
      <div class="buka-error">
        <div class="buka-error-icon">⚠️</div>
        <div class="buka-error-message">${message}</div>
        <button class="buka-btn" onclick="location.reload()">Retry</button>
      </div>
    `;
	}

	async generateThumbnails() {
		const thumbnailsContainer = this.container.querySelector("#thumbnails");
		if (!thumbnailsContainer || !this.currentRenderer || !this.currentRenderer.pdfDocument) {
			return;
		}
		thumbnailsContainer.innerHTML = ""; // Clear existing thumbnails

		for (let pageNumber = 1; pageNumber <= this.currentRenderer.totalPages; pageNumber++) {
			const page = await this.currentRenderer.pdfDocument.getPage(pageNumber);
			const viewport = page.getViewport({ scale: 0.1 });
			const canvas = document.createElement("canvas");
			const context = canvas.getContext("2d");
			canvas.height = viewport.height;
			canvas.width = viewport.width;
			canvas.className = "buka-thumbnail";
			canvas.dataset.page = pageNumber;

			await page.render({
				canvasContext: context,
				viewport: viewport
			}).promise;

			canvas.addEventListener("click", () => {
				this.currentRenderer.goto(pageNumber);
			});

			thumbnailsContainer.appendChild(canvas);
		}
		this.highlightThumbnail(this.currentRenderer.currentPage);
	}

	async createSingleThumbnail(container) {
		const thumbnail = document.createElement("div");
		thumbnail.className = "buka-thumbnail active";
		thumbnail.innerHTML = `
      <div class="buka-thumbnail-content">
        <div class="buka-thumbnail-preview">📄</div>
        <div class="buka-thumbnail-label">Document</div>
      </div>
    `;

		thumbnail.addEventListener("click", () => {
			this.currentRenderer.goto(1);
		});

		container.appendChild(thumbnail);
		this.thumbnails.push({ page: 1, element: thumbnail });
	}

	async createPageThumbnail(container, pageNumber) {
		const thumbnail = document.createElement("div");
		thumbnail.className = `buka-thumbnail ${pageNumber === 1 ? "active" : ""}`;
		thumbnail.innerHTML = `
      <div class="buka-thumbnail-content">
        <div class="buka-thumbnail-preview">
          <canvas width="120" height="160" style="max-width: 100%; max-height: 100%;"></canvas>
        </div>
        <div class="buka-thumbnail-label">Page ${pageNumber}</div>
      </div>
    `;

		thumbnail.addEventListener("click", () => {
			this.currentRenderer.goto(pageNumber);
		});

		container.appendChild(thumbnail);
		this.thumbnails.push({ page: pageNumber, element: thumbnail });

		try {
			await this.renderThumbnailPreview(thumbnail, pageNumber);
		} catch (error) {
			console.warn(`Failed to generate thumbnail for page ${pageNumber}:`, error);
		}
	}

	async renderThumbnailPreview(thumbnail, pageNumber) {
		const canvas = thumbnail.querySelector("canvas");
		if (!canvas || !this.currentRenderer) return;

		const ctx = canvas.getContext("2d");

		if (
			this.currentRenderer.constructor.name === "PDFRenderer" &&
			this.currentRenderer.pdfDocument
		) {
			try {
				const page = await this.currentRenderer.pdfDocument.getPage(pageNumber);
				const viewport = page.getViewport({ scale: 0.2 });

				canvas.width = viewport.width;
				canvas.height = viewport.height;

				await page.render({
					canvasContext: ctx,
					viewport: viewport
				}).promise;
			} catch (error) {
				console.warn("Failed to render PDF thumbnail:", error);
			}
		} else {
			ctx.fillStyle = "#f0f0f0";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = "#666";
			ctx.font = "12px sans-serif";
			ctx.textAlign = "center";
			ctx.fillText(`Page ${pageNumber}`, canvas.width / 2, canvas.height / 2);
		}
	}

	highlightThumbnail(pageNumber) {
		const thumbnails = this.container.querySelectorAll(".buka-thumbnail");
		thumbnails.forEach((thumb) => {
			thumb.classList.remove("buka-thumbnail-active");
			if (parseInt(thumb.dataset.page) === pageNumber) {
				thumb.classList.add("buka-thumbnail-active");
				thumb.scrollIntoView({ behavior: "smooth", block: "nearest" });
			}
		});
	}

	toggleThumbnails() {
		const sidebar = this.container.querySelector("#sidebar");
		if (sidebar) {
			const isVisible = sidebar.style.display === "block";
			sidebar.style.display = isVisible ? "none" : "block";
		}
	}

	updateThumbnailSelection(currentPage) {
		this.thumbnails.forEach((thumbnail) => {
			const isActive = thumbnail.page === currentPage;
			thumbnail.element.classList.toggle("active", isActive);
		});
	}

	updateUI(data) {
		const pageTotal = this.container.querySelector("#pageTotal");
		const pageInput = this.container.querySelector("#pageInput");

		pageTotal.textContent = `/ ${data.totalPages}`;
		pageInput.max = data.totalPages;
	}

	updatePageInfo({ page, totalPages }) {
		const pageInput = this.container.querySelector("#pageInput");
		pageInput.value = page;
	}

	updateZoomInfo({ zoom }) {
		const zoomLevel = this.container.querySelector("#zoomLevel");
		zoomLevel.textContent = `${Math.round(zoom * 100)}%`;
	}

	on(event, callback) {
		if (!this.eventListeners) {
			this.eventListeners = new Map();
		}
		if (!this.eventListeners.has(event)) {
			this.eventListeners.set(event, new Set());
		}
		this.eventListeners.get(event).add(callback);
	}

	emit(event, data) {
		if (this.eventListeners && this.eventListeners.has(event)) {
			this.eventListeners.get(event).forEach((callback) => callback(data));
		}
	}

	getCurrentPage() {
		return this.currentRenderer?.currentPage || 1;
	}

	getTotalPages() {
		return this.currentRenderer?.totalPages || 1;
	}

	getZoom() {
		return this.currentRenderer?.zoom || 1.0;
	}

	addAnnotation(annotation) {
		return this.currentRenderer?.addAnnotation(annotation);
	}

	exportAnnotations() {
		return this.currentRenderer?.exportAnnotations() || [];
	}

	destroy() {
		if (this.currentRenderer) {
			this.currentRenderer.destroy();
		}
		if (this.eventListeners) {
			this.eventListeners.clear();
		}
	}
}

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

// Note: Renderers must be imported separately to register them
// This avoids circular dependency issues while keeping the core lightweight
