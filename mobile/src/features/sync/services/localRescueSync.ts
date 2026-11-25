import { withSyncLock } from "./syncLock";
import axios from "axios";

import apiClient from "@/api/client";
import { getDatabase } from "@/features/trekking/storage/database";

import {
  initializeLocalRescues,
  type LocalRescue,
} from "@/features/rescues/services/localRescueService";

interface PendingRescue extends LocalRescue {
  trekking_server_id: number | null;
}

interface RescueSyncResponse {
  success: boolean;
  message?: string;
  data?: {
    id: number;
    local_id: string;
    trekking_id: number;
    status: "ACTIVE" | "CANCELLED";
    started_at: string;
    finished_at: string | null;
  };
}

export interface RescueSyncResult {
  total: number;
  synchronized: number;
  failed: number;
  failures: {
    localId: string;
    message: string;
  }[];
}

let running = false;

// ---------------------------------------------------------
// MENSAJES DE ERROR
// ---------------------------------------------------------


function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as
      | {
          message?: string;
          errors?: Record<string, unknown>;
        }
      | undefined;

    // Mostrar los errores específicos que devuelve
    // el serializer de Django.
    if (body?.errors) {
      const details = Object.entries(body.errors)
        .map(([field, value]) => {
          const message = Array.isArray(value)
            ? value.map(String).join(", ")
            : String(value);

          return `${field}: ${message}`;
        })
        .join(" | ");

      console.warn(
        "HITO — Validación de rescate:",
        JSON.stringify(body.errors, null, 2),
      );

      return details || "Error de validación en Django.";
    }

    if (
      typeof body?.message === "string" &&
      body.message.trim()
    ) {
      return body.message;
    }

    if (error.response?.status) {
      return (
        `Django rechazó la solicitud ` +
        `(HTTP ${error.response.status}).`
      );
    }

    return (
      "No hay conexión con Django. " +
      "El rescate sigue pendiente en el dispositivo."
    );
  }

  return error instanceof Error
    ? error.message
    : "Error desconocido.";
}


// ---------------------------------------------------------
// OBTENER RESCATES PENDIENTES
// ---------------------------------------------------------

async function getPendingRescues(
  ownerUserId: string,
): Promise<PendingRescue[]> {
  await initializeLocalRescues();

  const db = await getDatabase();

  return db.getAllAsync<PendingRescue>(
    `
    SELECT
      r.*,
      t.server_id AS trekking_server_id
    FROM local_rescues r
    INNER JOIN local_trekkings t
      ON t.local_id = r.trekking_local_id
    WHERE r.owner_user_id = ?
      AND t.owner_user_id = ?
      AND r.sync_status = 'pending'
    ORDER BY
      r.requested_at ASC,
      r.local_id ASC;
    `,
    [ownerUserId, ownerUserId],
  );
}

// ---------------------------------------------------------
// VALIDAR RESCATE
// ---------------------------------------------------------

function validateRescue(
  rescue: PendingRescue,
): void {
  if (
    !rescue.trekking_server_id ||
    rescue.trekking_server_id <= 0
  ) {
    throw new Error(
      "Primero debes sincronizar el inicio de la excursión.",
    );
  }

  if (
    !rescue.local_id ||
    !rescue.trekking_local_id
  ) {
    throw new Error(
      "Faltan identificadores del rescate.",
    );
  }

  if (
    !Number.isFinite(
      Date.parse(rescue.requested_at),
    )
  ) {
    throw new Error(
      "La fecha de solicitud no es válida.",
    );
  }

  if (
    rescue.status !== "ACTIVE" &&
    rescue.status !== "CANCELLED"
  ) {
    throw new Error(
      "Estado de rescate inválido.",
    );
  }

  if (
    (rescue.latitude === null) !==
    (rescue.longitude === null)
  ) {
    throw new Error(
      "Las coordenadas están incompletas.",
    );
  }

  if (rescue.status === "CANCELLED") {
    if (
      !rescue.cancelled_at ||
      !Number.isFinite(
        Date.parse(rescue.cancelled_at),
      )
    ) {
      throw new Error(
        "Falta la fecha válida de cancelación.",
      );
    }
  }
}

// ---------------------------------------------------------
// ENVIAR RESCATE A DJANGO
// ---------------------------------------------------------

async function sendRescue(
  rescue: PendingRescue,
): Promise<void> {
  validateRescue(rescue);

  
const payload = {
  local_id: rescue.local_id,
  trekking_local_id: rescue.trekking_local_id,
  status: rescue.status,

  // Django DecimalField(decimal_places=6)
  latitude:
    rescue.latitude !== null
      ? Number(rescue.latitude.toFixed(6))
      : null,

  longitude:
    rescue.longitude !== null
      ? Number(rescue.longitude.toFixed(6))
      : null,

  requested_at: rescue.requested_at,
  cancelled_at: rescue.cancelled_at,
};


  const response =
    await apiClient.post<RescueSyncResponse>(
      "/rescues/sync/",
      payload,
      {
        timeout: 30000,
      },
    );

  const body = response.data;
  const data = body?.data;

  if (
    body?.success !== true ||
    !data ||
    data.local_id.toLowerCase() !==
      rescue.local_id.toLowerCase() ||
    data.status !== rescue.status ||
    data.trekking_id !==
      rescue.trekking_server_id ||
    !Number.isSafeInteger(data.id) ||
    data.id <= 0
  ) {
    throw new Error(
      "Django no confirmó el mismo rescate y estado.",
    );
  }
}

// ---------------------------------------------------------
// CONFIRMAR SINCRONIZACIÓN EN SQLITE
// ---------------------------------------------------------

async function markSynced(
  rescue: PendingRescue,
): Promise<void> {
  const db = await getDatabase();

  await db.withExclusiveTransactionAsync(
    async (tx) => {
      const current =
        await tx.getFirstAsync<LocalRescue>(
          `
          SELECT *
          FROM local_rescues
          WHERE local_id = ?
            AND owner_user_id = ?
          LIMIT 1;
          `,
          [
            rescue.local_id,
            rescue.owner_user_id,
          ],
        );

      if (!current) {
        throw new Error(
          "El rescate ya no existe en SQLite.",
        );
      }

      if (
        current.status !== rescue.status ||
        current.cancelled_at !==
          rescue.cancelled_at ||
        current.requested_at !==
          rescue.requested_at ||
        current.latitude !==
          rescue.latitude ||
        current.longitude !==
          rescue.longitude
      ) {
        // Si la solicitud se cancela durante
        // el envío, NO marcamos esa cancelación
        // como sincronizada por equivocación.

        throw new Error(
          "El rescate cambió durante el envío; sincroniza de nuevo.",
        );
      }

      if (current.sync_status === "synced") {
        return;
      }

      const update = await tx.runAsync(
        `
        UPDATE local_rescues
        SET sync_status = 'synced'
        WHERE local_id = ?
          AND owner_user_id = ?
          AND sync_status = 'pending';
        `,
        [
          rescue.local_id,
          rescue.owner_user_id,
        ],
      );

      if (update.changes !== 1) {
        throw new Error(
          "No se pudo confirmar el estado en SQLite.",
        );
      }
    },
  );
}

// ---------------------------------------------------------
// SINCRONIZACIÓN PRINCIPAL
// ---------------------------------------------------------

async function syncPendingRescuesInternal(
  ownerUserId: string,
): Promise<RescueSyncResult> {
  if (
    !/^[1-9]\d*$/.test(ownerUserId.trim())
  ) {
    throw new Error(
      "No se pudo identificar al usuario.",
    );
  }

  if (running) {
    throw new Error(
      "Ya hay una sincronización de rescates en curso.",
    );
  }

  running = true;

  const result: RescueSyncResult = {
    total: 0,
    synchronized: 0,
    failed: 0,
    failures: [],
  };

  try {
    const pending = await getPendingRescues(
      ownerUserId.trim(),
    );

    result.total = pending.length;

    for (const rescue of pending) {
      try {
        await sendRescue(rescue);

        await markSynced(rescue);

        result.synchronized += 1;
      } catch (error) {
        const message = errorMessage(error);

        result.failed += 1;

        result.failures.push({
          localId: rescue.local_id,
          message,
        });

        console.warn(
          "HITO — Error sincronizando rescate:",
          rescue.local_id,
          message,
        );
      }
    }

    return result;
  } finally {
    running = false;
  }
}

// Serializa sincronizaciones manuales y automáticas.
export async function syncPendingRescues(
  ownerUserId: string,
): Promise<RescueSyncResult> {
  return withSyncLock("rescues", () =>
    syncPendingRescuesInternal(ownerUserId),
  );
}
