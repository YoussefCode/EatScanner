export const appConfig = {
  openFoodFactsBaseUrl: "https://world.openfoodfacts.net/api/v2/product",
  openFoodFactsFallbackUrl: "https://world.openfoodfacts.org/api/v2/product",
  ocr: {
    // Free API key from https://ocr.space/OCRAPI (no credit card needed)
    apiKey: "K85542550988957", // replace with your free key
    endpoint: "https://api.ocr.space/parse/image"
  },
  cloudOCR: {
    enabledByUserOptIn: false,
    endpoint: "https://vision.googleapis.com/v1/images:annotate",
    apiKey: "GOOGLE_CLOUD_VISION_API_KEY"
  },
  llm: {
    enabled: false,
    endpoint: "https://example.com/llm/ingredient-check",
    apiKey: "LLM_API_KEY"
  }
};
