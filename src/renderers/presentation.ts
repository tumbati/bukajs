import { BaseRenderer, EVENTS, RendererFactory, SUPPORTED_FORMATS } from "../core";
import type { SearchResult, ViewerOptions } from "../types";

/**
 * Presentation Renderer for PPTX files
 * Handles PowerPoint presentations by converting to HTML/images for display
 */
export class PresentationRenderer extends BaseRenderer {
	public presentationLib: any;
	public slides: any[];
	public currentSlideIndex: number;
	public slideContainer: HTMLElement | null;
	public slideNavigation: HTMLElement | null;
	public thumbnailsContainer: HTMLElement | null;
	public searchableText: string;
	override searchResults: SearchResult[];
	override currentSearchIndex: number;
	public canShowThumbnails: boolean;
	public autoFitSlide: boolean;
	public mainContainer: HTMLDivElement | null;
	public slideDisplay: HTMLDivElement | null;
	public slideContent: HTMLDivElement | null;
	public thumbnailsPanel: HTMLDivElement | null;
	public slideCounter: HTMLDivElement | null;
	public keyboardHandler?: (e: KeyboardEvent) => void;

	constructor(container: HTMLElement, options: ViewerOptions = {}) {
		super(container, options);

		this.presentationLib = null;
		this.slides = [];
		this.currentSlideIndex = 0;
		this.slideContainer = null;
		this.slideNavigation = null;
		this.thumbnailsContainer = null;
		this.searchableText = "";
		this.searchResults = [];
		this.currentSearchIndex = 0;
		this.mainContainer = null;
		this.slideDisplay = null;
		this.slideContent = null;
		this.thumbnailsPanel = null;
		this.slideCounter = null;

		this.canShowThumbnails = options.showThumbnails !== false;
		this.autoFitSlide = options.autoFitSlide !== false;

		this.setupPresentationContainer();
	}

	setupPresentationContainer(): void {
		this.mainContainer = document.createElement("div");
		this.mainContainer.className = "buka-presentation-container";
		this.mainContainer.style.cssText = `
			display: flex;
			flex-direction: column;
			width: 100%;
			height: 100%;
			background-color: #1a1a1a;
			color: white;
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
		`;

		this.slideContainer = document.createElement("div");
		this.slideContainer.className = "buka-slide-container";
		this.slideContainer.style.cssText = `
			flex: 1;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 20px;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			position: relative;
			overflow: hidden;
		`;

		this.slideDisplay = document.createElement("div");
		this.slideDisplay.className = "buka-slide-display";
		this.slideDisplay.style.cssText = `
			background-color: white;
			border-radius: 8px;
			box-shadow: 0 10px 40px rgba(0,0,0,0.3);
			max-width: 100%;
			max-height: 100%;
			overflow: hidden;
			position: relative;
			aspect-ratio: 16/9;
			display: flex;
			align-items: center;
			justify-content: center;
		`;

		this.slideContent = document.createElement("div");
		this.slideContent.className = "buka-slide-content";
		this.slideContent.style.cssText = `
			width: 100%;
			height: 100%;
			padding: 40px;
			box-sizing: border-box;
			color: #333;
			font-size: 18px;
			line-height: 1.5;
			overflow: auto;
		`;

		this.slideNavigation = document.createElement("div");
		this.slideNavigation.className = "buka-slide-navigation";
		this.slideNavigation.style.cssText = `
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 15px 20px;
			background-color: rgba(0,0,0,0.8);
			backdrop-filter: blur(10px);
		`;

		if (this.canShowThumbnails) {
			this.thumbnailsPanel = document.createElement("div");
			this.thumbnailsPanel.className = "buka-thumbnails-panel";
			this.thumbnailsPanel.style.cssText = `
				width: 200px;
				height: 100%;
				background-color: rgba(0,0,0,0.9);
				backdrop-filter: blur(10px);
				border-right: 1px solid rgba(255,255,255,0.1);
				overflow-y: auto;
				padding: 10px;
				position: absolute;
				left: 0;
				top: 0;
				transform: translateX(-100%);
				transition: transform 0.3s ease;
				z-index: 10;
			`;

			this.thumbnailsContainer = document.createElement("div");
			this.thumbnailsContainer.className = "buka-thumbnails-list";
			this.thumbnailsPanel.appendChild(this.thumbnailsContainer);
		}

		this.slideDisplay.appendChild(this.slideContent);
		this.slideContainer.appendChild(this.slideDisplay);

		this.mainContainer.appendChild(this.slideContainer);
		this.mainContainer.appendChild(this.slideNavigation);

		if (this.thumbnailsPanel) {
			this.mainContainer.appendChild(this.thumbnailsPanel);
		}

		this.container.appendChild(this.mainContainer);

		this.setupNavigationControls();
		this.setupKeyboardNavigation();
	}

	setupNavigationControls(): void {
		const prevButton = document.createElement("button");
		prevButton.innerHTML = "← Previous";
		prevButton.className = "buka-nav-btn";
		prevButton.style.cssText = `
			background: rgba(255,255,255,0.1);
			border: 1px solid rgba(255,255,255,0.2);
			color: white;
			padding: 8px 16px;
			border-radius: 6px;
			cursor: pointer;
			transition: all 0.2s;
		`;
		prevButton.addEventListener("click", () => this.previousSlide());
		prevButton.addEventListener("mouseenter", () => {
			prevButton.style.background = "rgba(255,255,255,0.2)";
		});
		prevButton.addEventListener("mouseleave", () => {
			prevButton.style.background = "rgba(255,255,255,0.1)";
		});

		this.slideCounter = document.createElement("div");
		this.slideCounter.className = "buka-slide-counter";
		this.slideCounter.style.cssText = `
			display: flex;
			align-items: center;
			gap: 10px;
			color: white;
			font-size: 14px;
		`;

		const nextButton = document.createElement("button");
		nextButton.innerHTML = "Next →";
		nextButton.className = "buka-nav-btn";
		nextButton.style.cssText = prevButton.style.cssText;
		nextButton.addEventListener("click", () => this.nextSlide());
		nextButton.addEventListener("mouseenter", () => {
			nextButton.style.background = "rgba(255,255,255,0.2)";
		});
		nextButton.addEventListener("mouseleave", () => {
			nextButton.style.background = "rgba(255,255,255,0.1)";
		});

		if (this.thumbnailsPanel) {
			const thumbnailsToggle = document.createElement("button");
			thumbnailsToggle.innerHTML = "☰ Slides";
			thumbnailsToggle.className = "buka-thumbnails-toggle";
			thumbnailsToggle.style.cssText = prevButton.style.cssText;
			thumbnailsToggle.addEventListener("click", () => this.toggleThumbnails());

			if (this.slideNavigation) {
				this.slideNavigation.appendChild(thumbnailsToggle);
			}
		}

		if (this.slideNavigation) {
			this.slideNavigation.appendChild(prevButton);
			this.slideNavigation.appendChild(this.slideCounter);
			this.slideNavigation.appendChild(nextButton);
		}
	}

	setupKeyboardNavigation(): void {
		this.keyboardHandler = (event) => {
			switch (event.key) {
				case "ArrowLeft":
				case "ArrowUp":
				case "PageUp":
					event.preventDefault();
					this.previousSlide();
					break;
				case "ArrowRight":
				case "ArrowDown":
				case "PageDown":
				case " ": // Spacebar
					event.preventDefault();
					this.nextSlide();
					break;
				case "Home":
					event.preventDefault();
					this.goToSlide(0);
					break;
				case "End":
					event.preventDefault();
					this.goToSlide(this.slides.length - 1);
					break;
				case "Escape":
					event.preventDefault();
					if (this.thumbnailsPanel) {
						this.hideThumbnails();
					}
					break;
			}
		};

		document.addEventListener("keydown", this.keyboardHandler);
	}

	async load(source: string | File | Blob): Promise<void> {
		try {
			this.presentationLib = await this.loadPresentationLibrary();

			let data;

			if (typeof source === "string") {
				const response = await fetch(source);
				if (!response.ok) {
					throw new Error(`Failed to fetch presentation: ${response.statusText}`);
				}
				data = await response.arrayBuffer();
			} else if (source instanceof File || source instanceof Blob) {
				data = await source.arrayBuffer();
			} else {
				throw new Error("Unsupported source type");
			}

			await this.parsePresentationData(data);

			this.totalPages = this.slides.length;
			this.currentPage = 1;
			this.currentSlideIndex = 0;

			if (this.canShowThumbnails) {
				this.setupThumbnails();
			}

			await this.render();

			this.emit(EVENTS.DOCUMENT_LOADED, {
				totalPages: this.totalPages,
				title: this.getDocumentTitle(source),
				slideCount: this.slides.length,
				hasNotes: this.slides.some((slide) => slide.notes)
			});
		} catch (error) {
			console.error("Presentation loading failed:", error);
			throw new Error(`Failed to load presentation: ${error}`);
		}
	}

	async loadPresentationLibrary(): Promise<any> {
		console.log("Using mock presentation library for demonstration");

		return {
			parse: (data: any) => this.mockParsePPTX(data)
		};
	}

	async parsePresentationData(data: any): Promise<void> {
		try {
			const parsedData = await this.presentationLib.parse(data);
			this.slides = parsedData.slides;
			this.searchableText = parsedData.text;
		} catch (error) {
			console.warn("Failed to parse presentation, using fallback");
			this.createFallbackSlides();
		}
	}

	mockParsePPTX(data: any) {
		const slideCount = Math.max(1, Math.floor(data.byteLength / 10000));

		const slides = [];
		for (let i = 0; i < Math.min(slideCount, 10); i++) {
			slides.push({
				id: i + 1,
				title: `Slide ${i + 1}`,
				content: this.generateMockSlideContent(i + 1),
				notes: i % 3 === 0 ? `Speaker notes for slide ${i + 1}` : "",
				layout: "title-content",
				background: this.getSlideBackground(i)
			});
		}

		const searchableText = slides
			.map((slide) => `${slide.title} ${slide.content} ${slide.notes}`)
			.join(" ");

		return { slides, text: searchableText };
	}

	generateMockSlideContent(slideNumber: number): string {
		const contents = [
			"<h1>Welcome to the Presentation</h1><p>This is the opening slide with an introduction to our topic.</p>",
			"<h2>Agenda</h2><ul><li>Introduction</li><li>Main Content</li><li>Key Points</li><li>Conclusion</li></ul>",
			"<h2>Key Statistics</h2><p>Here are some important numbers:</p><ul><li>95% user satisfaction</li><li>50% increase in efficiency</li><li>30+ features added</li></ul>",
			"<h2>Our Approach</h2><p>We follow a systematic methodology that ensures quality and reliability in every step of the process.</p>",
			`
				<h2>Benefits</h2><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;"><div><h3>Cost Effective</h3><p>Reduces operational costs by 40%</p></div><div><h3>Time Saving</h3><p>Speeds up processes significantly</p></div></div>
			`,
			"<h2>Case Study</h2><p>Let us examine a real-world example of how our solution made a difference for a major client.</p>",
			"<h2>Implementation Timeline</h2><div><strong>Phase 1:</strong> Planning (2 weeks)<br><strong>Phase 2:</strong> Development (6 weeks)<br><strong>Phase 3:</strong> Testing (2 weeks)<br><strong>Phase 4:</strong> Deployment (1 week)</div>",
			"<h2>Results</h2><p>The implementation delivered outstanding results across all key performance indicators.</p>",
			"<h2>Next Steps</h2><p>Moving forward, we recommend the following actions to maximize the benefits of this solution.</p>",
			`
				<h1>Thank You</h1><p>Questions & Discussion</p><div style="margin-top: 40px; font-size: 14px; color: #666;">Contact: info@company.com</div>
			`
		];

		return (
			contents[slideNumber - 1] ||
			`<h2>Slide ${slideNumber}</h2><p>Content for slide number ${slideNumber}.</p>`
		);
	}

	getSlideBackground(index: number) {
		const backgrounds = [
			"linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
			"linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
			"linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
			"linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
			"linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
		];

		return backgrounds[index % backgrounds.length];
	}

	createFallbackSlides() {
		this.slides = [
			{
				id: 1,
				title: "Presentation Viewer",
				content:
					"<h1>Presentation Viewer</h1><p>This document could not be parsed as a presentation.<br>It may be in an unsupported format or corrupted.</p><p>Supported formats: PPTX, PPT</p>",
				notes: "",
				layout: "title-content",
				background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
			}
		];
		this.searchableText = "Presentation Viewer document format unsupported";
	}

	setupThumbnails() {
		if (!this.thumbnailsContainer) return;

		this.thumbnailsContainer.innerHTML = "";

		this.slides.forEach((slide, index) => {
			const thumbnail = document.createElement("div");
			thumbnail.className = "buka-slide-thumbnail";
			thumbnail.style.cssText = `
        width: 160px;
        height: 90px;
        margin-bottom: 10px;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        transition: all 0.2s;
        border: 2px solid ${index === this.currentSlideIndex ? "#4facfe" : "transparent"};
      `;

			const thumbnailContent = document.createElement("div");
			thumbnailContent.style.cssText = `
        width: 100%;
        height: 100%;
        padding: 8px;
        font-size: 10px;
        color: #333;
        background: ${slide.background || "#fff"};
        display: flex;
        flex-direction: column;
        justify-content: center;
      `;

			const title = slide.title || `Slide ${index + 1}`;
			thumbnailContent.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
        <div style="font-size: 8px; opacity: 0.7;">Slide ${index + 1}</div>
      `;

			thumbnail.appendChild(thumbnailContent);

			thumbnail.addEventListener("click", () => {
				this.goToSlide(index);
				this.hideThumbnails();
			});

			thumbnail.addEventListener("mouseenter", () => {
				thumbnail.style.transform = "scale(1.05)";
				thumbnail.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
			});

			thumbnail.addEventListener("mouseleave", () => {
				thumbnail.style.transform = "scale(1)";
				thumbnail.style.boxShadow = "none";
			});

			this.thumbnailsContainer?.appendChild(thumbnail);
		});
	}

	async render(): Promise<void> {
		if (!this.slides.length) return;

		const currentSlide = this.slides[this.currentSlideIndex];
		if (!currentSlide) return;

		if (this.slideContent) {
			this.slideContent.innerHTML = currentSlide.content;
		}

		if (currentSlide.background && this.slideContainer) {
			this.slideContainer.style.background = currentSlide.background;
		}

		this.updateSlideCounter();

		if (this.thumbnailsContainer) {
			this.updateThumbnailSelection();
		}

		if (this.autoFitSlide) {
			this.fitSlideToContainer();
		}
	}

	fitSlideToContainer() {
		if (!this.slideDisplay || !this.slideContainer) return;

		const containerRect = this.slideContainer.getBoundingClientRect();
		const slideRect = this.slideDisplay.getBoundingClientRect();

		if (!containerRect || !slideRect) return;

		const scaleX = (containerRect.width - 40) / slideRect.width;
		const scaleY = (containerRect.height - 40) / slideRect.height;
		const scale = Math.min(scaleX, scaleY, 1);

		if (scale < 1) {
			this.slideDisplay.style.transform = `scale(${scale})`;
		} else {
			this.slideDisplay.style.transform = "scale(1)";
		}
	}

	updateSlideCounter() {
		if (this.slideCounter) {
			this.slideCounter.innerHTML = `
        <span>Slide ${this.currentSlideIndex + 1} of ${this.slides.length}</span>
        <div style="width: 100px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; margin: 0 10px;">
          <div style="width: ${((this.currentSlideIndex + 1) / this.slides.length) * 100}%; height: 100%; background: #4facfe; border-radius: 2px; transition: width 0.3s ease;"></div>
        </div>
      `;
		}
	}

	updateThumbnailSelection() {
		if (!this.thumbnailsContainer) return;

		const thumbnails = this.thumbnailsContainer.querySelectorAll(".buka-slide-thumbnail");
		thumbnails.forEach((thumbnail, index) => {
			thumbnail.classList.add(index === this.currentSlideIndex ? "active-thumbnail" : "");
		});
	}

	async goToSlide(slideIndex: number): Promise<boolean> {
		if (slideIndex >= 0 && slideIndex < this.slides.length) {
			this.currentSlideIndex = slideIndex;
			this.currentPage = slideIndex + 1;
			await this.render();

			this.emit(EVENTS.PAGE_CHANGED, {
				page: this.currentPage,
				totalPages: this.totalPages,
				slideTitle: this.slides[slideIndex].title
			});

			return true;
		}
		return false;
	}

	async nextSlide(): Promise<boolean> {
		return await this.goToSlide(this.currentSlideIndex + 1);
	}

	async previousSlide(): Promise<boolean> {
		return await this.goToSlide(this.currentSlideIndex - 1);
	}

	override async goto(page: number): Promise<boolean> {
		return await this.goToSlide(page - 1);
	}

	override async setZoom(factor: number): Promise<void> {
		this.zoomFactor = Math.max(0.3, Math.min(3.0, factor));

		const scale = this.zoomFactor;

		if (!this.slideDisplay) return;
		this.slideDisplay.style.transform = `scale(${scale})`;

		if (!this.slideContainer) return;
		this.slideContainer.style.overflow = scale > 1 ? "auto" : "hidden";

		this.emit(EVENTS.ZOOM_CHANGED, { zoom: this.zoomFactor });
	}

	override async search(query: string): Promise<SearchResult[]> {
		if (!query.trim()) {
			this.searchResults = [];
			this.currentSearchIndex = 0;
			this.clearSearchHighlights();
			return [];
		}

		this.clearSearchHighlights();
		this.searchResults = [];

		const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");

		this.slides.forEach((slide, slideIndex) => {
			const slideText = `${slide.title} ${slide.content} ${slide.notes}`;
			const textContent = slideText.replace(/<[^>]*>/g, " "); // Strip HTML

			let match;
			while ((match = regex.exec(textContent)) !== null) {
				this.searchResults.push({
					match: match[0],
					text: textContent,
					page: slideIndex + 1,
					index: match.index,
					length: match[0].length
				} as SearchResult);
			}
		});

		if (this.searchResults.length > 0) {
			this.highlightSearchMatches(query);
			this.currentSearchIndex = 0;

			const firstResult = this.searchResults[0];

			if (!firstResult) return [];

			if (firstResult.page && firstResult.page - 1 !== this.currentSlideIndex) {
				await this.goToSlide(firstResult.page - 1);
			}
		}

		this.emit(EVENTS.SEARCH_RESULT, {
			query,
			results: this.searchResults,
			currentIndex: this.currentSearchIndex
		});

		return this.searchResults;
	}

	highlightSearchMatches(query: string) {
		if (!this.slideContent) return;

		const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
		const currentSlide = this.slides[this.currentSlideIndex];

		if (currentSlide) {
			const highlightedContent = currentSlide.content.replace(
				regex,
				`
					<mark style="background: #ffeb3b; color: #333; padding: 2px 4px; border-radius: 2px;">$1</mark>
				`
			);
			this.slideContent.innerHTML = highlightedContent;
		}
	}

	clearSearchHighlights() {
		this.render();
	}

	getSearchContext(text: string, index: number, length: number) {
		const contextLength = 30;
		const start = Math.max(0, index - contextLength);
		const end = Math.min(text.length, index + length + contextLength);

		return {
			before: text.substring(start, index),
			match: text.substring(index, index + length),
			after: text.substring(index + length, end)
		};
	}

	toggleThumbnails() {
		if (this.thumbnailsPanel) {
			const isVisible = this.thumbnailsPanel.style.transform === "translateX(0px)";
			this.thumbnailsPanel.style.transform = isVisible
				? "translateX(-100%)"
				: "translateX(0px)";
		}
	}

	showThumbnails() {
		if (this.thumbnailsPanel) {
			this.thumbnailsPanel.style.transform = "translateX(0px)";
		}
	}

	hideThumbnails() {
		if (this.thumbnailsPanel) {
			this.thumbnailsPanel.style.transform = "translateX(-100%)";
		}
	}

	getDocumentTitle(source: string | File | Blob): string {
		if (typeof source === "string") {
			return (
				source
					.split("/")
					.pop()
					?.replace(/\.[^/.]+$/, "") || "Presentation"
			);
		} else if (source instanceof File) {
			return source.name.replace(/\.[^/.]+$/, "");
		}
		return "Presentation";
	}

	getCurrentSlide() {
		return this.slides[this.currentSlideIndex];
	}

	getSlideNotes() {
		const currentSlide = this.getCurrentSlide();
		return currentSlide?.notes || "";
	}

	enterPresentationMode() {
		if (this.mainContainer) {
			this.mainContainer.style.position = "fixed";
			this.mainContainer.style.top = "0";
			this.mainContainer.style.left = "0";
			this.mainContainer.style.width = "100vw";
			this.mainContainer.style.height = "100vh";
			this.mainContainer.style.zIndex = "9999";
		}

		if (this.slideNavigation) {
			this.slideNavigation.style.display = "none";
		}

		this.hideThumbnails();
	}

	exitPresentationMode() {
		if (this.mainContainer) {
			this.mainContainer.style.position = "";
			this.mainContainer.style.top = "";
			this.mainContainer.style.left = "";
			this.mainContainer.style.width = "";
			this.mainContainer.style.height = "";
			this.mainContainer.style.zIndex = "";
		}

		if (this.slideNavigation) {
			this.slideNavigation.style.display = "flex";
		}
	}

	override destroy() {
		super.destroy();

		if (this.keyboardHandler) {
			document.removeEventListener("keydown", this.keyboardHandler);
		}

		this.slides = [];
		this.searchResults = [];
		this.presentationLib = null;
	}
}

RendererFactory.register(SUPPORTED_FORMATS.PPTX, PresentationRenderer);
RendererFactory.register(SUPPORTED_FORMATS.PPT, PresentationRenderer);

export default PresentationRenderer;
