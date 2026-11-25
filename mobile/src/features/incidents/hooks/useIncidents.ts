
import { useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";

import { Alert } from "react-native";
import { router } from "expo-router";

import { useAuth } from "@/features/auth/context/AuthContext";
import { getUserIdFromToken } from "@/features/auth/utils/tokenIdentity";

import { createIncident } from "../services/incidentService";
import { persistIncidentPhoto } from "../services/incidentFileStorage";
import { createLocalIncident } from "../services/localIncidentService";

import { syncQueue } from "@/features/sync/services/syncQueue";

import type {
  CreateIncidentRequest,
  Incident,
} from "../types";

// ---------------------------------------------------------
// HITO — INCIDENTES ONLINE Y OFFLINE
// ---------------------------------------------------------

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

  // Sistema original de Django.
  submitIncident: () => Promise<Incident | null>;

  // Nuevo sistema SQLite para trekkings locales.
  submitLocalIncident: () => Promise<boolean>;

  resetForm: () => void;
}

function createInitialForm(): CreateIncidentRequest {
  return {
    trekking: 0,
    incident_type: "OTHER",
    description: "",
    latitude: "",
    longitude: "",
    registered_at: new Date().toISOString(),
    photo: null,
  };
}

// ---------------------------------------------------------
// HOOK PRINCIPAL
// ---------------------------------------------------------

export function useIncidents(): UseIncidentsReturn {
  const { accessToken, activeLocalTrekking } = useAuth();

  const [form, setForm] =
    useState<CreateIncidentRequest>(createInitialForm);

  const [loading, setLoading] = useState(false);

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [error, setError] = useState<string | null>(null);

  const [incident, setIncident] =
    useState<Incident | null>(null);

  // Evita envíos simultáneos por doble pulsación.
  const submittingRef = useRef(false);

  // -------------------------------------------------------
  // FORMULARIO
  // -------------------------------------------------------

  const setField = <
    K extends keyof CreateIncidentRequest,
  >(
    field: K,
    value: CreateIncidentRequest[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  // -------------------------------------------------------
  // UBICACIÓN GPS
  // -------------------------------------------------------

  const getCurrentLocation =
    async (): Promise<boolean> => {
      setError(null);
      setLocationLoading(true);

      try {
        const { status } =
          await Location.requestForegroundPermissionsAsync();

        if (
          status !== Location.PermissionStatus.GRANTED
        ) {
          setError(
            "Se necesita permiso para obtener la ubicación GPS del incidente.",
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
        console.error(
          "Error obteniendo ubicación:",
          err,
        );

        setError(
          "No fue posible obtener la ubicación actual.",
        );

        return false;
      } finally {
        setLocationLoading(false);
      }
    };

  // -------------------------------------------------------
  // CÁMARA
  // -------------------------------------------------------

  const takePhoto = async (): Promise<void> => {
    setError(null);

    try {
      const permission =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        setError(
          "Se necesita permiso para utilizar la cámara.",
        );
        return;
      }

      const result =
        await ImagePicker.launchCameraAsync({
          mediaTypes:
            ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.4,
        });

      if (
        result.canceled ||
        !result.assets?.[0]?.uri
      ) {
        return;
      }

      setField("photo", result.assets[0].uri);
    } catch (err) {
      console.error(
        "Error al capturar fotografía:",
        err,
      );

      setError(
        "Ocurrió un problema al abrir la cámara.",
      );
    }
  };

  // -------------------------------------------------------
  // GALERÍA
  // -------------------------------------------------------

  const pickPhoto = async (): Promise<void> => {
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

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes:
            ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.5,
        });

      if (
        result.canceled ||
        !result.assets?.[0]?.uri
      ) {
        return;
      }

      setField("photo", result.assets[0].uri);
    } catch (err) {
      console.error(
        "Error al seleccionar fotografía:",
        err,
      );

      setError(
        "Ocurrió un problema al acceder a la galería.",
      );
    }
  };

  // -------------------------------------------------------
  // ELIMINAR FOTO DEL FORMULARIO
  // -------------------------------------------------------

  const removePhoto = () => {
    setField("photo", null);
  };

  // -------------------------------------------------------
  // VALIDACIÓN DEL SISTEMA ORIGINAL
  // -------------------------------------------------------

  const validateRemoteForm = (): string | null => {
    if (!form.trekking) {
      return "No existe un trekking asociado.";
    }

    if (!form.description.trim()) {
      return "Ingresa una descripción del incidente.";
    }

    if (
      !form.latitude.trim() ||
      !form.longitude.trim()
    ) {
      return "No se ha obtenido la ubicación actual.";
    }

    return null;
  };

  // -------------------------------------------------------
  // SISTEMA ORIGINAL — DJANGO / COLA ANTIGUA
  // -------------------------------------------------------

  const submitIncident =
    async (): Promise<Incident | null> => {
      if (submittingRef.current) {
        return null;
      }

      setError(null);

      const validationError = validateRemoteForm();

      if (validationError) {
        setError(validationError);
        return null;
      }

      submittingRef.current = true;
      setLoading(true);

      try {
        const incidentData =
          await createIncident(form);

        if (!incidentData) {
          throw new Error(
            "No se pudo registrar el incidente en el servidor.",
          );
        }

        setIncident(incidentData);

        return incidentData;
      } catch (err) {
        console.error(
          "Error registrando incidente remoto:",
          err,
        );

        try {
          const eventId =
            `incident_${Date.now()}_${Math.random()
              .toString(36)
              .substring(2, 9)}`;

          let persistentPhotoUri: string | null = null;

          if (form.photo) {
            persistentPhotoUri =
              await persistIncidentPhoto(
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
            "El incidente se guardó localmente. Todavía no ha sido recibido por los guardaparques.",
            [
              {
                text: "Aceptar",
                onPress: () => router.back(),
              },
            ],
          );

          return null;
        } catch (queueError) {
          console.error(
            "Error guardando incidente remoto offline:",
            queueError,
          );

          setError(
            "No se pudo registrar ni guardar localmente el incidente.",
          );

          return null;
        }
      } finally {
        submittingRef.current = false;
        setLoading(false);
      }
    };

  // -------------------------------------------------------
  // NUEVO SISTEMA — INCIDENTES LOCALES SQLITE
  // -------------------------------------------------------

  const submitLocalIncident =
    async (): Promise<boolean> => {
      if (submittingRef.current) {
        return false;
      }

      setError(null);

      const localTrekking =
        activeLocalTrekking?.trekking;

      // No enviamos un UUID local a la API de Django.

      if (
        !localTrekking ||
        localTrekking.status !== "IN_PROGRESS"
      ) {
        setError(
          "No existe una excursión local activa.",
        );

        return false;
      }

      const ownerUserId = accessToken
        ? getUserIdFromToken(accessToken)
        : null;

      if (!ownerUserId) {
        setError(
          "No fue posible identificar tu cuenta.",
        );

        return false;
      }

      if (!form.description.trim()) {
        setError(
          "Ingresa una descripción del incidente.",
        );

        return false;
      }

      // Si no hay ubicación, se permite el reporte.
      // Nunca se inventan coordenadas GPS.

      const hasLatitude =
        form.latitude.trim().length > 0;

      const hasLongitude =
        form.longitude.trim().length > 0;

      if (hasLatitude !== hasLongitude) {
        setError(
          "Las coordenadas GPS están incompletas.",
        );

        return false;
      }

      const latitude = hasLatitude
        ? Number(form.latitude)
        : null;

      const longitude = hasLongitude
        ? Number(form.longitude)
        : null;

      if (
        (latitude !== null &&
          !Number.isFinite(latitude)) ||
        (longitude !== null &&
          !Number.isFinite(longitude))
      ) {
        setError(
          "Las coordenadas GPS no son válidas.",
        );

        return false;
      }

      submittingRef.current = true;
      setLoading(true);

      try {
        let persistentPhotoUri: string | null = null;

        // Primero conservamos la fotografía fuera
        // del directorio temporal de ImagePicker.

        if (form.photo) {
          const photoId =
            `local_incident_${Date.now()}_${Math.random()
              .toString(36)
              .substring(2, 9)}`;

          persistentPhotoUri =
            await persistIncidentPhoto(
              form.photo,
              photoId,
            );
        }

        // SQLite es la fuente de verdad del
        // trekking iniciado mediante QR.

        await createLocalIncident({
          trekkingLocalId: localTrekking.local_id,
          ownerUserId,
          incidentType: form.incident_type,
          description: form.description.trim(),
          latitude,
          longitude,
          photoUri: persistentPhotoUri,
        });

        // Devuelve true SOLO después de guardar
        // correctamente el incidente en SQLite.

        return true;
      } catch (err) {
        console.error(
          "Error registrando incidente local:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "No fue posible guardar el incidente en SQLite.",
        );

        return false;
      } finally {
        submittingRef.current = false;
        setLoading(false);
      }
    };

  // -------------------------------------------------------
  // REINICIAR FORMULARIO
  // -------------------------------------------------------

  const resetForm = () => {
    setForm(createInitialForm());
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
    submitLocalIncident,
    resetForm,
  };
}
