import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type AppTab = "scan" | "check" | "history" | "profile";

type Props = {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  bottomInset?: number;
};

const TABS: Array<{ key: AppTab; label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }> = [
  { key: "scan",    label: "Scan",     icon: "barcode-outline",          iconActive: "barcode" },
  { key: "check",   label: "Controle", icon: "shield-outline",           iconActive: "shield" },
  { key: "history", label: "Historie", icon: "time-outline",             iconActive: "time" },
  { key: "profile", label: "Profiel",  icon: "person-circle-outline",    iconActive: "person-circle" }
];

export function BottomTabs({ activeTab, onTabChange, bottomInset = 0 }: Props): React.ReactElement {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(bottomInset, 12) }]}>
      {TABS.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.6}
          >
            <View style={[styles.iconArea, active && styles.iconAreaActive]}>
              <Ionicons
                name={active ? tab.iconActive : tab.icon}
                size={23}
                color={active ? "#10B981" : "#57524E"}
              />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: "#0C0B0A",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    paddingTop: 10,
    paddingHorizontal: 4
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 3
  },
  iconArea: {
    width: 48,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  iconAreaActive: {
    backgroundColor: "rgba(16,185,129,0.12)"
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    color: "#57524E",
    letterSpacing: 0.1
  },
  labelActive: {
    color: "#10B981",
    fontWeight: "600"
  }
});
