
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
    syncPendingTrackingPoints,
    type TrackingSyncResult,
  } from "../services/localTrackingSync";

  // ---------------------------------------------------------
  // HITO — PRUEBAS DE SINCRONIZACIÓN GPS
  //
  // Tarjeta temporal para verificar SQLite -> Django.
  //
  // No borra coordenadas locales.
  // No modifica el seguimiento GPS.
  // ---------------------------------------------------------

  const C = {
    surface: "#17181B",
    border: "rgba(255,255,255,0.08)",
    lime: "#C6FF4D",
    limeDim: "rgba(198,255,77,0.14)",
    white: "#FFFFFF",
    secondary: "#9BA1A6",
    danger: "#FF7272",
  };

  export default function TrackingSyncCard() {
    const { accessToken } = useAuth();

    const [syncing, setSyncing] = useState(false);

    const [result, setResult] =
      useState<TrackingSyncResult | null>(null);

    const [error, setError] =
      useState<string | null>(null);

    const runningRef = useRef(false);

    const synchronize = async () => {
      if (runningRef.current) {
        return;
      }

      if (!accessToken) {
        setError(
          "Debes iniciar sesión para sincronizar el GPS.",
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
      setResult(null);
      setError(null);

      try {
        const response =
          await syncPendingTrackingPoints(ownerUserId);

        setResult(response);

        if (response.failed > 0) {
          setError(
            "Algunas excursiones no pudieron sincronizar sus coordenadas.",
          );
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No fue posible sincronizar el GPS.",
        );
      } finally {
        runningRef.current = false;
        setSyncing(false);
      }
    };

    const confirmSync = () => {
      if (syncing) {
        return;
      }

      Alert.alert(
        "Sincronizar GPS",
        "Se enviarán a Django las coordenadas pendientes de tus excursiones.\n\nLos registros locales se conservarán.",
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

    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="navigate-outline"
              size={23}
              color={C.lime}
            />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.title}>
              Sincronización GPS
            </Text>

            <Text style={styles.subtitle}>
              Enviar coordenadas a Django
            </Text>
          </View>
        </View>

        <Text style={styles.description}>
          Sincroniza las posiciones GPS guardadas
          durante tus excursiones. Se conservan
          sus identificadores, coordenadas y
          fechas originales.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            (pressed || syncing) && styles.pressed,
          ]}
          onPress={confirmSync}
          disabled={syncing}
          accessibilityRole="button"
        >
          {syncing ? (
            <ActivityIndicator
              size="small"
              color="#0B0C0D"
            />
          ) : (
            <Ionicons
              name="cloud-upload-outline"
              size={19}
              color="#0B0C0D"
            />
          )}

          <Text style={styles.buttonText}>
            {syncing
              ? "Sincronizando GPS..."
              : "Sincronizar GPS"}
          </Text>
        </Pressable>

        {result && (
          <View style={styles.results}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>
                Coordenadas pendientes revisadas
              </Text>
              <Text style={styles.resultValue}>
                {result.total}
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>
                Coordenadas confirmadas
              </Text>
              <Text style={styles.resultValue}>
                {result.synchronized}
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>
                Excursiones con errores
              </Text>
              <Text style={styles.resultValue}>
                {result.failed}
              </Text>
            </View>

            {result.total === 0 && (
              <Text style={styles.description}>
                No se encontraron coordenadas GPS
                pendientes de sincronización.
              </Text>
            )}

            {result.failures.map((failure) => (
              <View
                key={failure.trekkingLocalId}
                style={styles.failure}
              >
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

        <Text style={styles.footer}>
          Herramienta temporal de pruebas.
          En la versión final, la sincronización
          será automática al recuperar conexión.
        </Text>
      </View>
    );
  }

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
      justifyContent: "space-between",
      alignItems: "center",
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
      backgroundColor: "rgba(255,114,114,0.07)",
      borderRadius: 10,
      padding: 10,
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

    footer: {
      color: C.secondary,
      fontSize: 11,
      lineHeight: 17,
    },

    pressed: {
      opacity: 0.65,
    },
  });
