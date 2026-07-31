import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScanHistoryEntry, UserExperienceFeedback } from "../types/domain";

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
} as const;

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) +
    " · " + d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

type Props = {
  history: ScanHistoryEntry[];
  reactionCount: number;
  latestFeedbackByBarcode: Map<string, UserExperienceFeedback>;
  onClear: () => void;
  onSelectEntry: (entry: ScanHistoryEntry) => void;
};

export function HistoryScreen({
  history,
  reactionCount,
  latestFeedbackByBarcode,
  onClear,
  onSelectEntry
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

  const safeCount = history.filter((entry) => entry.isSafe).length;
  const alertCount = history.length - safeCount;

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
        <View style={s.heroLogoWrap}>
          <Ionicons name="time-outline" size={16} color="#1D4ED8" />
        </View>
        <View style={s.heroTextWrap}>
          <Text style={s.heroTitle}>Scanhistorie</Text>
          <Text style={s.heroBody}>Je recente controles, status en reacties overzichtelijk op één plek.</Text>
        </View>
      </View>

      <View style={s.kpiRow}>
        <View style={[s.kpiChip, s.kpiChipSafe]}>
          <Text style={s.kpiEmoji}>✅</Text>
          <Text style={s.kpiText}>{safeCount} veilig</Text>
        </View>
        <View style={[s.kpiChip, s.kpiChipAlert]}>
          <Text style={s.kpiEmoji}>⚠️</Text>
          <Text style={s.kpiText}>{alertCount} alerts</Text>
        </View>
        <View style={[s.kpiChip, s.kpiChipAlert]}>
          <Text style={s.kpiEmoji}>🧪</Text>
          <Text style={s.kpiText}>{reactionCount} reacties</Text>
        </View>
      </View>

      {/* ── Page heading ─────────────────────────────────────────── */}
      <View style={s.headingRow}>
        <View style={s.headingLeft}>
          <Text style={s.headingTitle}>Historie</Text>
          <Text style={s.headingBody}>
            {history.length} {history.length === 1 ? "scan" : "scans"}
          </Text>
        </View>
        {history.length > 0 && (
          <TouchableOpacity style={s.clearBtn} onPress={onClear} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={14} color={C.rose} />
            <Text style={s.clearBtnText}>Wissen</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        /* ── Empty state ─────────────────────────────────────────── */
        <View style={s.emptyCard}>
          <View style={s.emptyIconRing}>
            <Ionicons name="scan-outline" size={30} color={C.textSubtle} />
          </View>
          <Text style={s.emptyTitle}>Nog geen scans</Text>
          <Text style={s.emptyBody}>Scan een product om het hier terug te zien.</Text>
        </View>
      ) : (
        /* ── Entry list ──────────────────────────────────────────── */
        <View style={s.list}>
          {history.map((entry, idx) => (
            <TouchableOpacity
              key={entry.id}
              style={[
                s.entryRow,
                idx < history.length - 1 && s.entryRowBorder,
                idx === 0 && s.entryRowFirst,
                idx === history.length - 1 && s.entryRowLast,
              ]}
              onPress={() => onSelectEntry(entry)}
              activeOpacity={0.7}
            >
              {entry.barcode && latestFeedbackByBarcode.get(entry.barcode) === "reaction" ? (
                <View style={s.reactionTag}>
                  <Text style={s.reactionTagText}>Reactie</Text>
                </View>
              ) : null}

              {/* Status dot */}
              <View style={[s.statusDot, entry.isSafe ? s.statusDotSafe : s.statusDotUnsafe]} />

              {/* Body */}
              <View style={s.entryBody}>
                <Text style={s.entryName} numberOfLines={1}>
                  {entry.productName || entry.barcode}
                </Text>
                {entry.matchedTerms.length > 0 && (
                  <Text style={s.entryTerms} numberOfLines={1}>
                    {entry.matchedTerms.join(", ")}
                  </Text>
                )}
                <Text style={s.entryDate}>{formatDate(entry.scannedAt)}</Text>
              </View>

              {/* Right badge + chevron */}
              <View style={s.entryRight}>
                <View style={[s.badge, entry.isSafe ? s.badgeSafe : s.badgeUnsafe]}>
                  <Text style={[s.badgeText, entry.isSafe ? s.badgeTextSafe : s.badgeTextUnsafe]}>
                    {entry.isSafe ? "OK" : "Let op"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={C.textSubtle} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

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
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  heroLogoWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.88)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.12)"
  },
  heroTextWrap: {
    flex: 1,
    gap: 2
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1D4ED8",
    letterSpacing: -0.2
  },
  heroBody: {
    fontSize: 12,
    color: "#5E718A"
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8
  },
  kpiChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  kpiChipSafe: {
    backgroundColor: C.emeraldSoft,
    borderColor: C.emeraldBorder
  },
  kpiChipAlert: {
    backgroundColor: C.roseSoft,
    borderColor: C.roseBorder
  },
  kpiEmoji: {
    fontSize: 12
  },
  kpiText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.text
  },
  // Heading
  headingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    paddingBottom: 4
  },
  headingLeft: {
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
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: C.roseSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.roseBorder
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.rose
  },
  // Empty state
  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    padding: 36,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
  },
  emptyIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: C.text,
    letterSpacing: -0.3
  },
  emptyBody: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: "center"
  },
  // List
  list: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: C.surface,
    minHeight: 72,
    position: "relative"
  },
  reactionTag: {
    position: "absolute",
    top: 6,
    right: 8,
    backgroundColor: C.roseSoft,
    borderColor: C.roseBorder,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2
  },
  reactionTagText: {
    fontSize: 10,
    color: "#991B1B",
    fontWeight: "700"
  },
  entryRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border
  },
  entryRowFirst: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16
  },
  entryRowLast: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0
  },
  statusDotSafe: {
    backgroundColor: C.emerald
  },
  statusDotUnsafe: {
    backgroundColor: C.rose
  },
  entryBody: {
    flex: 1,
    gap: 1
  },
  entryName: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
    letterSpacing: -0.2
  },
  entryTerms: {
    fontSize: 12,
    color: C.rose,
    fontWeight: "500"
  },
  entryDate: {
    fontSize: 12,
    color: C.textSubtle,
    fontWeight: "400",
    marginTop: 1
  },
  entryRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 56,
    alignItems: "center"
  },
  badgeSafe: {
    backgroundColor: C.emeraldSoft,
    borderColor: C.emeraldBorder
  },
  badgeUnsafe: {
    backgroundColor: C.roseSoft,
    borderColor: C.roseBorder
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2
  },
  badgeTextSafe: {
    color: "#065F46"
  },
  badgeTextUnsafe: {
    color: "#991B1B"
  }
});
