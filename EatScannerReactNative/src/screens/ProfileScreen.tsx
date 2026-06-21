import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
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
  emeraldBorder: "rgba(34,197,94,0.20)",
  rose: "#EF4444",
  roseSoft: "rgba(239,68,68,0.08)",
  roseBorder: "rgba(239,68,68,0.18)",
  amber: "#F59E0B",
} as const;

type Props = {
  blocked: string[];
  dictionary: string[];
  onToggleBlocked: (value: string) => void;
};

export function ProfileScreen({
  blocked,
  dictionary,
  onToggleBlocked
}: Props): React.ReactElement {
  const [query, setQuery] = useState("");
  const enterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [enterAnim]);

  const filteredDictionary = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? dictionary.filter((item) => item.includes(q))
      : dictionary;

    return [...base].sort((a, b) => {
      const aSelected = blocked.includes(a);
      const bSelected = blocked.includes(b);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return a.localeCompare(b);
    });
  }, [query, dictionary, blocked]);

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

        {/* Tags or empty hint */}
        {blocked.length > 0 ? (
          <View style={s.tagsWrap}>
            {blocked.map((item) => (
              <TouchableOpacity
                key={item}
                style={s.tag}
                onPress={() => onToggleBlocked(item)}
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

      {/* ── Dictionary surface ───────────────────────────────────── */}
      <View style={s.surface}>
        <View style={s.surfaceHeader}>
          <Text style={s.surfaceTitle}>Kies uit vaste ingrediëntenlijst</Text>
        </View>

        <View style={s.inputRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Zoek ingredient..."
            placeholderTextColor={C.textSubtle}
            style={s.input}
          />
        </View>

        <ScrollView style={s.dictList} contentContainerStyle={s.dictListContent} nestedScrollEnabled>
          {filteredDictionary.map((item) => {
            const selected = blocked.includes(item);
            return (
              <TouchableOpacity
                key={item}
                style={[s.dictItem, selected && s.dictItemSelected]}
                onPress={() => onToggleBlocked(item)}
                activeOpacity={0.8}
              >
                <Text style={[s.dictItemText, selected && s.dictItemTextSelected]}>{item}</Text>
                <Ionicons name={selected ? "checkbox" : "square-outline"} size={18} color={selected ? C.emerald : C.textSubtle} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: {
    gap: 10
  },
  heroCard: {
    backgroundColor: "#DDF7FF",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(106,164,196,0.35)",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  heroLogo: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.72)",
    alignItems: "center",
    justifyContent: "center"
  },
  heroBody: {
    flex: 1,
    gap: 2
  },
  heroTitle: {
    fontSize: 14,
    color: "#254252",
    fontWeight: "700",
    letterSpacing: -0.2
  },
  heroSub: {
    fontSize: 12,
    color: "#497084"
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
  dictList: {
    maxHeight: 260
  },
  dictListContent: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8
  },
  dictItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    backgroundColor: C.surfaceRaised,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  dictItemSelected: {
    borderColor: C.emeraldBorder,
    backgroundColor: C.emeraldSoft
  },
  dictItemText: {
    fontSize: 14,
    color: C.text,
    fontWeight: "500"
  },
  dictItemTextSelected: {
    color: "#065F46",
    fontWeight: "700"
  }
});
