import "./core.css";
import "./tailwind.css";

/**
 * Available style themes
 */
export const THEMES = {
	DEFAULT: "default",
	DARK: "dark",
	TAILWIND: "tailwind"
} as const;

type Theme = (typeof THEMES)[keyof typeof THEMES];

/**
 * CSS injection utility
 */
class StyleManager {
	private injectedStyles: Set<string>;
	private currentTheme: Theme;

	constructor() {
		this.injectedStyles = new Set();
		this.currentTheme = THEMES.DEFAULT;
	}

	/**
	 * Inject CSS styles into the document head
	 */
	injectCSS(css: string, id: string = "buka-styles"): void {
		if (this.injectedStyles.has(id)) {
			return;
		}

		const style = document.createElement("style");
		style.id = id;
		style.textContent = css;
		document.head.appendChild(style);
		this.injectedStyles.add(id);
	}

	/**
	 * Remove injected styles
	 */
	removeCSS(id: string): void {
		const element = document.getElementById(id);
		if (element) {
			element.remove();
			this.injectedStyles.delete(id);
		}
	}

	/**
	 * Set theme on document
	 */
	setTheme(theme: Theme, element: HTMLElement = document.documentElement): void {
		Object.values(THEMES).forEach((t) => {
			element.removeAttribute(`data-buka-theme-${t}`);
		});

		if (theme !== THEMES.DEFAULT) {
			element.setAttribute("data-buka-theme", theme);
		}

		this.currentTheme = theme;
	}

	/**
	 * Get current theme
	 */
	getCurrentTheme(): Theme {
		return this.currentTheme;
	}

	/**
	 * Auto-inject core styles
	 */
	async loadCoreStyles(): Promise<void> {
		try {
			const coreCSS = await this.loadStylesheet("core.css");
			this.injectCSS(coreCSS, "buka-core-styles");
		} catch (error) {
			console.warn("Failed to load core styles:", error);
			this.injectDefaultStyles();
		}
	}

	/**
	 * Load Tailwind styles
	 */
	async loadTailwindStyles(): Promise<void> {
		try {
			const tailwindCSS = await this.loadStylesheet("tailwind.css");
			this.injectCSS(tailwindCSS, "buka-tailwind-styles");
		} catch (error) {
			console.warn("Failed to load Tailwind styles:", error);
		}
	}

	/**
	 * Load stylesheet content (placeholder for actual implementation)
	 */
	async loadStylesheet(_filename: string): Promise<string> {
		return "";
	}

	/**
	 * Inject minimal default styles as fallback
	 */
	injectDefaultStyles(): void {
		const defaultCSS = `
      .buka-viewer {
        font-family: system-ui, sans-serif;
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        background: #fff;
        color: #333;
      }

      .buka-toolbar {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.5rem;
        border-bottom: 1px solid #ddd;
        background: #f5f5f5;
        flex-shrink: 0;
      }

      .buka-main {
        display: flex;
        flex: 1;
        overflow: hidden;
      }

      .buka-sidebar {
        width: 250px;
        border-right: 1px solid #ddd;
        background: #fafafa;
        overflow-y: auto;
      }

      .buka-content {
        flex: 1;
        position: relative;
        overflow: auto;
      }

      .buka-document-container {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding: 1.5rem;
      }

      .buka-btn {
        padding: 0.25rem 0.5rem;
        border: 1px solid #ccc;
        background: white;
        cursor: pointer;
        border-radius: 3px;
        font-size: 14px;
        transition: all 0.2s;
      }

      .buka-btn:hover {
        background: #e9e9e9;
      }

      .buka-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .buka-page-input {
        width: 60px;
        padding: 0.25rem;
        border: 1px solid #ccc;
        border-radius: 3px;
        text-align: center;
        font-size: 14px;
      }
      
      .buka-search-input {
        padding: 0.25rem 0.5rem;
        border: 1px solid #ccc;
        border-radius: 3px;
        font-size: 14px;
        min-width: 200px;
      }
      
      .buka-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        color: #666;
      }
      
      .buka-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        color: #d32f2f;
        text-align: center;
      }

      .buka-thumbnail {
        width: 120px;
        margin-bottom: 10px;
        background: white;
        border: 2px solid transparent;
        border-radius: 4px;
        cursor: pointer;
        overflow: hidden;
        transition: all 0.2s;
        position: relative;
      }

      .buka-thumbnail:hover {
        border-color: #007bff;
      }

      .buka-thumbnail.active {
        border-color: #007bff !important;
        background-color: #f0f8ff;
      }

      .buka-thumbnail-placeholder {
        padding: 20px;
        text-align: center;
        color: #666;
        font-size: 12px;
        background: #f5f5f5;
        height: 160px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .buka-thumbnail-label {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(transparent, rgba(0,0,0,0.7));
        color: white;
        padding: 4px;
        font-size: 12px;
        text-align: center;
      }
    `;

		this.injectCSS(defaultCSS, "buka-fallback-styles");
	}
}

export const styleManager = new StyleManager();

interface StyleOptions {
	theme?: Theme;
	autoInject?: boolean;
	container?: HTMLElement;
}

/**
 * Initialize BukaJS styles
 */
export async function initStyles(options: StyleOptions = {}): Promise<StyleManager> {
	const { theme = THEMES.DEFAULT, autoInject = true, container } = options;

	if (autoInject) {
		if (theme === THEMES.TAILWIND) {
			await styleManager.loadTailwindStyles();
		} else {
			await styleManager.loadCoreStyles();
		}
	}

	if (theme !== THEMES.DEFAULT) {
		styleManager.setTheme(theme, container);
	}

	return styleManager;
}

/**
 * CSS class utilities for different styling approaches
 */
export const CSS_CLASSES = {
	CORE: {
		viewer: "buka-viewer",
		toolbar: "buka-toolbar",
		toolbarSection: "buka-toolbar-section",
		main: "buka-main",
		sidebar: "buka-sidebar",
		content: "buka-content",
		documentContainer: "buka-document-container",
		annotationLayer: "buka-annotation-layer",

		btn: "buka-btn",
		btnPrimary: "buka-btn primary",
		btnSecondary: "buka-btn secondary",
		btnIcon: "buka-btn icon",

		navControls: "buka-nav-controls",
		pageInfo: "buka-page-info",
		pageInput: "buka-page-input",

		zoomControls: "buka-zoom-controls",
		zoomLevel: "buka-zoom-level",

		searchControls: "buka-search-controls",
		searchInput: "buka-search-input",
		searchResults: "buka-search-results",

		loading: "buka-loading",
		error: "buka-error",
		spinner: "buka-spinner"
	},

	TAILWIND: {
		viewer: "buka-viewer-tw",
		toolbar: "buka-toolbar-tw",
		toolbarSection: "buka-toolbar-section-tw",
		main: "buka-main-tw",
		sidebar: "buka-sidebar-tw",
		sidebarCollapsed: "buka-sidebar-collapsed-tw",
		content: "buka-content-tw",
		documentContainer: "buka-document-container-tw",
		annotationLayer: "absolute inset-0 pointer-events-none z-10",

		btn: "buka-btn-tw",
		btnPrimary: "buka-btn-tw buka-btn-primary-tw",
		btnSecondary: "buka-btn-tw buka-btn-secondary-tw",
		btnIcon: "buka-btn-tw buka-btn-icon-tw",

		navControls: "buka-nav-controls-tw",
		pageInfo: "buka-page-info-tw",
		pageInput: "buka-page-input-tw",

		zoomControls: "buka-zoom-controls-tw",
		zoomLevel: "buka-zoom-level-tw",

		searchControls: "buka-search-controls-tw",
		searchInput: "buka-search-input-tw",
		searchResults: "buka-search-results-tw",

		loading: "buka-loading-tw",
		error: "buka-error-tw",
		spinner: "buka-spinner-tw"
	}
};

/**
 * Get CSS classes for current theme
 */
export function getThemeClasses(theme: Theme = THEMES.DEFAULT): Record<string, string> {
	switch (theme) {
		case THEMES.TAILWIND:
			return CSS_CLASSES.TAILWIND;
		case THEMES.DARK:
		case THEMES.DEFAULT:
		default:
			return CSS_CLASSES.CORE;
	}
}

interface ThemeClasses {
	tailwind?: string;
	dark?: string;
}

/**
 * Utility to conditionally apply classes based on theme
 */
export function themeClass(
	baseClass: string,
	theme: Theme = THEMES.DEFAULT,
	themeClasses: ThemeClasses = {}
): string {
	if (theme === THEMES.TAILWIND && themeClasses.tailwind) {
		return themeClasses.tailwind;
	}

	if (theme === THEMES.DARK && themeClasses.dark) {
		return themeClasses.dark;
	}

	return baseClass;
}

export const CORE_CSS = "";
export const TAILWIND_CSS = "";

export default styleManager;
