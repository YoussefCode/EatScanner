import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScanHistoryEntry } from "../types/domain";

const BLOCKED_KEY = "blocked.ingredients.v1";
const HISTORY_KEY = "scan.history.v1";
const LEXICON_KEY = "local.lexicon.v1";
const HISTORY_MAX = 50;
const LEXICON_MAX_PER_TERM = 10;

export async function loadBlockedIngredients(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(BLOCKED_KEY);
    if (!raw) return ["noten", "melk"];

    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return ["noten", "melk"];
    }

    return parsed;
  } catch {
    return ["noten", "melk"];
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
