
import { withSyncLock } from "./syncLock";
import axios from "axios";

import apiClient from "@/api/client";
import { getDatabase } from "@/features/trekking/storage/database";

// HITO — Sincronización QR offline-first.
// Cada evento conserva su UUID. Nunca se eliminan datos locales.

const VALID_EVENT_TYPES = [
  "CHECK_IN",
  "CHECKPOINT_OUTBOUND",
  "SUMMIT_ARRIVAL",
  "SUMMIT_DESCENT",
  "CHECKPOINT_RETURN",
  "CHECK_OUT",
] as const;

type QrEventType = (typeof VALID_EVENT_TYPES)[number];

interface PendingEventRow {
  local_id: string;
  trekking_local_id: string;
  checkpoint_id: number;
  qr_identifier: string;
  event_type: string;
  occurred_at: string;
  sync_status: string;
}

interface LocalTrekkingRow {
  local_id: string;
  server_id: number | null;
  status: string;
  sync_status: string;
  owner_user_id: string | null;
}

interface QrSyncPayload {
  trekking_local_id: string;
  events: {
    local_id: string;
    checkpoint_id: number;
    qr_identifier: string;
    event_type: QrEventType;
    occurred_at: string;
  }[];
}

interface QrSyncResponse {
  success: boolean;
  message?: string;
  data?: {
    trekking_id: number;
    acknowledged_event_ids: string[];
    created: number;
    status: string;
  };
}

export interface QrSyncFailure {
  localId: string;
  eventType: string;
  message: string;
}

export interface QrSyncResult {
  total: number;
  synchronized: number;
  failed: number;
  skipped: number;
  failures: QrSyncFailure[];
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let syncRunning = false;

function validateOwner(ownerUserId: string): void {
  if (!/^[1-9]\d*$/.test(ownerUserId)) {
    throw new Error("No fue posible identificar al propietario de los registros.");
  }
}

function validateEvent(
  event: PendingEventRow,
): asserts event is PendingEventRow & { event_type: QrEventType } {
  if (
    !UUID_REGEX.test(event.local_id) ||
    !UUID_REGEX.test(event.trekking_local_id)
  ) {
    throw new Error("El evento contiene un UUID inválido.");
  }

  if (!Number.isSafeInteger(event.checkpoint_id) || event.checkpoint_id <= 0) {
    throw new Error("El checkpoint tiene un identificador inválido.");
  }

  if (!VALID_EVENT_TYPES.some((type) => type === event.event_type)) {
    throw new Error(`Tipo de evento no admitido: ${event.event_type}`);
  }

  if (!event.qr_identifier.trim()) {
    throw new Error("El evento no contiene su identificador QR.");
  }

  if (!event.occurred_at || Number.isNaN(Date.parse(event.occurred_at))) {
    throw new Error("El evento tiene una fecha inválida.");
  }
}

async function getPendingEvents(ownerUserId: string): Promise<PendingEventRow[]> {
  const db = await getDatabase();

  return db.getAllAsync<PendingEventRow>(
    `SELECT e.local_id, e.trekking_local_id, e.checkpoint_id,
            e.qr_identifier, e.event_type, e.occurred_at, e.sync_status
     FROM local_checkpoint_events e
     INNER JOIN local_trekkings t ON t.local_id = e.trekking_local_id
     WHERE t.owner_user_id = ? AND e.sync_status = 'pending'
     ORDER BY t.started_at ASC, e.occurred_at ASC,
              e.created_at ASC, e.rowid ASC;`,
    [ownerUserId],
  );
}

async function getLocalTrekking(
  trekkingLocalId: string,
  ownerUserId: string,
): Promise<LocalTrekkingRow | null> {
  const db = await getDatabase();

  return db.getFirstAsync<LocalTrekkingRow>(
    `SELECT local_id, server_id, status, sync_status, owner_user_id
     FROM local_trekkings
     WHERE local_id = ? AND owner_user_id = ? LIMIT 1;`,
    [trekkingLocalId, ownerUserId],
  );
}

function describeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data;

    if (
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string" &&
      data.message.trim()
    ) {
      return data.message;
    }

    if (error.response?.status) {
      return `Django rechazó el evento (HTTP ${error.response.status}).`;
    }

    return "No fue posible establecer conexión con Django.";
  }

  return error instanceof Error
    ? error.message
    : "Error desconocido durante la sincronización QR.";
}

// Valida que Django reconozca el trekking y el UUID del evento.
async function sendOneEvent(
  event: PendingEventRow,
  serverTrekkingId: number,
): Promise<string> {
  validateEvent(event);

  const payload: QrSyncPayload = {
    trekking_local_id: event.trekking_local_id,
    events: [{
      local_id: event.local_id,
      checkpoint_id: event.checkpoint_id,
      qr_identifier: event.qr_identifier,
      event_type: event.event_type,
      occurred_at: event.occurred_at,
    }],
  };

  const response = await apiClient.post<QrSyncResponse>(
    "/trekkings/sync/checkpoints/",
    payload,
  );

  const body = response.data;
  const result = body?.data;

  if (
    body?.success !== true ||
    !result ||
    !Number.isSafeInteger(result.trekking_id) ||
    result.trekking_id !== serverTrekkingId
  ) {
    throw new Error("Django no confirmó correctamente el trekking del evento.");
  }

  if (
    !Array.isArray(result.acknowledged_event_ids) ||
    !result.acknowledged_event_ids.some(
      (id) =>
        typeof id === "string" &&
        id.toLowerCase() === event.local_id.toLowerCase(),
    )
  ) {
    throw new Error("Django no confirmó el UUID del evento QR.");
  }

  if (typeof result.status !== "string") {
    throw new Error("Django no devolvió un estado válido del trekking.");
  }

  // Para el Check-Out también exigimos confirmación del cierre.
  if (event.event_type === "CHECK_OUT" && result.status !== "COMPLETED") {
    throw new Error("Django reconoció el Check-Out, pero no confirmó COMPLETED.");
  }

  return result.status;
}

// Actualiza exclusivamente el evento QR validado.
async function markEventSynchronized(
  event: PendingEventRow,
  ownerUserId: string,
  serverTrekkingId: number,
): Promise<void> {
  const db = await getDatabase();

  await db.withExclusiveTransactionAsync(async (tx) => {
    const existing = await tx.getFirstAsync<
      PendingEventRow & {
        server_id: number | null;
        owner_user_id: string | null;
      }
    >(
      `SELECT e.local_id, e.trekking_local_id, e.checkpoint_id,
              e.qr_identifier, e.event_type, e.occurred_at, e.sync_status,
              t.server_id, t.owner_user_id
       FROM local_checkpoint_events e
       INNER JOIN local_trekkings t ON t.local_id = e.trekking_local_id
       WHERE e.local_id = ? AND t.owner_user_id = ? LIMIT 1;`,
      [event.local_id, ownerUserId],
    );

    if (!existing) {
      throw new Error(
        "El evento desapareció de SQLite antes de confirmar su sincronización.",
      );
    }

    if (
      existing.server_id !== serverTrekkingId ||
      existing.trekking_local_id !== event.trekking_local_id ||
      existing.checkpoint_id !== event.checkpoint_id ||
      existing.qr_identifier !== event.qr_identifier ||
      existing.event_type !== event.event_type ||
      existing.occurred_at !== event.occurred_at
    ) {
      throw new Error("El evento local cambió durante la sincronización.");
    }

    if (existing.sync_status === "synced") return;

    if (existing.sync_status !== "pending") {
      throw new Error("El evento tiene un estado de sincronización desconocido.");
    }

    const update = await tx.runAsync(
      `UPDATE local_checkpoint_events
       SET sync_status = 'synced'
       WHERE local_id = ?
         AND trekking_local_id = ?
         AND sync_status = 'pending';`,
      [event.local_id, event.trekking_local_id],
    );

    if (update.changes !== 1) {
      throw new Error("No fue posible confirmar el evento en SQLite.");
    }
  });
}

// Encuentra trekkings completados cuyo indicador sigue pendiente.
// También permite recuperar excursiones cerradas anteriormente.
async function getCompletedPendingTrekkings(
  ownerUserId: string,
): Promise<LocalTrekkingRow[]> {
  const db = await getDatabase();

  return db.getAllAsync<LocalTrekkingRow>(
    `SELECT t.local_id, t.server_id, t.status,
            t.sync_status, t.owner_user_id
     FROM local_trekkings t
     WHERE t.owner_user_id = ?
       AND t.status = 'COMPLETED'
       AND t.sync_status = 'pending'
       AND t.server_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM local_checkpoint_events e
         WHERE e.trekking_local_id = t.local_id
           AND e.event_type = 'CHECK_OUT'
           AND e.sync_status = 'synced'
       )
       AND NOT EXISTS (
         SELECT 1 FROM local_checkpoint_events e
         WHERE e.trekking_local_id = t.local_id
           AND e.sync_status <> 'synced'
       )
     ORDER BY t.started_at ASC;`,
    [ownerUserId],
  );
}

// Recupera el Check-Out original. Nunca crea un nuevo UUID.
async function getSynchronizedCheckOut(
  trekkingLocalId: string,
): Promise<PendingEventRow | null> {
  const db = await getDatabase();

  return db.getFirstAsync<PendingEventRow>(
    `SELECT local_id, trekking_local_id, checkpoint_id,
            qr_identifier, event_type, occurred_at, sync_status
     FROM local_checkpoint_events
     WHERE trekking_local_id = ?
       AND event_type = 'CHECK_OUT'
       AND sync_status = 'synced'
     ORDER BY occurred_at DESC, created_at DESC, rowid DESC
     LIMIT 1;`,
    [trekkingLocalId],
  );
}

// Confirma el trekking dentro de una transacción segura.
// Exige cierre local, Check-Out y todos los QR sincronizados.
async function markCompletedTrekkingSynchronized(
  trekkingLocalId: string,
  ownerUserId: string,
  serverTrekkingId: number,
  checkOutLocalId: string,
): Promise<void> {
  const db = await getDatabase();

  await db.withExclusiveTransactionAsync(async (tx) => {
    const current = await tx.getFirstAsync<LocalTrekkingRow>(
      `SELECT local_id, server_id, status, sync_status, owner_user_id
       FROM local_trekkings
       WHERE local_id = ? AND owner_user_id = ? LIMIT 1;`,
      [trekkingLocalId, ownerUserId],
    );

    if (!current || current.server_id !== serverTrekkingId) {
      throw new Error(
        "El trekking local no coincide con el confirmado por Django.",
      );
    }

    if (current.status !== "COMPLETED") {
      throw new Error("El trekking local todavía no está finalizado.");
    }

    if (current.sync_status === "synced") return;

    if (current.sync_status !== "pending") {
      throw new Error(
        "El trekking tiene un estado de sincronización desconocido.",
      );
    }

    const summary = await tx.getFirstAsync<{
      total: number;
      not_synced: number;
      checkouts: number;
      checkout_confirmed: number;
    }>(
      `SELECT COUNT(*) AS total,
              COALESCE(
                SUM(CASE WHEN sync_status <> 'synced'
                         THEN 1 ELSE 0 END), 0
              ) AS not_synced,
              COALESCE(
                SUM(CASE WHEN event_type = 'CHECK_OUT'
                         THEN 1 ELSE 0 END), 0
              ) AS checkouts,
              COALESCE(
                SUM(CASE WHEN event_type = 'CHECK_OUT'
                          AND local_id = ?
                          AND sync_status = 'synced'
                         THEN 1 ELSE 0 END), 0
              ) AS checkout_confirmed
       FROM local_checkpoint_events
       WHERE trekking_local_id = ?;`,
      [checkOutLocalId, trekkingLocalId],
    );

    if (
      !summary ||
      summary.total < 2 ||
      summary.not_synced !== 0 ||
      summary.checkouts !== 1 ||
      summary.checkout_confirmed !== 1
    ) {
      throw new Error(
        "El cierre no puede confirmarse: faltan eventos QR sincronizados.",
      );
    }

    const last = await tx.getFirstAsync<{
      local_id: string;
      event_type: string;
    }>(
      `SELECT local_id, event_type
       FROM local_checkpoint_events
       WHERE trekking_local_id = ?
       ORDER BY occurred_at DESC, created_at DESC, rowid DESC
       LIMIT 1;`,
      [trekkingLocalId],
    );

    if (
      !last ||
      last.event_type !== "CHECK_OUT" ||
      last.local_id.toLowerCase() !== checkOutLocalId.toLowerCase()
    ) {
      throw new Error(
        "El Check-Out confirmado no es el último evento del recorrido.",
      );
    }

    const update = await tx.runAsync(
      `UPDATE local_trekkings
       SET sync_status = 'synced'
       WHERE local_id = ?
         AND owner_user_id = ?
         AND server_id = ?
         AND status = 'COMPLETED'
         AND sync_status = 'pending';`,
      [trekkingLocalId, ownerUserId, serverTrekkingId],
    );

    if (update.changes !== 1) {
      throw new Error(
        "No fue posible confirmar la sincronización del trekking.",
      );
    }
  });
}

// Reconciliación de excursiones ya finalizadas.
// El mismo UUID de Check-Out permite un reintento idempotente.
async function reconcileCompletedTrekkings(
  ownerUserId: string,
  result: QrSyncResult,
): Promise<void> {
  const candidates = await getCompletedPendingTrekkings(ownerUserId);

  for (const trekking of candidates) {
    try {
      if (
        trekking.server_id === null ||
        !Number.isSafeInteger(trekking.server_id) ||
        trekking.server_id <= 0
      ) {
        throw new Error("El trekking no tiene un ID remoto válido.");
      }

      const checkOut = await getSynchronizedCheckOut(trekking.local_id);

      if (!checkOut) {
        throw new Error("No se encontró un Check-Out sincronizado.");
      }

      const serverStatus = await sendOneEvent(
        checkOut,
        trekking.server_id,
      );

      if (serverStatus !== "COMPLETED") {
        throw new Error(
          "Django todavía no confirma la finalización.",
        );
      }

      await markCompletedTrekkingSynchronized(
        trekking.local_id,
        ownerUserId,
        trekking.server_id,
        checkOut.local_id,
      );

      console.log(
        "[Hito QR] Trekking completado reconciliado:",
        trekking.local_id,
      );
    } catch (error) {
      const message = describeError(error);

      console.warn(
        "[Hito QR] Reconciliación pendiente:",
        trekking.local_id,
        message,
      );

      result.failed += 1;

      result.failures.push({
        localId: trekking.local_id,
        eventType: "CHECK_OUT_RECONCILIATION",
        message,
      });
    }
  }
}

// Sincronización QR y posterior reconciliación.
async function syncPendingQrEventsInternal(
  ownerUserId: string,
): Promise<QrSyncResult> {
  validateOwner(ownerUserId);

  if (syncRunning) {
    throw new Error("Ya existe una sincronización QR en curso.");
  }

  syncRunning = true;

  try {
    const events = await getPendingEvents(ownerUserId);

    const result: QrSyncResult = {
      total: events.length,
      synchronized: 0,
      failed: 0,
      skipped: 0,
      failures: [],
    };

    const blockedTrekkings = new Set<string>();

    for (const event of events) {
      if (blockedTrekkings.has(event.trekking_local_id)) {
        result.skipped += 1;
        continue;
      }

      try {
        const trekking = await getLocalTrekking(
          event.trekking_local_id,
          ownerUserId,
        );

        if (!trekking) {
          throw new Error(
            "No se encontró el trekking propietario del evento.",
          );
        }

        if (trekking.server_id === null) {
          throw new Error(
            "Primero debes sincronizar el inicio de esta excursión.",
          );
        }

        if (
          !Number.isSafeInteger(trekking.server_id) ||
          trekking.server_id <= 0
        ) {
          throw new Error(
            "El trekking tiene un ID remoto inválido.",
          );
        }

        await sendOneEvent(event, trekking.server_id);

        await markEventSynchronized(
          event,
          ownerUserId,
          trekking.server_id,
        );

        result.synchronized += 1;
      } catch (error) {
        const message = describeError(error);

        console.warn(
          "HITO — Evento QR pendiente:",
          event.local_id,
          event.event_type,
          message,
        );

        result.failed += 1;

        result.failures.push({
          localId: event.local_id,
          eventType: event.event_type,
          message,
        });

        blockedTrekkings.add(event.trekking_local_id);
      }
    }

    // Incluso con cero QR nuevos, revisa excursiones
    // COMPLETED que conservan sync_status = pending.
    await reconcileCompletedTrekkings(ownerUserId, result);

    return result;
  } finally {
    syncRunning = false;
  }
}

// Serializa sincronizaciones manuales y automáticas.
export async function syncPendingQrEvents(
  ownerUserId: string,
): Promise<QrSyncResult> {
  return withSyncLock(
    "checkpoints",
    () => syncPendingQrEventsInternal(ownerUserId),
  );
}
