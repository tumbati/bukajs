import { vi } from "vitest";

// Mock browser APIs
global.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
	fillRect: vi.fn(),
	clearRect: vi.fn(),
	getImageData: vi.fn(() => ({ data: [] })),
	putImageData: vi.fn(),
	createImageData: vi.fn(() => []),
	setTransform: vi.fn(),
	drawImage: vi.fn(),
	save: vi.fn(),
	fillText: vi.fn(),
	restore: vi.fn(),
	beginPath: vi.fn(),
	moveTo: vi.fn(),
	lineTo: vi.fn(),
	closePath: vi.fn(),
	stroke: vi.fn(),
	translate: vi.fn(),
	scale: vi.fn(),
	rotate: vi.fn(),
	arc: vi.fn(),
	fill: vi.fn(),
	measureText: vi.fn(() => ({ width: 0 })),
	transform: vi.fn(),
	rect: vi.fn(),
	clip: vi.fn()
}));

global.HTMLCanvasElement.prototype.toDataURL = vi.fn(() => "data:image/png;base64,mockdata");

// Mock File API
global.File = class MockFile {
	constructor(parts, filename, options = {}) {
		this.name = filename;
		this.type = options.type || "application/octet-stream";
		this.size = parts.reduce((size, part) => size + (part.length || 0), 0);
		this.lastModified = Date.now();
		this._parts = parts;
	}

	arrayBuffer() {
		return Promise.resolve(new ArrayBuffer(this.size));
	}

	text() {
		return Promise.resolve(this._parts.join(""));
	}

	stream() {
		return new ReadableStream();
	}

	slice() {
		return new MockFile([], this.name, { type: this.type });
	}
};

global.Blob = class MockBlob {
	constructor(parts = [], options = {}) {
		this.type = options.type || "";
		this.size = parts.reduce((size, part) => size + (part.length || 0), 0);
		this._parts = parts;
	}

	arrayBuffer() {
		return Promise.resolve(new ArrayBuffer(this.size));
	}

	text() {
		return Promise.resolve(this._parts.join(""));
	}

	stream() {
		return new ReadableStream();
	}

	slice() {
		return new MockBlob([], { type: this.type });
	}
};

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => "mock-object-url");
global.URL.revokeObjectURL = vi.fn();

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));

// Mock document methods
global.document.elementFromPoint = vi.fn(() => null);
global.document.elementsFromPoint = vi.fn(() => []);

// Mock PDF.js
global.pdfjsLib = {
	getDocument: vi.fn(() => ({
		promise: Promise.resolve({
			numPages: 1,
			getPage: vi.fn(() =>
				Promise.resolve({
					getViewport: vi.fn(() => ({ width: 100, height: 100 })),
					render: vi.fn(() => ({ promise: Promise.resolve() })),
					getTextContent: vi.fn(() => Promise.resolve({ items: [] }))
				})
			),
			getMetadata: vi.fn(() => Promise.resolve({ info: { Title: "Test PDF" } }))
		})
	})),
	GlobalWorkerOptions: {
		workerSrc: ""
	}
};

// Mock mammoth
global.mammoth = {
	convertToHtml: vi.fn(() =>
		Promise.resolve({
			value: "<p>Mock DOCX content</p>",
			messages: []
		})
	)
};

// Mock XLSX
global.XLSX = {
	read: vi.fn(() => ({
		SheetNames: ["Sheet1"],
		Sheets: {
			Sheet1: {
				"!ref": "A1:B2",
				A1: { v: "Header1" },
				B1: { v: "Header2" },
				A2: { v: "Data1" },
				B2: { v: "Data2" }
			}
		}
	})),
	utils: {
		sheet_to_json: vi.fn(() => [{ Header1: "Data1", Header2: "Data2" }]),
		sheet_to_csv: vi.fn(() => "Header1,Header2\nData1,Data2")
	}
};

// Mock localforage
global.localforage = {
	getItem: vi.fn(() => Promise.resolve(null)),
	setItem: vi.fn(() => Promise.resolve()),
	removeItem: vi.fn(() => Promise.resolve()),
	clear: vi.fn(() => Promise.resolve())
};

// Mock fullscreen API
Object.defineProperty(document, "fullscreenElement", {
	value: null,
	writable: true
});

global.document.requestFullscreen = vi.fn(() => Promise.resolve());
global.document.exitFullscreen = vi.fn(() => Promise.resolve());

// Suppress console warnings in tests
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
	// Only show warnings that aren't from our test mocks
	if (!args[0]?.includes?.("Failed to") && !args[0]?.includes?.("Mock")) {
		originalConsoleWarn(...args);
	}
};
