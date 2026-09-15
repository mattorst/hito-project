import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocation } from "@/features/trekking/hooks/useLocation";

export default function LocationTestScreen() {
  const {
    status,
    location,
    error,
    hasPermission,
    isLocationEnabled,
    checkLocation,
    requestPermission,
    getLocation,
  } = useLocation();

  const isChecking = status === "checking";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Prueba de ubicación</Text>

        <Text style={styles.subtitle}>
          M10.5.4 — Obtención de coordenadas GPS
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Estado</Text>

          <Text style={styles.status}>
            {status}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.label}>Permiso foreground</Text>

          <Text style={styles.value}>
            {hasPermission ? "Concedido" : "No concedido"}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.label}>Servicios de ubicación</Text>

          <Text style={styles.value}>
            {isLocationEnabled === null
              ? "No verificado"
              : isLocationEnabled
                ? "Habilitados"
                : "Deshabilitados"}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.label}>Coordenadas</Text>

          {location ? (
            <>
              <Text style={styles.value}>
                Latitud: {location.coords.latitude.toFixed(6)}
              </Text>

              <Text style={styles.value}>
                Longitud: {location.coords.longitude.toFixed(6)}
              </Text>

              <Text style={styles.value}>
                Precisión: {location.coords.accuracy?.toFixed(1) ?? "—"} m
              </Text>

              <Text style={styles.value}>
                Altitud: {location.coords.altitude?.toFixed(1) ?? "—"} m
              </Text>
            </>
          ) : (
            <Text style={styles.value}>
              Sin ubicación obtenida
            </Text>
          )}

          {error && (
            <>
              <View style={styles.divider} />

              <Text style={styles.error}>
                {error}
              </Text>
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={getLocation}
          disabled={isChecking}
          activeOpacity={0.8}
        >
          {isChecking ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              Obtener ubicación actual
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={checkLocation}
          disabled={isChecking}
          activeOpacity={0.8}
        >
          {isChecking ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={styles.secondaryButtonText}>
              Verificar ubicación
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={requestPermission}
          disabled={isChecking}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>
            Solicitar permiso
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#000000",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8E8E93",
    marginBottom: 5,
    textTransform: "uppercase",
  },
  status: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E5EA",
    marginVertical: 14,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    color: "#FF3B30",
    fontWeight: "500",
  },
  button: {
    marginTop: 20,
    backgroundColor: "#34C759",
    borderRadius: 14,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 10,
    borderRadius: 14,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "#E5E5EA",
  },
  secondaryButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
  },
});