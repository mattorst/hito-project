import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getTrackingPointsByTrekking,
} from "../repositories/trackingRepository";

export interface TrackingCoordinate {
  latitude: number;
  longitude: number;
}

interface UseTrackingTrackResult {
  coordinates: TrackingCoordinate[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useTrackingTrack(
  trekkingId: number,
): UseTrackingTrackResult {
  const [coordinates, setCoordinates] = useState<
    TrackingCoordinate[]
  >([]);

  const [isLoading, setIsLoading] =
    useState<boolean>(true);

  const [error, setError] =
    useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const points =
        await getTrackingPointsByTrekking(
          trekkingId,
        );

      const validCoordinates = points
        .map((point) => {
          const latitude = Number(
            point.latitude,
          );

          const longitude = Number(
            point.longitude,
          );

          if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
          ) {
            return null;
          }

          if (
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
          ) {
            return null;
          }

          return {
            latitude,
            longitude,
          };
        })
        .filter(
          (
            coordinate,
          ): coordinate is TrackingCoordinate =>
            coordinate !== null,
        );

      setCoordinates(validCoordinates);
    } catch (err) {
      console.error(
        "Error al cargar el recorrido local:",
        err,
      );

      setError(
        "No fue posible cargar el recorrido registrado.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [trekkingId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    coordinates,
    isLoading,
    error,
    refresh,
  };
}