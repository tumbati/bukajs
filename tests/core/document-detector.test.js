import { describe, test, expect } from "vitest";
import { DocumentDetector, SUPPORTED_FORMATS } from "../../src/core/index.ts";

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

		test("should detect JPG from string URL", async () => {
			const result1 = await DocumentDetector.detectType("image.jpg");
			const result2 = await DocumentDetector.detectType("image.jpeg");
			expect(result1).toBe(SUPPORTED_FORMATS.IMAGE_JPEG);
			expect(result2).toBe(SUPPORTED_FORMATS.IMAGE_JPEG);
		});

		test("should detect SVG from string URL", async () => {
			const result = await DocumentDetector.detectType("image.svg");
			expect(result).toBe(SUPPORTED_FORMATS.IMAGE_SVG);
		});

		test("should detect CSV from string URL", async () => {
			const result = await DocumentDetector.detectType("data.csv");
			expect(result).toBe(SUPPORTED_FORMATS.CSV);
		});

		test("should detect PPTX from string URL", async () => {
			const result = await DocumentDetector.detectType("presentation.pptx");
			expect(result).toBe(SUPPORTED_FORMATS.PPTX);
		});

		test("should detect PPT from string URL", async () => {
			const result = await DocumentDetector.detectType("presentation.ppt");
			expect(result).toBe(SUPPORTED_FORMATS.PPT);
		});

		test("should be case insensitive", async () => {
			const result1 = await DocumentDetector.detectType("document.PDF");
			const result2 = await DocumentDetector.detectType("document.Docx");
			const result3 = await DocumentDetector.detectType("image.PNG");

			expect(result1).toBe(SUPPORTED_FORMATS.PDF);
			expect(result2).toBe(SUPPORTED_FORMATS.DOCX);
			expect(result3).toBe(SUPPORTED_FORMATS.IMAGE_PNG);
		});

		test("should handle URLs with paths", async () => {
			const result1 = await DocumentDetector.detectType(
				"https://example.com/folder/document.pdf"
			);
			const result2 = await DocumentDetector.detectType("/local/path/image.png");
			const result3 = await DocumentDetector.detectType("../relative/path/file.docx");

			expect(result1).toBe(SUPPORTED_FORMATS.PDF);
			expect(result2).toBe(SUPPORTED_FORMATS.IMAGE_PNG);
			expect(result3).toBe(SUPPORTED_FORMATS.DOCX);
		});

		test("should detect type from File object", async () => {
			const pdfFile = new File([""], "document.pdf", { type: "application/pdf" });
			const imageFile = new File([""], "image.png", { type: "image/png" });
			const docxFile = new File([""], "document.docx", {
				type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
			});

			const result1 = await DocumentDetector.detectType(pdfFile);
			const result2 = await DocumentDetector.detectType(imageFile);
			const result3 = await DocumentDetector.detectType(docxFile);

			expect(result1).toBe("application/pdf");
			expect(result2).toBe("image/png");
			expect(result3).toBe(
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
			);
		});

		test("should detect type from Blob object", async () => {
			const pdfBlob = new Blob([""], { type: "application/pdf" });
			const imageBlob = new Blob([""], { type: "image/jpeg" });

			const result1 = await DocumentDetector.detectType(pdfBlob);
			const result2 = await DocumentDetector.detectType(imageBlob);

			expect(result1).toBe("application/pdf");
			expect(result2).toBe("image/jpeg");
		});

		test("should throw error for unknown extensions", async () => {
			await expect(DocumentDetector.detectType("unknown.xyz")).rejects.toThrow(
				"Unable to detect document type"
			);
		});

		test("should throw error for strings without extensions", async () => {
			await expect(DocumentDetector.detectType("noextension")).rejects.toThrow(
				"Unable to detect document type"
			);
		});

		test("should handle empty strings", async () => {
			await expect(DocumentDetector.detectType("")).rejects.toThrow(
				"Unable to detect document type"
			);
		});

		test("should handle strings with only dots", async () => {
			await expect(DocumentDetector.detectType("...")).rejects.toThrow(
				"Unable to detect document type"
			);
		});

		test("should handle filenames with multiple dots", async () => {
			const result = await DocumentDetector.detectType("file.name.with.dots.pdf");
			expect(result).toBe(SUPPORTED_FORMATS.PDF);
		});
	});
});
