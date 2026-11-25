
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useTrekkingBootstrapSync } from "../hooks/useTrekkingBootstrapSync";

// ---------------------------------------------------------
// HITO — SINCRONIZACIÓN MANUAL DE EXCURSIONES
// ---------------------------------------------------------

const C = {
  surface: "#17181B",
  ink: "#FFFFFF",
  secondary: "#9BA1A6",
  lime: "#C6FF4D",
  limeDim: "rgba(198,255,77,0.14)",
  border: "rgba(255,255,255,0.08)",
  danger: "#FF7272",
};

export default function TrekkingSyncCard() {
  const {
    syncing,
    error,
    result,
    synchronize,
  } = useTrekkingBootstrapSync();

  // -------------------------------------------------------
  // SOLICITUD DE CONFIRMACIÓN
  // -------------------------------------------------------

  const handleSync = () => {
    if (syncing) {
      return;
    }

    Alert.alert(
      "Sincronizar excursiones",
      "Se enviarán a Django los inicios de excursiones pendientes y sus acompañantes.\n\nLos checkpoints, recorridos GPS, incidentes, rescates y cierres QR todavía no se enviarán.\n\n¿Deseas continuar?",
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
            name="cloud-upload-outline"
            size={23}
            color={C.lime}
          />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.title}>
            Sincronización de excursiones
          </Text>

          <Text style={styles.subtitle}>
            Enviar registros pendientes a Django
          </Text>
        </View>
      </View>

      <Text style={styles.description}>
        Esta primera etapa sincroniza el inicio de
        las excursiones y sus acompañantes.
        El resto del recorrido permanecerá
        almacenado en tu dispositivo.
      </Text>

      <Pressable
        onPress={handleSync}
        disabled={syncing}
        accessibilityRole="button"
        accessibilityLabel="Sincronizar excursiones con Django"
        style={({ pressed }) => [
          styles.button,
          (pressed || syncing) && styles.pressed,
        ]}
      >
        {syncing ? (
          <ActivityIndicator
            color="#0B0C0D"
            size="small"
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
            ? "Sincronizando..."
            : "Sincronizar excursiones"}
        </Text>
      </Pressable>

      {result && (
        <View style={styles.resultContainer}>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>
              Excursiones revisadas
            </Text>

            <Text style={styles.resultValue}>
              {result.total}
            </Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>
              Inicios confirmados por Django
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

          {result.total === 0 && (
            <Text style={styles.informationText}>
              No se encontraron inicios de excursión
              pendientes. Esto no comprueba que
              checkpoints, GPS o emergencias estén
              sincronizados.
            </Text>
          )}

          {result.items
            .filter((item) => !item.success)
            .map((item) => (
              <Text
                key={item.localId}
                style={styles.errorDetail}
              >
                {item.localId.slice(0, 8)}:{" "}
                {item.error ??
                  "No se pudo sincronizar"}
              </Text>
            ))}
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
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
          Una sincronización parcial no significa
          que el recorrido completo esté disponible
          para los guardaparques.
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
    padding: 15,
    gap: 15,
    borderWidth: 1,
    borderColor: C.border,
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
    fontSize: 14,
    fontWeight: "700",
    color: C.ink,
  },

  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: C.secondary,
  },

  description: {
    fontSize: 12,
    lineHeight: 19,
    color: C.secondary,
  },

  button: {
    backgroundColor: C.lime,
    minHeight: 50,
    borderRadius: 13,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
  },

  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0B0C0D",
  },

  resultContainer: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 13,
    gap: 10,
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
    color: C.ink,
    fontSize: 13,
    fontWeight: "700",
  },

  informationText: {
    color: C.secondary,
    fontSize: 12,
    lineHeight: 18,
  },

  errorDetail: {
    color: C.danger,
    fontSize: 11,
    lineHeight: 17,
  },

  errorContainer: {
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
