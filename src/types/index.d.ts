export interface DocumentSource {
	url?: string;
	file?: File | Blob;
	arrayBuffer?: ArrayBuffer;
}

export interface ViewerOptions {
	enableAnnotations?: boolean;
	enableSearch?: boolean;
	enableThumbnails?: boolean;
	enableToolbar?: boolean;
	enableCache?: boolean;
	theme?: "default" | "dark" | "tailwind";
	customCSS?: string;
	virtualScrolling?: boolean;
	showThumbnails?: boolean;
	autoFitSlide?: boolean;
}

export interface DocumentInfo {
	totalPages: number;
	title: string;
	dimensions?: { width: number; height: number };
	sheets?: SheetInfo[];
	slideCount?: number;
	hasNotes?: boolean;
}

export interface SheetInfo {
	name: string;
	range: any;
	rowCount: number;
	colCount: number;
}

export interface PageChangeEvent {
	page: number;
	totalPages: number;
	sheetName?: string;
	slideTitle?: string;
}

export interface ZoomChangeEvent {
	zoom: number;
}

export interface SearchResult {
	slideTitle?: string;
	page?: number;
	slideIndex?: number;
	sheet?: number;
	row?: number;
	col?: number;
	text?: string;
	match: string;
	context?: {
		before: string;
		match: string;
		after: string;
	};
	address?: string;
	index?: number;
	length?: number;
}

export interface SearchResultEvent {
	query: string;
	results: SearchResult[];
	currentIndex: number;
}

export interface Annotation {
	id?: string;
	type: "highlight" | "note" | "text";
	content?: string;
	page?: number;
	position?: {
		x: number;
		y: number;
		width?: number;
		height?: number;
	};
	timestamp?: string;
}

export interface EventCallback<T = any> {
	(data: T): void;
}

export interface ThumbnailData {
	page: number;
	element: HTMLElement;
}

export declare const SUPPORTED_FORMATS: {
	readonly PDF: "application/pdf";
	readonly DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
	readonly IMAGE_PNG: "image/png";
	readonly IMAGE_JPEG: "image/jpeg";
	readonly IMAGE_SVG: "image/svg+xml";
	readonly XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
	readonly CSV: "text/csv";
	readonly PPTX: "application/vnd.openxmlformats-officedocument.presentationml.presentation";
	readonly PPT: "application/vnd.ms-powerpoint";
};

export declare const EVENTS: {
	readonly DOCUMENT_LOADED: "document:loaded";
	readonly PAGE_CHANGED: "page:changed";
	readonly ZOOM_CHANGED: "zoom:changed";
	readonly SEARCH_RESULT: "search:result";
	readonly ANNOTATION_ADDED: "annotation:added";
	readonly ANNOTATION_REMOVED: "annotation:removed";
	readonly ERROR: "error";
};

export declare abstract class BaseRenderer {
	protected container: HTMLElement;
	protected options: ViewerOptions;
	public currentPage: number;
	public totalPages: number;
	public zoomFactor: number;
	public annotations: Map<string, Annotation>;
	public eventListeners: Map<string, Set<EventCallback>>;

	constructor(container: HTMLElement, options?: ViewerOptions);

	abstract load(source: string | File | Blob): Promise<void>;
	abstract render(): Promise<void>;
	abstract search(query: string): Promise<SearchResult[]>;

	goto(page: number): Promise<boolean>;
	zoom(factor: number): Promise<void>;
	addAnnotation(annotation: Annotation): string;
	removeAnnotation(id: string): boolean;
	exportAnnotations(): Annotation[];
	importAnnotations(annotations: Annotation[]): void;
	on(event: string, callback: EventCallback): void;
	off(event: string, callback: EventCallback): void;
	emit(event: string, data: any): void;
	destroy(): void;
}

export declare class DocumentDetector {
	static detectType(source: string | File | Blob): Promise<string>;
}

export declare class RendererFactory {
	static register(mimeType: string, rendererClass: typeof BaseRenderer): void;
	static create(mimeType: string, container: HTMLElement, options?: ViewerOptions): BaseRenderer;
}

export declare class BukaViewer {
	private container: HTMLElement;
	private options: ViewerOptions;
	private currentRenderer: BaseRenderer | null;
	private thumbnails: ThumbnailData[];
	private eventListeners?: Map<string, Set<EventCallback>>;

	constructor(container: HTMLElement | string, options?: ViewerOptions);

	load(source: string | File | Blob): Promise<void>;
	on(event: keyof typeof EVENTS, callback: EventCallback): void;
	emit(event: string, data: any): void;

	getCurrentPage(): number;
	getTotalPages(): number;
	getZoom(): number;
	addAnnotation(annotation: Annotation): string | undefined;
	exportAnnotations(): Annotation[];

	generateThumbnails(): Promise<void>;
	toggleThumbnails(): void;
	showThumbnails(): void;
	hideThumbnails(): void;

	performSearch(): void;
	clearSearch(): void;

	toggleFullscreen(): void;
	destroy(): void;
}

export declare class PDFRenderer extends BaseRenderer {
	public pdfDocument: any;
	public canvas: HTMLCanvasElement;
	public context: CanvasRenderingContext2D;
	public textLayer: HTMLElement;
	public searchResults: SearchResult[];
	public currentSearchIndex: number;

	constructor(container: HTMLElement, options?: ViewerOptions);

	load(source: string | File | Blob): Promise<void>;
	render(): Promise<void>;
	search(query: string): Promise<SearchResult[]>;
	goto(page: number): Promise<boolean>;
	zoom(factor: number): Promise<void>;
	getDocumentTitle(): Promise<string>;
}

export declare class ImageRenderer extends BaseRenderer {
	public imageElement: HTMLImageElement;
	public imageWrapper: HTMLElement;
	public originalDimensions: { width: number; height: number };
	public containerDimensions: { width: number; height: number };
	public panState: { x: number; y: number };
	public fitMode: "fit-width" | "fit-height" | "fit-page" | "original";

	constructor(container: HTMLElement, options?: ViewerOptions);

	load(source: string | File | Blob): Promise<void>;
	render(): Promise<void>;
	search(query: string): Promise<SearchResult[]>;
	zoom(factor: number): Promise<void>;
	setFitMode(mode: "fit-width" | "fit-height" | "fit-page" | "original"): void;
	fitToWidth(): void;
	fitToHeight(): void;
	fitToPage(): void;
	actualSize(): void;
	resetView(): void;
    handleMouseDown(event: MouseEvent): void;
    handleMouseMove(event: MouseEvent): void;
    handleMouseUp(event: MouseEvent): void;
    handleTouchStart(event: MouseEvent): void;
    handleTouchMove(event: MouseEvent): void;
    handleTouchEnd(event: MouseEvent): void;
    handleWheel(event: WheelEvent): void;
    setFitMode(mode: "fit-width" | "fit-height" | "fit-page" | "original"): void;
    applyFitMode(): void;
    centerImage(): void;
    resetView(): void;
    getImageTitle(source: string | File | Blob): string;
    getViewInfo(): void;
    brighten(amount: number = 10): void;
    darken(amount: number = 10): void;
    increaseContrast(amount: number = 10): void;
    decreaseContrast(amount: number = 10): void;
    saturate(amount: number = 10): void;
    desaturate(amount: number = 10): void;
    rotateHue(amount: number = 30): void;
    addBlur(amount: number = 1): void;
    toGrayscale(): void;
    toSepia(): void;
    getFilters(): ImageFilterState;
    getCropArea(): CropArea | null;
    fitToWidth(): void;
    fitToHeight(): void;
    fitToPage(): void;
    actualSize(): void;
    createCropHandles(): void;
    updateHandlePositions(): void;
    startCropping(): void;
    showCropHandles(): void;
    hideCropHandles(): void;
    startCropResize(event: MouseEvent, handle: string): void;
    startCropDrag(event: MouseEvent): void;
    updateCropResize(event: MouseEvent): void;
    updateCropDrag(event: MouseEvent): void;
    updateCropDisplay(): void;
    setAspectRatio(ratio: number | null): void;
    getAspectRatio(): number | null;
    stopCropping(): void;
    applyCrop(): void;
    updateCropOverlay(startX: number, startY: number, currentX: number, currentY: number): void;
    applyFilters(): void;
    buildFilterString(): string;
    setFilter(filterType: keyof ImageFilterState, value: number): void;
    resetFilters(): void;
    resetImage(): void;
    exportImage(format: "png" | "jpeg" | "webp" = "png", quality = 0.92): string | null;
    handleKeyDown(event: KeyboardEvent): void;
}

export declare class DocxRenderer extends BaseRenderer {
	public documentHtml: string;
	public documentContainer: HTMLElement;
	public searchableText: string;
	public searchResults: SearchResult[];
	public currentSearchIndex: number;

	constructor(container: HTMLElement, options?: ViewerOptions);

	load(source: string | File | Blob): Promise<void>;
	render(): Promise<void>;
	search(query: string): Promise<SearchResult[]>;
	zoom(factor: number): Promise<void>;
	getWordCount(): number;
	getOutline(): Array<{ id: string; text: string; level: number; element: HTMLElement }>;
	navigateToHeading(headingId: string): boolean;
}

export declare class XlsxRenderer extends BaseRenderer {
	public workbook: any;
	public worksheets: any[];
	public currentSheetIndex: number;
	public currentSheetData: any[][];
	public gridContainer: HTMLElement;
	public virtualScrolling: boolean;

	constructor(container: HTMLElement, options?: ViewerOptions);

	load(source: string | File | Blob): Promise<void>;
	render(): Promise<void>;
	search(query: string): Promise<SearchResult[]>;
	zoom(factor: number): Promise<void>;
	switchToSheet(sheetIndex: number): Promise<void>;
	exportToCSV(): string;
	downloadCSV(): void;
	getSheetStats(): any;
	nextSearchResult(): void;
	previousSearchResult(): void;
}

export declare class PresentationRenderer extends BaseRenderer {
	public slides: any[];
	public currentSlideIndex: number;
	public slideContainer: HTMLElement;
	public slideNavigation: HTMLElement;
	public searchResults: SearchResult[];
	public currentSearchIndex: number;

	constructor(container: HTMLElement, options?: ViewerOptions);

	load(source: string | File | Blob): Promise<void>;
	render(): Promise<void>;
	search(query: string): Promise<SearchResult[]>;
	zoom(factor: number): Promise<void>;
	goToSlide(slideIndex: number): Promise<boolean>;
	nextSlide(): Promise<boolean>;
	previousSlide(): Promise<boolean>;
	getCurrentSlide(): any;
	getSlideNotes(): string;
	enterPresentationMode(): void;
	exitPresentationMode(): void;
}

export default BukaViewer;
