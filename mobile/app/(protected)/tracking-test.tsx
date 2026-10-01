import React, { useCallback, useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

import { useTracking } from "../../src/features/trekking/hooks/useTracking";
import { useSyncTracking } from "../../src/features/sync/hooks/useSyncTracking";
import { useNetworkStatus } from "../../src/features/sync/hooks/useNetworkStatus";
import {
  getPendingTrackingPointCount,
  getTrackingPointCountByStatus,
} from "../../src/features/trekking/repositories/trackingRepository";

export default function TrackingTestScreen() {
  const {
    status,
    location,
    error,
    persistenceError,
    startTracking,
    stopTracking,
  } = useTracking(33);

  const {
    isSyncing,
    lastResult,
    error: syncError,
  } = useSyncTracking();

  const { isOnline } = useNetworkStatus();

  const [pendingCount, setPendingCount] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);

  const refreshQueueCounts = useCallback(async () => {
    try {
      const [pending, synced] = await Promise.all([
        getPendingTrackingPointCount(),
        getTrackingPointCountByStatus("synced"),
      ]);

      setPendingCount(pending);
      setSyncedCount(synced);
    } catch (err) {
      console.error(
        "Error al consultar estado de la cola SQLite:",
        err,
      );
    }
  }, []);

  useEffect(() => {
    refreshQueueCounts();

    const interval = setInterval(() => {
      refreshQueueCounts();
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [refreshQueueCounts]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Tracking GPS + SQLite Test
      </Text>

      <Text style={styles.label}>
        Estado tracking: {status}
      </Text>

      <Text style={styles.label}>
        Red: {isOnline ? "ONLINE" : "OFFLINE"}
      </Text>

      <Text style={styles.label}>
        Sincronización:{" "}
        {isSyncing ? "SINCRONIZANDO" : "EN ESPERA"}
      </Text>

      <View style={styles.queueContainer}>
        <Text style={styles.sectionTitle}>
          Cola SQLite
        </Text>

        <Text style={styles.queueText}>
          Puntos pendientes: {pendingCount}
        </Text>

        <Text style={styles.queueText}>
          Puntos sincronizados: {syncedCount}
        </Text>
      </View>

      {lastResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.sectionTitle}>
            Última sincronización
          </Text>

          <Text>
            Resultado: {JSON.stringify(lastResult)}
          </Text>
        </View>
      )}

      {Boolean(error) && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}

      {Boolean(persistenceError) && (
        <Text style={styles.error}>
          {persistenceError}
        </Text>
      )}

      {Boolean(syncError) && (
        <Text style={styles.error}>
          Error de sincronización:{" "}
          {String(syncError)}
        </Text>
      )}

      {location && (
        <View style={styles.locationContainer}>
          <Text>
            Latitud: {location.coords.latitude}
          </Text>

          <Text>
            Longitud: {location.coords.longitude}
          </Text>

          <Text>
            Precisión: {location.coords.accuracy} m
          </Text>

          <Text>
            Timestamp:{" "}
            {new Date(
              location.timestamp,
            ).toLocaleTimeString()}
          </Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        {status === "tracking" ? (
          <Button
            title="Detener tracking"
            onPress={stopTracking}
            color="red"
          />
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

  queueContainer: {
    marginTop: 8,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    gap: 4,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },

  queueText: {
    fontSize: 15,
  },

  resultContainer: {
    gap: 4,
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