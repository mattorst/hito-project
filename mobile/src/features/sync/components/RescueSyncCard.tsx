
import { useRef, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/features/auth/context/AuthContext";
import { getUserIdFromToken } from "@/features/auth/utils/tokenIdentity";

import {
  syncPendingRescues,
  type RescueSyncResult,
} from "@/features/sync/services/localRescueSync";

export default function RescueSyncCard() {
  const { accessToken } = useAuth();

  const [loading, setLoading] = useState(false);

  const [result, setResult] =
    useState<RescueSyncResult | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const busyRef = useRef(false);

  const handleSync = async () => {
    if (busyRef.current) {
      return;
    }

    setError(null);
    setResult(null);

    if (!accessToken) {
      setError(
        "Inicia sesión para sincronizar.",
      );
      return;
    }

    const userId = getUserIdFromToken(
      accessToken,
    );

    if (!userId) {
      setError(
        "No se pudo identificar tu cuenta.",
      );
      return;
    }

    busyRef.current = true;
    setLoading(true);

    try {
      const response = await syncPendingRescues(
        userId,
      );

      setResult(response);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Error al sincronizar rescates.",
      );
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Ionicons
          name="shield-checkmark-outline"
          size={21}
          color="#C6FF4D"
        />

        <Text style={styles.title}>
          Sincronización de rescates
        </Text>
      </View>

      <Text style={styles.note}>
        Prueba temporal: envía solicitudes y
        cancelaciones pendientes a Django.
      </Text>

      <Pressable
        onPress={() => void handleSync()}
        disabled={loading}
        style={[
          styles.button,
          loading && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color="#0B0C0D"
          />
        ) : (
          <Ionicons
            name="cloud-upload-outline"
            size={19}
            color="#0B0C0D"
          />
        )}

        <Text style={styles.buttonLabel}>
          {loading
            ? "Sincronizando…"
            : "Sincronizar rescates"}
        </Text>
      </Pressable>

      {result && (
        <View style={styles.results}>
          <Text style={styles.info}>
            Revisados: {result.total}
          </Text>

          <Text style={styles.info}>
            Confirmados: {result.synchronized}
          </Text>

          <Text style={styles.info}>
            Fallidos: {result.failed}
          </Text>

          {result.failures.map((failure) => (
            <Text
              key={failure.localId}
              style={styles.error}
            >
              {failure.message}
            </Text>
          ))}
        </View>
      )}

      {error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}

      <Text style={styles.warning}>
        Sin conexión, un SOS solo queda guardado
        en este teléfono; NO se ha enviado una
        alerta a guardaparques.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#17181B",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 16,
    gap: 13,
  },

  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  note: {
    fontSize: 12,
    lineHeight: 18,
    color: "#A2A5AA",
  },

  button: {
    borderRadius: 12,
    backgroundColor: "#C6FF4D",
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
  },

  buttonLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0B0C0D",
  },

  disabled: {
    opacity: 0.5,
  },

  results: {
    gap: 5,
  },

  info: {
    fontSize: 13,
    color: "#FFFFFF",
  },

  error: {
    fontSize: 12,
    color: "#FF8282",
    lineHeight: 19,
  },

  warning: {
    fontSize: 11,
    lineHeight: 17,
    color: "#E8BE77",
  },
});
