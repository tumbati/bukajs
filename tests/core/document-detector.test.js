import { describe, test, expect } from "vitest";
import { DocumentDetector, SUPPORTED_FORMATS } from "../../src/core/index.js";

describe("DocumentDetector", () => {
	describe("detectType", () => {
		test("should detect PDF from string URL", async () => {
			const result = await DocumentDetector.detectType("document.pdf");
			expect(result).toBe(SUPPORTED_FORMATS.PDF);
		});

		test("should detect DOCX from string URL", async () => {
			const result = await DocumentDetector.detectType("document.docx");
			expect(result).toBe(SUPPORTED_FORMATS.DOCX);
		});

		test("should detect XLSX from string URL", async () => {
			const result = await DocumentDetector.detectType("spreadsheet.xlsx");
			expect(result).toBe(SUPPORTED_FORMATS.XLSX);
		});

		test("should detect PNG from string URL", async () => {
			const result = await DocumentDetector.detectType("image.png");
			expect(result).toBe(SUPPORTED_FORMATS.IMAGE_PNG);
		});

		test("should detect JPEG from string URL", async () => {
			const result1 = await DocumentDetector.detectType("image.jpg");
			const result2 = await DocumentDetector.detectType("image.jpeg");
			expect(result1).toBe(SUPPORTED_FORMATS.IMAGE_JPEG);
			expect(result2).toBe(SUPPORTED_FORMATS.IMAGE_JPEG);
		});

		test("should detect SVG from string URL", async () => {
			const result = await DocumentDetector.detectType("image.svg");
			expect(result).toBe(SUPPORTED_FORMATS.IMAGE_SVG);
		});

		test("should detect PPTX from string URL", async () => {
			const result = await DocumentDetector.detectType("presentation.pptx");
			expect(result).toBe(SUPPORTED_FORMATS.PPTX);
		});

		test("should detect PPT from string URL", async () => {
			const result = await DocumentDetector.detectType("presentation.ppt");
			expect(result).toBe(SUPPORTED_FORMATS.PPT);
		});

		test("should detect type from File object", async () => {
			const file = new File(["content"], "test.pdf", { type: "application/pdf" });
			const result = await DocumentDetector.detectType(file);
			expect(result).toBe("application/pdf");
		});

		test("should detect type from Blob object", async () => {
			const blob = new Blob(["content"], { type: "image/png" });
			const result = await DocumentDetector.detectType(blob);
			expect(result).toBe("image/png");
		});

		test("should handle case-insensitive extensions", async () => {
			const result1 = await DocumentDetector.detectType("document.PDF");
			const result2 = await DocumentDetector.detectType("document.DocX");
			expect(result1).toBe(SUPPORTED_FORMATS.PDF);
			expect(result2).toBe(SUPPORTED_FORMATS.DOCX);
		});

		test("should throw error for unsupported format", async () => {
			await expect(DocumentDetector.detectType("document.txt")).rejects.toThrow(
				"Unable to detect document type"
			);
		});

		test("should throw error for invalid source", async () => {
			await expect(DocumentDetector.detectType(null)).rejects.toThrow(
				"Unable to detect document type"
			);
		});
	});
});
