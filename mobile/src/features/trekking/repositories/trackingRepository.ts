import { getDatabase } from "../storage/database";
import type {
  TrackingPoint,
  TrackingSyncStatus,
} from "../types/tracking";

export interface CreateTrackingPointInput {
  localId: string;
  trekkingId: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  recordedAt: string;
}

function mapTrackingPoint(
  row: {
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
  },
): TrackingPoint {
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
  input: CreateTrackingPointInput,
): Promise<TrackingPoint> {
  const database = await getDatabase();

  const createdAt = new Date().toISOString();

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
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    input.localId,
    input.trekkingId,
    input.latitude,
    input.longitude,
    input.accuracy,
    input.altitude,
    input.speed,
    input.recordedAt,
    "pending",
    createdAt,
  );

  const row = await database.getFirstAsync<{
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
  }>(
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
      WHERE id = ?;
    `,
    result.lastInsertRowId,
  );

  if (!row) {
    throw new Error(
      "No fue posible recuperar el punto GPS creado.",
    );
  }

  return mapTrackingPoint(row);
}

export async function getPendingTrackingPoints(
  limit = 100,
): Promise<TrackingPoint[]> {
  const database = await getDatabase();

  const rows = await database.getAllAsync<{
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
  }>(
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
      ORDER BY recorded_at ASC
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

  const rows = await database.getAllAsync<{
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
  }>(
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
      ORDER BY recorded_at ASC;
    `,
    trekkingId,
  );

  return rows.map(mapTrackingPoint);
}