
import * as Crypto from "expo-crypto";

import { getDatabase } from "@/features/trekking/storage/database";

// ---------------------------------------------------------
// HITO — INCIDENTES OFFLINE
// ---------------------------------------------------------

export interface CreateLocalIncidentInput {
  trekkingLocalId: string;
  ownerUserId: string;
  incidentType: string;
  description: string;
  latitude?: number | null;
  longitude?: number | null;
  photoUri?: string | null;
}

export interface LocalIncident {
  local_id: string;
  trekking_local_id: string;
  owner_user_id: string;
  incident_type: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  photo_uri: string | null;
  reported_at: string;
  sync_status: string;
}

interface TrekkingRow {
  local_id: string;
}

const VALID_INCIDENT_TYPES = [
  "PERSON_INJURED",
  "DANGEROUS_ANIMAL",
  "LANDSLIDE",
  "FALLEN_TREE",
  "BLOCKED_TRAIL",
  "LOST_PERSON",
  "WEATHER",
  "OTHER",
];

let initializationPromise: Promise<void> | null = null;

// ---------------------------------------------------------
// INICIALIZAR ALMACENAMIENTO LOCAL
// ---------------------------------------------------------

async function initializeLocalIncidents(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const db = await getDatabase();

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS local_incidents (
          local_id TEXT PRIMARY KEY NOT NULL,
          trekking_local_id TEXT NOT NULL,
          owner_user_id TEXT NOT NULL,
          incident_type TEXT NOT NULL,
          description TEXT NOT NULL,
          latitude REAL,
          longitude REAL,
          photo_uri TEXT,
          reported_at TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'pending',

          FOREIGN KEY (trekking_local_id)
            REFERENCES local_trekkings(local_id)
            ON DELETE RESTRICT
        );

        CREATE INDEX IF NOT EXISTS
          idx_local_incidents_trekking
        ON local_incidents (trekking_local_id);

        CREATE INDEX IF NOT EXISTS
          idx_local_incidents_sync
        ON local_incidents (sync_status);
      `);
    })().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  await initializationPromise;
}

// ---------------------------------------------------------
// VALIDACIONES
// ---------------------------------------------------------

function validateInput(input: CreateLocalIncidentInput) {
  if (!input.trekkingLocalId.trim()) {
    throw new Error("No se identificó la excursión.");
  }

  if (!/^[1-9]\d*$/.test(input.ownerUserId.trim())) {
    throw new Error("No se pudo identificar al usuario.");
  }

  if (!VALID_INCIDENT_TYPES.includes(input.incidentType)) {
    throw new Error(
      "Selecciona un tipo de incidente válido.",
    );
  }

  if (!input.description.trim()) {
    throw new Error(
      "Debes escribir una descripción del incidente.",
    );
  }

  const latitude = input.latitude ?? null;
  const longitude = input.longitude ?? null;

  if ((latitude === null) !== (longitude === null)) {
    throw new Error(
      "Las coordenadas GPS están incompletas.",
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
        "Las coordenadas GPS no son válidas.",
      );
    }
  }
}

// ---------------------------------------------------------
// GUARDAR INCIDENTE EN SQLITE
// ---------------------------------------------------------

export async function createLocalIncident(
  input: CreateLocalIncidentInput,
): Promise<LocalIncident> {
  validateInput(input);

  await initializeLocalIncidents();

  const incident: LocalIncident = {
    local_id: Crypto.randomUUID(),
    trekking_local_id: input.trekkingLocalId.trim(),
    owner_user_id: input.ownerUserId.trim(),
    incident_type: input.incidentType.trim(),
    description: input.description.trim(),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    photo_uri: input.photoUri ?? null,
    reported_at: new Date().toISOString(),
    sync_status: "pending",
  };

  const db = await getDatabase();

  await db.withExclusiveTransactionAsync(async (tx) => {
    const trekking = await tx.getFirstAsync<TrekkingRow>(
      `
      SELECT local_id
      FROM local_trekkings
      WHERE local_id = ?
        AND owner_user_id = ?
        AND status = 'IN_PROGRESS'
      LIMIT 1;
      `,
      [
        incident.trekking_local_id,
        incident.owner_user_id,
      ],
    );

    if (!trekking) {
      throw new Error(
        "No existe un trekking activo para registrar el incidente.",
      );
    }

    await tx.runAsync(
      `
      INSERT INTO local_incidents (
        local_id,
        trekking_local_id,
        owner_user_id,
        incident_type,
        description,
        latitude,
        longitude,
        photo_uri,
        reported_at,
        sync_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending');
      `,
      [
        incident.local_id,
        incident.trekking_local_id,
        incident.owner_user_id,
        incident.incident_type,
        incident.description,
        incident.latitude,
        incident.longitude,
        incident.photo_uri,
        incident.reported_at,
      ],
    );
  });

  return incident;
}

// ---------------------------------------------------------
// CONSULTAR INCIDENTES LOCALES
// ---------------------------------------------------------

export async function getLocalIncidents(
  trekkingLocalId: string,
  ownerUserId: string,
): Promise<LocalIncident[]> {
  await initializeLocalIncidents();

  const db = await getDatabase();

  return db.getAllAsync<LocalIncident>(
    `
    SELECT *
    FROM local_incidents
    WHERE trekking_local_id = ?
      AND owner_user_id = ?
    ORDER BY reported_at DESC;
    `,
    [
      trekkingLocalId.trim(),
      ownerUserId.trim(),
    ],
  );
}
