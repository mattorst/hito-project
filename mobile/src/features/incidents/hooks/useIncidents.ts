import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { createIncident } from "../services/incidentService";
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

    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setError("Se necesita permiso para utilizar la cámara.");
      return;
    }

    const result =
      await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset?.uri) {
      setError("No se pudo obtener la fotografía.");
      return;
    }

    setField("photo", asset.uri);
  };

  const pickPhoto = async () => {
    setError(null);

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError(
        "Se necesita permiso para acceder a las fotografías.",
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset?.uri) {
      setError("No se pudo obtener la fotografía.");
      return;
    }

    setField("photo", asset.uri);
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
        setError("No se pudo registrar el incidente.");
        return null;
      }

      setIncident(incidentData);

      return incidentData;
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        "No se pudo registrar el incidente. Verifica tu conexión.";

      setError(message);

      return null;
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