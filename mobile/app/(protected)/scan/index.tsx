
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  CameraView,
  type BarcodeScanningResult,
  useCameraPermissions,
} from "expo-camera";

import { useScan } from "@/features/checkpoints/context/ScanContext";

// --------------------------------------------------
// HITO — IDENTIDAD VISUAL
// --------------------------------------------------

const COLORS = {
  bg: "#0B0C0D",
  surface: "#17181B",
  white: "#FFFFFF",
  secondary: "#9BA1A6",
  muted: "#6E7378",
  lime: "#C6FF4D",
  limeDim: "rgba(198,255,77,0.12)",
  border: "rgba(255,255,255,0.10)",
  overlay: "rgba(11,12,13,0.82)",
};

// --------------------------------------------------
// COMPONENTES VISUALES
// --------------------------------------------------

function BackButton() {
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Volver"
      style={({ pressed }) => [
        styles.backButton,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name="chevron-back"
        size={22}
        color={COLORS.white}
      />
    </Pressable>
  );
}

function ScannerFrame({ size }: { size: number }) {
  return (
    <View
      style={[
        styles.scannerFrame,
        {
          width: size,
          height: size,
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.corner, styles.topLeft]} />
      <View style={[styles.corner, styles.topRight]} />
      <View style={[styles.corner, styles.bottomLeft]} />
      <View style={[styles.corner, styles.bottomRight]} />

      <View style={styles.scanLine} />

      <View style={styles.scannerIndicator}>
        <Ionicons
          name="scan-outline"
          size={18}
          color={COLORS.lime}
        />
      </View>
    </View>
  );
}

// --------------------------------------------------
// PANTALLA PRINCIPAL
// --------------------------------------------------

export default function ScanScreen() {
  const [permission, requestPermission] =
    useCameraPermissions();

  const [isScanning, setIsScanning] = useState(true);

  const { setScannedQr } = useScan();

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Tamaño adaptable según el espacio real disponible.
  const availableHeight =
    height - insets.top - insets.bottom;

  const isCompact = availableHeight < 680;
  const isVeryCompact = availableHeight < 560;

  const frameSize = Math.max(
    140,
    Math.min(
      width - 76,
      availableHeight * (isVeryCompact ? 0.25 : 0.32),
      290,
    ),
  );

  // --------------------------------------------------
  // LÓGICA ORIGINAL — SIN MODIFICACIONES
  // --------------------------------------------------

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (!isScanning) {
        return;
      }

      setIsScanning(false);
      setScannedQr(result.data);

      console.log("QR leído:", result.data);

      router.back();
    },
    [isScanning, setScannedQr],
  );

  // --------------------------------------------------
  // CARGA DE PERMISOS
  // --------------------------------------------------

  if (!permission) {
    return (
      <SafeAreaView
        style={styles.center}
        edges={["top", "left", "right", "bottom"]}
      >
        <View style={styles.loadingIcon}>
          <Ionicons
            name="scan-outline"
            size={30}
            color={COLORS.lime}
          />
        </View>

        <ActivityIndicator
          size="large"
          color={COLORS.lime}
        />

        <Text style={styles.loadingText}>
          Preparando escáner...
        </Text>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------
  // PERMISO NO CONCEDIDO
  // --------------------------------------------------

  if (!permission.granted) {
    return (
      <SafeAreaView
        style={styles.permissionContainer}
        edges={["top", "left", "right", "bottom"]}
      >
        <View style={styles.permissionTop}>
          <BackButton />

          <Text style={styles.brandText}>
            HITO / CHECKPOINT
          </Text>
        </View>

        <View style={styles.permissionContent}>
          <View style={styles.permissionIcon}>
            <Ionicons
              name="camera-outline"
              size={38}
              color={COLORS.lime}
            />
          </View>

          <Text style={styles.permissionEyebrow}>
            PERMISO DE CÁMARA
          </Text>

          <Text style={styles.permissionTitle}>
            Un paso más para explorar.
          </Text>

          <Text style={styles.permissionMessage}>
            Hito necesita acceso a la cámara para
            escanear códigos QR.
          </Text>

          <View style={styles.permissionInfo}>
            <Ionicons
              name="shield-checkmark-outline"
              size={19}
              color={COLORS.lime}
            />

            <Text style={styles.permissionInfoText}>
              Utilizaremos la cámara para leer los
              códigos de los checkpoints.
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.permissionActions,
            { paddingBottom: 16 },
          ]}
        >
          <Pressable
            onPress={requestPermission}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="camera-outline"
              size={19}
              color={COLORS.bg}
            />

            <Text style={styles.primaryButtonText}>
              Conceder permiso
            </Text>

            <Ionicons
              name="arrow-forward"
              size={19}
              color={COLORS.bg}
            />
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              Cancelar
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------
  // ESCÁNER ACTIVO
  // --------------------------------------------------

  return (
    <SafeAreaView
      style={styles.container}
      edges={["left", "right"]}
    >
      {/* CÁMARA A PANTALLA COMPLETA */}

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

      {/* INTERFAZ SUPERPUESTA */}

      <View
        style={styles.overlay}
        pointerEvents="box-none"
      >
        {/* ENCABEZADO RESPONSIVO */}

        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 16,
              paddingBottom: isCompact ? 14 : 20,
            },
          ]}
        >
          <View
            style={[
              styles.headerTop,
              {
                marginBottom: isCompact ? 12 : 20,
              },
            ]}
          >
            <BackButton />

            <View style={styles.headerBrand}>
              <Ionicons
                name="trail-sign-outline"
                size={17}
                color={COLORS.lime}
              />

              <Text style={styles.headerBrandText}>
                HITO
              </Text>
            </View>
          </View>

          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>
              HITO / CHECKPOINT
            </Text>

            <Text
              style={[
                styles.headerTitle,
                {
                  fontSize: isCompact ? 25 : 29,
                },
              ]}
            >
              Registra tu paso.
            </Text>

            <Text style={styles.headerSubtitle}>
              Apunta la cámara al código QR
              del punto de control.
            </Text>
          </View>
        </View>

        {/* ZONA CENTRAL DE ESCANEO */}

        <View
          style={[
            styles.scannerArea,
            {
              paddingVertical: isCompact ? 6 : 12,
            },
          ]}
        >
          <View
            style={[
              styles.scannerCenter,
              {
                gap: isCompact ? 12 : 18,
              },
            ]}
          >
            <ScannerFrame size={frameSize} />

            <View style={styles.scannerInstructions}>
              <Ionicons
                name="scan-outline"
                size={16}
                color={COLORS.lime}
              />

              <Text style={styles.scannerInstructionsText}>
                Coloca el QR dentro del marco
              </Text>
            </View>
          </View>
        </View>

        {/* PANEL INFERIOR RESPONSIVO */}

        <View
          style={[
            styles.bottomPanel,
            {
              paddingTop: isCompact ? 13 : 18,
              paddingBottom: Math.max(insets.bottom, 16) + 12,
              gap: isCompact ? 12 : 18,
            },
          ]}
        >
          {!isVeryCompact && (
            <View style={styles.securityRow}>
              <View style={styles.securityIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={COLORS.lime}
                />
              </View>

              <View style={styles.securityCopy}>
                <Text style={styles.securityTitle}>
                  Registro de checkpoint
                </Text>

                <Text style={styles.securitySubtitle}>
                  El escaneo se realiza automáticamente.
                </Text>
              </View>
            </View>
          )}

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="close-outline"
              size={20}
              color={COLORS.white}
            />

            <Text style={styles.cancelButtonText}>
              Cancelar escaneo
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

// --------------------------------------------------
// ESTILOS
// --------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  pressed: {
    opacity: 0.75,
  },

  // LOADING

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 17,
    backgroundColor: COLORS.bg,
  },

  loadingIcon: {
    width: 70,
    height: 70,
    borderRadius: 23,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: COLORS.secondary,
    fontSize: 13,
    fontWeight: "500",
  },

  // BOTÓN VOLVER

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(20,21,23,0.85)",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  // PERMISOS

  permissionContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 22,
  },

  permissionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
  },

  brandText: {
    color: COLORS.lime,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },

  permissionContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  permissionIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: COLORS.limeDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
  },

  permissionEyebrow: {
    color: COLORS.lime,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.7,
    marginBottom: 12,
  },

  permissionTitle: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.7,
    textAlign: "center",
    marginBottom: 13,
  },

  permissionMessage: {
    color: COLORS.secondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 310,
  },

  permissionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 15,
    marginTop: 27,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  permissionInfoText: {
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 19,
    flex: 1,
  },

  permissionActions: {
    gap: 12,
  },

  primaryButton: {
    minHeight: 54,
    borderRadius: 15,
    backgroundColor: COLORS.lime,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 17,
    gap: 12,
  },

  primaryButtonText: {
    color: COLORS.bg,
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },

  secondaryButton: {
    minHeight: 51,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },

  // OVERLAY

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },

  // HEADER

  header: {
    backgroundColor: COLORS.overlay,
    paddingHorizontal: 22,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  headerBrandText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
  },

  headerCopy: {
    gap: 6,
  },

  headerEyebrow: {
    color: COLORS.lime,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.7,
  },

  headerTitle: {
    color: COLORS.white,
    fontWeight: "800",
    letterSpacing: -0.7,
  },

  headerSubtitle: {
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 280,
  },

  // SCANNER

  scannerArea: {
    flex: 1,
    minHeight: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  scannerCenter: {
    alignItems: "center",
  },

  scannerFrame: {
    position: "relative",
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.025)",
  },

  corner: {
    position: "absolute",
    width: 52,
    height: 52,
    borderColor: COLORS.lime,
    borderWidth: 4,
  },

  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 22,
  },

  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 22,
  },

  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 22,
  },

  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 22,
  },

  scanLine: {
    position: "absolute",
    left: 22,
    right: 22,
    top: "50%",
    height: 2,
    backgroundColor: COLORS.lime,
    opacity: 0.45,
  },

  scannerIndicator: {
    position: "absolute",
    bottom: -17,
    alignSelf: "center",
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.limeDim,
    alignItems: "center",
    justifyContent: "center",
  },

  scannerInstructions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "rgba(11,12,13,0.80)",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },

  scannerInstructionsText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "500",
  },

  // PANEL INFERIOR

  bottomPanel: {
    backgroundColor: COLORS.overlay,
    paddingHorizontal: 22,
  },

  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  securityIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: COLORS.limeDim,
    alignItems: "center",
    justifyContent: "center",
  },

  securityCopy: {
    flex: 1,
    gap: 5,
  },

  securityTitle: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },

  securitySubtitle: {
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 16,
  },

  cancelButton: {
    minHeight: 51,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  cancelButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
});
