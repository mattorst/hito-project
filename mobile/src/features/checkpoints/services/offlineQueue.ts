import { PendingCheckpointEvent } from "../types";

export async function enqueueCheckpoint(
  event: PendingCheckpointEvent,
): Promise<void> {
  // TODO (M6.4):
  // Persistir en AsyncStorage / SQLite y sincronizar posteriormente.

  console.log("Checkpoint pendiente de sincronización:", event);
}