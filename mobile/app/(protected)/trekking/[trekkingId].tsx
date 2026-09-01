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
import { Ionicons } from "@expo/vector-icons";
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
      <SafeAreaView style={styles.center} edges={["top", "left", "right", "bottom"]}>
        <ActivityIndicator size="large" color="#111111" />
        <Text style={styles.message}>Cargando detalle del recorrido...</Text>
      </SafeAreaView>
    );
  }

  if (error || !trekking) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#E53935" style={{ marginBottom: 12 }} />
          <Text style={styles.errorTitle}>¡Ups!</Text>
          <Text style={styles.error}>{error || "Trekking no encontrado."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCompleted = trekking.status?.toUpperCase() === "COMPLETED";

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top", "left", "right"]}>
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
            <View style={styles.rowWithIcon}>
              <Ionicons name="map-outline" size={16} color="#2E7D32" style={{ marginRight: 6 }} />
              <Text style={styles.valueHighlight}>Sendero #{trekking.trail}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Horarios */}
          <View style={styles.infoGroup}>
            <Text style={styles.label}>Hora de inicio</Text>
            <View style={styles.rowWithIcon}>
              <Ionicons name="calendar-outline" size={16} color="#666666" style={{ marginRight: 6 }} />
              <Text style={styles.value}>
                {new Date(trekking.started_at).toLocaleString("es-CL")}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoGroup}>
            <Text style={styles.label}>Retorno estimado</Text>
            <View style={styles.rowWithIcon}>
              <Ionicons name="time-outline" size={16} color="#666666" style={{ marginRight: 6 }} />
              <Text style={styles.value}>
                {new Date(trekking.estimated_return_time).toLocaleString("es-CL")}
              </Text>
            </View>
          </View>

          {trekking.finished_at && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoGroup}>
                <Text style={styles.label}>Finalizado el</Text>
                <View style={styles.rowWithIcon}>
                  <Ionicons name="checkmark-done-outline" size={16} color="#2E7D32" style={{ marginRight: 6 }} />
                  <Text style={styles.value}>
                    {new Date(trekking.finished_at).toLocaleString("es-CL")}
                  </Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.divider} />

          {/* Sincronización / Tracking */}
          <View style={styles.infoGroup}>
            <Text style={styles.label}>Estado de rastreo GPS</Text>
            <View style={styles.rowWithIcon}>
              <Ionicons 
                name={trekking.tracking_enabled ? "radio-button-on" : "radio-button-off"} 
                size={16} 
                color={trekking.tracking_enabled ? "#2E7D32" : "#888888"} 
                style={{ marginRight: 6 }} 
              />
              <Text style={styles.value}>
                {trekking.tracking_enabled ? "Habilitado" : "Inactivo"}
              </Text>
            </View>
          </View>

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
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F5F7",
    padding: 24,
  },
  headerContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#666666",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
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
    color: "#999999",
    letterSpacing: 0.5,
  },
  cardIdText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111111",
    marginTop: 2,
  },
  infoGroup: {
    gap: 4,
  },
  rowWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 14,
  },
  label: {
    fontSize: 13,
    color: "#666666",
    fontWeight: "500",
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111111",
  },
  valueHighlight: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2E7D32",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeCompleted: {
    backgroundColor: "#E8F5E9",
  },
  badgeProgress: {
    backgroundColor: "#FFF3E0",
  },
  badgeText: {
    fontWeight: "600",
    fontSize: 12,
    textTransform: "uppercase",
  },
  badgeTextCompleted: {
    color: "#2E7D32",
  },
  badgeTextProgress: {
    color: "#EF6C00",
  },
  message: {
    marginTop: 12,
    fontSize: 15,
    color: "#666666",
    fontWeight: "500",
  },
  errorContainer: {
    alignItems: "center",
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 8,
  },
  error: {
    color: "#E53935",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
});