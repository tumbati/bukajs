import { describe, test, expect, vi, beforeEach } from "vitest";
import { BaseRenderer, EVENTS } from "../../src/core/index.ts";

class TestRenderer extends BaseRenderer {
	async load(_source) {
		this.totalPages = 5;
		this.emit(EVENTS.DOCUMENT_LOADED, {
			totalPages: this.totalPages,
			title: "Test Document"
		});
	}

	async render() {
		return Promise.resolve();
	}

	async search(query) {
		if (!query) return [];
		return [
			{
				page: 1,
				match: query,
				context: { before: "before ", match: query, after: " after" }
			}
		];
	}
}

describe("BaseRenderer", () => {
	let container;
	let renderer;

	beforeEach(() => {
		container = document.createElement("div");
		renderer = new TestRenderer(container);
	});

	describe("constructor", () => {
		test("should initialize with default values", () => {
			expect(renderer.container).toBe(container);
			expect(renderer.currentPage).toBe(1);
			expect(renderer.totalPages).toBe(1);
			expect(renderer.zoomFactor).toBe(1.0);
			expect(renderer.zoom).toBe(1.0);
			expect(renderer.annotations).toBeInstanceOf(Map);
			expect(renderer.eventListeners).toBeInstanceOf(Map);
			expect(renderer.searchResults).toEqual([]);
			expect(renderer.currentSearchIndex).toBe(0);
		});

		test("should accept options", () => {
			const options = { enableAnnotations: false, theme: "dark" };
			const rendererWithOptions = new TestRenderer(container, options);
			expect(rendererWithOptions.options).toEqual(options);
		});
	});

	describe("zoom functionality", () => {
		test("should have zoom getter", () => {
			renderer.zoomFactor = 1.5;
			expect(renderer.zoom).toBe(1.5);
		});

		test("should have zoom setter", () => {
			renderer.zoom = 2.0;
			expect(renderer.zoomFactor).toBe(2.0);
		});

		test("should set zoom level with setZoom method", async () => {
			await renderer.setZoom(1.5);
			expect(renderer.zoom).toBe(1.5);
		});

		test("should emit ZOOM_CHANGED event", async () => {
			const callback = vi.fn();
			renderer.on(EVENTS.ZOOM_CHANGED, callback);

			await renderer.setZoom(2.0);

			expect(callback).toHaveBeenCalledWith({ zoom: 2.0 });
		});

		test("should clamp zoom to valid range", async () => {
			await renderer.setZoom(0.05);
			expect(renderer.zoom).toBe(0.1);

			await renderer.setZoom(10.0);
			expect(renderer.zoom).toBe(5.0);
		});
	});

	describe("navigation", () => {
		beforeEach(async () => {
			await renderer.load("test");
		});

		test("should navigate to valid page", async () => {
			const result = await renderer.goto(3);
			expect(result).toBe(true);
			expect(renderer.currentPage).toBe(3);
		});

		test("should emit PAGE_CHANGED event", async () => {
			const callback = vi.fn();
			renderer.on(EVENTS.PAGE_CHANGED, callback);

			await renderer.goto(2);

			expect(callback).toHaveBeenCalledWith({
				page: 2,
				totalPages: 5
			});
		});

		test("should reject invalid page numbers", async () => {
			const result1 = await renderer.goto(0);
			const result2 = await renderer.goto(6);

			expect(result1).toBe(false);
			expect(result2).toBe(false);
			expect(renderer.currentPage).toBe(1);
		});
	});

	describe("annotations", () => {
		test("should add annotation", () => {
			const annotation = {
				type: "highlight",
				content: "Test annotation",
				position: { x: 100, y: 200, width: 50, height: 20 }
			};

			const id = renderer.addAnnotation(annotation);

			expect(typeof id).toBe("string");
			expect(id).toMatch(/^ann_\d+_[a-z0-9]+$/);
			expect(renderer.annotations.has(id)).toBe(true);

			const stored = renderer.annotations.get(id);
			expect(stored).toMatchObject({
				...annotation,
				id,
				page: 1,
				timestamp: expect.any(String)
			});
		});

		test("should emit ANNOTATION_ADDED event", () => {
			const callback = vi.fn();
			renderer.on(EVENTS.ANNOTATION_ADDED, callback);

			const annotation = { type: "note", content: "Test note" };
			const id = renderer.addAnnotation(annotation);

			expect(callback).toHaveBeenCalledWith(
				expect.objectContaining({
					...annotation,
					id,
					page: 1,
					timestamp: expect.any(String)
				})
			);
		});

		test("should remove annotation", () => {
			const annotation = { type: "highlight", content: "Test" };
			const id = renderer.addAnnotation(annotation);

			const result = renderer.removeAnnotation(id);

			expect(result).toBe(true);
			expect(renderer.annotations.has(id)).toBe(false);
		});

		test("should emit ANNOTATION_REMOVED event", () => {
			const callback = vi.fn();
			renderer.on(EVENTS.ANNOTATION_REMOVED, callback);

			const annotation = { type: "highlight", content: "Test" };
			const id = renderer.addAnnotation(annotation);
			const storedAnnotation = renderer.annotations.get(id);

			renderer.removeAnnotation(id);

			expect(callback).toHaveBeenCalledWith(storedAnnotation);
		});

		test("should return false for non-existent annotation removal", () => {
			const result = renderer.removeAnnotation("non-existent");
			expect(result).toBe(false);
		});

		test("should export annotations", () => {
			const annotation1 = { type: "highlight", content: "Test 1" };
			const annotation2 = { type: "note", content: "Test 2" };

			renderer.addAnnotation(annotation1);
			renderer.addAnnotation(annotation2);

			const exported = renderer.exportAnnotations();

			expect(exported).toHaveLength(2);
			expect(exported[0]).toMatchObject(annotation1);
			expect(exported[1]).toMatchObject(annotation2);
		});

		test("should import annotations", () => {
			const annotations = [
				{
					id: "imported-1",
					type: "highlight",
					content: "Imported annotation",
					page: 1,
					timestamp: "2023-01-01T00:00:00.000Z"
				}
			];

			renderer.importAnnotations(annotations);

			expect(renderer.annotations.size).toBe(1);
			expect(renderer.annotations.get("imported-1")).toEqual(annotations[0]);
		});
	});

	describe("event handling", () => {
		test("should register event listeners", () => {
			const callback = vi.fn();
			renderer.on(EVENTS.DOCUMENT_LOADED, callback);

			expect(renderer.eventListeners.has(EVENTS.DOCUMENT_LOADED)).toBe(true);
			expect(renderer.eventListeners.get(EVENTS.DOCUMENT_LOADED).has(callback)).toBe(true);
		});

		test("should remove event listeners", () => {
			const callback = vi.fn();
			renderer.on(EVENTS.DOCUMENT_LOADED, callback);
			renderer.off(EVENTS.DOCUMENT_LOADED, callback);

			expect(renderer.eventListeners.get(EVENTS.DOCUMENT_LOADED).has(callback)).toBe(false);
		});

		test("should handle multiple listeners for same event", () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			renderer.on(EVENTS.DOCUMENT_LOADED, callback1);
			renderer.on(EVENTS.DOCUMENT_LOADED, callback2);

			renderer.emit(EVENTS.DOCUMENT_LOADED, { test: true });

			expect(callback1).toHaveBeenCalledWith({ test: true });
			expect(callback2).toHaveBeenCalledWith({ test: true });
		});

		test("should handle non-existent event gracefully", () => {
			expect(() => {
				renderer.emit("non-existent-event", {});
			}).not.toThrow();
		});
	});

	describe("search functionality", () => {
		test("should return search results", async () => {
			const results = await renderer.search("test query");

			expect(results).toHaveLength(1);
			expect(results[0]).toMatchObject({
				page: 1,
				match: "test query",
				context: {
					before: "before ",
					match: "test query",
					after: " after"
				}
			});
		});

		test("should return empty array for empty query", async () => {
			const results = await renderer.search("");
			expect(results).toEqual([]);
		});
	});

	describe("destroy", () => {
		test("should clean up resources", () => {
			const callback = vi.fn();
			renderer.on(EVENTS.DOCUMENT_LOADED, callback);
			renderer.addAnnotation({ type: "highlight", content: "Test" });

			container.innerHTML = "<div>Test content</div>";

			renderer.destroy();

			expect(renderer.eventListeners.size).toBe(0);
			expect(renderer.annotations.size).toBe(0);
			expect(container.innerHTML).toBe("");
		});
	});
});
