import { SUPPORTED_FORMATS } from "./config";

/**
 * Document Type Detector
 */
export class DocumentDetector {
	static async detectType(source: string | File | Blob): Promise<string> {
		if (typeof source === "string") {
			const extension = source.split(".").pop()?.toLowerCase();
			switch (extension) {
				case "pdf":
					return SUPPORTED_FORMATS.PDF;
				case "docx":
					return SUPPORTED_FORMATS.DOCX;
				case "xlsx":
					return SUPPORTED_FORMATS.XLSX;
				case "png":
					return SUPPORTED_FORMATS.IMAGE_PNG;
				case "jpg":
				case "jpeg":
					return SUPPORTED_FORMATS.IMAGE_JPEG;
				case "svg":
					return SUPPORTED_FORMATS.IMAGE_SVG;
				case "csv":
					return SUPPORTED_FORMATS.CSV;
				case "pptx":
					return SUPPORTED_FORMATS.PPTX;
				case "ppt":
					return SUPPORTED_FORMATS.PPT;
				default:
					break;
			}
		} else if (source instanceof File || source instanceof Blob) {
			return source.type;
		}

		throw new Error("Unable to detect document type");
	}
}
