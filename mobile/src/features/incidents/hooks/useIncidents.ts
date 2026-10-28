import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Alert } from "react-native";
import { router } from "expo-router";
import { createIncident } from "../services/incidentService";
import { persistIncidentPhoto } from "../services/incidentFileStorage";
import { syncQueue } from "@/features/sync/services/syncQueue";
import type {
  CreateIncidentRequest,
  Incident,
} from "../types";

interface UseIncidentsReturn {
  form: CreateIncidentRequest;
  loading: boolean;
  locationLoading: boolean;
  error: string | null;
  incident: Incident | null;

  setField: <K extends keyof CreateIncidentRequest>(
    field: K,
    value: CreateIncidentRequest[K],
  ) => void;

  getCurrentLocation: () => Promise<boolean>;
  takePhoto: () => Promise<void>;
  pickPhoto: () => Promise<void>;
  removePhoto: () => void;

  submitIncident: () => Promise<Incident | null>;
  resetForm: () => void;
}

const initialForm: CreateIncidentRequest = {
  trekking: 0,
  incident_type: "OTHER",
  description: "",
  latitude: "",
  longitude: "",
  registered_at: new Date().toISOString(),
  photo: null,
};

export function useIncidents(): UseIncidentsReturn {
  const [form, setForm] =
    useState<CreateIncidentRequest>(initialForm);

  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incident, setIncident] = useState<Incident | null>(null);

  const setField = <K extends keyof CreateIncidentRequest>(
    field: K,
    value: CreateIncidentRequest[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const getCurrentLocation = async (): Promise<boolean> => {
    setError(null);
    setLocationLoading(true);

    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== Location.PermissionStatus.GRANTED) {
        setError(
          "Se necesita permiso de ubicación para registrar el incidente.",
        );
        return false;
      }

      const location =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

      const { latitude, longitude } = location.coords;

      setForm((current) => ({
        ...current,
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
      }));

      return true;
    } catch (err) {
      console.error("Error obteniendo ubicación:", err);
      setError("No fue posible obtener la ubicación actual.");
      return false;
    } finally {
      setLocationLoading(false);
    }
  };

  const takePhoto = async () => {
    setError(null);

    try {
      const permission =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        setError("Se necesita permiso para utilizar la cámara.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.4,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      setField("photo", result.assets[0].uri);
    } catch (err) {
      console.error("Error al capturar fotografía:", err);
      setError("Ocurrió un problema al abrir la cámara.");
    }
  };

  const pickPhoto = async () => {
    setError(null);

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setError(
          "Se necesita permiso para acceder a las fotografías.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.5,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      setField("photo", result.assets[0].uri);
    } catch (err) {
      console.error("Error al seleccionar fotografía:", err);
      setError("Ocurrió un problema al acceder a la galería.");
    }
  };

  const removePhoto = () => {
    setField("photo", null);
  };

  const validateForm = (): string | null => {
    if (!form.trekking) {
      return "No existe un trekking asociado.";
    }

    if (!form.description.trim()) {
      return "Ingresa una descripción del incidente.";
    }

    if (!form.latitude.trim() || !form.longitude.trim()) {
      return "No se ha obtenido la ubicación actual.";
    }

    return null;
  };

  const submitIncident = async (): Promise<Incident | null> => {
    if (loading) {
      return null;
    }

    setError(null);

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return null;
    }

    try {
      setLoading(true);

      const incidentData = await createIncident(form);

      if (!incidentData) {
        throw new Error("No se pudo registrar el incidente en el servidor.");
      }

      setIncident(incidentData);
      return incidentData;

    } catch (err: any) {
      try {
        const eventId = `incident_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        let persistentPhotoUri: string | null = null;

        if (form.photo) {
          persistentPhotoUri = await persistIncidentPhoto(
            form.photo,
            eventId,
          );
        }

        await syncQueue.enqueue({
          id: eventId,
          type: "incident",
          createdAt: new Date().toISOString(),
          payload: {
            trekking: form.trekking,
            incident_type: form.incident_type,
            description: form.description,
            latitude: form.latitude,
            longitude: form.longitude,
            registered_at: form.registered_at,
            photoUri: persistentPhotoUri,
          },
        });

        Alert.alert(
          "Guardado offline",
          "El incidente se almacenó localmente porque el servidor no respondió y se sincronizará al recuperar la red.",
          [{ text: "OK", onPress: () => router.back() }]
        );

        return null;
      } catch (queueErr) {
        console.error("Error guardando incidente offline:", queueErr);
        setError("No se pudo registrar el incidente ni guardarlo localmente.");
        return null;
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      ...initialForm,
      registered_at: new Date().toISOString(),
    });

    setError(null);
    setIncident(null);
  };

  return {
    form,
    loading,
    locationLoading,
    error,
    incident,
    setField,
    getCurrentLocation,
    takePhoto,
    pickPhoto,
    removePhoto,
    submitIncident,
    resetForm,
  };
}