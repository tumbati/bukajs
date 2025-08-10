import { EVENTS } from "./config";

/**
 * Base Document Renderer Interface
 * All specific renderers must implement these methods
 */
export class BaseRenderer {
	constructor(container, options = {}) {
		this.container = container;
		this.options = options;
		this.currentPage = 1;
		this.totalPages = 1;
		this.zoom = 1.0;
		this.annotations = new Map();
		this.eventListeners = new Map();
	}

	async load(source) {
		throw new Error("load() must be implemented by subclass");
	}

	async render() {
		throw new Error("render() must be implemented by subclass");
	}

	async goto(page) {
		if (page < 1 || page > this.totalPages) return false;
		this.currentPage = page;
		await this.render();
		this.emit(EVENTS.PAGE_CHANGED, { page, totalPages: this.totalPages });
		return true;
	}

	async zoom(factor) {
		this.zoom = Math.max(0.1, Math.min(5.0, factor));
		await this.render();
		this.emit(EVENTS.ZOOM_CHANGED, { zoom: this.zoom });
	}

	async search(query) {
		throw new Error("search() must be implemented by subclass");
	}

	addAnnotation(annotation) {
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

	removeAnnotation(id) {
		const annotation = this.annotations.get(id);
		if (annotation) {
			this.annotations.delete(id);
			this.emit(EVENTS.ANNOTATION_REMOVED, annotation);
			return true;
		}
		return false;
	}

	exportAnnotations() {
		return Array.from(this.annotations.values());
	}

	importAnnotations(annotations) {
		annotations.forEach((ann) => {
			this.annotations.set(ann.id, ann);
		});
	}

	on(event, callback) {
		if (!this.eventListeners.has(event)) {
			this.eventListeners.set(event, new Set());
		}
		this.eventListeners.get(event).add(callback);
	}

	off(event, callback) {
		const listeners = this.eventListeners.get(event);
		if (listeners) {
			listeners.delete(callback);
		}
	}

	emit(event, data) {
		const listeners = this.eventListeners.get(event);
		if (listeners) {
			listeners.forEach((callback) => callback(data));
		}
	}

	destroy() {
		this.eventListeners.clear();
		this.annotations.clear();
		if (this.container) {
			this.container.innerHTML = "";
		}
	}
}
