import React, { useState } from "react";
import {
  Button,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  createTrackingPoint,
  getPendingTrackingPoints,
  getTrackingPointsByTrekking,
} from "../../src/features/trekking/repositories/trackingRepository";
import type { TrackingPoint } from "../../src/features/trekking/types/tracking";

export default function StorageTestScreen() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastPoint, setLastPoint] = useState<TrackingPoint | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const testRepository = async () => {
    setStatus("testing");
    setError(null);

    try {
      const mockLocalId = `test-uuid-${Date.now()}`;
      const mockTrekkingId = 1;

      // 1. Inserción
      const created = await createTrackingPoint({
        localId: mockLocalId,
        trekkingId: mockTrekkingId,
        latitude: -35.4264,
        longitude: -71.6554,
        accuracy: 5.0,
        altitude: 120.5,
        speed: 1.2,
        recordedAt: new Date().toISOString(),
      });

      // 2. Consulta de pendientes
      const pendingPoints = await getPendingTrackingPoints();

      // 3. Consulta por trekking
      const trekkingPoints = await getTrackingPointsByTrekking(mockTrekkingId);

      setLastPoint(created);
      setPendingCount(pendingPoints.length);
      setStatus(`Repository OK — ${trekkingPoints.length} puntos guardados`);
    } catch (err) {
      console.error("Error en prueba de Repository:", err);
      setStatus("error");
      setError("No fue posible probar el repositorio de tracking.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Repository Test
      </Text>

      <Text>Estado: {status}</Text>
      <Text>Pendientes: {pendingCount}</Text>

      {lastPoint && (
        <View style={styles.details}>
          <Text>ID SQLite: {lastPoint.id}</Text>
          <Text>Local ID: {lastPoint.localId}</Text>
          <Text>Lat/Lng: {lastPoint.latitude}, {lastPoint.longitude}</Text>
          <Text>Estado Sync: {lastPoint.syncStatus}</Text>
        </View>
      )}

      {error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}

      <Button
        title="Probar Repository"
        onPress={testRepository}
      />
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
  details: {
    marginVertical: 12,
    gap: 4,
  },
  error: {
    marginVertical: 12,
    color: "red",
  },
});