import React from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { useTracking } from "../../src/features/trekking/hooks/useTracking";

export default function TrackingTestScreen() {
  const {
    status,
    location,
    error,
    persistenceError,
    startTracking,
    stopTracking,
  } = useTracking(1);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tracking GPS + SQLite Test</Text>

      <Text style={styles.label}>Estado: {status}</Text>

      {error && <Text style={styles.error}>{error}</Text>}
      {persistenceError && (
        <Text style={styles.error}>{persistenceError}</Text>
      )}

      {location && (
        <View style={styles.locationContainer}>
          <Text>Latitud: {location.coords.latitude}</Text>
          <Text>Longitud: {location.coords.longitude}</Text>
          <Text>Precisión: {location.coords.accuracy} m</Text>
          <Text>
            Timestamp: {new Date(location.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        {status === "tracking" ? (
          <Button title="Detener tracking" onPress={stopTracking} color="red" />
        ) : (
          <Button
            title="Iniciar tracking"
            onPress={startTracking}
            disabled={status === "starting"}
          />
        )}
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
  label: {
    fontSize: 16,
  },
  locationContainer: {
    marginVertical: 12,
    gap: 4,
  },
  error: {
    color: "red",
    marginVertical: 4,
  },
  buttonContainer: {
    marginTop: 16,
  },
});