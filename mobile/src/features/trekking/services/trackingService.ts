import * as Crypto from "expo-crypto";
import type { LocationObject } from "expo-location";
import { watchLocation } from "./locationService";
import {
  createTrackingPoint,
} from "../repositories/trackingRepository";

export interface StartTrackingOptions {
  trekkingId: number;
  onLocation?: (location: LocationObject) => void;
  onPersistenceError?: (error: unknown) => void;
}

export async function startTracking(
  options: StartTrackingOptions,
) {
  return watchLocation(async (location) => {
    options.onLocation?.(location);

    try {
      await createTrackingPoint({
        localId: Crypto.randomUUID(),
        trekkingId: options.trekkingId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? null,
        altitude: location.coords.altitude ?? null,
        speed: location.coords.speed ?? null,
        recordedAt: new Date(location.timestamp).toISOString(),
      });
    } catch (error) {
      console.error(
        "Error al persistir punto GPS:",
        error,
      );

      options.onPersistenceError?.(error);
    }
  });
}
