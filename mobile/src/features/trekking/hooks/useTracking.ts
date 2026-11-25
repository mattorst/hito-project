
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  LocationObject,
  LocationSubscription,
} from "expo-location";

import {
  startTracking as startTrackingService,
} from "../services/trackingService";

import type {
  TrackingTrekkingId,
} from "../types/tracking";

export type TrackingStatus =
  | "idle"
  | "starting"
  | "tracking"
  | "stopped"
  | "error";

interface UseTrackingResult {
  status: TrackingStatus;
  location: LocationObject | null;
  error: string | null;
  persistenceError: string | null;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
}

export function useTracking(
  trekkingId: TrackingTrekkingId,
): UseTrackingResult {
  const [status, setStatus] =
    useState<TrackingStatus>("idle");

  const [location, setLocation] =
    useState<LocationObject | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [persistenceError, setPersistenceError] =
    useState<string | null>(null);

  const subscriptionRef =
    useRef<LocationSubscription | null>(null);

  const sessionRef = useRef(0);

  // Impide iniciar dos watchPositionAsync simultáneos.
  const startingSessionRef =
    useRef<number | null>(null);

  const startTracking = useCallback(async () => {
    if (
      subscriptionRef.current ||
      startingSessionRef.current !== null
    ) {
      return;
    }

    const validId =
      typeof trekkingId === "number"
        ? Number.isInteger(trekkingId) &&
          trekkingId > 0
        : typeof trekkingId === "string" &&
          trekkingId.trim().length > 0;

    if (!validId) {
      setStatus("idle");
      return;
    }

    const sessionId = ++sessionRef.current;
    startingSessionRef.current = sessionId;

    setStatus("starting");
    setError(null);
    setPersistenceError(null);

    try {
      const subscription =
        await startTrackingService({
          trekkingId,

          onLocation: (newLocation) => {
            if (sessionRef.current !== sessionId) {
              return;
            }

            setLocation(newLocation);
          },

          onPersistenceError: (persistError) => {
            if (sessionRef.current !== sessionId) {
              return;
            }

            console.error(
              "Error de persistencia GPS:",
              persistError,
            );

            setPersistenceError(
              "No fue posible guardar una posición GPS localmente.",
            );
          },
        });

      if (sessionRef.current !== sessionId) {
        subscription.remove();
        return;
      }

      subscriptionRef.current = subscription;
      setStatus("tracking");
    } catch (err) {
      if (sessionRef.current !== sessionId) {
        return;
      }

      console.error(
        "Error al iniciar tracking:",
        err,
      );

      setStatus("error");
      setError(
        "No fue posible iniciar el seguimiento de ubicación.",
      );
    } finally {
      if (startingSessionRef.current === sessionId) {
        startingSessionRef.current = null;
      }
    }
  }, [trekkingId]);

  const stopTracking = useCallback(() => {
    // Invalida callbacks anteriores, incluso si
    // watchPositionAsync todavía está iniciándose.
    sessionRef.current += 1;
    startingSessionRef.current = null;

    const subscription = subscriptionRef.current;
    subscriptionRef.current = null;

    subscription?.remove();

    setStatus("stopped");
    setLocation(null);
  }, []);

  useEffect(() => {
    return () => {
      // Al cambiar de trekking o desmontar la pantalla,
      // invalidamos la sesión y soltamos el GPS.
      sessionRef.current += 1;
      startingSessionRef.current = null;

      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [trekkingId]);

  return {
    status,
    location,
    error,
    persistenceError,
    startTracking,
    stopTracking,
  };
}
