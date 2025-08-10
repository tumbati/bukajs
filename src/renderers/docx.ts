import { BaseRenderer, EVENTS, RendererFactory, SUPPORTED_FORMATS } from "../core";
import type { SearchResult } from "../types";

/**
 * DOCX Renderer using Mammoth.js
 * Handles DOCX documents by converting to HTML for display
 */
export class DocxRenderer extends BaseRenderer {
	public mammothLib: any;
	public documentHtml: string;
	public documentContainer: HTMLElement;
	public searchableText: string;
	public searchResults: SearchResult[];
	public currentSearchIndex: number;

	constructor(container: HTMLElement, options = {}) {
		super(container, options);

		this.mammothLib = null;
		this.documentHtml = "";
		this.documentContainer = null;
		this.searchableText = "";
		this.searchResults = [];
		this.currentSearchIndex = 0;

		this.totalPages = 1;
		this.currentPage = 1;

		this.setupDocumentContainer();
	}

	setupDocumentContainer(): void {
		this.documentContainer = document.createElement("div");
		this.documentContainer.className = "buka-docx-container";
		this.documentContainer.style.cssText = `
      position: relative;
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      background-color: white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
      font-family: 'Times New Roman', Times, serif;
      line-height: 1.6;
      color: #333;
    `;

		this.contentWrapper = document.createElement("div");
		this.contentWrapper.className = "buka-docx-content";
		this.contentWrapper.style.cssText = `
      padding: 72px 72px; /* ~1 inch margins like Word */
      min-height: 500px;
      background: white;
    `;

		this.documentContainer.appendChild(this.contentWrapper);
		this.container.appendChild(this.documentContainer);
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

			await this.render();

			this.emit(EVENTS.DOCUMENT_LOADED, {
				totalPages: this.totalPages,
				title: this.getDocumentTitle(source),
				wordCount: this.getWordCount(),
				warnings: result.messages
			});
		} catch (error) {
			console.error("DOCX loading failed:", error);
			throw new Error(`Failed to load DOCX: ${error.message}`);
		}
	}

	async loadMammoth(): Promise<any> {
		if (typeof mammoth !== "undefined") {
			return mammoth;
		}

		try {
			const mammothModule = await import("mammoth");
			return mammothModule.default || mammothModule;
		} catch (error) {
			console.log("Loading mammoth.js from CDN...");

			const script = document.createElement("script");
			script.src = "https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js";
			document.head.appendChild(script);

			return new Promise((resolve, reject) => {
				script.onload = () => {
					if (window.mammoth) {
						resolve(window.mammoth);
					} else {
						reject(new Error("Failed to load mammoth.js"));
					}
				};
				script.onerror = () => reject(new Error("Failed to load mammoth.js from CDN"));
			});
		}
	}

	transformDocument(document) {
		return document;
	}

	async render(): Promise<void> {
		if (!this.documentHtml) return;

		const styledHtml = this.applyDocumentStyles(this.documentHtml);
		this.contentWrapper.innerHTML = styledHtml;

		this.postProcessContent();
	}

	applyDocumentStyles(html) {
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

	postProcessContent() {
		const links = this.contentWrapper.querySelectorAll("a[href]");
		links.forEach((link) => {
			link.target = "_blank";
			link.rel = "noopener noreferrer";
		});

		const images = this.contentWrapper.querySelectorAll("img");
		images.forEach((img) => {
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
				img.parentNode.insertBefore(placeholder, img.nextSibling);
			});
		});

		this.setupInternalNavigation();
	}

	setupInternalNavigation() {
		const headings = this.contentWrapper.querySelectorAll("h1, h2, h3, h4, h5, h6");
		headings.forEach((heading, index) => {
			if (!heading.id) {
				heading.id = `heading-${index}`;
			}

			heading.style.cursor = "pointer";
			heading.addEventListener("click", () => {
				const url = `${window.location.href.split("#")[0]}#${heading.id}`;
				if (navigator.clipboard) {
					navigator.clipboard.writeText(url);
				}
			});
		});
	}

	async zoom(factor: number): Promise<void> {
		this.zoom = Math.max(0.5, Math.min(3.0, factor));

		const percentage = Math.round(this.zoom * 100);
		this.contentWrapper.style.fontSize = `${percentage}%`;

		this.emit(EVENTS.ZOOM_CHANGED, { zoom: this.zoom });
	}

	async goto(page: number): Promise<boolean> {
		if (page === 1) {
			this.contentWrapper.scrollTop = 0;
			this.emit(EVENTS.PAGE_CHANGED, { page: 1, totalPages: 1 });
			return true;
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

	highlightSearchMatches(query) {
		const walker = document.createTreeWalker(
			this.contentWrapper,
			NodeFilter.SHOW_TEXT,
			null,
			false
		);

		const textNodes = [];
		let node;
		while ((node = walker.nextNode())) {
			textNodes.push(node);
		}

		const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");

		textNodes.forEach((textNode) => {
			const text = textNode.textContent;
			if (regex.test(text)) {
				const highlightedText = text.replace(
					regex,
					'<mark class="buka-search-highlight">$1</mark>'
				);

				const wrapper = document.createElement("div");
				wrapper.innerHTML = highlightedText;

				const fragment = document.createDocumentFragment();
				while (wrapper.firstChild) {
					fragment.appendChild(wrapper.firstChild);
				}

				textNode.parentNode.replaceChild(fragment, textNode);
			}
		});
	}

	clearSearchHighlights() {
		const highlights = this.contentWrapper.querySelectorAll(".buka-search-highlight");
		highlights.forEach((highlight) => {
			const text = highlight.textContent;
			highlight.parentNode.replaceChild(document.createTextNode(text), highlight);
		});

		this.contentWrapper.normalize();
	}

	scrollToCurrentMatch() {
		const highlights = this.contentWrapper.querySelectorAll(".buka-search-highlight");
		if (highlights[this.currentSearchIndex]) {
			highlights[this.currentSearchIndex].scrollIntoView({
				behavior: "smooth",
				block: "center"
			});

			highlights[this.currentSearchIndex].style.backgroundColor = "#ff6b6b";
			setTimeout(() => {
				highlights[this.currentSearchIndex].style.backgroundColor = "";
			}, 1000);
		}
	}

	getSearchContext(index, length) {
		const contextLength = 50;
		const start = Math.max(0, index - contextLength);
		const end = Math.min(this.searchableText.length, index + length + contextLength);

		return {
			before: this.searchableText.substring(start, index),
			match: this.searchableText.substring(index, index + length),
			after: this.searchableText.substring(index + length, end)
		};
	}

	extractText(html) {
		const temp = document.createElement("div");
		temp.innerHTML = html;
		return temp.textContent || temp.innerText || "";
	}

	getDocumentTitle(source) {
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

	getWordCount() {
		return this.searchableText.split(/\s+/).filter((word) => word.length > 0).length;
	}

	nextSearchResult() {
		if (this.searchResults.length > 0) {
			this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchResults.length;
			this.scrollToCurrentMatch();
		}
	}

	previousSearchResult() {
		if (this.searchResults.length > 0) {
			this.currentSearchIndex =
				(this.currentSearchIndex - 1 + this.searchResults.length) %
				this.searchResults.length;
			this.scrollToCurrentMatch();
		}
	}

	getOutline() {
		const headings = this.contentWrapper.querySelectorAll("h1, h2, h3, h4, h5, h6");
		return Array.from(headings).map((heading, index) => ({
			id: heading.id || `heading-${index}`,
			text: heading.textContent,
			level: parseInt(heading.tagName.charAt(1)),
			element: heading
		}));
	}

	navigateToHeading(headingId) {
		const heading = this.contentWrapper.querySelector(`#${headingId}`);
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

	destroy() {
		super.destroy();

		this.clearSearchHighlights();

		this.documentHtml = "";
		this.searchableText = "";
		this.searchResults = [];
		this.documentContainer = null;
		this.contentWrapper = null;
	}
}

RendererFactory.register(SUPPORTED_FORMATS.DOCX, DocxRenderer);

export default DocxRenderer;
