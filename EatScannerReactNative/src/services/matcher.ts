import { appConfig } from "../config/appConfig";
import { DetectionSource, IngredientMatch, SafetyResult } from "../types/domain";
import { fetchOnlineLexiconCandidates } from "./onlineLexicon";
import { fetchOntologyCandidates } from "./ontologyLexicon";
import { normalizeValue, parseIngredients, stemValue } from "./parser";

type LLMMatch = { fragment: string; normalized: string };

type LLMResponse = {
  found?: LLMMatch[];
};

type EvaluateOptions = {
  useOnlineLookup?: boolean;
  onlineCandidateProvider?: (blockedTerm: string) => Promise<string[]>;
  useOntologyLookup?: boolean;
  ontologyCandidateProvider?: (blockedTerm: string) => Promise<string[]>;
  productAllergens?: string[];
  lookupTimeoutMs?: number;
  /** Pre-built local lexicon: maps each blocked term to its known synonyms/translations. */
  localLexicon?: Record<string, string[]>;
};

const DEFAULT_LOOKUP_TIMEOUT_MS = 600;
const LABEL_NOISE = new Set([
  "ingr",
  "ingredienten",
  "ingredients",
  "ingredient",
  "contains",
  "bevat",
  "allergene",
  "allergen",
  "allergens",
  "sporen",
  "trace",
  "traces",
  "farbstoff",
  "farbstof",
  "kleurstof",
  "colorant",
  "food coloring",
  "kleurmiddel"
]);

const ALLERGEN_FOCUSED_TERMS = new Set([
  "melk",
  "milk",
  "dairy",
  "zuivel",
  "lactose",
  "noten",
  "noot",
  "nuts",
  "pinda",
  "peanut",
  "soja",
  "soy",
  "soybean",
  "sojaboon",
  "gluten",
  "tarwe",
  "wheat",
  "ei",
  "egg",
  "sesam",
  "sesame",
  "vis",
  "fish",
  "garnalen",
  "shrimp",
  "schaaldier",
  "shellfish",
  "mosterd",
  "mustard",
  "selderij",
  "celery",
  "lupine",
  "sulfiet",
  "sulfite",
  "weekdier",
  "mollusc"
]);

const CANDIDATE_NOISE = new Set([
  "farbstoff",
  "farbstof",
  "kleurstof",
  "colorant",
  "food coloring",
  "kleurmiddel",
  "allergene",
  "allergen",
  "allergens"
]);

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeoutPromise = new Promise<T>((resolve) => {
      timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
    });
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function isLikelyNutritionNoise(input: string): boolean {
  const normalized = normalizeValue(input);
  if (!normalized) return true;

  const tokens = normalized.split(/\s+/).filter(Boolean);
  const tokenCount = tokens.length;
  const digitChars = (normalized.match(/\d/g) ?? []).length;
  const digitRatio = digitChars / Math.max(1, normalized.length);

  const nutritionKeywords = [
    "nutritional",
    "nutrition",
    "values",
    "energy",
    "carbohydrates",
    "protein",
    "fat",
    "saturated",
    "per 100 g",
    "portion",
    "kcal",
    "kj",
    "of which"
  ];

  const nutritionHits = nutritionKeywords.filter((keyword) => normalized.includes(keyword)).length;

  const veryLongAndDense = tokenCount > 22 && digitRatio > 0.08;
  const heavyNutritionSection = nutritionHits >= 3 && tokenCount > 10;
  const mostlyNumbers = digitRatio > 0.2;

  return veryLongAndDense || heavyNutritionSection || mostlyNumbers;
}

function compactMatchedFragment(original: string, candidateHint: string): string {
  const raw = original.trim();
  if (!raw) return raw;

  const candidate = normalizeValue(candidateHint);
  const rawTokens = raw.split(/[^A-Za-z0-9]+/).map((value) => value.trim()).filter(Boolean);

  if (candidate) {
    const normalizedCandidateTokens = tokenSet(candidate);
    const directToken = rawTokens.find((token) => {
      const n = normalizeValue(token);
      if (!n) return false;
      if (n === candidate || candidate.includes(n) || n.includes(candidate)) return true;
      for (const cToken of normalizedCandidateTokens) {
        if (n === cToken || n.includes(cToken) || cToken.includes(n)) return true;
      }
      return false;
    });

    if (directToken) {
      return directToken;
    }
  }

  if (raw.length > 72) {
    return `${raw.slice(0, 69)}...`;
  }

  return raw;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[m][n];
}

function damerauLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );

      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }

  return dp[m][n];
}

function normalizedSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const lev = levenshtein(a, b);
  const dam = damerauLevenshtein(a, b);
  const bestDist = Math.min(lev, dam);
  return 1 - bestDist / Math.max(a.length, b.length);
}

function tokenSet(value: string): Set<string> {
  return new Set(
    normalizeValue(value)
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter(Boolean)
  );
}

function isAllergenFocusedTerm(term: string): boolean {
  const normalized = normalizeValue(term);
  if (!normalized) return false;

  if (ALLERGEN_FOCUSED_TERMS.has(normalized)) {
    return true;
  }

  const tokens = tokenSet(normalized);
  for (const token of tokens) {
    if (ALLERGEN_FOCUSED_TERMS.has(token)) {
      return true;
    }
  }

  return false;
}

function dynamicCandidates(blockedTerm: string): Set<string> {
  const normalized = normalizeValue(blockedTerm);
  const candidates = new Set<string>([normalized, stemValue(normalized)]);

  const orthographicVariants = new Set<string>();
  if (normalized.includes("j")) {
    orthographicVariants.add(normalized.replace(/j/g, "y"));
  }
  if (normalized.includes("y")) {
    orthographicVariants.add(normalized.replace(/y/g, "j"));
  }

  for (const variant of orthographicVariants) {
    if (!variant) continue;
    candidates.add(variant);
    candidates.add(stemValue(variant));
  }

  for (const token of tokenSet(normalized)) {
    candidates.add(token);
    candidates.add(stemValue(token));

    if (token.includes("j")) {
      const tokenVariant = token.replace(/j/g, "y");
      candidates.add(tokenVariant);
      candidates.add(stemValue(tokenVariant));
    }

    if (token.includes("y")) {
      const tokenVariant = token.replace(/y/g, "j");
      candidates.add(tokenVariant);
      candidates.add(stemValue(tokenVariant));
    }

    if (token.endsWith("en") && token.length > 4) {
      candidates.add(token.slice(0, -2));
    }
    if (token.endsWith("s") && token.length > 4) {
      candidates.add(token.slice(0, -1));
    }
  }

  return new Set(Array.from(candidates).filter(Boolean));
}

function mergeUniqueMatches(matches: IngredientMatch[]): IngredientMatch[] {
  return Array.from(
    new Map(matches.map((m) => [`${m.blockedTerm}|${m.matchedFragment.toLowerCase()}|${m.source}`, m])).values()
  );
}

async function llmFallbackMatches(
  ingredientsText: string,
  blockedList: string[]
): Promise<LLMMatch[]> {
  if (!appConfig.llm.enabled) {
    return [];
  }

  const prompt = `Je bent een Nederlandse ingredient-parser. Gegeven de volgende ingredientenregel en een lijst verboden ingredienten, antwoord alleen JSON met: found: [array van matches met originele fragmenten en normalized term], explanation: korte Nederlandse zin. Ingredienten: "${ingredientsText}". Verboden: ${JSON.stringify(blockedList)}.`;

  const response = await fetch(appConfig.llm.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${appConfig.llm.apiKey}`
    },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as LLMResponse;
  return data.found ?? [];
}

/**
 * Pre-warms the in-memory candidate caches for each blocked term by firing
 * the online & ontology lookups in the background (fire-and-forget).
 * Call this after loading or updating the blocked-ingredients list so the
 * first real evaluation never has to wait for cold-start network latency.
 */
export function warmCaches(blockedTerms: string[]): void {
  const normalized = blockedTerms.map((t) => normalizeValue(t)).filter(Boolean);
  for (const term of normalized) {
    void fetchOntologyCandidates(term);
    void fetchOnlineLexiconCandidates(term);
  }
}

export async function evaluateSafety(
  ingredientsText: string,
  blockedTerms: string[],
  preferredSource: DetectionSource,
  options: EvaluateOptions = {}
): Promise<SafetyResult> {
  const parsed = parseIngredients(ingredientsText);
  const blockedNormalized = blockedTerms.map((term) => normalizeValue(term)).filter(Boolean);
  const onlineCandidateProvider = options.onlineCandidateProvider ?? fetchOnlineLexiconCandidates;
  const ontologyCandidateProvider = options.ontologyCandidateProvider ?? fetchOntologyCandidates;
  const shouldUseOnlineLookup = options.useOnlineLookup ?? Boolean(options.onlineCandidateProvider);
  const shouldUseOntologyLookup = options.useOntologyLookup ?? true;
  const productAllergens = (options.productAllergens ?? []).map((value) => normalizeValue(value)).filter(Boolean);
  const lookupTimeoutMs = options.lookupTimeoutMs ?? DEFAULT_LOOKUP_TIMEOUT_MS;
  const localLexicon = options.localLexicon ?? {};
  const allowShortAllergenTokens = blockedNormalized.some(
    (term) => term.length <= 2 && isAllergenFocusedTerm(term)
  );

  // --- Parallel online + ontology lookups (previously sequential) ---
  const onlineCandidatesMap = new Map<string, Set<string>>();
  const ontologyCandidatesMap = new Map<string, Set<string>>();

  // Pre-seed from local lexicon so terms that already have a cached lexicon
  // skip the network entirely (the Promise.all below fills gaps only).
  for (const blocked of blockedNormalized) {
    const local = localLexicon[blocked];
    if (local?.length) {
      onlineCandidatesMap.set(blocked, new Set(local.map((v) => normalizeValue(v)).filter(Boolean)));
    }
  }

  await Promise.all([
    shouldUseOnlineLookup
      ? Promise.all(
          blockedNormalized.map(async (blocked) => {
            // Skip network if already seeded from local lexicon
            if (onlineCandidatesMap.has(blocked)) return;
            const online = await withTimeout(onlineCandidateProvider(blocked), lookupTimeoutMs, [] as string[]);
            onlineCandidatesMap.set(blocked, new Set(online.map((v) => normalizeValue(v)).filter(Boolean)));
          })
        )
      : Promise.resolve(),
    shouldUseOntologyLookup
      ? Promise.all(
          blockedNormalized.map(async (blocked) => {
            const ontology = await withTimeout(ontologyCandidateProvider(blocked), lookupTimeoutMs, [] as string[]);
            ontologyCandidatesMap.set(blocked, new Set(ontology.map((v) => normalizeValue(v)).filter(Boolean)));
          })
        )
      : Promise.resolve(),
  ]);

  // --- Precompute candidate sets once per blocked term ---
  const candidateSetsMap = new Map<string, Set<string>>();
  const blockedTokenSetsMap = new Map<string, Set<string>>();
  for (const blocked of blockedNormalized) {
    const signals = new Set<string>(Array.from(dynamicCandidates(blocked)));
    for (const c of onlineCandidatesMap.get(blocked) ?? []) {
      if (!CANDIDATE_NOISE.has(c)) {
        signals.add(c);
        signals.add(stemValue(c));
      }
    }
    for (const c of ontologyCandidatesMap.get(blocked) ?? []) {
      if (!CANDIDATE_NOISE.has(c)) {
        signals.add(c);
        signals.add(stemValue(c));
      }
    }
    candidateSetsMap.set(blocked, signals);
    blockedTokenSetsMap.set(blocked, tokenSet(blocked));
  }

  const matches: IngredientMatch[] = [];

  // --- Allergen-field check (fast path) ---
  for (const blocked of blockedNormalized) {
    if (!isAllergenFocusedTerm(blocked)) {
      continue;
    }

    const candidateSignals = candidateSetsMap.get(blocked)!;

    const allergenHit = productAllergens.find((allergen) => {
      if (LABEL_NOISE.has(allergen)) return false;
      const allergenStem = stemValue(allergen);
      if (candidateSignals.has(allergen) || candidateSignals.has(allergenStem)) return true;
      for (const candidate of candidateSignals) {
        if (!candidate) continue;
          if (CANDIDATE_NOISE.has(candidate)) continue;

        // Keep product-allergen matching strict to avoid broad false positives.
        if (candidate.length <= 3) continue;

        const allergenTokens = tokenSet(allergen);
        if (allergenTokens.has(candidate) || allergenTokens.has(stemValue(candidate))) {
          return true;
        }
      }
      return false;
    });

    if (allergenHit) {
      matches.push({
        blockedTerm: blocked,
        matchedFragment: allergenHit,
        source: "Product API",
        relationSource: "product-allergen",
        matchReason: "Directe match via allergenenveld van product-API",
        matchConfidence: 0.98
      });
    }
  }

  // --- Ingredient text matching ---
  // Track which blocked terms already have allergen hits so we can skip them
  const allergenMatchedTerms = new Set(matches.map((m) => m.blockedTerm));

  for (const ingredient of parsed) {
    if (isLikelyNutritionNoise(ingredient.original)) continue;
    // Skip OCR noise: single chars, very short fragments, and label keywords
    if (ingredient.normalized.length < (allowShortAllergenTokens ? 2 : 3)) continue;
    if (LABEL_NOISE.has(ingredient.normalized)) continue;

    // Precompute tokenSet for this ingredient once (reused across blocked terms)
    const ingredientTokens = tokenSet(ingredient.normalized);

    for (const blocked of blockedNormalized) {
      if (allergenMatchedTerms.has(blocked)) continue; // already matched via allergen field

      const candidates = candidateSetsMap.get(blocked)!;
      const blockedTokens = blockedTokenSetsMap.get(blocked)!;

      let hit = false;
      let reason = "";
      let confidence = 0.8;
      let relationSource: IngredientMatch["relationSource"] = "dynamic";
      let matchedCandidate = "";

      // Exact / stem match (O(1) set lookup)
      if (candidates.has(ingredient.normalized) || candidates.has(ingredient.stem)) {
        hit = true;
        reason = "Exacte of gestemde kandidaatmatch";
        confidence = 0.95;
        matchedCandidate = blocked;
      }

      if (!hit) {
        for (const candidate of candidates) {
          if (!candidate || candidate.length < 3) continue; // skip overly short candidates
          if (CANDIDATE_NOISE.has(candidate)) continue;
          const candidateStem = stemValue(candidate);
          const isShortCandidate = candidate.length <= 3;
          const tokenContainsCandidate = ingredientTokens.has(candidate) || ingredientTokens.has(candidateStem);

          // Guard: candidate.includes(ingredient) only when ingredient makes up >=60% of the candidate
          // Prevents "vanilja" matching "vaniljesuiker" (candidate for "suiker")
          const ingredientIsSubstantialOfCandidate =
            ingredient.normalized.length >= 5 &&
            ingredient.normalized.length >= candidate.length * 0.6;

          if (
            (isShortCandidate ? tokenContainsCandidate : ingredient.normalized.includes(candidate)) ||
            (!isShortCandidate && ingredientIsSubstantialOfCandidate && candidate.includes(ingredient.normalized)) ||
            (isShortCandidate ? tokenContainsCandidate : ingredient.stem.includes(candidateStem))
          ) {
            hit = true;
            relationSource = onlineCandidatesMap.get(blocked)?.has(candidate)
              ? "online"
              : ontologyCandidatesMap.get(blocked)?.has(candidate)
                ? "ontology"
                : "dynamic";
            reason = `Substring/token match via ${relationSource === "dynamic" ? "lokale" : relationSource} kandidaat`;
            confidence = relationSource === "dynamic" ? 0.9 : 0.92;
            matchedCandidate = candidate;
            break;
          }

          // Fuzzy only when lengths are close (skip obviously dissimilar lengths)
          if (Math.abs(ingredient.normalized.length - candidate.length) <= 3) {
            const similarity = Math.max(
              normalizedSimilarity(ingredient.normalized, candidate),
              normalizedSimilarity(ingredient.stem, candidateStem)
            );
            const fuzzyThreshold = Math.max(0.83, candidate.length >= 8 ? 0.81 : 0.83);
            if (similarity >= fuzzyThreshold) {
              hit = true;
              relationSource = onlineCandidatesMap.get(blocked)?.has(candidate)
                ? "online"
                : ontologyCandidatesMap.get(blocked)?.has(candidate)
                  ? "ontology"
                  : "dynamic";
              reason = `Fuzzy match (${Math.round(similarity * 100)}%) via ${relationSource === "dynamic" ? "lokale" : relationSource} kandidaat`;
              confidence = Math.max(0.78, Math.min(0.9, similarity));
              matchedCandidate = candidate;
              break;
            }
          }
        }
      }

      // Token-level fuzzy fallback (only short ingredients & blocked tokens)
      if (!hit) {
        outer: for (const iToken of ingredientTokens) {
          if (iToken.length < 3) continue;
          for (const bToken of blockedTokens) {
            if (bToken.length < 3) continue;
            if (Math.abs(iToken.length - bToken.length) <= 2 && normalizedSimilarity(iToken, bToken) >= 0.90) {
              hit = true;
              reason = "Token-level fuzzy match";
              confidence = 0.84;
              relationSource = "dynamic";
              matchedCandidate = bToken;
              break outer;
            }
          }
        }
      }

      if (hit) {
        matches.push({
          blockedTerm: blocked,
          matchedFragment: compactMatchedFragment(ingredient.original, matchedCandidate || blocked),
          source: preferredSource,
          relationSource,
          matchReason: reason || "Match gevonden",
          matchConfidence: confidence
        });
        allergenMatchedTerms.add(blocked); // skip further ingredients for this blocked term
      }
    }
  }

  let uniqueMatches = mergeUniqueMatches(matches)
    // Drop matches where the matched fragment is suspiciously short (OCR noise)
    .filter((m) => {
      const fragmentLength = m.matchedFragment.trim().length;
      if (fragmentLength >= 3) return true;
      const blocked = normalizeValue(m.blockedTerm);
      return blocked.length <= 2 && isAllergenFocusedTerm(blocked);
    })
    // Drop label-noise fragments such as "allergene" that are not ingredients.
    .filter((m) => !LABEL_NOISE.has(normalizeValue(m.matchedFragment)));

  // LLM fallback is applied per blocked term that still has no hit.
  const matchedBlockedTerms = new Set(uniqueMatches.map((match) => match.blockedTerm));
  const unmatchedBlockedTerms = blockedNormalized.filter((term) => !matchedBlockedTerms.has(term));

  if (unmatchedBlockedTerms.length > 0) {
    const llmResults = await Promise.all(
      unmatchedBlockedTerms.map(async (blockedTerm) => {
        const llmMatches = await llmFallbackMatches(ingredientsText, [blockedTerm]);
        return llmMatches.map((match) => {
          const normalized = normalizeValue(match.normalized);
          const blockedForMatch = normalized || blockedTerm;

          return {
            blockedTerm: blockedForMatch,
            matchedFragment: match.fragment,
            source: "LLM" as const,
            relationSource: "llm" as const,
            matchReason: "LLM fallback classificatie",
            matchConfidence: 0.76
          };
        });
      })
    );

    const flattened = llmResults.flat();
    if (flattened.length > 0) {
      uniqueMatches = mergeUniqueMatches([...uniqueMatches, ...flattened]);
    }
  }

  const isSafe = uniqueMatches.length === 0;
  const confidence = isSafe ? 0.92 : Math.max(0.68, 1 - uniqueMatches.length * 0.07);

  return {
    isSafe,
    matches: uniqueMatches,
    confidence,
    source: uniqueMatches[0]?.source ?? preferredSource
  };
}
