
import { getDatabase } from "../storage/database";

import type {
  TrackingPoint,
  TrackingSyncStatus,
  TrackingTrekkingId,
} from "../types/tracking";

export type CreateTrackingPointInput = {
  localId: string;

  trekkingId: number | null;
  trekkingLocalId?: string | null;

  latitude: number;
  longitude: number;

  accuracy?: number | null;
  altitude?: number | null;
  speed?: number | null;

  recordedAt: string;
};

type TrackingPointRow = {
  id: number;
  local_id: string;

  trekking_id: number | null;
  trekking_local_id: string | null;

  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;

  recorded_at: string;
  sync_status: TrackingSyncStatus;
  created_at: string;
};

const SELECT_COLUMNS = `
  id,
  local_id,
  trekking_id,
  trekking_local_id,
  latitude,
  longitude,
  accuracy,
  altitude,
  speed,
  recorded_at,
  sync_status,
  created_at
`;

function mapTrackingPoint(
  row: TrackingPointRow,
): TrackingPoint {
  return {
    id: row.id,
    localId: row.local_id,

    trekkingId: row.trekking_id,
    trekkingLocalId: row.trekking_local_id,

    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: row.accuracy,
    altitude: row.altitude,
    speed: row.speed,

    recordedAt: row.recorded_at,
    syncStatus: row.sync_status,
    createdAt: row.created_at,
  };
}

function validateTrekkingIdentity(
  trekkingId: TrackingTrekkingId,
): void {
  if (typeof trekkingId === "number") {
    if (!Number.isInteger(trekkingId) || trekkingId <= 0) {
      throw new Error(
        "El ID remoto del trekking debe ser un entero positivo.",
      );
    }

    return;
  }

  if (trekkingId.trim().length === 0) {
    throw new Error(
      "El UUID local del trekking no puede estar vacío.",
    );
  }
}

/**
 * Guarda una posición GPS.
 *
 * Puede estar asociada a:
 * - Un ID de Django.
 * - Un UUID de trekking local.
 * - Ambos, cuando la sesión ya fue reconciliada.
 */

export async function createTrackingPoint(
  data: CreateTrackingPointInput,
): Promise<number> {
  const trekkingLocalId = data.trekkingLocalId ?? null;

  if (data.trekkingId === null && trekkingLocalId === null) {
    throw new Error(
      "Cada punto GPS debe pertenecer a un trekking.",
    );
  }

  if (
    data.trekkingId !== null &&
    (!Number.isInteger(data.trekkingId) || data.trekkingId <= 0)
  ) {
    throw new Error("ID remoto de trekking inválido.");
  }

  if (
    !Number.isFinite(data.latitude) ||
    data.latitude < -90 ||
    data.latitude > 90 ||
    !Number.isFinite(data.longitude) ||
    data.longitude < -180 ||
    data.longitude > 180
  ) {
    throw new Error("Las coordenadas GPS no son válidas.");
  }

  const database = await getDatabase();
  const now = new Date().toISOString();

  // Una excursión local debe continuar IN_PROGRESS
  // en el instante exacto en que se guarda la posición.
  //
  // La transacción exclusiva impide que esta comprobación
  // y el INSERT se separen por un Check-Out concurrente.

  if (trekkingLocalId !== null) {
    let insertedId = 0;

    await database.withExclusiveTransactionAsync(async (tx) => {
      const result = await tx.runAsync(
        `
          INSERT INTO tracking_points (
            local_id,
            trekking_id,
            trekking_local_id,
            latitude,
            longitude,
            accuracy,
            altitude,
            speed,
            recorded_at,
            sync_status,
            created_at
          )
          SELECT
            ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            'pending', ?
          WHERE EXISTS (
            SELECT 1
            FROM local_trekkings
            WHERE local_id = ?
              AND status = 'IN_PROGRESS'
          );
        `,
        [
          data.localId,
          data.trekkingId,
          trekkingLocalId,
          data.latitude,
          data.longitude,
          data.accuracy ?? null,
          data.altitude ?? null,
          data.speed ?? null,
          data.recordedAt,
          now,
          trekkingLocalId,
        ],
      );

      // 0 significa que el trekking ya no admite
      // posiciones nuevas. No alteramos su historial.
      insertedId =
        result.changes === 1
          ? result.lastInsertRowId
          : 0;
    });

    return insertedId;
  }

  // Compatibilidad con el seguimiento remoto anterior.
  // No modificamos su modelo de persistencia.

  const result = await database.runAsync(
    `
      INSERT INTO tracking_points (
        local_id,
        trekking_id,
        trekking_local_id,
        latitude,
        longitude,
        accuracy,
        altitude,
        speed,
        recorded_at,
        sync_status,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?);
    `,
    [
      data.localId,
      data.trekkingId,
      null,
      data.latitude,
      data.longitude,
      data.accuracy ?? null,
      data.altitude ?? null,
      data.speed ?? null,
      data.recordedAt,
      now,
    ],
  );

  return result.lastInsertRowId;
}


/**
 * Recupera posiciones que ya tienen ID remoto.
 *
 * Las posiciones de trekkings todavía no sincronizados
 * permanecen en SQLite como 'pending'.
 */
export async function getPendingTrackingPoints(
  limit = 100,
): Promise<TrackingPoint[]> {
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error(
      "El límite de puntos debe ser un entero positivo.",
    );
  }

  const database = await getDatabase();

  const rows = await database.getAllAsync<TrackingPointRow>(
    `
      SELECT ${SELECT_COLUMNS}
      FROM tracking_points
      WHERE sync_status = 'pending'
        AND trekking_id IS NOT NULL
      ORDER BY recorded_at ASC, id ASC
      LIMIT ?;
    `,
    limit,
  );

  return rows.map(mapTrackingPoint);
}

/**
 * Recupera puntos de una excursión por:
 * - ID remoto numérico.
 * - UUID local.
 */
export async function getTrackingPointsByTrekking(
  trekkingId: TrackingTrekkingId,
): Promise<TrackingPoint[]> {
  validateTrekkingIdentity(trekkingId);

  const database = await getDatabase();

  const isLocal = typeof trekkingId === "string";

  const query = isLocal
    ? `
        SELECT ${SELECT_COLUMNS}
        FROM tracking_points
        WHERE trekking_local_id = ?
        ORDER BY recorded_at ASC, id ASC;
      `
    : `
        SELECT ${SELECT_COLUMNS}
        FROM tracking_points
        WHERE trekking_id = ?
        ORDER BY recorded_at ASC, id ASC;
      `;

  const rows = await database.getAllAsync<TrackingPointRow>(
    query,
    trekkingId,
  );

  return rows.map(mapTrackingPoint);
}

export async function getLatestTrackingPoint():
  Promise<TrackingPoint | null> {
  const database = await getDatabase();

  const row = await database.getFirstAsync<TrackingPointRow>(
    `
      SELECT ${SELECT_COLUMNS}
      FROM tracking_points
      ORDER BY id DESC
      LIMIT 1;
    `,
  );

  return row ? mapTrackingPoint(row) : null;
}

/**
 * Marca únicamente los UUID confirmados por Django.
 */
export async function markTrackingPointsAsSynced(
  localIds: string[],
): Promise<void> {
  if (localIds.length === 0) {
    return;
  }

  const database = await getDatabase();

  await database.withExclusiveTransactionAsync(
    async (tx) => {
      for (const localId of localIds) {
        await tx.runAsync(
          `
            UPDATE tracking_points
            SET sync_status = 'synced'
            WHERE local_id = ?
              AND sync_status = 'pending';
          `,
          localId,
        );
      }
    },
  );
}

/**
 * Vincula a un trekking local con su ID remoto.
 *
 * Se ejecutará cuando Django confirme el inicio
 * idempotente de la excursión.
 *
 * La transacción actualiza también las posiciones GPS
 * que fueron capturadas antes de recuperar Internet.
 */
export async function reconcileTrackingTrekkingId(
  trekkingLocalId: string,
  serverId: number,
): Promise<void> {
  if (!trekkingLocalId.trim()) {
    throw new Error(
      "El UUID local del trekking es obligatorio.",
    );
  }

  if (!Number.isInteger(serverId) || serverId <= 0) {
    throw new Error(
      "El ID remoto del trekking no es válido.",
    );
  }

  const database = await getDatabase();

  await database.withExclusiveTransactionAsync(
    async (tx) => {
      const localTrekking = await tx.getFirstAsync<{
        local_id: string;
        server_id: number | null;
      }>(
        `
          SELECT local_id, server_id
          FROM local_trekkings
          WHERE local_id = ?;
        `,
        trekkingLocalId,
      );

      if (!localTrekking) {
        throw new Error(
          "No existe el trekking local para reconciliar.",
        );
      }

      if (
        localTrekking.server_id !== null &&
        localTrekking.server_id !== serverId
      ) {
        throw new Error(
          "El trekking local ya está vinculado a otro ID remoto.",
        );
      }

      await tx.runAsync(
        `
          UPDATE local_trekkings
          SET server_id = ?,
              sync_status = 'synced'
          WHERE local_id = ?;
        `,
        serverId,
        trekkingLocalId,
      );

      await tx.runAsync(
        `
          UPDATE tracking_points
          SET trekking_id = ?
          WHERE trekking_local_id = ?
            AND trekking_id IS NULL;
        `,
        serverId,
        trekkingLocalId,
      );
    },
  );
}

export async function getPendingTrackingPointCount():
  Promise<number> {
  const database = await getDatabase();

  const row = await database.getFirstAsync<{
    count: number;
  }>(
    `
      SELECT COUNT(*) AS count
      FROM tracking_points
      WHERE sync_status = 'pending';
    `,
  );

  return row?.count ?? 0;
}

export async function getTrackingPointCountByStatus(
  status: TrackingSyncStatus,
): Promise<number> {
  const database = await getDatabase();

  const row = await database.getFirstAsync<{
    count: number;
  }>(
    `
      SELECT COUNT(*) AS count
      FROM tracking_points
      WHERE sync_status = ?;
    `,
    status,
  );

  return row?.count ?? 0;
}
