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
import { startTracking as startTrackingService } from "../services/trackingService";

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
  trekkingId: number,
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

  const trackingSessionRef =
    useRef(0);

  const startTracking = useCallback(async () => {
    if (subscriptionRef.current) {
      return;
    }

    setStatus("starting");
    setError(null);
    setPersistenceError(null);

    const sessionId =
      trackingSessionRef.current + 1;

    trackingSessionRef.current = sessionId;

    try {
      const subscription =
        await startTrackingService({
          trekkingId,

          onLocation: (newLocation) => {
            if (
              trackingSessionRef.current !== sessionId
            ) {
              return;
            }

            setLocation(newLocation);
          },

          onPersistenceError: (persistError) => {
            if (
              trackingSessionRef.current !== sessionId
            ) {
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

      if (
        trackingSessionRef.current !== sessionId
      ) {
        subscription.remove();
        return;
      }

      subscriptionRef.current = subscription;

      setStatus("tracking");
    } catch (err) {
      if (
        trackingSessionRef.current !== sessionId
      ) {
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
    }
  }, [trekkingId]);

  const stopTracking = useCallback(() => {
    trackingSessionRef.current += 1;

    const subscription =
      subscriptionRef.current;

    subscriptionRef.current = null;

    if (!subscription) {
      setStatus("stopped");
      return;
    }

    subscription.remove();

    setStatus("stopped");
  }, []);

  useEffect(() => {
    return () => {
      trackingSessionRef.current += 1;

      subscriptionRef.current?.remove();

      subscriptionRef.current = null;
    };
  }, []);

  return {
    status,
    location,
    error,
    persistenceError,
    startTracking,
    stopTracking,
  };
}