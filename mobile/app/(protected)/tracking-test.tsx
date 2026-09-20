import React from "react";
import {
  Button,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTracking } from "../../src/features/trekking/hooks/useTracking";

export default function TrackingTestScreen() {
  const {
    status,
    location,
    error,
    startTracking,
    stopTracking,
  } = useTracking();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Tracking test
      </Text>

      <Text>
        Estado: {status}
      </Text>

      {location && (
        <View style={styles.location}>
          <Text>
            Latitud: {location.coords.latitude}
          </Text>

          <Text>
            Longitud: {location.coords.longitude}
          </Text>

          <Text>
            Precisión: {location.coords.accuracy ?? "N/D"} m
          </Text>

          <Text>
            Altitud: {location.coords.altitude ?? "N/D"} m
          </Text>

          <Text>
            Velocidad: {location.coords.speed ?? "N/D"} m/s
          </Text>

          <Text>
            Timestamp:{" "}
            {new Date(location.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      )}

      {error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}

      <View style={styles.button}>
        <Button
          title="Iniciar tracking"
          onPress={startTracking}
          disabled={status === "starting" || status === "tracking"}
        />
      </View>

      <View style={styles.button}>
        <Button
          title="Detener tracking"
          onPress={stopTracking}
          disabled={status !== "tracking"}
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
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  location: {
    gap: 4,
    marginVertical: 16,
  },
  error: {
    marginVertical: 12,
  },
  button: {
    marginVertical: 4,
  },
});