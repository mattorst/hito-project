import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTrails } from "@/features/parks/hooks/useTrails";

export default function ParkDetailScreen() {
  const { parkId } = useLocalSearchParams<{
    parkId: string;
  }>();

  // Convertimos a número de forma segura
  const numericParkId = parkId ? parseInt(parkId, 10) : 0;

  const {
    trails,
    isLoading,
    error,
    reload,
  } = useTrails(numericParkId);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Cargando senderos...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
        Senderos (Parque #{parkId})
      </Text>

      {error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}

      {!error && trails.length === 0 && (
        <View style={styles.center}>
          <Text>
            Este parque no posee senderos.
          </Text>
        </View>
      )}

      {!error && trails.length > 0 && (
        <FlatList
          data={trails}
          keyExtractor={(item) => item.id.toString()}
          refreshing={isLoading}
          onRefresh={reload}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>
                {item.name}
              </Text>

              <Text style={styles.description}>
                {item.description}
              </Text>

              <Text style={styles.info}>
                Distancia: {item.distance_km} km
              </Text>

              <Text style={styles.info}>
                Duración estimada: {item.estimated_duration}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 48,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 20,
  },

  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
  },

  name: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },

  description: {
    color: "#555",
    marginBottom: 8,
  },

  info: {
    color: "#666",
    fontSize: 14,
  },

  error: {
    color: "red",
    marginBottom: 16,
  },
});