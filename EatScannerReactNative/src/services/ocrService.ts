import * as ImageManipulator from "expo-image-manipulator";
import { appConfig } from "../config/appConfig";

type OCRSpaceResponse = {
  ParsedResults?: Array<{
    ParsedText?: string;
    ErrorMessage?: string;
  }>;
  OCRExitCode?: number;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
};

export type OCRExtractionResult = {
  text: string;
  confidence: number;
  pass: "primary" | "fallback";
};

type OCRPassOptions = {
  language: string;
  width: number;
  compress: number;
};

function cleanupOCRText(input: string): string {
  if (!input) return "";

  return input
    // Join split words broken by line hyphenation.
    .replace(/([A-Za-zÀ-ÿ])-[\r\n]+([A-Za-zÀ-ÿ])/g, "$1$2")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

function estimatePassConfidence(text: string, response: OCRSpaceResponse): number {
  if (!text.trim()) return 0;

  const tokenCount = text.split(/\s+/).filter(Boolean).length;
  const letters = (text.match(/[A-Za-zÀ-ÿ]/g) ?? []).length;
  const symbols = (text.match(/[^A-Za-zÀ-ÿ0-9\s,.;:%()\-]/g) ?? []).length;
  const readableRatio = letters / Math.max(1, text.length);
  const symbolPenalty = Math.min(0.2, symbols / Math.max(1, text.length));
  const exitBoost = response.OCRExitCode === 1 ? 0.08 : 0;

  const raw = 0.3 + Math.min(0.4, tokenCount * 0.015) + readableRatio * 0.35 + exitBoost - symbolPenalty;
  return Math.max(0.2, Math.min(0.99, raw));
}

async function runOCRPass(uri: string, options: OCRPassOptions): Promise<OCRExtractionResult> {
  const compressed = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: options.width } }],
    { compress: options.compress, format: ImageManipulator.SaveFormat.JPEG }
  );

  const formData = new FormData();
  formData.append("file", { uri: compressed.uri, type: "image/jpeg", name: "photo.jpg" } as unknown as Blob);
  formData.append("apikey", appConfig.ocr.apiKey);
  formData.append("language", options.language);
  formData.append("isOverlayRequired", "false");
  formData.append("scale", "true");
  formData.append("isTable", "false");
  formData.append("OCREngine", "1");

  const response = await fetch(appConfig.ocr.endpoint, {
    method: "POST",
    body: formData,
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`OCR.space HTTP ${response.status}`);
  }

  const data = (await response.json()) as OCRSpaceResponse;

  if (data.IsErroredOnProcessing) {
    const msg = Array.isArray(data.ErrorMessage)
      ? data.ErrorMessage.join(", ")
      : (data.ErrorMessage ?? "onbekende fout");
    throw new Error(`OCR.space fout: ${msg}`);
  }

  const parsed = data.ParsedResults
    ?.map((r) => r.ParsedText ?? "")
    .join("\n")
    .trim() ?? "";

  const cleaned = cleanupOCRText(parsed);
  const confidence = estimatePassConfidence(cleaned, data);

  return {
    text: cleaned,
    confidence,
    pass: options.language === "dut" ? "primary" : "fallback"
  };
}

export async function extractTextFromImageWithQuality(uri: string): Promise<OCRExtractionResult> {
  if (!uri || !appConfig.ocr.apiKey || appConfig.ocr.apiKey === "") {
    return { text: "", confidence: 0, pass: "primary" };
  }

  const primary = await runOCRPass(uri, {
    language: "dut",
    width: 1700,
    compress: 0.72
  });

  const needsFallback = primary.text.length < 24 || primary.confidence < 0.58;
  if (!needsFallback) {
    return primary;
  }

  const fallback = await runOCRPass(uri, {
    language: "eng",
    width: 2200,
    compress: 0.88
  });

  const primaryScore = primary.confidence + Math.min(0.1, primary.text.length / 500);
  const fallbackScore = fallback.confidence + Math.min(0.1, fallback.text.length / 500);

  return fallbackScore > primaryScore ? fallback : primary;
}

/**
 * Extracts text from an image using OCR.space API (works in Expo Go).
 * Compresses the image first to stay within the 1MB free-tier limit.
 * Free API key: https://ocr.space/OCRAPI
 */
export async function extractTextFromImage(uri: string): Promise<string> {
  const result = await extractTextFromImageWithQuality(uri);
  return result.text;
}

/** @deprecated Use extractTextFromImage(uri) instead */
export async function extractTextFromImageBase64(_base64?: string): Promise<string> {
  return "";
}
