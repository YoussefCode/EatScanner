export type DetectionSource = "OCR" | "Product API" | "LLM";

export type ContextMode = "home" | "restaurant" | "travel";
export type TravelLanguage = "nl" | "en" | "de" | "fr" | "es";
export type RiskLevel = "avoid" | "caution" | "trace";
export type UserExperienceFeedback = "good" | "reaction";

export type NutritionSummary = {
  caloriesPer100g?: number;
  fatPer100g?: number;
  sugarsPer100g?: number;
  proteinsPer100g?: number;
  saltPer100g?: number;
};

export type Product = {
  barcode: string;
  name: string;
  ingredientsText?: string;
  allergens?: string[];
  imageUrl?: string;
  nutrition?: NutritionSummary;
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

export type AppPreferences = {
  contextMode: ContextMode;
  travelLanguage: TravelLanguage;
};

export type ScanFeedbackEntry = {
  id: string;
  createdAt: number;
  barcode: string;
  productName: string;
  feedback: UserExperienceFeedback;
};
