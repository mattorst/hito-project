
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getTrackingPointsByTrekking,
} from "../repositories/trackingRepository";

import type {
  TrackingTrekkingId,
  TrackingPoint,
} from "../types/tracking";

// ---------------------------------------------------------
// HITO — TRACKING GPS
//
// Genera una representación visual depurada.
// No modifica ni elimina registros de SQLite.
// No modifica los datos enviados a Django.
// ---------------------------------------------------------

export interface TrackingCoordinate {
  latitude: number;
  longitude: number;

  // Indica que no debe conectarse este punto
  // con el anterior mediante una línea.
  breakBefore?: boolean;
}

interface UseTrackingTrackResult {
  coordinates: TrackingCoordinate[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Valores iniciales conservadores para trekking.
// Deben validarse con pruebas reales en terreno.

const MAX_ACCURACY_METERS = 45;
const MIN_MOVEMENT_METERS = 4;
const MAX_WALKING_SPEED_MPS = 5.5;
const DISTANCE_TOLERANCE_METERS = 10;
const MAX_CONTINUOUS_GAP_SECONDS = 90;

// ---------------------------------------------------------
// DISTANCIA ENTRE DOS COORDENADAS — HAVERSINE
// ---------------------------------------------------------

function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadius = 6371000;
  const toRad = Math.PI / 180;

  const deltaLat = (lat2 - lat1) * toRad;
  const deltaLon = (lon2 - lon1) * toRad;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1 * toRad) *
      Math.cos(lat2 * toRad) *
      Math.sin(deltaLon / 2) ** 2;

  return (
    2 *
    earthRadius *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(Math.max(0, 1 - a)),
    )
  );
}

// ---------------------------------------------------------
// VALIDAR IDENTIDAD DEL TREKKING
// ---------------------------------------------------------

function isValidTrekkingId(
  trekkingId: TrackingTrekkingId,
): boolean {
  if (typeof trekkingId === "number") {
    return (
      Number.isInteger(trekkingId) &&
      trekkingId > 0
    );
  }

  return trekkingId.trim().length > 0;
}

// ---------------------------------------------------------
// VALIDAR COORDENADAS
// ---------------------------------------------------------

function isValidGpsPoint(
  point: TrackingPoint,
): boolean {
  const latitude = Number(point.latitude);
  const longitude = Number(point.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return false;
  }

  const accuracy = point.accuracy;

  if (accuracy !== null) {
    if (
      !Number.isFinite(accuracy) ||
      accuracy < 0 ||
      accuracy > MAX_ACCURACY_METERS
    ) {
      return false;
    }
  }

  return Number.isFinite(
    Date.parse(point.recordedAt),
  );
}

// ---------------------------------------------------------
// CONSTRUIR RECORRIDO PARA EL MAPA
// ---------------------------------------------------------

function buildVisualTrack(
  points: TrackingPoint[],
): TrackingCoordinate[] {
  const result: TrackingCoordinate[] = [];

  let previousAccepted: TrackingPoint | null =
    null;

  for (const point of points) {
    if (!isValidGpsPoint(point)) {
      continue;
    }

    const latitude = Number(point.latitude);
    const longitude = Number(point.longitude);

    if (!previousAccepted) {
      result.push({
        latitude,
        longitude,
        breakBefore: true,
      });

      previousAccepted = point;
      continue;
    }

    const previousTime = Date.parse(
      previousAccepted.recordedAt,
    );

    const currentTime = Date.parse(
      point.recordedAt,
    );

    const elapsedSeconds =
      (currentTime - previousTime) / 1000;

    // No unir registros duplicados o
    // con fechas inconsistentes.
    if (elapsedSeconds <= 0) {
      continue;
    }

    const distanceMeters =
      calculateDistanceMeters(
        previousAccepted.latitude,
        previousAccepted.longitude,
        latitude,
        longitude,
      );

    // Si pasó demasiado tiempo sin ubicaciones,
    // iniciamos un nuevo tramo visual.
    if (
      elapsedSeconds >
      MAX_CONTINUOUS_GAP_SECONDS
    ) {
      result.push({
        latitude,
        longitude,
        breakBefore: true,
      });

      previousAccepted = point;
      continue;
    }

    // Evitamos dibujar pequeñas oscilaciones
    // del GPS cuando el usuario apenas se mueve.
    if (
      distanceMeters <
      MIN_MOVEMENT_METERS
    ) {
      continue;
    }

    // Umbral flexible para absorber pequeñas
    // imprecisiones sin permitir grandes saltos.
    const maximumReasonableDistance =
      MAX_WALKING_SPEED_MPS *
        elapsedSeconds +
      DISTANCE_TOLERANCE_METERS;

    if (
      distanceMeters >
      maximumReasonableDistance
    ) {
      // Punto sospechoso.
      // No lo dibujamos, pero permanece
      // almacenado originalmente en SQLite.
      continue;
    }

    result.push({
      latitude,
      longitude,
      breakBefore: false,
    });

    previousAccepted = point;
  }

  return result;
}

// ---------------------------------------------------------
// HOOK PRINCIPAL
// ---------------------------------------------------------

export function useTrackingTrack(
  trekkingId: TrackingTrekkingId,
): UseTrackingTrackResult {
  const [coordinates, setCoordinates] =
    useState<TrackingCoordinate[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isValidTrekkingId(trekkingId)) {
      setCoordinates([]);
      setIsLoading(false);
      return;
    }

    try {
      const points =
        await getTrackingPointsByTrekking(
          trekkingId,
        );

      const visualTrack =
        buildVisualTrack(points);

      setCoordinates(visualTrack);
      setError(null);
    } catch (err) {
      console.error(
        "[Hito GPS] Error al recuperar el recorrido:",
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
    setCoordinates([]);
    setIsLoading(true);

    void refresh();
  }, [refresh]);

  return {
    coordinates,
    isLoading,
    error,
    refresh,
  };
}
