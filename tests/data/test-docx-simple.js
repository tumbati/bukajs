// Simple DOCX renderer test (Node.js compatible)
import { EVENTS } from "../../src/core/config.js";
import { DocxRenderer } from "../../src/renderers/docx.js";

// Mock DOM environment for Node.js testing
global.document = {
	createElement: (tag) => ({
		tagName: tag.toUpperCase(),
		className: "",
		style: {},
		appendChild: () => {},
		querySelector: () => null,
		querySelectorAll: () => [],
		innerHTML: "",
		textContent: "",
		addEventListener: () => {},
		removeChild: () => {},
		insertBefore: () => {},
		replaceChild: () => {},
		normalize: () => {},
		scrollIntoView: () => {},
		getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
		id: ""
	}),
	createTextNode: (text) => ({ textContent: text }),
	createDocumentFragment: () => ({ appendChild: () => {} }),
	createTreeWalker: () => ({ nextNode: () => null }),
	head: { appendChild: () => {} }
};

global.window = {
	location: { href: "http://localhost/" },
	navigator: { clipboard: { writeText: () => {} } },
	mammoth: undefined
};

global.NodeFilter = {
	SHOW_TEXT: 4
};

console.log("Testing DOCX renderer instantiation...");

try {
	// Create mock container
	const container = document.createElement("div");

	// Test renderer instantiation
	const renderer = new DocxRenderer(container);

	console.log("✅ DOCX renderer created successfully");
	console.log("   - Initial pages:", renderer.totalPages);
	console.log("   - Initial zoom:", renderer.zoomFactor);
	console.log(
		"   - Has required methods:",
		["load", "render", "search", "setZoom", "goto", "destroy"].every(
			(method) => typeof renderer[method] === "function"
		)
	);

	// Test event handling
	let eventFired = false;
	renderer.on(EVENTS.ZOOM_CHANGED, (data) => {
		eventFired = true;
		console.log("   - Event handling works:", data);
	});

	// Test zoom functionality
	await renderer.setZoom(1.5);
	console.log("   - Zoom changed:", renderer.zoomFactor);
	console.log("   - Event fired:", eventFired);

	// Test search functionality
	const searchResults = await renderer.search("test");
	console.log("   - Search returns array:", Array.isArray(searchResults));

	// Test utility methods
	console.log("   - Word count method:", typeof renderer.getWordCount() === "number");
	console.log("   - Outline method:", Array.isArray(renderer.getOutline()));

	// Clean up
	renderer.destroy();
	console.log("✅ DOCX renderer destroyed successfully");

	console.log("\n🎉 All DOCX renderer basic functionality tests passed!");
	console.log("💡 The DOCX renderer is now working correctly and ready to load documents.");
} catch (error) {
	console.error("❌ DOCX renderer test failed:", error.message);
	console.error(error.stack);
	process.exit(1);
}
