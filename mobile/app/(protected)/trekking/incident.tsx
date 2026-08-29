import { useEffect } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useIncidents } from "@/features/incidents/hooks/useIncidents";
import type { IncidentType } from "@/features/incidents/types";

const incidentTypes: {
  value: IncidentType;
  label: string;
}[] = [
  { value: "PERSON_INJURED", label: "Persona lesionada" },
  { value: "DANGEROUS_ANIMAL", label: "Animal peligroso" },
  { value: "LANDSLIDE", label: "Derrumbe" },
  { value: "FALLEN_TREE", label: "Árbol caído" },
  { value: "BLOCKED_TRAIL", label: "Sendero bloqueado" },
  { value: "LOST_PERSON", label: "Persona extraviada" },
  { value: "WEATHER", label: "Condiciones climáticas" },
  { value: "OTHER", label: "Otro" },
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
      <View style={styles.center}>
        <Text>No existe un trekking activo.</Text>
        <Pressable
          style={styles.button}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Reportar incidente</Text>
      <Text style={styles.subtitle}>
        Trekking #{activeTrekking.id}
      </Text>

      {/* Estado de la geolocalización automática */}
      <View style={styles.locationContainer}>
        <Text style={styles.label}>Ubicación GPS</Text>
        {locationLoading ? (
          <Text style={styles.locationInfo}>Obteniendo ubicación actual...</Text>
        ) : form.latitude && form.longitude ? (
          <Text style={styles.locationSuccess}>
            Ubicación obtenida ({form.latitude}, {form.longitude})
          </Text>
        ) : (
          <View style={{ gap: 8, marginTop: 4 }}>
            <Text style={styles.locationError}>
              No se ha podido obtener la ubicación.
            </Text>
            <Pressable
              style={styles.secondaryButton}
              onPress={getCurrentLocation}
            >
              <Text>Reintentar obtener ubicación</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Text style={styles.label}>Tipo de incidente</Text>

      {incidentTypes.map((type) => (
        <Pressable
          key={type.value}
          style={[
            styles.option,
            form.incident_type === type.value &&
              styles.optionSelected,
          ]}
          onPress={() =>
            setField("incident_type", type.value)
          }
        >
          <Text>{type.label}</Text>
        </Pressable>
      ))}

      <Text style={styles.label}>Descripción</Text>

      <TextInput
        style={styles.textArea}
        value={form.description}
        onChangeText={(value) =>
          setField("description", value)
        }
        placeholder="Describe lo ocurrido..."
        multiline
        textAlignVertical="top"
      />

      <Text style={styles.label}>Fotografía</Text>

      {form.photo ? (
        <View>
          <Image
            source={{ uri: form.photo }}
            style={styles.preview}
          />
          <Pressable
            style={styles.secondaryButton}
            onPress={removePhoto}
          >
            <Text>Eliminar fotografía</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.photoActions}>
          <Pressable
            style={styles.secondaryButton}
            onPress={takePhoto}
          >
            <Text>Tomar fotografía</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={pickPhoto}
          >
            <Text>Seleccionar fotografía</Text>
          </Pressable>
        </View>
      )}

      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}

      <Pressable
        style={[
          styles.button,
          (loading || locationLoading) && styles.buttonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={loading || locationLoading}
      >
        <Text style={styles.buttonText}>
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
        <Text>Cancelar</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
  },
  subtitle: {
    color: "#666",
    marginBottom: 8,
  },
  locationContainer: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  locationInfo: {
    color: "#007aff",
    fontSize: 14,
  },
  locationSuccess: {
    color: "#34c759",
    fontSize: 14,
    fontWeight: "600",
  },
  locationError: {
    color: "#ff3b30",
    fontSize: 14,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  option: {
    padding: 14,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: "#ccc",
  },
  optionSelected: {
    borderWidth: 2,
    borderColor: "#007aff",
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
  },
  photoActions: {
    gap: 10,
  },
  preview: {
    width: "100%",
    height: 220,
    borderRadius: 10,
  },
  button: {
    marginTop: 16,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#007aff",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontWeight: "700",
    color: "#fff",
  },
  secondaryButton: {
    padding: 13,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    borderColor: "#ccc",
  },
  cancelButton: {
    padding: 15,
    alignItems: "center",
  },
  errorText: {
    color: "red",
    marginTop: 8,
  },
});