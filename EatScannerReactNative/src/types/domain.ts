export type DetectionSource = "OCR" | "Product API" | "LLM";

export type Product = {
  barcode: string;
  name: string;
  ingredientsText?: string;
  allergens?: string[];
  imageUrl?: string;
};

export type ParsedIngredient = {
  original: string;
  normalized: string;
  stem: string;
};

export type IngredientMatch = {
  blockedTerm: string;
  matchedFragment: string;
  source: DetectionSource;
  matchConfidence?: number;
  matchReason?: string;
  relationSource?: "dynamic" | "online" | "ontology" | "product-allergen" | "llm";
};

export type SafetyResult = {
  isSafe: boolean;
  matches: IngredientMatch[];
  confidence: number;
  source: DetectionSource;
};

export type ProductAllergenSignal = {
  label: string;
  normalized: string;
};

export type ScanHistoryEntry = {
  id: string;
  scannedAt: number;
  barcode: string;
  productName: string;
  isSafe: boolean;
  matchedTerms: string[];
};
