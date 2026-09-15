import { useCallback, useState } from "react";
import type { LocationObject } from "expo-location";
import {
  getCurrentLocation,
  getForegroundPermissionStatus,
  isLocationEnabled,
  requestForegroundPermission,
} from "../services/locationService";

export type LocationStatus =
  | "idle"
  | "checking"
  | "permission_undetermined"
  | "permission_denied"
  | "location_disabled"
  | "ready"
  | "error";

interface UseLocationResult {
  status: LocationStatus;
  location: LocationObject | null;
  error: string | null;
  hasPermission: boolean;
  isLocationEnabled: boolean | null;
  checkLocation: () => Promise<void>;
  requestPermission: () => Promise<void>;
  getLocation: () => Promise<void>;
}

export function useLocation(): UseLocationResult {
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [location, setLocation] = useState<LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState<boolean | null>(null);

  const checkLocation = useCallback(async () => {
    setStatus("checking");
    setError(null);

    try {
      const permissionStatus = await getForegroundPermissionStatus();

      if (permissionStatus === "undetermined") {
        setHasPermission(false);
        setLocation(null);
        setStatus("permission_undetermined");
        return;
      }

      if (permissionStatus === "denied") {
        setHasPermission(false);
        setLocation(null);
        setStatus("permission_denied");
        setError("Hito necesita permiso para acceder a tu ubicación.");
        return;
      }

      setHasPermission(true);

      const enabled = await isLocationEnabled();
      setLocationEnabled(enabled);

      if (!enabled) {
        setLocation(null);
        setStatus("location_disabled");
        setError("Los servicios de ubicación están desactivados. Actívalos para continuar.");
        return;
      }

      setStatus("ready");
    } catch (err) {
      console.error("Error al verificar ubicación:", err);
      setStatus("error");
      setError("No fue posible verificar el estado de la ubicación.");
    }
  }, []);

  const requestPermission = useCallback(async () => {
    setStatus("checking");
    setError(null);

    try {
      const permissionStatus = await requestForegroundPermission();

      if (permissionStatus !== "granted") {
        setHasPermission(false);
        setLocation(null);
        setStatus("permission_denied");
        setError("Hito necesita permiso para acceder a tu ubicación.");
        return;
      }

      setHasPermission(true);

      const enabled = await isLocationEnabled();
      setLocationEnabled(enabled);

      if (!enabled) {
        setLocation(null);
        setStatus("location_disabled");
        setError("Los servicios de ubicación están desactivados. Actívalos para continuar.");
        return;
      }

      setStatus("ready");
    } catch (err) {
      console.error("Error al solicitar permiso de ubicación:", err);
      setStatus("error");
      setError("No fue posible configurar el acceso a la ubicación.");
    }
  }, []);

  const getLocation = useCallback(async () => {
    setError(null);

    try {
      const permissionStatus = await getForegroundPermissionStatus();

      if (permissionStatus === "undetermined") {
        setHasPermission(false);
        setLocation(null);
        setStatus("permission_undetermined");
        return;
      }

      if (permissionStatus === "denied") {
        setHasPermission(false);
        setLocation(null);
        setStatus("permission_denied");
        setError("Hito necesita permiso para acceder a tu ubicación.");
        return;
      }

      setHasPermission(true);

      const enabled = await isLocationEnabled();
      setLocationEnabled(enabled);

      if (!enabled) {
        setLocation(null);
        setStatus("location_disabled");
        setError("Los servicios de ubicación están desactivados. Actívalos para continuar.");
        return;
      }

      setStatus("checking");

      const currentLocation = await getCurrentLocation();
      setLocation(currentLocation);
      setStatus("ready");
    } catch (err) {
      console.error("Error al obtener ubicación:", err);
      setStatus("error");
      setError("No fue posible obtener la ubicación actual. Inténtalo nuevamente.");
    }
  }, []);

  return {
    status,
    location,
    error,
    hasPermission,
    isLocationEnabled: locationEnabled,
    checkLocation,
    requestPermission,
    getLocation,
  };
}