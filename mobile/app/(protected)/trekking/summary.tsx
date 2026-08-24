import { useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/features/auth/context/AuthContext";

export default function TrekkingSummaryScreen() {
  const { lastCompletedTrekking, setLastCompletedTrekking } = useAuth();

  useEffect(() => {
    if (!lastCompletedTrekking) {
      router.replace("/");
    }
  }, [lastCompletedTrekking]);

  if (!lastCompletedTrekking) {
    return null;
  }

  const handleFinish = () => {
    setLastCompletedTrekking(null);
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>¡Aventura Finalizada!</Text>
        <Text style={styles.subtitle}>Has completado tu recorrido con éxito.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detalles del Recorrido</Text>

          <View style={styles.row}>
            <Text style={styles.label}>ID del Trekking</Text>
            <Text style={styles.value}>#{lastCompletedTrekking.id}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Sendero</Text>
            <Text style={styles.value}>Sendero #{lastCompletedTrekking.trail}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Estado</Text>
            <Text style={[styles.value, { color: "#2e7d32", fontWeight: "700" }]}>
              {lastCompletedTrekking.status}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Inicio</Text>
            <Text style={styles.value}>
              {new Date(lastCompletedTrekking.started_at).toLocaleString()}
            </Text>
          </View>

          {lastCompletedTrekking.finished_at && (
            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <Text style={styles.label}>Finalización</Text>
              <Text style={styles.value}>
                {new Date(lastCompletedTrekking.finished_at).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Buen trabajo en terreno</Text>
          <Text style={styles.messageText}>
            Tus datos de checkpoints sincronizados han quedado registrados en el sistema.
          </Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleFinish}>
          <Text style={styles.buttonText}>Volver al inicio</Text>
        </TouchableOpacity>
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
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    color: "#333",
  },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    color: "#666",
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
  },
  messageCard: {
    marginTop: 20,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#f2f9f2",
    borderWidth: 1,
    borderColor: "#d4edda",
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#155724",
    marginBottom: 6,
  },
  messageText: {
    fontSize: 14,
    color: "#155724",
    lineHeight: 20,
  },
  button: {
    marginTop: 28,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#222",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});