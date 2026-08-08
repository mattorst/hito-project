import { syncQueue } from "./syncQueue";
import { syncService, SyncPayload } from "./syncService";

export const syncManager = {
  async synchronize(): Promise<void> {
    try {
      const queue = await syncQueue.getAll();
      if (queue.length === 0) return;

      // 1. Agrupar los eventos por tipo para construir el payload que espera Django
      const checkpointRecords: any[] = [];
      const incidents: any[] = [];

      // Mantenemos un registro del mapeo de índices para saber qué ID de evento corresponde a cada índice del backend
      const mapping: { type: string; originalId: string }[] = [];

      queue.forEach((item) => {
        if (item.type === "checkpoint") {
          checkpointRecords.push(item.payload);
          mapping.push({ type: "checkpoint", originalId: item.id });
        } else if (item.type === "incident") {
          incidents.push(item.payload);
          mapping.push({ type: "incident", originalId: item.id });
        }
      });

      const payload: SyncPayload = {};
      if (checkpointRecords.length > 0) payload.checkpoint_records = checkpointRecords;
      if (incidents.length > 0) payload.incidents = incidents;

      // 2. Enviar al backend
      const response = await syncService.syncBatch(payload);

      if (response.success) {
        // El backend devuelve los índices que fallaron. Identificamos cuáles se sincronizaron con éxito.
        const failedIndices = response.data.failed.map((f) => f.index);
        const successfulIds: string[] = [];
        
        mappingforEachMemoized:
        mapping.forEach((item, index) => {
          if (!failedIndices.includes(index)) {
            successfulIds.push(item.originalId);
          }
        });

        // 3. Eliminar de la cola únicamente los eventos que se sincronizaron con éxito
        await syncQueue.remove(successfulIds);
      }
    } catch (error) {
      console.error("Sync process failed (offline or network error):", error);
    }
  },
};