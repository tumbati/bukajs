import { describe, test, expect, beforeEach } from "vitest";
import { RendererFactory, BaseRenderer } from "../../src/core/index.ts";

class MockRenderer extends BaseRenderer {
	async load() {
		this.totalPages = 1;
	}

	async render() {}

	async search() {
		return [];
	}
}

class AnotherMockRenderer extends BaseRenderer {
	async load() {
		this.totalPages = 2;
	}

	async render() {}

	async search() {
		return [];
	}
}

describe("RendererFactory", () => {
	beforeEach(() => {
		RendererFactory.renderers.clear();
	});

	describe("register", () => {
		test("should register a renderer for a MIME type", () => {
			RendererFactory.register("application/pdf", MockRenderer);

			expect(RendererFactory.renderers.has("application/pdf")).toBe(true);
			expect(RendererFactory.renderers.get("application/pdf")).toBe(MockRenderer);
		});

		test("should register multiple renderers", () => {
			RendererFactory.register("application/pdf", MockRenderer);
			RendererFactory.register("image/png", AnotherMockRenderer);

			expect(RendererFactory.renderers.size).toBe(2);
			expect(RendererFactory.renderers.has("application/pdf")).toBe(true);
			expect(RendererFactory.renderers.has("image/png")).toBe(true);
		});

		test("should overwrite existing renderer registration", () => {
			RendererFactory.register("application/pdf", MockRenderer);
			RendererFactory.register("application/pdf", AnotherMockRenderer);

			expect(RendererFactory.renderers.size).toBe(1);
			expect(RendererFactory.renderers.get("application/pdf")).toBe(AnotherMockRenderer);
		});
	});

	describe("create", () => {
		beforeEach(() => {
			RendererFactory.register("application/pdf", MockRenderer);
			RendererFactory.register("image/png", AnotherMockRenderer);
		});

		test("should create renderer instance for registered MIME type", () => {
			const container = document.createElement("div");
			const renderer = RendererFactory.create("application/pdf", container);

			expect(renderer).toBeInstanceOf(MockRenderer);
			expect(renderer).toBeInstanceOf(BaseRenderer);
			expect(renderer.container).toBe(container);
		});

		test("should create renderer with options", () => {
			const container = document.createElement("div");
			const options = { enableAnnotations: false, theme: "dark" };
			const renderer = RendererFactory.create("application/pdf", container, options);

			expect(renderer).toBeInstanceOf(MockRenderer);
			expect(renderer.options).toEqual(options);
		});

		test("should create different renderer types", () => {
			const container = document.createElement("div");

			const pdfRenderer = RendererFactory.create("application/pdf", container);
			const imageRenderer = RendererFactory.create("image/png", container);

			expect(pdfRenderer).toBeInstanceOf(MockRenderer);
			expect(imageRenderer).toBeInstanceOf(AnotherMockRenderer);
			expect(pdfRenderer).not.toBe(imageRenderer);
		});

		test("should throw error for unregistered MIME type", () => {
			const container = document.createElement("div");

			expect(() => {
				RendererFactory.create("application/unknown", container);
			}).toThrow("No renderer available for type: application/unknown");
		});

		test("should throw error for null/undefined MIME type", () => {
			const container = document.createElement("div");

			expect(() => {
				RendererFactory.create(null, container);
			}).toThrow("No renderer available for type: null");

			expect(() => {
				RendererFactory.create(undefined, container);
			}).toThrow("No renderer available for type: undefined");
		});

		test("should work with empty options", () => {
			const container = document.createElement("div");
			const renderer = RendererFactory.create("application/pdf", container, {});

			expect(renderer).toBeInstanceOf(MockRenderer);
			expect(renderer.options).toEqual({});
		});
	});

	describe("edge cases", () => {
		test("should handle empty MIME type string", () => {
			const container = document.createElement("div");

			expect(() => {
				RendererFactory.create("", container);
			}).toThrow("No renderer available for type: ");
		});

		test("should handle case-sensitive MIME types", () => {
			const container = document.createElement("div");

			RendererFactory.register("application/pdf", MockRenderer);

			expect(() => {
				RendererFactory.create("Application/PDF", container);
			}).toThrow("No renderer available for type: Application/PDF");
		});

		test("should maintain separate instances", () => {
			const container1 = document.createElement("div");
			const container2 = document.createElement("div");

			RendererFactory.register("application/pdf", MockRenderer);

			const renderer1 = RendererFactory.create("application/pdf", container1);
			const renderer2 = RendererFactory.create("application/pdf", container2);

			expect(renderer1).not.toBe(renderer2);
			expect(renderer1.container).toBe(container1);
			expect(renderer2.container).toBe(container2);
		});

		test("should handle special characters in MIME types", () => {
			const container = document.createElement("div");
			const mimeType =
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document";

			RendererFactory.register(mimeType, MockRenderer);
			const renderer = RendererFactory.create(mimeType, container);

			expect(renderer).toBeInstanceOf(MockRenderer);
		});
	});

	describe("renderers map", () => {
		test("should be accessible as static property", () => {
			expect(RendererFactory.renderers).toBeInstanceOf(Map);
		});

		test("should persist registrations", () => {
			RendererFactory.register("test/type1", MockRenderer);
			RendererFactory.register("test/type2", AnotherMockRenderer);

			expect(RendererFactory.renderers.size).toBe(2);

			const container = document.createElement("div");
			const renderer1 = RendererFactory.create("test/type1", container);
			const renderer2 = RendererFactory.create("test/type2", container);

			expect(renderer1).toBeInstanceOf(MockRenderer);
			expect(renderer2).toBeInstanceOf(AnotherMockRenderer);
		});
	});
});
