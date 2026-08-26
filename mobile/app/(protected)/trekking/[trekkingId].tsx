import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { getTrekkingById } from "@/features/trekking/services/trekkingService";
import type { Trekking } from "@/features/trekking/types";

export default function TrekkingDetailScreen() {
  const { trekkingId } = useLocalSearchParams<{ trekkingId: string }>();

  const [trekking, setTrekking] = useState<Trekking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrekkingDetail() {
      if (!trekkingId) return;

      try {
        setIsLoading(true);
        setError(null);
        const data = await getTrekkingById(Number(trekkingId));
        setTrekking(data);
      } catch (err) {
        console.error("Error al cargar detalle del trekking:", err);
        setError("No fue posible cargar el detalle del trekking.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrekkingDetail();
  }, [trekkingId]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={styles.message}>Cargando detalle del recorrido...</Text>
      </SafeAreaView>
    );
  }

  if (error || !trekking) {
    return (
      <SafeAreaView style={styles.center}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>¡Ups!</Text>
          <Text style={styles.error}>{error || "Trekking no encontrado."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCompleted = trekking.status?.toUpperCase() === "COMPLETED";

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Encabezado Principal */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Resumen de Expedición</Text>
          <Text style={styles.subtitle}>Detalle completo del recorrido registrado</Text>
        </View>

        {/* Tarjeta Principal de Información */}
        <View style={styles.card}>
          
          {/* Fila de ID y Estado */}
          <View style={styles.topRow}>
            <View>
              <Text style={styles.cardSublabel}>ID DE RECORRIDO</Text>
              <Text style={styles.cardIdText}>#{trekking.id}</Text>
            </View>
            <View style={[styles.badge, isCompleted ? styles.badgeCompleted : styles.badgeProgress]}>
              <Text style={[styles.badgeText, isCompleted ? styles.badgeTextCompleted : styles.badgeTextProgress]}>
                {trekking.status}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Sendero */}
          <View style={styles.infoGroup}>
            <Text style={styles.label}>Sendero asignado</Text>
            <Text style={styles.valueHighlight}>Sendero #{trekking.trail}</Text>
          </View>

          <View style={styles.divider} />

          {/* Horarios */}
          <View style={styles.infoGroup}>
            <Text style={styles.label}>Hora de inicio</Text>
            <Text style={styles.value}>
              {new Date(trekking.started_at).toLocaleString()}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoGroup}>
            <Text style={styles.label}>Retorno estimado</Text>
            <Text style={styles.value}>
              {new Date(trekking.estimated_return_time).toLocaleString()}
            </Text>
          </View>

          {trekking.finished_at && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoGroup}>
                <Text style={styles.label}>Finalizado el</Text>
                <Text style={styles.value}>
                  {new Date(trekking.finished_at).toLocaleString()}
                </Text>
              </View>
            </>
          )}

          <View style={styles.divider} />

          {/* Sincronización / Tracking */}
          <View style={styles.infoGroup}>
            <Text style={styles.label}>Estado de rastreo GPS</Text>
            <Text style={styles.value}>
              {trekking.tracking_enabled ? "🟢 Habilitado" : "⚪ Inactivo"}
            </Text>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  headerContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1a1a1a",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#6c757d",
    marginTop: 2,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardSublabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#adb5bd",
    letterSpacing: 0.5,
  },
  cardIdText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#212529",
    marginTop: 2,
  },
  infoGroup: {
    gap: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f3f5",
    marginVertical: 14,
  },
  label: {
    fontSize: 13,
    color: "#6c757d",
    fontWeight: "600",
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: "#343a40",
  },
  valueHighlight: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2e7d32",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeCompleted: {
    backgroundColor: "#e8f5e9",
  },
  badgeProgress: {
    backgroundColor: "#fff3e0",
  },
  badgeText: {
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
  },
  badgeTextCompleted: {
    color: "#2e7d32",
  },
  badgeTextProgress: {
    color: "#ef6c00",
  },
  message: {
    marginTop: 12,
    fontSize: 15,
    color: "#6c757d",
    fontWeight: "500",
  },
  errorContainer: {
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#343a40",
    marginBottom: 8,
  },
  error: {
    color: "#e03131",
    fontSize: 14,
    textAlign: "center",
  },
});