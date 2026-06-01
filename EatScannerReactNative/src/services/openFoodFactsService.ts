import { appConfig } from "../config/appConfig";
import { Product } from "../types/domain";

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
  };
};

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
    imageUrl: data.product.image_front_url?.trim() || data.product.image_url?.trim()
  };
}
