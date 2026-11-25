
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

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useIncidents } from "@/features/incidents/hooks/useIncidents";

import type { IncidentType } from "@/features/incidents/types";

// ---------------------------------------------------------
// HITO — DESIGN SYSTEM
// ---------------------------------------------------------

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

// ---------------------------------------------------------
// TIPOS DE INCIDENTES
// ---------------------------------------------------------

const incidentTypes: {
  value: IncidentType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    value: "PERSON_INJURED",
    label: "Persona lesionada",
    icon: "medkit-outline",
  },
  {
    value: "DANGEROUS_ANIMAL",
    label: "Animal peligroso",
    icon: "paw-outline",
  },
  {
    value: "LANDSLIDE",
    label: "Derrumbe",
    icon: "trending-down-outline",
  },
  {
    value: "FALLEN_TREE",
    label: "Árbol caído",
    icon: "leaf-outline",
  },
  {
    value: "BLOCKED_TRAIL",
    label: "Sendero bloqueado",
    icon: "ban-outline",
  },
  {
    value: "LOST_PERSON",
    label: "Persona extraviada",
    icon: "search-outline",
  },
  {
    value: "WEATHER",
    label: "Condiciones climáticas",
    icon: "cloud-outline",
  },
  {
    value: "OTHER",
    label: "Otro",
    icon: "alert-circle-outline",
  },
];

// ---------------------------------------------------------
// COMPONENTE: VOLVER
// ---------------------------------------------------------


 // ---------------------------------------------------------
 // COMPONENTE: VOLVER AL TREKKING EN CURSO
 // ---------------------------------------------------------

function BackButton() {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.backButton,
        pressed && styles.pressed,
      ]}
      onPress={() => router.replace("/trekking")}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Volver al trekking en curso"
    >
      <Ionicons
        name="chevron-back"
        size={20}
        color={COLORS.ink}
      />
    </Pressable>
  );
}


// ---------------------------------------------------------
// PANTALLA PRINCIPAL
// ---------------------------------------------------------

export default function IncidentScreen() {
  const {
    activeTrekking,
    activeLocalTrekking,
  } = useAuth();

  const localTrekking =
    activeLocalTrekking?.trekking.status === "IN_PROGRESS"
      ? activeLocalTrekking.trekking
      : null;

  const isLocalTrekking = Boolean(localTrekking);

  const insets = useSafeAreaInsets();

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
    submitLocalIncident,
  } = useIncidents();

  // -------------------------------------------------------
  // ASOCIAR EXCURSIÓN Y OBTENER UBICACIÓN
  // -------------------------------------------------------

  useEffect(() => {
    if (isLocalTrekking) {
      // El trekking local usa UUID de SQLite.
      // No enviamos ese UUID a la API antigua de Django.

      void getCurrentLocation();
      return;
    }

    if (activeTrekking) {
      setField("trekking", activeTrekking.id);
      void getCurrentLocation();
    }
  }, [
    isLocalTrekking,
    activeTrekking?.id,
  ]);

  // -------------------------------------------------------
  // ENVIAR INCIDENTE
  // -------------------------------------------------------

  const handleSubmit = async () => {
    if (loading || locationLoading) {
      return;
    }

    // TREKKING INICIADO MEDIANTE QR:
    // guardar primero en SQLite.

    if (isLocalTrekking) {
      const saved = await submitLocalIncident();

      if (!saved) {
        return;
      }

      Alert.alert(
        "Incidente guardado",
        "El incidente quedó registrado en este dispositivo.\n\nEstá pendiente de sincronización y todavía no ha sido recibido por los guardaparques.",
        [
          {
            text: "Aceptar",
            onPress: () => router.back(),
          },
        ],
        {
          cancelable: false,
        },
      );

      return;
    }

    // SISTEMA ANTERIOR:
    // mantener integración con Django y su cola offline.

    const createdIncident = await submitIncident();

    if (!createdIncident) {
      return;
    }

    Alert.alert(
      "Incidente registrado",
      "El servidor confirmó el registro del incidente.",
      [
        {
          text: "Aceptar",
          onPress: () => router.back(),
        },
      ],
    );
  };

  // -------------------------------------------------------
  // SIN TREKKING ACTIVO
  // -------------------------------------------------------

  if (!isLocalTrekking && !activeTrekking) {
    return (
      <SafeAreaView
        style={styles.center}
        edges={["top", "left", "right", "bottom"]}
      >
        <View style={styles.emptyIconContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={34}
            color={COLORS.inkTertiary}
          />
        </View>

        <Text style={styles.emptyTitle}>
          Sin trekking activo
        </Text>

        <Text style={styles.emptyText}>
          No existe un trekking activo.
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.primaryButtonText}>
            Volver
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------
  // VALIDACIÓN DE UBICACIÓN
  // -------------------------------------------------------

  const lat = Number(form.latitude);
  const lon = Number(form.longitude);

  const hasValidLocation =
    typeof form.latitude === "string" &&
    typeof form.longitude === "string" &&
    form.latitude.trim().length > 0 &&
    form.longitude.trim().length > 0 &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180;

  // -------------------------------------------------------
  // INTERFAZ
  // -------------------------------------------------------

  return (
    <SafeAreaView
      style={styles.safeContainer}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingBottom: 40 + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}

        <View style={styles.headerContainer}>
          <View style={styles.topRow}>
            <BackButton />

            <Text style={styles.backLabel}>
              Volver al trekking
            </Text>
          </View>

          <Text style={styles.eyebrow}>
            HITO / SEGURIDAD
          </Text>

          <Text style={styles.title}>
            Reportar incidente
          </Text>

          <Text style={styles.subtitle}>
            {isLocalTrekking
              ? `Excursión local · ${localTrekking?.local_id.slice(0, 8)}`
              : `Expedición activa #${activeTrekking?.id}`}
          </Text>
        </View>

        {/* UBICACIÓN GPS */}

        <View style={styles.locationContainer}>
          <View style={styles.locationHeader}>
            <View style={styles.locationTitleRow}>
              <Ionicons
                name="location-outline"
                size={19}
                color={COLORS.lime}
              />

              <Text style={styles.labelInline}>
                Ubicación GPS
              </Text>
            </View>

            {locationLoading ? (
              <ActivityIndicator
                size="small"
                color={COLORS.lime}
              />
            ) : hasValidLocation ? (
              <View style={styles.gpsBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={15}
                  color={COLORS.lime}
                />

                <Text style={styles.gpsBadgeText}>
                  Obtenida
                </Text>
              </View>
            ) : (
              <Ionicons
                name="close-circle-outline"
                size={19}
                color={COLORS.inkSecondary}
              />
            )}
          </View>

          {locationLoading ? (
            <View style={styles.locationStatusRow}>
              <Text style={styles.locationInfo}>
                Obteniendo ubicación actual...
              </Text>
            </View>
          ) : hasValidLocation ? (
            <View style={styles.locationStatusRow}>
              <Text style={styles.locationCoordinates}>
                {lat.toFixed(4)}, {lon.toFixed(4)}
              </Text>
            </View>
          ) : (
            <View style={styles.locationErrorContainer}>
              <Text style={styles.locationError}>
                No se ha podido obtener la ubicación.
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.retryLocationButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  void getCurrentLocation();
                }}
              >
                <Ionicons
                  name="refresh-outline"
                  size={15}
                  color={COLORS.ink}
                />

                <Text style={styles.retryLocationText}>
                  Reintentar ubicación
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* TIPO DE INCIDENTE */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            ¿Qué ocurrió?
          </Text>

          <Text style={styles.sectionCaption}>
            Selecciona una categoría
          </Text>
        </View>

        <View style={styles.gridContainer}>
          {incidentTypes.map((type) => {
            const isSelected =
              form.incident_type === type.value;

            return (
              <Pressable
                key={type.value}
                style={({ pressed }) => [
                  styles.optionCard,
                  isSelected && styles.optionSelected,
                  pressed && styles.pressed,
                ]}
                onPress={() =>
                  setField("incident_type", type.value)
                }
                accessibilityRole="radio"
                accessibilityState={{
                  selected: isSelected,
                }}
                accessibilityLabel={type.label}
              >
                <View style={styles.optionTopRow}>
                  <Ionicons
                    name={type.icon}
                    size={23}
                    color={
                      isSelected
                        ? COLORS.lime
                        : COLORS.inkSecondary
                    }
                  />

                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={17}
                      color={COLORS.lime}
                    />
                  )}
                </View>

                <Text
                  style={[
                    styles.optionText,
                    isSelected &&
                      styles.optionTextSelected,
                  ]}
                >
                  {type.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* DESCRIPCIÓN */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Descripción
          </Text>
        </View>

        <TextInput
          style={styles.textArea}
          value={form.description}
          onChangeText={(value) =>
            setField("description", value)
          }
          placeholder="Describe qué sucedió y dónde ocurrió..."
          placeholderTextColor={COLORS.inkTertiary}
          multiline
          textAlignVertical="top"
          selectionColor={COLORS.lime}
          accessibilityLabel="Descripción del incidente"
        />

        {/* EVIDENCIA FOTOGRÁFICA */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Evidencia fotográfica
          </Text>
        </View>

        {form.photo ? (
          <View style={styles.photoPreviewContainer}>
            <Image
              source={{ uri: form.photo }}
              style={styles.preview}
              resizeMode="cover"
            />

            <Pressable
              style={({ pressed }) => [
                styles.removePhotoButton,
                pressed && styles.pressed,
              ]}
              onPress={removePhoto}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color={COLORS.ink}
              />

              <Text style={styles.removePhotoButtonText}>
                Eliminar fotografía
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.photoActions}>
            <Pressable
              style={({ pressed }) => [
                styles.photoActionButton,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                void takePhoto();
              }}
            >
              <Ionicons
                name="camera-outline"
                size={23}
                color={COLORS.ink}
              />

              <Text style={styles.photoActionText}>
                Cámara
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.photoActionButton,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                void pickPhoto();
              }}
            >
              <Ionicons
                name="images-outline"
                size={23}
                color={COLORS.ink}
              />

              <Text style={styles.photoActionText}>
                Galería
              </Text>
            </Pressable>
          </View>
        )}

        {/* ERRORES */}

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={COLORS.inkSecondary}
            />

            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        {/* ESTADO OFFLINE */}

        {isLocalTrekking && (
          <View style={styles.offlineNotice}>
            <Ionicons
              name="cloud-offline-outline"
              size={17}
              color={COLORS.lime}
            />

            <Text style={styles.offlineNoticeText}>
              El reporte se guardará en este dispositivo.
              Los guardaparques podrán recibirlo cuando
              se implemente y complete la sincronización.
            </Text>
          </View>
        )}

        {/* ACCIONES */}

        <View style={styles.footerActions}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              (loading || locationLoading) &&
                styles.buttonDisabled,
              pressed &&
                !loading &&
                !locationLoading &&
                styles.pressed,
            ]}
            onPress={() => {
              void handleSubmit();
            }}
            disabled={loading || locationLoading}
            accessibilityRole="button"
            accessibilityLabel="Reportar incidente"
          >
            {loading ? (
              <ActivityIndicator
                size="small"
                color={COLORS.black}
                style={styles.loaderSpacing}
              />
            ) : (
              <Ionicons
                name="send-outline"
                size={18}
                color={COLORS.black}
                style={styles.loaderSpacing}
              />
            )}

            <Text style={styles.primaryButtonText}>
              {loading
                ? "Registrando..."
                : locationLoading
                  ? "Obteniendo ubicación..."
                  : isLocalTrekking
                    ? "Guardar incidente"
                    : "Reportar incidente"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>
              Cancelar
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------
// ESTILOS
// ---------------------------------------------------------

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  pressed: {
    opacity: 0.78,
  },

  headerContainer: {
    marginBottom: 25,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 27,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  backLabel: {
    color: COLORS.inkSecondary,
    fontSize: 13,
    fontWeight: "500",
  },

  eyebrow: {
    color: COLORS.lime,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.8,
    marginBottom: 9,
  },

  title: {
    fontSize: 29,
    fontWeight: "700",
    color: COLORS.ink,
    letterSpacing: -0.9,
    lineHeight: 36,
  },

  subtitle: {
    fontSize: 13,
    color: COLORS.inkSecondary,
    marginTop: 7,
    fontWeight: "400",
  },

  locationContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 29,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },

  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  locationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flexShrink: 1,
  },

  labelInline: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: "600",
  },

  gpsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.limeDim,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  gpsBadgeText: {
    color: COLORS.lime,
    fontSize: 11,
    fontWeight: "600",
  },

  locationStatusRow: {
    marginTop: 10,
  },

  locationInfo: {
    color: COLORS.inkSecondary,
    fontSize: 12,
    lineHeight: 18,
  },

  locationCoordinates: {
    color: COLORS.inkSecondary,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.3,
  },

  locationErrorContainer: {
    marginTop: 12,
    gap: 12,
  },

  locationError: {
    color: COLORS.inkSecondary,
    fontSize: 12,
    lineHeight: 18,
  },

  retryLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.glass,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },

  retryLocationText: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: "600",
  },

  sectionHeader: {
    marginBottom: 13,
  },

  sectionTitle: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.35,
  },

  sectionCaption: {
    color: COLORS.inkSecondary,
    fontSize: 12,
    marginTop: 5,
  },

  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
    marginBottom: 29,
  },

  optionCard: {
    width: "48.5%",
    minHeight: 96,
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    justifyContent: "space-between",
  },

  optionSelected: {
    borderColor: COLORS.lime,
    backgroundColor: "rgba(198,255,77,0.08)",
  },

  optionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  optionText: {
    color: COLORS.inkSecondary,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
  },

  optionTextSelected: {
    color: COLORS.ink,
    fontWeight: "600",
  },

  textArea: {
    backgroundColor: COLORS.surface,
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 16,
    color: COLORS.ink,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 29,
  },

  photoActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 25,
  },

  photoActionButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 82,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    padding: 12,
  },

  photoActionText: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: "500",
  },

  photoPreviewContainer: {
    marginBottom: 25,
  },

  preview: {
    width: "100%",
    height: 205,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
  },

  removePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 13,
    backgroundColor: COLORS.surface,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },

  removePhotoButtonText: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: "600",
  },

  errorContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: 16,
  },

  errorText: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },

  offlineNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: COLORS.limeDim,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.limeBorder,
    padding: 13,
    marginBottom: 18,
  },

  offlineNoticeText: {
    flex: 1,
    color: COLORS.inkSecondary,
    fontSize: 12,
    lineHeight: 18,
  },

  footerActions: {
    marginTop: 8,
    gap: 8,
  },

  primaryButton: {
    flexDirection: "row",
    backgroundColor: COLORS.lime,
    minHeight: 54,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    fontWeight: "700",
    color: COLORS.black,
    fontSize: 15,
    letterSpacing: -0.2,
  },

  loaderSpacing: {
    marginRight: 9,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  cancelButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.inkSecondary,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: COLORS.bg,
  },

  emptyIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  emptyTitle: {
    color: COLORS.ink,
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 7,
  },

  emptyText: {
    fontSize: 13,
    color: COLORS.inkSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
});
