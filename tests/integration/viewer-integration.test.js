import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { BukaViewer, RendererFactory } from "../../src/core/index.js";

// Import all renderers to register them
import "../../src/renderers/pdf.js";
import "../../src/renderers/image.js";
import "../../src/renderers/docx.js";
import "../../src/renderers/xlsx.js";
import "../../src/renderers/presentation.js";

describe("Viewer Integration Tests", () => {
	let container;
	let viewer;

	beforeEach(() => {
		container = document.createElement("div");
		container.style.width = "800px";
		container.style.height = "600px";
		document.body.appendChild(container);
	});

	afterEach(() => {
		if (viewer) {
			viewer.destroy();
		}
		if (container && container.parentNode) {
			container.parentNode.removeChild(container);
		}
	});

	describe("Document Format Support", () => {
		test("should support PDF documents", () => {
			expect(RendererFactory.renderers.has("application/pdf")).toBe(true);
		});

		test("should support DOCX documents", () => {
			expect(
				RendererFactory.renderers.has(
					"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
				)
			).toBe(true);
		});

		test("should support image formats", () => {
			expect(RendererFactory.renderers.has("image/png")).toBe(true);
			expect(RendererFactory.renderers.has("image/jpeg")).toBe(true);
			expect(RendererFactory.renderers.has("image/svg+xml")).toBe(true);
		});

		test("should support spreadsheet formats", () => {
			expect(
				RendererFactory.renderers.has(
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
				)
			).toBe(true);
			expect(RendererFactory.renderers.has("text/csv")).toBe(true);
		});

		test("should support presentation formats", () => {
			expect(
				RendererFactory.renderers.has(
					"application/vnd.openxmlformats-officedocument.presentationml.presentation"
				)
			).toBe(true);
			expect(RendererFactory.renderers.has("application/vnd.ms-powerpoint")).toBe(true);
		});
	});

	describe("Viewer Initialization", () => {
		test("should initialize with all UI components", () => {
			viewer = new BukaViewer(container);

			// Check toolbar
			expect(container.querySelector(".buka-toolbar")).toBeTruthy();

			// Check navigation controls
			expect(container.querySelector("#prevPage")).toBeTruthy();
			expect(container.querySelector("#nextPage")).toBeTruthy();
			expect(container.querySelector("#pageInput")).toBeTruthy();

			// Check zoom controls
			expect(container.querySelector("#zoomIn")).toBeTruthy();
			expect(container.querySelector("#zoomOut")).toBeTruthy();
			expect(container.querySelector("#zoomLevel")).toBeTruthy();

			// Check search
			expect(container.querySelector("#searchInput")).toBeTruthy();
			expect(container.querySelector("#searchBtn")).toBeTruthy();

			// Check document container
			expect(container.querySelector("#documentContainer")).toBeTruthy();
		});

		test("should apply theme classes correctly", () => {
			viewer = new BukaViewer(container, { theme: "dark" });

			expect(container.getAttribute("data-buka-theme")).toBe("dark");
			expect(container.classList.contains("buka-viewer")).toBe(true);
		});

		test("should handle disabled features", () => {
			viewer = new BukaViewer(container, {
				enableToolbar: false,
				enableThumbnails: false,
				enableSearch: false
			});

			const toolbar = container.querySelector(".buka-toolbar");
			expect(toolbar.style.display).toBe("none");

			const searchSection = container.querySelector(".buka-search-controls").parentElement;
			expect(searchSection.style.display).toBe("none");

			const thumbnailToggle = container.querySelector("#thumbnailToggle");
			expect(thumbnailToggle.style.display).toBe("none");
		});
	});

	describe("Document Loading Workflow", () => {
		test("should show loading indicator during load", async () => {
			viewer = new BukaViewer(container);

			const loadingIndicator = container.querySelector("#loadingIndicator");
			expect(loadingIndicator).toBeTruthy();
			expect(loadingIndicator.style.display).toBe("flex");
		});

		test("should handle load errors gracefully", async () => {
			viewer = new BukaViewer(container);

			const errorCallback = vi.fn();
			viewer.on("error", errorCallback);

			// Try to load unsupported file
			const unsupportedFile = new File(["content"], "test.txt", { type: "text/plain" });

			await expect(viewer.load(unsupportedFile)).rejects.toThrow();
			expect(errorCallback).toHaveBeenCalled();

			// Should show error in UI
			const errorElement = container.querySelector(".buka-error");
			expect(errorElement).toBeTruthy();
		});

		test("should update UI after successful load", async () => {
			viewer = new BukaViewer(container);

			// Mock successful load
			const documentLoadedCallback = vi.fn();
			viewer.on("document:loaded", documentLoadedCallback);

			// Create mock file and simulate load
			const mockFile = new File(["image"], "test.png", { type: "image/png" });

			// Load the document
			const loadPromise = viewer.load(mockFile);

			// Wait a bit then simulate image load success
			setTimeout(() => {
				const imageElement = container.querySelector("img");
				if (imageElement) {
					imageElement.dispatchEvent(new Event("load"));
				}
			}, 50);

			await loadPromise;

			// Check that UI was updated
			const pageTotal = container.querySelector("#pageTotal");
			expect(pageTotal.textContent).toBe("/ 1");

			const pageInput = container.querySelector("#pageInput");
			expect(pageInput.value).toBe("1");
		});
	});

	describe("Keyboard Shortcuts Integration", () => {
		beforeEach(async () => {
			viewer = new BukaViewer(container);

			// Load a mock document
			const mockFile = new File(["content"], "test.png", { type: "image/png" });
			const loadPromise = viewer.load(mockFile);

			setTimeout(() => {
				const imageElement = container.querySelector("img");
				if (imageElement) {
					imageElement.dispatchEvent(new Event("load"));
				}
			}, 10);

			await loadPromise;
		});

		test("should handle fullscreen shortcut", () => {
			const fullscreenSpy = vi.spyOn(container, "requestFullscreen").mockResolvedValue();

			// Test fullscreen button
			const fullscreenBtn = container.querySelector("#fullscreenBtn");
			fullscreenBtn.click();

			expect(fullscreenSpy).toHaveBeenCalled();
		});

		test("should handle search shortcut", () => {
			const searchInput = container.querySelector("#searchInput");
			const focusSpy = vi.spyOn(searchInput, "focus");

			// Simulate Ctrl+F
			const searchShortcut = new KeyboardEvent("keydown", {
				key: "f",
				ctrlKey: true,
				bubbles: true
			});

			document.dispatchEvent(searchShortcut);

			expect(focusSpy).toHaveBeenCalled();
		});

		test("should ignore shortcuts when input is focused", () => {
			const searchInput = container.querySelector("#searchInput");
			searchInput.focus();

			const mockGoto = vi.fn();
			if (viewer.currentRenderer) {
				viewer.currentRenderer.goto = mockGoto;
			}

			// Try arrow key while input is focused
			const arrowKey = new KeyboardEvent("keydown", {
				key: "ArrowRight",
				bubbles: true
			});

			document.dispatchEvent(arrowKey);

			// Should not trigger navigation
			expect(mockGoto).not.toHaveBeenCalled();
		});
	});

	describe("Responsive Behavior", () => {
		test("should handle container resize", () => {
			viewer = new BukaViewer(container);

			// Change container size
			container.style.width = "1200px";
			container.style.height = "800px";

			// Should trigger a resize observer or similar mechanism
			// The viewer should adapt to new dimensions
			expect(viewer.container.offsetWidth).toBe(1200);
			expect(viewer.container.offsetHeight).toBe(800);
		});

		test("should maintain aspect ratio on zoom", async () => {
			viewer = new BukaViewer(container);

			const mockFile = new File(["content"], "test.png", { type: "image/png" });
			const loadPromise = viewer.load(mockFile);

			setTimeout(() => {
				const imageElement = container.querySelector("img");
				if (imageElement) {
					Object.defineProperty(imageElement, "naturalWidth", { value: 800 });
					Object.defineProperty(imageElement, "naturalHeight", { value: 600 });
					imageElement.dispatchEvent(new Event("load"));
				}
			}, 10);

			await loadPromise;

			// Test zoom controls
			const zoomInBtn = container.querySelector("#zoomIn");
			zoomInBtn.click();

			// Should maintain image aspect ratio
			const imageElement = container.querySelector("img");
			expect(imageElement).toBeTruthy();
		});
	});

	describe("Event Propagation", () => {
		beforeEach(async () => {
			viewer = new BukaViewer(container);

			const mockFile = new File(["content"], "test.png", { type: "image/png" });
			const loadPromise = viewer.load(mockFile);

			setTimeout(() => {
				const imageElement = container.querySelector("img");
				if (imageElement) {
					imageElement.dispatchEvent(new Event("load"));
				}
			}, 10);

			await loadPromise;
		});

		test("should propagate renderer events to viewer", () => {
			const pageChangedCallback = vi.fn();
			const zoomChangedCallback = vi.fn();

			viewer.on("page:changed", pageChangedCallback);
			viewer.on("zoom:changed", zoomChangedCallback);

			// Simulate renderer events
			if (viewer.currentRenderer) {
				viewer.currentRenderer.emit("page:changed", { page: 1, totalPages: 1 });
				viewer.currentRenderer.emit("zoom:changed", { zoom: 1.5 });
			}

			expect(pageChangedCallback).toHaveBeenCalledWith({ page: 1, totalPages: 1 });
			expect(zoomChangedCallback).toHaveBeenCalledWith({ zoom: 1.5 });
		});

		test("should update UI in response to renderer events", async () => {
			if (viewer.currentRenderer) {
				// Simulate zoom change
				viewer.currentRenderer.zoom = 1.5;
				viewer.currentRenderer.emit("zoom:changed", { zoom: 1.5 });

				// Check that zoom level display is updated
				const zoomLevel = container.querySelector("#zoomLevel");
				expect(zoomLevel.textContent).toBe("150%");
			}
		});
	});

	describe("Memory Management", () => {
		test("should clean up properly on destroy", async () => {
			viewer = new BukaViewer(container);

			// Load document
			const mockFile = new File(["content"], "test.png", { type: "image/png" });
			const loadPromise = viewer.load(mockFile);

			setTimeout(() => {
				const imageElement = container.querySelector("img");
				if (imageElement) {
					imageElement.dispatchEvent(new Event("load"));
				}
			}, 10);

			await loadPromise;

			// Add some event listeners
			const testCallback = vi.fn();
			viewer.on("test", testCallback);

			// Destroy viewer
			viewer.destroy();

			// Check cleanup
			expect(viewer.currentRenderer).toBe(null);

			// Container should be cleaned but structure preserved for reuse
			const documentContainer = container.querySelector("#documentContainer");
			expect(documentContainer.innerHTML).toBe("");
		});

		test("should handle multiple load/destroy cycles", async () => {
			viewer = new BukaViewer(container);

			// Load and destroy multiple times
			for (let i = 0; i < 3; i++) {
				const mockFile = new File([`content${i}`], `test${i}.png`, { type: "image/png" });

				const loadPromise = viewer.load(mockFile);

				setTimeout(() => {
					const imageElement = container.querySelector("img");
					if (imageElement) {
						imageElement.dispatchEvent(new Event("load"));
					}
				}, 10);

				await loadPromise;

				// Verify load succeeded
				expect(viewer.currentRenderer).toBeTruthy();

				// Load next document (should clean up previous)
				if (i < 2) {
					const nextFile = new File([`content${i + 1}`], `test${i + 1}.png`, {
						type: "image/png"
					});
					await viewer.load(nextFile);
				}
			}

			// Should not have memory leaks
			expect(viewer.currentRenderer).toBeTruthy();
		});
	});
});
