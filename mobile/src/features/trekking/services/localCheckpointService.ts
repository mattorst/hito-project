
import * as Crypto from "expo-crypto";

import { getDatabase } from "../storage/database";

import type {
  Checkpoint,
} from "@/features/parks/types";

import {
  buildQrCircuit,
  getNextQrCircuitStep,
  type CircuitEvent,
  type CircuitEventType,
} from "./qrCircuit";

// ---------------------------------------------------------
// HITO — REGISTRO OFFLINE DE CHECKPOINTS
//
// Tipos de checkpoint admitidos:
// NORMAL, REST, SUMMIT, VIEWPOINT.
//
// La función buildQrCircuit determina qué evento
// corresponde realmente a cada checkpoint.
//
// Seguridad:
// - Validación del propietario.
// - Trekking en progreso.
// - QR correspondiente al sendero.
// - Historial completo en orden.
// - Cooldown de 90 segundos.
// - Transacción SQLite exclusiva.
// - UUID único por evento.
// - Sin eliminar registros.
// ---------------------------------------------------------

export type LocalCheckpointEventType = Extract<
  CircuitEventType,
  | "CHECKPOINT_OUTBOUND"
  | "CHECKPOINT_RETURN"
  | "SUMMIT_ARRIVAL"
  | "SUMMIT_DESCENT"
>;

export interface RegisterLocalCheckpointInput {
  trekkingLocalId: string;
  ownerUserId: string;
  qrIdentifier: string;
}

export interface RegisterLocalCheckpointResult {
  checkpoint: Checkpoint;
  eventType: LocalCheckpointEventType;
  occurredAt: string;
}

interface TrekkingRow {
  local_id: string;
  trail_id: number;
  status: string;
}

interface CachedCheckpointRow {
  payload: string;
}

const SCAN_COOLDOWN_MS = 90_000;

// ---------------------------------------------------------
// UTILIDADES
// ---------------------------------------------------------

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
      "Los datos del catálogo offline están dañados.",
    );
  }

  if (
    !checkpoint ||
    !Number.isSafeInteger(checkpoint.id) ||
    checkpoint.id <= 0 ||
    !Number.isSafeInteger(checkpoint.trail) ||
    checkpoint.trail <= 0 ||
    typeof checkpoint.qr_identifier !== "string" ||
    !checkpoint.qr_identifier.trim()
  ) {
    throw new Error(
      "El catálogo contiene datos de checkpoint inválidos.",
    );
  }

  return checkpoint;
}

function getCheckpointType(
  checkpoint: Checkpoint,
): string {
  return String(
    checkpoint.checkpoint_type ?? "",
  ).toUpperCase();
}

function isRouteCheckpoint(
  checkpoint: Checkpoint,
): boolean {
  const type = getCheckpointType(checkpoint);

  return (
    type === "NORMAL" ||
    type === "REST" ||
    type === "SUMMIT" ||
    type === "VIEWPOINT"
  );
}

function getNextEventType(
  eventType: CircuitEventType,
): LocalCheckpointEventType {
  switch (eventType) {
    case "CHECKPOINT_OUTBOUND":
    case "CHECKPOINT_RETURN":
    case "SUMMIT_ARRIVAL":
    case "SUMMIT_DESCENT":
      return eventType;

    default:
      throw new Error(
        "El siguiente paso del circuito no corresponde a un checkpoint intermedio. Debes utilizar la portería cuando corresponda.",
      );
  }
}

// ---------------------------------------------------------
// REGISTRAR CHECKPOINT LOCAL
// ---------------------------------------------------------

export async function registerLocalCheckpoint(
  input: RegisterLocalCheckpointInput,
): Promise<RegisterLocalCheckpointResult> {
  const trekkingLocalId =
    input.trekkingLocalId.trim();

  const ownerUserId =
    input.ownerUserId.trim();

  const qrIdentifier =
    input.qrIdentifier.trim();

  if (
    !trekkingLocalId ||
    !/^[1-9]\d*$/.test(ownerUserId) ||
    !qrIdentifier
  ) {
    throw new Error(
      "Faltan datos válidos para registrar el checkpoint.",
    );
  }

  const database = await getDatabase();

  let result:
    | RegisterLocalCheckpointResult
    | null = null;

  await database.withExclusiveTransactionAsync(
    async (tx) => {
      // ---------------------------------------------------
      // 1. VERIFICAR EL TREKKING
      // ---------------------------------------------------

      const trekking =
        await tx.getFirstAsync<TrekkingRow>(
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
          "No se encontró el trekking de tu cuenta.",
        );
      }

      if (
        trekking.status !== "IN_PROGRESS"
      ) {
        throw new Error(
          "Solo puedes registrar checkpoints durante un trekking activo.",
        );
      }

      // ---------------------------------------------------
      // 2. OBTENER EL CATÁLOGO OFFLINE
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
          "No está disponible el catálogo offline de este sendero.",
        );
      }

      const checkpoints =
        cachedRows.map(
          (row) =>
            parseCheckpoint(row.payload),
        );

      // ---------------------------------------------------
      // 3. IDENTIFICAR QR ESCANEADO
      // ---------------------------------------------------

      const checkpoint =
        checkpoints.find(
          (item) =>
            item.qr_identifier ===
            qrIdentifier,
        );

      if (!checkpoint) {
        throw new Error(
          "QR desconocido o perteneciente a otro sendero.",
        );
      }

      if (
        checkpoint.trail !==
        trekking.trail_id
      ) {
        throw new Error(
          "Este QR pertenece a otro sendero.",
        );
      }

      const checkpointType =
        getCheckpointType(checkpoint);

      if (
        checkpointType === "ENTRY" ||
        checkpointType === "EXIT"
      ) {
        throw new Error(
          "Este QR corresponde a la portería. Debe procesarse como Check-In o Check-Out.",
        );
      }

      // REST y VIEWPOINT son válidos.
      // Su comportamiento concreto lo decide
      // el circuito compartido.

      if (!isRouteCheckpoint(checkpoint)) {
        throw new Error(
          `El checkpoint "${checkpoint.name}" tiene un tipo no admitido: ${checkpointType}.`,
        );
      }

      // ---------------------------------------------------
      // 4. CONSULTAR TODOS LOS EVENTOS DEL TREKKING
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

      const checkInEvents =
        events.filter(
          (event) =>
            event.event_type ===
            "CHECK_IN",
        );

      if (
        checkInEvents.length !== 1
      ) {
        throw new Error(
          "El trekking debe tener exactamente un Check-In válido.",
        );
      }

      const checkIn =
        checkInEvents[0];

      // ---------------------------------------------------
      // 5. CONSTRUIR Y VALIDAR CIRCUITO
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
          "El circuito QR ya está completo.",
        );
      }

      if (
        nextStep.eventType === "CHECK_OUT"
      ) {
        throw new Error(
          "Ya completaste los checkpoints de ida y vuelta. Debes regresar a la portería y escanear el QR original para finalizar el trekking.",
        );
      }

      // ---------------------------------------------------
      // 6. EXIGIR EL CHECKPOINT CORRECTO
      // ---------------------------------------------------

      const sameCheckpoint =
        nextStep.checkpoint.id ===
        checkpoint.id;

      const sameQr =
        nextStep.checkpoint.qr_identifier ===
        qrIdentifier;

      if (
        !sameCheckpoint ||
        !sameQr
      ) {
        throw new Error(
          `No puedes registrar "${checkpoint.name}" todavía.\n\nEl siguiente punto del recorrido es "${nextStep.checkpoint.name}".`,
        );
      }

      // Determina si el evento es:
      // CHECKPOINT_OUTBOUND
      // CHECKPOINT_RETURN
      // SUMMIT_ARRIVAL
      // SUMMIT_DESCENT

      const eventType =
        getNextEventType(
          nextStep.eventType,
        );

      // ---------------------------------------------------
      // 7. EVITAR DOBLE LECTURA ACCIDENTAL
      // ---------------------------------------------------

      const previousSameCheckpoint =
        [...events]
          .reverse()
          .find(
            (event) =>
              event.checkpoint_id ===
              checkpoint.id,
          );

      if (previousSameCheckpoint) {
        const previousTimestamp =
          Date.parse(
            previousSameCheckpoint.occurred_at,
          );

        const elapsed =
          Date.now() -
          previousTimestamp;

        if (
          !Number.isFinite(previousTimestamp) ||
          elapsed < SCAN_COOLDOWN_MS
        ) {
          throw new Error(
            "Este QR fue escaneado recientemente. Debes esperar 90 segundos desde la lectura anterior para evitar un registro duplicado.",
          );
        }
      }

      // ---------------------------------------------------
      // 8. GUARDAR EL EVENTO EN SQLITE
      // ---------------------------------------------------

      const now =
        new Date().toISOString();

      const localId =
        Crypto.randomUUID();

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
          ?, ?, ?, ?, ?, ?,
          'pending', ?
        );
        `,
        [
          localId,
          trekkingLocalId,
          checkpoint.id,
          qrIdentifier,
          eventType,
          now,
          now,
        ],
      );

      result = {
        checkpoint,
        eventType,
        occurredAt: now,
      };
    },
  );

  if (!result) {
    throw new Error(
      "No se pudo confirmar el registro del checkpoint.",
    );
  }

  return result;
}
