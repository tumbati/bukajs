import type { EventCallback, ThumbnailData, ViewerOptions } from "../types";
import type { BaseRenderer } from "./base-renderer";
import { EVENTS } from "./config";
import { DocumentDetector } from "./document-detector";
import { RendererFactory } from "./render-factory";
import { styleManager } from "../styles";

/**
 * Main BukaJS Document Viewer Class
 */
export class BukaViewer {
	private container: HTMLElement;
	private options: ViewerOptions;
	private currentRenderer: BaseRenderer | null;
	private ui: any;
	private thumbnails: ThumbnailData[];
	private currentThumbnailPage: number;
	private eventListeners?: Map<string, Set<EventCallback>>;

	constructor(container: HTMLElement | string, options: ViewerOptions = {}) {
		this.container =
			typeof container === "string"
				? (document.querySelector(container) as HTMLElement)
				: container;

		if (!this.container) {
			throw new Error("Container element not found");
		}

		this.options = {
			enableAnnotations: true,
			enableSearch: true,
			enableThumbnails: true,
			enableToolbar: true,
			enableCache: true,
			theme: "default" as const,
			...options
		};

		this.currentRenderer = null;
		this.ui = null;
		this.thumbnails = [];
		this.currentThumbnailPage = 0;
		this.eventListeners = new Map();

		this.init();

		this.on("document:loaded", (data) => {
			const pageTotal = this.container.querySelector("#pageTotal") as HTMLElement;
			const pageInput = this.container.querySelector("#pageInput") as HTMLInputElement;
			if (pageTotal) pageTotal.textContent = `/ ${data.totalPages}`;
			if (pageInput) pageInput.value = "1";
		});

		this.on("page:changed", (data) => {
			const pageInput = this.container.querySelector("#pageInput") as HTMLInputElement;
			if (pageInput) pageInput.value = data.page.toString();
			this.updateActiveThumbnail(data.page);
		});
	}

	async init(): Promise<void> {
		await this.initializeStyles();

		this.container.classList.add("buka-viewer");

		if (this.options.theme !== "default" && this.options.theme) {
			this.container.setAttribute("data-buka-theme", this.options.theme);
		}

		this.createUIStructure();
	}

	async initializeStyles(): Promise<void> {
		// Inject core styles automatically
		styleManager.injectDefaultStyles();

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

	getThemeClasses(): Record<string, string> {
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
				toolbar: "flex items-center gap-4 p-2 border-b bg-gray-100",
				btn: "px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50",
				pageInput: "w-16 px-2 py-1 border border-gray-300 rounded",
				searchInput: "px-2 py-1 border border-gray-300 rounded"
			};
		}

		return baseClasses;
	}

	createUIStructure(): void {
		const classes = this.getThemeClasses();

		this.container.innerHTML = `
			<div class="${classes.toolbar}" style="display: ${this.options.enableToolbar ? "flex" : "none"}">
				<div class="${classes.toolbarSection}">
					<button id="prevPage" class="${classes.btn}">❮</button>
					<div class="${classes.pageInfo}">
						<input id="pageInput" class="${classes.pageInput}" type="number" min="1" value="1" />
						<span id="pageTotal">/ 1</span>
					</div>
					<button id="nextPage" class="${classes.btn}">❯</button>
				</div>

				<div class="${classes.toolbarSection}">
					<button id="zoomOut" class="${classes.btn}">−</button>
					<button id="zoomReset" class="${classes.btn}">100%</button>
					<button id="zoomIn" class="${classes.btn}">+</button>
				</div>

				<div class="${classes.toolbarSection}" style="display: ${this.options.enableSearch ? "flex" : "none"}">
					<input id="searchInput" class="${classes.searchInput}" type="text" placeholder="Search..." />
					<button id="searchBtn" class="${classes.btn}">🔍</button>
					<button id="searchPrev" class="${classes.btn}">⌃</button>
					<button id="searchNext" class="${classes.btn}">⌄</button>
				</div>

				<div class="${classes.toolbarSection}">
					<button id="toggleThumbnails" class="${classes.btn}" style="display: ${this.options.enableThumbnails ? "block" : "none"}">☰</button>
					<button id="fullscreen" class="${classes.btn}">⛶</button>
				</div>
			</div>

			<div class="${classes.main}">
				<div id="sidebar" class="${classes.sidebar}" style="display: none;">
					<div id="thumbnailContainer" class="${classes.thumbnails}"></div>
				</div>

				<div class="${classes.content}">
					<div class="${classes.documentContainer}">
						<!-- Document content will be rendered here -->
					</div>
				</div>
			</div>
		`;

		this.attachEventHandlers();
	}

	attachEventHandlers(): void {
		// Navigation controls
		this.container
			.querySelector("#prevPage")
			?.addEventListener("click", () => this.previousPage());
		this.container.querySelector("#nextPage")?.addEventListener("click", () => this.nextPage());

		const pageInput = this.container.querySelector("#pageInput") as HTMLInputElement;
		pageInput?.addEventListener("change", (e) => {
			const page = parseInt((e.target as HTMLInputElement).value);
			if (this.currentRenderer) {
				this.currentRenderer.goto(page);
			}
		});

		// Zoom controls
		this.container.querySelector("#zoomOut")?.addEventListener("click", () => this.zoomOut());
		this.container.querySelector("#zoomIn")?.addEventListener("click", () => this.zoomIn());
		this.container
			.querySelector("#zoomReset")
			?.addEventListener("click", () => this.resetZoom());

		// Search controls
		const searchInput = this.container.querySelector("#searchInput") as HTMLInputElement;
		searchInput?.addEventListener("keyup", (e) => {
			if (e.key === "Enter") {
				this.performSearch();
			}
		});

		this.container
			.querySelector("#searchBtn")
			?.addEventListener("click", () => this.performSearch());

		this.container
			.querySelector("#searchPrev")
			?.addEventListener("click", () => this.previousSearchResult());
		this.container
			.querySelector("#searchNext")
			?.addEventListener("click", () => this.nextSearchResult());

		// Thumbnail toggle
		this.container
			.querySelector("#toggleThumbnails")
			?.addEventListener("click", () => this.toggleThumbnails());

		// Fullscreen
		this.container
			.querySelector("#fullscreen")
			?.addEventListener("click", () => this.toggleFullscreen());
	}

	async load(source: string | File | Blob): Promise<void> {
		try {
			// Clean up previous document
			this.cleanup();

			// Show loading indicator
			this.showLoading("Loading document...");

			const mimeType = await DocumentDetector.detectType(source);
			const documentContainer = this.container.querySelector(
				".buka-document-container"
			) as HTMLElement;

			this.currentRenderer = RendererFactory.create(
				mimeType,
				documentContainer,
				this.options
			);

			// Forward renderer events to viewer
			this.currentRenderer.on(EVENTS.DOCUMENT_LOADED, (data) =>
				this.emit(EVENTS.DOCUMENT_LOADED, data)
			);
			this.currentRenderer.on(EVENTS.PAGE_CHANGED, (data) =>
				this.emit(EVENTS.PAGE_CHANGED, data)
			);
			this.currentRenderer.on(EVENTS.ZOOM_CHANGED, (data) =>
				this.emit(EVENTS.ZOOM_CHANGED, data)
			);
			this.currentRenderer.on(EVENTS.SEARCH_RESULT, (data) =>
				this.emit(EVENTS.SEARCH_RESULT, data)
			);

			await this.currentRenderer.load(source);
			await this.currentRenderer.render();

			// Hide loading indicator immediately after render
			this.hideLoading();

			if (this.options.enableThumbnails) {
				await this.generateThumbnails();
			}

			// Update zoom display after document loads
			this.updateZoomDisplay();

			this.emit(EVENTS.DOCUMENT_LOADED, {
				totalPages: this.currentRenderer.totalPages
			});
		} catch (error) {
			this.hideLoading();
			this.emit(EVENTS.ERROR, error);
			throw error;
		}
	}

	// Event handling methods
	on(event: string, callback: EventCallback): void {
		if (!this.eventListeners!.has(event)) {
			this.eventListeners!.set(event, new Set());
		}
		this.eventListeners!.get(event)!.add(callback);
	}

	emit(event: string, data: any): void {
		const listeners = this.eventListeners!.get(event);
		if (listeners) {
			listeners.forEach((callback) => callback(data));
		}
	}

	// Navigation methods
	async previousPage(): Promise<void> {
		if (this.currentRenderer && this.currentRenderer.currentPage > 1) {
			await this.currentRenderer.goto(this.currentRenderer.currentPage - 1);
		}
	}

	async nextPage(): Promise<void> {
		if (
			this.currentRenderer &&
			this.currentRenderer.currentPage < this.currentRenderer.totalPages
		) {
			await this.currentRenderer.goto(this.currentRenderer.currentPage + 1);
		}
	}

	// Zoom methods
	async zoomIn(): Promise<void> {
		if (this.currentRenderer) {
			const currentZoom = this.currentRenderer.zoom || 1.0;
			await this.currentRenderer.setZoom(currentZoom * 1.25);
			this.updateZoomDisplay();
		}
	}

	async zoomOut(): Promise<void> {
		if (this.currentRenderer) {
			const currentZoom = this.currentRenderer.zoom || 1.0;
			await this.currentRenderer.setZoom(currentZoom * 0.8);
			this.updateZoomDisplay();
		}
	}

	async resetZoom(): Promise<void> {
		if (this.currentRenderer) {
			await this.currentRenderer.setZoom(1.0);
			this.updateZoomDisplay();
		}
	}

	updateZoomDisplay(): void {
		if (this.currentRenderer) {
			const zoomBtn = this.container.querySelector("#zoomReset") as HTMLElement;
			if (zoomBtn) {
				const zoom = this.currentRenderer.zoom || 1.0;
				zoomBtn.textContent = `${Math.round(zoom * 100)}%`;
			}
		}
	}

	// Getter methods
	getCurrentPage(): number {
		return this.currentRenderer?.currentPage ?? 0;
	}

	getTotalPages(): number {
		return this.currentRenderer?.totalPages ?? 0;
	}

	getZoom(): number {
		return this.currentRenderer?.zoom ?? 1.0;
	}

	// Annotation methods
	addAnnotation(annotation: any): string | undefined {
		return this.currentRenderer?.addAnnotation(annotation);
	}

	exportAnnotations(): any[] {
		return this.currentRenderer?.exportAnnotations() ?? [];
	}

	// Thumbnail methods
	async generateThumbnails(): Promise<void> {
		if (!this.currentRenderer) return;

		const thumbnailContainer = this.container.querySelector(
			"#thumbnailContainer"
		) as HTMLElement;
		if (!thumbnailContainer) return;

		// Clear existing thumbnails
		thumbnailContainer.innerHTML = "";

		try {
			// Generate thumbnails for each page
			for (let pageNum = 1; pageNum <= this.currentRenderer.totalPages; pageNum++) {
				const thumbnail = await this.generatePageThumbnail(pageNum);
				if (thumbnail) {
					thumbnailContainer.appendChild(thumbnail);
				}
			}
		} catch (error) {
			console.warn("Failed to generate thumbnails:", error);
		}
	}

	async generatePageThumbnail(pageNum: number): Promise<HTMLElement | null> {
		if (!this.currentRenderer) return null;

		try {
			const thumbnailDiv = document.createElement("div");
			thumbnailDiv.className = "buka-thumbnail";
			thumbnailDiv.dataset.page = pageNum.toString();

			// Create thumbnail for PDF
			if (this.currentRenderer.constructor.name === "PDFRenderer") {
				const thumbnail = await this.generatePDFThumbnail(pageNum);
				if (thumbnail) {
					thumbnailDiv.appendChild(thumbnail);
				}
			} else {
				// Fallback for other renderers
				thumbnailDiv.innerHTML = `<div class="buka-thumbnail-placeholder">Page ${pageNum}</div>`;
			}

			// Add click handler
			thumbnailDiv.addEventListener("click", () => {
				if (this.currentRenderer) {
					this.currentRenderer.goto(pageNum);
				}
			});

			// Add page label
			const label = document.createElement("div");
			label.className = "buka-thumbnail-label";
			label.textContent = pageNum.toString();
			thumbnailDiv.appendChild(label);

			return thumbnailDiv;
		} catch (error) {
			console.warn(`Failed to generate thumbnail for page ${pageNum}:`, error);
			return null;
		}
	}

	async generatePDFThumbnail(pageNum: number): Promise<HTMLCanvasElement | null> {
		const renderer = this.currentRenderer as any; // Cast to access PDF-specific properties

		if (!renderer.pdfDocument) {
			return null;
		}

		try {
			const page = await renderer.pdfDocument.getPage(pageNum);
			const canvas = document.createElement("canvas");
			const context = canvas.getContext("2d");
			if (!context) return null;

			// Set thumbnail size
			const thumbnailScale = 0.2;
			const viewport = page.getViewport({ scale: thumbnailScale });

			canvas.width = viewport.width;
			canvas.height = viewport.height;
			canvas.style.width = "100%";
			canvas.style.height = "auto";

			const renderContext = {
				canvasContext: context,
				viewport: viewport
			};

			await page.render(renderContext).promise;
			return canvas;
		} catch (error) {
			console.warn(`Failed to generate PDF thumbnail for page ${pageNum}:`, error);
			return null;
		}
	}

	toggleThumbnails(): void {
		const sidebar = this.container.querySelector("#sidebar") as HTMLElement;
		if (sidebar) {
			sidebar.style.display = sidebar.style.display === "none" ? "block" : "none";
		}
	}

	showThumbnails(): void {
		const sidebar = this.container.querySelector("#sidebar") as HTMLElement;
		if (sidebar) {
			sidebar.style.display = "block";
		}
	}

	hideThumbnails(): void {
		const sidebar = this.container.querySelector("#sidebar") as HTMLElement;
		if (sidebar) {
			sidebar.style.display = "none";
		}
	}

	updateActiveThumbnail(currentPage: number): void {
		// Remove active class from all thumbnails
		const thumbnails = this.container.querySelectorAll(".buka-thumbnail");
		thumbnails.forEach((thumbnail) => {
			thumbnail.classList.remove("active");
		});

		// Add active class to current page thumbnail
		const activeThumbnail = this.container.querySelector(
			`.buka-thumbnail[data-page="${currentPage}"]`
		);
		if (activeThumbnail) {
			activeThumbnail.classList.add("active");
		}
	}

	// Search methods
	performSearch(): void {
		const searchInput = this.container.querySelector("#searchInput") as HTMLInputElement;
		if (searchInput && this.currentRenderer) {
			const query = searchInput.value.trim();
			if (query) {
				this.currentRenderer.search(query);
			}
		}
	}

	clearSearch(): void {
		const searchInput = this.container.querySelector("#searchInput") as HTMLInputElement;
		if (searchInput) {
			searchInput.value = "";
		}
	}

	nextSearchResult(): void {
		if (
			this.currentRenderer &&
			this.currentRenderer.searchResults &&
			this.currentRenderer.searchResults.length > 0
		) {
			this.currentRenderer.currentSearchIndex =
				(this.currentRenderer.currentSearchIndex + 1) %
				this.currentRenderer.searchResults.length;
			const result =
				this.currentRenderer.searchResults[this.currentRenderer.currentSearchIndex];
			if (result && result.page) {
				this.currentRenderer.goto(result.page);
			}
		}
	}

	previousSearchResult(): void {
		if (
			this.currentRenderer &&
			this.currentRenderer.searchResults &&
			this.currentRenderer.searchResults.length > 0
		) {
			this.currentRenderer.currentSearchIndex =
				(this.currentRenderer.currentSearchIndex -
					1 +
					this.currentRenderer.searchResults.length) %
				this.currentRenderer.searchResults.length;
			const result =
				this.currentRenderer.searchResults[this.currentRenderer.currentSearchIndex];
			if (result && result.page) {
				this.currentRenderer.goto(result.page);
			}
		}
	}

	// Fullscreen
	toggleFullscreen(): void {
		if (document.fullscreenElement) {
			document.exitFullscreen();
		} else {
			this.container.requestFullscreen();
		}
	}

	// Loading indicator methods
	showLoading(message: string = "Loading..."): void {
		const documentContainer = this.container.querySelector(
			".buka-document-container"
		) as HTMLElement;
		if (documentContainer) {
			documentContainer.innerHTML = `
				<div class="buka-loading">
					<div class="buka-spinner"></div>
					<div style="margin-top: 10px;">${message}</div>
				</div>
			`;
		}
	}

	hideLoading(): void {
		const documentContainer = this.container.querySelector(
			".buka-document-container"
		) as HTMLElement;
		if (documentContainer) {
			// Only clear if it contains loading content
			const loadingElement = documentContainer.querySelector(".buka-loading");
			if (loadingElement) {
				loadingElement.remove();
			}
		}
	}

	// Cleanup methods
	cleanup(): void {
		// Clear thumbnails
		this.thumbnails = [];
		this.currentThumbnailPage = 0;

		// Clear thumbnail container
		const thumbnailContainer = this.container.querySelector("#thumbnailContainer");
		if (thumbnailContainer) {
			thumbnailContainer.innerHTML = "";
		}

		// Hide thumbnails sidebar
		this.hideThumbnails();

		// Clear search input
		this.clearSearch();

		// Reset zoom display
		const zoomBtn = this.container.querySelector("#zoomReset") as HTMLElement;
		if (zoomBtn) {
			zoomBtn.textContent = "100%";
		}

		// Reset page display
		const pageTotal = this.container.querySelector("#pageTotal") as HTMLElement;
		const pageInput = this.container.querySelector("#pageInput") as HTMLInputElement;
		if (pageTotal) pageTotal.textContent = "/ 1";
		if (pageInput) pageInput.value = "1";

		// Destroy current renderer
		if (this.currentRenderer) {
			this.currentRenderer.destroy();
			this.currentRenderer = null;
		}
	}

	destroy(): void {
		this.cleanup();
		this.eventListeners?.clear();
		this.container.innerHTML = "";
	}
}
