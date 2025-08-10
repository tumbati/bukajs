import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

describe("ImageRenderer", () => {
	let container;
	let renderer;
	let ImageRenderer;

	beforeEach(async () => {
		const module = await import("../../src/renderers/image.js");
		ImageRenderer = module.default;

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
			expect(renderer.zoom).toBe(1.0);
			expect(renderer.fitMode).toBe("fit-page");
			expect(renderer.panState).toEqual({ x: 0, y: 0 });
		});

		test("should create image element and wrapper", () => {
			expect(renderer.imageElement).toBeInstanceOf(HTMLImageElement);
			expect(renderer.imageWrapper).toBeInstanceOf(HTMLElement);
			expect(renderer.imageWrapper.className).toContain("buka-image-wrapper");
		});
	});

	describe("load", () => {
		test("should load image from File", async () => {
			const mockFile = new File(["image data"], "test.png", { type: "image/png" });

			// Mock URL.createObjectURL
			const mockUrl = "blob:mock-url";
			vi.spyOn(URL, "createObjectURL").mockReturnValue(mockUrl);

			const loadPromise = renderer.load(mockFile);

			// Simulate image load
			setTimeout(() => {
				renderer.imageElement.dispatchEvent(new Event("load"));
			}, 10);

			await loadPromise;

			expect(renderer.imageElement.src).toBe(mockUrl);
			expect(renderer.totalPages).toBe(1);
		});

		test("should load image from URL string", async () => {
			const imageUrl = "https://example.com/image.jpg";

			const loadPromise = renderer.load(imageUrl);

			// Simulate image load
			setTimeout(() => {
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

			// Simulate image load
			setTimeout(() => {
				renderer.imageElement.dispatchEvent(new Event("load"));
			}, 10);

			await loadPromise;

			expect(renderer.imageElement.src).toBe(mockUrl);
		});

		test("should emit DOCUMENT_LOADED event", async () => {
			const callback = vi.fn();
			renderer.on("document:loaded", callback);

			const mockFile = new File(["image data"], "test.png", { type: "image/png" });

			const loadPromise = renderer.load(mockFile);

			// Simulate image load with dimensions
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

			// Simulate image error
			setTimeout(() => {
				renderer.imageElement.dispatchEvent(new Event("error"));
			}, 10);

			await expect(loadPromise).rejects.toThrow("Failed to load image");
		});
	});

	describe("render", () => {
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

		test("should apply zoom transform", async () => {
			renderer.zoom = 1.5;
			await renderer.render();

			const transform = renderer.imageElement.style.transform;
			expect(transform).toContain("scale(1.5)");
		});

		test("should apply pan transform", async () => {
			renderer.panState = { x: 50, y: 30 };
			await renderer.render();

			const transform = renderer.imageElement.style.transform;
			expect(transform).toContain("translate(50px, 30px)");
		});

		test("should combine zoom and pan transforms", async () => {
			renderer.zoom = 1.2;
			renderer.panState = { x: 20, y: 40 };
			await renderer.render();

			const transform = renderer.imageElement.style.transform;
			expect(transform).toContain("translate(20px, 40px)");
			expect(transform).toContain("scale(1.2)");
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

		test("should set zoom level", async () => {
			await renderer.zoom(1.5);

			expect(renderer.zoom).toBe(1.5);
		});

		test("should clamp zoom to valid range", async () => {
			await renderer.zoom(0.05);
			expect(renderer.zoom).toBe(0.1);

			await renderer.zoom(20.0);
			expect(renderer.zoom).toBe(10.0);
		});

		test("should emit ZOOM_CHANGED event", async () => {
			const callback = vi.fn();
			renderer.on("zoom:changed", callback);

			await renderer.zoom(2.0);

			expect(callback).toHaveBeenCalledWith({ zoom: 2.0 });
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
		});

		test("should fit to width", () => {
			renderer.fitToWidth();

			// Should calculate zoom based on container width vs image width
			const expectedZoom = container.offsetWidth / 1200;
			expect(renderer.zoom).toBeCloseTo(expectedZoom, 2);
			expect(renderer.fitMode).toBe("fit-width");
		});

		test("should fit to height", () => {
			renderer.fitToHeight();

			// Should calculate zoom based on container height vs image height
			const expectedZoom = container.offsetHeight / 800;
			expect(renderer.zoom).toBeCloseTo(expectedZoom, 2);
			expect(renderer.fitMode).toBe("fit-height");
		});

		test("should fit to page", () => {
			renderer.fitToPage();

			// Should calculate zoom to fit both dimensions
			const widthZoom = container.offsetWidth / 1200;
			const heightZoom = container.offsetHeight / 800;
			const expectedZoom = Math.min(widthZoom, heightZoom);

			expect(renderer.zoom).toBeCloseTo(expectedZoom, 2);
			expect(renderer.fitMode).toBe("fit-page");
		});

		test("should show actual size", () => {
			renderer.actualSize();

			expect(renderer.zoom).toBe(1.0);
			expect(renderer.fitMode).toBe("original");
		});

		test("should reset view", () => {
			renderer.panState = { x: 100, y: 200 };
			renderer.zoom = 2.0;

			renderer.resetView();

			expect(renderer.panState).toEqual({ x: 0, y: 0 });
			expect(renderer.fitMode).toBe("fit-page");
			// Should recalculate zoom for fit-page
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
			renderer.on("search:result", callback);

			await renderer.search("test");

			expect(callback).toHaveBeenCalledWith({
				query: "test",
				results: [],
				currentIndex: -1
			});
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

		test("should handle mouse wheel zoom", () => {
			const initialZoom = renderer.zoom;

			// Mock wheel event (zoom in)
			const wheelEvent = new WheelEvent("wheel", {
				deltaY: -100,
				clientX: 400,
				clientY: 300
			});

			renderer.imageWrapper.dispatchEvent(wheelEvent);

			expect(renderer.zoom).toBeGreaterThan(initialZoom);
		});

		test("should handle panning with mouse drag", () => {
			const initialPan = { ...renderer.panState };

			// Start drag
			const mouseDownEvent = new MouseEvent("mousedown", {
				clientX: 100,
				clientY: 100
			});
			renderer.imageWrapper.dispatchEvent(mouseDownEvent);

			// Mock drag
			const mouseMoveEvent = new MouseEvent("mousemove", {
				clientX: 150,
				clientY: 120
			});
			document.dispatchEvent(mouseMoveEvent);

			// End drag
			const mouseUpEvent = new MouseEvent("mouseup");
			document.dispatchEvent(mouseUpEvent);

			expect(renderer.panState.x).not.toBe(initialPan.x);
			expect(renderer.panState.y).not.toBe(initialPan.y);
		});
	});

	describe("error handling", () => {
		test("should handle invalid image sources", async () => {
			const loadPromise = renderer.load("invalid-url");

			setTimeout(() => {
				renderer.imageElement.dispatchEvent(new Event("error"));
			}, 10);

			await expect(loadPromise).rejects.toThrow("Failed to load image");
		});

		test("should handle missing files gracefully", async () => {
			const loadPromise = renderer.load("nonexistent.png");

			setTimeout(() => {
				renderer.imageElement.dispatchEvent(new Event("error"));
			}, 10);

			await expect(loadPromise).rejects.toThrow("Failed to load image");
		});
	});

	describe("cleanup", () => {
		beforeEach(async () => {
			const mockFile = new File(["image data"], "test.png", { type: "image/png" });

			const loadPromise = renderer.load(mockFile);

			setTimeout(() => {
				renderer.imageElement.dispatchEvent(new Event("load"));
			}, 10);

			await loadPromise;
		});

		test("should cleanup resources on destroy", () => {
			const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL");

			renderer.destroy();

			expect(renderer.eventListeners.size).toBe(0);
			expect(renderer.annotations.size).toBe(0);
			expect(container.innerHTML).toBe("");

			// Should revoke object URL if it was a blob
			if (renderer.imageElement.src.startsWith("blob:")) {
				expect(revokeObjectURLSpy).toHaveBeenCalled();
			}
		});

		test("should remove event listeners on destroy", () => {
			const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

			renderer.destroy();

			expect(removeEventListenerSpy).toHaveBeenCalled();
		});
	});
});
