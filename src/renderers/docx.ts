import { BaseRenderer, EVENTS, RendererFactory, SUPPORTED_FORMATS } from "../core";
import type { SearchResult } from "../types";

/**
 * DOCX Renderer using Mammoth.js
 * Handles DOCX documents by converting to HTML for display
 */
export class DocxRenderer extends BaseRenderer {
	public mammothLib: any;
	public documentHtml: string;
	public documentContainer: HTMLElement | null;
	public contentWrapper: HTMLElement | null;
	public scrollContainer: HTMLElement | null;
	public pageElements: HTMLElement[];
	public searchableText: string;
	public override searchResults: SearchResult[];
	public override currentSearchIndex: number;
	private scrollHandler: (() => void) | null;

	constructor(container: HTMLElement, options = {}) {
		super(container, options);

		this.mammothLib = null;
		this.documentHtml = "";
		this.documentContainer = null;
		this.contentWrapper = null;
		this.scrollContainer = null;
		this.pageElements = [];
		this.searchableText = "";
		this.searchResults = [];
		this.currentSearchIndex = 0;
		this.scrollHandler = null;

		this.totalPages = 1;
		this.currentPage = 1;

		this.setupDocumentContainer();
	}

	setupDocumentContainer(): void {
		// Create scrollable container for continuous viewing
		this.scrollContainer = document.createElement("div");
		this.scrollContainer.className = "buka-docx-scroll-container";
		this.scrollContainer.style.cssText = `
			width: 100%;
			height: 100%;
			overflow: auto;
			position: relative;
			background: #f0f0f0;
		`;

		// Create document wrapper for all pages
		this.documentContainer = document.createElement("div");
		this.documentContainer.className = "buka-docx-document-wrapper";
		this.documentContainer.style.cssText = `
			display: flex;
			flex-direction: column;
			align-items: center;
			padding: 20px;
			gap: 20px;
		`;

		this.scrollContainer.appendChild(this.documentContainer);
		this.container.appendChild(this.scrollContainer);
	}

	async load(source: string | File | Blob): Promise<void> {
		try {
			this.mammothLib = await this.loadMammoth();

			let arrayBuffer;

			if (typeof source === "string") {
				const response = await fetch(source);
				if (!response.ok) {
					throw new Error(`Failed to fetch DOCX: ${response.statusText}`);
				}
				arrayBuffer = await response.arrayBuffer();
			} else if (source instanceof File || source instanceof Blob) {
				arrayBuffer = await source.arrayBuffer();
			} else {
				throw new Error("Unsupported source type");
			}

			const result = await this.mammothLib.convertToHtml(
				{ arrayBuffer },
				{
					styleMap: [
						"p[style-name='Heading 1'] => h1:fresh",
						"p[style-name='Heading 2'] => h2:fresh",
						"p[style-name='Heading 3'] => h3:fresh",
						"p[style-name='Heading 4'] => h4:fresh",
						"p[style-name='Heading 5'] => h5:fresh",
						"p[style-name='Heading 6'] => h6:fresh",
						"p[style-name='Title'] => h1.title:fresh",
						"p[style-name='Subtitle'] => h2.subtitle:fresh",
						"r[style-name='Strong'] => strong",
						"r[style-name='Emphasis'] => em",
						"p[style-name='List Paragraph'] => p.list-paragraph",
						"p[style-name='Quote'] => blockquote > p:fresh",
						"p[style-name='Code'] => pre"
					],

					transformDocument: this.transformDocument.bind(this),

					includeEmbeddedStyleMap: true,

					convertImage: this.mammothLib.images.dataUri
				}
			);

			this.documentHtml = result.value;
			this.searchableText = this.extractText(this.documentHtml);

			if (result.messages.length > 0) {
				console.log("DOCX conversion messages:", result.messages);
			}

			// Parse and paginate the document
			await this.paginateDocument();
			await this.renderAllPages();

			this.emit(EVENTS.DOCUMENT_LOADED, {
				totalPages: this.totalPages,
				title: this.getDocumentTitle(source),
				wordCount: this.getWordCount(),
				warnings: result.messages
			});
		} catch (error: any) {
			console.error("DOCX loading failed:", error);
			throw new Error(`Failed to load DOCX: ${error.message}`);
		}
	}

	async loadMammoth(): Promise<any> {
		if (typeof (window as any).mammoth !== "undefined") {
			return (window as any).mammoth;
		}

		try {
			const mammothModule = await import("mammoth");
			return mammothModule.default || mammothModule;
		} catch (error) {
			const script = document.createElement("script");
			script.src = "https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js";
			document.head.appendChild(script);

			return new Promise((resolve, reject) => {
				script.onload = () => {
					if ((window as any).mammoth) {
						resolve((window as any).mammoth);
					} else {
						reject(new Error("Failed to load mammoth.js"));
					}
				};
				script.onerror = () => reject(new Error("Failed to load mammoth.js from CDN"));
			});
		}
	}

	transformDocument(document: any): any {
		return document;
	}

	async paginateDocument(): Promise<void> {
		if (!this.documentHtml) return;
		let pages = this.splitByPageBreaks(this.documentHtml);

		if (pages.length === 1) {
			const shouldPaginate = this.shouldPaginateDocument(this.documentHtml);
			if (shouldPaginate) {
				pages = this.intelligentSplit(this.documentHtml);
			}

			if (pages.length <= 1) {
				pages = [this.documentHtml];
			}
		}

		this.totalPages = Math.max(1, pages.length);
		this.pageElements = [];

		for (let i = 0; i < pages.length; i++) {
			const pageElement = this.createPageElement(pages[i] || "", i + 1);
			this.pageElements.push(pageElement);
		}
	}

	splitByPageBreaks(html: string): string[] {
		// Look for explicit page break indicators from Word/Mammoth conversion
		const pageBreakPatterns = [
			// Word-style page breaks
			/<w:br\s+w:type=["']page["'][^>]*>/gi,
			/<br[^>]*style=["'][^"']*page-break[^"']*["'][^>]*>/gi,
			// CSS page breaks
			/<div[^>]*style=["'][^"']*page-break-before:\s*always[^"']*["'][^>]*>/gi,
			/<div[^>]*style=["'][^"']*page-break-after:\s*always[^"']*["'][^>]*>/gi,
			/<p[^>]*style=["'][^"']*page-break-before:\s*always[^"']*["'][^>]*>/gi,
			// Mammoth.js page break indicators
			/<hr[^>]*data-page-break[^>]*>/gi,
			/<!-- page-break -->/gi
		];

		let content = html;
		let hasPageBreaks = false;

		const PAGE_BREAK_MARKER = "|||PAGE_BREAK|||";
		pageBreakPatterns.forEach((pattern) => {
			if (pattern.test(content)) {
				hasPageBreaks = true;
				content = content.replace(pattern, PAGE_BREAK_MARKER);
			}
		});

		if (!hasPageBreaks) {
			return [html];
		}

		const pages = content
			.split(PAGE_BREAK_MARKER)
			.map((page) => page.trim())
			.filter((page) => page.length > 50);

		if (pages.length > 10) {
			return [html];
		}

		return pages.length > 1 ? pages : [html];
	}

	shouldPaginateDocument(html: string): boolean {
		const text = this.extractText(html);
		const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length;

		return wordCount > 600;
	}

	intelligentSplit(html: string): string[] {
		const strategies = [this.splitByMajorSections(html), this.splitByContentLength(html)];

		// Find the best strategy (not too many, not too few pages)
		for (const pages of strategies) {
			if (pages.length >= 2 && pages.length <= 6) {
				return pages;
			}
		}

		// If no good strategy found, don't split
		return [html];
	}

	splitByMajorSections(html: string): string[] {
		// Only split by H1 headings or major structural elements
		const h1Pattern = /<h1[^>]*>/gi;
		const matches = [...html.matchAll(h1Pattern)];

		// If no H1s or too many H1s, don't split
		if (matches.length === 0 || matches.length > 5) {
			return [html];
		}

		const pages: string[] = [];
		let lastIndex = 0;

		for (let i = 0; i < matches.length; i++) {
			const match = matches[i];
			const currentIndex = match?.index ?? 0;

			if (i === 0 && currentIndex > 0) {
				// Content before first H1
				pages.push(html.substring(0, currentIndex));
			}

			if (i > 0) {
				// Content from previous H1 to current H1
				pages.push(html.substring(lastIndex, currentIndex));
			}

			lastIndex = currentIndex;
		}

		// Add remaining content
		if (lastIndex < html.length) {
			pages.push(html.substring(lastIndex));
		}

		// Filter out very short pages
		return pages.filter((page) => this.extractText(page).split(/\s+/).length > 50);
	}

	splitByContentLength(html: string): string[] {
		// Conservative content-based splitting
		const text = this.extractText(html);
		const wordCount = text.split(/\s+/).length;
		const wordsPerPage = 450; // More realistic estimate
		const targetPages = Math.max(1, Math.ceil(wordCount / wordsPerPage));

		// Don't create more than 4 pages through content splitting
		if (targetPages > 4) {
			return [html];
		}

		// Split by paragraphs to maintain readability
		const paragraphs = html.split(/<\/p>/gi);
		if (paragraphs.length < targetPages) {
			return [html];
		}

		const chunkSize = Math.ceil(paragraphs.length / targetPages);
		const pages: string[] = [];

		for (let i = 0; i < paragraphs.length; i += chunkSize) {
			const chunk =
				paragraphs.slice(i, i + chunkSize).join("</p>") +
				(i + chunkSize < paragraphs.length ? "</p>" : "");
			if (chunk.trim()) {
				pages.push(chunk.trim());
			}
		}

		return pages.length > 1 ? pages : [html];
	}

	createPageElement(content: string, pageNumber: number): HTMLElement {
		const pageContainer = document.createElement("div");
		pageContainer.className = "buka-docx-page-container";
		pageContainer.dataset.pageNumber = pageNumber.toString();
		pageContainer.style.cssText = `
			position: relative;
			width: 800px;
			max-width: 90vw;
			min-height: 1100px;
			background-color: white;
			box-shadow: 0 4px 8px rgba(0,0,0,0.1);
			border-radius: 8px;
			margin-bottom: 20px;
			padding: 72px;
			font-family: 'Times New Roman', Times, serif;
			line-height: 1.6;
			color: #333;
			overflow: hidden;
		`;

		// Add page content
		const styledContent = this.applyDocumentStyles(content);
		pageContainer.innerHTML = styledContent;

		// Add page number
		const pageNumberEl = document.createElement("div");
		pageNumberEl.className = "buka-docx-page-number";
		pageNumberEl.style.cssText = `
			position: absolute;
			bottom: 20px;
			right: 30px;
			font-size: 12px;
			color: #666;
			font-family: Arial, sans-serif;
		`;
		pageNumberEl.textContent = `Page ${pageNumber}`;
		pageContainer.appendChild(pageNumberEl);

		return pageContainer;
	}

	async renderAllPages(): Promise<void> {
		if (!this.documentContainer) return;

		// Clear existing content
		this.documentContainer.innerHTML = "";

		// Add all pages to the document
		this.pageElements.forEach((pageElement) => {
			this.documentContainer!.appendChild(pageElement);
		});

		// Set up scroll listener to track current page
		if (this.scrollContainer && !this.scrollHandler) {
			this.scrollHandler = this.handleScroll.bind(this);
			this.scrollContainer.addEventListener("scroll", this.scrollHandler);
		}

		// Process all page content
		this.postProcessContent();
	}

	handleScroll(): void {
		if (!this.scrollContainer) return;

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
		// Re-render all pages if needed
		await this.renderAllPages();
	}

	applyDocumentStyles(html: string): string {
		const styledHtml = `
      <style>
        .buka-docx-content h1 { 
          font-size: 24px; 
          font-weight: bold; 
          margin: 24px 0 12px 0; 
          color: #1f1f1f;
          page-break-after: avoid;
        }
        .buka-docx-content h2 { 
          font-size: 20px; 
          font-weight: bold; 
          margin: 18px 0 10px 0; 
          color: #1f1f1f;
          page-break-after: avoid;
        }
        .buka-docx-content h3 { 
          font-size: 16px; 
          font-weight: bold; 
          margin: 16px 0 8px 0; 
          color: #1f1f1f;
        }
        .buka-docx-content h4, 
        .buka-docx-content h5, 
        .buka-docx-content h6 { 
          font-size: 14px; 
          font-weight: bold; 
          margin: 14px 0 6px 0; 
          color: #1f1f1f;
        }
        .buka-docx-content p { 
          margin: 0 0 12px 0; 
          text-align: justify;
          text-indent: 0;
        }
        .buka-docx-content p:first-child {
          margin-top: 0;
        }
        .buka-docx-content p:last-child {
          margin-bottom: 0;
        }
        .buka-docx-content ul, 
        .buka-docx-content ol { 
          margin: 12px 0; 
          padding-left: 40px; 
        }
        .buka-docx-content li { 
          margin: 6px 0; 
        }
        .buka-docx-content table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 12px 0; 
        }
        .buka-docx-content td, 
        .buka-docx-content th { 
          border: 1px solid #ccc; 
          padding: 8px; 
          text-align: left; 
        }
        .buka-docx-content th { 
          background-color: #f5f5f5; 
          font-weight: bold; 
        }
        .buka-docx-content blockquote { 
          margin: 12px 0; 
          padding: 12px 20px; 
          border-left: 4px solid #ddd; 
          background-color: #f9f9f9; 
          font-style: italic; 
        }
        .buka-docx-content pre { 
          background-color: #f5f5f5; 
          padding: 12px; 
          border-radius: 4px; 
          font-family: 'Courier New', monospace; 
          margin: 12px 0; 
          overflow-x: auto; 
        }
        .buka-docx-content img { 
          max-width: 100%; 
          height: auto; 
          margin: 12px 0; 
          border-radius: 4px; 
        }
        .buka-docx-content a { 
          color: #0066cc; 
          text-decoration: underline; 
        }
        .buka-docx-content a:hover { 
          color: #004499; 
        }
        .buka-docx-content strong { 
          font-weight: bold; 
        }
        .buka-docx-content em { 
          font-style: italic; 
        }
        .buka-docx-content .title {
          text-align: center;
          font-size: 28px;
          margin: 0 0 24px 0;
        }
        .buka-docx-content .subtitle {
          text-align: center;
          font-size: 20px;
          color: #666;
          margin: 0 0 24px 0;
          font-weight: normal;
        }
        .buka-docx-content .list-paragraph {
          margin-left: 20px;
        }
      </style>
      ${html}
    `;

		return styledHtml;
	}

	postProcessContent(): void {
		if (!this.documentContainer) return;
		const links = this.documentContainer.querySelectorAll("a[href]");
		links.forEach((link) => {
			(link as HTMLAnchorElement).target = "_blank";
			(link as HTMLAnchorElement).rel = "noopener noreferrer";
		});

		const images = this.documentContainer.querySelectorAll("img");
		images.forEach((img: HTMLImageElement) => {
			img.addEventListener("error", () => {
				img.style.display = "none";

				const placeholder = document.createElement("div");
				placeholder.style.cssText = `
          width: 200px;
          height: 100px;
          background-color: #f0f0f0;
          border: 1px dashed #ccc;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          font-size: 12px;
          margin: 12px 0;
        `;
				placeholder.textContent = "Image not available";
				img.parentNode?.insertBefore(placeholder, img.nextSibling);
			});
		});

		this.setupInternalNavigation();
	}

	setupInternalNavigation(): void {
		if (!this.documentContainer) return;
		const headings = this.documentContainer.querySelectorAll("h1, h2, h3, h4, h5, h6");
		headings.forEach((heading, index) => {
			if (!heading.id) {
				heading.id = `heading-${index}`;
			}

			(heading as HTMLElement).style.cursor = "pointer";
			heading.addEventListener("click", () => {
				const url = `${window.location.href.split("#")[0]}#${heading.id}`;
				if (navigator.clipboard) {
					navigator.clipboard.writeText(url);
				}
			});
		});
	}

	override async setZoom(factor: number): Promise<void> {
		this.zoomFactor = Math.max(0.5, Math.min(3.0, factor));

		// Apply zoom to all page elements
		const percentage = Math.round(this.zoomFactor * 100);
		this.pageElements.forEach((pageElement) => {
			pageElement.style.fontSize = `${percentage}%`;
			// Also scale the page container
			const scale = this.zoomFactor;
			pageElement.style.transform = `scale(${scale})`;
			pageElement.style.transformOrigin = "top center";
			// Adjust margins to prevent overlap
			pageElement.style.marginBottom = `${20 * scale}px`;
		});

		this.emit(EVENTS.ZOOM_CHANGED, { zoom: this.zoomFactor });
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

	async search(query: string): Promise<SearchResult[]> {
		if (!query.trim()) {
			this.searchResults = [];
			this.currentSearchIndex = 0;
			this.clearSearchHighlights();
			return [];
		}

		this.clearSearchHighlights();
		this.searchResults = [];

		const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
		let match;

		while ((match = regex.exec(this.searchableText)) !== null) {
			this.searchResults.push({
				match: match[0],
				text: match[0],
				index: match.index,
				length: match[0].length,
				context: this.getSearchContext(match.index, match[0].length)
			});
		}

		if (this.searchResults.length > 0) {
			this.highlightSearchMatches(query);
			this.currentSearchIndex = 0;
			this.scrollToCurrentMatch();
		}

		this.emit(EVENTS.SEARCH_RESULT, {
			query,
			results: this.searchResults,
			currentIndex: this.currentSearchIndex
		});

		return this.searchResults;
	}

	highlightSearchMatches(query: string): void {
		if (!this.documentContainer) return;

		// Highlight matches in all pages
		this.pageElements.forEach((pageElement) => {
			const walker = document.createTreeWalker(pageElement, NodeFilter.SHOW_TEXT, null);

			const textNodes: Node[] = [];
			let node;
			while ((node = walker.nextNode())) {
				textNodes.push(node);
			}

			const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");

			textNodes.forEach((textNode) => {
				const text = textNode.textContent;
				if (text && regex.test(text)) {
					const highlightedText = text.replace(
						regex,
						`
							<mark class="buka-search-highlight">$1</mark>
						`
					);

					const wrapper = document.createElement("div");
					wrapper.innerHTML = highlightedText;

					const fragment = document.createDocumentFragment();
					while (wrapper.firstChild) {
						fragment.appendChild(wrapper.firstChild);
					}

					textNode.parentNode?.replaceChild(fragment, textNode);
				}
			});
		});
	}

	clearSearchHighlights(): void {
		if (!this.documentContainer) return;
		const highlights = this.documentContainer.querySelectorAll(".buka-search-highlight");
		highlights.forEach((highlight: Element) => {
			const text = highlight.textContent;
			highlight.parentNode?.replaceChild(document.createTextNode(text || ""), highlight);
		});

		// Normalize all page elements
		this.pageElements.forEach((pageElement) => {
			pageElement.normalize();
		});
	}

	scrollToCurrentMatch(): void {
		if (!this.documentContainer) return;
		const highlights = this.documentContainer.querySelectorAll(".buka-search-highlight");
		if (highlights[this.currentSearchIndex]) {
			highlights[this.currentSearchIndex]?.scrollIntoView({
				behavior: "smooth",
				block: "center"
			});

			(highlights[this.currentSearchIndex] as HTMLElement).style.backgroundColor = "#ff6b6b";
			setTimeout(() => {
				(highlights[this.currentSearchIndex] as HTMLElement).style.backgroundColor = "";
			}, 1000);
		}
	}

	getSearchContext(index: number, length: number): any {
		const contextLength = 50;
		const start = Math.max(0, index - contextLength);
		const end = Math.min(this.searchableText.length, index + length + contextLength);

		return {
			before: this.searchableText.substring(start, index),
			match: this.searchableText.substring(index, index + length),
			after: this.searchableText.substring(index + length, end)
		};
	}

	extractText(html: string): string {
		const temp = document.createElement("div");
		temp.innerHTML = html;
		return temp.textContent || temp.innerText || "";
	}

	getDocumentTitle(source: string | File | Blob): string {
		if (typeof source === "string") {
			return (
				source
					.split("/")
					.pop()
					?.replace(/\.[^/.]+$/, "") || "Document"
			);
		} else if (source instanceof File) {
			return source.name.replace(/\.[^/.]+$/, "");
		}
		return "DOCX Document";
	}

	getWordCount(): number {
		return this.searchableText.split(/\s+/).filter((word) => word.length > 0).length;
	}

	nextSearchResult(): void {
		if (this.searchResults.length > 0) {
			this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchResults.length;
			this.scrollToCurrentMatch();
		}
	}

	previousSearchResult(): void {
		if (this.searchResults.length > 0) {
			this.currentSearchIndex =
				(this.currentSearchIndex - 1 + this.searchResults.length) %
				this.searchResults.length;
			this.scrollToCurrentMatch();
		}
	}

	getOutline(): any[] {
		if (!this.documentContainer) return [];
		const headings = this.documentContainer.querySelectorAll("h1, h2, h3, h4, h5, h6");
		return Array.from(headings).map((heading, index) => ({
			id: heading.id || `heading-${index}`,
			text: heading.textContent,
			level: parseInt(heading.tagName.charAt(1)),
			element: heading
		}));
	}

	navigateToHeading(headingId: string): boolean {
		if (!this.documentContainer) return false;
		const heading = this.documentContainer.querySelector(`#${headingId}`) as HTMLElement;
		if (heading) {
			heading.scrollIntoView({ behavior: "smooth", block: "start" });

			const originalBg = heading.style.backgroundColor;
			heading.style.backgroundColor = "#fff3cd";
			setTimeout(() => {
				heading.style.backgroundColor = originalBg;
			}, 1000);

			return true;
		}
		return false;
	}

	override destroy(): void {
		super.destroy();

		this.clearSearchHighlights();

		// Remove scroll listener
		if (this.scrollContainer && this.scrollHandler) {
			this.scrollContainer.removeEventListener("scroll", this.scrollHandler);
			this.scrollHandler = null;
		}

		this.documentHtml = "";
		this.searchableText = "";
		this.searchResults = [];
		this.pageElements = [];
		this.documentContainer = null;
		this.contentWrapper = null;
		this.scrollContainer = null;
	}
}

RendererFactory.register(SUPPORTED_FORMATS.DOCX, DocxRenderer);

export default DocxRenderer;
