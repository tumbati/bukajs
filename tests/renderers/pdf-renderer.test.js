import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// Mock PDF.js before importing the renderer
vi.mock("pdfjs-dist", () => ({
	getDocument: vi.fn(() => ({
		promise: Promise.resolve({
			numPages: 3,
			getPage: vi.fn((pageNum) =>
				Promise.resolve({
					pageNumber: pageNum,
					getViewport: vi.fn(({ scale = 1 }) => ({
						width: 100 * scale,
						height: 150 * scale,
						scale
					})),
					render: vi.fn(({ canvasContext, viewport }) => ({
						promise: Promise.resolve()
					})),
					getTextContent: vi.fn(() =>
						Promise.resolve({
							items: [
								{ str: "Sample", transform: [1, 0, 0, 1, 10, 10] },
								{ str: "PDF", transform: [1, 0, 0, 1, 50, 10] },
								{ str: "content", transform: [1, 0, 0, 1, 90, 10] }
							]
						})
					),
					getAnnotations: vi.fn(() => Promise.resolve([]))
				})
			),
			getMetadata: vi.fn(() =>
				Promise.resolve({
					info: { Title: "Test PDF Document" }
				})
			)
		})
	})),
	GlobalWorkerOptions: {
		workerSrc: ""
	}
}));

describe("PDFRenderer", () => {
	let container;
	let renderer;
	let PDFRenderer;

	beforeEach(async () => {
		// Import after mocking
		const module = await import("../../src/renderers/pdf.js");
		PDFRenderer = module.default;

		container = document.createElement("div");
		container.style.width = "800px";
		container.style.height = "600px";
		document.body.appendChild(container);

		renderer = new PDFRenderer(container);
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
			expect(renderer.searchResults).toEqual([]);
			expect(renderer.currentSearchIndex).toBe(-1);
		});

		test("should create canvas element", () => {
			expect(renderer.canvas).toBeInstanceOf(HTMLCanvasElement);
			expect(renderer.context).toBeTruthy();
		});

		test("should create text layer", () => {
			expect(renderer.textLayer).toBeInstanceOf(HTMLElement);
			expect(renderer.textLayer.className).toContain("buka-text-layer");
		});
	});

	describe("load", () => {
		test("should load PDF from File", async () => {
			const mockFile = new File(["pdf content"], "test.pdf", { type: "application/pdf" });

			await renderer.load(mockFile);

			expect(renderer.pdfDocument).toBeTruthy();
			expect(renderer.totalPages).toBe(3);
		});

		test("should load PDF from URL string", async () => {
			await renderer.load("test.pdf");

			expect(renderer.pdfDocument).toBeTruthy();
			expect(renderer.totalPages).toBe(3);
		});

		test("should load PDF from Blob", async () => {
			const mockBlob = new Blob(["pdf content"], { type: "application/pdf" });

			await renderer.load(mockBlob);

			expect(renderer.pdfDocument).toBeTruthy();
		});

		test("should emit DOCUMENT_LOADED event", async () => {
			const callback = vi.fn();
			renderer.on("document:loaded", callback);

			const mockFile = new File(["pdf content"], "test.pdf", { type: "application/pdf" });
			await renderer.load(mockFile);

			expect(callback).toHaveBeenCalledWith({
				totalPages: 3,
				title: "Test PDF Document"
			});
		});

		test("should handle load errors", async () => {
			// Mock PDF.js to throw error
			const pdfjsModule = await import("pdfjs-dist");
			vi.mocked(pdfjsModule.getDocument).mockImplementation(() => ({
				promise: Promise.reject(new Error("Invalid PDF"))
			}));

			await expect(renderer.load("invalid.pdf")).rejects.toThrow("Invalid PDF");
		});
	});

	describe("render", () => {
		beforeEach(async () => {
			const mockFile = new File(["pdf content"], "test.pdf", { type: "application/pdf" });
			await renderer.load(mockFile);
		});

		test("should render current page", async () => {
			const renderSpy = vi.spyOn(renderer.pdfDocument, "getPage");

			await renderer.render();

			expect(renderSpy).toHaveBeenCalledWith(1);
		});

		test("should update canvas dimensions", async () => {
			await renderer.render();

			expect(renderer.canvas.width).toBeGreaterThan(0);
			expect(renderer.canvas.height).toBeGreaterThan(0);
		});

		test("should render text layer", async () => {
			await renderer.render();

			// Should have called getTextContent
			expect(renderer.textLayer.children.length).toBeGreaterThan(0);
		});

		test("should apply zoom to viewport", async () => {
			renderer.zoom = 1.5;
			const page = await renderer.pdfDocument.getPage(1);
			const getViewportSpy = vi.spyOn(page, "getViewport");

			await renderer.render();

			expect(getViewportSpy).toHaveBeenCalledWith({ scale: 1.5 });
		});
	});

	describe("navigation", () => {
		beforeEach(async () => {
			const mockFile = new File(["pdf content"], "test.pdf", { type: "application/pdf" });
			await renderer.load(mockFile);
		});

		test("should navigate to valid page", async () => {
			const result = await renderer.goto(2);

			expect(result).toBe(true);
			expect(renderer.currentPage).toBe(2);
		});

		test("should reject invalid page numbers", async () => {
			const result1 = await renderer.goto(0);
			const result2 = await renderer.goto(5);

			expect(result1).toBe(false);
			expect(result2).toBe(false);
			expect(renderer.currentPage).toBe(1);
		});

		test("should emit PAGE_CHANGED event", async () => {
			const callback = vi.fn();
			renderer.on("page:changed", callback);

			await renderer.goto(2);

			expect(callback).toHaveBeenCalledWith({
				page: 2,
				totalPages: 3
			});
		});

		test("should re-render after navigation", async () => {
			const renderSpy = vi.spyOn(renderer, "render");

			await renderer.goto(2);

			expect(renderSpy).toHaveBeenCalled();
		});
	});

	describe("zoom", () => {
		beforeEach(async () => {
			const mockFile = new File(["pdf content"], "test.pdf", { type: "application/pdf" });
			await renderer.load(mockFile);
		});

		test("should set zoom level", async () => {
			await renderer.zoom(1.5);

			expect(renderer.zoom).toBe(1.5);
		});

		test("should clamp zoom to valid range", async () => {
			await renderer.zoom(0.05);
			expect(renderer.zoom).toBe(0.1);

			await renderer.zoom(10.0);
			expect(renderer.zoom).toBe(5.0);
		});

		test("should emit ZOOM_CHANGED event", async () => {
			const callback = vi.fn();
			renderer.on("zoom:changed", callback);

			await renderer.zoom(1.5);

			expect(callback).toHaveBeenCalledWith({ zoom: 1.5 });
		});

		test("should re-render after zoom", async () => {
			const renderSpy = vi.spyOn(renderer, "render");

			await renderer.zoom(1.5);

			expect(renderSpy).toHaveBeenCalled();
		});
	});

	describe("search", () => {
		beforeEach(async () => {
			const mockFile = new File(["pdf content"], "test.pdf", { type: "application/pdf" });
			await renderer.load(mockFile);
		});

		test("should search for text across pages", async () => {
			const results = await renderer.search("PDF");

			expect(results).toHaveLength(1);
			expect(results[0]).toMatchObject({
				page: 1,
				match: "PDF",
				context: expect.objectContaining({
					before: expect.any(String),
					match: "PDF",
					after: expect.any(String)
				})
			});
		});

		test("should return empty array for no matches", async () => {
			const results = await renderer.search("nonexistent");

			expect(results).toEqual([]);
		});

		test("should clear search results for empty query", async () => {
			// First search for something
			await renderer.search("PDF");
			expect(renderer.searchResults.length).toBeGreaterThan(0);

			// Then clear with empty query
			const results = await renderer.search("");

			expect(results).toEqual([]);
			expect(renderer.searchResults).toEqual([]);
		});

		test("should emit SEARCH_RESULT event", async () => {
			const callback = vi.fn();
			renderer.on("search:result", callback);

			const results = await renderer.search("PDF");

			expect(callback).toHaveBeenCalledWith({
				query: "PDF",
				results,
				currentIndex: 0
			});
		});

		test("should handle case-insensitive search", async () => {
			const results1 = await renderer.search("pdf");
			const results2 = await renderer.search("PDF");

			expect(results1.length).toBe(results2.length);
		});
	});

	describe("fit methods", () => {
		beforeEach(async () => {
			const mockFile = new File(["pdf content"], "test.pdf", { type: "application/pdf" });
			await renderer.load(mockFile);
		});

		test("should fit to width", async () => {
			await renderer.fitToWidth();

			// Should calculate zoom based on container width
			const expectedZoom = container.offsetWidth / 100; // 100 is mock page width
			expect(renderer.zoom).toBeCloseTo(expectedZoom, 1);
		});

		test("should fit to page", async () => {
			await renderer.fitToPage();

			// Should calculate zoom to fit both width and height
			const widthZoom = container.offsetWidth / 100;
			const heightZoom = container.offsetHeight / 150;
			const expectedZoom = Math.min(widthZoom, heightZoom);

			expect(renderer.zoom).toBeCloseTo(expectedZoom, 1);
		});
	});

	describe("document title", () => {
		beforeEach(async () => {
			const mockFile = new File(["pdf content"], "test.pdf", { type: "application/pdf" });
			await renderer.load(mockFile);
		});

		test("should get document title from metadata", async () => {
			const title = await renderer.getDocumentTitle();

			expect(title).toBe("Test PDF Document");
		});

		test("should fallback to filename when no title in metadata", async () => {
			// Mock metadata without title
			vi.spyOn(renderer.pdfDocument, "getMetadata").mockResolvedValue({
				info: {}
			});

			const title = await renderer.getDocumentTitle();

			expect(title).toBe("Unknown Document");
		});
	});

	describe("annotations", () => {
		beforeEach(async () => {
			const mockFile = new File(["pdf content"], "test.pdf", { type: "application/pdf" });
			await renderer.load(mockFile);
		});

		test("should add annotation", () => {
			const annotation = {
				type: "highlight",
				content: "Test highlight",
				position: { x: 100, y: 200, width: 50, height: 20 }
			};

			const id = renderer.addAnnotation(annotation);

			expect(typeof id).toBe("string");
			expect(renderer.annotations.has(id)).toBe(true);
		});

		test("should remove annotation", () => {
			const annotation = { type: "note", content: "Test note" };
			const id = renderer.addAnnotation(annotation);

			const result = renderer.removeAnnotation(id);

			expect(result).toBe(true);
			expect(renderer.annotations.has(id)).toBe(false);
		});

		test("should export annotations", () => {
			const annotation1 = { type: "highlight", content: "Test 1" };
			const annotation2 = { type: "note", content: "Test 2" };

			renderer.addAnnotation(annotation1);
			renderer.addAnnotation(annotation2);

			const exported = renderer.exportAnnotations();

			expect(exported).toHaveLength(2);
		});
	});

	describe("error handling", () => {
		test("should handle PDF loading errors gracefully", async () => {
			const pdfjsModule = await import("pdfjs-dist");
			vi.mocked(pdfjsModule.getDocument).mockImplementation(() => ({
				promise: Promise.reject(new Error("Corrupted PDF"))
			}));

			await expect(renderer.load("corrupted.pdf")).rejects.toThrow("Corrupted PDF");
		});

		test("should handle render errors gracefully", async () => {
			const mockFile = new File(["pdf content"], "test.pdf", { type: "application/pdf" });
			await renderer.load(mockFile);

			// Mock render to throw error
			const page = await renderer.pdfDocument.getPage(1);
			vi.spyOn(page, "render").mockImplementation(() => ({
				promise: Promise.reject(new Error("Render failed"))
			}));

			await expect(renderer.render()).rejects.toThrow("Render failed");
		});
	});

	describe("cleanup", () => {
		beforeEach(async () => {
			const mockFile = new File(["pdf content"], "test.pdf", { type: "application/pdf" });
			await renderer.load(mockFile);
		});

		test("should cleanup resources on destroy", () => {
			renderer.destroy();

			expect(renderer.eventListeners.size).toBe(0);
			expect(renderer.annotations.size).toBe(0);
			expect(container.innerHTML).toBe("");
		});
	});
});
