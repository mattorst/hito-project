
import apiClient from "@/api/client";

import type {
  Checkpoint,
  Park,
  Trail,
} from "../types";

import {
  cacheParks,
  cacheTrails,
  cacheCheckpoints,
  cacheFullCatalog,
  getCachedParks,
  getCachedTrails,
  getCachedCheckpoints,
  getOfflineCatalogStatus,
} from "../storage/catalogStorage";

// =========================================================
// HITO — CATÁLOGO ONLINE / OFFLINE
// =========================================================

// ---------------------------------------------------------
// PARQUES
// ---------------------------------------------------------

export async function getParks(): Promise<Park[]> {
  try {
    const response = await apiClient.get<Park[]>(
      "/parks/",
    );

    await cacheParks(response.data);

    return response.data;
  } catch (error) {
    console.warn(
      "Parques: intentando utilizar caché offline.",
      error,
    );

    const cached = await getCachedParks();

    if (cached.length > 0) {
      return cached;
    }

    throw error;
  }
}

// ---------------------------------------------------------
// PARQUE POR ID
// ---------------------------------------------------------

export async function getParkById(
  parkId: number,
): Promise<Park | null> {
  if (
    !Number.isInteger(parkId) ||
    parkId <= 0
  ) {
    return null;
  }

  const parks = await getParks();

  return (
    parks.find((park) => park.id === parkId) ??
    null
  );
}

// ---------------------------------------------------------
// SENDEROS
// ---------------------------------------------------------

export async function getTrails(
  parkId?: number,
): Promise<Trail[]> {
  try {
    const response = await apiClient.get<Trail[]>(
      "/trails/",
      {
        params: parkId
          ? { park: parkId }
          : undefined,
      },
    );

    await cacheTrails(response.data);

    return response.data;
  } catch (error) {
    console.warn(
      "Senderos: intentando utilizar caché offline.",
      error,
    );

    const cached =
      await getCachedTrails(parkId);

    if (cached.length > 0) {
      return cached;
    }

    throw error;
  }
}

// ---------------------------------------------------------
// CHECKPOINTS
// ---------------------------------------------------------

export async function getCheckpoints(
  trailId?: number,
): Promise<Checkpoint[]> {
  try {
    const response =
      await apiClient.get<Checkpoint[]>(
        "/checkpoints/",
        {
          params: trailId
            ? { trail: trailId }
            : undefined,
        },
      );

    await cacheCheckpoints(response.data);

    return response.data;
  } catch (error) {
    console.warn(
      "Checkpoints: intentando utilizar caché offline.",
      error,
    );

    const cached =
      await getCachedCheckpoints(trailId);

    if (cached.length > 0) {
      return cached;
    }

    throw error;
  }
}

// ---------------------------------------------------------
// DESCARGAR CATÁLOGO OFFLINE COMPLETO
// ---------------------------------------------------------

export async function downloadOfflineCatalog() {
  // Descargamos las tres listas directamente
  // desde Django para asegurar que la descarga
  // sea completa antes de guardar el conjunto.

  const [
    parksResponse,
    trailsResponse,
    checkpointsResponse,
  ] = await Promise.all([
    apiClient.get<Park[]>("/parks/"),
    apiClient.get<Trail[]>("/trails/"),
    apiClient.get<Checkpoint[]>(
      "/checkpoints/",
    ),
  ]);

  // Una sola transacción SQLite:
  // si una operación falla, se revierte
  // toda esta actualización del catálogo.

  await cacheFullCatalog(
    parksResponse.data,
    trailsResponse.data,
    checkpointsResponse.data,
  );

  return getOfflineCatalogStatus();
}
