import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  CameraView,
  BarcodeScanningResult,
  useCameraPermissions,
} from "expo-camera";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [scannedData, setScannedData] = useState<string | null>(null);

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (!isScanning) {
        return;
      }

      setIsScanning(false);
      setScannedData(result.data);
      console.log("QR leído:", result.data);
    },
    [isScanning],
  );

  const handleRescan = () => {
    setScannedData(null);
    setIsScanning(true);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>
          Hito necesita acceso a la cámara para escanear códigos QR.
        </Text>

        <Button
          title="Conceder permiso"
          onPress={requestPermission}
        />

        <View style={styles.spacing} />

        <Button
          title="Cancelar"
          onPress={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={
          isScanning ? handleBarcodeScanned : undefined
        }
      />

      <View style={styles.overlay}>
        <Text style={styles.title}>
          Escanea el código QR del checkpoint
        </Text>

        {!isScanning && (
          <View style={styles.detectedContainer}>
            <Text style={styles.detected}>Código detectado:</Text>
            <Text style={styles.scannedDataText}>{scannedData}</Text>
            <Button title="Escanear de nuevo" onPress={handleRescan} />
          </View>
        )}

        <Button
          title="Cancelar"
          onPress={() => router.back()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  overlay: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    gap: 12,
  },

  title: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
    borderRadius: 8,
  },

  detectedContainer: {
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },

  detected: {
    color: "#4CAF50",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
  },

  scannedDataText: {
    color: "white",
    textAlign: "center",
    fontSize: 14,
  },

  message: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 16,
  },

  spacing: {
    height: 12,
  },
});