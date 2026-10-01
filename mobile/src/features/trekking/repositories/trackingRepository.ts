import { getDatabase } from "../storage/database";
import type {
  TrackingPoint,
  TrackingSyncStatus,
} from "../types/tracking";

export type CreateTrackingPointInput = {
  localId: string;
  trekkingId: number;
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
  trekking_id: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  recorded_at: string;
  sync_status: TrackingSyncStatus;
  created_at: string;
};

function mapTrackingPoint(row: TrackingPointRow): TrackingPoint {
  return {
    id: row.id,
    localId: row.local_id,
    trekkingId: row.trekking_id,
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

export async function createTrackingPoint(
  data: CreateTrackingPointInput,
): Promise<number> {
  const database = await getDatabase();
  const now = new Date().toISOString();

  const result = await database.runAsync(
    `
      INSERT INTO tracking_points (
        local_id,
        trekking_id,
        latitude,
        longitude,
        accuracy,
        altitude,
        speed,
        recorded_at,
        sync_status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?);
    `,
    data.localId,
    data.trekkingId,
    data.latitude,
    data.longitude,
    data.accuracy ?? null,
    data.altitude ?? null,
    data.speed ?? null,
    data.recordedAt,
    now,
  );

  return result.lastInsertRowId;
}

export async function getPendingTrackingPoints(
  limit = 100,
): Promise<TrackingPoint[]> {
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error(
      "El límite de puntos pendientes debe ser un entero positivo.",
    );
  }

  const database = await getDatabase();

  const rows = await database.getAllAsync<TrackingPointRow>(
    `
      SELECT
        id,
        local_id,
        trekking_id,
        latitude,
        longitude,
        accuracy,
        altitude,
        speed,
        recorded_at,
        sync_status,
        created_at
      FROM tracking_points
      WHERE sync_status = 'pending'
      ORDER BY recorded_at ASC, id ASC
      LIMIT ?;
    `,
    limit,
  );

  return rows.map(mapTrackingPoint);
}

export async function getTrackingPointsByTrekking(
  trekkingId: number,
): Promise<TrackingPoint[]> {
  const database = await getDatabase();

  const rows = await database.getAllAsync<TrackingPointRow>(
    `
      SELECT
        id,
        local_id,
        trekking_id,
        latitude,
        longitude,
        accuracy,
        altitude,
        speed,
        recorded_at,
        sync_status,
        created_at
      FROM tracking_points
      WHERE trekking_id = ?
      ORDER BY recorded_at ASC, id ASC;
    `,
    trekkingId,
  );

  return rows.map(mapTrackingPoint);
}

export async function getLatestTrackingPoint(): Promise<TrackingPoint | null> {
  const database = await getDatabase();

  const row = await database.getFirstAsync<TrackingPointRow>(
    `
      SELECT
        id,
        local_id,
        trekking_id,
        latitude,
        longitude,
        accuracy,
        altitude,
        speed,
        recorded_at,
        sync_status,
        created_at
      FROM tracking_points
      ORDER BY id DESC
      LIMIT 1;
    `,
  );

  return row ? mapTrackingPoint(row) : null;
}

export async function markTrackingPointsAsSynced(
  localIds: string[],
): Promise<void> {
  if (localIds.length === 0) {
    return;
  }

  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    for (const localId of localIds) {
      await database.runAsync(
        `
          UPDATE tracking_points
          SET sync_status = 'synced'
          WHERE local_id = ?
            AND sync_status = 'pending';
        `,
        localId,
      );
    }
  });
}

export async function getPendingTrackingPointCount(): Promise<number> {
  const database = await getDatabase();

  const row = await database.getFirstAsync<{ count: number }>(
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

  const row = await database.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) AS count
      FROM tracking_points
      WHERE sync_status = ?;
    `,
    [status],
  );

  return row?.count ?? 0;
}