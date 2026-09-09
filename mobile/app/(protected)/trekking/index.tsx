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

export default function ActiveTrekkingScreen() {
  const { activeTrekking, setActiveTrekking, setLastCompletedTrekking } = useAuth();
  const { scannedQr, setScannedQr } = useScan();
  
  const [isFinishing, setIsFinishing] = useState(false);
  
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

  useEffect(() => {
    if (!activeTrekking) {
      return;
    }

    loadActiveRescue(activeTrekking.id);
  }, [activeTrekking?.id]);

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

  // Función para dar formato amigable a la fecha (Ej: "Jueves 28 ago, 14:30")
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

    // Capitaliza la primera letra del día
    const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    return `${capitalizedDate}, ${formattedTime}`;
  };

  if (!activeTrekking) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="compass-outline" size={40} color="#666666" />
        </View>
        <Text style={styles.emptyText}>No existe un trekking activo.</Text>
        
        <Pressable
          style={styles.historyButtonAlt}
          onPress={() => router.push("/trekking/history")}
        >
          <Text style={styles.historyButtonTextAlt}>Mis trekkings</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Cabecera Limpia y Proporcionada */}
        <View style={styles.headerContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Trekking en curso</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
            </View>
          </View>
          <Text style={styles.subtitle}>Monitoreo de ruta en tiempo real</Text>
        </View>

        {/* Tarjeta Principal de Datos */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.labelGroup}>
              <Ionicons name="finger-print-outline" size={16} color="#666666" style={{ marginRight: 6 }} />
              <Text style={styles.label}>ID del recorrido</Text>
            </View>
            <Text style={styles.value}>#{activeTrekking.id}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.labelGroup}>
              <Ionicons name="map-outline" size={16} color="#666666" style={{ marginRight: 6 }} />
              <Text style={styles.label}>Sendero</Text>
            </View>
            <Text style={styles.value}>Sendero #{activeTrekking.trail}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.labelGroup}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#666666" style={{ marginRight: 6 }} />
              <Text style={styles.label}>Estado</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{activeTrekking.status}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.column}>
            <View style={styles.labelGroup}>
              <Ionicons name="time-outline" size={16} color="#666666" style={{ marginRight: 6 }} />
              <Text style={styles.label}>Hora de inicio</Text>
            </View>
            <Text style={styles.valueSub}>
              {formatFriendlyDate(activeTrekking.started_at)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.column}>
            <View style={styles.labelGroup}>
              <Ionicons name="alarm-outline" size={16} color="#666666" style={{ marginRight: 6 }} />
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
            style={styles.primaryButton}
            onPress={() => router.push("/scan")}
          >
            <Ionicons name="scan-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>Escanear checkpoint</Text>
          </Pressable>

          <Pressable
            style={styles.warningButton}
            onPress={() => router.push("/trekking/incident")}
          >
            <Ionicons name="warning-outline" size={18} color="#111111" style={{ marginRight: 8 }} />
            <Text style={styles.warningButtonText}>Reportar incidente</Text>
          </Pressable>

          {!activeRescueLoading && activeRescue ? (
            <View style={styles.rescueActiveContainer}>
              <View style={styles.rescueActiveHeader}>
                <Ionicons name="alert-circle" size={20} color="#D32F2F" style={{ marginRight: 6 }} />
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
              <Ionicons name="alert-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
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
            <Ionicons name="stop-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.dangerButtonText}>
              {isFinishing ? "Finalizando..." : "Finalizar Trekking"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.historyButton}
            onPress={() => router.push("/trekking/history")}
          >
            <Ionicons name="time-outline" size={18} color="#111111" style={{ marginRight: 8 }} />
            <Text style={styles.historyButtonText}>Mis trekkings</Text>
            <Ionicons name="chevron-forward" size={16} color="#666666" style={{ marginLeft: "auto" }} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  scrollContent: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F5F7",
    padding: 24,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyText: {
    fontSize: 16,
    color: "#666666",
    fontWeight: "500",
  },
  headerContainer: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.4,
  },
  liveIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2E7D32",
  },
  subtitle: {
    fontSize: 14,
    color: "#666666",
    marginTop: 2,
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
    backgroundColor: "#F0F0F2",
    marginVertical: 14,
  },
  label: {
    fontSize: 14,
    color: "#666666",
    fontWeight: "500",
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111111",
  },
  valueSub: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111111",
    marginLeft: 22,
  },
  statusPill: {
    backgroundColor: "#F4F5F7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statusPillText: {
    color: "#111111",
    fontWeight: "600",
    fontSize: 12,
  },
  buttonContainer: {
    marginTop: 20,
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    backgroundColor: "#111111",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  warningButton: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  warningButtonText: {
    color: "#111111",
    fontSize: 16,
    fontWeight: "600",
  },
  rescueButton: {
    flexDirection: "row",
    backgroundColor: "#D32F2F",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  rescueButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  rescueActiveContainer: {
    backgroundColor: "#FDEDEC",
    borderWidth: 1,
    borderColor: "#F5B7B1",
    padding: 16,
    borderRadius: 14,
    gap: 10,
  },
  rescueActiveHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  rescueActiveTitle: {
    color: "#C0392B",
    fontSize: 16,
    fontWeight: "700",
  },
  rescueActiveText: {
    color: "#922B21",
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
    backgroundColor: "#27AE60",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  completeRescueButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelRescueButton: {
    flex: 1,
    backgroundColor: "#C0392B",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelRescueButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  dangerButton: {
    flexDirection: "row",
    backgroundColor: "#FF3B30",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  dangerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    marginTop: 4,
  },
  historyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111111",
  },
  historyButtonAlt: {
    backgroundColor: "#111111",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  historyButtonTextAlt: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
});