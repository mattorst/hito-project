import { withSyncLock } from "./syncLock";
import apiClient from "@/api/client";

import { getDatabase } from "@/features/trekking/storage/database";

// ---------------------------------------------------------
// HITO — BOOTSTRAP DE TREKKINGS OFFLINE
//
// SQLite -> Django REST Framework -> MySQL
//
// Esta etapa sincroniza únicamente:
// - Trekking
// - Fecha original del Check-In
// - Sendero
// - Acompañantes
//
// NO sincroniza todavía:
// - Checkpoints
// - GPS
// - Incidentes
// - Rescates
// - Check-Out
// ---------------------------------------------------------

interface LocalTrekkingRow {
  local_id: string;
  server_id: number | null;
  trail_id: number;
  status: string;
  started_at: string;
  sync_status: string;
  owner_user_id: string | null;
}

interface LocalCompanionRow {
  local_id: string;
  trekking_local_id: string;
  first_name: string;
  last_name: string;
  sex: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

interface BootstrapCompanionPayload {
  local_id: string;
  first_name: string;
  last_name: string;
  sex: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

interface BootstrapPayload {
  local_id: string;
  trail: number;
  started_at: string;
  companions: BootstrapCompanionPayload[];
}

interface ServerCompanion {
  local_id: string;
}

interface ServerTrekking {
  id: number;
  local_id: string;
  trail: number;
  started_at: string;
  companions: ServerCompanion[];
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: ServerTrekking;
}

export interface BootstrapSyncItem {
  localId: string;
  serverId?: number;
  success: boolean;
  error?: string;
}

export interface BootstrapSyncResult {
  total: number;
  synchronized: number;
  failed: number;
  items: BootstrapSyncItem[];
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let synchronizationRunning = false;

// ---------------------------------------------------------
// VALIDACIONES
// ---------------------------------------------------------

function validateUuid(value: string): void {
  if (!UUID_REGEX.test(value)) {
    throw new Error(
      `El identificador local ${value} no es un UUID válido.`,
    );
  }
}

function validateOwnerUserId(
  ownerUserId: string,
): void {
  if (!/^[1-9]\d*$/.test(ownerUserId)) {
    throw new Error(
      "El identificador del usuario no es válido.",
    );
  }
}

function validateCompanion(
  companion: LocalCompanionRow,
): void {
  validateUuid(companion.local_id);

  if (
    !companion.first_name.trim() ||
    !companion.last_name.trim()
  ) {
    throw new Error(
      "Un acompañante no tiene nombre o apellido.",
    );
  }

  if (
    !companion.emergency_contact_name.trim() ||
    !companion.emergency_contact_phone.trim()
  ) {
    throw new Error(
      "Faltan datos del contacto de emergencia de un acompañante.",
    );
  }

  if (
    !["", "M", "F", "O", "N"].includes(companion.sex)
  ) {
    throw new Error(
      "Un acompañante tiene un valor de sexo inválido.",
    );
  }
}

function validateTrekking(
  trekking: LocalTrekkingRow,
): void {
  validateUuid(trekking.local_id);

  if (
    !Number.isSafeInteger(trekking.trail_id) ||
    trekking.trail_id <= 0
  ) {
    throw new Error(
      "El sendero del trekking no es válido.",
    );
  }

  if (
    !trekking.started_at ||
    Number.isNaN(Date.parse(trekking.started_at))
  ) {
    throw new Error(
      "La fecha de inicio del trekking no es válida.",
    );
  }

  if (
    trekking.status !== "IN_PROGRESS" &&
    trekking.status !== "COMPLETED"
  ) {
    throw new Error(
      "El trekking todavía no ha comenzado o no tiene un estado compatible.",
    );
  }
}

// ---------------------------------------------------------
// CONSULTAR TREKKINGS AÚN SIN ID DE DJANGO
// ---------------------------------------------------------

async function getPendingTrekkings(
  ownerUserId: string,
): Promise<LocalTrekkingRow[]> {
  const db = await getDatabase();

  return db.getAllAsync<LocalTrekkingRow>(
    `
    SELECT
      local_id,
      server_id,
      trail_id,
      status,
      started_at,
      sync_status,
      owner_user_id
    FROM local_trekkings
    WHERE owner_user_id = ?
      AND server_id IS NULL
      AND status IN ('IN_PROGRESS', 'COMPLETED')
    ORDER BY started_at ASC;
    `,
    [ownerUserId],
  );
}

// ---------------------------------------------------------
// CONSULTAR ACOMPAÑANTES DE LA EXCURSIÓN
// ---------------------------------------------------------

async function getCompanions(
  trekkingLocalId: string,
): Promise<LocalCompanionRow[]> {
  const db = await getDatabase();

  return db.getAllAsync<LocalCompanionRow>(
    `
    SELECT
      local_id,
      trekking_local_id,
      first_name,
      last_name,
      sex,
      emergency_contact_name,
      emergency_contact_phone
    FROM trekking_companions
    WHERE trekking_local_id = ?
    ORDER BY local_id ASC;
    `,
    [trekkingLocalId],
  );
}

// ---------------------------------------------------------
// CONSTRUIR JSON PARA DJANGO
// ---------------------------------------------------------

function buildPayload(
  trekking: LocalTrekkingRow,
  companions: LocalCompanionRow[],
): BootstrapPayload {
  validateTrekking(trekking);

  const companionIds = new Set<string>();

  const companionPayload = companions.map(
    (companion): BootstrapCompanionPayload => {
      validateCompanion(companion);

      const normalizedId =
        companion.local_id.toLowerCase();

      if (companionIds.has(normalizedId)) {
        throw new Error(
          "Hay acompañantes con UUID duplicados.",
        );
      }

      companionIds.add(normalizedId);

      return {
        local_id: companion.local_id,
        first_name: companion.first_name.trim(),
        last_name: companion.last_name.trim(),
        sex: companion.sex,
        emergency_contact_name:
          companion.emergency_contact_name.trim(),
        emergency_contact_phone:
          companion.emergency_contact_phone.trim(),
      };
    },
  );

  return {
    local_id: trekking.local_id,
    trail: trekking.trail_id,
    started_at: trekking.started_at,
    companions: companionPayload,
  };
}

// ---------------------------------------------------------
// VERIFICAR RESPUESTA DEL SERVIDOR
// ---------------------------------------------------------

function validateServerResponse(
  response: ApiResponse,
  payload: BootstrapPayload,
): ServerTrekking {
  if (
    !response ||
    response.success !== true ||
    !response.data
  ) {
    throw new Error(
      "Django no confirmó la sincronización.",
    );
  }

  const serverTrekking = response.data;

  if (
    !Number.isSafeInteger(serverTrekking.id) ||
    serverTrekking.id <= 0
  ) {
    throw new Error(
      "Django devolvió un ID de trekking inválido.",
    );
  }

  if (
    typeof serverTrekking.local_id !== "string" ||
    serverTrekking.local_id.toLowerCase() !==
      payload.local_id.toLowerCase()
  ) {
    throw new Error(
      "El UUID del servidor no coincide con SQLite.",
    );
  }

  if (serverTrekking.trail !== payload.trail) {
    throw new Error(
      "El sendero devuelto por Django no coincide.",
    );
  }

  const originalStart = Date.parse(
    payload.started_at,
  );

  const serverStart = Date.parse(
    serverTrekking.started_at,
  );

  if (
    Number.isNaN(serverStart) ||
    originalStart !== serverStart
  ) {
    throw new Error(
      "La fecha del Check-In no coincide con Django.",
    );
  }

  if (!Array.isArray(serverTrekking.companions)) {
    throw new Error(
      "Django no devolvió la lista de acompañantes.",
    );
  }

  const expectedIds = payload.companions
    .map((item) => item.local_id.toLowerCase())
    .sort();

  const receivedIds = serverTrekking.companions
    .map((item) => {
      if (
        !item ||
        typeof item.local_id !== "string"
      ) {
        throw new Error(
          "Django devolvió un acompañante inválido.",
        );
      }

      return item.local_id.toLowerCase();
    })
    .sort();

  if (
    expectedIds.length !== receivedIds.length ||
    expectedIds.some(
      (id, index) => id !== receivedIds[index],
    )
  ) {
    throw new Error(
      "Los acompañantes del servidor no coinciden con SQLite.",
    );
  }

  return serverTrekking;
}

// ---------------------------------------------------------
// ENVIAR A DJANGO MEDIANTE EL API CLIENT EXISTENTE
// ---------------------------------------------------------

async function sendBootstrap(
  payload: BootstrapPayload,
): Promise<ServerTrekking> {
  const response = await apiClient.post<ApiResponse>(
    "/trekkings/sync/bootstrap/",
    payload,
  );

  return validateServerResponse(
    response.data,
    payload,
  );
}

// ---------------------------------------------------------
// GUARDAR EL SERVER_ID SIN PERDER DATOS
// ---------------------------------------------------------

async function saveServerId(
  trekking: LocalTrekkingRow,
  companions: LocalCompanionRow[],
  serverId: number,
  ownerUserId: string,
): Promise<void> {
  const db = await getDatabase();

  await db.withExclusiveTransactionAsync(
    async (tx) => {
      const current =
        await tx.getFirstAsync<LocalTrekkingRow>(
          `
          SELECT
            local_id,
            server_id,
            trail_id,
            status,
            started_at,
            sync_status,
            owner_user_id
          FROM local_trekkings
          WHERE local_id = ?
            AND owner_user_id = ?
          LIMIT 1;
          `,
          [
            trekking.local_id,
            ownerUserId,
          ],
        );

      if (!current) {
        throw new Error(
          "El trekking local ya no existe o cambió de propietario.",
        );
      }

      // Otro proceso pudo haber confirmado
      // la sincronización antes de esta escritura.

      if (current.server_id !== null) {
        if (current.server_id === serverId) {
          return;
        }

        throw new Error(
          "El trekking ya tiene otro ID de Django.",
        );
      }

      if (
        current.trail_id !== trekking.trail_id ||
        current.started_at !== trekking.started_at
      ) {
        throw new Error(
          "Los datos originales del trekking cambiaron durante la sincronización.",
        );
      }

      // Comprobar que la lista de acompañantes
      // tampoco cambió mientras Django respondía.

      const currentCompanions =
        await tx.getAllAsync<LocalCompanionRow>(
          `
          SELECT
            local_id,
            trekking_local_id,
            first_name,
            last_name,
            sex,
            emergency_contact_name,
            emergency_contact_phone
          FROM trekking_companions
          WHERE trekking_local_id = ?
          ORDER BY local_id ASC;
          `,
          [trekking.local_id],
        );

      if (
        JSON.stringify(currentCompanions) !==
        JSON.stringify(companions)
      ) {
        throw new Error(
          "Los acompañantes cambiaron durante la sincronización. Es necesario revisar el registro.",
        );
      }

      // Guardamos únicamente el ID remoto.
      // No cambiamos el estado del recorrido.
      //
      // Tampoco cambiamos sync_status a 'synced',
      // porque checkpoints, GPS, incidentes
      // y rescates pueden continuar pendientes.

      const update = await tx.runAsync(
        `
        UPDATE local_trekkings
        SET server_id = ?
        WHERE local_id = ?
          AND owner_user_id = ?
          AND server_id IS NULL;
        `,
        [
          serverId,
          trekking.local_id,
          ownerUserId,
        ],
      );

      if (update.changes !== 1) {
        throw new Error(
          "No se pudo confirmar el ID remoto en SQLite.",
        );
      }
    },
  );
}

// ---------------------------------------------------------
// SINCRONIZAR UNA EXCURSIÓN
// ---------------------------------------------------------

async function synchronizeOne(
  trekking: LocalTrekkingRow,
  ownerUserId: string,
): Promise<number> {
  const companions = await getCompanions(
    trekking.local_id,
  );

  const payload = buildPayload(
    trekking,
    companions,
  );

  const remote = await sendBootstrap(payload);

  await saveServerId(
    trekking,
    companions,
    remote.id,
    ownerUserId,
  );

  return remote.id;
}

// ---------------------------------------------------------
// SINCRONIZAR TODOS LOS BOOTSTRAPS PENDIENTES
// ---------------------------------------------------------

async function syncPendingTrekkingBootstrapsInternal(
  ownerUserId: string,
): Promise<BootstrapSyncResult> {
  validateOwnerUserId(ownerUserId);

  if (synchronizationRunning) {
    throw new Error(
      "Ya existe una sincronización de trekkings en curso.",
    );
  }

  synchronizationRunning = true;

  try {
    const pendingTrekkings =
      await getPendingTrekkings(ownerUserId);

    const result: BootstrapSyncResult = {
      total: pendingTrekkings.length,
      synchronized: 0,
      failed: 0,
      items: [],
    };

    for (const trekking of pendingTrekkings) {
      try {
        const serverId = await synchronizeOne(
          trekking,
          ownerUserId,
        );

        result.synchronized += 1;

        result.items.push({
          localId: trekking.local_id,
          serverId,
          success: true,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Error desconocido de sincronización.";

        console.error(
        "HITO — Error sincronizando trekking:",
        trekking.local_id,
        message,
        );

if (
  typeof error === "object" &&
  error !== null &&
  "response" in error
) {
  const axiosError = error as {
    response?: {
      status?: number;
      data?: unknown;
    };
  };

  console.log(
    "HITO — RESPUESTA COMPLETA DE DJANGO:",
    JSON.stringify(
      {
        status: axiosError.response?.status,
        data: axiosError.response?.data,
      },
      null,
      2,
    ),
  );
}

        result.failed += 1;

        result.items.push({
          localId: trekking.local_id,
          success: false,
          error: message,
        });
      }
    }

    return result;
  } finally {
    synchronizationRunning = false;
  }
}

// Serializa sincronizaciones manuales y automáticas.
export async function syncPendingTrekkingBootstraps(
  ownerUserId: string,
): Promise<BootstrapSyncResult> {
  return withSyncLock("trekkings", () =>
    syncPendingTrekkingBootstrapsInternal(ownerUserId),
  );
}
