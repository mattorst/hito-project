import {
  ActivityIndicator,
  Button,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useParks } from "@/features/parks/hooks/useParks";

export default function ParksScreen() {
  const { logout } = useAuth();

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

        <Button
          title="Cerrar sesión"
          onPress={logout}
        />
      </View>

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
            <View style={styles.card}>
              <Text style={styles.parkName}>
                {item.name}
              </Text>

              <Text style={styles.description}>
                {item.description}
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

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
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