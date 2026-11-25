
import { getDatabase } from "./database";

import type {
  LocalTrekking,
  LocalTrekkingCompanion,
  TrekkingCompanion,
} from "../types";

/**
 * Datos de preparación de trekking.
 * Cada registro pertenece a una cuenta.
 */
export interface CreateLocalTrekkingDraftInput {
  localId: string;
  ownerUserId: string;
  trailId: number;
  companions?: TrekkingCompanion[];
}

export interface LocalTrekkingGroup {
  trekking: LocalTrekking;
  companions: LocalTrekkingCompanion[];
  participantCount: number;
}

function validateOwnerUserId(ownerUserId: string): void {
  if (!/^[1-9]\d*$/.test(ownerUserId)) {
    throw new Error(
      "No se pudo identificar al usuario autenticado.",
    );
  }
}

function validateCompanion(
  companion: TrekkingCompanion,
): void {
  if (!companion.local_id.trim()) {
    throw new Error(
      "El acompañante necesita un identificador local.",
    );
  }

  if (!companion.first_name.trim()) {
    throw new Error(
      "Debes ingresar el nombre del acompañante.",
    );
  }

  if (!companion.last_name.trim()) {
    throw new Error(
      "Debes ingresar el apellido del acompañante.",
    );
  }

  if (!companion.emergency_contact_name.trim()) {
    throw new Error(
      "Debes ingresar el contacto de emergencia.",
    );
  }

  if (!companion.emergency_contact_phone.trim()) {
    throw new Error(
      "Debes ingresar el teléfono de emergencia.",
    );
  }
}

/**
 * Guarda una preparación y sus acompañantes
 * en una sola transacción SQLite.
 *
 * Todavía no inicia el trekking ni consulta Django.
 */
export async function createLocalTrekkingDraft(
  input: CreateLocalTrekkingDraftInput,
): Promise<LocalTrekkingGroup> {
  const companions = input.companions ?? [];

  if (!input.localId.trim()) {
    throw new Error(
      "El trekking necesita un identificador local.",
    );
  }

  if (
    !Number.isInteger(input.trailId) ||
    input.trailId <= 0
  ) {
    throw new Error(
      "El sendero seleccionado no es válido.",
    );
  }

  validateOwnerUserId(input.ownerUserId);
  companions.forEach(validateCompanion);

  const companionIds = companions.map(
    (companion) => companion.local_id,
  );

  if (new Set(companionIds).size !== companionIds.length) {
    throw new Error(
      "Existen acompañantes con identificadores repetidos.",
    );
  }

  const database = await getDatabase();
  const now = new Date().toISOString();

  await database.withExclusiveTransactionAsync(
    async (transaction) => {
      await transaction.runAsync(
        `
          INSERT INTO local_trekkings (
            local_id,
            server_id,
            trail_id,
            status,
            started_at,
            sync_status,
            created_at,
            owner_user_id
          )
          VALUES (?, NULL, ?, ?, ?, ?, ?, ?);
        `,
        [
          input.localId,
          input.trailId,
          "PLANNED",
          now,
          "pending",
          now,
          input.ownerUserId,
        ],
      );

      for (const companion of companions) {
        await transaction.runAsync(
          `
            INSERT INTO trekking_companions (
              local_id,
              trekking_local_id,
              first_name,
              last_name,
              sex,
              emergency_contact_name,
              emergency_contact_phone,
              sync_status,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
          `,
          [
            companion.local_id,
            input.localId,
            companion.first_name.trim(),
            companion.last_name.trim(),
            companion.sex ?? "",
            companion.emergency_contact_name.trim(),
            companion.emergency_contact_phone.trim(),
            "pending",
            now,
          ],
        );
      }
    },
  );

  const result = await getLocalTrekkingGroup(
    input.localId,
    input.ownerUserId,
  );

  if (!result) {
    throw new Error(
      "No fue posible recuperar el trekking guardado.",
    );
  }

  return result;
}

/**
 * Recupera la excursión local con sus acompañantes.
 * Solo permite consultar registros del propietario.
 */
export async function getLocalTrekkingGroup(
  localId: string,
  ownerUserId: string,
): Promise<LocalTrekkingGroup | null> {
  validateOwnerUserId(ownerUserId);

  const database = await getDatabase();

  const trekking =
    await database.getFirstAsync<LocalTrekking>(
      `
        SELECT *
        FROM local_trekkings
        WHERE local_id = ?
          AND owner_user_id = ?;
      `,
      [localId, ownerUserId],
    );

  if (!trekking) {
    return null;
  }

  const companions =
    await database.getAllAsync<LocalTrekkingCompanion>(
      `
        SELECT *
        FROM trekking_companions
        WHERE trekking_local_id = ?
        ORDER BY created_at ASC, rowid ASC;
      `,
      [localId],
    );

  return {
    trekking,
    companions,
    participantCount: 1 + companions.length,
  };
}

/**
 * Recupera borradores locales de la cuenta actual.
 */
export async function getLocalTrekkingDrafts(
  ownerUserId: string,
): Promise<LocalTrekking[]> {
  validateOwnerUserId(ownerUserId);

  const database = await getDatabase();

  return database.getAllAsync<LocalTrekking>(
    `
      SELECT *
      FROM local_trekkings
      WHERE status = 'PLANNED'
        AND owner_user_id = ?
      ORDER BY created_at DESC;
    `,
    ownerUserId,
  );
}

/**
 * Elimina únicamente preparaciones que todavía
 * no se han iniciado ni sincronizado.
 *
 * ON DELETE CASCADE elimina sus acompañantes.
 */
export async function deleteLocalTrekkingDraft(
  localId: string,
  ownerUserId: string,
): Promise<boolean> {
  validateOwnerUserId(ownerUserId);

  const database = await getDatabase();

  const result = await database.runAsync(
    `
      DELETE FROM local_trekkings
      WHERE local_id = ?
        AND status = 'PLANNED'
        AND server_id IS NULL
        AND owner_user_id = ?;
    `,
    [localId, ownerUserId],
  );

  return result.changes > 0;
}

/**
 * Recupera un trekking local en curso del usuario.
 */
export async function getActiveLocalTrekking(
  ownerUserId: string,
): Promise<LocalTrekkingGroup | null> {
  validateOwnerUserId(ownerUserId);

  const database = await getDatabase();

  const row = await database.getFirstAsync<{
    local_id: string;
  }>(
    `
      SELECT local_id
      FROM local_trekkings
      WHERE owner_user_id = ?
        AND status = 'IN_PROGRESS'
      LIMIT 1;
    `,
    ownerUserId,
  );

  if (!row) {
    return null;
  }

  return getLocalTrekkingGroup(
    row.local_id,
    ownerUserId,
  );
}

/**
 * Comprueba si la cuenta tiene un trekking local activo.
 */
export async function hasActiveLocalTrekking(
  ownerUserId: string,
): Promise<boolean> {
  validateOwnerUserId(ownerUserId);

  const database = await getDatabase();

  const row = await database.getFirstAsync<{
    total: number;
  }>(
    `
      SELECT COUNT(*) AS total
      FROM local_trekkings
      WHERE owner_user_id = ?
        AND status = 'IN_PROGRESS';
    `,
    ownerUserId,
  );

  return (row?.total ?? 0) > 0;
}

/**
 * Activa una preparación del usuario.
 *
 * PLANNED -> IN_PROGRESS
 *
 * Es idempotente para la misma sesión.
 * Aún no debe conectarse al botón hasta integrar
 * AuthContext y la finalización offline.
 */
export async function activateLocalTrekkingDraft(
  localId: string,
  ownerUserId: string,
): Promise<LocalTrekkingGroup> {
  validateOwnerUserId(ownerUserId);

  if (!localId.trim()) {
    throw new Error(
      "UUID de trekking inválido.",
    );
  }

  const database = await getDatabase();
  const now = new Date().toISOString();

  await database.withExclusiveTransactionAsync(
    async (tx) => {
      const existing = await tx.getFirstAsync<{
        status: string;
      }>(
        `
          SELECT status
          FROM local_trekkings
          WHERE local_id = ?
            AND owner_user_id = ?;
        `,
        localId,
        ownerUserId,
      );

      if (!existing) {
        throw new Error(
          "No existe esta preparación para la cuenta actual.",
        );
      }

      if (existing.status === "IN_PROGRESS") {
        return;
      }

      if (existing.status !== "PLANNED") {
        throw new Error(
          "Esta preparación no puede iniciarse.",
        );
      }

      const otherActive = await tx.getFirstAsync<{
        local_id: string;
      }>(
        `
          SELECT local_id
          FROM local_trekkings
          WHERE owner_user_id = ?
            AND status = 'IN_PROGRESS'
            AND local_id != ?
          LIMIT 1;
        `,
        ownerUserId,
        localId,
      );

      if (otherActive) {
        throw new Error(
          "Ya tienes un trekking local en curso.",
        );
      }

      const result = await tx.runAsync(
        `
          UPDATE local_trekkings
          SET status = 'IN_PROGRESS',
              started_at = ?
          WHERE local_id = ?
            AND owner_user_id = ?
            AND status = 'PLANNED';
        `,
        now,
        localId,
        ownerUserId,
      );

      if (result.changes !== 1) {
        throw new Error(
          "No fue posible activar el trekking.",
        );
      }
    },
  );

  const group = await getLocalTrekkingGroup(
    localId,
    ownerUserId,
  );

  if (!group || group.trekking.status !== "IN_PROGRESS") {
    throw new Error(
      "No fue posible recuperar el trekking activo.",
    );
  }

  return group;
}
