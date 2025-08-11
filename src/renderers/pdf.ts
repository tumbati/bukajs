import { BaseRenderer, EVENTS, RendererFactory, SUPPORTED_FORMATS } from "../core";
import type { Annotation, SearchResult } from "../types";

/**
 * PDF Renderer using PDF.js
 * Handles PDF documents with canvas rendering and text layer
 */
export class PDFRenderer extends BaseRenderer {
	public pdfDocument: any;
	public currentPageObject: any;
	public canvas: HTMLCanvasElement | null;
	public context: CanvasRenderingContext2D | null;
	public textLayer: HTMLElement | null;
	public scrollContainer: HTMLElement | null;
	public documentWrapper: HTMLElement | null;
	public pageElements: HTMLElement[];
	override searchResults: SearchResult[];
	override currentSearchIndex: number;
	private lastRenderedZoom: number;
	private scrollHandler: (() => void) | null;

	constructor(container: HTMLElement, options = {}) {
		super(container, options);
		this.pdfDocument = null;
		this.currentPageObject = null;
		this.canvas = null;
		this.context = null;
		this.textLayer = null;
		this.scrollContainer = null;
		this.documentWrapper = null;
		this.pageElements = [];
		this.searchResults = [];
		this.currentSearchIndex = 0;
		this.zoomFactor = 1.0;
		this.lastRenderedZoom = 0;
		this.scrollHandler = null;
		this.setupCanvas();
	}

	setupCanvas(): void {
		// Create scrollable container for continuous viewing
		const scrollContainer = document.createElement("div");
		scrollContainer.className = "buka-pdf-scroll-container";
		scrollContainer.style.cssText = `
			width: 100%;
			height: 100%;
			overflow: auto;
			position: relative;
			background: #f0f0f0;
		`;

		// Create document container for all pages
		const documentWrapper = document.createElement("div");
		documentWrapper.className = "buka-pdf-document-wrapper";
		documentWrapper.style.cssText = `
			display: flex;
			flex-direction: column;
			align-items: center;
			padding: 20px;
			gap: 20px;
		`;

		scrollContainer.appendChild(documentWrapper);
		this.container.appendChild(scrollContainer);

		// Store references
		this.scrollContainer = scrollContainer;
		this.documentWrapper = documentWrapper;

		// Single page mode canvas (for compatibility)
		this.canvas = document.createElement("canvas");
		this.canvas.className = "buka-pdf-canvas";
		this.context = this.canvas.getContext("2d");

		this.textLayer = document.createElement("div");
		this.textLayer.className = "buka-pdf-text-layer";
		this.textLayer.style.cssText = `
			position: absolute;
			top: 0;
			left: 0;
			overflow: hidden;
			opacity: 0.2;
			line-height: 1.0;
		`;
	}

	async load(source: string | File | Blob): Promise<void> {
		try {
			// Clean up any previous document
			await this.cleanup();

			const pdfjsLib = await this.loadPDFJS();

			let typedArray: Uint8Array;

			if (typeof source === "string") {
				const response = await fetch(source);
				typedArray = new Uint8Array(await response.arrayBuffer());
			} else if (source instanceof File || source instanceof Blob) {
				typedArray = new Uint8Array(await source.arrayBuffer());
			} else {
				throw new Error("Unsupported source type");
			}

			const loadingTask = pdfjsLib.getDocument({
				data: typedArray,
				cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/",
				cMapPacked: true
			});

			this.pdfDocument = await loadingTask.promise;
			this.totalPages = this.pdfDocument.numPages;

			// Render all pages for continuous scrolling
			await this.renderAllPages();

			this.emit(EVENTS.DOCUMENT_LOADED, {
				totalPages: this.totalPages,
				title: await this.getDocumentTitle()
			});
		} catch (error) {
			console.error("PDF loading failed:", error);
			throw new Error(`Failed to load PDF: ${error}`);
		}
	}

	async loadPDFJS(): Promise<any> {
		if (typeof (window as any).pdfjsLib !== "undefined") {
			return (window as any).pdfjsLib;
		}

		const script = document.createElement("script");
		script.src = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
		document.head.appendChild(script);

		return new Promise((resolve, reject) => {
			script.onload = () => resolve((window as any).pdfjsLib);
			script.onerror = () => reject(new Error("Failed to load PDF.js"));
		});
	}

	async loadPage(pageNumber: number): Promise<void> {
		if (!this.pdfDocument || pageNumber < 1 || pageNumber > this.totalPages) {
			return;
		}

		this.currentPage = pageNumber;
		this.currentPageObject = await this.pdfDocument.getPage(pageNumber);

		await this.render();
	}

	async renderAllPages(): Promise<void> {
		if (!this.pdfDocument || !this.documentWrapper) return;

		// Clear existing pages only if starting fresh
		if (this.pageElements.length === 0) {
			this.documentWrapper.innerHTML = "";

			for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
				const pageElement = await this.renderSinglePage(pageNum);
				if (pageElement) {
					this.documentWrapper.appendChild(pageElement);
					this.pageElements.push(pageElement);
				}
			}

			// Set up scroll listener to track current page
			if (this.scrollContainer && !this.scrollHandler) {
				this.scrollHandler = this.handleScroll.bind(this);
				this.scrollContainer.addEventListener("scroll", this.scrollHandler);
			}
		} else {
			// Re-render existing pages with new zoom
			await this.reRenderExistingPages();
		}
	}

	async reRenderExistingPages(): Promise<void> {
		for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
			const pageElement = this.pageElements[pageNum - 1];
			if (pageElement) {
				// Clear the page content and re-render
				const canvas = pageElement.querySelector("canvas");
				const textLayer = pageElement.querySelector(".buka-pdf-page-text-layer");

				if (canvas && textLayer) {
					const page = await this.pdfDocument.getPage(pageNum);
					const viewport = page.getViewport({ scale: this.zoomFactor });

					// Update canvas
					const context = canvas.getContext("2d");
					if (context) {
						canvas.width = viewport.width;
						canvas.height = viewport.height;
						canvas.style.width = `${viewport.width}px`;
						canvas.style.height = `${viewport.height}px`;

						const renderContext = {
							canvasContext: context,
							viewport: viewport
						};
						await page.render(renderContext).promise;
					}

					// Update text layer
					textLayer.innerHTML = "";
					(textLayer as HTMLElement).style.width = `${viewport.width}px`;
					(textLayer as HTMLElement).style.height = `${viewport.height}px`;
					await this.renderPageTextLayer(page, textLayer as HTMLElement, viewport);
				}
			}
		}
	}

	async renderSinglePage(pageNum: number): Promise<HTMLElement | null> {
		try {
			const page = await this.pdfDocument.getPage(pageNum);
			const viewport = page.getViewport({ scale: this.zoomFactor });

			// Create page container
			const pageContainer = document.createElement("div");
			pageContainer.className = "buka-pdf-page-container";
			pageContainer.dataset.pageNumber = pageNum.toString();
			pageContainer.style.cssText = `
				position: relative;
				background: white;
				box-shadow: 0 4px 8px rgba(0,0,0,0.1);
				margin-bottom: 20px;
			`;

			// Create canvas for this page
			const canvas = document.createElement("canvas");
			canvas.className = "buka-pdf-page-canvas";
			const context = canvas.getContext("2d");
			if (!context) return null;

			canvas.width = viewport.width;
			canvas.height = viewport.height;
			canvas.style.width = `${viewport.width}px`;
			canvas.style.height = `${viewport.height}px`;

			// Render page
			const renderContext = {
				canvasContext: context,
				viewport: viewport
			};
			await page.render(renderContext).promise;

			// Create text layer for this page
			const textLayer = document.createElement("div");
			textLayer.className = "buka-pdf-page-text-layer";
			textLayer.style.cssText = `
				position: absolute;
				top: 0;
				left: 0;
				width: ${viewport.width}px;
				height: ${viewport.height}px;
				overflow: hidden;
				opacity: 0.2;
				line-height: 1.0;
			`;

			await this.renderPageTextLayer(page, textLayer, viewport);

			pageContainer.appendChild(canvas);
			pageContainer.appendChild(textLayer);

			return pageContainer;
		} catch (error) {
			console.warn(`Failed to render page ${pageNum}:`, error);
			return null;
		}
	}

	async renderPageTextLayer(page: any, textLayer: HTMLElement, viewport: any): Promise<void> {
		try {
			const textContent = await page.getTextContent();
			const textItems = textContent.items;
			const textDiv = document.createElement("div");
			textDiv.style.cssText = `
				position: absolute;
				color: transparent;
				font-family: sans-serif;
				white-space: pre;
			`;

			textItems.forEach((item: any, index: number) => {
				const tx = (window as any).pdfjsLib.Util.transform(
					viewport.transform,
					item.transform
				);
				const fontSize = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);

				const span = document.createElement("span");
				span.style.cssText = `
					position: absolute;
					left: ${tx[4]}px;
					top: ${tx[5] - fontSize}px;
					font-size: ${fontSize}px;
					transform: scaleX(${tx[2] / fontSize});
				`;
				span.textContent = item.str;
				span.dataset.textIndex = `${index}`;

				textDiv.appendChild(span);
			});

			textLayer.appendChild(textDiv);
		} catch (error) {
			console.warn("Text layer rendering failed:", error);
		}
	}

	handleScroll(): void {
		if (!this.scrollContainer) return;

		const scrollTop = this.scrollContainer.scrollTop;
		const containerHeight = this.scrollContainer.clientHeight;

		// Find which page is currently most visible
		let currentVisiblePage = 1;
		let maxVisibleArea = 0;

		this.pageElements.forEach((pageElement, index) => {
			const pageRect = pageElement.getBoundingClientRect();
			const containerRect = this.scrollContainer!.getBoundingClientRect();

			const visibleTop = Math.max(pageRect.top, containerRect.top);
			const visibleBottom = Math.min(pageRect.bottom, containerRect.bottom);
			const visibleHeight = Math.max(0, visibleBottom - visibleTop);

			if (visibleHeight > maxVisibleArea) {
				maxVisibleArea = visibleHeight;
				currentVisiblePage = index + 1;
			}
		});

		if (currentVisiblePage !== this.currentPage) {
			this.currentPage = currentVisiblePage;
			this.emit(EVENTS.PAGE_CHANGED, {
				page: this.currentPage,
				totalPages: this.totalPages
			});
		}
	}

	async render(): Promise<void> {
		// Only re-render if zoom changed, otherwise keep existing pages
		if (this.zoomFactor !== this.lastRenderedZoom) {
			await this.renderAllPages();
			this.lastRenderedZoom = this.zoomFactor;
		}
	}

	async renderTextLayer(viewport: any): Promise<void> {
		if (!this.textLayer) return;

		this.textLayer.innerHTML = "";
		this.textLayer.style.width = `${viewport.width}px`;
		this.textLayer.style.height = `${viewport.height}px`;

		try {
			const textContent = await this.currentPageObject.getTextContent();

			const textItems = textContent.items;
			const textDiv = document.createElement("div");
			textDiv.style.cssText = `
				position: absolute;
				color: transparent;
				font-family: sans-serif;
				white-space: pre;
			`;

			textItems.forEach((item: any, index: number) => {
				const tx = (window as any).pdfjsLib.Util.transform(
					viewport.transform,
					item.transform
				);
				const fontSize = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);

				const span = document.createElement("span");
				span.style.cssText = `
					position: absolute;
					left: ${tx[4]}px;
					top: ${tx[5] - fontSize}px;
					font-size: ${fontSize}px;
					transform: scaleX(${tx[2] / fontSize});
				`;
				span.textContent = item.str;
				span.dataset.textIndex = `${index}`;

				textDiv.appendChild(span);
			});

			this.textLayer.appendChild(textDiv);
		} catch (error) {
			console.warn("Text layer rendering failed:", error);
		}
	}

	updateZoomDisplay(): void {
		const zoomLevelEl = this.container.querySelector("#zoomLevel");
		// if (this.currentRenderer && zoomLevelEl) {
		// 	zoomLevelEl.textContent = `${Math.round(this.currentRenderer.zoom * 100)}%`;
		// }
	}

	override async goto(page: number): Promise<boolean> {
		if (page === this.currentPage) return true;

		if (page >= 1 && page <= this.totalPages && this.scrollContainer) {
			// Scroll to the specific page
			const pageElement = this.pageElements[page - 1];
			if (pageElement) {
				pageElement.scrollIntoView({
					behavior: "smooth",
					block: "start"
				});
				this.currentPage = page;
				this.emit(EVENTS.PAGE_CHANGED, {
					page: this.currentPage,
					totalPages: this.totalPages
				});
				return true;
			}
		}
		return false;
	}

	override async setZoom(factor: number): Promise<void> {
		this.zoomFactor = Math.max(0.1, Math.min(5.0, factor));
		await this.render();
		this.emit(EVENTS.ZOOM_CHANGED, { zoom: this.zoomFactor });
	}

	async search(query: string): Promise<SearchResult[]> {
		if (!this.pdfDocument || !query.trim()) {
			this.searchResults = [];
			this.currentSearchIndex = 0;
			this.clearSearchHighlights();
			return [];
		}

		this.searchResults = [];
		this.clearSearchHighlights();

		const searchRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");

		for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
			try {
				const page = await this.pdfDocument.getPage(pageNum);
				const textContent = await page.getTextContent();

				// Search through individual text items for more precise highlighting
				textContent.items.forEach((item: any, itemIndex: number) => {
					let match: RegExpExecArray | null;
					const text = item.str;
					const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");

					while ((match = regex.exec(text)) !== null) {
						this.searchResults.push({
							match: match[0],
							page: pageNum,
							text: match[0],
							index: match.index,
							length: match[0].length
						} as SearchResult);
					}
				});
			} catch (error) {
				console.warn(`Search failed on page ${pageNum}:`, error);
			}
		}

		this.currentSearchIndex = 0;
		await this.highlightSearchResults(query);

		this.emit(EVENTS.SEARCH_RESULT, {
			query,
			results: this.searchResults,
			currentIndex: this.currentSearchIndex
		});

		if (this.searchResults.length > 0) {
			await this.goto(this.searchResults[0]?.page || 1);
		}

		return this.searchResults;
	}

	async highlightSearchResults(query: string): Promise<void> {
		this.clearSearchHighlights();

		if (this.searchResults.length === 0 || !query) return;

		// Highlight in all pages
		for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
			const pageResults = this.searchResults.filter((result) => result.page === pageNum);
			if (pageResults.length > 0) {
				await this.highlightPageSearchResults(pageNum, pageResults, query);
			}
		}
	}

	async highlightPageSearchResults(
		pageNum: number,
		results: SearchResult[],
		query: string
	): Promise<void> {
		const pageElement = this.pageElements[pageNum - 1];
		if (!pageElement) return;

		const textLayer = pageElement.querySelector(".buka-pdf-page-text-layer");
		if (!textLayer) return;

		// Find all text spans in this page's text layer
		const textSpans = textLayer.querySelectorAll("span[data-text-index]");

		results.forEach((result: any) => {
			if (result.textItem && result.itemIndex !== undefined) {
				// Find the corresponding span element
				const span = textLayer.querySelector(
					`span[data-text-index="${result.itemIndex}"]`
				) as HTMLElement;
				if (span && span.textContent) {
					// Create highlight overlay
					const highlight = document.createElement("div");
					highlight.className = "buka-search-highlight";
					highlight.style.cssText = `
						position: absolute;
						background: rgba(255, 255, 0, 0.4);
						border: 1px solid rgba(255, 165, 0, 0.8);
						pointer-events: none;
						z-index: 15;
						border-radius: 2px;
					`;

					// Copy span's position and size
					const spanStyle = window.getComputedStyle(span);
					highlight.style.left = spanStyle.left;
					highlight.style.top = spanStyle.top;
					highlight.style.fontSize = spanStyle.fontSize;
					highlight.style.transform = spanStyle.transform;

					// Calculate highlight width based on matched text
					const canvas = document.createElement("canvas");
					const ctx = canvas.getContext("2d");
					if (ctx) {
						ctx.font = spanStyle.fontSize + " " + spanStyle.fontFamily;
						const textWidth = ctx.measureText(result.match).width;
						highlight.style.width = `${textWidth}px`;
					} else {
						// Fallback: estimate width
						highlight.style.width = `${result.match.length * 0.6}em`;
					}
					highlight.style.height = spanStyle.fontSize;

					textLayer.appendChild(highlight);
				}
			}
		});
	}

	clearSearchHighlights(): void {
		// Clear highlights from all pages
		this.pageElements.forEach((pageElement) => {
			const highlights = pageElement.querySelectorAll(".buka-search-highlight");
			highlights.forEach((highlight) => highlight.remove());
		});
	}

	async getDocumentTitle(): Promise<string> {
		if (!this.pdfDocument) return "Untitled";

		try {
			const metadata = await this.pdfDocument.getMetadata();
			return metadata.info?.Title || "Untitled PDF";
		} catch {
			return "Untitled PDF";
		}
	}

	override addAnnotation(annotation: Omit<Annotation, "id" | "page" | "timestamp">) {
		const id = super.addAnnotation(annotation);
		this.renderAnnotation(this.annotations.get(id));
		return id;
	}

	renderAnnotation(annotation: any): void {
		if (annotation.page !== this.currentPage) return;

		const annotationElement = document.createElement("div");
		annotationElement.className = "buka-annotation";
		annotationElement.dataset.annotationId = annotation.id;

		annotationElement.style.cssText = `
      position: absolute;
      pointer-events: auto;
      cursor: pointer;
    `;

		switch (annotation.type) {
			case "highlight":
				annotationElement.style.cssText += `
          background: rgba(255, 255, 0, 0.4);
          border: 1px solid rgba(255, 165, 0, 0.6);
        `;
				break;
			case "note":
				annotationElement.innerHTML = "📝";
				annotationElement.style.cssText += `
          width: 20px;
          height: 20px;
          background: #ffeb3b;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        `;
				annotationElement.title = annotation.content || "";
				break;
		}

		if (annotation.position) {
			const viewport = this.currentPageObject.getViewport({ scale: this.zoomFactor });
			annotationElement.style.left = `${viewport.width * annotation.position.x}px`;
			annotationElement.style.top = `${viewport.height * annotation.position.y}px`;
			annotationElement.style.width = `${
				viewport.width * (annotation.position.width || 0.1)
			}px`;
			annotationElement.style.height = `${
				viewport.height * (annotation.position.height || 0.05)
			}px`;
		}

		this.textLayer?.appendChild(annotationElement);
	}

	async cleanup(): Promise<void> {
		// Clear search highlights
		this.clearSearchHighlights();

		// Clear document content
		if (this.documentWrapper) {
			this.documentWrapper.innerHTML = "";
		}

		// Clear page elements array
		this.pageElements = [];

		// Remove scroll listener
		if (this.scrollContainer && this.scrollHandler) {
			this.scrollContainer.removeEventListener("scroll", this.scrollHandler);
			this.scrollHandler = null;
		}

		// Destroy previous PDF document
		if (this.pdfDocument) {
			try {
				this.pdfDocument.destroy();
			} catch (error) {
				console.warn("Error destroying PDF document:", error);
			}
		}

		// Reset state
		this.searchResults = [];
		this.currentSearchIndex = 0;
		this.pdfDocument = null;
		this.currentPageObject = null;
		this.currentPage = 1;
		this.totalPages = 1;
	}

	override destroy(): void {
		super.destroy();

		// Use the cleanup method
		this.cleanup();
	}
}

RendererFactory.register(SUPPORTED_FORMATS.PDF, PDFRenderer);

export default PDFRenderer;
