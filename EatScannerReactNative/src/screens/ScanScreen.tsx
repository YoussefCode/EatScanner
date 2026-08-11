import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NutritionSummary } from "../types/domain";

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

function formatMetric(value: number | undefined, unit: string): string | null {
  if (value == null || Number.isNaN(value)) return null;
  if (unit === "kcal") return `${Math.round(value)} ${unit}`;
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${unit}`;
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
  productNutrition: NutritionSummary | null;
  ingredientsText: string;
  shoppingMode: boolean;
  onShoppingModeChange: (value: boolean) => void;
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
  productNutrition,
  ingredientsText,
  shoppingMode,
  onShoppingModeChange,
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

  useEffect(() => {
    if (shoppingMode) {
      setMode("barcode");
    }
  }, [shoppingMode]);

  const ocrPct = Math.round(ocrConfidence * 100);
  const ingredientTokens = parseIngredientTokens(ingredientsText);
  const visibleIngredients = ingredientTokens.slice(0, 16);
  const hiddenCount = Math.max(0, ingredientTokens.length - visibleIngredients.length);
  const nutritionItems = [
    { label: "kcal", value: formatMetric(productNutrition?.caloriesPer100g, "kcal") },
    { label: "vet", value: formatMetric(productNutrition?.fatPer100g, "g") },
    { label: "suiker", value: formatMetric(productNutrition?.sugarsPer100g, "g") },
    { label: "eiwit", value: formatMetric(productNutrition?.proteinsPer100g, "g") },
    { label: "zout", value: formatMetric(productNutrition?.saltPer100g, "g") }
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));

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

        <View style={s.heroBadge}>
          <Ionicons name="shield-checkmark-outline" size={13} color="#1D4ED8" />
          <Text style={s.heroBadgeText}>Slimme labelcheck</Text>
        </View>

        <View style={s.heroMainRow}>
          <View style={s.heroTextWrap}>
            <Text style={s.heroTitle}>Food Guard</Text>
            <Text style={s.heroHeadline}>Snel eten checken.</Text>
            <Text style={s.heroBody}>Scan barcode of etiket.</Text>
          </View>

          <View style={s.heroVisual}>
            <View style={s.heroIconWrap}>
              <Ionicons name="sparkles" size={22} color={C.emerald} />
            </View>
            <View style={s.heroMiniCard}>
              <Ionicons name="leaf-outline" size={12} color={C.emerald} />
              <Text style={s.heroMiniCardText}>Veilige check</Text>
            </View>
          </View>
        </View>

        <View style={s.heroStatsRow}>
          <View style={s.heroStatChip}>
            <Ionicons name="barcode-outline" size={12} color={C.textMuted} />
            <Text style={s.heroStatChipText}>Barcode</Text>
          </View>
          <View style={s.heroStatChip}>
            <Ionicons name="flash-outline" size={12} color={C.textMuted} />
            <Text style={s.heroStatChipText}>OCR</Text>
          </View>
        </View>
      </View>

      <View style={s.contextToggle}>
        <TouchableOpacity
          style={[s.contextPill, !shoppingMode && s.contextPillActive]}
          onPress={() => onShoppingModeChange(false)}
          activeOpacity={0.75}
        >
          <Ionicons name="apps-outline" size={14} color={!shoppingMode ? C.emerald : C.textSubtle} />
          <Text style={[s.contextPillLabel, !shoppingMode && s.contextPillLabelActive]}>Standaard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.contextPill, shoppingMode && s.contextPillActive]}
          onPress={() => onShoppingModeChange(true)}
          activeOpacity={0.75}
        >
          <Ionicons name="cart-outline" size={14} color={shoppingMode ? C.emerald : C.textSubtle} />
          <Text style={[s.contextPillLabel, shoppingMode && s.contextPillLabelActive]}>Supermarkt mode</Text>
        </TouchableOpacity>
      </View>

      {shoppingMode ? (
        <View style={s.supermarketCard}>
          <View style={s.supermarketHead}>
            <View style={s.supermarketBadge}>
              <Ionicons name="flash-outline" size={13} color={C.emerald} />
              <Text style={s.supermarketBadgeText}>Snelle flow</Text>
            </View>
            <Text style={s.supermarketTitle}>Winkelmodus aan</Text>
          </View>

          <Text style={s.supermarketBody}>Sneller scannen, minder afleiding.</Text>

          <View style={s.supermarketActions}>
            <TouchableOpacity style={s.supermarketPrimaryAction} onPress={onOpenScanner} activeOpacity={0.82}>
              <Ionicons name="scan-outline" size={18} color="#fff" />
              <Text style={s.supermarketPrimaryActionText}>Direct scannen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.supermarketSecondaryAction, (!barcode || loadingProduct) && s.supermarketSecondaryActionDisabled]}
              onPress={onFetchProduct}
              disabled={!barcode || loadingProduct}
              activeOpacity={0.82}
            >
              {loadingProduct
                ? <ActivityIndicator size="small" color={C.text} />
                : <Ionicons name="search-outline" size={18} color={C.text} />}
              <Text style={s.supermarketSecondaryActionText}>Snel ophalen</Text>
            </TouchableOpacity>
          </View>

          <View style={s.supermarketTipsRow}>
            <View style={s.supermarketTipChip}>
              <Ionicons name="barcode-outline" size={12} color={C.textMuted} />
              <Text style={s.supermarketTipChipText}>Barcode eerst</Text>
            </View>
            <View style={s.supermarketTipChip}>
              <Ionicons name="camera-outline" size={12} color={C.textMuted} />
              <Text style={s.supermarketTipChipText}>Foto als backup</Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* ── Page heading ─────────────────────────────────────────── */}
      <View style={s.headingRow}>
        <View style={s.heading}>
          <Text style={s.headingTitle}>Scannen</Text>
          <Text style={s.headingBody}>
            {shoppingMode ? "Barcode eerst" : "Barcode of etiketfoto"}
          </Text>
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
            {shoppingMode ? (
              <TouchableOpacity style={s.supermarketScanStrip} onPress={onOpenScanner} activeOpacity={0.8}>
                <View style={s.supermarketScanStripIcon}>
                  <Ionicons name="scan-outline" size={18} color={C.emerald} />
                </View>
                <View style={s.supermarketScanStripTextWrap}>
                  <Text style={s.supermarketScanStripTitle}>Open scanner</Text>
                  <Text style={s.supermarketScanStripBody}>Voor snelle checks.</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textSubtle} />
              </TouchableOpacity>
            ) : null}
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
          {productName ? (
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
                {!!ingredientsText.trim() && (
                  <Text style={s.productCardSub} numberOfLines={2}>{ingredientsText.slice(0, 80)}{ingredientsText.length > 80 ? "…" : ""}</Text>
                )}
                {nutritionItems.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.nutritionRow}>
                    {nutritionItems.map((item) => (
                      <View key={item.label} style={s.nutritionPill}>
                        <Text style={s.nutritionPillLabel}>{item.label}</Text>
                        <Text style={s.nutritionPillValue}>{item.value}</Text>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
              <View style={s.productCardBadge}>
                <Ionicons name="checkmark" size={12} color={C.emerald} />
              </View>
            </View>
          ) : null}

          {shoppingMode && productName ? (
            <TouchableOpacity style={s.nextProductBtn} onPress={onResetScan} activeOpacity={0.82}>
              <Ionicons name="arrow-forward-circle-outline" size={16} color={C.text} />
              <Text style={s.nextProductBtnText}>Klaar? Start volgende product</Text>
            </TouchableOpacity>
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
                  Volledige tekst staat in Controle.
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
                <Text style={s.liveCoachTitle}>Foto tip</Text>
              </View>
              <Text style={s.liveCoachText}>Richt op ingrediënten, zonder reflectie.</Text>
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
                    ? "Ziet er goed uit."
                    : "Check even op OCR-foutjes."}
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
    backgroundColor: "#EAF3FF",
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.18)",
    padding: 16,
    gap: 14,
    overflow: "hidden",
    shadowColor: "#3B82F6",
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  heroOrbOne: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.55)",
    right: -30,
    top: -45
  },
  heroOrbTwo: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(34,197,94,0.10)",
    right: 24,
    bottom: -34
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.14)"
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D4ED8",
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  heroMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  heroIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.14)"
  },
  heroTextWrap: {
    flex: 1,
    gap: 4
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E3A5F",
    letterSpacing: -0.3
  },
  heroHeadline: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.5
  },
  heroBody: {
    fontSize: 13,
    color: "#5E718A",
    lineHeight: 19
  },
  heroVisual: {
    alignItems: "center",
    gap: 8
  },
  heroMiniCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(34,197,94,0.16)"
  },
  heroMiniCardText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textMuted
  },
  heroStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  heroStatChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.12)"
  },
  heroStatChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textMuted
  },
  contextToggle: {
    flexDirection: "row",
    gap: 8
  },
  contextPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.58)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border
  },
  contextPillActive: {
    backgroundColor: C.surface,
    borderColor: "rgba(34,197,94,0.22)"
  },
  contextPillLabel: {
    fontSize: 13,
    color: C.textMuted,
    fontWeight: "600"
  },
  contextPillLabelActive: {
    color: C.emerald
  },
  supermarketCard: {
    backgroundColor: "#EEF8FF",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.18)",
    padding: 14,
    gap: 12
  },
  supermarketHead: {
    gap: 8
  },
  supermarketBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.86)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.12)"
  },
  supermarketBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  supermarketTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.3
  },
  supermarketBody: {
    fontSize: 13,
    color: C.textMuted,
    lineHeight: 19
  },
  supermarketActions: {
    flexDirection: "row",
    gap: 10
  },
  supermarketPrimaryAction: {
    flex: 1.15,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#1D4ED8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#1D4ED8",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3
  },
  supermarketPrimaryActionText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "700"
  },
  supermarketSecondaryAction: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.16)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  supermarketSecondaryActionDisabled: {
    opacity: 0.55
  },
  supermarketSecondaryActionText: {
    fontSize: 14,
    color: C.text,
    fontWeight: "700"
  },
  supermarketTipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  supermarketTipChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.12)"
  },
  supermarketTipChipText: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: "600"
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
  supermarketScanStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#F4F8FF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.16)"
  },
  supermarketScanStripIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(34,197,94,0.12)",
    alignItems: "center",
    justifyContent: "center"
  },
  supermarketScanStripTextWrap: {
    flex: 1,
    gap: 2
  },
  supermarketScanStripTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text
  },
  supermarketScanStripBody: {
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 17
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
    gap: 6
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
  nutritionRow: {
    gap: 6,
    paddingRight: 8
  },
  nutritionPill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(34,197,94,0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(34,197,94,0.16)"
  },
  nutritionPillLabel: {
    fontSize: 10,
    color: C.textSubtle,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  nutritionPillValue: {
    fontSize: 12,
    color: C.text,
    fontWeight: "700"
  },
  nextProductBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 13,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#EAF3FF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.16)"
  },
  nextProductBtnText: {
    fontSize: 13,
    color: C.text,
    fontWeight: "700"
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
