import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/features/auth/context/AuthContext";
import { finishTrekking } from "@/features/trekking/services/trekkingService";
import { useScan } from "@/features/checkpoints/context/ScanContext";
import { findCheckpointByQr } from "@/features/checkpoints/utils";
import { useCheckpoints } from "@/features/parks/hooks/useCheckpoints";
import { registerCheckpoint } from "@/features/checkpoints/services/checkpointService";
import { enqueueCheckpoint } from "@/features/checkpoints/services/offlineQueue";

export default function ActiveTrekkingScreen() {
  const { activeTrekking, setActiveTrekking, setLastCompletedTrekking } = useAuth();
  const { scannedQr, setScannedQr } = useScan();
  
  const [isFinishing, setIsFinishing] = useState(false);

  const { checkpoints } = useCheckpoints(activeTrekking?.trail ?? 0);

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

  if (!activeTrekking) {
    return (
      <SafeAreaView style={styles.center}>
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
    <SafeAreaView style={styles.safeContainer} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Trekking en curso</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>ID del recorrido</Text>
            <Text style={styles.value}>#{activeTrekking.id}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Sendero</Text>
            <Text style={styles.value}>{activeTrekking.trail}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Estado</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeTrekking.status}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.column}>
            <Text style={styles.label}>Inicio</Text>
            <Text style={styles.value}>
              {new Date(activeTrekking.started_at).toLocaleString()}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.column}>
            <Text style={styles.label}>Retorno estimado</Text>
            <Text style={styles.value}>
              {new Date(activeTrekking.estimated_return_time).toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push("/scan")}
          >
            <Text style={styles.primaryButtonText}>Escanear checkpoint</Text>
          </Pressable>

          <Pressable
            style={styles.warningButton}
            onPress={() => router.push("/trekking/incident")}
          >
            <Text style={styles.warningButtonText}>Reportar incidente</Text>
          </Pressable>

          <Pressable
            style={[styles.dangerButton, isFinishing && styles.buttonDisabled]}
            onPress={handleFinishTrekking}
            disabled={isFinishing}
          >
            <Text style={styles.dangerButtonText}>
              {isFinishing ? "Finalizando..." : "Finalizar Trekking"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.historyButton}
            onPress={() => router.push("/trekking/history")}
          >
            <Text style={styles.historyButtonText}>Mis trekkings</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#f2f2f7", // Fondo gris claro típico de iOS system
  },
  scrollContent: {
    padding: 20,
    paddingTop: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f2f2f7",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#8e8e93",
    fontWeight: "500",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 16,
    letterSpacing: -0.4,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  column: {
    gap: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#c6c6c8",
    marginVertical: 12,
  },
  label: {
    fontSize: 15,
    color: "#3c3c43",
    fontWeight: "400",
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000000",
  },
  badge: {
    backgroundColor: "#34c75915", // Fondo verde sutil estilo iOS
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: "#34c759", // Verde estilo iOS
    fontWeight: "600",
    fontSize: 12,
  },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#007aff", // Azul iOS
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  warningButton: {
    backgroundColor: "#ff9500", // Naranja sistema iOS
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  warningButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  dangerButton: {
    backgroundColor: "#ff3b30", // Rojo sistema iOS
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  dangerButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  historyButton: {
    backgroundColor: "#e5e5ea", // Gris secundario iOS
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
  },
  historyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007aff",
  },
  historyButtonAlt: {
    backgroundColor: "#007aff",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
  },
  historyButtonTextAlt: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
});