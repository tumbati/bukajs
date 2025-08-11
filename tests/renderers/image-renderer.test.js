import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { EVENTS } from "../../src/core/index.ts";

describe("ImageRenderer", () => {
	let container;
	let renderer;
	let ImageRenderer;

	beforeEach(async () => {
		const module = await import("../../src/renderers/image.ts");
		ImageRenderer = module.ImageRenderer;

		container = document.createElement("div");
		container.style.width = "800px";
		container.style.height = "600px";
		document.body.appendChild(container);

		renderer = new ImageRenderer(container);
	});

	afterEach(() => {
		if (renderer) {
			renderer.destroy();
		}
		if (container && container.parentNode) {
			container.parentNode.removeChild(container);
		}
		vi.clearAllMocks();
	});

	describe("constructor", () => {
		test("should initialize with default values", () => {
			expect(renderer.container).toBe(container);
			expect(renderer.currentPage).toBe(1);
			expect(renderer.totalPages).toBe(1);
			expect(renderer.zoomFactor).toBe(1.0);
			expect(renderer.zoom).toBe(1.0);
			expect(renderer.fitMode).toBe("fit-width");
			expect(renderer.panState).toEqual({ x: 0, y: 0 });
			expect(renderer.isDragging).toBe(false);
		});

		test("should create image element and wrapper", () => {
			expect(renderer.imageElement).toBeInstanceOf(HTMLImageElement);
			expect(renderer.imageWrapper).toBeInstanceOf(HTMLElement);
			expect(renderer.imageWrapper.className).toContain("buka-image-wrapper");
		});

		test("should setup container dimensions tracking", () => {
			expect(renderer.containerDimensions).toEqual({ width: 0, height: 0 });
			expect(renderer.originalDimensions).toEqual({ width: 0, height: 0 });
		});
	});

	describe("load functionality", () => {
		test("should load image from File", async () => {
			const mockFile = new File(["image data"], "test.png", { type: "image/png" });

			const mockUrl = "blob:mock-url";
			vi.spyOn(URL, "createObjectURL").mockReturnValue(mockUrl);

			const loadPromise = renderer.load(mockFile);

			setTimeout(() => {
				Object.defineProperty(renderer.imageElement, "naturalWidth", { value: 800 });
				Object.defineProperty(renderer.imageElement, "naturalHeight", { value: 600 });
				renderer.imageElement.dispatchEvent(new Event("load"));
			}, 10);

			await loadPromise;

			expect(renderer.imageElement.src).toBe(mockUrl);
			expect(renderer.totalPages).toBe(1);
			expect(renderer.originalDimensions).toEqual({ width: 800, height: 600 });
		});

		test("should load image from URL string", async () => {
			const imageUrl = "https://example.com/image.jpg";

			const loadPromise = renderer.load(imageUrl);

			setTimeout(() => {
				Object.defineProperty(renderer.imageElement, "naturalWidth", { value: 400 });
				Object.defineProperty(renderer.imageElement, "naturalHeight", { value: 300 });
				renderer.imageElement.dispatchEvent(new Event("load"));
			}, 10);

			await loadPromise;

			expect(renderer.imageElement.src).toBe(imageUrl);
		});

		test("should load image from Blob", async () => {
			const mockBlob = new Blob(["image data"], { type: "image/jpeg" });

			const mockUrl = "blob:mock-blob-url";
			vi.spyOn(URL, "createObjectURL").mockReturnValue(mockUrl);

			const loadPromise = renderer.load(mockBlob);

			setTimeout(() => {
				Object.defineProperty(renderer.imageElement, "naturalWidth", { value: 500 });
				Object.defineProperty(renderer.imageElement, "naturalHeight", { value: 400 });
				renderer.imageElement.dispatchEvent(new Event("load"));
			}, 10);

			await loadPromise;

			expect(renderer.imageElement.src).toBe(mockUrl);
		});

		test("should emit DOCUMENT_LOADED event", async () => {
			const callback = vi.fn();
			renderer.on(EVENTS.DOCUMENT_LOADED, callback);

			const mockFile = new File(["image data"], "test.png", { type: "image/png" });

			const loadPromise = renderer.load(mockFile);

			setTimeout(() => {
				Object.defineProperty(renderer.imageElement, "naturalWidth", { value: 800 });
				Object.defineProperty(renderer.imageElement, "naturalHeight", { value: 600 });
				renderer.imageElement.dispatchEvent(new Event("load"));
			}, 10);

			await loadPromise;

			expect(callback).toHaveBeenCalledWith({
				totalPages: 1,
				title: "test.png",
				dimensions: { width: 800, height: 600 }
			});
		});

		test("should handle load errors", async () => {
			const mockFile = new File(["invalid image"], "invalid.png", { type: "image/png" });

			const loadPromise = renderer.load(mockFile);

			setTimeout(() => {
				renderer.imageElement.dispatchEvent(new Event("error"));
			}, 10);

			await expect(loadPromise).rejects.toThrow("Failed to load image");
		});
	});

	describe("zoom functionality", () => {
		beforeEach(async () => {
			const mockFile = new File(["image data"], "test.png", { type: "image/png" });

			const loadPromise = renderer.load(mockFile);

			setTimeout(() => {
				Object.defineProperty(renderer.imageElement, "naturalWidth", { value: 400 });
				Object.defineProperty(renderer.imageElement, "naturalHeight", { value: 300 });
				renderer.imageElement.dispatchEvent(new Event("load"));
			}, 10);

			await loadPromise;
		});

		test("should set zoom level using setZoom", async () => {
			await renderer.setZoom(1.5);
			expect(renderer.zoom).toBe(1.5);
		});

		test("should clamp zoom to valid range", async () => {
			await renderer.setZoom(0.05);
			expect(renderer.zoom).toBe(0.1);

			await renderer.setZoom(20.0);
			expect(renderer.zoom).toBe(10.0);
		});

		test("should emit ZOOM_CHANGED event", async () => {
			const callback = vi.fn();
			renderer.on(EVENTS.ZOOM_CHANGED, callback);

			await renderer.setZoom(2.0);

			expect(callback).toHaveBeenCalledWith({ zoom: 2.0 });
		});

		test("should update image transform on zoom", async () => {
			await renderer.setZoom(1.5);
			await renderer.render();

			const transform = renderer.imageElement.style.transform;
			expect(transform).toContain("scale(1.5");
		});
	});

	describe("fit modes", () => {
		beforeEach(async () => {
			const mockFile = new File(["image data"], "test.png", { type: "image/png" });

			const loadPromise = renderer.load(mockFile);

			setTimeout(() => {
				Object.defineProperty(renderer.imageElement, "naturalWidth", { value: 1200 });
				Object.defineProperty(renderer.imageElement, "naturalHeight", { value: 800 });
				renderer.imageElement.dispatchEvent(new Event("load"));
			}, 10);

			await loadPromise;

			vi.spyOn(renderer.container, "getBoundingClientRect").mockReturnValue({
				width: 800,
				height: 600,
				top: 0,
				left: 0,
				bottom: 600,
				right: 800
			});
			renderer.updateContainerDimensions();
		});

		test("should fit to width", () => {
			renderer.fitToWidth();

			const expectedZoom = 800 / 1200;
			expect(renderer.zoom).toBeCloseTo(expectedZoom, 2);
			expect(renderer.fitMode).toBe("fit-width");
		});

		test("should fit to height", () => {
			renderer.fitToHeight();

			const expectedZoom = 600 / 800;
			expect(renderer.zoom).toBeCloseTo(expectedZoom, 2);
			expect(renderer.fitMode).toBe("fit-height");
		});

		test("should fit to page", () => {
			renderer.fitToPage();

			const widthZoom = 800 / 1200;
			const heightZoom = 600 / 800;
			const expectedZoom = Math.min(widthZoom, heightZoom);

			expect(renderer.zoom).toBeCloseTo(expectedZoom, 2);
			expect(renderer.fitMode).toBe("fit-page");
		});

		test("should show actual size", () => {
			renderer.actualSize();

			expect(renderer.zoom).toBe(1.0);
			expect(renderer.fitMode).toBe("original");
		});

		test("should reset view", async () => {
			renderer.panState = { x: 100, y: 200 };
			await renderer.setZoom(2.0);

			renderer.resetView();

			expect(renderer.fitMode).toBe("fit-page");
		});
	});

	describe("pan functionality", () => {
		beforeEach(async () => {
			const mockFile = new File(["image data"], "test.png", { type: "image/png" });

			const loadPromise = renderer.load(mockFile);

			setTimeout(() => {
				Object.defineProperty(renderer.imageElement, "naturalWidth", { value: 800 });
				Object.defineProperty(renderer.imageElement, "naturalHeight", { value: 600 });
				renderer.imageElement.dispatchEvent(new Event("load"));
			}, 10);

			await loadPromise;
		});

		test("should apply pan transform", async () => {
			renderer.panState = { x: 50, y: 30 };
			await renderer.render();

			const transform = renderer.imageElement.style.transform;
			expect(transform).toContain("translate(50px, 30px)");
		});

		test("should combine zoom and pan transforms", async () => {
			await renderer.setZoom(1.2);
			renderer.panState = { x: 20, y: 40 };
			await renderer.render();

			const transform = renderer.imageElement.style.transform;
			expect(transform).toContain("translate(20px, 40px)");
			expect(transform).toContain("scale(1.2");
		});
	});

	describe("navigation", () => {
		beforeEach(async () => {
			const mockFile = new File(["image data"], "test.png", { type: "image/png" });

			const loadPromise = renderer.load(mockFile);

			setTimeout(() => {
				renderer.imageElement.dispatchEvent(new Event("load"));
			}, 10);

			await loadPromise;
		});

		test("should handle goto for single image (always page 1)", async () => {
			const result1 = await renderer.goto(1);
			const result2 = await renderer.goto(2);

			expect(result1).toBe(true);
			expect(result2).toBe(false);
			expect(renderer.currentPage).toBe(1);
		});
	});

	describe("search functionality", () => {
		beforeEach(async () => {
			const mockFile = new File(["image data"], "test.png", { type: "image/png" });

			const loadPromise = renderer.load(mockFile);

			setTimeout(() => {
				renderer.imageElement.dispatchEvent(new Event("load"));
			}, 10);

			await loadPromise;
		});

		test("should return empty results for search (images don't have searchable text)", async () => {
			const results = await renderer.search("any query");
			expect(results).toEqual([]);
		});

		test("should emit SEARCH_RESULT event with empty results", async () => {
			const callback = vi.fn();
			renderer.on(EVENTS.SEARCH_RESULT, callback);

			await renderer.search("test");

			expect(callback).toHaveBeenCalledWith({
				query: "test",
				results: [],
				currentIndex: 0
			});
		});
	});

	describe("utility methods", () => {
		test("should get image title from different source types", () => {
			expect(renderer.getImageTitle("https://example.com/test.png")).toBe("test.png");
			expect(renderer.getImageTitle("path/to/image.jpg")).toBe("image.jpg");

			const file = new File([], "myimage.png");
			expect(renderer.getImageTitle(file)).toBe("myimage.png");

			const blob = new Blob();
			expect(renderer.getImageTitle(blob)).toBe("Image");
		});

		test("should get view info", async () => {
			await renderer.setZoom(1.5);
			renderer.panState = { x: 10, y: 20 };

			const viewInfo = renderer.getViewInfo();

			expect(viewInfo).toMatchObject({
				zoom: 1.5,
				pan: { x: 10, y: 20 },
				fitMode: "fit-width"
			});
		});
	});

	describe("mouse interaction", () => {
		beforeEach(async () => {
			const mockFile = new File(["image data"], "test.png", { type: "image/png" });

			const loadPromise = renderer.load(mockFile);

			setTimeout(() => {
				Object.defineProperty(renderer.imageElement, "naturalWidth", { value: 800 });
				Object.defineProperty(renderer.imageElement, "naturalHeight", { value: 600 });
				renderer.imageElement.dispatchEvent(new Event("load"));
			}, 10);

			await loadPromise;
		});

		test("should handle mouse drag for panning", () => {
			const mouseDownEvent = new MouseEvent("mousedown", {
				button: 0,
				clientX: 100,
				clientY: 100
			});
			renderer.imageWrapper.dispatchEvent(mouseDownEvent);

			expect(renderer.isDragging).toBe(true);

			const mouseMoveEvent = new MouseEvent("mousemove", {
				clientX: 150,
				clientY: 120
			});
			document.dispatchEvent(mouseMoveEvent);

			const mouseUpEvent = new MouseEvent("mouseup");
			document.dispatchEvent(mouseUpEvent);

			expect(renderer.isDragging).toBe(false);
		});

		test("should handle touch events for panning", () => {
			if (typeof Touch === "undefined") {
				return;
			}

			const touchStartEvent = new TouchEvent("touchstart", {
				touches: [
					new Touch({
						identifier: 0,
						target: renderer.imageWrapper,
						clientX: 100,
						clientY: 100
					})
				]
			});
			renderer.imageWrapper.dispatchEvent(touchStartEvent);

			expect(renderer.isDragging).toBe(true);

			const touchEndEvent = new TouchEvent("touchend", { touches: [] });
			renderer.imageWrapper.dispatchEvent(touchEndEvent);

			expect(renderer.isDragging).toBe(false);
		});
	});

	describe("cleanup", () => {
		test("should cleanup resources on destroy", async () => {
			const mockFile = new File(["image data"], "test.png", { type: "image/png" });
			vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");

			const loadPromise = renderer.load(mockFile);
			setTimeout(() => renderer.imageElement.dispatchEvent(new Event("load")), 10);
			await loadPromise;

			const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL");

			renderer.destroy();

			expect(renderer.eventListeners.size).toBe(0);
			expect(renderer.annotations.size).toBe(0);
			expect(container.innerHTML).toBe("");

			if (renderer.objectUrl) {
				expect(revokeObjectURLSpy).toHaveBeenCalled();
			}
		});

		test("should disconnect resize observer on destroy", () => {
			const disconnectSpy = vi.spyOn(renderer.resizeObserver, "disconnect");

			renderer.destroy();

			expect(disconnectSpy).toHaveBeenCalled();
		});
	});
});
