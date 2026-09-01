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
        <Ionicons name="alert-circle-outline" size={56} color="#999999" style={{ marginBottom: 12 }} />
        <Text style={styles.emptyText}>No existe un trekking activo.</Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.back()}
        >
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
          <Text style={styles.title}>Reportar incidente</Text>
          <Text style={styles.subtitle}>
            Expedición activa #{activeTrekking.id}
          </Text>
        </View>

        {/* Estado de la geolocalización automática */}
        <View style={styles.locationContainer}>
          <View style={styles.locationHeader}>
            <Ionicons name="location-outline" size={18} color="#111111" />
            <Text style={styles.labelInline}>Ubicación GPS</Text>
          </View>
          
          {locationLoading ? (
            <View style={styles.locationStatusRow}>
              <ActivityIndicator size="small" color="#111111" />
              <Text style={styles.locationInfo}>Obteniendo ubicación actual...</Text>
            </View>
          ) : hasValidLocation ? (
            <View style={styles.locationStatusRow}>
              <Ionicons name="checkmark-circle" size={18} color="#2E7D32" />
              <Text style={styles.locationSuccess}>
                Ubicación fijada ({lat.toFixed(4)}, {lon.toFixed(4)})
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10, marginTop: 4 }}>
              <View style={styles.locationStatusRow}>
                <Ionicons name="close-circle" size={18} color="#E53935" />
                <Text style={styles.locationError}>
                  No se ha podido obtener la ubicación.
                </Text>
              </View>
              <Pressable
                style={styles.secondaryButton}
                onPress={getCurrentLocation}
              >
                <Ionicons name="refresh-outline" size={16} color="#111111" style={{ marginRight: 6 }} />
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
                style={[
                  styles.optionCard,
                  isSelected && styles.optionSelected,
                ]}
                onPress={() =>
                  setField("incident_type", type.value)
                }
              >
                <Ionicons 
                  name={type.icon} 
                  size={24} 
                  color={isSelected ? "#2E7D32" : "#555555"} 
                  style={{ marginBottom: 6 }}
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
          onChangeText={(value) =>
            setField("description", value)
          }
          placeholder="Describe detalladamente lo ocurrido..."
          placeholderTextColor="#999999"
          multiline
          textAlignVertical="top"
        />

        {/* Fotografía */}
        <Text style={styles.sectionTitle}>Evidencia fotográfica</Text>

        {form.photo ? (
          <View style={styles.photoPreviewContainer}>
            <Image
              source={{ uri: form.photo }}
              style={styles.preview}
            />
            <Pressable
              style={styles.dangerOutlineButton}
              onPress={removePhoto}
            >
              <Ionicons name="trash-outline" size={16} color="#E53935" style={{ marginRight: 6 }} />
              <Text style={styles.dangerOutlineButtonText}>Eliminar fotografía</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.photoActions}>
            <Pressable
              style={styles.secondaryButton}
              onPress={takePhoto}
            >
              <Ionicons name="camera-outline" size={18} color="#111111" style={{ marginRight: 8 }} />
              <Text style={styles.secondaryButtonText}>Tomar fotografía</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={pickPhoto}
            >
              <Ionicons name="image-outline" size={18} color="#111111" style={{ marginRight: 8 }} />
              <Text style={styles.secondaryButtonText}>Elegir de la galería</Text>
            </Pressable>
          </View>
        )}

        {error && (
          <Text style={styles.errorText}>
            {error}
          </Text>
        )}

        {/* Botones de Acción */}
        <View style={styles.footerActions}>
          <Pressable
            style={[
              styles.primaryButton,
              (loading || locationLoading) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading || locationLoading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={styles.loaderSpacing} />
            ) : (
              <Ionicons name="send-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.primaryButtonText}>
              {loading
                ? "Registrando..."
                : locationLoading
                  ? "Obteniendo ubicación..."
                  : "Reportar incidente"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={loading}
          >
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
    backgroundColor: "#F4F5F7",
  },
  container: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F4F5F7",
  },
  emptyText: {
    fontSize: 16,
    color: "#666666",
    fontWeight: "500",
  },
  headerContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#666666",
    marginTop: 4,
    fontWeight: "500",
  },
  locationContainer: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  labelInline: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111111",
    marginLeft: 8,
  },
  locationStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationInfo: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
  },
  locationSuccess: {
    color: "#2E7D32",
    fontSize: 14,
    fontWeight: "600",
  },
  locationError: {
    color: "#E53935",
    fontSize: 14,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111111",
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
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  optionSelected: {
    borderColor: "#2E7D32",
    backgroundColor: "#F0F7F0",
  },
  optionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333333",
    textAlign: "center",
  },
  optionTextSelected: {
    color: "#2E7D32",
    fontWeight: "700",
  },
  textArea: {
    backgroundColor: "#FFFFFF",
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: "#111111",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
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
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  footerActions: {
    marginTop: 10,
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    backgroundColor: "#111111",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    fontWeight: "600",
    color: "#FFFFFF",
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
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111111",
  },
  dangerOutlineButton: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  dangerOutlineButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E53935",
  },
  cancelButton: {
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666666",
  },
  errorText: {
    color: "#E53935",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
    fontWeight: "500",
  },
});