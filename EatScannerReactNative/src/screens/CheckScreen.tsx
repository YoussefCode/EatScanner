import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Easing, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafetyResult, UserExperienceFeedback } from "../types/domain";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#FFF8EF",
  surface: "#FFFFFF",
  surfaceRaised: "#FFF4E6",
  border: "rgba(138,114,91,0.20)",
  text: "#35282A",
  textMuted: "#7E6D6C",
  textSubtle: "#B59E9A",
  emerald: "#22C55E",
  emeraldSoft: "rgba(34,197,94,0.12)",
  emeraldBorder: "rgba(34,197,94,0.20)",
  rose: "#EF4444",
  roseSoft: "rgba(239,68,68,0.08)",
  roseBorder: "rgba(239,68,68,0.18)",
  amber: "#F59E0B",
} as const;

type HighlightChunk = { text: string; highlighted: boolean };

type Props = {
  evaluatingSafety: boolean;
  onEvaluate: () => void;
  result: SafetyResult | null;
  sourceLabel: string;
  highlightedChunks: HighlightChunk[];
  productName: string;
  productImageUrl: string;
  analysisToast: { type: "success" | "error"; message: string } | null;
  replacementTips: string[];
  onFeedback: (value: UserExperienceFeedback) => void;
  onShareSafetyCard: () => void;
};

export function CheckScreen({
  evaluatingSafety,
  onEvaluate,
  result,
  sourceLabel,
  highlightedChunks,
  productName,
  productImageUrl,
  analysisToast,
  replacementTips,
  onFeedback,
  onShareSafetyCard
}: Props): React.ReactElement {
  const enterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [enterAnim]);

  const isSafe = result?.isSafe;

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
        <View style={s.heroSpark} />
        <View style={s.heroHeaderRow}>
          <View style={s.heroIconBadge}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#1D4ED8" />
          </View>
          <View style={s.heroHeaderTextWrap}>
            <Text style={s.heroTitle}>Analyse center</Text>
            <Text style={s.heroText}>Duidelijk verdict, minder twijfel, sneller beslissen.</Text>
          </View>
        </View>
        <View style={s.heroChipsRow}>
          <View style={s.heroChip}>
            <Ionicons name="flash-outline" size={12} color={C.textMuted} />
            <Text style={s.heroChipText}>Live scan flow</Text>
          </View>
          <View style={s.heroChip}>
            <Ionicons name="analytics-outline" size={12} color={C.textMuted} />
            <Text style={s.heroChipText}>Confidence score</Text>
          </View>
        </View>
      </View>

      {/* ── Page heading ─────────────────────────────────────────── */}
      <View style={s.heading}>
        <Text style={s.headingTitle}>Controle</Text>
        <Text style={s.headingBody}>Allergenen analyse</Text>
      </View>

      {analysisToast && (
        <View style={[s.toast, analysisToast.type === "success" ? s.toastSuccess : s.toastError]}>
          <Ionicons
            name={analysisToast.type === "success" ? "checkmark-circle" : "warning"}
            size={15}
            color={analysisToast.type === "success" ? C.emerald : C.rose}
          />
          <Text style={s.toastText}>{analysisToast.message}</Text>
        </View>
      )}

      {/* ── Result / pre-check card ───────────────────────────────── */}
      {!result ? (
        <View style={s.preCard}>
          <View style={s.preIconRing}>
            <Ionicons name="shield-outline" size={32} color="#1D4ED8" />
          </View>
          <Text style={s.preTitle}>Klaar voor analyse</Text>
          <Text style={s.preBody}>Zodra barcode of ingrediënten binnen zijn, krijg je hier een heldere veiligheidscheck met confidence score.</Text>
          <View style={s.preStepsRow}>
            <View style={s.preStepChip}>
              <Text style={s.preStepIndex}>1</Text>
              <Text style={s.preStepText}>Scan product</Text>
            </View>
            <View style={s.preStepChip}>
              <Text style={s.preStepIndex}>2</Text>
              <Text style={s.preStepText}>Check matches</Text>
            </View>
            <View style={s.preStepChip}>
              <Text style={s.preStepIndex}>3</Text>
              <Text style={s.preStepText}>Beslis sneller</Text>
            </View>
          </View>
        </View>
      ) : (
        <>
          {(productName || productImageUrl) && (
            <View style={s.productPreviewCard}>
              <View style={s.productPreviewImageWrap}>
                {productImageUrl ? (
                  <Image source={{ uri: productImageUrl }} style={s.productPreviewImage} resizeMode="cover" />
                ) : (
                  <View style={s.productPreviewFallback}>
                    <Ionicons name="cube-outline" size={17} color={C.textSubtle} />
                  </View>
                )}
              </View>
              <View style={s.productPreviewBody}>
                <Text style={s.productPreviewLabel}>Gecontroleerd product</Text>
                <Text style={s.productPreviewName} numberOfLines={2}>
                  {productName || "Onbekend product"}
                </Text>
              </View>
            </View>
          )}

          {/* ── Status banner ──────────────────────────────────────── */}
          <View style={[s.statusBanner, isSafe ? s.statusBannerSafe : s.statusBannerUnsafe]}>
            <View style={[s.statusIconRing, isSafe ? s.statusIconRingSafe : s.statusIconRingUnsafe]}>
              <Ionicons
                name={isSafe ? "checkmark" : "warning-outline"}
                size={22}
                color={isSafe ? C.emerald : C.rose}
              />
            </View>
            <View style={s.statusText}>
              <Text style={[s.statusTitle, isSafe ? s.statusTitleSafe : s.statusTitleUnsafe]}>
                {isSafe ? "Veilig om te eten" : "Niet veilig"}
              </Text>
              <Text style={s.statusSub}>Bron: {sourceLabel}</Text>
            </View>
            <Text style={[s.statusPct, isSafe ? s.statusPctSafe : s.statusPctUnsafe]}>
              {Math.round(result.confidence * 100)}%
            </Text>
          </View>

          {/* ── Confidence bar ─────────────────────────────────────── */}
          <View style={s.surface}>
            <View style={s.confRow}>
              <Text style={s.confLabel}>Betrouwbaarheid</Text>
              <Text style={s.confValue}>{Math.round(result.confidence * 100)}%</Text>
            </View>
            <View style={s.confTrack}>
              <View
                style={[
                  s.confFill,
                  isSafe ? s.confFillSafe : s.confFillWarn,
                  { width: `${Math.round(result.confidence * 100)}%` as unknown as number }
                ]}
              />
            </View>
          </View>

          {/* ── Allergen matches ───────────────────────────────────── */}
          {!isSafe && result.matches.length > 0 && (
            <View style={s.surface}>
              <Text style={s.sectionLabel}>Gevonden allergenen</Text>
              {result.matches.map((match, idx) => (
                <View
                  key={`${match.blockedTerm}-${idx}`}
                  style={[s.matchRow, idx < result.matches.length - 1 && s.matchRowBorder]}
                >
                  <View style={s.matchDot} />
                  <View style={s.matchBody}>
                    <Text style={s.matchTerm}>{match.blockedTerm}</Text>
                    <Text style={s.matchFragment}>"{match.matchedFragment}"</Text>
                    {!!match.matchReason && (
                      <Text style={s.matchReason}>{match.matchReason}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Highlighted ingredient text ────────────────────────── */}
          {highlightedChunks.length > 0 && (
            <View style={s.surface}>
              <Text style={s.sectionLabel}>Geanalyseerde tekst</Text>
              <Text style={s.ingredientText}>
                {highlightedChunks.map((chunk, idx) => (
                  <Text
                    key={`chunk-${idx}`}
                    style={chunk.highlighted ? s.chunkHit : s.chunkNormal}
                  >
                    {chunk.text}
                  </Text>
                ))}
              </Text>
            </View>
          )}

          {replacementTips.length > 0 && (
            <View style={s.surface}>
              <Text style={s.sectionLabel}>Slim alternatief</Text>
              {replacementTips.map((tip) => (
                <View key={tip} style={s.tipRow}>
                  <Ionicons name="sparkles-outline" size={13} color="#FF7A59" />
                  <Text style={s.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={s.feedbackRow}>
            <TouchableOpacity style={s.feedbackBtn} onPress={() => onFeedback("good")} activeOpacity={0.85}>
              <Ionicons name="thumbs-up-outline" size={15} color="#065F46" />
              <Text style={s.feedbackText}>Voelde goed</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.feedbackBtn, s.feedbackBtnAlert]} onPress={() => onFeedback("reaction")} activeOpacity={0.85}>
              <Ionicons name="alert-circle-outline" size={15} color="#991B1B" />
              <Text style={[s.feedbackText, s.feedbackTextAlert]}>Toch reactie</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.shareBtn} onPress={onShareSafetyCard} activeOpacity={0.85}>
            <Ionicons name="share-social-outline" size={16} color="#7E6D6C" />
            <Text style={s.shareBtnText}>Deel Safety Card</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── Primary action button ─────────────────────────────────── */}
      <TouchableOpacity
        style={[s.analyseBtn, evaluatingSafety && s.analyseBtnLoading]}
        onPress={onEvaluate}
        disabled={evaluatingSafety}
        activeOpacity={0.85}
      >
        {evaluatingSafety ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name={result ? "refresh-outline" : "shield-checkmark-outline"} size={18} color="#fff" />
        )}
        <Text style={s.analyseBtnText}>
          {evaluatingSafety ? "Analyseren…" : result ? "Opnieuw analyseren" : "Analyseer"}
        </Text>
      </TouchableOpacity>

    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: {
    gap: 10
  },
  heroCard: {
    backgroundColor: "#EEF6FF",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.18)",
    padding: 14,
    gap: 12,
    overflow: "hidden"
  },
  heroSpark: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.55)",
    right: -20,
    top: -26
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  heroIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.14)",
    alignItems: "center",
    justifyContent: "center"
  },
  heroHeaderTextWrap: {
    flex: 1,
    gap: 2
  },
  heroTitle: {
    fontSize: 14,
    color: "#1D4ED8",
    fontWeight: "800",
    letterSpacing: -0.2
  },
  heroText: {
    fontSize: 12,
    color: "#5E718A",
    fontWeight: "600"
  },
  heroChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.12)"
  },
  heroChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textMuted
  },
  // Heading
  heading: {
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
  toast: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  toastSuccess: {
    backgroundColor: C.emeraldSoft,
    borderColor: C.emeraldBorder
  },
  toastError: {
    backgroundColor: C.roseSoft,
    borderColor: C.roseBorder
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    color: C.text,
    fontWeight: "600"
  },
  // Pre-check
  preCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    padding: 24,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
  },
  preIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EEF6FF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2
  },
  preTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.3
  },
  preBody: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 21
  },
  preStepsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 2
  },
  preStepChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border
  },
  preStepIndex: {
    width: 18,
    height: 18,
    borderRadius: 9,
    textAlign: "center",
    lineHeight: 18,
    overflow: "hidden",
    backgroundColor: "rgba(59,130,246,0.12)",
    color: "#1D4ED8",
    fontSize: 11,
    fontWeight: "800"
  },
  preStepText: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: "600"
  },
  // Status banner
  productPreviewCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
  },
  productPreviewImageWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    backgroundColor: C.surfaceRaised
  },
  productPreviewImage: {
    width: "100%",
    height: "100%"
  },
  productPreviewFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  productPreviewBody: {
    flex: 1,
    gap: 2
  },
  productPreviewLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.textSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  productPreviewName: {
    fontSize: 14,
    color: C.text,
    fontWeight: "700",
    letterSpacing: -0.2
  },

  statusBanner: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  statusBannerSafe: {
    backgroundColor: C.emeraldSoft,
    borderColor: C.emeraldBorder
  },
  statusBannerUnsafe: {
    backgroundColor: C.roseSoft,
    borderColor: C.roseBorder
  },
  statusIconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth
  },
  statusIconRingSafe: {
    backgroundColor: C.emeraldSoft,
    borderColor: C.emeraldBorder
  },
  statusIconRingUnsafe: {
    backgroundColor: C.roseSoft,
    borderColor: C.roseBorder
  },
  statusText: {
    flex: 1,
    gap: 2
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3
  },
  statusTitleSafe: {
    color: "#065F46"
  },
  statusTitleUnsafe: {
    color: "#991B1B"
  },
  statusSub: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: "400"
  },
  statusPct: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5
  },
  statusPctSafe: {
    color: C.emerald
  },
  statusPctUnsafe: {
    color: C.rose
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.textSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.7
  },
  // Confidence bar
  confRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  confLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: C.textMuted
  },
  confValue: {
    fontSize: 13,
    fontWeight: "700",
    color: C.text
  },
  confTrack: {
    height: 6,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 99,
    overflow: "hidden"
  },
  confFill: {
    height: "100%",
    borderRadius: 99
  },
  confFillSafe: {
    backgroundColor: C.emerald
  },
  confFillWarn: {
    backgroundColor: C.amber
  },
  // Match rows
  matchRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10
  },
  matchRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border
  },
  matchDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.rose,
    marginTop: 5,
    flexShrink: 0
  },
  matchBody: {
    flex: 1,
    gap: 2
  },
  matchTerm: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
    textTransform: "capitalize"
  },
  matchFragment: {
    fontSize: 13,
    color: C.rose,
    fontWeight: "400"
  },
  matchReason: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: "400",
    lineHeight: 17
  },
  // Ingredient text
  ingredientText: {
    fontSize: 14,
    color: C.textMuted,
    lineHeight: 22
  },
  chunkNormal: {
    color: C.textMuted,
    fontWeight: "400"
  },
  chunkHit: {
    color: C.rose,
    fontWeight: "700",
    backgroundColor: C.roseSoft
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: C.textMuted,
    lineHeight: 18
  },
  feedbackRow: {
    flexDirection: "row",
    gap: 8
  },
  feedbackBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.emeraldBorder,
    backgroundColor: C.emeraldSoft,
    paddingVertical: 10
  },
  feedbackBtnAlert: {
    borderColor: C.roseBorder,
    backgroundColor: C.roseSoft
  },
  feedbackText: {
    fontSize: 12,
    color: "#065F46",
    fontWeight: "700"
  },
  feedbackTextAlert: {
    color: "#991B1B"
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    backgroundColor: C.surface,
    paddingVertical: 10
  },
  shareBtnText: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: "700"
  },
  // Action button
  analyseBtn: {
    backgroundColor: "#FF7A59",
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#FF7A59",
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  analyseBtnLoading: {
    opacity: 0.6
  },
  analyseBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2
  }
});
