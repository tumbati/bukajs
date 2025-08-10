// Main entry point that exports everything and auto-registers all renderers
export * from "./core/index.js";

// Auto-register all renderers
import "./renderers/pdf.js";
import "./renderers/image.js";
import "./renderers/docx.js";
import "./renderers/xlsx.js";
import "./renderers/presentation.js";