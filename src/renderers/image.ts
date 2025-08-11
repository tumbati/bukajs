import { BaseRenderer, EVENTS, RendererFactory, SUPPORTED_FORMATS } from "../core";
import type { SearchResult } from "../types";

/**
 * Image Renderer for PNG, JPEG, SVG
 * Handles image documents with zoom, pan, and fit-to-screen functionality
 */
export interface ImageFilterState {
	brightness: number;
	contrast: number;
	saturation: number;
	hue: number;
	blur: number;
	sepia: number;
	grayscale: number;
}

export interface CropArea {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface CropHandlePosition {
	x: number;
	y: number;
	cursor: string;
	type: "corner" | "edge";
	handle: string;
}

export interface AspectRatioConstraint {
	ratio: number | null;
	label: string;
}

export class ImageRenderer extends BaseRenderer {
	public imageElement: HTMLImageElement | null;
	public canvasElement: HTMLCanvasElement | null;
	public canvasContext: CanvasRenderingContext2D | null;
	public imageWrapper: HTMLElement | null;
	public originalDimensions: { width: number; height: number };
	public containerDimensions: { width: number; height: number };
	public panState: { x: number; y: number };
	public isDragging: boolean;
	public dragStart: { x: number; y: number };
	public fitMode: "fit-width" | "fit-height" | "fit-page" | "original";
	public filters: ImageFilterState;
	public cropArea: CropArea | null;
	public isCropping: boolean;
	public cropOverlay: HTMLElement | null;
	public originalImageData: ImageData | null;
	public isFiltered: boolean;
	public cropStartPoint: { x: number; y: number } | null;
	public cropHandles: HTMLElement[];
	public isDraggingCrop: boolean;
	public isResizingCrop: boolean;
	public activeHandle: string | null;
	public aspectRatio: number | null;
	public cropDragOffset: { x: number; y: number };

	// Getter for consistent API with other renderers
	override get zoom(): number {
		return this.zoomFactor;
	}
	public resizeObserver: ResizeObserver | null;
	public objectUrl: string | null;

	constructor(container: HTMLElement, options = {}) {
		super(container, options);

		this.imageElement = null;
		this.canvasElement = null;
		this.canvasContext = null;
		this.imageWrapper = null;
		this.originalDimensions = { width: 0, height: 0 };
		this.containerDimensions = { width: 0, height: 0 };
		this.panState = { x: 0, y: 0 };
		this.isDragging = false;
		this.dragStart = { x: 0, y: 0 };
		this.fitMode = "fit-width";
		this.resizeObserver = null;
		this.objectUrl = null;
		this.filters = {
			brightness: 100,
			contrast: 100,
			saturation: 100,
			hue: 0,
			blur: 0,
			sepia: 0,
			grayscale: 0
		};
		this.cropArea = null;
		this.isCropping = false;
		this.cropOverlay = null;
		this.originalImageData = null;
		this.isFiltered = false;
		this.cropStartPoint = null;
		this.cropHandles = [];
		this.isDraggingCrop = false;
		this.isResizingCrop = false;
		this.activeHandle = null;
		this.aspectRatio = null;
		this.cropDragOffset = { x: 0, y: 0 };

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

		this.canvasElement = document.createElement("canvas");
		this.canvasElement.className = "buka-image-canvas";
		this.canvasElement.style.cssText = `
      max-width: none;
      max-height: none;
      position: absolute;
      transition: transform 0.2s ease;
      user-select: none;
      pointer-events: none;
      display: none;
    `;
		this.canvasContext = this.canvasElement.getContext("2d");

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

		this.cropOverlay = document.createElement("div");
		this.cropOverlay.className = "buka-crop-overlay";
		this.cropOverlay.style.cssText = `
      position: absolute;
      border: 2px dashed #007bff;
      background: rgba(0, 123, 255, 0.1);
      display: none;
      z-index: 10;
      cursor: move;
      pointer-events: auto;
    `;

		// Add crop overlay event listeners for dragging
		this.cropOverlay.addEventListener("mousedown", (e) => {
			e.stopPropagation();
			this.startCropDrag(e);
		});

		// Create resize handles
		this.createCropHandles();

		this.imageWrapper.appendChild(this.canvasElement);
		this.imageWrapper.appendChild(this.imageElement);
		this.imageWrapper.appendChild(this.cropOverlay);
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

		document.addEventListener("keydown", this.handleKeyDown.bind(this));
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
		const activeElement = this.isFiltered ? this.canvasElement : this.imageElement;
		if (!activeElement) return;

		const scaleX = this.zoomFactor;
		const scaleY = this.zoomFactor;

		activeElement.style.transform = `
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
			if (this.isCropping) {
				// Check if clicking on existing crop area
				const target = event.target as HTMLElement;
				if (target === this.cropOverlay && this.cropArea) {
					// Start dragging crop area
					this.startCropDrag(event);
				} else if (!target.classList.contains("buka-crop-handle")) {
					// Start new crop selection
					const rect = this.imageWrapper?.getBoundingClientRect();
					if (rect) {
						this.cropStartPoint = {
							x: event.clientX - rect.left,
							y: event.clientY - rect.top
						};
					}
				}
			} else {
				// Normal pan behavior
				this.isDragging = true;
				this.dragStart = {
					x: event.clientX - this.panState.x,
					y: event.clientY - this.panState.y
				};
				if (this.imageWrapper) this.imageWrapper.style.cursor = "grabbing";
			}
			event.preventDefault();
		}
	}

	handleMouseMove(event: MouseEvent): void {
		if (this.isResizingCrop) {
			// Handle crop resize
			this.updateCropResize(event);
			event.preventDefault();
		} else if (this.isDraggingCrop) {
			// Handle crop drag
			this.updateCropDrag(event);
			event.preventDefault();
		} else if (this.isCropping && this.cropStartPoint) {
			// Handle new crop selection
			const rect = this.imageWrapper?.getBoundingClientRect();
			if (rect) {
				const currentX = event.clientX - rect.left;
				const currentY = event.clientY - rect.top;
				this.updateCropOverlay(
					this.cropStartPoint.x,
					this.cropStartPoint.y,
					currentX,
					currentY
				);
			}
			event.preventDefault();
		} else if (this.isDragging) {
			// Normal pan behavior
			this.panState.x = event.clientX - this.dragStart.x;
			this.panState.y = event.clientY - this.dragStart.y;
			this.updateImageTransform();
			event.preventDefault();
		}
	}

	handleMouseUp(_event: MouseEvent): void {
		if (this.isResizingCrop) {
			this.isResizingCrop = false;
			this.activeHandle = null;
		} else if (this.isDraggingCrop) {
			this.isDraggingCrop = false;
		} else if (this.isCropping && this.cropStartPoint) {
			// Finished creating new crop area
			this.cropStartPoint = null;
			this.showCropHandles();
		} else if (this.isDragging) {
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
			containerSize: { ...this.containerDimensions },
			filters: { ...this.filters },
			cropArea: this.cropArea ? { ...this.cropArea } : null,
			isCropping: this.isCropping,
			isFiltered: this.isFiltered
		};
	}

	brighten(amount: number = 10): void {
		this.setFilter("brightness", Math.min(200, this.filters.brightness + amount));
		this.applyFilters();
	}

	darken(amount: number = 10): void {
		this.setFilter("brightness", Math.max(0, this.filters.brightness - amount));
		this.applyFilters();
	}

	increaseContrast(amount: number = 10): void {
		this.setFilter("contrast", Math.min(200, this.filters.contrast + amount));
		this.applyFilters();
	}

	decreaseContrast(amount: number = 10): void {
		this.setFilter("contrast", Math.max(0, this.filters.contrast - amount));
		this.applyFilters();
	}

	saturate(amount: number = 10): void {
		this.setFilter("saturation", Math.min(200, this.filters.saturation + amount));
		this.applyFilters();
	}

	desaturate(amount: number = 10): void {
		this.setFilter("saturation", Math.max(0, this.filters.saturation - amount));
		this.applyFilters();
	}

	rotateHue(degrees: number = 30): void {
		this.setFilter("hue", (this.filters.hue + degrees) % 360);
		this.applyFilters();
	}

	addBlur(amount: number = 1): void {
		this.setFilter("blur", Math.min(20, this.filters.blur + amount));
		this.applyFilters();
	}

	toGrayscale(): void {
		this.setFilter("grayscale", 100);
		this.applyFilters();
	}

	toSepia(): void {
		this.setFilter("sepia", 100);
		this.applyFilters();
	}

	getFilters(): ImageFilterState {
		return { ...this.filters };
	}

	getCropArea(): CropArea | null {
		return this.cropArea ? { ...this.cropArea } : null;
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

	createCropHandles(): void {
		const handlePositions = [
			{ handle: "nw", cursor: "nw-resize", type: "corner" as const },
			{ handle: "ne", cursor: "ne-resize", type: "corner" as const },
			{ handle: "sw", cursor: "sw-resize", type: "corner" as const },
			{ handle: "se", cursor: "se-resize", type: "corner" as const },
			{ handle: "n", cursor: "n-resize", type: "edge" as const },
			{ handle: "s", cursor: "s-resize", type: "edge" as const },
			{ handle: "e", cursor: "e-resize", type: "edge" as const },
			{ handle: "w", cursor: "w-resize", type: "edge" as const }
		];

		handlePositions.forEach(({ handle, cursor }) => {
			const handleElement = document.createElement("div");
			handleElement.className = `buka-crop-handle buka-crop-handle-${handle}`;
			handleElement.dataset.handle = handle;
			handleElement.style.cssText = `
        position: absolute;
        width: 10px;
        height: 10px;
        background: #007bff;
        border: 2px solid white;
        border-radius: 50%;
        cursor: ${cursor};
        z-index: 11;
        display: none;
      `;

			handleElement.addEventListener("mousedown", (e) => {
				e.stopPropagation();
				this.startCropResize(e, handle);
			});

			this.cropHandles.push(handleElement);
			this.imageWrapper?.appendChild(handleElement);
		});
	}

	updateHandlePositions(): void {
		if (!this.cropArea || !this.cropOverlay) return;

		const handles = {
			nw: { x: -5, y: -5 },
			ne: { x: this.cropArea.width - 5, y: -5 },
			sw: { x: -5, y: this.cropArea.height - 5 },
			se: { x: this.cropArea.width - 5, y: this.cropArea.height - 5 },
			n: { x: this.cropArea.width / 2 - 5, y: -5 },
			s: { x: this.cropArea.width / 2 - 5, y: this.cropArea.height - 5 },
			e: { x: this.cropArea.width - 5, y: this.cropArea.height / 2 - 5 },
			w: { x: -5, y: this.cropArea.height / 2 - 5 }
		};

		this.cropHandles.forEach((handle) => {
			const handleType = handle.dataset.handle;
			if (handleType && handles[handleType as keyof typeof handles] && this.cropArea) {
				const pos = handles[handleType as keyof typeof handles];
				handle.style.left = `${this.cropArea.x + pos.x}px`;
				handle.style.top = `${this.cropArea.y + pos.y}px`;
				handle.style.display = this.isCropping ? "block" : "none";
			}
		});
	}

	startCropping(): void {
		this.isCropping = true;
		this.cropArea = null;
		if (this.imageWrapper) {
			this.imageWrapper.style.cursor = "crosshair";
		}
		if (this.cropOverlay) {
			this.cropOverlay.style.display = "block";
		}
		this.showCropHandles();
	}

	showCropHandles(): void {
		this.cropHandles.forEach((handle) => {
			handle.style.display = this.isCropping && this.cropArea ? "block" : "none";
		});
	}

	hideCropHandles(): void {
		this.cropHandles.forEach((handle) => {
			handle.style.display = "none";
		});
	}

	startCropResize(event: MouseEvent, handle: string): void {
		event.preventDefault();
		this.isResizingCrop = true;
		this.activeHandle = handle;
	}

	startCropDrag(event: MouseEvent): void {
		if (!this.cropArea) return;

		event.preventDefault();
		this.isDraggingCrop = true;

		const rect = this.imageWrapper?.getBoundingClientRect();
		if (rect) {
			this.cropDragOffset = {
				x: event.clientX - rect.left - this.cropArea.x,
				y: event.clientY - rect.top - this.cropArea.y
			};
		}
	}

	updateCropResize(event: MouseEvent): void {
		if (!this.isResizingCrop || !this.activeHandle || !this.cropArea) return;

		const rect = this.imageWrapper?.getBoundingClientRect();
		if (!rect) return;

		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;

		let { x, y, width, height } = this.cropArea;

		// Handle resize based on active handle
		switch (this.activeHandle) {
			case "nw":
				width += x - mouseX;
				height += y - mouseY;
				x = mouseX;
				y = mouseY;
				break;
			case "ne":
				width = mouseX - x;
				height += y - mouseY;
				y = mouseY;
				break;
			case "sw":
				width += x - mouseX;
				height = mouseY - y;
				x = mouseX;
				break;
			case "se":
				width = mouseX - x;
				height = mouseY - y;
				break;
			case "n":
				height += y - mouseY;
				y = mouseY;
				break;
			case "s":
				height = mouseY - y;
				break;
			case "e":
				width = mouseX - x;
				break;
			case "w":
				width += x - mouseX;
				x = mouseX;
				break;
		}

		// Ensure minimum size
		width = Math.max(20, width);
		height = Math.max(20, height);

		// Apply aspect ratio constraint if set
		if (this.aspectRatio && ["nw", "ne", "sw", "se"].includes(this.activeHandle)) {
			const currentRatio = width / height;
			if (currentRatio > this.aspectRatio) {
				width = height * this.aspectRatio;
			} else {
				height = width / this.aspectRatio;
			}

			// Adjust position for corner handles to maintain aspect ratio
			if (this.activeHandle === "nw") {
				x = this.cropArea.x + this.cropArea.width - width;
				y = this.cropArea.y + this.cropArea.height - height;
			} else if (this.activeHandle === "ne") {
				y = this.cropArea.y + this.cropArea.height - height;
			} else if (this.activeHandle === "sw") {
				x = this.cropArea.x + this.cropArea.width - width;
			}
		}

		this.cropArea = { x, y, width, height };
		this.updateCropDisplay();
	}

	updateCropDrag(event: MouseEvent): void {
		if (!this.isDraggingCrop || !this.cropArea) return;

		const rect = this.imageWrapper?.getBoundingClientRect();
		if (!rect) return;

		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;

		let newX = mouseX - this.cropDragOffset.x;
		let newY = mouseY - this.cropDragOffset.y;

		// Constrain to image bounds
		const maxX = rect.width - this.cropArea.width;
		const maxY = rect.height - this.cropArea.height;

		newX = Math.max(0, Math.min(maxX, newX));
		newY = Math.max(0, Math.min(maxY, newY));

		this.cropArea = {
			x: newX,
			y: newY,
			width: this.cropArea.width,
			height: this.cropArea.height
		};

		this.updateCropDisplay();
	}

	updateCropDisplay(): void {
		if (!this.cropOverlay || !this.cropArea) return;

		this.cropOverlay.style.left = `${this.cropArea.x}px`;
		this.cropOverlay.style.top = `${this.cropArea.y}px`;
		this.cropOverlay.style.width = `${this.cropArea.width}px`;
		this.cropOverlay.style.height = `${this.cropArea.height}px`;

		this.updateHandlePositions();
	}

	// Aspect ratio methods
	setAspectRatio(ratio: number | null): void {
		this.aspectRatio = ratio;

		// Apply to existing crop area if it exists
		if (this.cropArea && ratio) {
			const currentRatio = this.cropArea.width / this.cropArea.height;
			if (Math.abs(currentRatio - ratio) > 0.01) {
				// Adjust height to match aspect ratio
				const newHeight = this.cropArea.width / ratio;
				this.cropArea.height = newHeight;
				this.updateCropDisplay();
			}
		}
	}

	getAspectRatio(): number | null {
		return this.aspectRatio;
	}

	stopCropping(): void {
		this.isCropping = false;
		this.isDraggingCrop = false;
		this.isResizingCrop = false;
		this.activeHandle = null;
		if (this.imageWrapper) {
			this.imageWrapper.style.cursor = "grab";
		}
		if (this.cropOverlay) {
			this.cropOverlay.style.display = "none";
		}
		this.hideCropHandles();
		this.cropArea = null;
		this.cropStartPoint = null;
	}

	applyCrop(): void {
		if (!this.cropArea || !this.canvasElement || !this.canvasContext || !this.imageElement) {
			return;
		}

		const canvas = this.canvasElement;
		const ctx = this.canvasContext;

		const scaleX = this.originalDimensions.width / (this.imageElement.width * this.zoomFactor);
		const scaleY =
			this.originalDimensions.height / (this.imageElement.height * this.zoomFactor);

		const cropX = this.cropArea.x * scaleX;
		const cropY = this.cropArea.y * scaleY;
		const cropWidth = this.cropArea.width * scaleX;
		const cropHeight = this.cropArea.height * scaleY;

		canvas.width = cropWidth;
		canvas.height = cropHeight;

		ctx.drawImage(
			this.imageElement,
			cropX,
			cropY,
			cropWidth,
			cropHeight,
			0,
			0,
			cropWidth,
			cropHeight
		);

		this.originalDimensions = { width: cropWidth, height: cropHeight };
		this.imageElement.style.display = "none";
		canvas.style.display = "block";
		this.isFiltered = true;

		this.stopCropping();
		this.applyFitMode();
	}

	updateCropOverlay(startX: number, startY: number, currentX: number, currentY: number): void {
		if (!this.cropOverlay) return;

		let x = Math.min(startX, currentX);
		let y = Math.min(startY, currentY);
		let width = Math.abs(currentX - startX);
		let height = Math.abs(currentY - startY);

		// Apply aspect ratio constraint if set
		if (this.aspectRatio) {
			const currentRatio = width / height;
			if (currentRatio > this.aspectRatio) {
				width = height * this.aspectRatio;
			} else {
				height = width / this.aspectRatio;
			}

			// Readjust position to center the constrained area
			if (currentX < startX) {
				x = startX - width;
			} else {
				x = startX;
			}
			if (currentY < startY) {
				y = startY - height;
			} else {
				y = startY;
			}
		}

		this.cropOverlay.style.left = `${x}px`;
		this.cropOverlay.style.top = `${y}px`;
		this.cropOverlay.style.width = `${width}px`;
		this.cropOverlay.style.height = `${height}px`;

		this.cropArea = { x, y, width, height };
		this.updateHandlePositions();
	}

	applyFilters(): void {
		if (!this.canvasElement || !this.canvasContext || !this.imageElement) {
			return;
		}

		const canvas = this.canvasElement;
		const ctx = this.canvasContext;

		canvas.width = this.originalDimensions.width;
		canvas.height = this.originalDimensions.height;

		const filterString = this.buildFilterString();
		ctx.filter = filterString;

		ctx.drawImage(this.imageElement, 0, 0);

		this.imageElement.style.display = "none";
		canvas.style.display = "block";
		this.isFiltered = true;

		this.updateImageTransform();
	}

	buildFilterString(): string {
		const filters = [];

		if (this.filters.brightness !== 100) {
			filters.push(`brightness(${this.filters.brightness}%)`);
		}
		if (this.filters.contrast !== 100) {
			filters.push(`contrast(${this.filters.contrast}%)`);
		}
		if (this.filters.saturation !== 100) {
			filters.push(`saturate(${this.filters.saturation}%)`);
		}
		if (this.filters.hue !== 0) {
			filters.push(`hue-rotate(${this.filters.hue}deg)`);
		}
		if (this.filters.blur > 0) {
			filters.push(`blur(${this.filters.blur}px)`);
		}
		if (this.filters.sepia > 0) {
			filters.push(`sepia(${this.filters.sepia}%)`);
		}
		if (this.filters.grayscale > 0) {
			filters.push(`grayscale(${this.filters.grayscale}%)`);
		}

		return filters.length > 0 ? filters.join(" ") : "none";
	}

	setFilter(filterType: keyof ImageFilterState, value: number): void {
		this.filters[filterType] = value;
		if (this.isFiltered) {
			this.applyFilters();
		}
	}

	resetFilters(): void {
		this.filters = {
			brightness: 100,
			contrast: 100,
			saturation: 100,
			hue: 0,
			blur: 0,
			sepia: 0,
			grayscale: 0
		};

		if (this.isFiltered) {
			this.applyFilters();
		}
	}

	resetImage(): void {
		if (this.imageElement && this.canvasElement) {
			this.imageElement.style.display = "block";
			this.canvasElement.style.display = "none";
			this.isFiltered = false;
		}
		this.resetFilters();
		this.stopCropping();
	}

	exportImage(format: "png" | "jpeg" | "webp" = "png", quality = 0.92): string | null {
		// const activeElement = this.isFiltered ? this.canvasElement : this.imageElement;

		if (this.isFiltered && this.canvasElement) {
			return this.canvasElement.toDataURL(`image/${format}`, quality);
		} else if (this.imageElement) {
			const tempCanvas = document.createElement("canvas");
			const tempCtx = tempCanvas.getContext("2d");

			if (!tempCtx) return null;

			tempCanvas.width = this.originalDimensions.width;
			tempCanvas.height = this.originalDimensions.height;
			tempCtx.drawImage(this.imageElement, 0, 0);

			return tempCanvas.toDataURL(`image/${format}`, quality);
		}

		return null;
	}

	handleKeyDown(event: KeyboardEvent): void {
		if (!this.container.contains(document.activeElement)) return;

		switch (event.key) {
			case "c":
				if (event.ctrlKey || event.metaKey) {
					event.preventDefault();
					if (this.isCropping) {
						this.applyCrop();
					} else {
						this.startCropping();
					}
				}
				break;
			case "Escape":
				if (this.isCropping) {
					this.stopCropping();
				}
				break;
			case "r":
				if (event.ctrlKey || event.metaKey) {
					event.preventDefault();
					this.resetImage();
				}
				break;
		}
	}

	override destroy(): void {
		super.destroy();

		if (this.objectUrl) {
			URL.revokeObjectURL(this.objectUrl);
		}

		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}

		// Clean up crop handles
		this.cropHandles.forEach((handle) => {
			handle.remove();
		});
		this.cropHandles = [];

		document.removeEventListener("mousemove", this.handleMouseMove);
		document.removeEventListener("mouseup", this.handleMouseUp);
		document.removeEventListener("keydown", this.handleKeyDown);

		this.imageElement = null;
		this.canvasElement = null;
		this.canvasContext = null;
		this.imageWrapper = null;
		this.cropOverlay = null;
		this.isDragging = false;
		this.isCropping = false;
		this.isDraggingCrop = false;
		this.isResizingCrop = false;
	}
}

RendererFactory.register(SUPPORTED_FORMATS.IMAGE_PNG, ImageRenderer);
RendererFactory.register(SUPPORTED_FORMATS.IMAGE_JPEG, ImageRenderer);
RendererFactory.register(SUPPORTED_FORMATS.IMAGE_SVG, ImageRenderer);

export default ImageRenderer;
