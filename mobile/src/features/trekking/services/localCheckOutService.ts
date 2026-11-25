
import * as Crypto from "expo-crypto";

import { getDatabase } from "../storage/database";

import type {
  Checkpoint,
} from "@/features/parks/types";

import {
  buildQrCircuit,
  getNextQrCircuitStep,
  type CircuitEvent,
} from "./qrCircuit";

// ---------------------------------------------------------
// HITO — CHECK-OUT OFFLINE
//
// Exige:
// - Trekking activo.
// - Mismo QR utilizado en Check-In.
// - Circuito completo y en orden.
// - Segunda lectura de cima, cuando corresponda.
// - Cooldown de portería de 90 segundos.
//
// Guarda CHECK_OUT y COMPLETED en una única
// transacción SQLite exclusiva.
//
// No necesita Internet.
// No elimina registros.
// ---------------------------------------------------------

export interface CompleteTrekkingByQrInput {
  trekkingLocalId: string;
  ownerUserId: string;
  qrIdentifier: string;
}

export interface CompleteTrekkingByQrResult {
  checkpoint: Checkpoint;
  completedAt: string;
  alreadyCompleted: boolean;
}

interface LocalTrekkingRow {
  local_id: string;
  trail_id: number;
  status: string;
}

interface CachedCheckpointRow {
  payload: string;
}

const CHECK_OUT_COOLDOWN_MS = 90_000;

function validateInput(
  input: CompleteTrekkingByQrInput,
): void {
  if (!input.trekkingLocalId.trim()) {
    throw new Error(
      "No se identificó la excursión.",
    );
  }

  if (
    !/^[1-9]\d*$/.test(
      input.ownerUserId.trim(),
    )
  ) {
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

function parseCheckpoint(
  payload: string,
): Checkpoint {
  let checkpoint: Checkpoint;

  try {
    checkpoint = JSON.parse(
      payload,
    ) as Checkpoint;
  } catch {
    throw new Error(
      "El catálogo offline contiene datos dañados.",
    );
  }

  if (
    !checkpoint ||
    !Number.isSafeInteger(checkpoint.id) ||
    !Number.isSafeInteger(checkpoint.trail) ||
    typeof checkpoint.qr_identifier !== "string" ||
    !checkpoint.qr_identifier.trim()
  ) {
    throw new Error(
      "Los datos del checkpoint no son válidos.",
    );
  }

  return checkpoint;
}

// ---------------------------------------------------------
// FINALIZAR EXCURSIÓN
// ---------------------------------------------------------

export async function completeTrekkingByQr(
  input: CompleteTrekkingByQrInput,
): Promise<CompleteTrekkingByQrResult> {
  validateInput(input);

  const trekkingLocalId =
    input.trekkingLocalId.trim();

  const ownerUserId =
    input.ownerUserId.trim();

  const qrIdentifier =
    input.qrIdentifier.trim();

  const db = await getDatabase();

  let result:
    | CompleteTrekkingByQrResult
    | null = null;

  await db.withExclusiveTransactionAsync(
    async (tx) => {
      // ---------------------------------------------------
      // 1. VERIFICAR TREKKING Y PROPIETARIO
      // ---------------------------------------------------

      const trekking =
        await tx.getFirstAsync<LocalTrekkingRow>(
          `
          SELECT
            local_id,
            trail_id,
            status
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
          "Esta excursión no pertenece a tu cuenta o no existe.",
        );
      }

      // ---------------------------------------------------
      // 2. IDENTIFICAR QR DE PORTERÍA
      // ---------------------------------------------------

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
          "QR desconocido. No se puede finalizar sin validar la portería.",
        );
      }

      const checkpoint = parseCheckpoint(
        cached.payload,
      );

      if (
        checkpoint.trail !==
        trekking.trail_id
      ) {
        throw new Error(
          "Este QR pertenece a otro sendero.",
        );
      }

      if (
        checkpoint.checkpoint_type !==
        "ENTRY"
      ) {
        throw new Error(
          "Para finalizar debes escanear el QR original de entrada de la portería.",
        );
      }

      // ---------------------------------------------------
      // 3. LEER EVENTOS DE LA EXCURSIÓN
      // ---------------------------------------------------

      const events =
        await tx.getAllAsync<CircuitEvent>(
          `
          SELECT
            checkpoint_id,
            qr_identifier,
            event_type,
            occurred_at
          FROM local_checkpoint_events
          WHERE trekking_local_id = ?
          ORDER BY
            occurred_at ASC,
            created_at ASC,
            rowid ASC;
          `,
          [trekkingLocalId],
        );

      const checkInEvents = events.filter(
        (event) =>
          event.event_type === "CHECK_IN",
      );

      if (checkInEvents.length !== 1) {
        throw new Error(
          "Esta excursión no tiene un Check-In único y válido.",
        );
      }

      const checkIn = checkInEvents[0];

      if (
        checkIn.checkpoint_id !==
          checkpoint.id ||
        checkIn.qr_identifier !==
          qrIdentifier
      ) {
        throw new Error(
          "Debes finalizar en el mismo QR de portería donde iniciaste el trekking.",
        );
      }

      // ---------------------------------------------------
      // 4. CHECK-OUT YA COMPLETADO
      // ---------------------------------------------------

      const existingCheckOuts =
        events.filter(
          (event) =>
            event.event_type === "CHECK_OUT",
        );

      if (
        trekking.status === "COMPLETED"
      ) {
        if (
          existingCheckOuts.length !== 1
        ) {
          throw new Error(
            "El trekking figura como finalizado, pero su Check-Out es inconsistente.",
          );
        }

        const previousCheckOut =
          existingCheckOuts[0];

        if (
          previousCheckOut.checkpoint_id !==
            checkpoint.id ||
          previousCheckOut.qr_identifier !==
            qrIdentifier
        ) {
          throw new Error(
            "El Check-Out previo corresponde a otra portería.",
          );
        }

        result = {
          checkpoint,
          completedAt:
            previousCheckOut.occurred_at,
          alreadyCompleted: true,
        };

        return;
      }

      if (
        trekking.status !== "IN_PROGRESS"
      ) {
        throw new Error(
          "No existe un trekking activo que pueda finalizarse.",
        );
      }

      if (
        existingCheckOuts.length > 0
      ) {
        throw new Error(
          "Existe un Check-Out previo inconsistente. No se modificará la excursión.",
        );
      }

      // ---------------------------------------------------
      // 5. COOLDOWN DE PORTERÍA
      // ---------------------------------------------------

      const checkInTimestamp = Date.parse(
        checkIn.occurred_at,
      );

      if (
        !Number.isFinite(checkInTimestamp) ||
        Date.now() - checkInTimestamp <
          CHECK_OUT_COOLDOWN_MS
      ) {
        throw new Error(
          "El Check-In es demasiado reciente para registrar el Check-Out.",
        );
      }

      // ---------------------------------------------------
      // 6. CARGAR CATÁLOGO DEL SENDERO
      // ---------------------------------------------------

      const cachedRows =
        await tx.getAllAsync<CachedCheckpointRow>(
          `
          SELECT payload
          FROM cached_checkpoints
          WHERE trail_id = ?
          ORDER BY id ASC;
          `,
          [trekking.trail_id],
        );

      if (cachedRows.length === 0) {
        throw new Error(
          "No está disponible el catálogo offline del sendero.",
        );
      }

      const checkpoints =
        cachedRows.map(
          (row) =>
            parseCheckpoint(row.payload),
        );

      // ---------------------------------------------------
      // 7. VALIDAR CIRCUITO COMPLETO
      // ---------------------------------------------------

      const circuit = buildQrCircuit(
        checkpoints,
        checkIn.checkpoint_id,
      );

      const nextStep =
        getNextQrCircuitStep(
          circuit,
          events,
        );

      if (!nextStep) {
        throw new Error(
          "El circuito ya contiene todos sus eventos. Revisa el estado de la excursión.",
        );
      }

      if (
        nextStep.eventType !==
          "CHECK_OUT" ||
        nextStep.checkpoint.id !==
          checkpoint.id ||
        nextStep.checkpoint.qr_identifier !==
          qrIdentifier
      ) {
        throw new Error(
          `No puedes finalizar todavía. Debes completar primero el paso pendiente en "${nextStep.checkpoint.name}" (${nextStep.eventType}).`,
        );
      }

      // ---------------------------------------------------
      // 8. GUARDAR CHECK-OUT EN SQLITE
      // ---------------------------------------------------

      const now = new Date().toISOString();

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
        VALUES (
          ?, ?, ?, ?, 'CHECK_OUT',
          ?, 'pending', ?
        );
        `,
        [
          Crypto.randomUUID(),
          trekkingLocalId,
          checkpoint.id,
          qrIdentifier,
          now,
          now,
        ],
      );

      // ---------------------------------------------------
      // 9. FINALIZAR EN LA MISMA TRANSACCIÓN
      // ---------------------------------------------------

      const update =
        await tx.runAsync(
          `
          UPDATE local_trekkings
          SET
            status = 'COMPLETED',
            sync_status = 'pending'
          WHERE local_id = ?
            AND owner_user_id = ?
            AND status = 'IN_PROGRESS';
          `,
          [
            trekkingLocalId,
            ownerUserId,
          ],
        );

      if (update.changes !== 1) {
        throw new Error(
          "No fue posible finalizar el trekking.",
        );
      }

      result = {
        checkpoint,
        completedAt: now,
        alreadyCompleted: false,
      };
    },
  );

  if (!result) {
    throw new Error(
      "No fue posible confirmar el Check-Out.",
    );
  }

  return result;
}
