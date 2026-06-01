import { ParsedIngredient } from "../types/domain";

export function normalizeValue(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function stemValue(value: string): string {
  let candidate = value;
  const suffixes = ["eren", "en", "tje", "jes", "s", "e"];

  for (const suffix of suffixes) {
    if (candidate.endsWith(suffix) && candidate.length > suffix.length + 2) {
      candidate = candidate.slice(0, -suffix.length);
      break;
    }
  }

  return candidate;
}

export function parseIngredients(text: string): ParsedIngredient[] {
  const withoutParentheses = text.replace(/\([^)]*\)/g, "");
  const withoutPercentages = withoutParentheses.replace(/\d+[.,]?\d*\s*%/g, "");

  const normalizedSeparators = withoutPercentages
    .replace(/\n/g, ",")
    .replace(/;/g, ",")
    .replace(/:/g, ",");

  return normalizedSeparators
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const normalized = normalizeValue(token);
      return {
        original: token,
        normalized,
        stem: stemValue(normalized)
      };
    });
}
