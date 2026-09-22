import { StyleSheet, Text, View } from "react-native";
import { useNetworkStatus } from "@/features/sync/hooks/useNetworkStatus";

export default function NetworkTestScreen() {
  const {
    isConnected,
    isInternetReachable,
    isOnline,
  } = useNetworkStatus();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Diagnóstico de red
      </Text>

      <Text>
        Conectado: {isConnected ? "Sí" : "No"}
      </Text>

      <Text>
        Internet alcanzable:{" "}
        {isInternetReachable === null
          ? "Desconocido"
          : isInternetReachable
            ? "Sí"
            : "No"}
      </Text>

      <Text style={styles.status}>
        Estado online: {isOnline ? "ONLINE" : "OFFLINE"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  status: {
    fontWeight: "bold",
    marginTop: 10,
  },
});