// Type definitions for external libraries

declare global {
	interface Window {
		pdfjsLib?: any;
		XLSX?: any;
		mammoth?: any;
	}
}

// PDF.js types
declare module "pdfjs-dist" {
	export interface PDFDocumentProxy {
		numPages: number;
		getPage(pageNumber: number): Promise<PDFPageProxy>;
		getMetadata(): Promise<PDFMetadata>;
		destroy(): void;
	}

	export interface PDFPageProxy {
		getViewport(options: { scale: number }): PDFPageViewport;
		render(renderContext: PDFRenderContext): PDFRenderTask;
		getTextContent(): Promise<PDFTextContent>;
	}

	export interface PDFPageViewport {
		width: number;
		height: number;
		transform: number[];
	}

	export interface PDFRenderContext {
		canvasContext: CanvasRenderingContext2D;
		viewport: PDFPageViewport;
	}

	export interface PDFRenderTask {
		promise: Promise<void>;
	}

	export interface PDFTextContent {
		items: PDFTextItem[];
	}

	export interface PDFTextItem {
		str: string;
		transform: number[];
	}

	export interface PDFMetadata {
		info?: {
			Title?: string;
			Author?: string;
			Subject?: string;
			Creator?: string;
		};
	}

	export interface PDFLoadingTask {
		promise: Promise<PDFDocumentProxy>;
	}

	export function getDocument(src: {
		data: Uint8Array;
		cMapUrl?: string;
		cMapPacked?: boolean;
	}): PDFLoadingTask;

	export const Util: {
		transform(m1: number[], m2: number[]): number[];
	};
}

// Mammoth.js types
declare module "mammoth" {
	export interface ConvertToHtmlResult {
		value: string;
		messages: any[];
	}

	export interface ConvertToHtmlOptions {
		convertImage?: (image: any) => { src: string };
		styleMap?: string[];
		includeEmbeddedStyleMap?: boolean;
		includeDefaultStyleMap?: boolean;
	}

	export function convertToHtml(
		input: { arrayBuffer: ArrayBuffer } | { buffer: Buffer },
		options?: ConvertToHtmlOptions
	): Promise<ConvertToHtmlResult>;

	export function extractRawText(
		input: { arrayBuffer: ArrayBuffer } | { buffer: Buffer }
	): Promise<{ value: string; messages: any[] }>;
}

// SheetJS/XLSX types
declare module "xlsx" {
	export interface WorkBook {
		SheetNames: string[];
		Sheets: { [key: string]: WorkSheet };
	}

	export interface WorkSheet {
		[key: string]: CellObject | any;
	}

	export interface CellObject {
		v?: any;
		w?: string;
		t?: string;
		f?: string;
		r?: string;
		h?: string;
		c?: any[];
		z?: string;
		l?: any;
		s?: any;
	}

	export interface Range {
		s: { c: number; r: number };
		e: { c: number; r: number };
	}

	export function read(data: any, options?: any): WorkBook;
	export function readFile(filename: string, options?: any): WorkBook;
	export const utils: {
		sheet_to_json(worksheet: WorkSheet, options?: any): any[];
		sheet_to_csv(worksheet: WorkSheet, options?: any): string;
		encode_range(range: Range): string;
		decode_range(range: string): Range;
		encode_cell(cell: { c: number; r: number }): string;
		decode_cell(address: string): { c: number; r: number };
	};
}

// LocalForage types (for caching)
declare module "localforage" {
	export function setItem<T>(key: string, value: T): Promise<T>;
	export function getItem<T>(key: string): Promise<T | null>;
	export function removeItem(key: string): Promise<void>;
	export function clear(): Promise<void>;
	export function length(): Promise<number>;
	export function key(keyIndex: number): Promise<string | null>;
	export function keys(): Promise<string[]>;
	export function iterate<T, U>(
		iteratee: (value: T, key: string, iterationNumber: number) => U
	): Promise<U>;
	export function config(options: {
		driver?: string | string[];
		name?: string;
		version?: number;
		size?: number;
		storeName?: string;
		description?: string;
	}): void;
}

export {};
