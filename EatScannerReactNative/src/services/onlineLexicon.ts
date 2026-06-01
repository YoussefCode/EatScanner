import { normalizeValue } from "./parser";

const candidateCache = new Map<string, string[]>();
const LOOKUP_LANGUAGES = ["nl", "en", "de", "fr"] as const;
const LOOKUP_LANG_SET = new Set<string>(LOOKUP_LANGUAGES);
const NOISE_TERMS = new Set([
  "food",
  "ingredient",
  "ingredients",
  "product",
  "producten",
  "produit",
  "artikel",
  "nahrung",
  "aliment"
]);

export const SUPPORTED_TRANSLATION_LANGUAGES = [
  "Nederlands (nl)",
  "Engels (en)",
  "Duits (de)",
  "Frans (fr)"
];

function normalizeLabel(raw: string): string {
  return normalizeValue(raw.replace(/_/g, " "));
}

function cleanCandidateList(values: string[], origin: string): string[] {
  const normalizedOrigin = normalizeValue(origin);
  return Array.from(new Set(values.map((v) => normalizeLabel(v)).filter(Boolean))).filter(
    (term) => term.length > 2 && term !== normalizedOrigin && !NOISE_TERMS.has(term)
  );
}

async function fetchTranslationCandidates(seedTerm: string): Promise<string[]> {
  const normalized = normalizeValue(seedTerm);
  if (!normalized) return [];

  const sourceLanguages: Array<"nl" | "en" | "de" | "fr"> = ["nl", "en"];
  const translated: string[] = [];

  const requests: Promise<Response>[] = [];
  for (const source of sourceLanguages) {
    for (const target of LOOKUP_LANGUAGES) {
      if (source === target) continue;

      requests.push(
        fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(normalized)}&langpair=${source}|${target}`
        )
      );
    }
  }

  try {
    const responses = await Promise.all(requests);
    for (const response of responses) {
      if (!response.ok) continue;

      const data = (await response.json()) as {
        responseData?: { translatedText?: string };
      };

      const text = normalizeLabel(data.responseData?.translatedText ?? "");
      if (text && text !== normalized) {
        translated.push(text);
      }
    }
  } catch {
    return [];
  }

  return cleanCandidateList(translated, normalized).slice(0, 20);
}

async function fetchDatamuseCandidates(seedTerms: string[]): Promise<string[]> {
  const englishLikeSeeds = seedTerms
    .map((term) => normalizeValue(term))
    .filter((term) => /^[a-z\s-]+$/.test(term) && term.length >= 3)
    .slice(0, 5);

  if (englishLikeSeeds.length === 0) {
    return [];
  }

  try {
    const requests: Promise<Response>[] = [];
    for (const seed of englishLikeSeeds) {
      requests.push(fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(seed)}&max=20`));
      requests.push(fetch(`https://api.datamuse.com/words?rel_trg=${encodeURIComponent(seed)}&max=20`));
    }

    const responses = await Promise.all(requests);
    const words: string[] = [];

    for (const response of responses) {
      if (!response.ok) continue;
      const data = (await response.json()) as Array<{ word?: string }>;
      for (const item of data) {
        if (item.word) {
          words.push(item.word);
        }
      }
    }

    return cleanCandidateList(words, englishLikeSeeds[0]).slice(0, 40);
  } catch {
    return [];
  }
}

async function fetchSecondHopConceptCandidates(seedTerms: string[]): Promise<string[]> {
  const secondHopSeeds = seedTerms.map((term) => normalizeValue(term)).filter(Boolean).slice(0, 6);
  if (secondHopSeeds.length === 0) {
    return [];
  }

  try {
    const secondHopRequests: Promise<Response>[] = [];
    for (const term of secondHopSeeds) {
      for (const lang of LOOKUP_LANGUAGES) {
        const node = `/c/${lang}/${encodeURIComponent(term)}`;
        secondHopRequests.push(fetch(`https://api.conceptnet.io/query?end=${node}&rel=/r/IsA&limit=30`));
        secondHopRequests.push(fetch(`https://api.conceptnet.io/query?node=${node}&rel=/r/Synonym&limit=30`));
      }
    }

    const responses = await Promise.all(secondHopRequests);
    const results: string[] = [];

    for (const response of responses) {
      if (!response.ok) continue;
      const data = (await response.json()) as {
        edges?: Array<{
          start?: { label?: string; language?: string };
          end?: { label?: string; language?: string };
          weight?: number;
        }>;
      };

      for (const edge of data.edges ?? []) {
        if ((edge.weight ?? 0) < 1.5) continue;

        const start = normalizeLabel(edge.start?.label ?? "");
        const end = normalizeLabel(edge.end?.label ?? "");
        const startLang = edge.start?.language;
        const endLang = edge.end?.language;

        if (start && (!startLang || LOOKUP_LANG_SET.has(startLang))) {
          results.push(start);
        }
        if (end && (!endLang || LOOKUP_LANG_SET.has(endLang))) {
          results.push(end);
        }
      }
    }

    return cleanCandidateList(results, secondHopSeeds[0]).slice(0, 50);
  } catch {
    return [];
  }
}

export async function fetchOnlineLexiconCandidates(blockedTerm: string): Promise<string[]> {
  const normalized = normalizeValue(blockedTerm);
  if (!normalized) {
    return [];
  }

  if (candidateCache.has(normalized)) {
    return candidateCache.get(normalized) ?? [];
  }

  try {
    const translationSeeds = await fetchTranslationCandidates(normalized);
    const datamuseSeeds = await fetchDatamuseCandidates([normalized, ...translationSeeds]);
    const seedTerms = Array.from(new Set([normalized, ...translationSeeds, ...datamuseSeeds])).slice(0, 10);

    const responsePromises: Promise<Response>[] = [];
    for (const term of seedTerms) {
      for (const lang of LOOKUP_LANGUAGES) {
        const node = `/c/${lang}/${encodeURIComponent(term)}`;
        responsePromises.push(fetch(`https://api.conceptnet.io/c/${lang}/${encodeURIComponent(term)}?limit=60`));
        responsePromises.push(fetch(`https://api.conceptnet.io/query?node=${node}&rel=/r/TranslationOf&limit=60`));

        // Generic family expansion: collect children and related parts for any family term.
        responsePromises.push(fetch(`https://api.conceptnet.io/query?end=${node}&rel=/r/IsA&limit=80`));
        responsePromises.push(fetch(`https://api.conceptnet.io/query?end=${node}&rel=/r/PartOf&limit=60`));
        responsePromises.push(fetch(`https://api.conceptnet.io/query?start=${node}&rel=/r/HasA&limit=60`));
      }
    }

    const responses = await Promise.all(responsePromises);

    const labels: string[] = [...translationSeeds, ...datamuseSeeds];
    for (const response of responses) {
      if (!response.ok) continue;

      const data = (await response.json()) as {
        edges?: Array<{
          rel?: { label?: string };
          start?: { label?: string; language?: string };
          end?: { label?: string; language?: string };
          weight?: number;
        }>;
      };

      const allowedRelations = new Set([
        "Synonym",
        "RelatedTo",
        "IsA",
        "PartOf",
        "HasA",
        "FormOf",
        "DerivedFrom",
        "TranslationOf"
      ]);

      for (const edge of data.edges ?? []) {
        if (!allowedRelations.has(edge.rel?.label ?? "")) {
          continue;
        }

        if ((edge.weight ?? 0) < 1) {
          continue;
        }

        const start = normalizeLabel(edge.start?.label ?? "");
        const end = normalizeLabel(edge.end?.label ?? "");

        const startLang = edge.start?.language;
        const endLang = edge.end?.language;

        if (start && start !== normalized && (!startLang || LOOKUP_LANG_SET.has(startLang))) labels.push(start);
        if (end && end !== normalized && (!endLang || LOOKUP_LANG_SET.has(endLang))) labels.push(end);
      }
    }

    const secondHop = await fetchSecondHopConceptCandidates(seedTerms);
    const unique = cleanCandidateList([...labels, ...seedTerms, ...secondHop], normalized).slice(0, 120);
    candidateCache.set(normalized, unique);
    return unique;
  } catch {
    return [];
  }
}
