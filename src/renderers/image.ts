import { BaseRenderer, EVENTS, RendererFactory, SUPPORTED_FORMATS } from "../core";
import type { SearchResult } from "../types";

/**
 * Image Renderer for PNG, JPEG, SVG
 * Handles image documents with zoom, pan, and fit-to-screen functionality
 */
export class ImageRenderer extends BaseRenderer {
	public imageElement: HTMLImageElement | null;
	public imageWrapper: HTMLElement | null;
	public originalDimensions: { width: number; height: number };
	public containerDimensions: { width: number; height: number };
	public panState: { x: number; y: number };
	public isDragging: boolean;
	public dragStart: { x: number; y: number };
	public fitMode: "fit-width" | "fit-height" | "fit-page" | "original";

	// Getter for consistent API with other renderers
	override get zoom(): number {
		return this.zoomFactor;
	}
	public resizeObserver: ResizeObserver | null;
	public objectUrl: string | null;

	constructor(container: HTMLElement, options = {}) {
		super(container, options);

		this.imageElement = null;
		this.imageWrapper = null;
		this.originalDimensions = { width: 0, height: 0 };
		this.containerDimensions = { width: 0, height: 0 };
		this.panState = { x: 0, y: 0 };
		this.isDragging = false;
		this.dragStart = { x: 0, y: 0 };
		this.fitMode = "fit-width"; // 'fit-width', 'fit-height', 'fit-page', 'original'
		this.resizeObserver = null;
		this.objectUrl = null;

		this.totalPages = 1;
		this.currentPage = 1;

		this.setupImageContainer();
		this.bindEvents();
	}

	setupImageContainer(): void {
		this.imageWrapper = document.createElement("div");
		this.imageWrapper.className = "buka-image-wrapper";
		this.imageWrapper.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f8f9fa;
      background-image: 
        linear-gradient(45deg, #e9ecef 25%, transparent 25%), 
        linear-gradient(-45deg, #e9ecef 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #e9ecef 75%), 
        linear-gradient(-45deg, transparent 75%, #e9ecef 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    `;

		this.imageElement = document.createElement("img");
		this.imageElement.className = "buka-image-element";
		this.imageElement.style.cssText = `
      max-width: none;
      max-height: none;
      position: absolute;
      transition: transform 0.2s ease;
      user-select: none;
      pointer-events: none;
    `;

		this.imageWrapper.appendChild(this.imageElement);
		this.container.appendChild(this.imageWrapper);
	}

	bindEvents(): void {
		this.imageWrapper?.addEventListener("mousedown", this.handleMouseDown.bind(this));
		document.addEventListener("mousemove", this.handleMouseMove.bind(this));
		document.addEventListener("mouseup", this.handleMouseUp.bind(this));

		this.imageWrapper?.addEventListener("touchstart", this.handleTouchStart.bind(this), {
			passive: false
		});
		this.imageWrapper?.addEventListener("touchmove", this.handleTouchMove.bind(this), {
			passive: false
		});
		this.imageWrapper?.addEventListener("touchend", this.handleTouchEnd.bind(this));

		this.imageWrapper?.addEventListener("wheel", this.handleWheel.bind(this), {
			passive: false
		});

		if (window.ResizeObserver) {
			this.resizeObserver = new ResizeObserver(() => {
				this.updateContainerDimensions();
				this.applyFitMode();
			});
			this.resizeObserver.observe(this.container);
		}

		this.imageWrapper?.addEventListener("dblclick", () => {
			this.resetView();
		});
	}

	async load(source: string | File | Blob): Promise<void> {
		try {
			let imageUrl;

			if (typeof source === "string") {
				imageUrl = source;
			} else if (source instanceof File || source instanceof Blob) {
				imageUrl = URL.createObjectURL(source);
			} else {
				throw new Error("Unsupported source type");
			}

			await this.loadImage(imageUrl);

			if (source instanceof File || source instanceof Blob) {
				this.objectUrl = imageUrl;
			}

			this.emit(EVENTS.DOCUMENT_LOADED, {
				totalPages: this.totalPages,
				title: this.getImageTitle(source),
				dimensions: this.originalDimensions
			});
		} catch (error) {
			console.error("Image loading failed:", error);
			throw new Error(
				`Failed to load image: ${error instanceof Error ? error.message : "Unknown error"}`
			);
		}
	}

	loadImage(imageUrl: string) {
		return new Promise<void>((resolve, reject) => {
			if (this.imageElement) {
				this.imageElement.onload = () => {
					if (this.imageElement) {
						this.originalDimensions = {
							width: this.imageElement.naturalWidth,
							height: this.imageElement.naturalHeight
						};

						this.updateContainerDimensions();
						this.applyFitMode();
						resolve();
					}
				};

				this.imageElement.onerror = () => {
					reject(new Error("Failed to load image"));
				};

				this.imageElement.src = imageUrl;
			} else {
				reject(new Error("Image element not initialized"));
			}
		});
	}

	updateContainerDimensions() {
		const rect = this.container.getBoundingClientRect();
		this.containerDimensions = {
			width: rect.width,
			height: rect.height
		};
	}

	async render(): Promise<void> {
		this.updateImageTransform();
	}

	updateImageTransform() {
		if (!this.imageElement) return;

		const scaleX = this.zoomFactor;
		const scaleY = this.zoomFactor;

		this.imageElement.style.transform = `
      translate(${this.panState.x}px, ${this.panState.y}px) 
      scale(${scaleX}, ${scaleY})
    `;
	}

	override async setZoom(factor: number): Promise<void> {
		const oldZoom = this.zoomFactor;
		this.zoomFactor = Math.max(0.1, Math.min(10.0, factor));

		const zoomRatio = this.zoomFactor / oldZoom;
		const centerX = this.containerDimensions.width / 2;
		const centerY = this.containerDimensions.height / 2;

		this.panState.x = centerX + (this.panState.x - centerX) * zoomRatio;
		this.panState.y = centerY + (this.panState.y - centerY) * zoomRatio;

		this.updateImageTransform();
		this.emit(EVENTS.ZOOM_CHANGED, { zoom: this.zoomFactor });
	}

	override async goto(page: number): Promise<boolean> {
		if (page === 1) {
			this.emit(EVENTS.PAGE_CHANGED, { page: 1, totalPages: 1 });
			return true;
		}
		return false;
	}

	async search(query: string): Promise<SearchResult[]> {
		this.emit(EVENTS.SEARCH_RESULT, {
			query,
			results: [],
			currentIndex: 0
		});

		return [];
	}

	handleMouseDown(event: MouseEvent): void {
		if (event.button === 0) {
			// Left mouse button
			this.isDragging = true;
			this.dragStart = {
				x: event.clientX - this.panState.x,
				y: event.clientY - this.panState.y
			};
			if (this.imageWrapper) this.imageWrapper.style.cursor = "grabbing";
			event.preventDefault();
		}
	}

	handleMouseMove(event: MouseEvent): void {
		if (this.isDragging) {
			this.panState.x = event.clientX - this.dragStart.x;
			this.panState.y = event.clientY - this.dragStart.y;
			this.updateImageTransform();
			event.preventDefault();
		}
	}

	handleMouseUp(_event: MouseEvent): void {
		if (this.isDragging) {
			this.isDragging = false;
			if (this.imageWrapper) this.imageWrapper.style.cursor = "grab";
		}
	}

	handleTouchStart(event: TouchEvent): void {
		if (event.touches.length === 1) {
			const touch = event.touches[0];
			if (touch) {
				this.isDragging = true;
				this.dragStart = {
					x: touch.clientX - this.panState.x,
					y: touch.clientY - this.panState.y
				};
				event.preventDefault();
			}
		}
	}

	handleTouchMove(event: TouchEvent): void {
		if (this.isDragging && event.touches.length === 1) {
			const touch = event.touches[0];
			if (touch) {
				this.panState.x = touch.clientX - this.dragStart.x;
				this.panState.y = touch.clientY - this.dragStart.y;
				this.updateImageTransform();
				event.preventDefault();
			}
		}
	}

	handleTouchEnd(_event: TouchEvent): void {
		this.isDragging = false;
	}

	handleWheel(event: WheelEvent): void {
		event.preventDefault();

		if (!this.imageWrapper) return;
		const rect = this.imageWrapper.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;

		const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
		const newZoom = Math.max(0.1, Math.min(10.0, this.zoomFactor * zoomFactor));

		if (newZoom !== this.zoomFactor) {
			const scaleChange = newZoom / this.zoomFactor;
			this.panState.x = mouseX + (this.panState.x - mouseX) * scaleChange;
			this.panState.y = mouseY + (this.panState.y - mouseY) * scaleChange;

			this.zoomFactor = newZoom;
			this.updateImageTransform();
			this.emit(EVENTS.ZOOM_CHANGED, { zoom: this.zoomFactor });
		}
	}

	setFitMode(mode: "fit-width" | "fit-height" | "fit-page" | "original"): void {
		this.fitMode = mode;
		this.applyFitMode();
	}

	applyFitMode() {
		if (!this.originalDimensions.width || !this.containerDimensions.width) {
			return;
		}

		const imageAspect = this.originalDimensions.width / this.originalDimensions.height;
		const containerAspect = this.containerDimensions.width / this.containerDimensions.height;

		let newZoom = 1;

		switch (this.fitMode) {
			case "fit-width":
				newZoom = this.containerDimensions.width / this.originalDimensions.width;
				break;
			case "fit-height":
				newZoom = this.containerDimensions.height / this.originalDimensions.height;
				break;
			case "fit-page":
				if (imageAspect > containerAspect) {
					newZoom = this.containerDimensions.width / this.originalDimensions.width;
				} else {
					newZoom = this.containerDimensions.height / this.originalDimensions.height;
				}
				break;
			case "original":
				newZoom = 1;
				break;
		}

		this.zoomFactor = Math.max(0.1, Math.min(10.0, newZoom));
		this.centerImage();
		this.updateImageTransform();
		this.emit(EVENTS.ZOOM_CHANGED, { zoom: this.zoomFactor });
	}

	centerImage() {
		const scaledWidth = this.originalDimensions.width * this.zoomFactor;
		const scaledHeight = this.originalDimensions.height * this.zoomFactor;

		this.panState.x = (this.containerDimensions.width - scaledWidth) / 2;
		this.panState.y = (this.containerDimensions.height - scaledHeight) / 2;
	}

	resetView() {
		this.setFitMode("fit-page");
	}

	getImageTitle(source: string | File | Blob): string {
		if (typeof source === "string") {
			return source.split("/").pop() || "Image";
		} else if (source instanceof File) {
			return source.name;
		}
		return "Image";
	}

	getViewInfo() {
		return {
			zoom: this.zoomFactor,
			pan: { ...this.panState },
			fitMode: this.fitMode,
			dimensions: { ...this.originalDimensions },
			containerSize: { ...this.containerDimensions }
		};
	}

	fitToWidth() {
		this.setFitMode("fit-width");
	}

	fitToHeight() {
		this.setFitMode("fit-height");
	}

	fitToPage() {
		this.setFitMode("fit-page");
	}

	actualSize() {
		this.setFitMode("original");
	}

	override destroy(): void {
		super.destroy();

		if (this.objectUrl) {
			URL.revokeObjectURL(this.objectUrl);
		}

		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}

		document.removeEventListener("mousemove", this.handleMouseMove);
		document.removeEventListener("mouseup", this.handleMouseUp);

		this.imageElement = null;
		this.imageWrapper = null;
		this.isDragging = false;
	}
}

RendererFactory.register(SUPPORTED_FORMATS.IMAGE_PNG, ImageRenderer);
RendererFactory.register(SUPPORTED_FORMATS.IMAGE_JPEG, ImageRenderer);
RendererFactory.register(SUPPORTED_FORMATS.IMAGE_SVG, ImageRenderer);

export default ImageRenderer;
