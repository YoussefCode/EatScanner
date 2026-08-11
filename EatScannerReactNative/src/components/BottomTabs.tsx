import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type AppTab = "scan" | "history" | "profile";

type Props = {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  bottomInset?: number;
};

const TABS: Array<{ key: AppTab; label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }> = [
  { key: "scan",    label: "Scan",     icon: "barcode-outline",          iconActive: "barcode" },
  { key: "history", label: "Historie", icon: "time-outline",             iconActive: "time" },
  { key: "profile", label: "Profiel",  icon: "person-circle-outline",    iconActive: "person-circle" }
];

export function BottomTabs({ activeTab, onTabChange, bottomInset = 0 }: Props): React.ReactElement {
  return (
    <View style={[styles.shell, { paddingBottom: Math.max(bottomInset, 12) }] }>
      <View style={styles.bar}>
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => onTabChange(tab.key)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconArea, active && styles.iconAreaActive]}>
                <Ionicons
                  name={active ? tab.iconActive : tab.icon}
                  size={20}
                  color={active ? "#1D4ED8" : "#7D6A5D"}
                />
              </View>
              <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
              {active ? <View style={styles.activeDot} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    paddingHorizontal: 12,
    paddingTop: 6,
    backgroundColor: "transparent"
  },
  bar: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.14)",
    flexDirection: "row",
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 8,
    borderRadius: 24,
    shadowColor: "#3B82F6",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 56,
    borderRadius: 18,
    paddingVertical: 4
  },
  tabActive: {
    backgroundColor: "rgba(59,130,246,0.08)"
  },
  iconArea: {
    width: 38,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  iconAreaActive: {
    backgroundColor: "rgba(255,255,255,0.72)"
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#7D6A5D",
    letterSpacing: 0.1
  },
  labelActive: {
    color: "#1D4ED8",
    fontWeight: "700"
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#1D4ED8"
  }
});
