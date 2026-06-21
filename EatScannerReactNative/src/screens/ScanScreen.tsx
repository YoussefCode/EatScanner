import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#FFF8EF",
  surface: "#FFFFFF",
  surfaceRaised: "#FFF4E6",
  border: "rgba(138,114,91,0.20)",
  borderFocus: "rgba(255,122,89,0.30)",
  text: "#35282A",
  textMuted: "#7E6D6C",
  textSubtle: "#B59E9A",
  emerald: "#22C55E",
  emeraldSoft: "rgba(34,197,94,0.12)",
  amber: "#F59E0B",
  amberSoft: "rgba(245,158,11,0.10)",
  danger: "#EF4444",
} as const;

type ScanMode = "barcode" | "ocr";

function parseIngredientTokens(value: string): string[] {
  if (!value.trim()) return [];

  return value
    .replace(/\r/g, "\n")
    .split(/[\n,;]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token, index, arr) => arr.findIndex((t) => t.toLowerCase() === token.toLowerCase()) === index);
}

type Props = {
  barcode: string;
  onBarcodeChange: (value: string) => void;
  onResetScan: () => void;
  onOpenScanner: () => void;
  onFetchProduct: () => void;
  loadingProduct: boolean;
  lookupMessage: string;
  productName: string;
  productImageUrl: string;
  ingredientsText: string;
  // OCR
  processingOCR: boolean;
  manualOCRText: string;
  onManualOCRTextChange: (value: string) => void;
  onTakePhoto: () => void;
  onUploadPhoto: () => void;
  ocrConfidence: number;
};

export function ScanScreen({
  barcode,
  onBarcodeChange,
  onResetScan,
  onOpenScanner,
  onFetchProduct,
  loadingProduct,
  lookupMessage,
  productName,
  productImageUrl,
  ingredientsText,
  processingOCR,
  manualOCRText,
  onManualOCRTextChange,
  onTakePhoto,
  onUploadPhoto,
  ocrConfidence
}: Props): React.ReactElement {
  const [mode, setMode] = useState<ScanMode>("barcode");
  const enterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [enterAnim]);

  const ocrPct = Math.round(ocrConfidence * 100);
  const ingredientTokens = parseIngredientTokens(ingredientsText);
  const visibleIngredients = ingredientTokens.slice(0, 16);
  const hiddenCount = Math.max(0, ingredientTokens.length - visibleIngredients.length);

  return (
    <Animated.View
      style={[
        s.root,
        {
          opacity: enterAnim,
          transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }]
        }
      ]}
    >

      <View style={s.heroCard}>
        <View style={s.heroOrbOne} />
        <View style={s.heroOrbTwo} />
        <View style={s.heroIconWrap}>
          <Ionicons name="sparkles" size={18} color={C.emerald} />
        </View>
        <View style={s.heroTextWrap}>
          <Text style={s.heroTitle}>Food Guard 🥗</Text>
          <Text style={s.heroBody}>Scan sneller, begrijp direct wat veilig is voor jou.</Text>
        </View>
      </View>

      {/* ── Page heading ─────────────────────────────────────────── */}
      <View style={s.headingRow}>
        <View style={s.heading}>
          <Text style={s.headingTitle}>Scannen</Text>
          <Text style={s.headingBody}>Barcode of foto van het etiket</Text>
        </View>
        <TouchableOpacity style={s.resetBtn} onPress={onResetScan} activeOpacity={0.8}>
          <Ionicons name="refresh-outline" size={14} color={C.textMuted} />
          <Text style={s.resetBtnText}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* ── Mode toggle ──────────────────────────────────────────── */}
      <View style={s.toggle}>
        <TouchableOpacity
          style={[s.toggleBtn, mode === "barcode" && s.toggleBtnActive]}
          onPress={() => setMode("barcode")}
          activeOpacity={0.7}
        >
          <Ionicons name="barcode-outline" size={14} color={mode === "barcode" ? C.emerald : C.textSubtle} />
          <Text style={[s.toggleLabel, mode === "barcode" && s.toggleLabelActive]}>Barcode</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.toggleBtn, mode === "ocr" && s.toggleBtnActive]}
          onPress={() => setMode("ocr")}
          activeOpacity={0.7}
        >
          <Ionicons name="camera-outline" size={14} color={mode === "ocr" ? C.emerald : C.textSubtle} />
          <Text style={[s.toggleLabel, mode === "ocr" && s.toggleLabelActive]}>Etiket foto</Text>
        </TouchableOpacity>
      </View>

      {mode === "barcode" ? (
        <>
          {/* ── Barcode input surface ──────────────────────────────── */}
          <View style={s.surface}>
            <Text style={s.surfaceLabel}>Cijfercode</Text>
            <View style={s.inputRow}>
              <TextInput
                value={barcode}
                onChangeText={onBarcodeChange}
                placeholder="8710400531629"
                keyboardType="number-pad"
                style={s.codeInput}
                placeholderTextColor={C.textSubtle}
                returnKeyType="search"
                onSubmitEditing={onFetchProduct}
              />
              <TouchableOpacity
                style={[s.searchBtn, (!barcode || loadingProduct) && s.searchBtnOff]}
                onPress={onFetchProduct}
                disabled={!barcode || loadingProduct}
                activeOpacity={0.8}
              >
                {loadingProduct
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="search" size={18} color="#fff" />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.cameraRow} onPress={onOpenScanner} activeOpacity={0.7}>
              <Ionicons name="scan-outline" size={16} color={C.textMuted} />
              <Text style={s.cameraRowText}>Scan met camera</Text>
              <Ionicons name="chevron-forward" size={14} color={C.textSubtle} style={s.cameraRowChevron} />
            </TouchableOpacity>
          </View>

          {/* ── Lookup status ─────────────────────────────────────── */}
          {!!lookupMessage && (
            <View style={[s.statusRow, productName ? s.statusRowOk : s.statusRowInfo]}>
              <Ionicons
                name={productName ? "checkmark-circle" : "information-circle-outline"}
                size={15}
                color={productName ? C.emerald : C.textMuted}
              />
              <Text style={s.statusText}>{lookupMessage}</Text>
            </View>
          )}

          {/* ── Product found card ────────────────────────────────── */}
          {productName && ingredientsText.trim() ? (
            <View style={s.productCard}>
              <View style={s.productThumbWrap}>
                {productImageUrl ? (
                  <Image source={{ uri: productImageUrl }} style={s.productThumb} resizeMode="cover" />
                ) : (
                  <View style={s.productThumbFallback}>
                    <Ionicons name="cube-outline" size={16} color={C.textSubtle} />
                  </View>
                )}
              </View>
              <View style={s.productCardLeft}>
                <Text style={s.productCardName} numberOfLines={1}>{productName}</Text>
                <Text style={s.productCardSub} numberOfLines={2}>{ingredientsText.slice(0, 80)}{ingredientsText.length > 80 ? "…" : ""}</Text>
              </View>
              <View style={s.productCardBadge}>
                <Ionicons name="checkmark" size={12} color={C.emerald} />
              </View>
            </View>
          ) : null}

          {/* ── Manual section ────────────────────────────────────── */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>of handmatig</Text>
            <View style={s.dividerLine} />
          </View>

          <View style={s.surface}>
            <Text style={s.surfaceLabel}>Ingrediëntenlijst</Text>
            {ingredientTokens.length > 0 ? (
              <View style={s.ingredientsCard}>
                <View style={s.ingredientsHeaderRow}>
                  <Text style={s.ingredientsTitle}>Herkende ingrediënten</Text>
                  <View style={s.ingredientsCountPill}>
                    <Text style={s.ingredientsCountText}>{ingredientTokens.length}</Text>
                  </View>
                </View>

                <View style={s.ingredientsWrap}>
                  {visibleIngredients.map((token) => (
                    <View key={token} style={s.ingredientChip}>
                      <Text style={s.ingredientChipText}>{token}</Text>
                    </View>
                  ))}
                  {hiddenCount > 0 && (
                    <View style={[s.ingredientChip, s.ingredientChipMore]}>
                      <Text style={s.ingredientChipMoreText}>+{hiddenCount} meer</Text>
                    </View>
                  )}
                </View>

                <Text style={s.ingredientsHint} numberOfLines={2}>
                  Ruwe tekst is ingekort voor leesbaarheid. In Controle zie je de volledige analyse.
                </Text>
              </View>
            ) : (
              <View style={s.ingredientsEmpty}>
                <Ionicons name="receipt-outline" size={14} color={C.textSubtle} />
                <Text style={s.ingredientsEmptyText}>Nog geen ingrediënten beschikbaar.</Text>
              </View>
            )}
          </View>
        </>
      ) : (
        <>
          {/* ── OCR surface ───────────────────────────────────────── */}
          <View style={s.surface}>
            <Text style={s.surfaceLabel}>Foto kiezen</Text>
            <View style={s.photoRow}>
              <TouchableOpacity style={s.photoBtn} onPress={onTakePhoto} activeOpacity={0.8}>
                {processingOCR
                  ? <ActivityIndicator size="small" color={C.text} />
                  : <Ionicons name="camera-outline" size={20} color={C.text} />}
                <Text style={s.photoBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.photoBtn, s.photoBtnAlt]} onPress={onUploadPhoto} activeOpacity={0.8}>
                <Ionicons name="image-outline" size={20} color={C.textMuted} />
                <Text style={[s.photoBtnText, { color: C.textMuted }]}>Bibliotheek</Text>
              </TouchableOpacity>
            </View>

            <View style={s.liveCoachCard}>
              <View style={s.liveCoachHead}>
                <Ionicons name="sparkles-outline" size={14} color="#FF7A59" />
                <Text style={s.liveCoachTitle}>Label Coach Live</Text>
              </View>
              <Text style={s.liveCoachText}>
                Tip: richt op de ingrediëntenlijst, vermijd reflectie en hou de camera 20-30 cm van het label.
              </Text>
            </View>

            {processingOCR ? (
              <View style={s.processingRow}>
                <ActivityIndicator size="small" color={C.emerald} />
                <Text style={s.processingText}>Tekst herkennen…</Text>
              </View>
            ) : null}

            {!!manualOCRText.trim() && (
              <View style={s.ocrConfidenceCard}>
                <View style={s.ocrConfidenceHead}>
                  <Text style={s.ocrConfidenceLabel}>OCR kwaliteit</Text>
                  <Text style={s.ocrConfidenceValue}>{ocrPct}%</Text>
                </View>
                <View style={s.ocrTrack}>
                  <View style={[s.ocrFill, { width: `${ocrPct}%` }]} />
                </View>
                <Text style={s.ocrHintText}>
                  {ocrPct >= 75
                    ? "Ziet er goed uit. Je kunt analyseren."
                    : "Kwaliteit is wat lager. Controleer even op OCR-foutjes."}
                </Text>
              </View>
            )}
          </View>

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>gevonden tekst</Text>
            <View style={s.dividerLine} />
          </View>

          <View style={s.surface}>
            <Text style={s.surfaceLabel}>Bewerk herkende tekst</Text>
            <TextInput
              value={manualOCRText}
              onChangeText={onManualOCRTextChange}
              placeholder="Tekst verschijnt hier na het scannen…"
              multiline
              style={s.textArea}
              placeholderTextColor={C.textSubtle}
            />
            {ingredientsText.trim() ? (
              <View style={s.ocrResult}>
                <Ionicons name="document-text-outline" size={13} color={C.emerald} />
                <Text style={s.ocrResultText} numberOfLines={3}>{ingredientsText}</Text>
              </View>
            ) : null}
          </View>
        </>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: {
    gap: 10
  },
  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10
  },
  heroCard: {
    backgroundColor: "#FFE8C7",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(220,166,96,0.55)",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden"
  },
  heroOrbOne: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.28)",
    right: -25,
    top: -40
  },
  heroOrbTwo: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,122,89,0.18)",
    right: 46,
    bottom: -26
  },
  heroIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.72)",
    alignItems: "center",
    justifyContent: "center"
  },
  heroTextWrap: {
    flex: 1,
    gap: 2
  },
  heroTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#493329",
    letterSpacing: -0.2
  },
  heroBody: {
    fontSize: 12,
    color: "#7E6457"
  },
  // Heading
  heading: {
    flex: 1,
    paddingHorizontal: 2,
    paddingBottom: 4,
    gap: 2
  },
  headingTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.6
  },
  headingBody: {
    fontSize: 14,
    color: C.textMuted,
    fontWeight: "400"
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: C.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    marginTop: 2
  },
  resetBtnText: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: "600"
  },
  // Toggle
  toggle: {
    flexDirection: "row",
    backgroundColor: "#FFEED9",
    borderRadius: 12,
    padding: 3,
    gap: 2
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10
  },
  toggleBtnActive: {
    backgroundColor: C.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,122,89,0.22)",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: C.textSubtle
  },
  toggleLabelActive: {
    color: C.emerald,
    fontWeight: "600"
  },
  // Surface card
  surface: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
  },
  surfaceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.textSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.7
  },
  // Barcode input row
  inputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center"
  },
  codeInput: {
    flex: 1,
    height: 46,
    backgroundColor: C.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "500",
    color: C.text,
    letterSpacing: 1
  },
  searchBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#FF7A59",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF7A59",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3
  },
  searchBtnOff: {
    backgroundColor: "#FFC7B8",
    shadowOpacity: 0
  },
  // Camera row
  cameraRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border
  },
  cameraRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: C.textMuted
  },
  cameraRowChevron: {
    marginLeft: "auto"
  },
  // Status row
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth
  },
  statusRowOk: {
    backgroundColor: C.emeraldSoft,
    borderColor: "rgba(16,185,129,0.2)"
  },
  statusRowInfo: {
    backgroundColor: "#FFF4E6",
    borderColor: C.border
  },
  statusText: {
    fontSize: 13,
    color: C.textMuted,
    flex: 1,
    fontWeight: "500"
  },
  // Product card
  productCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(16,185,129,0.2)",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  productThumbWrap: {
    width: 50,
    height: 50,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    backgroundColor: C.surfaceRaised
  },
  productThumb: {
    width: "100%",
    height: "100%"
  },
  productThumbFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  productCardLeft: {
    flex: 1,
    gap: 3
  },
  productCardName: {
    fontSize: 15,
    fontWeight: "600",
    color: C.text,
    letterSpacing: -0.2
  },
  productCardSub: {
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 17
  },
  productCardBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.emeraldSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border
  },
  dividerText: {
    fontSize: 11,
    fontWeight: "500",
    color: C.textSubtle,
    letterSpacing: 0.4
  },
  // Text inputs
  ingredientsCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    backgroundColor: C.surfaceRaised,
    padding: 12,
    gap: 10
  },
  ingredientsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  ingredientsTitle: {
    fontSize: 13,
    color: C.text,
    fontWeight: "700"
  },
  ingredientsCountPill: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.emeraldSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(16,185,129,0.2)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7
  },
  ingredientsCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.emerald
  },
  ingredientsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7
  },
  ingredientChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: "100%"
  },
  ingredientChipText: {
    fontSize: 12,
    color: C.text,
    fontWeight: "500"
  },
  ingredientChipMore: {
    backgroundColor: "#FFE7D4"
  },
  ingredientChipMoreText: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: "600"
  },
  ingredientsHint: {
    fontSize: 11,
    color: C.textMuted,
    lineHeight: 16
  },
  ingredientsEmpty: {
    minHeight: 56,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    backgroundColor: C.surfaceRaised,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 10
  },
  ingredientsEmptyText: {
    fontSize: 12,
    color: C.textSubtle,
    fontWeight: "500"
  },
  textArea: {
    backgroundColor: C.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.text,
    minHeight: 90,
    textAlignVertical: "top"
  },
  // Photo buttons
  photoRow: {
    flexDirection: "row",
    gap: 10
  },
  photoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#FF7A59",
    borderRadius: 13,
    paddingVertical: 13,
    shadowColor: "#FF7A59",
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3
  },
  photoBtnAlt: {
    backgroundColor: "#FFEFD9",
    shadowOpacity: 0
  },
  photoBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff"
  },
  processingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 4
  },
  processingText: {
    fontSize: 13,
    color: C.emerald,
    fontWeight: "600"
  },
  ocrResult: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border
  },
  ocrResultText: {
    flex: 1,
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 18
  },
  ocrConfidenceCard: {
    marginTop: 4,
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    backgroundColor: C.surfaceRaised,
    gap: 6
  },
  ocrConfidenceHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  ocrConfidenceLabel: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: "500"
  },
  ocrConfidenceValue: {
    fontSize: 12,
    color: C.text,
    fontWeight: "700"
  },
  ocrTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.08)",
    overflow: "hidden"
  },
  ocrFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: C.emerald
  },
  ocrHintText: {
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 17
  },
  liveCoachCard: {
    marginTop: 6,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,122,89,0.3)",
    backgroundColor: "#FFF1E8",
    padding: 10,
    gap: 5
  },
  liveCoachHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  liveCoachTitle: {
    fontSize: 12,
    color: "#B5482E",
    fontWeight: "700"
  },
  liveCoachText: {
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 17
  }
});
