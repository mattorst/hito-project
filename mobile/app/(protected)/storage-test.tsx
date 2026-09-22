import React, { useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import {
  getLatestTrackingPoint,
  getPendingTrackingPoints,
} from "../../src/features/trekking/repositories/trackingRepository";
import type { TrackingPoint } from "../../src/features/trekking/types/tracking";

export default function StorageTestScreen() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState<string | null>(null);
  const [latestPoint, setLatestPoint] = useState<TrackingPoint | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const checkStorage = async () => {
    setStatus("checking");
    setError(null);

    try {
      const latest = await getLatestTrackingPoint();
      const pending = await getPendingTrackingPoints(500);

      setLatestPoint(latest);
      setPendingCount(pending.length);
      setStatus(`Lectura OK — ${pending.length} puntos pendientes`);
    } catch (err) {
      console.error("Error al consultar almacenamiento:", err);
      setStatus("error");
      setError("No fue posible consultar la base de datos.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Estado SQLite</Text>

      <Text>Estado: {status}</Text>
      <Text>Total Pendientes: {pendingCount}</Text>

      {latestPoint ? (
        <View style={styles.details}>
          <Text style={styles.subtitle}>Último punto registrado por GPS:</Text>
          <Text>ID SQLite: {latestPoint.id}</Text>
          <Text>Local ID (UUID): {latestPoint.localId}</Text>
          <Text>Trekking ID: {latestPoint.trekkingId}</Text>
          <Text>Lat/Lng: {latestPoint.latitude}, {latestPoint.longitude}</Text>
          <Text>Precisión: {latestPoint.accuracy} m</Text>
          <Text>Registrado en: {latestPoint.recordedAt}</Text>
          <Text>Estado Sync: {latestPoint.syncStatus}</Text>
        </View>
      ) : (
        <Text style={styles.info}>No hay puntos GPS en SQLite aún.</Text>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Button title="Consultar SQLite" onPress={checkStorage} />
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
    fontWeight: "600",
    marginTop: 8,
  },
  details: {
    marginVertical: 12,
    gap: 4,
  },
  info: {
    marginVertical: 12,
    fontStyle: "italic",
  },
  error: {
    color: "red",
  },
});