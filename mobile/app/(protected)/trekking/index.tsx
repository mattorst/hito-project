
import { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
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

import { useTracking } from "@/features/trekking/hooks/useTracking";
import { useTrackingTrack } from "@/features/trekking/hooks/useTrackingTrack";

import TrailMap from "@/features/parks/components/TrailMap";

// ─────────────────────────────────────────
// HITO — DESIGN SYSTEM
// ─────────────────────────────────────────

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

// ─────────────────────────────────────────
// COMPONENTE: VOLVER
// ─────────────────────────────────────────

function BackButton() {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.backButton,
        pressed && styles.pressed,
      ]}
      onPress={() => router.back()}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Volver"
    >
      <Ionicons
        name="chevron-back"
        size={20}
        color={COLORS.ink}
      />
    </Pressable>
  );
}

// ─────────────────────────────────────────
// COMPONENTE: HORARIO
// ─────────────────────────────────────────

function TrekkingTime({
  label,
  dateString,
  icon,
}: {
  label: string;
  dateString: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const date = new Date(dateString);
  const isValid = !Number.isNaN(date.getTime());

  const time = isValid
    ? date.toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : dateString;

  const formattedDate = isValid
    ? date.toLocaleDateString("es-CL", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : "";

  return (
    <View style={styles.timeColumn}>
      <View style={styles.timeLabelRow}>
        <Ionicons
          name={icon}
          size={16}
          color={COLORS.inkSecondary}
        />

        <Text style={styles.timeLabel}>
          {label}
        </Text>
      </View>

      <Text style={styles.timeValue}>
        {time}
      </Text>

      {formattedDate ? (
        <Text style={styles.timeDate}>
          {formattedDate}
        </Text>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────
// PANTALLA PRINCIPAL
// ─────────────────────────────────────────

export default function ActiveTrekkingScreen() {
  const {
    activeTrekking,
    setActiveTrekking,
    setLastCompletedTrekking,
  } = useAuth();

  const { scannedQr, setScannedQr } = useScan();

  const insets = useSafeAreaInsets();

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

  const { checkpoints } = useCheckpoints(
    activeTrekking?.trail ?? 0
  );

  // ───────────────────────────────────────
  // TRACKING GPS — LÓGICA ORIGINAL
  // ───────────────────────────────────────

  const {
    location: currentLocation,
    startTracking,
    stopTracking,
  } = useTracking(activeTrekking?.id ?? 0);

  const {
    coordinates: trackingCoordinates,
    refresh: refreshTrackingTrack,
  } = useTrackingTrack(activeTrekking?.id ?? 0);

  useEffect(() => {
    if (!activeTrekking?.id) {
      return;
    }

    startTracking();
  }, [activeTrekking?.id, startTracking]);

  useEffect(() => {
    if (!currentLocation) {
      return;
    }

    refreshTrackingTrack();
  }, [currentLocation, refreshTrackingTrack]);

  // ───────────────────────────────────────
  // RESCATE ACTIVO — LÓGICA ORIGINAL
  // ───────────────────────────────────────

  useEffect(() => {
    if (!activeTrekking) {
      return;
    }

    loadActiveRescue(activeTrekking.id);
  }, [activeTrekking?.id]);

  // ───────────────────────────────────────
  // CARGAR SENDERO — LÓGICA ORIGINAL
  // ───────────────────────────────────────

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
          (item) => item.id === activeTrekking.trail
        );

        if (isMounted) {
          setTrail(foundTrail ?? null);
        }
      } catch (error) {
        console.error(
          "Error al cargar el sendero del trekking activo:",
          error
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

  // ───────────────────────────────────────
  // CHECKPOINTS QR — LÓGICA ORIGINAL
  // ───────────────────────────────────────

  useEffect(() => {
    if (!scannedQr) {
      return;
    }

    const checkpoint = findCheckpointByQr(
      checkpoints,
      scannedQr
    );

    if (!checkpoint) {
      Alert.alert(
        "QR inválido",
        "Este checkpoint no pertenece al sendero actual."
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
          `"${checkpoint.name}" sincronizado correctamente.`
        );
      } catch (error: any) {
        console.log(
          "DETALLE DEL ERROR DE DJANGO:",
          error.response?.data
        );

        if (error.response) {
          Alert.alert(
            "Error",
            "No fue posible registrar el checkpoint."
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
            "El checkpoint fue guardado y se sincronizará cuando vuelva la conexión."
          );
        }
      } finally {
        setScannedQr(null);
      }
    })();
  }, [scannedQr, checkpoints, setScannedQr, activeTrekking]);

  // ───────────────────────────────────────
  // FINALIZAR TREKKING — LÓGICA ORIGINAL
  // ───────────────────────────────────────

  const handleFinishTrekking = async () => {
    if (!activeTrekking || isFinishing) {
      return;
    }

    setIsFinishing(true);

    stopTracking();

    try {
      const completedTrekking = await finishTrekking(
        activeTrekking.id
      );

      setLastCompletedTrekking(completedTrekking);
      setActiveTrekking(null);

      router.replace("/trekking/summary");
    } catch (error) {
      console.error(error);

      Alert.alert(
        "Error",
        "No fue posible finalizar el trekking."
      );
    } finally {
      setIsFinishing(false);
    }
  };

  // ───────────────────────────────────────
  // SOLICITAR RESCATE — LÓGICA ORIGINAL
  // ───────────────────────────────────────

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
                "Tu solicitud de rescate fue registrada correctamente."
              );
            }
          },
        },
      ]
    );
  };

  // ───────────────────────────────────────
  // CERRAR RESCATE — LÓGICA ORIGINAL
  // ───────────────────────────────────────

  const handleCloseRescue = () => {
    if (
      !activeRescue ||
      closingRescue ||
      cancellingRescue
    ) {
      return;
    }

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
            const result = await closeActiveRescue(
              activeRescue.id
            );

            if (result) {
              Alert.alert(
                "Rescate cerrado",
                "El rescate ha sido marcado como completado."
              );
            }
          },
        },
      ]
    );
  };

  // ───────────────────────────────────────
  // CANCELAR RESCATE — LÓGICA ORIGINAL
  // ───────────────────────────────────────

  const handleCancelRescue = () => {
    if (
      !activeRescue ||
      closingRescue ||
      cancellingRescue
    ) {
      return;
    }

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
            const result = await cancelActiveRescue(
              activeRescue.id
            );

            if (result) {
              Alert.alert(
                "Rescate cancelado",
                "La solicitud de rescate fue cancelada correctamente."
              );
            }
          },
        },
      ]
    );
  };

  // ───────────────────────────────────────
  // FORMATO DE FECHAS — LÓGICA ORIGINAL
  // ───────────────────────────────────────

  const formatFriendlyDate = (dateString: string) => {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

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

    const formattedDate = date.toLocaleDateString(
      "es-CL",
      optionsDate
    );

    const formattedTime = date.toLocaleTimeString(
      "es-CL",
      optionsTime
    );

    const capitalizedDate =
      formattedDate.charAt(0).toUpperCase() +
      formattedDate.slice(1);

    return `${capitalizedDate}, ${formattedTime}`;
  };

  // ───────────────────────────────────────
  // SIN TREKKING ACTIVO
  // ───────────────────────────────────────

  if (!activeTrekking) {
    return (
      <SafeAreaView
        style={styles.center}
        edges={["top", "left", "right", "bottom"]}
      >
        <View style={styles.emptyHeader}>
          <BackButton />
        </View>

        <View style={styles.emptyBody}>
          <View style={styles.emptyIconContainer}>
            <Ionicons
              name="compass-outline"
              size={36}
              color={COLORS.lime}
            />
          </View>

          <Text style={styles.emptyTitle}>
            Sin recorrido activo
          </Text>

          <Text style={styles.emptyText}>
            No existe un trekking activo.
          </Text>

          <Pressable
            style={styles.historyButtonAlt}
            onPress={() =>
              router.push("/trekking/history")
            }
          >
            <Text style={styles.historyButtonTextAlt}>
              Mis trekkings
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ───────────────────────────────────────
  // INTERFAZ PRINCIPAL
  // ───────────────────────────────────────

  return (
    <SafeAreaView
      style={styles.safeContainer}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: 130 + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ───────── HEADER ───────── */}

        <View style={styles.headerContainer}>
          <View style={styles.topRow}>
            <BackButton />

            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />

              <Text style={styles.liveIndicatorText}>
                En vivo
              </Text>
            </View>
          </View>

          <Text style={styles.eyebrow}>
            HITO / EN RUTA
          </Text>

          <Text style={styles.title}>
            Trekking en curso
          </Text>

          <Text style={styles.subtitle}>
            Monitoreo de ruta en tiempo real
          </Text>
        </View>

        {/* ───────── MAPA ───────── */}

        <View style={styles.mapSection}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>
              Tu recorrido
            </Text>

            <Ionicons
              name="navigate-outline"
              size={19}
              color={COLORS.lime}
            />
          </View>

          <View style={styles.mapCard}>
            <TrailMap
              routeGeoJSON={
                trail?.route_geojson ?? null
              }
              checkpoints={checkpoints}
              location={currentLocation}
              trackingCoordinates={
                trackingCoordinates
              }
            />
          </View>
        </View>

        {/* ───────── DETALLES DEL RECORRIDO ───────── */}

        <View style={styles.detailsSection}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>
              Detalles del recorrido
            </Text>
          </View>

          <View style={styles.card}>
            {/* SENDERO + ESTADO */}

            <View style={styles.expeditionHeader}>
              <View style={styles.expeditionInfo}>
                <Text style={styles.expeditionEyebrow}>
                  SENDERO ACTUAL
                </Text>

                <Text style={styles.expeditionTrailName}>
                  {trail?.name
                    ? trail.name
                    : `Sendero #${activeTrekking.trail}`}
                </Text>

                <View style={styles.expeditionIdRow}>
                  <Ionicons
                    name="trail-sign-outline"
                    size={16}
                    color={COLORS.lime}
                  />

                  <Text style={styles.expeditionId}>
                    Recorrido #{activeTrekking.id}
                  </Text>
                </View>
              </View>

              <View style={styles.statusPill}>
                <View style={styles.statusDot} />

                <Text style={styles.statusPillText}>
                  {activeTrekking.status}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* HORARIOS */}

            <View style={styles.timeGrid}>
              <TrekkingTime
                label="Hora de inicio"
                dateString={activeTrekking.started_at}
                icon="time-outline"
              />

              <TrekkingTime
                label="Retorno estimado"
                dateString={
                  activeTrekking.estimated_return_time
                }
                icon="flag-outline"
              />
            </View>
          </View>
        </View>

        {/* ───────── ACCIONES ───────── */}

        <View style={styles.actionsSection}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>
              Acciones
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            {/* ESCANEAR CHECKPOINT */}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push("/scan")}
            >
              <Ionicons
                name="scan-outline"
                size={20}
                color={COLORS.black}
              />

              <Text style={styles.primaryButtonText}>
                Escanear checkpoint
              </Text>

              <Ionicons
                name="arrow-forward"
                size={18}
                color={COLORS.black}
              />
            </Pressable>

            {/* REPORTAR INCIDENTE */}

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
              onPress={() =>
                router.push("/trekking/incident")
              }
            >
              <Ionicons
                name="warning-outline"
                size={19}
                color={COLORS.ink}
              />

              <Text style={styles.secondaryButtonText}>
                Reportar incidente
              </Text>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.inkTertiary}
              />
            </Pressable>

            {/* SOLICITAR / GESTIONAR RESCATE */}

            {!activeRescueLoading && activeRescue ? (
              <View style={styles.rescueActiveContainer}>
                <View style={styles.rescueActiveHeader}>
                  <View style={styles.rescueActiveIcon}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={21}
                      color={COLORS.lime}
                    />
                  </View>

                  <View style={styles.rescueActiveHeading}>
                    <Text style={styles.rescueActiveTitle}>
                      Rescate activo
                    </Text>

                    <Text style={styles.rescueActiveText}>
                      Tu solicitud de rescate está
                      registrada y en curso.
                    </Text>
                  </View>
                </View>

                <View style={styles.rescueActionButtons}>
                  <Pressable
                    style={[
                      styles.completeRescueButton,
                      closingRescue &&
                        styles.buttonDisabled,
                    ]}
                    onPress={handleCloseRescue}
                    disabled={
                      closingRescue ||
                      cancellingRescue
                    }
                  >
                    <Text
                      style={
                        styles.completeRescueButtonText
                      }
                    >
                      {closingRescue
                        ? "Cerrando..."
                        : "Cerrar rescate"}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.cancelRescueButton,
                      cancellingRescue &&
                        styles.buttonDisabled,
                    ]}
                    onPress={handleCancelRescue}
                    disabled={
                      closingRescue ||
                      cancellingRescue
                    }
                  >
                    <Text
                      style={
                        styles.cancelRescueButtonText
                      }
                    >
                      {cancellingRescue
                        ? "Cancelando..."
                        : "Cancelar rescate"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.emergencyCard}>
                <View style={styles.emergencyHeader}>
                  <View style={styles.emergencyIcon}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={23}
                      color={COLORS.lime}
                    />
                  </View>

                  <View style={styles.emergencyCopy}>
                    <Text style={styles.emergencyTitle}>
                      Asistencia de emergencia
                    </Text>

                    <Text style={styles.emergencySubtitle}>
                      Solicita ayuda si estás en peligro.
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.emergencyAction,
                    (rescueLoading ||
                      activeRescueLoading) &&
                      styles.buttonDisabled,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleRequestRescue}
                  disabled={
                    rescueLoading ||
                    activeRescueLoading
                  }
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={19}
                    color={COLORS.lime}
                  />

                  <Text
                    style={styles.emergencyActionText}
                  >
                    {rescueLoading
                      ? "Solicitando rescate..."
                      : activeRescueLoading
                        ? "Consultando rescate..."
                        : "Solicitar rescate"}
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={COLORS.lime}
                  />
                </Pressable>
              </View>
            )}

            {/* FINALIZAR TREKKING */}

            <Pressable
              style={({ pressed }) => [
                styles.dangerButton,
                isFinishing &&
                  styles.buttonDisabled,
                pressed && styles.pressed,
              ]}
              onPress={handleFinishTrekking}
              disabled={isFinishing}
            >
              <Ionicons
                name="stop-circle-outline"
                size={19}
                color={COLORS.ink}
              />

              <Text style={styles.dangerButtonText}>
                {isFinishing
                  ? "Finalizando..."
                  : "Finalizar Trekking"}
              </Text>
            </Pressable>

            {/* MIS TREKKINGS */}

            <Pressable
              style={({ pressed }) => [
                styles.historyButton,
                pressed && styles.pressed,
              ]}
              onPress={() =>
                router.push("/trekking/history")
              }
            >
              <View style={styles.historyIconWrap}>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={COLORS.lime}
                />
              </View>

              <Text style={styles.historyButtonText}>
                Mis trekkings
              </Text>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={COLORS.inkTertiary}
              />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────

const styles = StyleSheet.create({
  // ───────── SCREEN ─────────

  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  pressed: {
    opacity: 0.8,
  },

  // ───────── HEADER ─────────

  headerContainer: {
    marginBottom: 24,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 25,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  eyebrow: {
    color: COLORS.lime,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.8,
    marginBottom: 9,
  },

  title: {
    fontSize: 29,
    fontWeight: "700",
    color: COLORS.ink,
    letterSpacing: -0.9,
    lineHeight: 36,
  },

  subtitle: {
    fontSize: 13,
    color: COLORS.inkSecondary,
    marginTop: 7,
    fontWeight: "400",
  },

  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.limeDim,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 7,
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.lime,
  },

  liveIndicatorText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.lime,
  },

  // ───────── SECTIONS ─────────

  mapSection: {
    marginBottom: 26,
  },

  detailsSection: {
    marginBottom: 26,
  },

  actionsSection: {
    marginBottom: 8,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },

  sectionTitle: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.4,
  },

  // ───────── MAP ─────────

  mapCard: {
    height: 250,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },

  // ───────── DETAILS ─────────

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 17,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },

  expeditionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  expeditionInfo: {
    flex: 1,
    minWidth: 0,
  },

  expeditionEyebrow: {
    color: COLORS.inkSecondary,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.3,
    marginBottom: 9,
  },

  expeditionTrailName: {
    color: COLORS.ink,
    fontSize: 21,
    fontWeight: "700",
    letterSpacing: -0.6,
    lineHeight: 27,
  },

  expeditionIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 11,
  },

  expeditionId: {
    color: COLORS.inkSecondary,
    fontSize: 12,
    fontWeight: "500",
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 17,
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.limeDim,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    maxWidth: "45%",
  },

  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.lime,
  },

  statusPillText: {
    color: COLORS.lime,
    fontWeight: "600",
    fontSize: 11,
    flexShrink: 1,
  },

  timeGrid: {
    flexDirection: "row",
    gap: 14,
  },

  timeColumn: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },

  timeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  timeLabel: {
    color: COLORS.inkSecondary,
    fontSize: 11,
    fontWeight: "500",
    flexShrink: 1,
  },

  timeValue: {
    color: COLORS.ink,
    fontSize: 23,
    fontWeight: "700",
    letterSpacing: -0.7,
    fontVariant: ["tabular-nums"],
  },

  timeDate: {
    color: COLORS.inkSecondary,
    fontSize: 11,
  },

  // ───────── ACTIONS ─────────

  buttonContainer: {
    gap: 10,
  },

  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.lime,
    minHeight: 56,
    paddingHorizontal: 17,
    borderRadius: 16,
    gap: 10,
  },

  primaryButtonText: {
    color: COLORS.black,
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },

  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    minHeight: 56,
    paddingHorizontal: 17,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: 12,
  },

  secondaryButtonText: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },

  // ───────── EMERGENCY ─────────

  emergencyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.limeBorder,
    padding: 14,
    gap: 15,
  },

  emergencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  emergencyIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.limeDim,
    alignItems: "center",
    justifyContent: "center",
  },

  emergencyCopy: {
    flex: 1,
    gap: 4,
  },

  emergencyTitle: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: "700",
  },

  emergencySubtitle: {
    color: COLORS.inkSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  emergencyAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.limeDim,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 14,
    gap: 10,
  },

  emergencyActionText: {
    flex: 1,
    color: COLORS.lime,
    fontSize: 14,
    fontWeight: "700",
  },

  // ───────── ACTIVE RESCUE ─────────

  rescueActiveContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.limeBorder,
    padding: 15,
    gap: 15,
  },

  rescueActiveHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  rescueActiveIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.limeDim,
    alignItems: "center",
    justifyContent: "center",
  },

  rescueActiveHeading: {
    flex: 1,
    gap: 5,
  },

  rescueActiveTitle: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: "700",
  },

  rescueActiveText: {
    color: COLORS.inkSecondary,
    fontSize: 12,
    lineHeight: 18,
  },

  rescueActionButtons: {
    flexDirection: "row",
    gap: 8,
  },

  completeRescueButton: {
    flex: 1,
    backgroundColor: COLORS.lime,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  completeRescueButtonText: {
    color: COLORS.black,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },

  cancelRescueButton: {
    flex: 1,
    backgroundColor: COLORS.glass,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },

  cancelRescueButtonText: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },

  // ───────── FINISH TREKKING ─────────

  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: 10,
  },

  dangerButtonText: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: "600",
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  // ───────── HISTORY ─────────

  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginTop: 5,
    gap: 12,
  },

  historyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: COLORS.limeDim,
    alignItems: "center",
    justifyContent: "center",
  },

  historyButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.ink,
  },

  // ───────── EMPTY STATE ─────────

  center: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  emptyHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
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
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: COLORS.ink,
    marginBottom: 7,
  },

  emptyText: {
    fontSize: 13,
    color: COLORS.inkSecondary,
    fontWeight: "400",
    textAlign: "center",
  },

  historyButtonAlt: {
    backgroundColor: COLORS.lime,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 22,
  },

  historyButtonTextAlt: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.black,
  },
});
