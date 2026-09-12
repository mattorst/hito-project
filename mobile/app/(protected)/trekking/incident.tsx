import { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useIncidents } from "@/features/incidents/hooks/useIncidents";
import type { IncidentType } from "@/features/incidents/types";

// --- Paleta -----------------------------------------------------------------
// Consistente con Parques y Trekking activo: negro como lienzo, blanco/gris
// para jerarquía de texto, un único verde lima como acento y estado
// "seleccionado". Sin rojo: lo negativo se resuelve con outline neutro.
const COLORS = {
  bg: "#0B0C0D",
  surface: "#17181B",
  surfaceBorder: "rgba(255,255,255,0.08)",
  glass: "rgba(255,255,255,0.06)",
  glassBorder: "rgba(255,255,255,0.10)",
  ink: "#FFFFFF",
  inkSecondary: "#9BA1A6",
  inkTertiary: "#6E7378",
  lime: "#C6FF4D",
  limeDim: "rgba(198,255,77,0.14)",
  limeBorder: "rgba(198,255,77,0.35)",
  black: "#0B0C0D",
};

const incidentTypes: {
  value: IncidentType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "PERSON_INJURED", label: "Persona lesionada", icon: "medkit-outline" },
  { value: "DANGEROUS_ANIMAL", label: "Animal peligroso", icon: "paw-outline" },
  { value: "LANDSLIDE", label: "Derrumbe", icon: "trending-down-outline" },
  { value: "FALLEN_TREE", label: "Árbol caído", icon: "leaf-outline" },
  { value: "BLOCKED_TRAIL", label: "Sendero bloqueado", icon: "ban-outline" },
  { value: "LOST_PERSON", label: "Persona extraviada", icon: "search-outline" },
  { value: "WEATHER", label: "Condiciones climáticas", icon: "cloud-outline" },
  { value: "OTHER", label: "Otro", icon: "alert-circle-outline" },
];

function BackButton() {
  return (
    <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
      <Ionicons name="chevron-back" size={20} color={COLORS.ink} />
    </Pressable>
  );
}

export default function IncidentScreen() {
  const { activeTrekking } = useAuth();

  const {
    form,
    loading,
    locationLoading,
    error,
    setField,
    getCurrentLocation,
    takePhoto,
    pickPhoto,
    removePhoto,
    submitIncident,
  } = useIncidents();

  useEffect(() => {
    if (activeTrekking) {
      setField("trekking", activeTrekking.id);
      getCurrentLocation();
    }
  }, [activeTrekking]);

  const handleSubmit = async () => {
    const createdIncident = await submitIncident();

    if (!createdIncident && !error) {
      return;
    }

    if (error && !error.includes("Sin conexión")) {
      return;
    }

    Alert.alert(
      "Incidente reportado",
      error && error.includes("Sin conexión")
        ? error
        : "El incidente fue registrado correctamente.",
      [
        {
          text: "Aceptar",
          onPress: () => router.back(),
        },
      ],
    );
  };

  if (!activeTrekking) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="alert-circle-outline" size={40} color={COLORS.inkTertiary} />
        </View>
        <Text style={styles.emptyText}>No existe un trekking activo.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Volver</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const lat = Number(form.latitude);
  const lon = Number(form.longitude);
  const hasValidLocation = !Number.isNaN(lat) && !Number.isNaN(lon) && form.latitude !== null && form.longitude !== null;

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Cabecera */}
        <View style={styles.headerContainer}>
          <View style={styles.topRow}>
            <BackButton />
          </View>
          <Text style={styles.title}>Reportar incidente</Text>
          <Text style={styles.subtitle}>Expedición activa #{activeTrekking.id}</Text>
        </View>

        {/* Estado de la geolocalización automática */}
        <View style={styles.locationContainer}>
          <View style={styles.locationHeader}>
            <View style={styles.locationIconWrap}>
              <Ionicons name="location-outline" size={16} color={COLORS.lime} />
            </View>
            <Text style={styles.labelInline}>Ubicación GPS</Text>
          </View>

          {locationLoading ? (
            <View style={styles.locationStatusRow}>
              <ActivityIndicator size="small" color={COLORS.lime} />
              <Text style={styles.locationInfo}>Obteniendo ubicación actual...</Text>
            </View>
          ) : hasValidLocation ? (
            <View style={styles.locationStatusRow}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.lime} />
              <Text style={styles.locationSuccess}>
                Ubicación fijada ({lat.toFixed(4)}, {lon.toFixed(4)})
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10, marginTop: 4 }}>
              <View style={styles.locationStatusRow}>
                <Ionicons name="close-circle-outline" size={18} color={COLORS.inkSecondary} />
                <Text style={styles.locationError}>
                  No se ha podido obtener la ubicación.
                </Text>
              </View>
              <Pressable style={styles.secondaryButton} onPress={getCurrentLocation}>
                <Ionicons name="refresh-outline" size={16} color={COLORS.ink} style={{ marginRight: 6 }} />
                <Text style={styles.secondaryButtonText}>Reintentar ubicación</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Selección de Tipo de Incidente */}
        <Text style={styles.sectionTitle}>Tipo de incidente</Text>

        <View style={styles.gridContainer}>
          {incidentTypes.map((type) => {
            const isSelected = form.incident_type === type.value;
            return (
              <Pressable
                key={type.value}
                style={[styles.optionCard, isSelected && styles.optionSelected]}
                onPress={() => setField("incident_type", type.value)}
              >
                <Ionicons
                  name={type.icon}
                  size={22}
                  color={isSelected ? COLORS.lime : COLORS.inkSecondary}
                  style={{ marginBottom: 8 }}
                />
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {type.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Descripción */}
        <Text style={styles.sectionTitle}>Descripción</Text>
        <TextInput
          style={styles.textArea}
          value={form.description}
          onChangeText={(value) => setField("description", value)}
          placeholder="Describe detalladamente lo ocurrido..."
          placeholderTextColor={COLORS.inkTertiary}
          multiline
          textAlignVertical="top"
        />

        {/* Fotografía */}
        <Text style={styles.sectionTitle}>Evidencia fotográfica</Text>

        {form.photo ? (
          <View style={styles.photoPreviewContainer}>
            <Image source={{ uri: form.photo }} style={styles.preview} />
            <Pressable style={styles.removePhotoButton} onPress={removePhoto}>
              <Ionicons name="trash-outline" size={16} color={COLORS.ink} style={{ marginRight: 6 }} />
              <Text style={styles.removePhotoButtonText}>Eliminar fotografía</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.photoActions}>
            <Pressable style={styles.secondaryButton} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={18} color={COLORS.ink} style={{ marginRight: 8 }} />
              <Text style={styles.secondaryButtonText}>Tomar fotografía</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={pickPhoto}>
              <Ionicons name="image-outline" size={18} color={COLORS.ink} style={{ marginRight: 8 }} />
              <Text style={styles.secondaryButtonText}>Elegir de la galería</Text>
            </Pressable>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Botones de Acción */}
        <View style={styles.footerActions}>
          <Pressable
            style={[styles.primaryButton, (loading || locationLoading) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading || locationLoading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.black} style={styles.loaderSpacing} />
            ) : (
              <Ionicons name="send-outline" size={18} color={COLORS.black} style={{ marginRight: 8 }} />
            )}
            <Text style={styles.primaryButtonText}>
              {loading
                ? "Registrando..."
                : locationLoading
                  ? "Obteniendo ubicación..."
                  : "Reportar incidente"}
            </Text>
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={() => router.back()} disabled={loading}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 36,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: COLORS.bg,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.inkSecondary,
    fontWeight: "500",
    marginBottom: 20,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.glass,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  headerContainer: {
    marginBottom: 20,
  },
  topRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.ink,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.inkSecondary,
    marginTop: 4,
    fontWeight: "500",
  },
  locationContainer: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: 20,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  locationIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.limeDim,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  labelInline: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.ink,
  },
  locationStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationInfo: {
    color: COLORS.inkSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  locationSuccess: {
    color: COLORS.lime,
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  locationError: {
    color: COLORS.inkSecondary,
    fontSize: 14,
    fontWeight: "500",
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.ink,
    marginBottom: 12,
    marginTop: 4,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  optionCard: {
    width: "48%",
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  optionSelected: {
    borderColor: COLORS.lime,
    backgroundColor: COLORS.limeDim,
  },
  optionText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.inkSecondary,
    textAlign: "center",
  },
  optionTextSelected: {
    color: COLORS.lime,
    fontWeight: "700",
  },
  textArea: {
    backgroundColor: COLORS.surface,
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 18,
    padding: 16,
    fontSize: 15,
    color: COLORS.ink,
    marginBottom: 20,
  },
  photoActions: {
    gap: 10,
    marginBottom: 20,
  },
  photoPreviewContainer: {
    marginBottom: 20,
  },
  preview: {
    width: "100%",
    height: 220,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  footerActions: {
    marginTop: 10,
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    backgroundColor: COLORS.lime,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontWeight: "800",
    color: COLORS.black,
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loaderSpacing: {
    marginRight: 8,
  },
  secondaryButton: {
    flexDirection: "row",
    backgroundColor: COLORS.glass,
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.ink,
  },
  removePhotoButton: {
    flexDirection: "row",
    backgroundColor: "transparent",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  removePhotoButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.ink,
  },
  cancelButton: {
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.inkSecondary,
  },
  errorText: {
    color: COLORS.ink,
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
    fontWeight: "600",
  },
});