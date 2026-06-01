import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#F7F6F5",
  surface: "#FFFFFF",
  surfaceRaised: "#FAFAF9",
  border: "rgba(0,0,0,0.07)",
  borderFocus: "rgba(0,0,0,0.18)",
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

type Props = {
  blocked: string[];
  newBlocked: string;
  onNewBlockedChange: (value: string) => void;
  onAddBlocked: () => void;
  onRemoveBlocked: (value: string) => void;
  supportedLanguages: string[];
};

export function ProfileScreen({
  blocked,
  newBlocked,
  onNewBlockedChange,
  onAddBlocked,
  onRemoveBlocked,
  supportedLanguages
}: Props): React.ReactElement {
  return (
    <View style={s.root}>

      <View style={s.heroCard}>
        <View style={s.heroLogo}>
          <Ionicons name="leaf" size={18} color={C.emerald} />
        </View>
        <View style={s.heroBody}>
          <Text style={s.heroTitle}>Jouw Food Shield 🛡️</Text>
          <Text style={s.heroSub}>Personaliseer wat je wel en niet wilt eten.</Text>
        </View>
      </View>

      {/* ── Page heading ─────────────────────────────────────────── */}
      <View style={s.heading}>
        <Text style={s.headingTitle}>Profiel</Text>
        <Text style={s.headingBody}>Jouw allergenen & instellingen</Text>
      </View>

      {/* ── Blocked ingredients surface ──────────────────────────── */}
      <View style={s.surface}>
        <View style={s.surfaceHeader}>
          <Text style={s.surfaceTitle}>Geblokkeerde ingrediënten</Text>
          <View style={s.countPill}>
            <Text style={s.countPillText}>{blocked.length}</Text>
          </View>
        </View>

        {/* Input row */}
        <View style={s.inputRow}>
          <TextInput
            value={newBlocked}
            onChangeText={onNewBlockedChange}
            placeholder="Bijv. noten, gluten…"
            placeholderTextColor={C.textSubtle}
            style={s.input}
            returnKeyType="done"
            onSubmitEditing={onAddBlocked}
          />
          <TouchableOpacity style={s.addBtn} onPress={onAddBlocked} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Tags or empty hint */}
        {blocked.length > 0 ? (
          <View style={s.tagsWrap}>
            {blocked.map((item) => (
              <TouchableOpacity
                key={item}
                style={s.tag}
                onPress={() => onRemoveBlocked(item)}
                activeOpacity={0.7}
              >
                <Text style={s.tagEmoji}>🚫</Text>
                <Text style={s.tagText}>{item}</Text>
                <Ionicons name="close" size={12} color={C.rose} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={s.emptyTagRow}>
            <Ionicons name="shield-outline" size={15} color={C.textSubtle} />
            <Text style={s.emptyTagText}>Nog niets geblokkeerd</Text>
          </View>
        )}
      </View>

      {/* ── Supported languages surface ──────────────────────────── */}
      <View style={s.surface}>
        <View style={s.surfaceHeader}>
          <Text style={s.surfaceTitle}>Talen</Text>
        </View>
        <View style={s.langList}>
          {supportedLanguages.map((lang, idx) => (
            <View
              key={lang}
              style={[s.langRow, idx < supportedLanguages.length - 1 && s.langRowBorder]}
            >
              <View style={s.langDot} />
              <Text style={s.langName}>{lang}</Text>
              <Ionicons name="checkmark" size={14} color={C.emerald} />
            </View>
          ))}
        </View>
      </View>

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
  heroLogo: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(16,185,129,0.12)",
    alignItems: "center",
    justifyContent: "center"
  },
  heroBody: {
    flex: 1,
    gap: 2
  },
  heroTitle: {
    fontSize: 14,
    color: "#F8FAFC",
    fontWeight: "700",
    letterSpacing: -0.2
  },
  heroSub: {
    fontSize: 12,
    color: "#CBD5E1"
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
  // Shared surface card
  surface: {
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
  surfaceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border
  },
  surfaceTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
    letterSpacing: -0.2
  },
  countPill: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.roseSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.roseBorder,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6
  },
  countPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.rose
  },
  // Input row
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: C.surfaceRaised,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    paddingHorizontal: 12,
    fontSize: 14,
    color: C.text
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.text,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  // Tags
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 16
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.roseSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.roseBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  tagText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#991B1B"
  },
  tagEmoji: {
    fontSize: 12
  },
  emptyTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 16
  },
  emptyTagText: {
    fontSize: 13,
    color: C.textSubtle,
    fontWeight: "400"
  },
  // Language list
  langList: {
    paddingHorizontal: 16
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12
  },
  langRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border
  },
  langDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.emerald,
    flexShrink: 0
  },
  langName: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    fontWeight: "500"
  }
});
