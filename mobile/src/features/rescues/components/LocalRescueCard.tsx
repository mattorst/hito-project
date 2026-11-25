
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useLocalRescue } from "../hooks/useLocalRescue";

import { getDatabase } from "@/features/trekking/storage/database";

// =========================================================
// HITO — ASISTENCIA DE EMERGENCIA OFFLINE
//
// - Conserva el flujo original de rescate.
// - Consulta el estado real desde SQLite.
// - Distingue pending y synced.
// - Refresca el estado mientras está pendiente.
// - No permite cancelación local después de sincronizar.
// - No modifica la base de datos.
// =========================================================

const C = {
  bg: "#0B0C0D",
  surface: "#17181B",
  white: "#FFFFFF",
  secondary: "#9BA1A6",
  lime: "#C6FF4D",
  limeDim: "rgba(198,255,77,0.14)",
  limeBorder: "rgba(198,255,77,0.35)",
  divider: "rgba(255,255,255,0.08)",
  danger: "#FF7272",
  amber: "#FFD27A",
  amberDim: "rgba(255,210,122,0.10)",
};

type SyncStatus = "pending" | "synced";

type ObservedSyncState = {
  localId: string;
  status: SyncStatus;
};

const STATUS_REFRESH_MS = 4000;

// ---------------------------------------------------------
// CONSULTAR ESTADO REAL DEL RESCATE
// ---------------------------------------------------------

async function readRescueSyncStatus(
  rescueLocalId: string,
): Promise<SyncStatus | null> {
  const db = await getDatabase();

  const result = await db.getFirstAsync<{
    sync_status: string;
  }>(
    `
    SELECT sync_status
    FROM local_rescues
    WHERE local_id = ?
    LIMIT 1;
    `,
    [rescueLocalId],
  );

  if (result?.sync_status === "synced") {
    return "synced";
  }

  if (result?.sync_status === "pending") {
    return "pending";
  }

  return null;
}

// =========================================================
// COMPONENTE PRINCIPAL
// =========================================================

export default function LocalRescueCard() {
  const {
    activeLocalRescue,
    loading,
    error,
    loadLocalRescue,
    requestLocalRescue,
    cancelLocalRescue,
  } = useLocalRescue();

  const [checking, setChecking] =
    useState(true);

  const [observedSync, setObservedSync] =
    useState<ObservedSyncState | null>(
      null,
    );

  const [processingCancel, setProcessingCancel] =
    useState(false);

  const rescueId =
    activeLocalRescue?.local_id ?? null;

  // -------------------------------------------------------
  // RECUPERAR RESCATE EXISTENTE
  // -------------------------------------------------------

  useEffect(() => {
    let mounted = true;

    const restore = async () => {
      setChecking(true);

      try {
        await loadLocalRescue();
      } catch (restoreError) {
        console.error(
          "[Hito] Error recuperando rescate:",
          restoreError,
        );
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    };

    void restore();

    return () => {
      mounted = false;
    };
  }, [loadLocalRescue]);

  // -------------------------------------------------------
  // ESTADO REAL DE SINCRONIZACIÓN
  //
  // El servicio de sincronización actualiza
  // local_rescues.sync_status a "synced".
  //
  // Esta consulta solo lee SQLite.
  // No intenta enviar nuevamente el rescate.
  // -------------------------------------------------------

  const refreshSyncStatus = useCallback(
    async (localId: string) => {
      try {
        const status =
          await readRescueSyncStatus(localId);

        if (!status) {
          return;
        }

        setObservedSync({
          localId,
          status,
        });
      } catch (syncError) {
        console.warn(
          "[Hito] No se pudo consultar el estado local del rescate:",
          syncError,
        );
      }
    },
    [],
  );

  useEffect(() => {
    if (!rescueId) {
      return;
    }

    let active = true;
    let inFlight = false;

    const checkStatus = async () => {
      if (!active || inFlight) {
        return;
      }

      inFlight = true;

      try {
        const status =
          await readRescueSyncStatus(rescueId);

        if (!active || !status) {
          return;
        }

        setObservedSync({
          localId: rescueId,
          status,
        });
      } catch (syncError) {
        console.warn(
          "[Hito] Error consultando sincronización:",
          syncError,
        );
      } finally {
        inFlight = false;
      }
    };

    void checkStatus();

    const interval = setInterval(() => {
      void checkStatus();
    }, STATUS_REFRESH_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [rescueId]);

  // -------------------------------------------------------
  // ESTADO ACTUAL
  //
  // La lectura directa de SQLite tiene
  // prioridad sobre el estado del hook.
  // -------------------------------------------------------

  const syncStatus: SyncStatus =
    observedSync?.localId === rescueId
      ? observedSync.status
      : activeLocalRescue?.sync_status ===
          "synced"
        ? "synced"
        : "pending";

  const isSynced =
    syncStatus === "synced";

  // -------------------------------------------------------
  // SOLICITAR RESCATE
  // -------------------------------------------------------

  const handleRequest = () => {
    if (
      loading ||
      checking ||
      activeLocalRescue
    ) {
      return;
    }

    Alert.alert(
      "Solicitar rescate",
      "¿Confirmas que necesitas asistencia de emergencia?\n\nHito guardará tu solicitud en el dispositivo e intentará enviarla cuando exista conexión.\n\nSi estás en peligro, no dependas únicamente de esta aplicación. Busca también otro medio para solicitar ayuda.",
      [
        {
          text: "Volver",
          style: "cancel",
        },
        {
          text: "Confirmar solicitud",
          style: "destructive",
          onPress: () => {
            void (async () => {
              const rescue =
                await requestLocalRescue();

              if (!rescue) {
                return;
              }

              await refreshSyncStatus(
                rescue.local_id,
              );

              Alert.alert(
                "Solicitud guardada",
                "Tu solicitud de rescate se guardó correctamente en este dispositivo.\n\nHito intentará enviarla automáticamente cuando haya conexión disponible. Podrás consultar aquí si el servidor confirmó su recepción.",
                [
                  {
                    text: "Entendido",
                  },
                ],
              );
            })();
          },
        },
      ],
      {
        cancelable: true,
      },
    );
  };

  // -------------------------------------------------------
  // CANCELAR RESCATE LOCAL
  //
  // Solo se permite mientras siga pendiente.
  // Si está sincronizado, el backend ya conoce
  // la solicitud y no debemos cancelarla
  // únicamente en SQLite.
  // -------------------------------------------------------

  const handleCancel = () => {
    if (
      !activeLocalRescue ||
      loading ||
      processingCancel
    ) {
      return;
    }

    if (isSynced) {
      Alert.alert(
        "Solicitud ya enviada",
        "Esta solicitud ya fue recibida por el servidor. No puede cancelarse únicamente desde el dispositivo.",
      );

      return;
    }

    Alert.alert(
      "Cancelar solicitud",
      "¿Confirmas que deseas cancelar la solicitud de rescate?\n\nSi todavía no se ha enviado, Hito guardará la cancelación para sincronizarla posteriormente.",
      [
        {
          text: "Mantener solicitud",
          style: "cancel",
        },
        {
          text: "Cancelar solicitud",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setProcessingCancel(true);

              try {
                const currentStatus =
                  await readRescueSyncStatus(
                    activeLocalRescue.local_id,
                  );

                if (currentStatus !== "pending") {
                  await refreshSyncStatus(
                    activeLocalRescue.local_id,
                  );

                  Alert.alert(
                    "Solicitud ya enviada",
                    "El rescate ya fue sincronizado o su estado cambió. No se realizará una cancelación exclusivamente local.",
                  );

                  return;
                }

                const cancelled =
                  await cancelLocalRescue();

                if (!cancelled) {
                  return;
                }

                Alert.alert(
                  "Solicitud cancelada",
                  "La cancelación se guardó correctamente. El registro se conservará en el historial.",
                );
              } catch (cancelError) {
                console.error(
                  "[Hito] Error cancelando rescate:",
                  cancelError,
                );

                Alert.alert(
                  "No se pudo cancelar",
                  "No fue posible confirmar la cancelación. La solicitud permanece registrada.",
                );
              } finally {
                setProcessingCancel(false);
              }
            })();
          },
        },
      ],
    );
  };

  // -------------------------------------------------------
  // CARGANDO
  // -------------------------------------------------------

  if (checking) {
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <ActivityIndicator
            size="small"
            color={C.lime}
          />

          <Text style={styles.description}>
            Consultando solicitudes guardadas...
          </Text>
        </View>
      </View>
    );
  }

  // =======================================================
  // RESCATE ACTIVO
  // =======================================================

  if (activeLocalRescue) {
    const requestedAt = new Date(
      activeLocalRescue.requested_at,
    );

    const formattedDate =
      Number.isNaN(
        requestedAt.getTime(),
      )
        ? activeLocalRescue.requested_at
        : requestedAt.toLocaleString(
            "es-CL",
            {
              dateStyle: "short",
              timeStyle: "short",
            },
          );

    const hasLocation =
      activeLocalRescue.latitude !== null &&
      activeLocalRescue.longitude !== null;

    return (
      <View style={styles.card}>
        {/* CABECERA */}

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={23}
              color={C.lime}
            />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.title}>
              Solicitud de rescate
            </Text>

            <Text style={styles.description}>
              Emergencia registrada en Hito
            </Text>
          </View>
        </View>

        {/* ESTADO REAL */}

        <View
          style={[
            styles.statusBox,
            !isSynced &&
              styles.statusBoxPending,
          ]}
        >
          <Ionicons
            name={
              isSynced
                ? "checkmark-circle-outline"
                : "cloud-upload-outline"
            }
            size={21}
            color={
              isSynced
                ? C.lime
                : C.amber
            }
          />

          <View style={styles.statusText}>
            <Text
              style={[
                styles.statusTitle,
                !isSynced &&
                  styles.statusTitlePending,
              ]}
            >
              {isSynced
                ? "Solicitud enviada"
                : "Pendiente de envío"}
            </Text>

            <Text
              style={styles.statusDescription}
            >
              {isSynced
                ? "Tu solicitud fue recibida por el servidor. Permanece activa hasta que se gestione su atención."
                : "Tu solicitud está guardada en este dispositivo. Hito intentará enviarla automáticamente cuando haya conexión disponible."}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* FECHA */}

        <View style={styles.detailRow}>
          <Ionicons
            name="time-outline"
            size={17}
            color={C.secondary}
          />

          <Text style={styles.detailText}>
            Registrada: {formattedDate}
          </Text>
        </View>

        {/* GPS */}

        <View style={styles.detailRow}>
          <Ionicons
            name="location-outline"
            size={17}
            color={C.secondary}
          />

          <Text style={styles.detailText}>
            {hasLocation
              ? `${activeLocalRescue.latitude?.toFixed(6)}, ${activeLocalRescue.longitude?.toFixed(6)}`
              : "Ubicación GPS no disponible"}
          </Text>
        </View>

        {/* ADVERTENCIA */}

        <View style={styles.warningRow}>
          <Ionicons
            name="information-circle-outline"
            size={17}
            color={C.danger}
          />

         <Text style={styles.warningText}>
        Si estás en una situación de emergencia,
        intenta comunicarte también por otros
        medios. La recepción de tu solicitud no
        significa que la asistencia ya esté en
        camino.
        </Text>

        </View>

        {/* ERRORES */}

        {error ? (
          <Text style={styles.errorText}>
            {error}
          </Text>
        ) : null}

        {/* CANCELACIÓN LOCAL SOLO PENDIENTE */}

        {!isSynced && (
          <Pressable
            onPress={handleCancel}
            disabled={
              loading ||
              processingCancel
            }
            accessibilityRole="button"
            accessibilityLabel="Cancelar solicitud pendiente"
            style={({ pressed }) => [
              styles.cancelButton,
              (pressed ||
                loading ||
                processingCancel) &&
                styles.pressed,
            ]}
          >
            {loading || processingCancel ? (
              <ActivityIndicator
                size="small"
                color={C.white}
              />
            ) : (
              <Ionicons
                name="close-circle-outline"
                size={18}
                color={C.white}
              />
            )}

            <Text
              style={styles.cancelButtonText}
            >
              {loading || processingCancel
                ? "Procesando..."
                : "Cancelar solicitud"}
            </Text>
          </Pressable>
        )}

        {/* CONFIRMACIÓN SINCRONIZADA */}

        {isSynced && (
          <View style={styles.confirmedRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={C.lime}
            />

            <Text
              style={styles.confirmedText}
            >
              Recepción confirmada por el sistema
            </Text>
          </View>
        )}
      </View>
    );
  }

  // =======================================================
  // SIN RESCATE ACTIVO
  // =======================================================

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={23}
            color={C.lime}
          />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.title}>
            Asistencia de emergencia
          </Text>

          <Text style={styles.description}>
            Registra una solicitud de rescate
            durante tu recorrido.
          </Text>
        </View>
      </View>

      <Text style={styles.notice}>
        Si no tienes cobertura, la solicitud
        quedará guardada en tu teléfono
        hasta que pueda sincronizarse.
      </Text>

      {error ? (
        <Text style={styles.errorText}>
          {error}
        </Text>
      ) : null}

      <Pressable
        onPress={handleRequest}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Registrar solicitud de rescate"
        style={({ pressed }) => [
          styles.actionButton,
          (pressed || loading) &&
            styles.pressed,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={C.lime}
            size="small"
          />
        ) : (
          <Ionicons
            name="alert-circle-outline"
            size={19}
            color={C.lime}
          />
        )}

        <Text style={styles.actionText}>
          {loading
            ? "Guardando solicitud..."
            : "Registrar solicitud de rescate"}
        </Text>

        {!loading && (
          <Ionicons
            name="arrow-forward"
            size={18}
            color={C.lime}
          />
        )}
      </Pressable>
    </View>
  );
}

// =========================================================
// ESTILOS
// =========================================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.limeBorder,
    padding: 15,
    gap: 15,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: C.limeDim,
    alignItems: "center",
    justifyContent: "center",
  },

  headerText: {
    flex: 1,
    gap: 4,
  },

  title: {
    color: C.white,
    fontSize: 14,
    fontWeight: "700",
  },

  description: {
    color: C.secondary,
    fontSize: 12,
    lineHeight: 18,
  },

  notice: {
    color: C.secondary,
    fontSize: 12,
    lineHeight: 19,
  },

  statusBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: C.limeDim,
    borderRadius: 12,
    padding: 13,
    gap: 10,
  },

  statusBoxPending: {
    backgroundColor: C.amberDim,
  },

  statusText: {
    flex: 1,
    gap: 5,
  },

  statusTitle: {
    color: C.lime,
    fontSize: 13,
    fontWeight: "700",
  },

  statusTitlePending: {
    color: C.amber,
  },

  statusDescription: {
    color: C.white,
    fontSize: 12,
    lineHeight: 18,
  },

  divider: {
    height: 1,
    backgroundColor: C.divider,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  detailText: {
    color: C.secondary,
    fontSize: 12,
    flex: 1,
  },

  warningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  warningText: {
    flex: 1,
    color: C.secondary,
    fontSize: 12,
    lineHeight: 18,
  },

  errorText: {
    color: C.danger,
    fontSize: 12,
    lineHeight: 18,
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.limeDim,
    borderRadius: 12,
    minHeight: 50,
    paddingHorizontal: 14,
    gap: 10,
  },

  actionText: {
    flex: 1,
    color: C.lime,
    fontSize: 13,
    fontWeight: "700",
  },

  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor:
      "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: C.divider,
  },

  cancelButtonText: {
    color: C.white,
    fontSize: 13,
    fontWeight: "600",
  },

  confirmedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 5,
  },

  confirmedText: {
    flex: 1,
    color: C.lime,
    fontSize: 12,
    fontWeight: "600",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  pressed: {
    opacity: 0.65,
  },
});
