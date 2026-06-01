import React from "react";
import { ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  onContinue: () => void;
};

export function OnboardingScreen({ onContinue }: Props): React.ReactElement {
  return (
    <ImageBackground
      source={{ uri: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=1000&auto=format&fit=crop" }}
      style={styles.root}
      imageStyle={styles.bgImage}
    >
      <View style={styles.overlay} />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoGlow} />
            <View style={styles.logoBox}>
              <Ionicons name="barcode" size={48} color="#059669" />
            </View>
          </View>

          <Text style={styles.title}>EatScanner</Text>
          <Text style={styles.tagline}>Eet met een gerust hart.</Text>

          {/* Steps */}
          <View style={styles.steps}>
            <View style={styles.stepRow}>
              <View style={[styles.stepIcon, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="barcode-outline" size={24} color="#D97706" />
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={styles.stepTitle}>1. Scan of Zoek</Text>
                <Text style={styles.stepBody}>
                  Scan de barcode of maak een foto van de ingrediëntenlijst.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={[styles.stepIcon, { backgroundColor: "#D1FAE5" }]}>
                <Ionicons name="person-outline" size={24} color="#059669" />
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={styles.stepTitle}>2. Persoonlijk Profiel</Text>
                <Text style={styles.stepBody}>
                  Stel in welke allergenen of stoffen je absoluut wilt vermijden.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={[styles.stepIcon, { backgroundColor: "#FFE4E6" }]}>
                <Ionicons name="checkmark-circle-outline" size={24} color="#F43F5E" />
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={styles.stepTitle}>3. Direct Resultaat</Text>
                <Text style={styles.stepBody}>
                  Wij checken de labels en waarschuwen je onmiddellijk.
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.cta} onPress={onContinue} activeOpacity={0.85}>
            <Text style={styles.ctaText}>Start met scannen</Text>
            <Ionicons name="chevron-forward" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FAFAF9"
  },
  bgImage: {
    opacity: 0.2
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(250,250,249,0.88)"
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  card: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 36,
    padding: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
    shadowColor: "#064e3b",
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 24
  },
  logoGlow: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#6ee7b7",
    opacity: 0.25,
    top: -8
  },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#292524",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 8
  },
  tagline: {
    fontSize: 17,
    color: "#78716C",
    textAlign: "center",
    marginBottom: 36
  },
  steps: {
    gap: 24,
    marginBottom: 40
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16
  },
  stepIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
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
    color: "#292524"
  },
  stepBody: {
    fontSize: 14,
    color: "#78716C",
    lineHeight: 21
  },
  cta: {
    backgroundColor: "#292524",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800"
  }
});
