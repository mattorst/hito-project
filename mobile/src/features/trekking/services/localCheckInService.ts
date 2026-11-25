
import * as Crypto from "expo-crypto";

import { getDatabase } from "../storage/database";

import {
  getLocalTrekkingGroup,
  type LocalTrekkingGroup,
} from "../storage/trekkingGroupStorage";

import type { Checkpoint } from "@/features/parks/types";

// ---------------------------------------------------------
// TIPOS
// ---------------------------------------------------------

export interface StartTrekkingByQrInput {
  trekkingLocalId: string;
  ownerUserId: string;
  qrIdentifier: string;
}

export interface StartTrekkingByQrResult {
  group: LocalTrekkingGroup;
  alreadyStarted: boolean;
  checkpoint: Checkpoint;
}

interface LocalTrekkingRow {
  local_id: string;
  trail_id: number;
  status: string;
}

interface CachedCheckpointRow {
  payload: string;
}

interface CheckInEventRow {
  qr_identifier: string;
  checkpoint_id: number;
}

// ---------------------------------------------------------
// VALIDACIÓN DE ENTRADA
// ---------------------------------------------------------

function validateInput(
  input: StartTrekkingByQrInput,
): void {
  if (!input.trekkingLocalId.trim()) {
    throw new Error(
      "No se identificó la excursión preparada.",
    );
  }

  if (!/^[1-9]\d*$/.test(input.ownerUserId)) {
    throw new Error(
      "No se pudo identificar al usuario.",
    );
  }

  if (!input.qrIdentifier.trim()) {
    throw new Error(
      "El código QR está vacío.",
    );
  }
}

// ---------------------------------------------------------
// CHECK-IN OFFLINE
// ---------------------------------------------------------

export async function startTrekkingByQr(
  input: StartTrekkingByQrInput,
): Promise<StartTrekkingByQrResult> {
  validateInput(input);

  const trekkingLocalId =
    input.trekkingLocalId.trim();

  const ownerUserId =
    input.ownerUserId.trim();

  const qrIdentifier =
    input.qrIdentifier.trim();

  const database = await getDatabase();

  let checkpoint: Checkpoint | null = null;
  let alreadyStarted = false;

  // Todas las validaciones y escrituras se realizan
  // en una transacción SQLite exclusiva.

  await database.withExclusiveTransactionAsync(
    async (tx) => {
      // 1. Buscar excursión del usuario.

      const trekking =
        await tx.getFirstAsync<LocalTrekkingRow>(
          `
          SELECT local_id, trail_id, status
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
          "No existe esta excursión preparada para tu cuenta.",
        );
      }

      // 2. Buscar QR en el catálogo local.

      const cached =
        await tx.getFirstAsync<CachedCheckpointRow>(
          `
          SELECT payload
          FROM cached_checkpoints
          WHERE qr_identifier = ?
          LIMIT 1;
          `,
          [qrIdentifier],
        );

      if (!cached) {
        throw new Error(
          "QR no reconocido. Descarga los datos del sendero antes de realizar el Check-In.",
        );
      }

      const found = JSON.parse(
        cached.payload,
      ) as Checkpoint;

      if (
        !Number.isInteger(found.id) ||
        !Number.isInteger(found.trail)
      ) {
        throw new Error(
          "Los datos del checkpoint no son válidos.",
        );
      }

      // 3. Comprobar que el QR pertenece al sendero.

      if (found.trail !== trekking.trail_id) {
        throw new Error(
          "Este QR pertenece a otro sendero.",
        );
      }

      // 4. Solamente un QR de entrada inicia
      // una excursión.

      if (found.checkpoint_type !== "ENTRY") {
        throw new Error(
          "Para iniciar el trekking debes escanear el QR de entrada de la portería.",
        );
      }

      checkpoint = found;

      // 5. Consultar si ya existe un Check-In
      // para esta excursión.

      const existingEvent =
        await tx.getFirstAsync<CheckInEventRow>(
          `
          SELECT
            qr_identifier,
            checkpoint_id
          FROM local_checkpoint_events
          WHERE trekking_local_id = ?
            AND event_type = 'CHECK_IN'
          LIMIT 1;
          `,
          [trekkingLocalId],
        );

      // Reintento del mismo escaneo:
      // no duplicamos el evento ni cambiamos la hora.

      if (trekking.status === "IN_PROGRESS") {
        if (
          existingEvent &&
          existingEvent.qr_identifier ===
            qrIdentifier &&
          existingEvent.checkpoint_id === found.id
        ) {
          alreadyStarted = true;
          return;
        }

        throw new Error(
          "Esta excursión ya está iniciada.",
        );
      }

      if (trekking.status !== "PLANNED") {
        throw new Error(
          "Esta excursión no puede iniciarse.",
        );
      }

      if (existingEvent) {
        throw new Error(
          "Existe un Check-In previo inconsistente. No se iniciará nuevamente la excursión.",
        );
      }

      // 6. Impedir dos excursiones activas
      // para la misma cuenta.

      const otherActive =
        await tx.getFirstAsync<{
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
          [
            ownerUserId,
            trekkingLocalId,
          ],
        );

      if (otherActive) {
        throw new Error(
          "Ya tienes otro trekking en curso.",
        );
      }

      // 7. Registrar la hora efectiva.
      // Se obtiene al validar el escaneo,
      // usando el reloj del dispositivo.

      const now = new Date().toISOString();
      const eventLocalId = Crypto.randomUUID();

      // 8. Insertar el Check-In.

      await tx.runAsync(
        `
        INSERT INTO local_checkpoint_events (
          local_id,
          trekking_local_id,
          checkpoint_id,
          qr_identifier,
          event_type,
          occurred_at,
          sync_status,
          created_at
        )
        VALUES (?, ?, ?, ?, 'CHECK_IN', ?, 'pending', ?);
        `,
        [
          eventLocalId,
          trekkingLocalId,
          found.id,
          qrIdentifier,
          now,
          now,
        ],
      );

      // 9. Activar trekking en la misma transacción.

      const update = await tx.runAsync(
        `
        UPDATE local_trekkings
        SET
          status = 'IN_PROGRESS',
          started_at = ?,
          sync_status = 'pending'
        WHERE local_id = ?
          AND owner_user_id = ?
          AND status = 'PLANNED';
        `,
        [
          now,
          trekkingLocalId,
          ownerUserId,
        ],
      );

      if (update.changes !== 1) {
        throw new Error(
          "No fue posible iniciar el trekking.",
        );
      }
    },
  );

  if (!checkpoint) {
    throw new Error(
      "No se pudo validar el checkpoint de entrada.",
    );
  }

  const group = await getLocalTrekkingGroup(
    trekkingLocalId,
    ownerUserId,
  );

  if (
    !group ||
    group.trekking.status !== "IN_PROGRESS"
  ) {
    throw new Error(
      "No fue posible recuperar el trekking iniciado.",
    );
  }

  return {
    group,
    alreadyStarted,
    checkpoint,
  };
}
