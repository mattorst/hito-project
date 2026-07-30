import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/features/auth/context/AuthContext";

export default function ActiveTrekkingScreen() {
  const { activeTrekking } = useAuth();

  if (!activeTrekking) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>No existe un trekking activo.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
        Trekking en curso
      </Text>

      <View style={styles.card}>
        <Text style={styles.item}>ID: {activeTrekking.id}</Text>
        <Text style={styles.item}>Sendero: {activeTrekking.trail}</Text>
        <Text style={styles.item}>Estado: {activeTrekking.status}</Text>
        <Text style={styles.item}>
          Inicio:{" "}
          {new Date(activeTrekking.started_at).toLocaleString()}
        </Text>
        <Text style={styles.item}>
          Retorno estimado:{" "}
          {new Date(
            activeTrekking.estimated_return_time,
          ).toLocaleString()}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    backgroundColor: "#f9f9f9",
    gap: 8,
  },
  item: {
    fontSize: 16,
    color: "#333",
  },
});