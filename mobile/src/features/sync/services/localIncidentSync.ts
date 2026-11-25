import { withSyncLock } from "./syncLock";
import axios from "axios";

import apiClient from "@/api/client";

import { getDatabase } from "@/features/trekking/storage/database";

import type {
  LocalIncident,
} from "@/features/incidents/services/localIncidentService";

// ---------------------------------------------------------
// HITO — SINCRONIZACIÓN DE INCIDENTES OFFLINE-FIRST
//
// SQLite -> Django -> MySQL
//
// Incluye:
// - UUID original.
// - Tipo y descripción.
// - Coordenadas opcionales.
// - Fecha real del reporte.
// - Archivo de fotografía real.
//
// No elimina registros locales.
// ---------------------------------------------------------

interface PendingIncident extends LocalIncident {
  server_id: number | null;
}

interface IncidentResponse {
  success: boolean;
  message?: string;
  data?: {
    id: number;
    local_id: string;
    trekking_id: number;
    photo_uploaded: boolean;
    registered_at: string;
  };
}

export interface IncidentSyncFailure {
  localId: string;
  message: string;
}

export interface IncidentSyncResult {
  total: number;
  synchronized: number;
  failed: number;
  failures: IncidentSyncFailure[];
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let synchronizationRunning = false;

// ---------------------------------------------------------
// OBTENER INCIDENTES PENDIENTES
// ---------------------------------------------------------

async function getPendingIncidents(
  ownerUserId: string,
): Promise<PendingIncident[]> {
  const db = await getDatabase();

  return db.getAllAsync<PendingIncident>(
    `
    SELECT
      i.local_id,
      i.trekking_local_id,
      i.owner_user_id,
      i.incident_type,
      i.description,
      i.latitude,
      i.longitude,
      i.photo_uri,
      i.reported_at,
      i.sync_status,
      t.server_id
    FROM local_incidents i
    INNER JOIN local_trekkings t
      ON t.local_id = i.trekking_local_id
    WHERE i.owner_user_id = ?
      AND t.owner_user_id = ?
      AND i.sync_status = 'pending'
    ORDER BY
      i.reported_at ASC,
      i.local_id ASC;
    `,
    [ownerUserId, ownerUserId],
  );
}

// ---------------------------------------------------------
// VALIDAR REGISTRO LOCAL
// ---------------------------------------------------------

function validateIncident(
  incident: PendingIncident,
): void {
  if (
    !UUID_REGEX.test(incident.local_id) ||
    !UUID_REGEX.test(incident.trekking_local_id)
  ) {
    throw new Error(
      "El incidente tiene un UUID inválido.",
    );
  }

  if (
    !incident.description.trim() ||
    !incident.incident_type.trim()
  ) {
    throw new Error(
      "El incidente tiene información incompleta.",
    );
  }

  if (
    !Number.isFinite(
      Date.parse(incident.reported_at),
    )
  ) {
    throw new Error(
      "La fecha del incidente no es válida.",
    );
  }

  const latitude = incident.latitude;
  const longitude = incident.longitude;

  if (
    (latitude === null) !==
    (longitude === null)
  ) {
    throw new Error(
      "El incidente tiene coordenadas incompletas.",
    );
  }

  if (latitude !== null && longitude !== null) {
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new Error(
        "El incidente tiene coordenadas GPS inválidas.",
      );
    }
  }

  if (
    incident.server_id === null ||
    !Number.isSafeInteger(incident.server_id) ||
    incident.server_id <= 0
  ) {
    throw new Error(
      "Primero debes sincronizar el inicio del trekking.",
    );
  }
}

// ---------------------------------------------------------
// PREPARAR FOTOGRAFÍA
// ---------------------------------------------------------

function getPhotoAttachment(
  photoUri: string,
): {
  uri: string;
  name: string;
  type: string;
} {
  const uri = photoUri.trim();

  if (
    !uri.startsWith("file://") &&
    !uri.startsWith("content://")
  ) {
    throw new Error(
      "La fotografía no tiene una ruta local válida.",
    );
  }

  const path = uri.split("?")[0].toLowerCase();

  let extension = "jpg";
  let type = "image/jpeg";

  if (path.endsWith(".png")) {
    extension = "png";
    type = "image/png";
  } else if (
    path.endsWith(".webp")
  ) {
    extension = "webp";
    type = "image/webp";
  } else if (
    path.endsWith(".jpeg")
  ) {
    extension = "jpeg";
    type = "image/jpeg";
  } else if (
    !path.endsWith(".jpg")
  ) {
    throw new Error(
      "La fotografía debe estar en formato JPG, PNG o WebP.",
    );
  }

  return {
    uri,
    name: `hito-incident-${Date.now()}.${extension}`,
    type,
  };
}

// ---------------------------------------------------------
// OBTENER MENSAJE DE ERROR
// ---------------------------------------------------------

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
      return (
        `Django rechazó el incidente ` +
        `(HTTP ${error.response.status}).`
      );
    }

    return "No fue posible conectar con Django.";
  }

  return error instanceof Error
    ? error.message
    : "Error desconocido sincronizando incidente.";
}

// ---------------------------------------------------------
// ENVIAR INCIDENTE Y FOTOGRAFÍA
// ---------------------------------------------------------

async function sendIncident(
  incident: PendingIncident,
): Promise<void> {
  validateIncident(incident);

  const form = new FormData();

  form.append(
    "local_id",
    incident.local_id,
  );

  form.append(
    "trekking_local_id",
    incident.trekking_local_id,
  );

  form.append(
    "incident_type",
    incident.incident_type,
  );

  form.append(
    "description",
    incident.description,
  );

  form.append(
    "reported_at",
    incident.reported_at,
  );

  if (
    incident.latitude !== null &&
    incident.longitude !== null
  ) {
    form.append(
      "latitude",
      String(incident.latitude),
    );

    form.append(
      "longitude",
      String(incident.longitude),
    );
  }

  const hasPhoto = Boolean(
    incident.photo_uri?.trim(),
  );

  if (hasPhoto && incident.photo_uri) {
    const attachment = getPhotoAttachment(
      incident.photo_uri,
    );

    // En React Native, FormData admite
    // objetos con uri, name y type.
    // El cast permite utilizar sus tipos
    // sin modificar el archivo global.

    form.append(
      "photo",
      attachment as unknown as Blob,
    );
  }

  const response =
    await apiClient.post<IncidentResponse>(
      "/incidents/sync/",
      form,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000,
      },
    );

  const body = response.data;
  const data = body?.data;

  if (
    body?.success !== true ||
    !data ||
    data.local_id.toLowerCase() !==
      incident.local_id.toLowerCase() ||
    data.trekking_id !== incident.server_id ||
    !Number.isSafeInteger(data.id) ||
    data.id <= 0
  ) {
    throw new Error(
      "Django no confirmó correctamente el incidente.",
    );
  }

  if (
    hasPhoto &&
    data.photo_uploaded !== true
  ) {
    throw new Error(
      "Django recibió el incidente, pero no confirmó su fotografía.",
    );
  }
}

// ---------------------------------------------------------
// CONFIRMAR EN SQLITE
// ---------------------------------------------------------

async function markIncidentSynchronized(
  incident: PendingIncident,
): Promise<void> {
  const db = await getDatabase();

  await db.withExclusiveTransactionAsync(
    async (tx) => {
      const current =
        await tx.getFirstAsync<LocalIncident>(
          `
          SELECT *
          FROM local_incidents
          WHERE local_id = ?
            AND trekking_local_id = ?
            AND owner_user_id = ?
          LIMIT 1;
          `,
          [
            incident.local_id,
            incident.trekking_local_id,
            incident.owner_user_id,
          ],
        );

      if (!current) {
        throw new Error(
          "El incidente desapareció de SQLite.",
        );
      }

      const unchanged = (
        current.incident_type ===
          incident.incident_type &&
        current.description ===
          incident.description &&
        current.latitude ===
          incident.latitude &&
        current.longitude ===
          incident.longitude &&
        current.photo_uri ===
          incident.photo_uri &&
        current.reported_at ===
          incident.reported_at
      );

      if (!unchanged) {
        throw new Error(
          "El incidente cambió durante la sincronización.",
        );
      }

      if (current.sync_status === "synced") {
        return;
      }

      if (current.sync_status !== "pending") {
        throw new Error(
          "Estado de sincronización inválido.",
        );
      }

      const result = await tx.runAsync(
        `
        UPDATE local_incidents
        SET sync_status = 'synced'
        WHERE local_id = ?
          AND trekking_local_id = ?
          AND owner_user_id = ?
          AND sync_status = 'pending';
        `,
        [
          incident.local_id,
          incident.trekking_local_id,
          incident.owner_user_id,
        ],
      );

      if (result.changes !== 1) {
        throw new Error(
          "No fue posible confirmar el incidente en SQLite.",
        );
      }
    },
  );
}

// ---------------------------------------------------------
// SINCRONIZACIÓN PRINCIPAL
// ---------------------------------------------------------

async function syncPendingIncidentsInternal(
  ownerUserId: string,
): Promise<IncidentSyncResult> {
  if (!/^[1-9]\d*$/.test(ownerUserId.trim())) {
    throw new Error(
      "No fue posible identificar al usuario.",
    );
  }

  if (synchronizationRunning) {
    throw new Error(
      "Ya hay una sincronización de incidentes en curso.",
    );
  }

  synchronizationRunning = true;

  const result: IncidentSyncResult = {
    total: 0,
    synchronized: 0,
    failed: 0,
    failures: [],
  };

  try {
    const incidents =
      await getPendingIncidents(
        ownerUserId.trim(),
      );

    result.total = incidents.length;

    for (const incident of incidents) {
      try {
        await sendIncident(incident);

        await markIncidentSynchronized(
          incident,
        );

        result.synchronized += 1;
      } catch (error) {
        const message = describeError(error);

        result.failed += 1;

        result.failures.push({
          localId: incident.local_id,
          message,
        });

        console.warn(
          "HITO — Error sincronizando incidente:",
          incident.local_id,
          message,
        );
      }
    }

    return result;
  } finally {
    synchronizationRunning = false;
  }
}

// Serializa sincronizaciones manuales y automáticas.
export async function syncPendingIncidents(
  ownerUserId: string,
): Promise<IncidentSyncResult> {
  return withSyncLock("incidents", () =>
    syncPendingIncidentsInternal(ownerUserId),
  );
}
