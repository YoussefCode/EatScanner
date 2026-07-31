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
  rotate?: number;
};

const INGREDIENT_SECTION_MARKERS = [
  /ingredi[eë]nten/i,
  /ingredients?/i,
  /samenstelling/i,
  /composition/i,
  /bevat/i,
  /contains/i,
];

const STOP_SECTION_MARKERS = [
  /voedingswaarde/i,
  /nutrition/i,
  /gemiddelde voedingswaarde/i,
  /bereiding/i,
  /gebruiksaanwijzing/i,
  /ten minste houdbaar/i,
  /best before/i,
  /fabrikant/i,
  /distributeur/i,
  /koel bewaren/i,
  /bewaren/i,
];

export function cleanupOCRText(input: string): string {
  if (!input) return "";

  return input
    .replace(/([A-Za-zÀ-ÿ])-[\r\n]+([A-Za-zÀ-ÿ])/g, "$1$2")
    .replace(/[•·●▪◦]/g, ", ")
    .replace(/\bIngredie?nten?\b/gi, "Ingrediënten")
    .replace(/\bIngr[e3]d[i1]e?nten?\b/gi, "Ingrediënten")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,{2,}/g, ",")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, lines) => !(line === "" && lines[index - 1] === ""))
    .join("\n")
    .trim();
}

export function extractIngredientFocusedText(input: string): string {
  const cleaned = cleanupOCRText(input);
  if (!cleaned) return "";

  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return "";

  const startIndex = lines.findIndex((line) => INGREDIENT_SECTION_MARKERS.some((marker) => marker.test(line)));
  if (startIndex < 0) {
    return cleaned;
  }

  let endIndex = lines.length;
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (STOP_SECTION_MARKERS.some((marker) => marker.test(lines[index]))) {
      endIndex = index;
      break;
    }
  }

  const focused = lines.slice(startIndex, endIndex).join("\n");
  return cleanupOCRText(focused) || cleaned;
}

function estimateIngredientSignal(text: string): number {
  if (!text.trim()) return 0;

  const lower = text.toLowerCase();
  const tokenCount = text.split(/\s+/).filter(Boolean).length;
  const commaCount = (text.match(/,/g) ?? []).length;
  const markerBoost = INGREDIENT_SECTION_MARKERS.some((marker) => marker.test(lower)) ? 0.12 : 0;
  const allergenBoost = /(kan sporen bevatten|may contain|bevat)/i.test(lower) ? 0.06 : 0;
  const lineBoost = text.includes("\n") ? 0.04 : 0;
  const commaBoost = Math.min(0.12, commaCount / Math.max(6, tokenCount * 0.7));
  const noisePenalty = /(www\.|http|facebook|instagram|barcode|scan)/i.test(lower) ? 0.06 : 0;

  return markerBoost + allergenBoost + lineBoost + commaBoost - noisePenalty;
}

export function estimatePassConfidence(text: string, response: OCRSpaceResponse): number {
  if (!text.trim()) return 0;

  const tokenCount = text.split(/\s+/).filter(Boolean).length;
  const letters = (text.match(/[A-Za-zÀ-ÿ]/g) ?? []).length;
  const symbols = (text.match(/[^A-Za-zÀ-ÿ0-9\s,.;:%()\-]/g) ?? []).length;
  const readableRatio = letters / Math.max(1, text.length);
  const symbolPenalty = Math.min(0.2, symbols / Math.max(1, text.length));
  const exitBoost = response.OCRExitCode === 1 ? 0.08 : 0;
  const ingredientSignal = estimateIngredientSignal(text);

  const raw = 0.3
    + Math.min(0.4, tokenCount * 0.015)
    + readableRatio * 0.3
    + ingredientSignal
    + exitBoost
    - symbolPenalty;

  return Math.max(0.2, Math.min(0.99, raw));
}

export function scoreOCRCandidate(result: OCRExtractionResult): number {
  const densityBoost = Math.min(0.12, result.text.length / 480);
  return result.confidence + densityBoost + estimateIngredientSignal(result.text);
}

function chooseBestOCRCandidate(results: OCRExtractionResult[]): OCRExtractionResult {
  return results.reduce((best, current) => {
    if (scoreOCRCandidate(current) > scoreOCRCandidate(best)) {
      return current;
    }
    return best;
  });
}

async function runOCRPass(uri: string, options: OCRPassOptions): Promise<OCRExtractionResult> {
  const actions: ImageManipulator.Action[] = [];
  if (typeof options.rotate === "number") {
    actions.push({ rotate: options.rotate });
  }
  actions.push({ resize: { width: options.width } });

  const compressed = await ImageManipulator.manipulateAsync(
    uri,
    actions,
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
  const focused = extractIngredientFocusedText(cleaned);
  const finalText = focused.length >= Math.max(28, Math.floor(cleaned.length * 0.35)) ? focused : cleaned;
  const confidence = estimatePassConfidence(finalText, data);

  return {
    text: finalText,
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

  const candidates = [primary];

  const needsDutchDetail = primary.text.length < 40 || primary.confidence < 0.7;
  if (needsDutchDetail) {
    candidates.push(await runOCRPass(uri, {
      language: "dut",
      width: 2400,
      compress: 0.9
    }));
  }

  let best = chooseBestOCRCandidate(candidates);
  if (best.text.length >= 42 && best.confidence >= 0.72) {
    return best;
  }

  candidates.push(await runOCRPass(uri, {
    language: "eng",
    width: 2200,
    compress: 0.88
  }));

  best = chooseBestOCRCandidate(candidates);

  const needsRotationRecovery = best.text.length < 28 || best.confidence < 0.55;
  if (needsRotationRecovery) {
    candidates.push(await runOCRPass(uri, {
      language: "eng",
      width: 2200,
      compress: 0.9,
      rotate: 90
    }));

    best = chooseBestOCRCandidate(candidates);
  }

  return best;
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
