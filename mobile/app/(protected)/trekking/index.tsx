import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/features/auth/context/AuthContext";
import { finishTrekking } from "@/features/trekking/services/trekkingService";
import { useScan } from "@/features/checkpoints/context/ScanContext";
import { findCheckpointByQr } from "@/features/checkpoints/utils";
import { useCheckpoints } from "@/features/parks/hooks/useCheckpoints";
import { registerCheckpoint } from "@/features/checkpoints/services/checkpointService";
import { enqueueCheckpoint } from "@/features/checkpoints/services/offlineQueue";
import { useRescue } from "@/features/rescues/hooks/useRescue";
import { getTrails } from "@/features/parks/services/parksService";
import type { Trail } from "@/features/parks/types";

// Tracking GPS y Recorrido Local
import { useTracking } from "@/features/trekking/hooks/useTracking";
import { useTrackingTrack } from "@/features/trekking/hooks/useTrackingTrack";

// Mapa de Sendero
import TrailMap from "@/features/parks/components/TrailMap";

// --- Paleta -----------------------------------------------------------------
const COLORS = {
  bg: "#0B0C0D",
  surface: "#17181B",
  surfaceBorder: "rgba(255,255,255,0.08)",
  divider: "rgba(255,255,255,0.08)",
  glass: "rgba(255,255,255,0.06)",
  glassBorder: "rgba(255,255,255,0.10)",
  ink: "#FFFFFF",
  inkSecondary: "#9BA1A6",
  inkTertiary: "#6E7378",
  lime: "#C6FF4D",
  limeDim: "rgba(198,255,77,0.14)",
  limeBorder: "rgba(198,255,77,0.35)",
  black: "#0B0C0D",
};

function BackButton() {
  return (
    <Pressable
      style={styles.backButton}
      onPress={() => router.back()}
      hitSlop={8}
    >
      <Ionicons name="chevron-back" size={20} color={COLORS.ink} />
    </Pressable>
  );
}

export default function ActiveTrekkingScreen() {
  const { activeTrekking, setActiveTrekking, setLastCompletedTrekking } = useAuth();
  const { scannedQr, setScannedQr } = useScan();

  const [isFinishing, setIsFinishing] = useState(false);
  const [trail, setTrail] = useState<Trail | null>(null);

  const {
    activeRescue,
    activeRescueLoading,
    loading: rescueLoading,
    closingRescue,
    cancellingRescue,
    requestRescue,
    loadActiveRescue,
    closeActiveRescue,
    cancelActiveRescue,
  } = useRescue();

  const { checkpoints } = useCheckpoints(activeTrekking?.trail ?? 0);

  // Hooks de Tracking GPS y SQLite (Limpios de flags de debug sin uso)
  const {
    location: currentLocation,
    startTracking,
    stopTracking,
  } = useTracking(activeTrekking?.id ?? 0);

  const {
    coordinates: trackingCoordinates,
    refresh: refreshTrackingTrack,
  } = useTrackingTrack(activeTrekking?.id ?? 0);

  // Iniciar automáticamente el tracking
  useEffect(() => {
    if (!activeTrekking?.id) {
      return;
    }

    startTracking();
  }, [activeTrekking?.id, startTracking]);

  // Actualizar el track local cuando llega una nueva ubicación GPS
  useEffect(() => {
    if (!currentLocation) {
      return;
    }

    refreshTrackingTrack();
  }, [currentLocation, refreshTrackingTrack]);

  // Carga de rescates activos
  useEffect(() => {
    if (!activeTrekking) {
      return;
    }

    loadActiveRescue(activeTrekking.id);
  }, [activeTrekking?.id]);

  // Carga del Sendero (Trail) activo
  useEffect(() => {
    if (!activeTrekking?.trail) {
      setTrail(null);
      return;
    }

    let isMounted = true;

    const loadTrail = async () => {
      try {
        const trails = await getTrails();

        const foundTrail = trails.find(
          (item) => item.id === activeTrekking.trail,
        );

        if (isMounted) {
          setTrail(foundTrail ?? null);
        }
      } catch (error) {
        console.error(
          "Error al cargar el sendero del trekking activo:",
          error,
        );

        if (isMounted) {
          setTrail(null);
        }
      }
    };

    loadTrail();

    return () => {
      isMounted = false;
    };
  }, [activeTrekking?.trail]);

  // Escaneo de checkpoints QR
  useEffect(() => {
    if (!scannedQr) {
      return;
    }

    const checkpoint = findCheckpointByQr(
      checkpoints,
      scannedQr,
    );

    if (!checkpoint) {
      Alert.alert(
        "QR inválido",
        "Este checkpoint no pertenece al sendero actual.",
      );
      setScannedQr(null);
      return;
    }

    (async () => {
      try {
        if (!activeTrekking) return;

        await registerCheckpoint({
          trekking: activeTrekking.id,
          checkpoint: checkpoint.id,
          registered_at: new Date().toISOString(),
        });

        Alert.alert(
          "Checkpoint registrado",
          `"${checkpoint.name}" sincronizado correctamente.`,
        );
      } catch (error: any) {
        console.log("DETALLE DEL ERROR DE DJANGO:", error.response?.data);

        if (error.response) {
          Alert.alert(
            "Error",
            "No fue posible registrar el checkpoint.",
          );
        } else {
          if (activeTrekking) {
            await enqueueCheckpoint({
              trekking: activeTrekking.id,
              checkpoint: checkpoint.id,
              registered_at: new Date().toISOString(),
            });
          }

          Alert.alert(
            "Modo sin conexión",
            "El checkpoint fue guardado y se sincronizará cuando vuelva la conexión.",
          );
        }
      } finally {
        setScannedQr(null);
      }
    })();
  }, [scannedQr, checkpoints, setScannedQr, activeTrekking]);

  const handleFinishTrekking = async () => {
    if (!activeTrekking || isFinishing) {
      return;
    }

    setIsFinishing(true);

    stopTracking();

    try {
      const completedTrekking = await finishTrekking(activeTrekking.id);

      setLastCompletedTrekking(completedTrekking);
      setActiveTrekking(null);

      router.replace("/trekking/summary");
    } catch (error) {
      console.error(error);

      Alert.alert(
        "Error",
        "No fue posible finalizar el trekking.",
      );
    } finally {
      setIsFinishing(false);
    }
  };

  const handleRequestRescue = () => {
    if (
      !activeTrekking ||
      rescueLoading ||
      activeRescue
    ) {
      return;
    }

    Alert.alert(
      "Solicitar rescate",
      "¿Estás seguro de que necesitas solicitar un rescate? Esta acción notificará que necesitas asistencia.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Solicitar rescate",
          style: "destructive",
          onPress: async () => {
            const rescue = await requestRescue({
              trekking: activeTrekking.id,
            });

            if (rescue) {
              Alert.alert(
                "Rescate solicitado",
                "Tu solicitud de rescate fue registrada correctamente.",
              );
            }
          },
        },
      ],
    );
  };

  const handleCloseRescue = () => {
    if (!activeRescue || closingRescue || cancellingRescue) return;

    Alert.alert(
      "Cerrar rescate",
      "Confirma que la situación de emergencia ya fue atendida y deseas finalizar la solicitud de rescate.",
      [
        {
          text: "Volver",
          style: "cancel",
        },
        {
          text: "Cerrar rescate",
          style: "default",
          onPress: async () => {
            const result = await closeActiveRescue(activeRescue.id);
            if (result) {
              Alert.alert(
                "Rescate cerrado",
                "El rescate ha sido marcado como completado.",
              );
            }
          },
        },
      ],
    );
  };

  const handleCancelRescue = () => {
    if (!activeRescue || closingRescue || cancellingRescue) return;

    Alert.alert(
      "Cancelar rescate",
      "Confirma que ya no necesitas la asistencia de rescate.",
      [
        {
          text: "Volver",
          style: "cancel",
        },
        {
          text: "Cancelar rescate",
          style: "destructive",
          onPress: async () => {
            const result = await cancelActiveRescue(activeRescue.id);
            if (result) {
              Alert.alert(
                "Rescate cancelado",
                "La solicitud de rescate fue cancelada correctamente.",
              );
            }
          },
        },
      ],
    );
  };

  const formatFriendlyDate = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;

    const optionsDate: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "short",
    };
    const optionsTime: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };

    const formattedDate = date.toLocaleDateString("es-CL", optionsDate);
    const formattedTime = date.toLocaleTimeString("es-CL", optionsTime);

    const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    return `${capitalizedDate}, ${formattedTime}`;
  };

  if (!activeTrekking) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.emptyHeader}>
          <BackButton />
        </View>

        <View style={styles.emptyBody}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="compass-outline" size={40} color={COLORS.inkTertiary} />
          </View>
          <Text style={styles.emptyText}>No existe un trekking activo.</Text>

          <Pressable
            style={styles.historyButtonAlt}
            onPress={() => router.push("/trekking/history")}
          >
            <Text style={styles.historyButtonTextAlt}>Mis trekkings</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Cabecera */}
        <View style={styles.headerContainer}>
          <View style={styles.topRow}>
            <BackButton />

            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveIndicatorText}>En vivo</Text>
            </View>
          </View>

          <Text style={styles.title}>Trekking en curso</Text>
          <Text style={styles.subtitle}>Monitoreo de ruta en tiempo real</Text>
        </View>

        {/* Mapa Activo del Trekking */}
        <View style={styles.mapCard}>
          <TrailMap
            routeGeoJSON={trail?.route_geojson ?? null}
            checkpoints={checkpoints}
            location={currentLocation}
            trackingCoordinates={trackingCoordinates}
          />
        </View>

        {/* Tarjeta Principal de Datos */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.labelGroup}>
              <Ionicons name="finger-print-outline" size={16} color={COLORS.inkSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.label}>ID del recorrido</Text>
            </View>
            <Text style={styles.value}>#{activeTrekking.id}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.labelGroup}>
              <Ionicons name="map-outline" size={16} color={COLORS.inkSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.label}>Sendero</Text>
            </View>
            <Text style={styles.value}>
              {trail?.name ? trail.name : `Sendero #${activeTrekking.trail}`}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.labelGroup}>
              <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.inkSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.label}>Estado</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{activeTrekking.status}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.column}>
            <View style={styles.labelGroup}>
              <Ionicons name="time-outline" size={16} color={COLORS.inkSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.label}>Hora de inicio</Text>
            </View>
            <Text style={styles.valueSub}>
              {formatFriendlyDate(activeTrekking.started_at)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.column}>
            <View style={styles.labelGroup}>
              <Ionicons name="alarm-outline" size={16} color={COLORS.inkSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.label}>Retorno estimado</Text>
            </View>
            <Text style={styles.valueSub}>
              {formatFriendlyDate(activeTrekking.estimated_return_time)}
            </Text>
          </View>
        </View>

        {/* Contenedor de Botones de Acción */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => router.push("/scan")}
          >
            <Ionicons name="scan-outline" size={18} color={COLORS.black} style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>Escanear checkpoint</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={() => router.push("/trekking/incident")}
          >
            <Ionicons name="warning-outline" size={18} color={COLORS.ink} style={{ marginRight: 8 }} />
            <Text style={styles.secondaryButtonText}>Reportar incidente</Text>
          </Pressable>

          {!activeRescueLoading && activeRescue ? (
            <View style={styles.rescueActiveContainer}>
              <View style={styles.rescueActiveHeader}>
                <Ionicons name="alert-circle" size={20} color={COLORS.lime} style={{ marginRight: 6 }} />
                <Text style={styles.rescueActiveTitle}>Rescate activo</Text>
              </View>
              <Text style={styles.rescueActiveText}>
                Tu solicitud de rescate está registrada y en curso.
              </Text>

              <View style={styles.rescueActionButtons}>
                <Pressable
                  style={[styles.completeRescueButton, closingRescue && styles.buttonDisabled]}
                  onPress={handleCloseRescue}
                  disabled={closingRescue || cancellingRescue}
                >
                  <Text style={styles.completeRescueButtonText}>
                    {closingRescue ? "Cerrando..." : "Cerrar rescate"}
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.cancelRescueButton, cancellingRescue && styles.buttonDisabled]}
                  onPress={handleCancelRescue}
                  disabled={closingRescue || cancellingRescue}
                >
                  <Text style={styles.cancelRescueButtonText}>
                    {cancellingRescue ? "Cancelando..." : "Cancelar rescate"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={[
                styles.rescueButton,
                (rescueLoading || activeRescueLoading) && styles.buttonDisabled,
              ]}
              onPress={handleRequestRescue}
              disabled={rescueLoading || activeRescueLoading}
            >
              <Ionicons name="alert-circle-outline" size={18} color={COLORS.lime} style={{ marginRight: 8 }} />
              <Text style={styles.rescueButtonText}>
                {rescueLoading
                  ? "Solicitando rescate..."
                  : activeRescueLoading
                    ? "Consultando rescate..."
                    : "Solicitar rescate"}
              </Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.dangerButton, isFinishing && styles.buttonDisabled]}
            onPress={handleFinishTrekking}
            disabled={isFinishing}
          >
            <Ionicons name="stop-circle-outline" size={18} color={COLORS.black} style={{ marginRight: 8 }} />
            <Text style={styles.dangerButtonText}>
              {isFinishing ? "Finalizando..." : "Finalizar Trekking"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.historyButton}
            onPress={() => router.push("/trekking/history")}
          >
            <View style={styles.historyIconWrap}>
              <Ionicons name="time-outline" size={17} color={COLORS.lime} />
            </View>
            <Text style={styles.historyButtonText}>Mis trekkings</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.inkTertiary} style={{ marginLeft: "auto" }} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 36,
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  emptyHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  emptyBody: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.inkSecondary,
    fontWeight: "500",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.glass,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  headerContainer: {
    marginBottom: 20,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.ink,
    letterSpacing: -0.5,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.limeDim,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.limeBorder,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.lime,
  },
  liveIndicatorText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.lime,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.inkSecondary,
    marginTop: 4,
    fontWeight: "500",
  },
  mapCard: {
    height: 280,
    marginBottom: 20,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surface,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  column: {
    gap: 4,
  },
  labelGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 14,
  },
  label: {
    fontSize: 14,
    color: COLORS.inkSecondary,
    fontWeight: "500",
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.ink,
  },
  valueSub: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.ink,
    marginLeft: 22,
  },
  statusPill: {
    backgroundColor: COLORS.limeDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.limeBorder,
  },
  statusPillText: {
    color: COLORS.lime,
    fontWeight: "700",
    fontSize: 12,
  },
  buttonContainer: {
    marginTop: 20,
    gap: 12,
  },
  pressed: {
    opacity: 0.85,
  },
  primaryButton: {
    flexDirection: "row",
    backgroundColor: COLORS.lime,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    flexDirection: "row",
    backgroundColor: COLORS.glass,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  secondaryButtonText: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: "600",
  },
  rescueButton: {
    flexDirection: "row",
    backgroundColor: COLORS.black,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.lime,
  },
  rescueButtonText: {
    color: COLORS.lime,
    fontSize: 16,
    fontWeight: "700",
  },
  rescueActiveContainer: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.limeBorder,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.lime,
    padding: 16,
    borderRadius: 16,
    gap: 10,
  },
  rescueActiveHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  rescueActiveTitle: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  rescueActiveText: {
    color: COLORS.inkSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  rescueActionButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  completeRescueButton: {
    flex: 1,
    backgroundColor: COLORS.lime,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  completeRescueButtonText: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: "700",
  },
  cancelRescueButton: {
    flex: 1,
    backgroundColor: "transparent",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  cancelRescueButtonText: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: "600",
  },
  dangerButton: {
    flexDirection: "row",
    backgroundColor: COLORS.ink,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerButtonText: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginTop: 4,
  },
  historyIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.limeDim,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  historyButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.ink,
  },
  historyButtonAlt: {
    backgroundColor: COLORS.lime,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 16,
  },
  historyButtonTextAlt: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.black,
  },
});