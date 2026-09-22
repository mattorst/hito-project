import { Button, StyleSheet, Text, View } from "react-native";
import { useNetworkStatus } from "@/features/sync/hooks/useNetworkStatus";
import { useSyncTracking } from "@/features/sync/hooks/useSyncTracking";

export default function NetworkTestScreen() {
  const { isConnected, isInternetReachable, isOnline } = useNetworkStatus();
  const { isSyncing, lastResult, error, syncNow } = useSyncTracking();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Diagnóstico de red y Sync</Text>

      <Text>Conectado: {isConnected ? "Sí" : "No"}</Text>
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

      <View style={styles.divider} />

      <Text style={styles.subtitle}>Estado de Sincronización</Text>
      <Text>Procesando: {isSyncing ? "Sincronizando..." : "Inactivo"}</Text>

      {lastResult && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>Último resultado:</Text>
          <Text>Solicitados: {lastResult.requested}</Text>
          <Text>Sincronizados: {lastResult.synchronized}</Text>

          <Text>Fallidos: {lastResult.failed}</Text>
        </View>
      )}

      {error ? (
        <Text style={styles.errorText}>
          Error: {error instanceof Error ? error.message : String(error)}
        </Text>
      ) : null}

      <View style={styles.buttonContainer}>
        <Button
          title={isSyncing ? "Sincronizando..." : "Sincronizar Manualmente"}
          onPress={syncNow}
          disabled={!isOnline || isSyncing}
        />
      </View>
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
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 8,
  },
  status: {
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    backgroundColor: "#ccc",
    marginVertical: 8,
  },
  resultBox: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  resultTitle: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  errorText: {
    color: "red",
  },
  buttonContainer: {
    marginTop: 12,
  },
});