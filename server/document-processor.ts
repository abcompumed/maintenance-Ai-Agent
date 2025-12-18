import { Readable } from "stream";
import * as PDFModule from "pdf-parse";
import { extractRawText } from "mammoth";
import sharp from "sharp";
import Tesseract from "tesseract.js";

const pdfParse = (PDFModule as any).default || (PDFModule as any);

/**
 * Document processor for extracting text from various file formats
 * Supports: PDF, DOCX, images (PNG, JPG, etc.), Excel (basic text extraction)
 */

export interface ExtractedContent {
  text: string;
  metadata: {
    fileType: string;
    pageCount?: number;
    language?: string;
    confidence?: number;
  };
}

/**
 * Extract text from PDF files
 */
export async function extractFromPDF(
  buffer: Buffer
): Promise<ExtractedContent> {
  try {
    const data = await (pdfParse as any)(buffer);
    return {
      text: data.text,
      metadata: {
        fileType: "pdf",
        pageCount: data.numpages,
      },
    };
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

/**
 * Extract text from DOCX files
 */
export async function extractFromDOCX(
  buffer: Buffer
): Promise<ExtractedContent> {
  try {
    const result = await extractRawText({ buffer });
    return {
      text: result.value,
      metadata: {
        fileType: "docx",
      },
    };
  } catch (error) {
    console.error("DOCX extraction error:", error);
    throw new Error("Failed to extract text from DOCX");
  }
}

/**
 * Extract text from images using OCR
 */
export async function extractFromImage(
  buffer: Buffer,
  language: string = "eng"
): Promise<ExtractedContent> {
  try {
    // Convert image to standard format if needed
    const processedBuffer = await sharp(buffer)
      .png()
      .toBuffer();

    // Use Tesseract for OCR
    const {
      data: { text, confidence },
    } = await Tesseract.recognize(processedBuffer, language, {
      logger: (m: any) => {
        if (m.status === "recognizing text") {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    return {
      text,
      metadata: {
        fileType: "image",
        confidence: Math.round(confidence),
        language,
      },
    };
  } catch (error) {
    console.error("Image OCR error:", error);
    throw new Error("Failed to extract text from image");
  }
}

/**
 * Extract text from Excel files (basic - reads as text)
 * For more advanced Excel processing, consider using xlsx library
 */
export async function extractFromExcel(
  buffer: Buffer
): Promise<ExtractedContent> {
  // For now, return a placeholder
  // In production, use 'xlsx' library for proper Excel parsing
  return {
    text: "Excel file detected. For full extraction, additional processing required.",
    metadata: {
      fileType: "excel",
    },
  };
}

/**
 * Main document processor - routes to appropriate extractor based on file type
 */
export async function processDocument(
  buffer: Buffer,
  fileName: string,
  fileType: string
): Promise<ExtractedContent> {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  try {
    switch (fileType.toLowerCase()) {
      case "application/pdf":
      case "pdf":
        return await extractFromPDF(buffer);

      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      case "application/msword":
      case "docx":
      case "doc":
        return await extractFromDOCX(buffer);

      case "image/png":
      case "image/jpeg":
      case "image/jpg":
      case "image/webp":
      case "image/tiff":
        return await extractFromImage(buffer);

      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      case "application/vnd.ms-excel":
      case "xlsx":
      case "xls":
        return await extractFromExcel(buffer);

      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error(`Error processing document ${fileName}:`, error);
    throw error;
  }
}

/**
 * Classify extracted text to identify device information
 */
export function classifyDeviceInfo(text: string): {
  deviceType?: string;
  manufacturer?: string;
  model?: string;
} {
  const result: {
    deviceType?: string;
    manufacturer?: string;
    model?: string;
  } = {};

  // Common medical device patterns
  const devicePatterns = {
    ventilator: /ventilator|respiratory|breathing|airway/i,
    monitor: /monitor|ecg|ekg|vital|heart rate|blood pressure/i,
    pump: /pump|infusion|syringe|iv/i,
    imaging: /ultrasound|x-ray|ct|mri|imaging|scanner/i,
    dialysis: /dialysis|hemodialysis|renal/i,
    defibrillator: /defibrillator|aed|defi/i,
  };

  // Try to identify device type
  for (const [type, pattern] of Object.entries(devicePatterns)) {
    if (pattern.test(text)) {
      result.deviceType = type;
      break;
    }
  }

  // Extract manufacturer (common patterns)
  const manufacturerMatch = text.match(
    /(?:manufacturer|made by|produced by|mfg|©|®)[\s:]*([A-Za-z\s&]+?)(?:\n|,|\.|$)/i
  );
  if (manufacturerMatch) {
    result.manufacturer = manufacturerMatch[1].trim().substring(0, 255);
  }

  // Extract model number
  const modelMatch = text.match(
    /(?:model|model no|model number|model #|type|version)[\s:]*([A-Za-z0-9\-\.]+)/i
  );
  if (modelMatch) {
    result.model = modelMatch[1].trim().substring(0, 255);
  }

  return result;
}

/**
 * Sanitize extracted text for storage
 */
export function sanitizeText(text: string, maxLength: number = 65535): string {
  return text
    .replace(/\x00/g, "") // Remove null bytes
    .replace(/[\r\n]{3,}/g, "\n\n") // Normalize line breaks
    .substring(0, maxLength)
    .trim();
}
