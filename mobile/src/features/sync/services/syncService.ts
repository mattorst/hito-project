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
 * Función auxiliar para formatear y limitar decimales antes de enviar a Django
 */
function formatNumber(
  val: number | string | null | undefined,
  maxDecimals = 6,
): number | null {
  if (val === null || val === undefined) return null;
  const num = Number(val);
  if (isNaN(num)) return null;
  return Number(num.toFixed(maxDecimals));
}

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
  // 1. Obtener puntos pendientes desde SQLite
  const pendingPoints: TrackingPoint[] = await getPendingTrackingPoints(limit);

  if (pendingPoints.length === 0) {
    return {
      requested: 0,
      synchronized: 0,
      failed: 0,
      syncedLocalIds: [],
    };
  }

  // 2. Mapear del modelo SQLite local al contrato validado por Django
  const trackingPointsPayload: BackendTrackingPointPayload[] =
    pendingPoints.map((point) => {
      // Normalización estricta de fecha a ISO String válido
      const dateObj = new Date(point.recordedAt);
      const recordedAtIso = isNaN(dateObj.getTime())
        ? new Date().toISOString()
        : dateObj.toISOString();

      return {
        local_id: String(point.localId),
        trekking: Number(point.trekkingId),
        latitude: formatNumber(point.latitude, 6)!,
        longitude: formatNumber(point.longitude, 6)!,
        accuracy: formatNumber(point.accuracy, 2),
        altitude: formatNumber(point.altitude, 2),
        speed: formatNumber(point.speed, 2),
        recorded_at: recordedAtIso,
      };
    });

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