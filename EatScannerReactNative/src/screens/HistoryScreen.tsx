import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScanHistoryEntry } from "../types/domain";

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
} as const;

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) +
    " · " + d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

type Props = {
  history: ScanHistoryEntry[];
  onClear: () => void;
  onSelectEntry: (entry: ScanHistoryEntry) => void;
};

export function HistoryScreen({ history, onClear, onSelectEntry }: Props): React.ReactElement {
  const safeCount = history.filter((entry) => entry.isSafe).length;
  const alertCount = history.length - safeCount;

  return (
    <View style={s.root}>

      <View style={s.heroCard}>
        <View style={s.heroLogoWrap}>
          <Ionicons name="sparkles" size={16} color="#F59E0B" />
        </View>
        <View style={s.heroTextWrap}>
          <Text style={s.heroTitle}>EatScanner Timeline 📚</Text>
          <Text style={s.heroBody}>Alle checks in een branded overzicht met snelle status.</Text>
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

    </View>
  );
}

const s = StyleSheet.create({
  root: {
    gap: 10
  },
  heroCard: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  heroLogoWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(245,158,11,0.16)",
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
    color: "#F8FAFC",
    letterSpacing: -0.2
  },
  heroBody: {
    fontSize: 12,
    color: "#CBD5E1"
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
    minHeight: 72
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
