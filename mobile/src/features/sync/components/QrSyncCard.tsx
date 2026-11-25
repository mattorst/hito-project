
import { useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/features/auth/context/AuthContext";

import { getUserIdFromToken } from "@/features/auth/utils/tokenIdentity";

import {
  syncPendingQrEvents,
  type QrSyncResult,
} from "../services/localCheckpointSync";

// ---------------------------------------------------------
// HITO — SINCRONIZACIÓN MANUAL DE CHECKPOINTS
// ---------------------------------------------------------

const C = {
  surface: "#17181B",
  white: "#FFFFFF",
  secondary: "#9BA1A6",
  lime: "#C6FF4D",
  limeDim: "rgba(198,255,77,0.14)",
  border: "rgba(255,255,255,0.08)",
  danger: "#FF7272",
};

export default function QrSyncCard() {
  const { accessToken } = useAuth();

  const [syncing, setSyncing] = useState(false);

  const [result, setResult] =
    useState<QrSyncResult | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const runningRef = useRef(false);

  // -------------------------------------------------------
  // SINCRONIZAR
  // -------------------------------------------------------

  const synchronize = async () => {
    if (runningRef.current) {
      return;
    }

    setError(null);
    setResult(null);

    if (!accessToken) {
      setError(
        "Debes iniciar sesión para sincronizar checkpoints.",
      );
      return;
    }

    const ownerUserId =
      getUserIdFromToken(accessToken);

    if (!ownerUserId) {
      setError(
        "No fue posible identificar tu cuenta.",
      );
      return;
    }

    runningRef.current = true;
    setSyncing(true);

    try {
      const syncResult =
        await syncPendingQrEvents(ownerUserId);

      setResult(syncResult);

      if (
        syncResult.failed > 0 ||
        syncResult.skipped > 0
      ) {
        setError(
          "Algunos eventos permanecen pendientes. Puedes consultar el detalle y reintentar después de corregir el problema.",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible sincronizar los checkpoints.",
      );
    } finally {
      runningRef.current = false;
      setSyncing(false);
    }
  };

  const handleSync = () => {
    if (syncing) {
      return;
    }

    Alert.alert(
      "Sincronizar checkpoints",
      "Se enviarán a Django los eventos QR pendientes de tus excursiones.\n\nPrimero debes tener sincronizado el inicio del trekking.\n\n¿Deseas continuar?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Sincronizar",
          onPress: () => {
            void synchronize();
          },
        },
      ],
    );
  };

  // -------------------------------------------------------
  // INTERFAZ
  // -------------------------------------------------------

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons
            name="scan-outline"
            size={23}
            color={C.lime}
          />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.title}>
            Sincronización de checkpoints
          </Text>

          <Text style={styles.subtitle}>
            Enviar los registros QR a Django
          </Text>
        </View>
      </View>

      <Text style={styles.description}>
        Sincroniza el Check-In, los checkpoints
        de ida y regreso, la cima y el Check-Out.
        Los eventos se envían en orden y
        conservan sus UUID originales.
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          (pressed || syncing) && styles.pressed,
        ]}
        onPress={handleSync}
        disabled={syncing}
        accessibilityRole="button"
        accessibilityLabel="Sincronizar checkpoints QR"
      >
        {syncing ? (
          <ActivityIndicator
            size="small"
            color="#0B0C0D"
          />
        ) : (
          <Ionicons
            name="sync-outline"
            size={18}
            color="#0B0C0D"
          />
        )}

        <Text style={styles.buttonText}>
          {syncing
            ? "Sincronizando checkpoints..."
            : "Sincronizar checkpoints"}
        </Text>
      </Pressable>

      {result && (
        <View style={styles.results}>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>
              Eventos pendientes revisados
            </Text>

            <Text style={styles.resultValue}>
              {result.total}
            </Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>
              Confirmados por Django
            </Text>

            <Text style={styles.resultValue}>
              {result.synchronized}
            </Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>
              Fallidos
            </Text>

            <Text style={styles.resultValue}>
              {result.failed}
            </Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>
              No enviados por dependencia
            </Text>

            <Text style={styles.resultValue}>
              {result.skipped}
            </Text>
          </View>

          {result.total === 0 && (
            <Text style={styles.description}>
              No hay eventos QR pendientes
              para las excursiones de esta cuenta.
            </Text>
          )}

          {result.failures.map((failure) => (
            <View
              key={failure.localId}
              style={styles.failure}
            >
              <Text style={styles.failureTitle}>
                {failure.eventType}
              </Text>

              <Text style={styles.failureText}>
                {failure.message}
              </Text>
            </View>
          ))}
        </View>
      )}

      {error && (
        <View style={styles.errorRow}>
          <Ionicons
            name="alert-circle-outline"
            size={17}
            color={C.danger}
          />

          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      )}

      <View style={styles.notice}>
        <Ionicons
          name="information-circle-outline"
          size={17}
          color={C.secondary}
        />

        <Text style={styles.noticeText}>
          Esta operación no envía todavía
          fotografías, coordenadas GPS,
          incidentes ni solicitudes de rescate.
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------
// ESTILOS
// ---------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.border,
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

  subtitle: {
    color: C.secondary,
    fontSize: 12,
  },

  description: {
    color: C.secondary,
    fontSize: 12,
    lineHeight: 19,
  },

  button: {
    backgroundColor: C.lime,
    borderRadius: 13,
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 12,
  },

  buttonText: {
    color: "#0B0C0D",
    fontSize: 14,
    fontWeight: "700",
  },

  results: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 13,
    gap: 11,
  },

  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  resultLabel: {
    flex: 1,
    color: C.secondary,
    fontSize: 12,
  },

  resultValue: {
    color: C.white,
    fontSize: 13,
    fontWeight: "700",
  },

  failure: {
    backgroundColor: "rgba(255,114,114,0.06)",
    borderRadius: 10,
    padding: 10,
    gap: 5,
  },

  failureTitle: {
    color: C.white,
    fontSize: 12,
    fontWeight: "700",
  },

  failureText: {
    color: C.danger,
    fontSize: 12,
    lineHeight: 18,
  },

  errorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },

  errorText: {
    flex: 1,
    color: C.danger,
    fontSize: 12,
    lineHeight: 18,
  },

  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },

  noticeText: {
    flex: 1,
    color: C.secondary,
    fontSize: 11,
    lineHeight: 17,
  },

  pressed: {
    opacity: 0.65,
  },
});
