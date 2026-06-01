import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CameraView, BarcodeScanningResult, useCameraPermissions } from "expo-camera";

type Props = {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
};

export function BarcodeScannerModal({ visible, onClose, onScanned }: Props): React.ReactElement {
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);
  const scanLockRef = useRef(false);

  const canScan = useMemo(() => !!permission?.granted, [permission?.granted]);

  useEffect(() => {
    if (visible) {
      scanLockRef.current = false;
      setHasScanned(false);
    }
  }, [visible]);

  const handleScan = (event: BarcodeScanningResult): void => {
    if (scanLockRef.current || hasScanned || !event.data) return;

    scanLockRef.current = true;
    setHasScanned(true);
    onScanned(event.data);
    onClose();

    setTimeout(() => {
      scanLockRef.current = false;
      setHasScanned(false);
    }, 900);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.title}>Scan streepjescode</Text>
        {!canScan ? (
          <View style={styles.centered}>
            <Text style={styles.message}>Camera permissie is nodig.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
              <Text style={styles.primaryButtonText}>Sta camera toe</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.scannerWrap}>
            <CameraView
              style={styles.scanner}
              autofocus="on"
              barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
              onBarcodeScanned={handleScan}
            />
          </View>
        )}

        <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
          <Text style={styles.secondaryButtonText}>Sluiten</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101826",
    paddingTop: 56,
    paddingHorizontal: 16
  },
  title: {
    color: "#f7fbff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 14
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14
  },
  message: {
    color: "#d5deed",
    fontSize: 16
  },
  scannerWrap: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#4ea8ff"
  },
  scanner: {
    flex: 1
  },
  primaryButton: {
    backgroundColor: "#3f8cff",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700"
  },
  secondaryButton: {
    marginVertical: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#9ba9c2",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10
  },
  secondaryButtonText: {
    color: "#d5deed",
    fontWeight: "600"
  }
});
