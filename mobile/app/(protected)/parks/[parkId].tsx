import { useLocalSearchParams, router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTrails } from "@/features/parks/hooks/useTrails";
import { useAuth } from "@/features/auth/context/AuthContext";
import { startTrekking } from "@/features/trekking/services/trekkingService";

export default function ParkDetailScreen() {
  const { parkId } = useLocalSearchParams<{
    parkId: string;
  }>();

  const numericParkId = parkId ? parseInt(parkId, 10) : 0;

  const {
    trails,
    isLoading,
    error,
    reload,
  } = useTrails(numericParkId);

  const { activeTrekking, setActiveTrekking } = useAuth();

  const handleStartTrekking = async (trailId: number) => {
    if (activeTrekking) {
      Alert.alert(
        "Trekking activo",
        "Ya tienes un trekking en curso."
      );
      return;
    }

    try {
      const trekking = await startTrekking({
        trail: trailId,
      });

      setActiveTrekking(trekking);

      Alert.alert(
        "Trekking iniciado",
        "Tu recorrido comenzó correctamente."
      );
    } catch (error) {
      console.error(error);

      Alert.alert(
        "Error",
        "No fue posible iniciar el trekking."
      );
    }
  };

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
        Senderos
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
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push(`/(protected)/parks/trails/${item.id}`)}
              >
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
              </TouchableOpacity>

              <View style={styles.buttonContainer}>
                <Button
                  title="Iniciar Trekking"
                  onPress={() => handleStartTrekking(item.id)}
                />
              </View>
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

  buttonContainer: {
    marginTop: 12,
  },

  error: {
    color: "red",
    marginBottom: 16,
  },
});