import { appConfig } from "../config/appConfig";
import { NutritionSummary, Product } from "../types/domain";

type OFFResponse = {
  status: number;
  product?: {
    product_name?: string;
    ingredients_text?: string;
    image_front_url?: string;
    image_url?: string;
    allergens_tags?: string[];
    allergens_hierarchy?: string[];
    allergens?: string;
    nutriments?: {
      "energy-kcal_100g"?: number | string;
      "energy-kcal"?: number | string;
      fat_100g?: number | string;
      sugars_100g?: number | string;
      proteins_100g?: number | string;
      salt_100g?: number | string;
    };
  };
};

function toNumber(value: number | string | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return undefined;
}

function normalizeAllergenTag(value: string): string {
  return value
    .replace(/^([a-z]{2}:)/i, "")
    .replace(/_/g, " ")
    .trim()
    .toLowerCase();
}

function extractAllergens(product: OFFResponse["product"]): string[] {
  if (!product) return [];

  const fromTags = (product.allergens_tags ?? []).map(normalizeAllergenTag);
  const fromHierarchy = (product.allergens_hierarchy ?? []).map(normalizeAllergenTag);
  const fromText = (product.allergens ?? "")
    .split(/[;,]/)
    .map((s) => normalizeAllergenTag(s))
    .filter(Boolean);

  return Array.from(new Set([...fromTags, ...fromHierarchy, ...fromText])).filter(Boolean);
}

function extractNutrition(product: OFFResponse["product"]): NutritionSummary | undefined {
  const nutriments = product?.nutriments;
  if (!nutriments) return undefined;

  const nutrition: NutritionSummary = {
    caloriesPer100g: toNumber(nutriments["energy-kcal_100g"]) ?? toNumber(nutriments["energy-kcal"]),
    fatPer100g: toNumber(nutriments.fat_100g),
    sugarsPer100g: toNumber(nutriments.sugars_100g),
    proteinsPer100g: toNumber(nutriments.proteins_100g),
    saltPer100g: toNumber(nutriments.salt_100g)
  };

  if (Object.values(nutrition).every((value) => value == null)) {
    return undefined;
  }

  return nutrition;
}

async function fetchFromUrl(url: string): Promise<OFFResponse | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as OFFResponse;
  } catch {
    return null;
  }
}

export async function fetchProductByBarcode(barcode: string): Promise<Product | null> {
  const trimmed = barcode.trim();
  if (!trimmed) return null;

  const encoded = encodeURIComponent(trimmed);
  let data = await fetchFromUrl(`${appConfig.openFoodFactsBaseUrl}/${encoded}.json`);

  // Fallback to the secondary domain if primary is unreachable
  if (!data) {
    data = await fetchFromUrl(`${appConfig.openFoodFactsFallbackUrl}/${encoded}.json`);
  }

  if (!data) return null;

  if (data.status !== 1 || !data.product) {
    return null;
  }

  return {
    barcode: trimmed,
    name: data.product.product_name?.trim() || "Onbekend product",
    ingredientsText: data.product.ingredients_text,
    allergens: extractAllergens(data.product),
    imageUrl: data.product.image_front_url?.trim() || data.product.image_url?.trim(),
    nutrition: extractNutrition(data.product)
  };
}
