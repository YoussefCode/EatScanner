import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
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
import { evaluateSafety } from "./src/services/matcher";
import { fetchProductByBarcode } from "./src/services/openFoodFactsService";
import { extractTextFromImageWithQuality } from "./src/services/ocrService";
import {
  addScanFeedbackEntry,
  addScanHistoryEntry,
  clearScanHistory,
  loadBlockedIngredients,
  loadScanFeedback,
  loadScanHistory,
  saveBlockedIngredients
} from "./src/services/storage";
import { buildStaticLexicon, STATIC_INGREDIENT_DICTIONARY } from "./src/services/staticIngredientDictionary";
import {
  IngredientMatch,
  SafetyResult,
  ScanFeedbackEntry,
  ScanHistoryEntry,
  UserExperienceFeedback
} from "./src/types/domain";

const ONBOARDING_SEEN_KEY = "onboarding.seen.v1";

type TextChunk = { text: string; highlighted: boolean };

const REPLACEMENT_TIPS: Record<string, string[]> = {
  ei: ["Kies vegan baked goods (zonder ei)", "Probeer appelmoes of lijnzaad als bak-alternatief", "Gebruik plantaardige mayonaise"],
  perzik: ["Kies appel- of peercompote", "Neem bessen als fruitoptie", "Check pure fruitsappen zonder perzik-aroma"],
  appel: ["Kies peer of perzik als alternatief fruit", "Gebruik bessenmix in plaats van appelmix", "Controleer op appelconcentraat in dranken"],
  peer: ["Kies appel of perzik als alternatief", "Probeer druiven of bessen", "Vermijd blends met peer-puree"]
};

function normalizeTerm(value: string): string {
  return value.trim().toLowerCase();
}

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
  const [ingredientsText, setIngredientsText] = useState("");
  const [productAllergens, setProductAllergens] = useState<string[]>([]);
  const [ocrText, setOcrText] = useState("");
  const [manualOCRText, setManualOCRText] = useState("");
  const [ocrConfidence, setOcrConfidence] = useState(0);
  const [blocked, setBlocked] = useState<string[]>([]);
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
  const [scanFeedback, setScanFeedback] = useState<ScanFeedbackEntry[]>([]);
  const [replacementTips, setReplacementTips] = useState<string[]>([]);
  const [shoppingMode, setShoppingMode] = useState(false);

  const activeLookupIdRef = useRef(0);
  const lastLookupCodeRef = useRef("");
  const lastLookupTimestampRef = useRef(0);

  useEffect(() => {
    void (async () => {
      const [onboardingStored, values, history, feedback] = await Promise.all([
        AsyncStorage.getItem(ONBOARDING_SEEN_KEY),
        loadBlockedIngredients(),
        loadScanHistory(),
        loadScanFeedback(),
      ]);

      const dictionaryMap = new Map(
        STATIC_INGREDIENT_DICTIONARY.map((term) => [term.toLowerCase().trim(), term])
      );
      const normalizedBlocked = Array.from(
        new Set(
          values
            .map((value) => dictionaryMap.get(value.toLowerCase().trim()))
            .filter((value): value is string => Boolean(value))
        )
      );

      setOnboardingSeen(onboardingStored === "1");
      setBlocked(normalizedBlocked);
      setScanHistory(history);
      setScanFeedback(feedback);
      setBootstrapped(true);
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

  const reactionCount = useMemo(
    () => scanFeedback.filter((entry) => entry.feedback === "reaction").length,
    [scanFeedback]
  );

  const latestFeedbackByBarcode = useMemo(() => {
    const map = new Map<string, UserExperienceFeedback>();
    for (const entry of scanFeedback) {
      if (!entry.barcode || map.has(entry.barcode)) continue;
      map.set(entry.barcode, entry.feedback);
    }
    return map;
  }, [scanFeedback]);

  type EvaluateOptions = {
    text: string;
    source: "OCR" | "Product API";
    barcodeValue?: string;
    productNameValue?: string;
    productAllergensValue?: string[];
  };

  const runSafetyEvaluation = async ({
    text,
    source,
    barcodeValue,
    productNameValue,
    productAllergensValue,
  }: EvaluateOptions): Promise<void> => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      Alert.alert("Fout", "Voeg eerst ingredienten toe via API, OCR of handmatig veld.");
      return;
    }

    setEvaluatingSafety(true);
    try {
      const staticLexicon = buildStaticLexicon(blocked);
      const safety = await evaluateSafety(trimmedText, blocked, source, {
        useOnlineLookup: false,
        useOntologyLookup: false,
        productAllergens: productAllergensValue ?? productAllergens,
        localLexicon: staticLexicon
      });

      const matchedTerms = Array.from(new Set(safety.matches.map((m) => normalizeTerm(m.blockedTerm))));
      const tips = matchedTerms.flatMap((term) => REPLACEMENT_TIPS[term] ?? []).slice(0, 4);
      const nextBarcode = (barcodeValue ?? barcode).trim();
      const nextProductName = (productNameValue ?? productName).trim();

      setReplacementTips(Array.from(new Set(tips)));
      setResult(safety);
      showAnalysisToast("success", safety.isSafe ? "Analyse klaar: veilig product" : "Analyse klaar: let op allergenen");

      if (nextBarcode || nextProductName) {
        const entry: ScanHistoryEntry = {
          id: `${Date.now()}-${nextBarcode}`,
          scannedAt: Date.now(),
          barcode: nextBarcode,
          productName: nextProductName || nextBarcode,
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

  const refreshProduct = async (code: string, options?: { autoEvaluate?: boolean }): Promise<void> => {
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

      const nextIngredientsText = product.ingredientsText?.trim() ?? "";
      const nextAllergens = product.allergens ?? [];

      setProductName(product.name);
      setProductImageUrl(product.imageUrl ?? "");
      setProductAllergens(nextAllergens);
      setProductLookupMessage(`Product gevonden: ${product.name}`);
      if (nextIngredientsText) {
        setIngredientsText(nextIngredientsText);
      }

      if (options?.autoEvaluate && nextIngredientsText) {
        await runSafetyEvaluation({
          text: nextIngredientsText,
          source: "Product API",
          barcodeValue: normalizedCode,
          productNameValue: product.name,
          productAllergensValue: nextAllergens,
        });
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

  const processPhoto = async (fromCamera: boolean, options?: { autoEvaluate?: boolean }): Promise<void> => {
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
          if (options?.autoEvaluate) {
            await runSafetyEvaluation({ text: finalText, source: "OCR" });
          }
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
    await runSafetyEvaluation({
      text,
      source: ocrText ? "OCR" : "Product API"
    });
  };

  const toggleBlocked = async (value: string): Promise<void> => {
    const updated = blocked.includes(value)
      ? blocked.filter((item) => item !== value)
      : [...blocked, value].sort();
    setBlocked(updated);
    await saveBlockedIngredients(updated);
  };

  const handleFeedback = async (feedback: UserExperienceFeedback): Promise<void> => {
    const entry: ScanFeedbackEntry = {
      id: `${Date.now()}-${barcode || productName || "manual"}`,
      createdAt: Date.now(),
      barcode: barcode.trim(),
      productName: productName.trim() || "Onbekend product",
      feedback
    };
    const updated = await addScanFeedbackEntry(entry);
    setScanFeedback(updated);
    showAnalysisToast("success", feedback === "good" ? "Bedankt voor je feedback" : "Feedback opgeslagen als reactie");
  };

  const handleShareSafetyCard = async (): Promise<void> => {
    if (!result) return;
    const matched = result.matches.map((m) => m.blockedTerm).join(", ") || "geen matches";
    const card = [
      "EatScanner Safety Card",
      `Product: ${productName || "Onbekend"}`,
      `Status: ${result.isSafe ? "Veilig" : "Niet veilig"}`,
      `Matches: ${matched}`,
      `Score: ${Math.round(result.confidence * 100)}%`
    ].join("\n");

    await Share.share({ message: card });
  };

  const completeOnboarding = async (): Promise<void> => {
    setOnboardingSeen(true);
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, "1");
  };

  const resetScanAndCheck = (): void => {
    setBarcode("");
    setProductName("");
    setProductImageUrl("");
    setIngredientsText("");
    setProductAllergens([]);
    setOcrText("");
    setManualOCRText("");
    setOcrConfidence(0);
    setProductLookupMessage("");
    setResult(null);
    setAnalysisToast(null);
    setReplacementTips([]);
  };

  const headerMetaLabel = activeTab === "scan"
    ? (shoppingMode ? "Supermarkt mode" : "Slimme scanner")
    : activeTab === "history"
      ? "Jouw checks"
      : "Persoonlijk profiel";

  const renderCurrentPage = (): React.ReactElement => {
    if (activeTab === "scan") {
      return (
        <>
          <ScanScreen
            barcode={barcode}
            onBarcodeChange={(value) => setBarcode(normalizeBarcodeInput(value))}
            onResetScan={resetScanAndCheck}
            onOpenScanner={() => setScannerVisible(true)}
            onFetchProduct={() => void refreshProduct(barcode, { autoEvaluate: shoppingMode })}
            loadingProduct={loadingProduct}
            lookupMessage={productLookupMessage}
            productName={productName}
            productImageUrl={productImageUrl}
            ingredientsText={ingredientsText}
            shoppingMode={shoppingMode}
            onShoppingModeChange={setShoppingMode}
            processingOCR={processingOCR}
            manualOCRText={manualOCRText}
            onManualOCRTextChange={(value) => {
              setManualOCRText(value);
              setOcrText(value);
              setIngredientsText(value);
              setOcrConfidence(estimateOCRConfidence(value));
            }}
            onTakePhoto={() => void processPhoto(true, { autoEvaluate: shoppingMode })}
            onUploadPhoto={() => void processPhoto(false, { autoEvaluate: shoppingMode })}
            ocrConfidence={Math.max(ocrConfidence, ocrConfidenceFallback)}
          />

          <CheckScreen
            evaluatingSafety={evaluatingSafety}
            onEvaluate={() => void handleEvaluate()}
            result={result}
            sourceLabel={sourceLabel}
            highlightedChunks={highlightedChunks}
            productName={productName}
            productImageUrl={productImageUrl}
            analysisToast={analysisToast}
            replacementTips={replacementTips}
            onFeedback={(value) => void handleFeedback(value)}
            onShareSafetyCard={() => void handleShareSafetyCard()}
          />
        </>
      );
    }

    if (activeTab === "history") {
      return (
        <HistoryScreen
          history={scanHistory}
          reactionCount={reactionCount}
          latestFeedbackByBarcode={latestFeedbackByBarcode}
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
        dictionary={STATIC_INGREDIENT_DICTIONARY}
        onToggleBlocked={(value) => void toggleBlocked(value)}
      />
    );
  };

  if (!bootstrapped) {
    return (
      <View style={[styles.root, styles.centered]}>
        <StatusBar style="dark" />
        <Text style={styles.helper}>App starten...</Text>
      </View>
    );
  }

  if (!onboardingSeen) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <OnboardingScreen onContinue={() => void completeOnboarding()} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View pointerEvents="none" style={styles.backdropBlobA} />
      <View pointerEvents="none" style={styles.backdropBlobB} />
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
          void refreshProduct(code, { autoEvaluate: shoppingMode });
        }}
      />

      {/* Top header bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <View style={styles.topBarRow}>
          <View style={styles.wordmarkWrap}>
            <View style={styles.wordmark}>
              <View style={styles.wordmarkDot} />
              <Text style={styles.appName}>EatScanner</Text>
            </View>
            <Text style={styles.appSubtitle}>Slim en rustig ingrediënten checken</Text>
          </View>

          <View style={styles.headerPill}>
            <Ionicons name={shoppingMode && activeTab === "scan" ? "flash-outline" : "sparkles-outline"} size={13} color="#1D4ED8" />
            <Text style={styles.headerPillText}>{headerMetaLabel}</Text>
          </View>
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
    backgroundColor: "#DCEBFF"
  },
  topBar: {
    backgroundColor: "rgba(233,244,255,0.94)",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(59,130,246,0.18)"
  },
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  wordmarkWrap: {
    flex: 1,
    gap: 4
  },
  wordmark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  wordmarkDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#1D4ED8"
  },
  appName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#16324F",
    letterSpacing: -0.4
  },
  appSubtitle: {
    fontSize: 12,
    color: "#5E718A",
    fontWeight: "500"
  },
  headerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.14)"
  },
  headerPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D4ED8"
  },
  scrollArea: {
    flex: 1,
    backgroundColor: "#EAF3FF"
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 14,
    paddingBottom: 28,
    flexGrow: 1
  },
  centered: {
    justifyContent: "center",
    alignItems: "center"
  },
  helper: {
    color: "#5E718A",
    fontSize: 14,
    fontWeight: "600"
  },
  backdropBlobA: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255,122,89,0.16)",
    top: -70,
    right: -90
  },
  backdropBlobB: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(34,197,94,0.10)",
    top: 130,
    left: -110
  }
});
