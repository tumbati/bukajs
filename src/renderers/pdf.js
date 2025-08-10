import { BaseRenderer, EVENTS, RendererFactory, SUPPORTED_FORMATS } from "../core/index.js";

/**
 * PDF Renderer using PDF.js
 * Handles PDF documents with canvas rendering and text layer
 */
export class PDFRenderer extends BaseRenderer {
	constructor(container, options = {}) {
		super(container, options);
		this.pdfDocument = null;
		this.currentPageObject = null;
		this.canvas = null;
		this.context = null;
		this.textLayer = null;
		this.searchResults = [];
		this.currentSearchIndex = 0;
		this.zoom = 1.0;
		this.setupCanvas();
	}

	setupCanvas() {
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

		this.container.style.position = "relative";
		this.container.appendChild(this.canvas);
		this.container.appendChild(this.textLayer);
	}

	async load(source) {
		try {
			const pdfjsLib = await this.loadPDFJS();

			let typedArray;

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

			await this.loadPage(1);

			this.emit(EVENTS.DOCUMENT_LOADED, {
				totalPages: this.totalPages,
				title: await this.getDocumentTitle()
			});
		} catch (error) {
			console.error("PDF loading failed:", error);
			throw new Error(`Failed to load PDF: ${error.message}`);
		}
	}

	async loadPDFJS() {
		if (typeof pdfjsLib !== "undefined") {
			return pdfjsLib;
		}

		const script = document.createElement("script");
		script.src = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
		document.head.appendChild(script);

		return new Promise((resolve, reject) => {
			script.onload = () => resolve(window.pdfjsLib);
			script.onerror = () => reject(new Error("Failed to load PDF.js"));
		});
	}

	async loadPage(pageNumber) {
		if (!this.pdfDocument || pageNumber < 1 || pageNumber > this.totalPages) {
			return;
		}

		this.currentPage = pageNumber;
		this.currentPageObject = await this.pdfDocument.getPage(pageNumber);

		await this.render();
	}

	async render() {
		if (!this.currentPageObject) return;

		const viewport = this.currentPageObject.getViewport({ scale: this.zoom });

		this.canvas.width = viewport.width;
		this.canvas.height = viewport.height;
		this.canvas.style.width = `${viewport.width}px`;
		this.canvas.style.height = `${viewport.height}px`;

		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

		const renderContext = {
			canvasContext: this.context,
			viewport: viewport
		};

		await this.currentPageObject.render(renderContext).promise;

		await this.renderTextLayer(viewport);
	}

	async renderTextLayer(viewport) {
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

			textItems.forEach((item, index) => {
				const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
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
				span.dataset.textIndex = index;

				textDiv.appendChild(span);
			});

			this.textLayer.appendChild(textDiv);
		} catch (error) {
			console.warn("Text layer rendering failed:", error);
		}
	}

	updateZoomDisplay() {
		const zoomLevelEl = this.container.querySelector("#zoomLevel");
		if (this.currentRenderer && zoomLevelEl) {
			zoomLevelEl.textContent = `${Math.round(this.currentRenderer.zoom * 100)}%`;
		}
	}

	async goto(page) {
		if (page === this.currentPage) return true;

		if (page >= 1 && page <= this.totalPages) {
			await this.loadPage(page);
			this.emit(EVENTS.PAGE_CHANGED, {
				page: this.currentPage,
				totalPages: this.totalPages
			});
			return true;
		}
		return false;
	}

	async zoom(factor) {
		this.zoom = Math.max(0.1, Math.min(5.0, factor));
		await this.render();
		this.emit(EVENTS.ZOOM_CHANGED, { zoom: this.zoom });
	}

	async search(query) {
		if (!this.pdfDocument || !query.trim()) {
			this.searchResults = [];
			this.currentSearchIndex = 0;
			this.clearSearchHighlights();
			return [];
		}

		this.searchResults = [];
		const searchRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");

		for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
			try {
				const page = await this.pdfDocument.getPage(pageNum);
				const textContent = await page.getTextContent();
				const pageText = textContent.items.map((item) => item.str).join(" ");

				let match;
				while ((match = searchRegex.exec(pageText)) !== null) {
					this.searchResults.push({
						page: pageNum,
						text: match[0],
						index: match.index,
						length: match[0].length
					});
				}
			} catch (error) {
				console.warn(`Search failed on page ${pageNum}:`, error);
			}
		}

		this.currentSearchIndex = 0;
		this.highlightSearchResults();

		this.emit(EVENTS.SEARCH_RESULT, {
			query,
			results: this.searchResults,
			currentIndex: this.currentSearchIndex
		});

		if (this.searchResults.length > 0) {
			await this.goto(this.searchResults[0].page);
		}

		return this.searchResults;
	}

	highlightSearchResults() {
		this.clearSearchHighlights();

		if (this.searchResults.length === 0) return;

		const currentPageResults = this.searchResults.filter(
			(result) => result.page === this.currentPage
		);

		currentPageResults.forEach((result, index) => {
			const highlight = document.createElement("div");
			highlight.className = "buka-search-highlight";
			highlight.style.cssText = `
        position: absolute;
        background: rgba(255, 255, 0, 0.3);
        border: 1px solid rgba(255, 165, 0, 0.8);
        pointer-events: none;
        z-index: 10;
      `;

			highlight.style.left = "10px";
			highlight.style.top = `${20 + index * 30}px`;
			highlight.style.width = "100px";
			highlight.style.height = "20px";

			this.textLayer.appendChild(highlight);
		});
	}

	clearSearchHighlights() {
		const highlights = this.textLayer.querySelectorAll(".buka-search-highlight");
		highlights.forEach((highlight) => highlight.remove());
	}

	async getDocumentTitle() {
		if (!this.pdfDocument) return "Untitled";

		try {
			const metadata = await this.pdfDocument.getMetadata();
			return metadata.info?.Title || "Untitled PDF";
		} catch {
			return "Untitled PDF";
		}
	}

	addAnnotation(annotation) {
		const id = super.addAnnotation(annotation);
		this.renderAnnotation(this.annotations.get(id));
		return id;
	}

	renderAnnotation(annotation) {
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
			const viewport = this.currentPageObject.getViewport({ scale: this.zoom });
			annotationElement.style.left = `${viewport.width * annotation.position.x}px`;
			annotationElement.style.top = `${viewport.height * annotation.position.y}px`;
			annotationElement.style.width = `${
				viewport.width * (annotation.position.width || 0.1)
			}px`;
			annotationElement.style.height = `${
				viewport.height * (annotation.position.height || 0.05)
			}px`;
		}

		this.textLayer.appendChild(annotationElement);
	}

	destroy() {
		super.destroy();

		if (this.pdfDocument) {
			this.pdfDocument.destroy();
		}

		this.searchResults = [];
		this.currentSearchIndex = 0;
		this.pdfDocument = null;
		this.currentPageObject = null;
	}
}

RendererFactory.register(SUPPORTED_FORMATS.PDF, PDFRenderer);

export default PDFRenderer;
