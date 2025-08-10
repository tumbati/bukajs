/**
 * Renderer Factory
 */
export class RendererFactory {
	static renderers = new Map();

	static register(mimeType, rendererClass) {
		this.renderers.set(mimeType, rendererClass);
	}

	static create(mimeType, container, options) {
		const RendererClass = this.renderers.get(mimeType);
		if (!RendererClass) {
			throw new Error(`No renderer available for type: ${mimeType}`);
		}
		return new RendererClass(container, options);
	}
}
