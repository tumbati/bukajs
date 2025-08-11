import type { Annotation, EventCallback, SearchResult, ViewerOptions } from "../types";
import { EVENTS } from "./config";

/**
 * Base Document Renderer Interface
 * All specific renderers must implement these methods
 */
export abstract class BaseRenderer {
	protected container: HTMLElement;
	protected options: ViewerOptions;
	public currentPage: number;
	public totalPages: number;
	public zoomFactor: number;
	public annotations: Map<string, Annotation>;
	public eventListeners: Map<string, Set<EventCallback>>;
	public searchResults: SearchResult[];
	public currentSearchIndex: number;

	constructor(container: HTMLElement, options: ViewerOptions = {}) {
		this.container = container;
		this.options = options;
		this.currentPage = 1;
		this.totalPages = 1;
		this.zoomFactor = 1.0;
		this.annotations = new Map();
		this.eventListeners = new Map();
		this.searchResults = [];
		this.currentSearchIndex = 0;
	}

	abstract load(source: string | File | Blob): Promise<void>;

	abstract render(): Promise<void>;

	async goto(page: number): Promise<boolean> {
		if (page < 1 || page > this.totalPages) return false;
		this.currentPage = page;
		await this.render();
		this.emit(EVENTS.PAGE_CHANGED, { page, totalPages: this.totalPages });
		return true;
	}

	async setZoom(factor: number): Promise<void> {
		this.zoomFactor = Math.max(0.1, Math.min(5.0, factor));
		await this.render();
		this.emit(EVENTS.ZOOM_CHANGED, { zoom: this.zoomFactor });
	}

	abstract search(query: string): Promise<SearchResult[]>;

	addAnnotation(annotation: Omit<Annotation, "id" | "page" | "timestamp">): string {
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

	removeAnnotation(id: string): boolean {
		const annotation = this.annotations.get(id);
		if (annotation) {
			this.annotations.delete(id);
			this.emit(EVENTS.ANNOTATION_REMOVED, annotation);
			return true;
		}
		return false;
	}

	exportAnnotations(): Annotation[] {
		return Array.from(this.annotations.values());
	}

	importAnnotations(annotations: Annotation[]): void {
		annotations.forEach((ann) => {
			this.annotations.set(ann.id!, ann);
		});
	}

	on(event: string, callback: EventCallback): void {
		if (!this.eventListeners.has(event)) {
			this.eventListeners.set(event, new Set());
		}
		this.eventListeners.get(event)!.add(callback);
	}

	off(event: string, callback: EventCallback): void {
		const listeners = this.eventListeners.get(event);
		if (listeners) {
			listeners.delete(callback);
		}
	}

	emit(event: string, data: any): void {
		const listeners = this.eventListeners.get(event);
		if (listeners) {
			listeners.forEach((callback) => callback(data));
		}
	}

	get zoom(): number {
		return this.zoomFactor;
	}

	set zoom(value: number) {
		this.zoomFactor = value;
	}

	destroy(): void {
		this.eventListeners.clear();
		this.annotations.clear();
		if (this.container) {
			this.container.innerHTML = "";
		}
	}
}
