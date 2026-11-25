
import * as Crypto from "expo-crypto";

import { getDatabase } from "@/features/trekking/storage/database";

// ---------------------------------------------------------
// HITO — RESCATES OFFLINE
// ---------------------------------------------------------

export type LocalRescueStatus =
  | "ACTIVE"
  | "CANCELLED";

export type LocalRescueSyncStatus =
  | "pending"
  | "synced";

export interface LocalRescue {
  local_id: string;
  trekking_local_id: string;
  owner_user_id: string;
  status: LocalRescueStatus;
  latitude: number | null;
  longitude: number | null;
  requested_at: string;
  cancelled_at: string | null;
  sync_status: LocalRescueSyncStatus;
  created_at: string;
}

export interface CreateLocalRescueInput {
  trekkingLocalId: string;
  ownerUserId: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CreateLocalRescueResult {
  rescue: LocalRescue;
  alreadyExists: boolean;
}

interface TrekkingRow {
  local_id: string;
  status: string;
}

let initializationPromise: Promise<void> | null = null;

// ---------------------------------------------------------
// INICIALIZAR TABLA
// ---------------------------------------------------------

export async function initializeLocalRescues(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const db = await getDatabase();

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS local_rescues (
          local_id TEXT PRIMARY KEY NOT NULL,
          trekking_local_id TEXT NOT NULL,
          owner_user_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          latitude REAL,
          longitude REAL,
          requested_at TEXT NOT NULL,
          cancelled_at TEXT,
          sync_status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL,

          FOREIGN KEY (trekking_local_id)
            REFERENCES local_trekkings(local_id)
            ON DELETE RESTRICT
        );

        CREATE INDEX IF NOT EXISTS
          idx_local_rescues_trekking
        ON local_rescues (trekking_local_id);

        CREATE INDEX IF NOT EXISTS
          idx_local_rescues_sync
        ON local_rescues (sync_status);

        CREATE UNIQUE INDEX IF NOT EXISTS
          idx_local_rescues_one_active
        ON local_rescues (trekking_local_id)
        WHERE status = 'ACTIVE';
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

function validateIdentity(
  trekkingLocalId: string,
  ownerUserId: string,
): void {
  if (!trekkingLocalId.trim()) {
    throw new Error(
      "No se identificó la excursión activa.",
    );
  }

  if (!/^[1-9]\d*$/.test(ownerUserId.trim())) {
    throw new Error(
      "No se pudo identificar al usuario.",
    );
  }
}

function validateCoordinates(
  latitude: number | null,
  longitude: number | null,
): void {
  if (
    (latitude === null) !==
    (longitude === null)
  ) {
    throw new Error(
      "Las coordenadas GPS están incompletas.",
    );
  }

  if (latitude === null || longitude === null) {
    return;
  }

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

// ---------------------------------------------------------
// CONSULTAR RESCATE ACTIVO
// ---------------------------------------------------------

export async function getActiveLocalRescue(
  trekkingLocalId: string,
  ownerUserId: string,
): Promise<LocalRescue | null> {
  validateIdentity(trekkingLocalId, ownerUserId);

  await initializeLocalRescues();

  const db = await getDatabase();

  return db.getFirstAsync<LocalRescue>(
    `
    SELECT *
    FROM local_rescues
    WHERE trekking_local_id = ?
      AND owner_user_id = ?
      AND status = 'ACTIVE'
    LIMIT 1;
    `,
    [
      trekkingLocalId.trim(),
      ownerUserId.trim(),
    ],
  );
}

// ---------------------------------------------------------
// REGISTRAR SOLICITUD LOCAL
// ---------------------------------------------------------

export async function createLocalRescue(
  input: CreateLocalRescueInput,
): Promise<CreateLocalRescueResult> {
  const trekkingLocalId =
    input.trekkingLocalId.trim();

  const ownerUserId =
    input.ownerUserId.trim();

  validateIdentity(trekkingLocalId, ownerUserId);

  const latitude = input.latitude ?? null;
  const longitude = input.longitude ?? null;

  validateCoordinates(latitude, longitude);

  await initializeLocalRescues();

  const db = await getDatabase();

  let result: CreateLocalRescueResult | null = null;

  await db.withExclusiveTransactionAsync(async (tx) => {
    // 1. Verificar excursión y propietario.

    const trekking =
      await tx.getFirstAsync<TrekkingRow>(
        `
        SELECT local_id, status
        FROM local_trekkings
        WHERE local_id = ?
          AND owner_user_id = ?
        LIMIT 1;
        `,
        [
          trekkingLocalId,
          ownerUserId,
        ],
      );

    if (!trekking) {
      throw new Error(
        "La excursión no existe o no pertenece a tu cuenta.",
      );
    }

    if (trekking.status !== "IN_PROGRESS") {
      throw new Error(
        "Solo puedes registrar una solicitud de rescate durante una excursión activa.",
      );
    }

    // 2. Impedir duplicados.
    // Si existe una solicitud activa, no se crea otra.

    const existing =
      await tx.getFirstAsync<LocalRescue>(
        `
        SELECT *
        FROM local_rescues
        WHERE trekking_local_id = ?
          AND owner_user_id = ?
          AND status = 'ACTIVE'
        LIMIT 1;
        `,
        [
          trekkingLocalId,
          ownerUserId,
        ],
      );

    if (existing) {
      result = {
        rescue: existing,
        alreadyExists: true,
      };
      return;
    }

    // 3. Crear emergencia local.

    const now = new Date().toISOString();

    const rescue: LocalRescue = {
      local_id: Crypto.randomUUID(),
      trekking_local_id: trekkingLocalId,
      owner_user_id: ownerUserId,
      status: "ACTIVE",
      latitude,
      longitude,
      requested_at: now,
      cancelled_at: null,
      sync_status: "pending",
      created_at: now,
    };

    await tx.runAsync(
      `
      INSERT INTO local_rescues (
        local_id,
        trekking_local_id,
        owner_user_id,
        status,
        latitude,
        longitude,
        requested_at,
        cancelled_at,
        sync_status,
        created_at
      )
      VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?, NULL, 'pending', ?);
      `,
      [
        rescue.local_id,
        rescue.trekking_local_id,
        rescue.owner_user_id,
        rescue.latitude,
        rescue.longitude,
        rescue.requested_at,
        rescue.created_at,
      ],
    );

    result = {
      rescue,
      alreadyExists: false,
    };
  });

  if (!result) {
    throw new Error(
      "No fue posible guardar la solicitud de rescate.",
    );
  }

  return result;
}

// ---------------------------------------------------------
// CANCELAR SOLICITUD Y PROGRAMAR SINCRONIZACIÓN
// ---------------------------------------------------------

export async function cancelPendingLocalRescue(
  rescueLocalId: string,
  ownerUserId: string,
): Promise<void> {
  if (!rescueLocalId.trim()) {
    throw new Error(
      "No se identificó la solicitud de rescate.",
    );
  }

  if (!/^[1-9]\d*$/.test(ownerUserId.trim())) {
    throw new Error(
      "No se pudo identificar al usuario.",
    );
  }

  await initializeLocalRescues();

  const db = await getDatabase();

  await db.withExclusiveTransactionAsync(async (tx) => {
    const rescue =
      await tx.getFirstAsync<LocalRescue>(
        `
        SELECT *
        FROM local_rescues
        WHERE local_id = ?
          AND owner_user_id = ?
        LIMIT 1;
        `,
        [
          rescueLocalId.trim(),
          ownerUserId.trim(),
        ],
      );

    if (!rescue) {
      throw new Error(
        "No se encontró la solicitud de rescate.",
      );
    }

    if (rescue.status !== "ACTIVE") {
      throw new Error(
        "Esta solicitud ya no se encuentra activa.",
      );
    }

    // Si ya se sincronizó como ACTIVE, la cancelación
    // volverá a quedar 'pending' hasta que Django
    // la confirme.
    //
    // Cancelar localmente NO equivale a avisar
    // al guardaparque.

    const now = new Date().toISOString();

    const update = await tx.runAsync(
      `
      UPDATE local_rescues
      SET
        status = 'CANCELLED',
        cancelled_at = ?,
        sync_status = 'pending'
      WHERE local_id = ?
        AND owner_user_id = ?
        AND status = 'ACTIVE';
      `,
      [
        now,
        rescueLocalId.trim(),
        ownerUserId.trim(),
      ],
    );

    if (update.changes !== 1) {
      throw new Error(
        "No fue posible cancelar la solicitud.",
      );
    }
  });
}
