import {
  ActivityIndicator,
  Button,
  FlatList,
  Pressable,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useParks } from "@/features/parks/hooks/useParks";

export default function ParksScreen() {
  const { logout, activeTrekking } = useAuth();

  const {
    parks,
    isLoading,
    error,
    reload,
  } = useParks();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.message}>
          Cargando parques...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Parques</Text>

        <View style={styles.headerButtons}>
          <Button
            title="Escáner QR"
            onPress={() => router.push("/scan")}
          />
          <Button
            title="Cerrar sesión"
            onPress={logout}
          />
        </View>
      </View>

      {/* Botón condicional de Trekking Activo */}
      {activeTrekking && (
        <View style={styles.activeBanner}>
          <Button
            title="Ver trekking activo"
            color="#2e7d32"
            onPress={() => router.push("/(protected)/trekking")}
          />
        </View>
      )}

      {/* Botón para acceder al historial de trekkings */}
      <Pressable
        style={styles.historyButton}
        onPress={() => router.push("/trekking/history")}
      >
        <Text style={styles.historyButtonText}>
          Mis trekkings
        </Text>
      </Pressable>

      {error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}

      {!error && parks.length === 0 && (
        <View style={styles.center}>
          <Text>No existen parques disponibles.</Text>
        </View>
      )}

      {!error && parks.length > 0 && (
        <FlatList
          data={parks}
          keyExtractor={(item) => item.id.toString()}
          refreshing={isLoading}
          onRefresh={reload}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                console.log("Navegando al parque ID:", item.id);
                router.push(`/(protected)/parks/${item.id}`);
              }}
            >
              <View style={styles.card}>
                <Text style={styles.parkName}>
                  {item.name}
                </Text>

                <Text style={styles.description}>
                  {item.description}
                </Text>
              </View>
            </TouchableOpacity>
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

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
  },

  activeBanner: {
    marginBottom: 8,
  },

  historyButton: {
    marginTop: 4,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#e0e0e0",
  },

  historyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: "#fff",
  },

  parkName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },

  description: {
    color: "#555",
    lineHeight: 20,
  },

  error: {
    color: "red",
    marginBottom: 12,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  message: {
    marginTop: 12,
    fontSize: 16,
  },
});