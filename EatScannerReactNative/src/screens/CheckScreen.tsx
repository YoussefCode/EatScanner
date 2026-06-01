import React from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafetyResult } from "../types/domain";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#F7F6F5",
  surface: "#FFFFFF",
  surfaceRaised: "#FAFAF9",
  border: "rgba(0,0,0,0.07)",
  text: "#0C0B0A",
  textMuted: "#8A8480",
  textSubtle: "#B5B0AC",
  emerald: "#10B981",
  emeraldSoft: "rgba(16,185,129,0.10)",
  emeraldBorder: "rgba(16,185,129,0.18)",
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
};

export function CheckScreen({
  evaluatingSafety,
  onEvaluate,
  result,
  sourceLabel,
  highlightedChunks,
  productName,
  productImageUrl,
  analysisToast
}: Props): React.ReactElement {

  const isSafe = result?.isSafe;

  return (
    <View style={s.root}>

      <View style={s.heroCard}>
        <Ionicons name="medal-outline" size={18} color={C.amber} />
        <Text style={s.heroText}>Smart Safety AI · uitleg per match 🧠</Text>
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
            <Ionicons name="shield-outline" size={32} color={C.textSubtle} />
          </View>
          <Text style={s.preTitle}>Nog niet gecontroleerd</Text>
          <Text style={s.preBody}>Druk hieronder op "Analyseer" om de ingrediënten te scannen op jouw geblokkeerde stoffen.</Text>
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

    </View>
  );
}

const s = StyleSheet.create({
  root: {
    gap: 10
  },
  heroCard: {
    backgroundColor: "#111827",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  heroText: {
    fontSize: 12,
    color: "#E5E7EB",
    fontWeight: "600"
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
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    padding: 28,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
  },
  preIconRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: C.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4
  },
  preTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: C.text,
    letterSpacing: -0.3
  },
  preBody: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 20
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
  // Action button
  analyseBtn: {
    backgroundColor: C.text,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.14,
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
