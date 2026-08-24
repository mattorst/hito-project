import { useEffect, useState } from "react";
import { Alert, Button, StyleSheet, Text, View, ScrollView } from "react-native";
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
  
  // Estado para prevenir doble pulsación al finalizar
  const [isFinishing, setIsFinishing] = useState(false);

  // Obtenemos los checkpoints del sendero activo correctamente
  const { checkpoints } = useCheckpoints(activeTrekking?.trail ?? 0);

  // Efecto para validar el QR escaneado localmente y enviarlo al backend
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

    // Si es válido, procedemos a registrarlo en el backend o en cola offline
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
          // Error de conectividad (sin respuesta HTTP) -> Guardamos en cola offline
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
      // Guardamos la respuesta COMPLETED que devuelve Django
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Trekking en curso</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>ID del recorrido:</Text>
            <Text style={styles.value}>#{activeTrekking.id}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Sendero:</Text>
            <Text style={styles.value}>{activeTrekking.trail}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Estado:</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeTrekking.status}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.column}>
            <Text style={styles.label}>Inicio:</Text>
            <Text style={styles.value}>
              {new Date(activeTrekking.started_at).toLocaleString()}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.column}>
            <Text style={styles.label}>Retorno estimado:</Text>
            <Text style={styles.value}>
              {new Date(activeTrekking.estimated_return_time).toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Escanear checkpoint"
            onPress={() => router.push("/scan")}
          />

          <View style={styles.spacing} />

          <Button
            title={isFinishing ? "Finalizando..." : "Finalizar Trekking"}
            color="#d32f2f"
            onPress={handleFinishTrekking}
            disabled={isFinishing}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    padding: 20,
    paddingTop: 12,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 20,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 18,
    backgroundColor: "#fcfcfc",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 12,
  },
  label: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
  },
  badge: {
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: "#2e7d32",
    fontWeight: "700",
    fontSize: 12,
  },
  buttonContainer: {
    marginTop: 28,
  },
  spacing: {
    height: 12,
  },
});