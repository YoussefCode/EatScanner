import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  onContinue: () => void;
};

export function OnboardingScreen({ onContinue }: Props): React.ReactElement {
  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={styles.blobA} />
      <View pointerEvents="none" style={styles.blobB} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#1D4ED8" />
            <Text style={styles.badgeText}>Veilig eten, sneller beslissen</Text>
          </View>

          <View style={styles.logoWrap}>
            <View style={styles.logoGlow} />
            <View style={styles.logoBox}>
              <Ionicons name="scan-outline" size={42} color="#1D4ED8" />
            </View>
          </View>

          <Text style={styles.title}>EatScanner</Text>
          <Text style={styles.tagline}>Check ingrediënten rustig, slim en in een paar seconden.</Text>

          <View style={styles.trustRow}>
            <View style={styles.trustChip}>
              <Ionicons name="barcode-outline" size={13} color="#5E718A" />
              <Text style={styles.trustChipText}>Barcode + OCR</Text>
            </View>
            <View style={styles.trustChip}>
              <Ionicons name="flash-outline" size={13} color="#5E718A" />
              <Text style={styles.trustChipText}>Direct resultaat</Text>
            </View>
          </View>

          <View style={styles.steps}>
            <View style={styles.stepRow}>
              <View style={[styles.stepIcon, { backgroundColor: "#EEF6FF" }]}>
                <Ionicons name="person-outline" size={22} color="#1D4ED8" />
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={styles.stepTitle}>1. Stel je profiel in</Text>
                <Text style={styles.stepBody}>
                  Kies eerst welke allergenen en ingrediënten jij wilt vermijden.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={[styles.stepIcon, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="barcode-outline" size={22} color="#D97706" />
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={styles.stepTitle}>2. Scan barcode of etiket</Text>
                <Text style={styles.stepBody}>
                  Gebruik de camera voor snelle productenchecks of OCR als backup.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={[styles.stepIcon, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#16A34A" />
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={styles.stepTitle}>3. Krijg een duidelijk verdict</Text>
                <Text style={styles.stepBody}>
                  Zie meteen of een product veilig is en welke ingrediënten aandacht vragen.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.noteCard}>
            <Ionicons name="bulb-outline" size={16} color="#1D4ED8" />
            <Text style={styles.noteText}>
              Tip: start met je allergenen instellen voor de beste en meest persoonlijke checks.
            </Text>
          </View>

          <TouchableOpacity style={styles.cta} onPress={onContinue} activeOpacity={0.88}>
            <Text style={styles.ctaText}>Start met EatScanner</Text>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#EAF3FF"
  },
  blobA: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(59,130,246,0.12)",
    top: -80,
    right: -90
  },
  blobB: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(34,197,94,0.10)",
    left: -90,
    bottom: 40
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20
  },
  card: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 32,
    padding: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.12)",
    shadowColor: "#3B82F6",
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    gap: 18
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EEF6FF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D4ED8",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  logoWrap: {
    alignItems: "center",
    marginTop: 2
  },
  logoGlow: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(59,130,246,0.15)",
    top: -4
  },
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: "#F8FBFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.14)"
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#16324F",
    textAlign: "center",
    letterSpacing: -0.6
  },
  tagline: {
    fontSize: 16,
    color: "#5E718A",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 6
  },
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8
  },
  trustChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F8FBFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.12)"
  },
  trustChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#5E718A"
  },
  steps: {
    gap: 18
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14
  },
  stepIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  stepTextWrap: {
    flex: 1,
    gap: 4
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937"
  },
  stepBody: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 21
  },
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#F8FBFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.12)"
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: "#5E718A",
    lineHeight: 19,
    fontWeight: "500"
  },
  cta: {
    backgroundColor: "#1D4ED8",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#1D4ED8",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800"
  }
});
