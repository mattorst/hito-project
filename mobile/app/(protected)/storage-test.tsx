import React, { useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import {
  getLatestTrackingPoint,
  getPendingTrackingPointCount,
  getPendingTrackingPoints,
  getTrackingPointCountByStatus,
  markTrackingPointsAsSynced,
} from "../../src/features/trekking/repositories/trackingRepository";
import type { TrackingPoint } from "../../src/features/trekking/types/tracking";

export default function StorageTestScreen() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState<string | null>(null);
  const [latestPoint, setLatestPoint] = useState<TrackingPoint | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncedCount, setSyncedCount] = useState<number>(0);

  const checkStorage = async () => {
    setStatus("checking");
    setError(null);

    try {
      const latest = await getLatestTrackingPoint();
      const pending = await getPendingTrackingPointCount();
      const synced = await getTrackingPointCountByStatus("synced");

      setLatestPoint(latest);
      setPendingCount(pending);
      setSyncedCount(synced);
      setStatus(`Lectura OK — ${pending} pendientes / ${synced} sincronizados`);
    } catch (err) {
      console.error("Error al consultar almacenamiento:", err);
      setStatus("error");
      setError("No fue posible consultar la base de datos.");
    }
  };

  const testPendingQueue = async () => {
    setStatus("testing_queue");
    setError(null);

    try {
      const pendingBefore = await getPendingTrackingPointCount();
      const points = await getPendingTrackingPoints(5);

      console.log("Pendientes antes:", pendingBefore);
      console.log(
        "Lote obtenido (máx 5):",
        points.map((p) => ({
          localId: p.localId,
          recordedAt: p.recordedAt,
          syncStatus: p.syncStatus,
        })),
      );

      if (points.length > 0) {
        const localIdsToSync = points.map((p) => p.localId);
        await markTrackingPointsAsSynced(localIdsToSync);
        console.log(`Marcados ${localIdsToSync.length} puntos como synced.`);
      }

      await checkStorage();
    } catch (err) {
      console.error("Error probando cola pending:", err);
      setStatus("error");
      setError("Error ejecutando prueba de cola.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Estado y Cola SQLite</Text>

      <Text style={styles.info}>Estado actual: {status}</Text>
      <Text>Pendientes (pending): {pendingCount}</Text>
      <Text>Sincronizados (synced): {syncedCount}</Text>

      {latestPoint ? (
        <View style={styles.details}>
          <Text style={styles.subtitle}>Último punto registrado:</Text>
          <Text>ID SQLite: {latestPoint.id}</Text>
          <Text>Local ID (UUID): {latestPoint.localId}</Text>
          <Text>Trekking ID: {latestPoint.trekkingId}</Text>
          <Text>Lat/Lng: {latestPoint.latitude}, {latestPoint.longitude}</Text>
          <Text>Registrado en: {latestPoint.recordedAt}</Text>
          <Text>Estado Sync: {latestPoint.syncStatus}</Text>
        </View>
      ) : (
        <Text style={styles.empty}>No hay puntos GPS en SQLite aún.</Text>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actions}>
        <Button title="Consultar Estado" onPress={checkStorage} />
        <Button title="Probar Cola Pending (Lote 5)" onPress={testPendingQueue} color="#2e7d32" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    fontWeight: "600",
    marginTop: 8,
  },
  info: {
    fontWeight: "500",
  },
  details: {
    marginVertical: 10,
    gap: 2,
  },
  empty: {
    marginVertical: 10,
    fontStyle: "italic",
  },
  error: {
    color: "red",
  },
  actions: {
    marginTop: 16,
    gap: 10,
  },
});