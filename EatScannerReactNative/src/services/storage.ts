import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppPreferences, RiskLevel, ScanFeedbackEntry, ScanHistoryEntry } from "../types/domain";

const BLOCKED_KEY = "blocked.ingredients.v1";
const HISTORY_KEY = "scan.history.v1";
const LEXICON_KEY = "local.lexicon.v1";
const PREFS_KEY = "app.preferences.v1";
const RISK_LEVELS_KEY = "ingredient.risk.levels.v1";
const FEEDBACK_KEY = "scan.feedback.v1";
const HISTORY_MAX = 50;
const LEXICON_MAX_PER_TERM = 10;
const FEEDBACK_MAX = 120;

const DEFAULT_PREFS: AppPreferences = {
  contextMode: "home",
  travelLanguage: "en"
};

export async function loadBlockedIngredients(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(BLOCKED_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

export async function saveBlockedIngredients(values: string[]): Promise<void> {
  await AsyncStorage.setItem(BLOCKED_KEY, JSON.stringify(values));
}

export async function loadScanHistory(): Promise<ScanHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScanHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addScanHistoryEntry(entry: ScanHistoryEntry): Promise<ScanHistoryEntry[]> {
  const current = await loadScanHistory();
  const filtered = current.filter((e) => e.barcode !== entry.barcode);
  const updated = [entry, ...filtered].slice(0, HISTORY_MAX);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

export async function clearScanHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

// ── Local lexicon ──────────────────────────────────────────────────────────────
// Persists up to LEXICON_MAX_PER_TERM synonyms/translations per blocked term so
// evaluateSafety can match without hitting the network on every evaluation.

export async function loadLocalLexicon(): Promise<Record<string, string[]>> {
  try {
    const raw = await AsyncStorage.getItem(LEXICON_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveLexiconEntry(term: string, candidates: string[]): Promise<void> {
  const lexicon = await loadLocalLexicon();
  lexicon[term] = candidates.slice(0, LEXICON_MAX_PER_TERM);
  await AsyncStorage.setItem(LEXICON_KEY, JSON.stringify(lexicon));
}

export async function removeLexiconEntry(term: string): Promise<void> {
  const lexicon = await loadLocalLexicon();
  delete lexicon[term];
  await AsyncStorage.setItem(LEXICON_KEY, JSON.stringify(lexicon));
}

export async function loadAppPreferences(): Promise<AppPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<AppPreferences>;
    return {
      contextMode: parsed.contextMode ?? DEFAULT_PREFS.contextMode,
      travelLanguage: parsed.travelLanguage ?? DEFAULT_PREFS.travelLanguage
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function saveAppPreferences(values: AppPreferences): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(values));
}

export async function loadRiskLevels(): Promise<Record<string, RiskLevel>> {
  try {
    const raw = await AsyncStorage.getItem(RISK_LEVELS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, RiskLevel>;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveRiskLevels(values: Record<string, RiskLevel>): Promise<void> {
  await AsyncStorage.setItem(RISK_LEVELS_KEY, JSON.stringify(values));
}

export async function loadScanFeedback(): Promise<ScanFeedbackEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(FEEDBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScanFeedbackEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addScanFeedbackEntry(entry: ScanFeedbackEntry): Promise<ScanFeedbackEntry[]> {
  const current = await loadScanFeedback();
  const updated = [entry, ...current].slice(0, FEEDBACK_MAX);
  await AsyncStorage.setItem(FEEDBACK_KEY, JSON.stringify(updated));
  return updated;
}
