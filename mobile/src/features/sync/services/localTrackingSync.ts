import { withSyncLock } from "./syncLock";
import axios from "axios";

import apiClient from "@/api/client";
import { getDatabase } from "@/features/trekking/storage/database";

// ---------------------------------------------------------
// HITO — SINCRONIZACIÓN GPS OFFLINE-FIRST
//
// SQLite -> Django -> MySQL
//
// Conserva:
// - UUID original de cada punto.
// - Fecha y hora de captura.
// - Coordenadas y datos GPS.
// - Propietario del trekking.
//
// No elimina puntos locales.
// No modifica useTracking.ts.
// ---------------------------------------------------------

const BATCH_SIZE = 50;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface LocalTrackingPoint {
  local_id: string;
  trekking_local_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  recorded_at: string;
  sync_status: string;
}

interface LocalTrekking {
  local_id: string;
  server_id: number | null;
  owner_user_id: string | null;
}

interface TrackingPointPayload {
  local_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  recorded_at: string;
}

interface TrackingBatchPayload {
  trekking_local_id: string;
  points: TrackingPointPayload[];
}

interface TrackingBatchResponse {
  success: boolean;
  message?: string;
  data?: {
    trekking_id: number;
    acknowledged_point_ids: string[];
    created: number;
  };
}

export interface TrackingSyncFailure {
  trekkingLocalId: string;
  message: string;
}

export interface TrackingSyncResult {
  total: number;
  synchronized: number;
  failed: number;
  failures: TrackingSyncFailure[];
}

let synchronizationRunning = false;

// ---------------------------------------------------------
// VALIDACIONES
// ---------------------------------------------------------

function validateOwnerUserId(
  ownerUserId: string,
): void {
  if (!/^[1-9]\d*$/.test(ownerUserId.trim())) {
    throw new Error(
      "No fue posible identificar al usuario.",
    );
  }
}

function validatePoint(
  point: LocalTrackingPoint,
): void {
  if (
    !UUID_REGEX.test(point.local_id) ||
    !UUID_REGEX.test(point.trekking_local_id)
  ) {
    throw new Error(
      "Se encontró un punto GPS con UUID inválido.",
    );
  }

  if (
    !Number.isFinite(point.latitude) ||
    point.latitude < -90 ||
    point.latitude > 90
  ) {
    throw new Error(
      "Se encontró una latitud GPS inválida.",
    );
  }

  if (
    !Number.isFinite(point.longitude) ||
    point.longitude < -180 ||
    point.longitude > 180
  ) {
    throw new Error(
      "Se encontró una longitud GPS inválida.",
    );
  }

  if (
    !point.recorded_at ||
    !Number.isFinite(
      Date.parse(point.recorded_at),
    )
  ) {
    throw new Error(
      "Un punto GPS tiene una fecha inválida.",
    );
  }

  for (const value of [
    point.accuracy,
    point.altitude,
    point.speed,
  ]) {
    if (
      value !== null &&
      !Number.isFinite(value)
    ) {
      throw new Error(
        "Un punto GPS contiene valores no válidos.",
      );
    }
  }
}

// ---------------------------------------------------------
// OBTENER TREKKINGS CON PUNTOS PENDIENTES
// ---------------------------------------------------------

async function getTrekkingsWithPendingPoints(
  ownerUserId: string,
): Promise<LocalTrekking[]> {
  const db = await getDatabase();

  return db.getAllAsync<LocalTrekking>(
    `
    SELECT DISTINCT
      t.local_id,
      t.server_id,
      t.owner_user_id
    FROM local_trekkings t
    INNER JOIN tracking_points p
      ON p.trekking_local_id = t.local_id
    WHERE t.owner_user_id = ?
      AND p.sync_status = 'pending'
    ORDER BY t.started_at ASC;
    `,
    [ownerUserId],
  );
}

// ---------------------------------------------------------
// LEER PUNTOS PENDIENTES DE UNA EXCURSIÓN
// ---------------------------------------------------------

async function getPendingPoints(
  trekkingLocalId: string,
): Promise<LocalTrackingPoint[]> {
  const db = await getDatabase();

  return db.getAllAsync<LocalTrackingPoint>(
    `
    SELECT
      local_id,
      trekking_local_id,
      latitude,
      longitude,
      accuracy,
      altitude,
      speed,
      recorded_at,
      sync_status
    FROM tracking_points
    WHERE trekking_local_id = ?
      AND sync_status = 'pending'
    ORDER BY
      recorded_at ASC,
      id ASC;
    `,
    [trekkingLocalId],
  );
}

// ---------------------------------------------------------
// CONSTRUIR PAYLOAD
// ---------------------------------------------------------

function buildPayload(
  trekkingLocalId: string,
  points: LocalTrackingPoint[],
): TrackingBatchPayload {
  if (!UUID_REGEX.test(trekkingLocalId)) {
    throw new Error(
      "UUID del trekking inválido.",
    );
  }

  points.forEach(validatePoint);

  return {
    trekking_local_id: trekkingLocalId,

    points: points.map((point) => ({
      local_id: point.local_id,
      latitude: point.latitude,
      longitude: point.longitude,
      accuracy: point.accuracy,
      altitude: point.altitude,
      speed: point.speed,
      recorded_at: point.recorded_at,
    })),
  };
}

// ---------------------------------------------------------
// ERRORES
// ---------------------------------------------------------

function describeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data;

    if (
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }

    if (error.response?.status) {
      return (
        "Django rechazó los puntos GPS. " +
        `HTTP ${error.response.status}.`
      );
    }

    return (
      "No fue posible conectar con Django."
    );
  }

  return error instanceof Error
    ? error.message
    : "Error desconocido sincronizando GPS.";
}

// ---------------------------------------------------------
// ENVIAR LOTE A DJANGO
// ---------------------------------------------------------

async function sendBatch(
  trekking: LocalTrekking,
  points: LocalTrackingPoint[],
): Promise<string[]> {
  if (
    trekking.server_id === null ||
    !Number.isSafeInteger(trekking.server_id) ||
    trekking.server_id <= 0
  ) {
    throw new Error(
      "Primero debes sincronizar el inicio del trekking.",
    );
  }

  const payload = buildPayload(
    trekking.local_id,
    points,
  );

  const response =
    await apiClient.post<TrackingBatchResponse>(
      "/trekkings/sync/tracking/",
      payload,
    );

  const body = response.data;
  const result = body?.data;

  if (
    body?.success !== true ||
    !result ||
    result.trekking_id !== trekking.server_id
  ) {
    throw new Error(
      "Django no confirmó correctamente el trekking.",
    );
  }

  if (
    !Array.isArray(
      result.acknowledged_point_ids,
    )
  ) {
    throw new Error(
      "Django no devolvió los UUID confirmados.",
    );
  }

  const submittedIds = new Set(
    points.map(
      (point) => point.local_id.toLowerCase(),
    ),
  );

  const acknowledgedIds = new Set<string>();

  for (
    const receivedId of
    result.acknowledged_point_ids
  ) {
    if (
      typeof receivedId !== "string" ||
      !submittedIds.has(
        receivedId.toLowerCase(),
      )
    ) {
      throw new Error(
        "Django confirmó un UUID GPS desconocido.",
      );
    }

    acknowledgedIds.add(
      receivedId.toLowerCase(),
    );
  }

  if (acknowledgedIds.size !== points.length) {
    throw new Error(
      "Django no confirmó todos los puntos GPS enviados.",
    );
  }

  return points.map(
    (point) => point.local_id,
  );
}

// ---------------------------------------------------------
// MARCAR PUNTOS CONFIRMADOS EN SQLITE
// ---------------------------------------------------------

async function markPointsSynchronized(
  ownerUserId: string,
  trekking: LocalTrekking,
  points: LocalTrackingPoint[],
  acknowledgedIds: string[],
): Promise<void> {
  const db = await getDatabase();

  const acknowledged = new Set(
    acknowledgedIds.map(
      (id) => id.toLowerCase(),
    ),
  );

  await db.withExclusiveTransactionAsync(
    async (tx) => {
      const currentTrekking =
        await tx.getFirstAsync<LocalTrekking>(
          `
          SELECT
            local_id,
            server_id,
            owner_user_id
          FROM local_trekkings
          WHERE local_id = ?
            AND owner_user_id = ?
          LIMIT 1;
          `,
          [
            trekking.local_id,
            ownerUserId,
          ],
        );

      if (
        !currentTrekking ||
        currentTrekking.server_id !==
          trekking.server_id
      ) {
        throw new Error(
          "El trekking cambió durante la sincronización GPS.",
        );
      }

      // Verificar cada punto antes de modificar
      // su estado de sincronización.

      for (const point of points) {
        if (
          !acknowledged.has(
            point.local_id.toLowerCase(),
          )
        ) {
          throw new Error(
            "Existe un punto GPS no confirmado.",
          );
        }

        const current =
          await tx.getFirstAsync<LocalTrackingPoint>(
            `
            SELECT
              local_id,
              trekking_local_id,
              latitude,
              longitude,
              accuracy,
              altitude,
              speed,
              recorded_at,
              sync_status
            FROM tracking_points
            WHERE local_id = ?
              AND trekking_local_id = ?
            LIMIT 1;
            `,
            [
              point.local_id,
              trekking.local_id,
            ],
          );

        if (!current) {
          throw new Error(
            "Un punto GPS ya no existe en SQLite.",
          );
        }

        if (
          current.latitude !== point.latitude ||
          current.longitude !== point.longitude ||
          current.accuracy !== point.accuracy ||
          current.altitude !== point.altitude ||
          current.speed !== point.speed ||
          current.recorded_at !== point.recorded_at
        ) {
          throw new Error(
            "Un punto GPS cambió durante la sincronización.",
          );
        }

        if (
          current.sync_status !== "pending" &&
          current.sync_status !== "synced"
        ) {
          throw new Error(
            "Estado de sincronización GPS inválido.",
          );
        }
      }

      // Todos los puntos están validados.
      // Confirmamos únicamente los UUID
      // reconocidos por Django.

      for (const point of points) {
        await tx.runAsync(
          `
          UPDATE tracking_points
          SET sync_status = 'synced'
          WHERE local_id = ?
            AND trekking_local_id = ?
            AND sync_status = 'pending';
          `,
          [
            point.local_id,
            trekking.local_id,
          ],
        );
      }
    },
  );
}

// ---------------------------------------------------------
// SINCRONIZACIÓN PRINCIPAL
// ---------------------------------------------------------

async function syncPendingTrackingPointsInternal(
  ownerUserId: string,
): Promise<TrackingSyncResult> {
  validateOwnerUserId(ownerUserId);

  if (synchronizationRunning) {
    throw new Error(
      "Ya hay una sincronización GPS en curso.",
    );
  }

  synchronizationRunning = true;

  const result: TrackingSyncResult = {
    total: 0,
    synchronized: 0,
    failed: 0,
    failures: [],
  };

  try {
    const trekkings =
      await getTrekkingsWithPendingPoints(
        ownerUserId,
      );

    for (const trekking of trekkings) {
      try {
        const points = await getPendingPoints(
          trekking.local_id,
        );

        result.total += points.length;

        // Procesar secuencialmente para evitar
        // solicitudes simultáneas y reducir
        // conflictos de escritura SQLite.

        for (
          let index = 0;
          index < points.length;
          index += BATCH_SIZE
        ) {
          const batch = points.slice(
            index,
            index + BATCH_SIZE,
          );

          const acknowledgedIds =
            await sendBatch(
              trekking,
              batch,
            );

          await markPointsSynchronized(
            ownerUserId,
            trekking,
            batch,
            acknowledgedIds,
          );

          result.synchronized +=
            batch.length;
        }
      } catch (error) {
        const message = describeError(error);

        result.failed += 1;

        result.failures.push({
          trekkingLocalId:
            trekking.local_id,
          message,
        });

        console.warn(
          "HITO — Error sincronizando GPS:",
          trekking.local_id,
          message,
        );
      }
    }

    return result;
  } finally {
    synchronizationRunning = false;
  }
}

// Serializa sincronizaciones manuales y automáticas.
export async function syncPendingTrackingPoints(
  ownerUserId: string,
): Promise<TrackingSyncResult> {
  return withSyncLock("tracking", () =>
    syncPendingTrackingPointsInternal(ownerUserId),
  );
}
