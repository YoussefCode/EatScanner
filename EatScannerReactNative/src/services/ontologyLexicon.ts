import { normalizeValue } from "./parser";

const ontologyCache = new Map<string, string[]>();
const LANGS = ["nl", "en", "de", "fr"];

function clean(values: string[], term: string): string[] {
  const origin = normalizeValue(term);
  return Array.from(new Set(values.map((v) => normalizeValue(v)).filter(Boolean))).filter(
    (value) => value.length > 2 && value !== origin
  );
}

async function fetchEntityIds(term: string): Promise<string[]> {
  const ids: string[] = [];

  await Promise.all(
    LANGS.map(async (lang) => {
      try {
        const response = await fetch(
          `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=${lang}&search=${encodeURIComponent(term)}&limit=4&origin=*`
        );
        if (!response.ok) return;

        const data = (await response.json()) as {
          search?: Array<{ id?: string }>;
        };

        for (const item of data.search ?? []) {
          if (item.id) ids.push(item.id);
        }
      } catch {
        // Ignore network errors per language.
      }
    })
  );

  return Array.from(new Set(ids));
}

async function fetchEntities(ids: string[]): Promise<Record<string, unknown>> {
  if (ids.length === 0) return {};

  try {
    const response = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=${ids.join("|")}&languages=${LANGS.join("|")}&props=labels|aliases|claims&origin=*`
    );
    if (!response.ok) return {};

    const data = (await response.json()) as {
      entities?: Record<string, unknown>;
    };
    return data.entities ?? {};
  } catch {
    return {};
  }
}

function collectEntityTerms(entity: Record<string, any>): { terms: string[]; linkedIds: string[] } {
  const terms: string[] = [];
  const linkedIds: string[] = [];

  const labels = entity.labels as Record<string, { value?: string }> | undefined;
  const aliases = entity.aliases as Record<string, Array<{ value?: string }>> | undefined;
  const claims = entity.claims as Record<string, any[]> | undefined;

  for (const lang of LANGS) {
    const label = labels?.[lang]?.value;
    if (label) terms.push(label);

    for (const alias of aliases?.[lang] ?? []) {
      if (alias.value) terms.push(alias.value);
    }
  }

  const relationKeys = ["P279", "P31", "P361", "P527"];
  for (const relation of relationKeys) {
    for (const claim of claims?.[relation] ?? []) {
      const id = claim?.mainsnak?.datavalue?.value?.id;
      if (typeof id === "string" && id.startsWith("Q")) {
        linkedIds.push(id);
      }
    }
  }

  return { terms, linkedIds };
}

export async function fetchOntologyCandidates(term: string): Promise<string[]> {
  const normalized = normalizeValue(term);
  if (!normalized) return [];

  if (ontologyCache.has(normalized)) {
    return ontologyCache.get(normalized) ?? [];
  }

  const ids = await fetchEntityIds(normalized);
  const entities = await fetchEntities(ids);

  const collectedTerms: string[] = [];
  const linkedIds: string[] = [];

  for (const entity of Object.values(entities)) {
    const { terms, linkedIds: relIds } = collectEntityTerms(entity as Record<string, any>);
    collectedTerms.push(...terms);
    linkedIds.push(...relIds);
  }

  const secondHopEntities = await fetchEntities(Array.from(new Set(linkedIds)).slice(0, 24));
  for (const entity of Object.values(secondHopEntities)) {
    const { terms } = collectEntityTerms(entity as Record<string, any>);
    collectedTerms.push(...terms);
  }

  const result = clean(collectedTerms, normalized).slice(0, 120);
  ontologyCache.set(normalized, result);
  return result;
}
