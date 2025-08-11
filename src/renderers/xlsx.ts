import { BaseRenderer, EVENTS, RendererFactory, SUPPORTED_FORMATS } from "../core";
import type { SearchResult } from "../types";

/**
 * XLSX/CSV Renderer using SheetJS
 * Handles Excel files and CSV with sheet navigation and grid display
 */
export class XlsxRenderer extends BaseRenderer {
	public xlsxLib: any;
	public workbook: any;
	public worksheets: any[];
	public currentSheetIndex: number;
	public currentSheetData: any[][];
	public gridContainer: HTMLElement;
	public gridTable: HTMLElement;
	public sheetTabs: HTMLElement;
	public mainContainer: HTMLElement;
	public searchableData: string;
	override searchResults: SearchResult[];
	override currentSearchIndex: number;
	public virtualScrolling: boolean;
	public rowHeight: number;
	public visibleRows: number;
	public visibleCols: number;
	public scrollPosition: { row: number; col: number };
	public resizeObserver: ResizeObserver | null;

	constructor(container: HTMLElement, options = {}) {
		super(container, options);

		this.xlsxLib = null;
		this.workbook = null;
		this.worksheets = [];
		this.currentSheetIndex = 0;
		this.currentSheetData = [];
		this.gridContainer = null!;
		this.gridTable = null!;
		this.sheetTabs = null!;
		this.mainContainer = null!;
		this.searchableData = "";
		this.searchResults = [];
		this.currentSearchIndex = 0;
		this.resizeObserver = null;

		this.virtualScrolling = (options as any).virtualScrolling !== false;
		this.rowHeight = 25;
		this.visibleRows = 20;
		this.visibleCols = 10;
		this.scrollPosition = { row: 0, col: 0 };

		this.totalPages = 1;
		this.currentPage = 1;

		this.setupGridContainer();
	}

	setupGridContainer(): void {
		this.mainContainer = document.createElement("div");
		this.mainContainer.className = "buka-xlsx-container";
		this.mainContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      background-color: #fff;
      border: 1px solid #d0d7de;
      border-radius: 8px;
      overflow: hidden;
    `;

		this.sheetTabs = document.createElement("div");
		this.sheetTabs.className = "buka-xlsx-tabs";
		this.sheetTabs.style.cssText = `
      display: flex;
      background-color: #f6f8fa;
      border-bottom: 1px solid #d0d7de;
      padding: 8px;
      gap: 4px;
      overflow-x: auto;
      flex-shrink: 0;
    `;

		this.gridContainer = document.createElement("div");
		this.gridContainer.className = "buka-xlsx-grid";
		this.gridContainer.style.cssText = `
      flex: 1;
      overflow: auto;
      position: relative;
      background-color: #fff;
    `;

		this.gridTable = document.createElement("table");
		this.gridTable.className = "buka-xlsx-table";
		this.gridTable.style.cssText = `
      border-collapse: collapse;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.2;
      width: 100%;
    `;

		this.gridContainer.appendChild(this.gridTable);
		this.mainContainer.appendChild(this.sheetTabs);
		this.mainContainer.appendChild(this.gridContainer);
		this.container.appendChild(this.mainContainer);

		if (this.virtualScrolling) {
			this.setupVirtualScrolling();
		}
	}

	setupVirtualScrolling(): void {
		this.gridContainer.addEventListener("scroll", this.handleScroll.bind(this));
	}

	async load(source: string | File | Blob): Promise<void> {
		try {
			this.xlsxLib = await this.loadSheetJS();

			let data;

			if (typeof source === "string") {
				const response = await fetch(source);
				if (!response.ok) {
					throw new Error(`Failed to fetch file: ${response.statusText}`);
				}
				data = await response.arrayBuffer();
			} else if (source instanceof File || source instanceof Blob) {
				data = await source.arrayBuffer();
			} else {
				throw new Error("Unsupported source type");
			}

			this.workbook = this.xlsxLib.read(data, {
				type: "array",
				cellStyles: true,
				cellText: false,
				cellDates: true
			});

			this.worksheets = this.workbook.SheetNames.map((name: string, index: number) => ({
				name,
				index,
				sheet: this.workbook.Sheets[name],
				range: this.xlsxLib.utils.decode_range(this.workbook.Sheets[name]["!ref"] || "A1")
			}));

			this.totalPages = this.worksheets.length;
			this.currentPage = 1;
			this.currentSheetIndex = 0;

			this.setupSheetTabs();

			await this.loadSheet(0);

			this.emit(EVENTS.DOCUMENT_LOADED, {
				totalPages: this.totalPages,
				title: this.getDocumentTitle(source),
				sheets: this.worksheets.map((ws) => ({
					name: ws.name,
					range: ws.range,
					rowCount: ws.range.e.r - ws.range.s.r + 1,
					colCount: ws.range.e.c - ws.range.s.c + 1
				}))
			});
		} catch (error) {
			console.error("XLSX loading failed:", error);
			throw new Error(
				`Failed to load spreadsheet: ${error instanceof Error ? error.message : "Unknown error"}`
			);
		}
	}

	async loadSheetJS(): Promise<any> {
		if (typeof (window as any).XLSX !== "undefined") {
			return (window as any).XLSX;
		}

		try {
			const xlsxModule = await import("xlsx");
			return xlsxModule.default || xlsxModule;
		} catch (error) {
			console.log("Loading SheetJS from CDN...");

			const script = document.createElement("script");
			script.src = "https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js";
			document.head.appendChild(script);

			return new Promise((resolve, reject) => {
				script.onload = () => {
					if ((window as any).XLSX) {
						resolve((window as any).XLSX);
					} else {
						reject(new Error("Failed to load SheetJS"));
					}
				};
				script.onerror = () => reject(new Error("Failed to load SheetJS from CDN"));
			});
		}
	}

	setupSheetTabs(): void {
		this.sheetTabs.innerHTML = "";

		this.worksheets.forEach((worksheet, index) => {
			const tab = document.createElement("button");
			tab.className = "buka-xlsx-tab";
			tab.textContent = worksheet.name;
			tab.style.cssText = `
        padding: 6px 12px;
        border: 1px solid #d0d7de;
        background-color: ${index === this.currentSheetIndex ? "#fff" : "#f6f8fa"};
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        white-space: nowrap;
        transition: all 0.2s;
      `;

			if (index === this.currentSheetIndex) {
				tab.style.borderColor = "#0969da";
				tab.style.color = "#0969da";
				tab.style.fontWeight = "500";
			}

			tab.addEventListener("click", () => {
				this.switchToSheet(index);
			});

			this.sheetTabs.appendChild(tab);
		});
	}

	async switchToSheet(sheetIndex: number): Promise<void> {
		if (sheetIndex >= 0 && sheetIndex < this.worksheets.length) {
			this.currentSheetIndex = sheetIndex;
			this.currentPage = sheetIndex + 1;
			await this.loadSheet(sheetIndex);
			this.setupSheetTabs(); // Update tab styles

			this.emit(EVENTS.PAGE_CHANGED, {
				page: this.currentPage,
				totalPages: this.totalPages,
				sheetName: this.worksheets[sheetIndex].name
			});
		}
	}

	async loadSheet(sheetIndex: number): Promise<void> {
		const worksheet = this.worksheets[sheetIndex];
		if (!worksheet) return;

		try {
			const range = worksheet.range;
			const sheetData = [];

			for (let row = range.s.r; row <= range.e.r; row++) {
				const rowData = [];
				for (let col = range.s.c; col <= range.e.c; col++) {
					const cellAddress = this.xlsxLib.utils.encode_cell({ r: row, c: col });
					const cell = worksheet.sheet[cellAddress];

					let value = "";
					if (cell) {
						if (cell.t === "n") {
							// Number
							value = cell.v;
						} else if (cell.t === "s") {
							// String
							value = cell.v;
						} else if (cell.t === "b") {
							// Boolean
							value = cell.v ? "TRUE" : "FALSE";
						} else if (cell.t === "d") {
							// Date
							value = cell.v instanceof Date ? cell.v.toLocaleDateString() : cell.v;
						} else {
							value = cell.w || cell.v || "";
						}
					}

					rowData.push({
						value: value,
						formatted: cell?.w || String(value),
						type: cell?.t || "s",
						style: cell?.s || null,
						address: cellAddress
					});
				}
				sheetData.push(rowData);
			}

			this.currentSheetData = sheetData;
			this.buildSearchableText();
			await this.render();
		} catch (error) {
			console.error("Error loading sheet:", error);
			this.currentSheetData = [];
		}
	}

	buildSearchableText(): void {
		this.searchableData = this.currentSheetData
			.map((row) => row.map((cell) => cell.value).join(" "))
			.join("\n");
	}

	async render(): Promise<void> {
		if (!this.currentSheetData.length) {
			this.gridTable.innerHTML = `
					<tr><td style="padding: 20px; text-align: center; color: #666;">No data available</td></tr>
				`;
			return;
		}

		this.gridTable.innerHTML = "";

		if (this.virtualScrolling && this.currentSheetData.length > 100) {
			this.renderVirtualGrid();
		} else {
			this.renderFullGrid();
		}
	}

	renderFullGrid(): void {
		const tbody = document.createElement("tbody");

		this.currentSheetData.forEach((rowData, rowIndex) => {
			const row = document.createElement("tr");

			const rowHeader = document.createElement("td");
			rowHeader.className = "buka-xlsx-row-header";
			rowHeader.textContent = String(rowIndex + 1);
			rowHeader.style.cssText = `
        background-color: #f6f8fa;
        border: 1px solid #d0d7de;
        border-right: 2px solid #d0d7de;
        padding: 4px 8px;
        text-align: center;
        font-weight: 500;
        color: #656d76;
        min-width: 40px;
        position: sticky;
        left: 0;
        z-index: 10;
      `;
			row.appendChild(rowHeader);

			rowData.forEach((cellData, colIndex) => {
				const cell = document.createElement("td");
				cell.className = "buka-xlsx-cell";
				cell.textContent = cellData.formatted || "";
				cell.title = cellData.address;

				cell.style.cssText = `
          border: 1px solid #d0d7de;
          padding: 4px 8px;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          vertical-align: top;
          ${this.getCellTypeStyle(cellData.type)}
        `;

				cell.addEventListener("click", () => {
					this.selectCell(rowIndex, colIndex, cell);
				});

				row.appendChild(cell);
			});

			tbody.appendChild(row);
		});

		if (this.currentSheetData.length > 0) {
			const headerRow = document.createElement("tr");
			headerRow.className = "buka-xlsx-header-row";

			const cornerCell = document.createElement("th");
			cornerCell.style.cssText = `
        background-color: #f6f8fa;
        border: 1px solid #d0d7de;
        padding: 4px 8px;
        position: sticky;
        left: 0;
        top: 0;
        z-index: 20;
      `;
			headerRow.appendChild(cornerCell);

			this.currentSheetData[0]?.forEach((_, colIndex) => {
				const colHeader = document.createElement("th");
				colHeader.textContent = this.xlsxLib.utils.encode_col(colIndex);
				colHeader.style.cssText = `
          background-color: #f6f8fa;
          border: 1px solid #d0d7de;
          border-bottom: 2px solid #d0d7de;
          padding: 4px 8px;
          text-align: center;
          font-weight: 500;
          color: #656d76;
          min-width: 80px;
          position: sticky;
          top: 0;
          z-index: 10;
        `;
				headerRow.appendChild(colHeader);
			});

			const thead = document.createElement("thead");
			thead.appendChild(headerRow);
			this.gridTable.appendChild(thead);
		}

		this.gridTable.appendChild(tbody);
	}

	renderVirtualGrid() {
		const visibleStart = Math.floor(this.scrollPosition.row);
		const visibleEnd = Math.min(visibleStart + this.visibleRows, this.currentSheetData.length);

		const tbody = document.createElement("tbody");

		for (let rowIndex = visibleStart; rowIndex < visibleEnd; rowIndex++) {
			const rowData = this.currentSheetData[rowIndex];
			if (!rowData) continue;

			const row = document.createElement("tr");

			const rowHeader = document.createElement("td");
			rowHeader.textContent = String(rowIndex + 1);
			rowHeader.style.cssText = `
        background-color: #f6f8fa;
        border: 1px solid #d0d7de;
        padding: 4px 8px;
        text-align: center;
        font-weight: 500;
        position: sticky;
        left: 0;
        z-index: 10;
      `;
			row.appendChild(rowHeader);

			rowData.forEach((cellData, _colIndex) => {
				const cell = document.createElement("td");
				cell.textContent = cellData.formatted || "";
				cell.style.cssText = `
          border: 1px solid #d0d7de;
          padding: 4px 8px;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          ${this.getCellTypeStyle(cellData.type)}
        `;
				row.appendChild(cell);
			});

			tbody.appendChild(row);
		}

		this.gridTable.innerHTML = "";
		this.gridTable.appendChild(tbody);
	}

	getCellTypeStyle(cellType: string): string {
		switch (cellType) {
			case "n": // Number
				return "text-align: right; font-family: monospace;";
			case "b": // Boolean
				return "text-align: center; font-weight: bold;";
			case "d": // Date
				return "text-align: center;";
			default:
				return "text-align: left;";
		}
	}

	selectCell(rowIndex: number, colIndex: number, cellElement: HTMLElement): void {
		const selected = this.gridContainer.querySelectorAll(".buka-xlsx-cell-selected");
		selected.forEach((cell) => {
			cell.classList.remove("buka-xlsx-cell-selected");
			(cell as HTMLElement).style.backgroundColor = "";
			(cell as HTMLElement).style.borderColor = "#d0d7de";
		});

		cellElement.classList.add("buka-xlsx-cell-selected");
		cellElement.style.backgroundColor = "#dbeafe";
		cellElement.style.borderColor = "#3b82f6";
		cellElement.style.borderWidth = "2px";

		this.emit("cell:selected", {
			row: rowIndex,
			col: colIndex,
			value: this.currentSheetData[rowIndex]?.[colIndex]?.value,
			address: this.currentSheetData[rowIndex]?.[colIndex]?.address
		});
	}

	handleScroll(): void {
		if (!this.virtualScrolling) return;

		const scrollTop = this.gridContainer.scrollTop;
		const newRowPosition = Math.floor(scrollTop / this.rowHeight);

		if (Math.abs(newRowPosition - this.scrollPosition.row) > 5) {
			this.scrollPosition.row = newRowPosition;
			this.renderVirtualGrid();
		}
	}

	override async setZoom(factor: number): Promise<void> {
		this.zoomFactor = Math.max(0.5, Math.min(2.0, factor));

		const fontSize = Math.round(13 * this.zoomFactor);
		const padding = Math.round(4 * this.zoomFactor);

		this.gridTable.style.fontSize = `${fontSize}px`;

		const cells = this.gridContainer.querySelectorAll("td, th");
		cells.forEach((cell) => {
			(cell as HTMLElement).style.padding = `${padding}px ${padding * 2}px`;
		});

		this.emit(EVENTS.ZOOM_CHANGED, { zoom: this.zoomFactor });
	}

	override async goto(page: number): Promise<boolean> {
		const sheetIndex = page - 1;
		if (sheetIndex >= 0 && sheetIndex < this.worksheets.length) {
			await this.switchToSheet(sheetIndex);
			return true;
		}
		return false;
	}

	override async search(query: string): Promise<SearchResult[]> {
		if (!query.trim()) {
			this.searchResults = [];
			this.currentSearchIndex = 0;
			this.clearSearchHighlights();
			return [];
		}

		this.clearSearchHighlights();
		this.searchResults = [];

		const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");

		this.currentSheetData.forEach((rowData, _rowIndex) => {
			rowData.forEach((cellData, _colIndex) => {
				const cellValue = String(cellData.value || "");
				const matches = cellValue.match(regex);

				if (matches) {
					matches.forEach((match) => {
						this.searchResults.push({
							match: match,
							text: cellValue,
							page: this.currentPage,
							index: 0,
							length: match.length
						} as SearchResult);
					});
				}
			});
		});

		if (this.searchResults.length > 0) {
			this.highlightSearchResults();
			this.currentSearchIndex = 0;
			this.scrollToSearchResult(this.currentSearchIndex);
		}

		this.emit(EVENTS.SEARCH_RESULT, {
			query,
			results: this.searchResults,
			currentIndex: this.currentSearchIndex
		});

		return this.searchResults;
	}

	highlightSearchResults(): void {
		// Implementation simplified for now
		// TODO: Add proper cell highlighting based on search results
	}

	clearSearchHighlights(): void {
		const highlights = this.gridContainer.querySelectorAll(".buka-search-highlight");
		highlights.forEach((cell) => {
			cell.classList.remove("buka-search-highlight");
			(cell as HTMLElement).style.backgroundColor = "";
			(cell as HTMLElement).style.color = "";
		});
	}

	scrollToSearchResult(_index: number): void {
		// Implementation simplified for now
		// TODO: Add proper scroll to search result functionality
	}

	nextSearchResult(): void {
		if (this.searchResults.length > 0) {
			this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchResults.length;
			this.scrollToSearchResult(this.currentSearchIndex);
		}
	}

	previousSearchResult(): void {
		if (this.searchResults.length > 0) {
			this.currentSearchIndex =
				(this.currentSearchIndex - 1 + this.searchResults.length) %
				this.searchResults.length;
			this.scrollToSearchResult(this.currentSearchIndex);
		}
	}

	exportToCSV(): string {
		if (!this.currentSheetData.length) return "";

		return this.currentSheetData
			.map((row) =>
				row
					.map((cell) => {
						const value = String(cell.value || "");
						return value.includes(",") || value.includes('"') || value.includes("\n")
							? `"${value.replace(/"/g, '""')}"}`
							: value;
					})
					.join(",")
			)
			.join("\n");
	}

	downloadCSV(): void {
		const csv = this.exportToCSV();
		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);

		const a = document.createElement("a");
		a.href = url;
		a.download = `${this.worksheets[this.currentSheetIndex].name}.csv`;
		a.click();

		URL.revokeObjectURL(url);
	}

	getDocumentTitle(source: string | File | Blob): string {
		if (typeof source === "string") {
			return (
				source
					.split("/")
					.pop()
					?.replace(/\.[^/.]+$/, "") || "Spreadsheet"
			);
		} else if (source instanceof File) {
			return source.name.replace(/\.[^/.]+$/, "");
		}
		return "Spreadsheet";
	}

	getSheetStats(): any {
		const worksheet = this.worksheets[this.currentSheetIndex];
		if (!worksheet) return null;

		const range = worksheet.range;
		const totalCells = (range.e.r - range.s.r + 1) * (range.e.c - range.s.c + 1);

		let filledCells = 0;
		let numericCells = 0;
		let formulaCells = 0;

		this.currentSheetData.forEach((row) => {
			row.forEach((cell) => {
				if (cell.value !== "") {
					filledCells++;
					if (cell.type === "n") numericCells++;
					if (String(cell.value).startsWith("=")) formulaCells++;
				}
			});
		});

		return {
			sheetName: worksheet.name,
			totalRows: range.e.r - range.s.r + 1,
			totalCols: range.e.c - range.s.c + 1,
			totalCells,
			filledCells,
			numericCells,
			formulaCells,
			fillRatio: ((filledCells / totalCells) * 100).toFixed(1) + "%"
		};
	}

	override destroy(): void {
		super.destroy();

		this.workbook = null;
		this.worksheets = [];
		this.currentSheetData = [];
		this.searchResults = [];

		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}
	}
}

RendererFactory.register(SUPPORTED_FORMATS.XLSX, XlsxRenderer);

const CSV_MIME_TYPE = "text/csv";
RendererFactory.register(CSV_MIME_TYPE, XlsxRenderer);

export default XlsxRenderer;
