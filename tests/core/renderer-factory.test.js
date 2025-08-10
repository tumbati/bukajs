import { describe, test, expect, beforeEach } from "vitest";
import { RendererFactory, BaseRenderer } from "../../src/core/index.js";

class MockRenderer extends BaseRenderer {
	async load() {
		// Mock implementation
	}

	async render() {
		// Mock implementation
	}

	async search() {
		return [];
	}
}

describe("RendererFactory", () => {
	beforeEach(() => {
		// Clear registrations before each test
		RendererFactory.renderers.clear();
	});

	describe("register", () => {
		test("should register a renderer for a mime type", () => {
			RendererFactory.register("application/pdf", MockRenderer);
			expect(RendererFactory.renderers.has("application/pdf")).toBe(true);
			expect(RendererFactory.renderers.get("application/pdf")).toBe(MockRenderer);
		});

		test("should allow overriding an existing renderer", () => {
			class AnotherMockRenderer extends BaseRenderer {
				async load() {}
				async render() {}
				async search() {
					return [];
				}
			}

			RendererFactory.register("application/pdf", MockRenderer);
			RendererFactory.register("application/pdf", AnotherMockRenderer);

			expect(RendererFactory.renderers.get("application/pdf")).toBe(AnotherMockRenderer);
		});
	});

	describe("create", () => {
		test("should create renderer instance for registered mime type", () => {
			RendererFactory.register("application/pdf", MockRenderer);

			const container = document.createElement("div");
			const options = { theme: "dark" };

			const renderer = RendererFactory.create("application/pdf", container, options);

			expect(renderer).toBeInstanceOf(MockRenderer);
			expect(renderer.container).toBe(container);
			expect(renderer.options.theme).toBe("dark");
		});

		test("should throw error for unregistered mime type", () => {
			const container = document.createElement("div");

			expect(() => {
				RendererFactory.create("application/unknown", container);
			}).toThrow("No renderer available for type: application/unknown");
		});

		test("should pass default options when none provided", () => {
			RendererFactory.register("application/pdf", MockRenderer);

			const container = document.createElement("div");
			const renderer = RendererFactory.create("application/pdf", container);

			expect(renderer.options).toEqual({});
		});

		test("should create multiple instances independently", () => {
			RendererFactory.register("application/pdf", MockRenderer);

			const container1 = document.createElement("div");
			const container2 = document.createElement("div");

			const renderer1 = RendererFactory.create("application/pdf", container1, {
				theme: "light"
			});
			const renderer2 = RendererFactory.create("application/pdf", container2, {
				theme: "dark"
			});

			expect(renderer1).not.toBe(renderer2);
			expect(renderer1.options.theme).toBe("light");
			expect(renderer2.options.theme).toBe("dark");
		});
	});

	describe("static properties", () => {
		test("should maintain renderers map", () => {
			expect(RendererFactory.renderers).toBeInstanceOf(Map);
			expect(RendererFactory.renderers.size).toBe(0);

			RendererFactory.register("type1", MockRenderer);
			RendererFactory.register("type2", MockRenderer);

			expect(RendererFactory.renderers.size).toBe(2);
		});
	});
});
