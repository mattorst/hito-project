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
import { watchLocation } from "../services/locationService";

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
  startTracking: () => Promise<void>;
  stopTracking: () => void;
}

export function useTracking(): UseTrackingResult {
  const [status, setStatus] =
    useState<TrackingStatus>("idle");

  const [location, setLocation] =
    useState<LocationObject | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const subscriptionRef =
    useRef<LocationSubscription | null>(null);

  const startTracking = useCallback(async () => {
    if (subscriptionRef.current) {
      return;
    }

    setStatus("starting");
    setError(null);

    try {
      const subscription = await watchLocation(
        (newLocation) => {
          setLocation(newLocation);
        },
      );

      subscriptionRef.current = subscription;

      setStatus("tracking");
    } catch (err) {
      console.error(
        "Error al iniciar tracking:",
        err,
      );

      setStatus("error");
      setError(
        "No fue posible iniciar el seguimiento de ubicación.",
      );
    }
  }, []);

  const stopTracking = useCallback(() => {
    if (!subscriptionRef.current) {
      setStatus("stopped");
      return;
    }

    subscriptionRef.current.remove();

    subscriptionRef.current = null;

    setStatus("stopped");
  }, []);

  useEffect(() => {
    return () => {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, []);

  return {
    status,
    location,
    error,
    startTracking,
    stopTracking,
  };
}