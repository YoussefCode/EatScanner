import { fetchOnlineLexiconCandidates } from "./onlineLexicon";
import { fetchOntologyCandidates } from "./ontologyLexicon";
import { normalizeValue, stemValue } from "./parser";

const MAX_ENTRIES = 10;
const BUILD_TIMEOUT_MS = 8000;

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

/**
 * Builds a deduplicated list of up to MAX_ENTRIES synonyms/translations for
 * a blocked term by combining online lexicon + Wikidata ontology results.
 * Called once when the user adds a new blocked ingredient.
 */
export async function buildLexiconEntry(term: string): Promise<string[]> {
  const normalized = normalizeValue(term);
  if (!normalized) return [];

  const [online, ontology] = await Promise.all([
    withTimeout(fetchOnlineLexiconCandidates(normalized), BUILD_TIMEOUT_MS, [] as string[]),
    withTimeout(fetchOntologyCandidates(normalized), BUILD_TIMEOUT_MS, [] as string[]),
  ]);

  const all = [...online, ...ontology];
  const seen = new Set<string>([normalized, stemValue(normalized)]);
  const result: string[] = [];

  for (const raw of all) {
    const n = normalizeValue(raw);
    if (!n || n.length < 3 || seen.has(n)) continue;
    seen.add(n);
    result.push(n);
    if (result.length >= MAX_ENTRIES) break;
  }

  return result;
}
