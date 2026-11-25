
import { useCallback, useRef, useState } from "react";

import * as Location from "expo-location";

import { useAuth } from "@/features/auth/context/AuthContext";
import { getUserIdFromToken } from "@/features/auth/utils/tokenIdentity";

import {
  createLocalRescue,
  getActiveLocalRescue,
  cancelPendingLocalRescue,
  type LocalRescue,
} from "../services/localRescueService";

// ---------------------------------------------------------
// HITO — HOOK DE RESCATES OFFLINE
// ---------------------------------------------------------

export function useLocalRescue() {
  const {
    accessToken,
    activeLocalTrekking,
  } = useAuth();

  const [activeLocalRescue, setActiveLocalRescue] =
    useState<LocalRescue | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(
    null,
  );

  const processingRef = useRef(false);

  const trekkingLocalId =
    activeLocalTrekking?.trekking.status === "IN_PROGRESS"
      ? activeLocalTrekking.trekking.local_id
      : null;

  const getOwnerUserId = useCallback((): string => {
    const ownerUserId = accessToken
      ? getUserIdFromToken(accessToken)
      : null;

    if (!ownerUserId) {
      throw new Error(
        "No fue posible identificar tu sesión.",
      );
    }

    return ownerUserId;
  }, [accessToken]);

  // -------------------------------------------------------
  // RESTAURAR SOLICITUD EXISTENTE
  // -------------------------------------------------------

  const loadLocalRescue = useCallback(
    async (): Promise<LocalRescue | null> => {
      if (!trekkingLocalId) {
        setActiveLocalRescue(null);
        return null;
      }

      try {
        setError(null);

        const ownerUserId = getOwnerUserId();

        const rescue = await getActiveLocalRescue(
          trekkingLocalId,
          ownerUserId,
        );

        setActiveLocalRescue(rescue);

        return rescue;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No fue posible consultar la emergencia.",
        );

        return null;
      }
    },
    [
      trekkingLocalId,
      getOwnerUserId,
    ],
  );

  // -------------------------------------------------------
  // REGISTRAR RESCATE OFFLINE
  // -------------------------------------------------------

  const requestLocalRescue =
    async (): Promise<LocalRescue | null> => {
      if (processingRef.current) {
        return null;
      }

      if (!trekkingLocalId) {
        setError(
          "No existe una excursión local activa.",
        );
        return null;
      }

      processingRef.current = true;

      setLoading(true);
      setError(null);

      try {
        const ownerUserId = getOwnerUserId();

        // Intentamos obtener una ubicación GPS reciente.
        // Si falla, permitimos guardar la emergencia
        // sin inventar coordenadas.

        let latitude: number | null = null;
        let longitude: number | null = null;

        try {
          const permission =
            await Location.getForegroundPermissionsAsync();

          const permissionStatus =
            permission.granted
              ? permission
              : await Location.requestForegroundPermissionsAsync();

          if (permissionStatus.granted) {
            const location =
              await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
              });

            latitude = location.coords.latitude;
            longitude = location.coords.longitude;
          }
        } catch (gpsError) {
          console.warn(
            "No se pudo obtener GPS para rescate local:",
            gpsError,
          );
        }

        const result = await createLocalRescue({
          trekkingLocalId,
          ownerUserId,
          latitude,
          longitude,
        });

        setActiveLocalRescue(result.rescue);

        return result.rescue;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No fue posible guardar la emergencia.",
        );

        return null;
      } finally {
        processingRef.current = false;
        setLoading(false);
      }
    };

  // -------------------------------------------------------
  // CANCELAR RESCATE PENDIENTE
  // -------------------------------------------------------

  const cancelLocalRescue =
    async (): Promise<boolean> => {
      if (
        processingRef.current ||
        !activeLocalRescue
      ) {
        return false;
      }

      processingRef.current = true;

      setLoading(true);
      setError(null);

      try {
        const ownerUserId = getOwnerUserId();

        await cancelPendingLocalRescue(
          activeLocalRescue.local_id,
          ownerUserId,
        );

        setActiveLocalRescue(null);

        return true;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No fue posible cancelar la solicitud.",
        );

        return false;
      } finally {
        processingRef.current = false;
        setLoading(false);
      }
    };

  return {
    activeLocalRescue,
    loading,
    error,
    loadLocalRescue,
    requestLocalRescue,
    cancelLocalRescue,
  };
}
