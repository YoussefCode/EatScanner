import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { BarcodeScannerModal } from "./src/components/BarcodeScannerModal";
import { AppTab, BottomTabs } from "./src/components/BottomTabs";
import { CheckScreen } from "./src/screens/CheckScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { ScanScreen } from "./src/screens/ScanScreen";
import { evaluateSafety, warmCaches } from "./src/services/matcher";
import { SUPPORTED_TRANSLATION_LANGUAGES } from "./src/services/onlineLexicon";
import { fetchProductByBarcode } from "./src/services/openFoodFactsService";
import { extractTextFromImageWithQuality } from "./src/services/ocrService";
import { normalizeValue } from "./src/services/parser";
import { buildLexiconEntry } from "./src/services/lexiconBuilder";
import { addScanHistoryEntry, clearScanHistory, loadBlockedIngredients, loadLocalLexicon, loadScanHistory, removeLexiconEntry, saveBlockedIngredients, saveLexiconEntry } from "./src/services/storage";
import { IngredientMatch, SafetyResult, ScanHistoryEntry } from "./src/types/domain";

const ONBOARDING_SEEN_KEY = "onboarding.seen.v1";

type TextChunk = { text: string; highlighted: boolean };

function normalizeBarcodeInput(value: string): string {
  return value.replace(/\D/g, "").trim();
}

function eanCheckDigit(base: string): number {
  const digits = base.split("").map((d) => Number(d));
  const sum = digits
    .reverse()
    .reduce((acc, digit, idx) => acc + digit * (idx % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
}

function isValidEAN(code: string): boolean {
  if (!/^\d{8}$|^\d{13}$/.test(code)) {
    return false;
  }

  const base = code.slice(0, -1);
  const expected = Number(code[code.length - 1]);
  return eanCheckDigit(base) === expected;
}

function estimateOCRConfidence(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  const tokenCount = trimmed.split(/\s+/).filter(Boolean).length;
  const letters = (trimmed.match(/[a-zA-Z]/g) ?? []).length;
  const symbols = (trimmed.match(/[^a-zA-Z0-9\s,.;:%()\-]/g) ?? []).length;
  const readableRatio = letters / Math.max(1, trimmed.length);
  const symbolPenalty = Math.min(0.25, symbols / Math.max(1, trimmed.length));

  const base = Math.min(0.98, 0.35 + Math.min(tokenCount, 30) * 0.02 + readableRatio * 0.45);
  return Math.max(0.2, Math.min(0.98, base - symbolPenalty));
}

function buildHighlightedChunks(text: string, matches: IngredientMatch[]): TextChunk[] {
  if (!text.trim() || matches.length === 0) {
    return [{ text, highlighted: false }];
  }

  const ranges = matches
    .map((match) => {
      const fragment = match.matchedFragment.trim();
      if (!fragment) return null;
      const lowerText = text.toLowerCase();
      const idx = lowerText.indexOf(fragment.toLowerCase());
      if (idx < 0) return null;
      return { start: idx, end: idx + fragment.length };
    })
    .filter((range): range is { start: number; end: number } => range !== null)
    .sort((a, b) => a.start - b.start);

  if (ranges.length === 0) {
    return [{ text, highlighted: false }];
  }

  const chunks: TextChunk[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) {
      chunks.push({ text: text.slice(cursor, range.start), highlighted: false });
    }

    const segment = text.slice(Math.max(cursor, range.start), range.end);
    if (segment) {
      chunks.push({ text: segment, highlighted: true });
    }

    cursor = Math.max(cursor, range.end);
  }

  if (cursor < text.length) {
    chunks.push({ text: text.slice(cursor), highlighted: false });
  }

  return chunks;
}

function AppInner(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const analysisToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [barcode, setBarcode] = useState("");
  const [productName, setProductName] = useState("");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [manualProductName, setManualProductName] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [productAllergens, setProductAllergens] = useState<string[]>([]);
  const [ocrText, setOcrText] = useState("");
  const [manualOCRText, setManualOCRText] = useState("");
  const [ocrConfidence, setOcrConfidence] = useState(0);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [newBlocked, setNewBlocked] = useState("");
  const [result, setResult] = useState<SafetyResult | null>(null);
  const [analysisToast, setAnalysisToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [processingOCR, setProcessingOCR] = useState(false);
  const [evaluatingSafety, setEvaluatingSafety] = useState(false);
  const [productLookupMessage, setProductLookupMessage] = useState("");
  const [lastScannedCode, setLastScannedCode] = useState("");
  const [activeTab, setActiveTab] = useState<AppTab>("scan");
  const [onboardingSeen, setOnboardingSeen] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [localLexicon, setLocalLexicon] = useState<Record<string, string[]>>({});

  const activeLookupIdRef = useRef(0);
  const lastLookupCodeRef = useRef("");
  const lastLookupTimestampRef = useRef(0);

  useEffect(() => {
    void (async () => {
      const [onboardingStored, values, lex, history] = await Promise.all([
        AsyncStorage.getItem(ONBOARDING_SEEN_KEY),
        loadBlockedIngredients(),
        loadLocalLexicon(),
        loadScanHistory(),
      ]);

      setOnboardingSeen(onboardingStored === "1");
      setBlocked(values);
      setLocalLexicon(lex);
      setScanHistory(history);
      setBootstrapped(true);

      warmCaches(values);
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (analysisToastTimerRef.current) {
        clearTimeout(analysisToastTimerRef.current);
      }
    };
  }, []);

  const showAnalysisToast = (type: "success" | "error", message: string): void => {
    setAnalysisToast({ type, message });
    if (analysisToastTimerRef.current) {
      clearTimeout(analysisToastTimerRef.current);
    }
    analysisToastTimerRef.current = setTimeout(() => {
      setAnalysisToast(null);
      analysisToastTimerRef.current = null;
    }, 2800);
  };

  const highlightedChunks = useMemo(
    () => buildHighlightedChunks(ingredientsText, result?.matches ?? []),
    [ingredientsText, result?.matches]
  );

  const ocrConfidenceFallback = useMemo(
    () => estimateOCRConfidence((manualOCRText || ocrText).trim()),
    [manualOCRText, ocrText]
  );

  const sourceLabel = result?.source ?? (ocrText ? "OCR" : "Product API");

  const refreshProduct = async (code: string): Promise<void> => {
    if (!code.trim()) {
      Alert.alert("Fout", "Voer eerst een barcode in.");
      return;
    }

    const normalizedCode = normalizeBarcodeInput(code);
    if (!normalizedCode) {
      setProductLookupMessage("Gebruik alleen cijfers voor de barcode.");
      return;
    }

    if (!isValidEAN(normalizedCode)) {
      setProductLookupMessage("Ongeldige barcode. Controleer EAN-8/EAN-13 en probeer opnieuw.");
      return;
    }

    const now = Date.now();
    const withinDuplicateWindowMs = now - lastLookupTimestampRef.current < 1800;
    if (lastLookupCodeRef.current === normalizedCode && withinDuplicateWindowMs) {
      return;
    }

    lastLookupCodeRef.current = normalizedCode;
    lastLookupTimestampRef.current = now;
    const lookupId = activeLookupIdRef.current + 1;
    activeLookupIdRef.current = lookupId;

    setLoadingProduct(true);
    setProductLookupMessage("");
    try {
      const product = await fetchProductByBarcode(normalizedCode);

      if (lookupId !== activeLookupIdRef.current) {
        return;
      }

      if (!product) {
        setProductName("");
        setProductImageUrl("");
        setProductAllergens([]);
        setProductLookupMessage("Geen product gevonden voor deze barcode. Vul handmatig een naam in.");
        return;
      }

      setProductName(product.name);
      setProductImageUrl(product.imageUrl ?? "");
      setProductAllergens(product.allergens ?? []);
      setProductLookupMessage(`Product gevonden: ${product.name}`);
      if (product.ingredientsText?.trim()) {
        setIngredientsText(product.ingredientsText.trim());
      }
    } catch {
      if (lookupId === activeLookupIdRef.current) {
        setProductLookupMessage("Productinformatie ophalen is mislukt. Probeer opnieuw.");
      }
    } finally {
      if (lookupId === activeLookupIdRef.current) {
        setLoadingProduct(false);
      }
    }
  };

  const processPhoto = async (fromCamera: boolean): Promise<void> => {
    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        if (permission.canAskAgain === false) {
          Alert.alert(
            "Permissie vereist",
            "Ga naar Instellingen om camera- of fotobibliotheektoegang in te schakelen.",
            [{ text: "OK" }]
          );
        } else {
          Alert.alert("Fout", "Geen permissie voor camera of fotobibliotheek.");
        }
        return;
      }

      const pickerResult = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.9 });

      if (pickerResult.canceled || pickerResult.assets.length === 0) {
        return;
      }

      setProcessingOCR(true);
      try {
        const image = pickerResult.assets[0];
        const ocrResult = await extractTextFromImageWithQuality(image.uri);
        const finalText = ocrResult.text.trim() || manualOCRText.trim();

        setOcrText(finalText);
        setManualOCRText(finalText);
        setOcrConfidence(ocrResult.confidence || estimateOCRConfidence(finalText));
        if (finalText) {
          setIngredientsText(finalText);
        } else {
          Alert.alert("Tip", "OCR kon geen tekst herkennen. Plak handmatig de ingrediëntentekst in het veld.");
        }
      } finally {
        setProcessingOCR(false);
      }
    } catch (err) {
      Alert.alert("Fout", `Foto verwerking mislukt: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleEvaluate = async (): Promise<void> => {
    const text = manualOCRText.trim() || ingredientsText.trim();
    if (!text) {
      Alert.alert("Fout", "Voeg eerst ingredienten toe via API, OCR of handmatig veld.");
      return;
    }

    setEvaluatingSafety(true);
    try {
      const safety = await evaluateSafety(text, blocked, ocrText ? "OCR" : "Product API", {
        useOnlineLookup: true,
        useOntologyLookup: true,
        productAllergens,
        localLexicon
      });
      setResult(safety);
      showAnalysisToast("success", safety.isSafe ? "Analyse klaar: veilig product" : "Analyse klaar: let op allergenen");

      if (barcode.trim() || productName.trim()) {
        const entry: ScanHistoryEntry = {
          id: `${Date.now()}-${barcode}`,
          scannedAt: Date.now(),
          barcode: barcode.trim(),
          productName: productName.trim() || manualProductName.trim() || barcode.trim(),
          isSafe: safety.isSafe,
          matchedTerms: safety.matches.map((m) => m.blockedTerm)
        };
        const updated = await addScanHistoryEntry(entry);
        setScanHistory(updated);
      }
    } catch {
      showAnalysisToast("error", "Analyse mislukt. Probeer opnieuw.");
    } finally {
      setEvaluatingSafety(false);
    }
  };

  const addBlocked = async (): Promise<void> => {
    const normalized = normalizeValue(newBlocked);
    if (!normalized) {
      return;
    }

    if (blocked.includes(normalized)) {
      setNewBlocked("");
      return;
    }

    const updated = [...blocked, normalized].sort();
    setBlocked(updated);
    setNewBlocked("");
    await saveBlockedIngredients(updated);
    warmCaches([normalized]);
    // Build and persist local lexicon for the new term (fire-and-forget)
    void buildLexiconEntry(normalized).then(async (candidates) => {
      if (candidates.length > 0) {
        await saveLexiconEntry(normalized, candidates);
        setLocalLexicon((prev) => ({ ...prev, [normalized]: candidates }));
      }
    });
  };

  const removeBlocked = async (value: string): Promise<void> => {
    const updated = blocked.filter((item) => item !== value);
    setBlocked(updated);
    await saveBlockedIngredients(updated);
    await removeLexiconEntry(value);
    setLocalLexicon((prev) => {
      const next = { ...prev };
      delete next[value];
      return next;
    });
  };

  const completeOnboarding = async (): Promise<void> => {
    setOnboardingSeen(true);
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, "1");
  };

  const renderCurrentPage = (): React.ReactElement => {
    if (activeTab === "scan") {
      return (
        <ScanScreen
          barcode={barcode}
          onBarcodeChange={(value) => setBarcode(normalizeBarcodeInput(value))}
          onOpenScanner={() => setScannerVisible(true)}
          onFetchProduct={() => void refreshProduct(barcode)}
          loadingProduct={loadingProduct}
          lookupMessage={productLookupMessage}
          productName={productName}
          productImageUrl={productImageUrl}
          ingredientsText={ingredientsText}
          manualProductName={manualProductName}
          onManualProductNameChange={setManualProductName}
          onUseManualName={() => setProductName(manualProductName.trim())}
          processingOCR={processingOCR}
          manualOCRText={manualOCRText}
          onManualOCRTextChange={(value) => {
            setManualOCRText(value);
            setOcrText(value);
            setIngredientsText(value);
            setOcrConfidence(estimateOCRConfidence(value));
          }}
          onTakePhoto={() => void processPhoto(true)}
          onUploadPhoto={() => void processPhoto(false)}
          ocrConfidence={Math.max(ocrConfidence, ocrConfidenceFallback)}
        />
      );
    }

    if (activeTab === "check") {
      return (
        <CheckScreen
          evaluatingSafety={evaluatingSafety}
          onEvaluate={() => void handleEvaluate()}
          result={result}
          sourceLabel={sourceLabel}
          highlightedChunks={highlightedChunks}
          productName={productName}
          productImageUrl={productImageUrl}
          analysisToast={analysisToast}
        />
      );
    }

    if (activeTab === "history") {
      return (
        <HistoryScreen
          history={scanHistory}
          onClear={() => {
            void clearScanHistory().then(() => setScanHistory([]));
          }}
          onSelectEntry={(entry) => {
            if (entry.barcode) setBarcode(entry.barcode);
            setProductName(entry.productName);
            setActiveTab("scan");
          }}
        />
      );
    }

    return (
      <ProfileScreen
        blocked={blocked}
        newBlocked={newBlocked}
        onNewBlockedChange={setNewBlocked}
        onAddBlocked={() => void addBlocked()}
        onRemoveBlocked={(value) => void removeBlocked(value)}
        supportedLanguages={SUPPORTED_TRANSLATION_LANGUAGES}
      />
    );
  };

  if (!bootstrapped) {
    return (
      <View style={[styles.root, styles.centered]}>
        <StatusBar style="light" />
        <Text style={styles.helper}>App starten...</Text>
      </View>
    );
  }

  if (!onboardingSeen) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <OnboardingScreen onContinue={() => void completeOnboarding()} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <BarcodeScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={(code) => {
          if (code !== barcode) {
            setResult(null);
          }

          if (code === lastScannedCode && loadingProduct) {
            return;
          }

          setLastScannedCode(code);
          setBarcode(code);
          void refreshProduct(code);
        }}
      />

      {/* Top header bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.wordmark}>
          <View style={styles.wordmarkDot} />
          <Text style={styles.appName}>EatScanner</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderCurrentPage()}
      </ScrollView>
      <BottomTabs activeTab={activeTab} onTabChange={setActiveTab} bottomInset={insets.bottom} />
    </View>
  );
}

export default function App(): React.ReactElement {
  return (
    <SafeAreaProvider>
      <AppInner />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0C0B0A"
  },
  topBar: {
    backgroundColor: "#0C0B0A",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.07)"
  },
  wordmark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  wordmarkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981"
  },
  appName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#F7F6F5",
    letterSpacing: -0.4
  },
  scrollArea: {
    flex: 1,
    backgroundColor: "#F7F6F5"
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 12,
    paddingBottom: 24,
    flexGrow: 1
  },
  centered: {
    justifyContent: "center",
    alignItems: "center"
  },
  helper: {
    color: "#A8A29E",
    fontSize: 14
  }
});
