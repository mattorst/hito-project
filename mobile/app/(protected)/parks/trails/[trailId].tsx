import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useCheckpoints } from "@/features/parks/hooks/useCheckpoints";

export default function TrailDetailScreen() {
  const { trailId } = useLocalSearchParams<{
    trailId: string;
  }>();

  const numericTrailId = trailId ? parseInt(trailId, 10) : 0;

  const {
    checkpoints,
    isLoading,
    error,
    reload,
  } = useCheckpoints(numericTrailId);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Cargando checkpoints...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Checkpoints</Text>

      {error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}

      {!error && checkpoints.length === 0 && (
        <View style={styles.center}>
          <Text>
            Este sendero no posee checkpoints.
          </Text>
        </View>
      )}

      {!error && checkpoints.length > 0 && (
        <FlatList
          data={checkpoints}
          keyExtractor={(item) => item.id.toString()}
          refreshing={isLoading}
          onRefresh={reload}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>
                {item.name}
              </Text>

              <Text style={styles.info}>
                Latitud: {item.latitude}
              </Text>

              <Text style={styles.info}>
                Longitud: {item.longitude}
              </Text>

              <Text style={styles.info}>
                Radio: {item.radius_meters} m
              </Text>

              <Text style={styles.info}>
                QR: {item.qr_identifier}
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
    fontSize: 28,
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

  info: {
    color: "#555",
    marginBottom: 4,
  },

  error: {
    color: "red",
    marginBottom: 16,
  },
});