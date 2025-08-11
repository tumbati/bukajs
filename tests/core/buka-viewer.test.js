import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { BukaViewer, EVENTS, RendererFactory } from "../../src/core/index.ts";

// Mock renderer for testing
class MockRenderer {
	constructor(container, options) {
		this.container = container;
		this.options = options;
		this.currentPage = 1;
		this.totalPages = 3;
		this.zoom = 1.0;
		this.eventListeners = new Map();
		this.annotations = new Map();
	}

	async load() {
		setTimeout(() => {
			this.emit(EVENTS.DOCUMENT_LOADED, {
				totalPages: 3,
				title: "Test Document"
			});
		}, 10);
	}

	async render() {
		// Mock render
	}

	async search() {
		return [];
	}

	async goto(page) {
		if (page >= 1 && page <= this.totalPages) {
			this.currentPage = page;
			this.emit(EVENTS.PAGE_CHANGED, { page, totalPages: this.totalPages });
			return true;
		}
		return false;
	}

	async zoom(factor) {
		this.zoom = Math.max(0.1, Math.min(5.0, factor));
		this.emit(EVENTS.ZOOM_CHANGED, { zoom: this.zoom });
	}

	on(event, callback) {
		if (!this.eventListeners.has(event)) {
			this.eventListeners.set(event, new Set());
		}
		this.eventListeners.get(event).add(callback);
	}

	emit(event, data) {
		const listeners = this.eventListeners.get(event);
		if (listeners) {
			listeners.forEach((callback) => callback(data));
		}
	}

	destroy() {
		this.eventListeners.clear();
	}

	addAnnotation() {
		return "mock-id";
	}

	exportAnnotations() {
		return [];
	}
}

describe("BukaViewer", () => {
	let container;
	let viewer;

	beforeEach(() => {
		// Register mock renderer
		RendererFactory.register("application/pdf", MockRenderer);

		// Create container
		container = document.createElement("div");
		document.body.appendChild(container);

		// Create viewer
		viewer = new BukaViewer(container, {
			enableToolbar: true,
			enableThumbnails: true,
			enableSearch: true
		});
	});

	afterEach(() => {
		if (viewer) {
			viewer.destroy();
		}
		if (container && container.parentNode) {
			container.parentNode.removeChild(container);
		}
		RendererFactory.renderers.clear();
	});

	describe("constructor", () => {
		test("should create viewer with DOM element", () => {
			expect(viewer.container).toBe(container);
			expect(viewer.options.enableToolbar).toBe(true);
			expect(viewer.options.enableThumbnails).toBe(true);
		});

		test("should create viewer with selector string", () => {
			const testContainer = document.createElement("div");
			testContainer.id = "test-viewer";
			document.body.appendChild(testContainer);

			const selectorViewer = new BukaViewer("#test-viewer");
			expect(selectorViewer.container).toBe(testContainer);

			selectorViewer.destroy();
			document.body.removeChild(testContainer);
		});

		test("should throw error for invalid container", () => {
			expect(() => {
				new BukaViewer("#non-existent");
			}).toThrow("Container element not found");
		});

		test("should apply default options", () => {
			const defaultViewer = new BukaViewer(container);
			expect(defaultViewer.options.enableAnnotations).toBe(true);
			expect(defaultViewer.options.enableSearch).toBe(true);
			expect(defaultViewer.options.theme).toBe("default");
		});

		test("should merge custom options with defaults", () => {
			const customViewer = new BukaViewer(container, {
				enableAnnotations: false,
				theme: "dark",
				customOption: "value"
			});

			expect(customViewer.options.enableAnnotations).toBe(false);
			expect(customViewer.options.enableSearch).toBe(true); // Default
			expect(customViewer.options.theme).toBe("dark");
			expect(customViewer.options.customOption).toBe("value");
		});
	});

	describe("UI initialization", () => {
		test("should create toolbar when enabled", () => {
			const toolbar = container.querySelector(".buka-toolbar");
			expect(toolbar).toBeTruthy();
			expect(toolbar.style.display).not.toBe("none");
		});

		test("should hide toolbar when disabled", () => {
			const noToolbarViewer = new BukaViewer(container, { enableToolbar: false });
			const toolbar = container.querySelector(".buka-toolbar");
			expect(toolbar.style.display).toBe("none");

			noToolbarViewer.destroy();
		});

		test("should create sidebar when thumbnails enabled", () => {
			const sidebar = container.querySelector("#sidebar");
			expect(sidebar).toBeTruthy();
		});

		test("should create navigation controls", () => {
			const prevBtn = container.querySelector("#prevPage");
			const nextBtn = container.querySelector("#nextPage");
			const pageInput = container.querySelector("#pageInput");

			expect(prevBtn).toBeTruthy();
			expect(nextBtn).toBeTruthy();
			expect(pageInput).toBeTruthy();
		});

		test("should create zoom controls", () => {
			const zoomOut = container.querySelector("#zoomOut");
			const zoomIn = container.querySelector("#zoomIn");
			const zoomLevel = container.querySelector("#zoomLevel");

			expect(zoomOut).toBeTruthy();
			expect(zoomIn).toBeTruthy();
			expect(zoomLevel).toBeTruthy();
		});

		test("should create search controls when enabled", () => {
			const searchInput = container.querySelector("#searchInput");
			const searchBtn = container.querySelector("#searchBtn");

			expect(searchInput).toBeTruthy();
			expect(searchBtn).toBeTruthy();
		});
	});

	describe("theme handling", () => {
		test("should apply default theme classes", () => {
			expect(container.classList.contains("buka-viewer")).toBe(true);
		});

		test("should apply dark theme", () => {
			const darkViewer = new BukaViewer(container, { theme: "dark" });
			expect(container.getAttribute("data-buka-theme")).toBe("dark");
			darkViewer.destroy();
		});

		test("should apply tailwind theme", () => {
			const tailwindViewer = new BukaViewer(container, { theme: "tailwind" });
			expect(container.getAttribute("data-buka-theme")).toBe("tailwind");
			tailwindViewer.destroy();
		});

		test("should inject custom CSS", () => {
			const customCSS = ".custom-style { color: red; }";
			const customViewer = new BukaViewer(container, { customCSS });

			const styleElements = document.head.querySelectorAll("style");
			const hasCustomCSS = Array.from(styleElements).some((style) =>
				style.textContent.includes(customCSS)
			);

			expect(hasCustomCSS).toBe(true);
			customViewer.destroy();
		});
	});

	describe("document loading", () => {
		test("should load document and create renderer", async () => {
			const mockFile = new File(["content"], "test.pdf", { type: "application/pdf" });

			await viewer.load(mockFile);

			expect(viewer.currentRenderer).toBeInstanceOf(MockRenderer);
		});

		test("should show loading indicator during load", () => {
			const loadingIndicator = container.querySelector("#loadingIndicator");
			expect(loadingIndicator).toBeTruthy();
		});

		test("should handle load errors", async () => {
			const errorCallback = vi.fn();
			viewer.on(EVENTS.ERROR, errorCallback);

			// Try to load unsupported format
			const invalidFile = new File(["content"], "test.txt", { type: "text/plain" });

			await expect(viewer.load(invalidFile)).rejects.toThrow();
			expect(errorCallback).toHaveBeenCalled();
		});

		test("should destroy previous renderer when loading new document", async () => {
			const mockFile1 = new File(["content1"], "test1.pdf", { type: "application/pdf" });
			const mockFile2 = new File(["content2"], "test2.pdf", { type: "application/pdf" });

			await viewer.load(mockFile1);
			const firstRenderer = viewer.currentRenderer;
			const destroySpy = vi.spyOn(firstRenderer, "destroy");

			await viewer.load(mockFile2);

			expect(destroySpy).toHaveBeenCalled();
			expect(viewer.currentRenderer).not.toBe(firstRenderer);
		});
	});

	describe("navigation controls", () => {
		beforeEach(async () => {
			const mockFile = new File(["content"], "test.pdf", { type: "application/pdf" });
			await viewer.load(mockFile);
		});

		test("should handle previous page button", () => {
			const gotoSpy = vi.spyOn(viewer.currentRenderer, "goto");
			viewer.currentRenderer.currentPage = 2;

			const prevBtn = container.querySelector("#prevPage");
			prevBtn.click();

			expect(gotoSpy).toHaveBeenCalledWith(1);
		});

		test("should handle next page button", () => {
			const gotoSpy = vi.spyOn(viewer.currentRenderer, "goto");

			const nextBtn = container.querySelector("#nextPage");
			nextBtn.click();

			expect(gotoSpy).toHaveBeenCalledWith(2);
		});

		test("should handle page input change", () => {
			const gotoSpy = vi.spyOn(viewer.currentRenderer, "goto");

			const pageInput = container.querySelector("#pageInput");
			pageInput.value = "3";
			pageInput.dispatchEvent(new Event("change"));

			expect(gotoSpy).toHaveBeenCalledWith(3);
		});
	});

	describe("zoom controls", () => {
		beforeEach(async () => {
			const mockFile = new File(["content"], "test.pdf", { type: "application/pdf" });
			await viewer.load(mockFile);
		});

		test("should handle zoom in", () => {
			const zoomSpy = vi.spyOn(viewer.currentRenderer, "setZoom");

			const zoomInBtn = container.querySelector("#zoomIn");
			zoomInBtn.click();

			expect(zoomSpy).toHaveBeenCalledWith(1.25);
		});

		test("should handle zoom out", () => {
			const zoomSpy = vi.spyOn(viewer.currentRenderer, "setZoom");

			const zoomOutBtn = container.querySelector("#zoomOut");
			zoomOutBtn.click();

			expect(zoomSpy).toHaveBeenCalledWith(0.8);
		});
	});

	describe("search functionality", () => {
		beforeEach(async () => {
			const mockFile = new File(["content"], "test.pdf", { type: "application/pdf" });
			await viewer.load(mockFile);
		});

		test("should perform search on button click", () => {
			const searchSpy = vi.spyOn(viewer.currentRenderer, "search");

			const searchInput = container.querySelector("#searchInput");
			const searchBtn = container.querySelector("#searchBtn");

			searchInput.value = "test query";
			searchBtn.click();

			expect(searchSpy).toHaveBeenCalledWith("test query");
		});

		test("should perform search on Enter key", () => {
			const searchSpy = vi.spyOn(viewer.currentRenderer, "search");

			const searchInput = container.querySelector("#searchInput");
			searchInput.value = "test query";

			const enterEvent = new KeyboardEvent("keyup", { key: "Enter" });
			searchInput.dispatchEvent(enterEvent);

			expect(searchSpy).toHaveBeenCalledWith("test query");
		});

		test("should clear search on Escape key", () => {
			const searchSpy = vi.spyOn(viewer.currentRenderer, "search");

			const searchInput = container.querySelector("#searchInput");
			searchInput.value = "test query";

			const escapeEvent = new KeyboardEvent("keyup", { key: "Escape" });
			searchInput.dispatchEvent(escapeEvent);

			expect(searchInput.value).toBe("");
			expect(searchSpy).toHaveBeenCalledWith("");
		});
	});

	describe("keyboard shortcuts", () => {
		beforeEach(async () => {
			const mockFile = new File(["content"], "test.pdf", { type: "application/pdf" });
			await viewer.load(mockFile);
		});

		test("should handle arrow key navigation", () => {
			const gotoSpy = vi.spyOn(viewer.currentRenderer, "goto");

			// Left arrow - previous page
			const leftArrow = new KeyboardEvent("keydown", { key: "ArrowLeft" });
			document.dispatchEvent(leftArrow);
			expect(gotoSpy).toHaveBeenCalledWith(0);

			// Right arrow - next page
			const rightArrow = new KeyboardEvent("keydown", { key: "ArrowRight" });
			document.dispatchEvent(rightArrow);
			expect(gotoSpy).toHaveBeenCalledWith(2);
		});

		test("should handle Home and End keys", () => {
			const gotoSpy = vi.spyOn(viewer.currentRenderer, "goto");

			const homeKey = new KeyboardEvent("keydown", { key: "Home" });
			document.dispatchEvent(homeKey);
			expect(gotoSpy).toHaveBeenCalledWith(1);

			const endKey = new KeyboardEvent("keydown", { key: "End" });
			document.dispatchEvent(endKey);
			expect(gotoSpy).toHaveBeenCalledWith(3);
		});

		test("should handle zoom keyboard shortcuts", () => {
			const zoomSpy = vi.spyOn(viewer.currentRenderer, "setZoom");

			// Ctrl/Cmd + Plus
			const zoomInEvent = new KeyboardEvent("keydown", { key: "+", ctrlKey: true });
			document.dispatchEvent(zoomInEvent);
			expect(zoomSpy).toHaveBeenCalledWith(1.25);

			// Ctrl/Cmd + Minus
			const zoomOutEvent = new KeyboardEvent("keydown", { key: "-", ctrlKey: true });
			document.dispatchEvent(zoomOutEvent);
			expect(zoomSpy).toHaveBeenCalledWith(0.8);

			// Ctrl/Cmd + 0 (reset zoom)
			const resetZoomEvent = new KeyboardEvent("keydown", { key: "0", ctrlKey: true });
			document.dispatchEvent(resetZoomEvent);
			expect(zoomSpy).toHaveBeenCalledWith(1.0);
		});

		test("should focus search input on Ctrl/Cmd + F", () => {
			const searchInput = container.querySelector("#searchInput");
			const focusSpy = vi.spyOn(searchInput, "focus");

			const searchShortcut = new KeyboardEvent("keydown", { key: "f", ctrlKey: true });
			document.dispatchEvent(searchShortcut);

			expect(focusSpy).toHaveBeenCalled();
		});

		test("should ignore shortcuts when input is focused", () => {
			const gotoSpy = vi.spyOn(viewer.currentRenderer, "goto");

			// Focus an input
			const searchInput = container.querySelector("#searchInput");
			searchInput.focus();

			const leftArrow = new KeyboardEvent("keydown", { key: "ArrowLeft" });
			document.dispatchEvent(leftArrow);

			// Should not trigger navigation when input is focused
			expect(gotoSpy).not.toHaveBeenCalled();
		});
	});

	describe("thumbnail functionality", () => {
		beforeEach(async () => {
			const mockFile = new File(["content"], "test.pdf", { type: "application/pdf" });
			await viewer.load(mockFile);
		});

		test("should toggle thumbnail sidebar", () => {
			const sidebar = container.querySelector("#sidebar");
			const toggleBtn = container.querySelector("#thumbnailToggle");

			// Initially visible
			expect(sidebar.style.display).toBe("block");

			toggleBtn.click();
			expect(sidebar.style.display).toBe("none");

			toggleBtn.click();
			expect(sidebar.style.display).toBe("block");
		});

		test("should close sidebar with close button", () => {
			const sidebar = container.querySelector("#sidebar");
			const closeBtn = container.querySelector("#closeSidebar");

			closeBtn.click();
			expect(sidebar.style.display).toBe("none");
		});
	});

	describe("fullscreen functionality", () => {
		test("should toggle fullscreen", () => {
			const requestFullscreenSpy = vi
				.spyOn(container, "requestFullscreen")
				.mockResolvedValue();

			const fullscreenBtn = container.querySelector("#fullscreenBtn");
			fullscreenBtn.click();

			expect(requestFullscreenSpy).toHaveBeenCalled();
		});
	});

	describe("public API", () => {
		beforeEach(async () => {
			const mockFile = new File(["content"], "test.pdf", { type: "application/pdf" });
			await viewer.load(mockFile);
		});

		test("should provide current page info", () => {
			expect(viewer.getCurrentPage()).toBe(1);
		});

		test("should provide total pages info", () => {
			expect(viewer.getTotalPages()).toBe(3);
		});

		test("should provide zoom info", () => {
			expect(viewer.getZoom()).toBe(1.0);
		});

		test("should proxy annotation methods", () => {
			const addSpy = vi.spyOn(viewer.currentRenderer, "addAnnotation");
			const exportSpy = vi.spyOn(viewer.currentRenderer, "exportAnnotations");

			const annotation = { type: "highlight", content: "test" };
			viewer.addAnnotation(annotation);
			viewer.exportAnnotations();

			expect(addSpy).toHaveBeenCalledWith(annotation);
			expect(exportSpy).toHaveBeenCalled();
		});
	});

	describe("event forwarding", () => {
		test("should forward renderer events", async () => {
			const documentLoadedCallback = vi.fn();
			const pageChangedCallback = vi.fn();
			const zoomChangedCallback = vi.fn();

			viewer.on(EVENTS.DOCUMENT_LOADED, documentLoadedCallback);
			viewer.on(EVENTS.PAGE_CHANGED, pageChangedCallback);
			viewer.on(EVENTS.ZOOM_CHANGED, zoomChangedCallback);

			const mockFile = new File(["content"], "test.pdf", { type: "application/pdf" });
			await viewer.load(mockFile);

			// Wait for async document loaded event
			await new Promise((resolve) => setTimeout(resolve, 20));

			expect(documentLoadedCallback).toHaveBeenCalled();

			// Test page change forwarding
			await viewer.currentRenderer.goto(2);
			expect(pageChangedCallback).toHaveBeenCalled();

			// Test zoom change forwarding
			await viewer.currentRenderer.setZoom(1.5);
			expect(zoomChangedCallback).toHaveBeenCalled();
		});
	});

	describe("cleanup", () => {
		test("should destroy resources on cleanup", async () => {
			const mockFile = new File(["content"], "test.pdf", { type: "application/pdf" });
			await viewer.load(mockFile);

			const rendererDestroySpy = vi.spyOn(viewer.currentRenderer, "destroy");

			viewer.destroy();

			expect(rendererDestroySpy).toHaveBeenCalled();
			expect(viewer.currentRenderer).toBe(null);
		});
	});
});
