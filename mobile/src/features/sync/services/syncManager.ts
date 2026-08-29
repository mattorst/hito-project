import { syncQueue } from "./syncQueue";
import { synchronize } from "./syncService";
import { createIncident } from "@/features/incidents/services/incidentService";
import { incidentPhotoExists, deleteIncidentPhoto } from "@/features/incidents/services/incidentFileStorage";

import type {
  SyncCheckpointRecord,
  IncidentSyncPayload,
  SyncEvent,
} from "../types";

interface SyncManagerResult {
  synchronized: number;
  failed: number;
  remaining: number;
}

export async function syncPendingEvents(): Promise<SyncManagerResult> {
  const events = await syncQueue.getAll();

  if (events.length === 0) {
    return {
      synchronized: 0,
      failed: 0,
      remaining: 0,
    };
  }

  let synchronizedCount = 0;
  let failedCount = 0;

  // 1. Sincronizar Checkpoints de forma masiva (si existen)
  const checkpointEvents = events.filter(
    (event) => event.type === "checkpoint",
  );

  if (checkpointEvents.length > 0) {
    const checkpointRecords: SyncCheckpointRecord[] =
      checkpointEvents.map(
        (event) => event.payload as SyncCheckpointRecord,
      );

    try {
      const result = await synchronize({
        checkpoint_records: checkpointRecords,
        incidents: [],
      });

      const failedCheckpointIndices = new Set(
        result.data.failed
          .filter((f) => f.type === "checkpoint_record")
          .map((f) => f.index),
      );

      for (let i = 0; i < checkpointEvents.length; i++) {
        const event = checkpointEvents[i];
        if (!failedCheckpointIndices.has(i)) {
          await syncQueue.remove(event.id);
          synchronizedCount++;
        } else {
          failedCount++;
        }
      }
    } catch (err) {
      console.error("Error sincronizando lote de checkpoints:", err);
      failedCount += checkpointEvents.length;
    }
  }

  // 2. Sincronizar Incidentes uno por uno (por el manejo de la foto multipart)
  const incidentEvents = events.filter(
    (event) => event.type === "incident",
  );

  for (const event of incidentEvents) {
    const payload = event.payload as IncidentSyncPayload;

    try {
      // Verificar si la foto local existe antes de enviar (si es que lleva foto)
      if (payload.photoUri) {
        const exists = await incidentPhotoExists(payload.photoUri);
        if (!exists) {
          throw new Error("La fotografía local del incidente ya no existe.");
        }
      }

      // Reconstruimos el objeto CreateIncidentRequest que espera createIncident
      const incidentResponse = await createIncident({
        trekking: payload.trekking,
        incident_type: payload.incident_type as any,
        description: payload.description,
        latitude: payload.latitude,
        longitude: payload.longitude,
        registered_at: payload.registered_at,
        photo: payload.photoUri,
      });

      if (incidentResponse) {
        // Éxito: removemos de la cola y borramos la foto local temporal
        await syncQueue.remove(event.id);
        if (payload.photoUri) {
          await deleteIncidentPhoto(payload.photoUri);
        }
        synchronizedCount++;
      } else {
        failedCount++;
      }
    } catch (err) {
      console.error(`Error sincronizando incidente offline ${event.id}:`, err);
      failedCount++;
    }
  }

  const remaining = await syncQueue.getAll();

  return {
    synchronized: synchronizedCount,
    failed: failedCount,
    remaining: remaining.length,
  };
}