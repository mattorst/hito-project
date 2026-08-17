import { syncQueue } from "./syncQueue";
import { synchronize } from "./syncService";

import type {
  SyncCheckpointRecord,
  SyncIncident,
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

  const checkpointEvents = events.filter(
    (event) => event.type === "checkpoint",
  );

  const incidentEvents = events.filter(
    (event) => event.type === "incident",
  );

  const checkpointRecords: SyncCheckpointRecord[] =
    checkpointEvents.map(
      (event) => event.payload as SyncCheckpointRecord,
    );

  const incidents: SyncIncident[] = incidentEvents.map(
    (event) => event.payload as SyncIncident,
  );

  const result = await synchronize({
    checkpoint_records: checkpointRecords,
    incidents,
  });

  const failedEventIds = new Set<string>();

  for (const failedEvent of result.data.failed) {
    if (failedEvent.type === "checkpoint_record") {
      const event = checkpointEvents[failedEvent.index];

      if (event) {
        failedEventIds.add(event.id);
      }
    }

    if (failedEvent.type === "incident") {
      const event = incidentEvents[failedEvent.index];

      if (event) {
        failedEventIds.add(event.id);
      }
    }
  }

  for (const event of events) {
    if (!failedEventIds.has(event.id)) {
      await syncQueue.remove(event.id);
    }
  }

  const remaining = await syncQueue.getAll();

  return {
    synchronized: events.length - failedEventIds.size,
    failed: failedEventIds.size,
    remaining: remaining.length,
  };
}