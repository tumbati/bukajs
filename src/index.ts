// Main entry point that exports everything and auto-registers all renderers
export * from "./core/index";

// Auto-register all renderers
import "./renderers/pdf";
import "./renderers/image";
import "./renderers/docx";
import "./renderers/xlsx";
import "./renderers/presentation";
