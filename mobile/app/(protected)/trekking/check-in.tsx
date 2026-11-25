
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import {
  router,
} from "expo-router";
import {
  SafeAreaView,
} from "react-native-safe-area-context";
import {
  Ionicons,
} from "@expo/vector-icons";
import {
  useAuth,
} from "@/features/auth/context/AuthContext";
import {
  getUserIdFromToken,
} from "@/features/auth/utils/tokenIdentity";
import {
  getLocalTrekkingDrafts,
} from "@/features/trekking/storage/trekkingGroupStorage";
import {
  startTrekkingByQr,
} from "@/features/trekking/services/localCheckInService";
import {
  downloadOfflineCatalog,
} from "@/features/parks/services/parksService";
import {
  getCachedTrails,
  hasOfflineTrailSnapshot,
} from "@/features/parks/storage/catalogStorage";
import type {
  LocalTrekking,
} from "@/features/trekking/types";
import type {
  Trail,
} from "@/features/parks/types";
// ---------------------------------------------------------
// ESTILOS DE HITO
// ---------------------------------------------------------
const C = {
  bg: "#0B0C0D",
  surface: "#17181B",
  border: "rgba(255,255,255,0.10)",
  white: "#FFFFFF",
  secondary: "#9BA1A6",
  lime: "#C6FF4D",
  limeDim: "rgba(198,255,77,0.10)",
  danger: "#FF625C",
};
// ---------------------------------------------------------
// PANTALLA CHECK-IN
// ---------------------------------------------------------
export default function TrekkingCheckInScreen() {
  const {
    accessToken,
    setActiveLocalTrekking,
  } = useAuth();
  const ownerUserId = accessToken
    ? String(getUserIdFromToken(accessToken) ?? "")
    : "";
  const [permission, requestPermission] =
    useCameraPermissions();
  const [drafts, setDrafts] = useState<
    LocalTrekking[]
  >([]);
  const [trails, setTrails] = useState<
    Trail[]
  >([]);
  const [selectedDraftId, setSelectedDraftId] =
    useState<string | null>(null);
  const [isLoading, setIsLoading] =
    useState(true);
  const [isDownloading, setIsDownloading] =
    useState(false);
  const [isCameraVisible, setIsCameraVisible] =
    useState(false);
  const [isProcessing, setIsProcessing] =
    useState(false);
  const [completed, setCompleted] =
    useState(false);
  const scanningLock = useRef(false);
  const preparingLock = useRef(false);
  // -------------------------------------------------------
  // CARGAR PREPARACIONES Y DATOS OFFLINE
  // -------------------------------------------------------
  const loadData = useCallback(async () => {
    if (!/^[1-9]\d*$/.test(ownerUserId)) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [
        localDrafts,
        localTrails,
      ] = await Promise.all([
        getLocalTrekkingDrafts(ownerUserId),
        getCachedTrails(),
      ]);
      setDrafts(localDrafts);
      setTrails(localTrails);
      setSelectedDraftId((current) => {
        if (
          current &&
          localDrafts.some(
            (item) => item.local_id === current,
          )
        ) {
          return current;
        }
        return localDrafts.length === 1
          ? localDrafts[0].local_id
          : null;
      });
    } catch (error) {
      console.error(
        "Error al cargar preparaciones:",
        error,
      );
      Alert.alert(
        "No se pudieron cargar los datos",
        "Revisa el almacenamiento local de Hito.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [ownerUserId]);
  useEffect(() => {
    void loadData();
  }, [loadData]);
  // -------------------------------------------------------
  // ABRIR CÁMARA
  // -------------------------------------------------------
  const handleOpenCamera = async () => {
    if (preparingLock.current) return;
    if (!selectedDraftId) {
      Alert.alert(
        "Selecciona una excursión",
        "Primero elige la excursión que preparaste.",
      );
      return;
    }
    const selectedDraft = drafts.find(
      (draft) => draft.local_id === selectedDraftId,
    );
    if (!selectedDraft) {
      Alert.alert(
        "Excursión no disponible",
        "Vuelve a seleccionar tu excursión preparada.",
      );
      return;
    }
    preparingLock.current = true;
    setIsDownloading(true);
    try {
      const trailId = selectedDraft.trail_id;
      // Comprobar una descarga completa y verificable del sendero.
      let isReady = await hasOfflineTrailSnapshot(trailId);
      if (!isReady) {
        try {
          await downloadOfflineCatalog();
          // Comprobar nuevamente la integridad después de guardar.
          isReady = await hasOfflineTrailSnapshot(trailId);
          if (isReady) await loadData();
        } catch (error) {
          // No se borran los datos existentes ante un fallo de red.
          console.warn("[Hito] Descarga offline no disponible:", error);
          isReady = await hasOfflineTrailSnapshot(trailId);
        }
      }
      if (!isReady) {
        Alert.alert(
          "Datos del sendero no disponibles",
          "Para iniciar este trekking necesitas descargar el catálogo completo de checkpoints. Conéctate a internet y vuelve a intentarlo antes de salir al sendero.",
        );
        return;
      }
      if (!permission?.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          Alert.alert(
            "Permiso de cámara",
            "Hito necesita la cámara para leer el QR.",
          );
          return;
        }
      }
      scanningLock.current = false;
      setIsCameraVisible(true);
    } catch (error) {
      console.error("[Hito] No se pudo preparar el Check-In:", error);
      Alert.alert(
        "No se pudo preparar el Check-In",
        "Comprueba los datos guardados en el dispositivo y vuelve a intentarlo.",
      );
    } finally {
      preparingLock.current = false;
      setIsDownloading(false);
    }
  };
  // -------------------------------------------------------
  // -------------------------------------------------------
  // ESCANEAR Y REALIZAR CHECK-IN
  // -------------------------------------------------------
  const handleQrScanned = async (
    result: BarcodeScanningResult,
  ) => {
    if (
      scanningLock.current ||
      !selectedDraftId ||
      !ownerUserId
    ) {
      return;
    }
    scanningLock.current = true;
    setIsProcessing(true);
    try {
      const response = await startTrekkingByQr({
        trekkingLocalId: selectedDraftId,
        ownerUserId,
        qrIdentifier: result.data,
      });
      setActiveLocalTrekking(response.group);
      setIsCameraVisible(false);
      setCompleted(true);
      await loadData();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible registrar el Check-In.";
      setIsCameraVisible(false);
      Alert.alert(
        "Check-In no realizado",
        message,
      );
    } finally {
      scanningLock.current = false;
      setIsProcessing(false);
    }
  };
  // -------------------------------------------------------
  // NOMBRE DEL SENDERO
  // -------------------------------------------------------
  const getTrailName = (trailId: number) => {
    const trail = trails.find(
      (item) => item.id === trailId,
    );
    return trail?.name ??
      `Sendero #${trailId}`;
  };
  // -------------------------------------------------------
  // CHECK-IN COMPLETADO
  // -------------------------------------------------------
  if (completed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.completedContainer}>
          <View style={styles.successIcon}>
            <Ionicons
              name="checkmark-circle"
              size={74}
              color={C.lime}
            />
          </View>
          <Text style={styles.completedTitle}>
            Check-In registrado
          </Text>
          <Text style={styles.completedDescription}>
            Tu excursión está en curso.
            El QR de entrada y la hora de inicio
            quedaron guardados en el dispositivo.
          </Text>
          <View style={styles.notice}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={C.lime}
            />
            <Text style={styles.noticeText}>
              La conexión automática con el mapa
              y el seguimiento GPS se integrará
              en el siguiente avance.
            </Text>
          </View>
          <Pressable
            style={styles.primaryButton}
            onPress={() =>
              router.replace("/(protected)")
            }
          >
            <Text style={styles.primaryButtonText}>
              Volver al inicio
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  // -------------------------------------------------------
  // CÁMARA DE CHECK-IN
  // -------------------------------------------------------
  if (isCameraVisible) {
    return (
      <SafeAreaView style={styles.cameraScreen}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={
            !isProcessing
              ? handleQrScanned
              : undefined
          }
        />
        <View style={styles.cameraHeader}>
          <Text style={styles.cameraTitle}>
            Escanea el QR de entrada
          </Text>
          <Text style={styles.cameraSubtitle}>
            Apunta al código físico de la portería.
          </Text>
        </View>
        <View style={styles.cameraFooter}>
          {isProcessing ? (
            <ActivityIndicator
              color={C.lime}
              size="large"
            />
          ) : (
            <Pressable
              style={styles.cancelButton}
              onPress={() =>
                setIsCameraVisible(false)
              }
            >
              <Ionicons
                name="close"
                size={18}
                color={C.white}
              />
              <Text style={styles.cancelText}>
                Cancelar
              </Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }
  // -------------------------------------------------------
  // SELECCIÓN DE EXCURSIÓN
  // -------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={C.lime}
          />
          <Text style={styles.backText}>
            Volver
          </Text>
        </Pressable>
        <Text style={styles.eyebrow}>
          HITO / CHECK-IN
        </Text>
        <Text style={styles.title}>
          Iniciar excursión
        </Text>
        <Text style={styles.description}>
          Selecciona tu excursión preparada
          y escanea el QR de entrada al
          llegar a la portería.
        </Text>
        {/* EXCURSIONES PREPARADAS */}
        <Text style={styles.sectionTitle}>
          Excursiones preparadas
        </Text>
        {isLoading ? (
          <ActivityIndicator color={C.lime} />
        ) : drafts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="clipboard-outline"
              size={29}
              color={C.secondary}
            />
            <Text style={styles.emptyTitle}>
              No tienes excursiones preparadas
            </Text>
            <Text style={styles.emptyDescription}>
              Primero selecciona un sendero y
              guarda su preparación.
            </Text>
          </View>
        ) : (
          drafts.map((draft) => {
            const selected =
              selectedDraftId === draft.local_id;
            return (
              <Pressable
                key={draft.local_id}
                onPress={() =>
                  setSelectedDraftId(draft.local_id)
                }
                style={[
                  styles.draftCard,
                  selected && styles.selectedCard,
                ]}
              >
                <View style={styles.draftIcon}>
                  <Ionicons
                    name="trail-sign-outline"
                    size={22}
                    color={C.lime}
                  />
                </View>
                <View style={styles.draftText}>
                  <Text style={styles.draftName}>
                    {getTrailName(draft.trail_id)}
                  </Text>
                  <Text style={styles.draftStatus}>
                    Preparada · GPS desactivado
                  </Text>
                </View>
                <Ionicons
                  name={
                    selected
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={23}
                  color={
                    selected ? C.lime : C.secondary
                  }
                />
              </Pressable>
            );
          })
        )}
        {/* INICIAR ESCANEO */}
        <Pressable
          style={[
            styles.primaryButton,
            (!selectedDraftId || isDownloading) && styles.disabledButton,
          ]}
          disabled={!selectedDraftId || isDownloading}
          onPress={handleOpenCamera}
        >
          {isDownloading ? (
            <ActivityIndicator color={C.bg} />
          ) : (
            <Ionicons name="qr-code-outline" size={21} color={C.bg} />
          )}
          <Text style={styles.primaryButtonText}>
            {isDownloading ? "Preparando datos..." : "Realizar Check-In"}
          </Text>
        </Pressable>
        <Text style={styles.bottomNote}>
          La preparación no inicia el trekking.
          La sesión comenzará únicamente después
          de validar el QR de portería.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
// ---------------------------------------------------------
// ESTILOS
// ---------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 10,
    marginBottom: 28,
  },
  backText: {
    color: C.lime,
    fontSize: 15,
    fontWeight: "600",
  },
  eyebrow: {
    color: C.lime,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 9,
  },
  title: {
    color: C.white,
    fontSize: 29,
    fontWeight: "800",
    marginBottom: 10,
  },
  description: {
    color: C.secondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 26,
  },
  sectionTitle: {
    color: C.white,
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 14,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    marginBottom: 22,
    gap: 10,
  },
  emptyTitle: {
    color: C.white,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyDescription: {
    color: C.secondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  draftCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 12,
    marginBottom: 10,
  },
  selectedCard: {
    borderColor: C.lime,
    backgroundColor: C.limeDim,
  },
  draftIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: C.limeDim,
    alignItems: "center",
    justifyContent: "center",
  },
  draftText: {
    flex: 1,
  },
  draftName: {
    color: C.white,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 5,
  },
  draftStatus: {
    color: C.secondary,
    fontSize: 12,
  },
  primaryButton: {
    minHeight: 56,
    backgroundColor: C.lime,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 18,
    paddingHorizontal: 15,
  },
  primaryButtonText: {
    color: C.bg,
    fontSize: 15,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.4,
  },
  bottomNote: {
    textAlign: "center",
    color: C.secondary,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 16,
  },
  cameraScreen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraHeader: {
    backgroundColor: "rgba(11,12,13,0.85)",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  cameraTitle: {
    color: C.white,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  cameraSubtitle: {
    color: C.secondary,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
  cameraFooter: {
    marginTop: "auto",
    backgroundColor: "rgba(11,12,13,0.85)",
    padding: 25,
    minHeight: 115,
    justifyContent: "center",
  },
  cancelButton: {
    minHeight: 49,
    backgroundColor: C.surface,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  cancelText: {
    color: C.white,
    fontSize: 14,
    fontWeight: "700",
  },
  completedContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    alignItems: "center",
  },
  successIcon: {
    marginBottom: 22,
  },
  completedTitle: {
    color: C.white,
    fontSize: 27,
    fontWeight: "800",
    marginBottom: 12,
    textAlign: "center",
  },
  completedDescription: {
    color: C.secondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  notice: {
    backgroundColor: C.limeDim,
    borderRadius: 14,
    padding: 15,
    flexDirection: "row",
    gap: 12,
    marginTop: 25,
  },
  noticeText: {
    color: C.white,
    fontSize: 12,
    lineHeight: 19,
    flex: 1,
  },
});
