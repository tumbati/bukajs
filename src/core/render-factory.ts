import type { ViewerOptions } from "../types/index";
import type { BaseRenderer } from "./base-renderer";

/**
 * Renderer Factory
 */
export class RendererFactory {
	static renderers = new Map<
		string,
		new (container: HTMLElement, options?: ViewerOptions) => BaseRenderer
	>();

	static register(
		mimeType: string,
		rendererClass: new (container: HTMLElement, options?: ViewerOptions) => BaseRenderer
	): void {
		this.renderers.set(mimeType, rendererClass);
	}

	static create(mimeType: string, container: HTMLElement, options?: ViewerOptions): BaseRenderer {
		const RendererClass = this.renderers.get(mimeType);
		if (!RendererClass) {
			throw new Error(`No renderer available for type: ${mimeType}`);
		}
		return new RendererClass(container, options);
	}
}
