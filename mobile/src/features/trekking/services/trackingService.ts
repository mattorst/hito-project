
import * as Crypto from "expo-crypto";
import type { LocationObject } from "expo-location";

import { watchLocation } from "./locationService";

import {
  createTrackingPoint,
} from "../repositories/trackingRepository";

import type {
  TrackingTrekkingId,
} from "../types/tracking";

export interface StartTrackingOptions {
  trekkingId: TrackingTrekkingId;

  onLocation?: (
    location: LocationObject,
  ) => void;

  onPersistenceError?: (
    error: unknown,
  ) => void;
}

export async function startTracking(
  options: StartTrackingOptions,
) {
  return watchLocation(async (location) => {

    // -------------------------------------------------------
    // Validación de precisión GPS
    // -------------------------------------------------------

    const accuracy = location.coords.accuracy;

    // Ignorar posiciones cuya precisión horizontal
    // sea desconocida, inválida o superior a 50 metros.
    if (
      accuracy === null ||
      !Number.isFinite(accuracy) ||
      accuracy < 0 ||
      accuracy > 50
    ) {
      return;
    }

    // Solo informar posiciones que superan
    // la validación de precisión.
    options.onLocation?.(location);

    try {
      const isLocalTrekking =
        typeof options.trekkingId === "string";

      await createTrackingPoint({
        localId: Crypto.randomUUID(),

        trekkingId: isLocalTrekking
          ? null
          : options.trekkingId as number,

        trekkingLocalId: isLocalTrekking
          ? options.trekkingId as string
          : null,

        latitude: location.coords.latitude,
        longitude: location.coords.longitude,

        accuracy: location.coords.accuracy ?? null,
        altitude: location.coords.altitude ?? null,
        speed: location.coords.speed ?? null,

        recordedAt: new Date(
          location.timestamp,
        ).toISOString(),
      });
    } catch (error) {
      console.error(
        "Error al guardar posición GPS:",
        error,
      );

      options.onPersistenceError?.(error);
    }
  });
}
