import client from "@/api/client";
import {
  getPendingTrackingPoints,
  markTrackingPointsAsSynced,
} from "@/features/trekking/repositories/trackingRepository";
import type { TrackingPoint } from "@/features/trekking/types/tracking";
import type {
  BackendTrackingPointPayload,
  SyncRequest,
  SyncResponse,
  SyncTrackingResult,
} from "../types";

/**
 * Función base para enviar el payload al endpoint /sync/
 */
export async function synchronize(
  payload: SyncRequest,
): Promise<SyncResponse> {
  const response = await client.post<SyncResponse>("/sync/", payload);
  return response.data;
}

/**
 * Sincroniza bajo demanda los puntos GPS en estado 'pending'.
 * Obtiene los registros desde SQLite, los envía al backend y marca
 * los UUIDs confirmados como 'synced'.
 */
export async function syncTrackingPoints(
  limit = 100,
): Promise<SyncTrackingResult> {
  // 1. Obtener puntos pendientes desde SQLite utilizando tu función real
  const pendingPoints: TrackingPoint[] = await getPendingTrackingPoints(limit);

  if (pendingPoints.length === 0) {
    return {
      requested: 0,
      synchronized: 0,
      failed: 0,
      syncedLocalIds: [],
    };
  }

  // 2. Mapear del modelo SQLite local al contrato OpenAPI
  const trackingPointsPayload: BackendTrackingPointPayload[] =
    pendingPoints.map((point) => ({
      local_id: point.localId,
      trekking: point.trekkingId,
      latitude: point.latitude,
      longitude: point.longitude,
      accuracy: point.accuracy ?? null,
      altitude: point.altitude ?? null,
      speed: point.speed ?? null,
      recorded_at: new Date(point.recordedAt).toISOString(),
    }));

  const payload: SyncRequest = {
    tracking_points: trackingPointsPayload,
  };

  // 3. Enviar solicitud al servidor
  const syncResponse = await synchronize(payload);

  const syncData = syncResponse.data;
  const syncedLocalIds = syncData.synced_local_ids || [];

  // 4. Marcar en SQLite local los UUIDs confirmados por el servidor
  if (syncedLocalIds.length > 0) {
    await markTrackingPointsAsSynced(syncedLocalIds);
  }

  return {
    requested: pendingPoints.length,
    synchronized: syncData.synchronized?.tracking_points || 0,
    failed: syncData.failed.length,
    syncedLocalIds,
  };
}