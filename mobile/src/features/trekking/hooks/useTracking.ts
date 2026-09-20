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
  const [status, setStatus] = useState<TrackingStatus>("idle");
  const [location, setLocation] = useState<LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subscriptionRef = useRef<LocationSubscription | null>(null);
  const trackingSessionRef = useRef(0);

  const startTracking = useCallback(async () => {
    if (subscriptionRef.current) {
      return;
    }

    setStatus("starting");
    setError(null);

    const sessionId = trackingSessionRef.current + 1;
    trackingSessionRef.current = sessionId;

    try {
      const subscription = await watchLocation((newLocation) => {
        if (trackingSessionRef.current !== sessionId) {
          return;
        }

        setLocation(newLocation);
      });

      if (trackingSessionRef.current !== sessionId) {
        subscription.remove();
        return;
      }

      subscriptionRef.current = subscription;
      setStatus("tracking");
    } catch (err) {
      if (trackingSessionRef.current !== sessionId) {
        return;
      }

      console.error("Error al iniciar tracking:", err);
      setStatus("error");
      setError("No fue posible iniciar el seguimiento de ubicación.");
    }
  }, []);

  const stopTracking = useCallback(() => {
    trackingSessionRef.current += 1;

    const subscription = subscriptionRef.current;
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
    startTracking,
    stopTracking,
  };
}