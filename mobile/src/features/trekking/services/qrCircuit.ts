
import type { Checkpoint } from "@/features/parks/types";

// ---------------------------------------------------------
// HITO — CIRCUITO QR OFFLINE-FIRST
//
// Dos lecturas por checkpoint:
//
// ENTRY:
//   CHECK_IN -> CHECK_OUT
//
// NORMAL / REST:
//   CHECKPOINT_OUTBOUND -> CHECKPOINT_RETURN
//
// SUMMIT:
//   SUMMIT_ARRIVAL -> SUMMIT_DESCENT
//
// VIEWPOINT:
//   Se interpreta como cima SOLO si:
//   - Es el último punto del sendero.
//   - No existe un SUMMIT explícito.
//   - Es el único VIEWPOINT del circuito.
//
// Validación del orden completo.
// No realiza peticiones HTTP.
// No modifica registros SQLite.
// ---------------------------------------------------------

export type CircuitEventType =
  | "CHECK_IN"
  | "CHECKPOINT_OUTBOUND"
  | "SUMMIT_ARRIVAL"
  | "SUMMIT_DESCENT"
  | "CHECKPOINT_RETURN"
  | "CHECK_OUT";

export interface CircuitEvent {
  checkpoint_id: number;
  qr_identifier: string;
  event_type: string;
  occurred_at: string;
}

export interface CircuitStep {
  checkpoint: Checkpoint;
  eventType: CircuitEventType;
}

type CheckpointWithSequence = Checkpoint & {
  sequence?: number;
};

function getSequence(
  checkpoint: Checkpoint,
): number {
  const sequence = (
    checkpoint as CheckpointWithSequence
  ).sequence;

  if (
    typeof sequence !== "number" ||
    !Number.isSafeInteger(sequence) ||
    sequence < 0
  ) {
    throw new Error(
      `El checkpoint "${checkpoint.name}" no tiene un orden válido en el catálogo offline.`,
    );
  }

  return sequence;
}

function getCheckpointType(
  checkpoint: Checkpoint,
): string {
  return String(
    checkpoint.checkpoint_type ?? "",
  ).toUpperCase();
}

function validateCheckpoint(
  checkpoint: Checkpoint,
): void {
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
      "El catálogo contiene un checkpoint inválido.",
    );
  }

  getSequence(checkpoint);

  const validTypes = [
    "ENTRY",
    "EXIT",
    "NORMAL",
    "REST",
    "VIEWPOINT",
    "SUMMIT",
  ];

  if (
    !validTypes.includes(
      getCheckpointType(checkpoint),
    )
  ) {
    throw new Error(
      `El checkpoint "${checkpoint.name}" tiene un tipo no admitido.`,
    );
  }
}

// ---------------------------------------------------------
// CONSTRUIR CIRCUITO COMPLETO
// ---------------------------------------------------------

export function buildQrCircuit(
  checkpoints: Checkpoint[],
  entryCheckpointId: number,
): CircuitStep[] {
  if (
    !Array.isArray(checkpoints) ||
    checkpoints.length === 0
  ) {
    throw new Error(
      "El catálogo offline del sendero está vacío o es inválido.",
    );
  }

  checkpoints.forEach(validateCheckpoint);

  // -------------------------------------------------------
  // 1. VALIDAR CATÁLOGO
  // -------------------------------------------------------

  const usedIds = new Set<number>();
  const usedSequences = new Set<number>();
  const usedQrIdentifiers = new Set<string>();

  const trailId = checkpoints[0].trail;

  for (const checkpoint of checkpoints) {
    if (checkpoint.trail !== trailId) {
      throw new Error(
        "El catálogo contiene checkpoints de diferentes senderos.",
      );
    }

    if (usedIds.has(checkpoint.id)) {
      throw new Error(
        "El catálogo contiene IDs de checkpoint duplicados.",
      );
    }

    const sequence = getSequence(checkpoint);

    if (usedSequences.has(sequence)) {
      throw new Error(
        "El catálogo contiene números de secuencia duplicados.",
      );
    }

    if (
      usedQrIdentifiers.has(
        checkpoint.qr_identifier,
      )
    ) {
      throw new Error(
        "El catálogo contiene identificadores QR duplicados.",
      );
    }

    usedIds.add(checkpoint.id);
    usedSequences.add(sequence);

    usedQrIdentifiers.add(
      checkpoint.qr_identifier,
    );
  }

  // -------------------------------------------------------
  // 2. IDENTIFICAR PORTERÍA
  // -------------------------------------------------------

  const entry = checkpoints.find(
    (checkpoint) =>
      checkpoint.id === entryCheckpointId &&
      getCheckpointType(checkpoint) === "ENTRY",
  );

  if (!entry) {
    throw new Error(
      "No se encontró la portería original del trekking.",
    );
  }

  const entries = checkpoints.filter(
    (checkpoint) =>
      getCheckpointType(checkpoint) === "ENTRY",
  );

  if (entries.length !== 1) {
    throw new Error(
      "El circuito debe tener una única portería de entrada.",
    );
  }

  const entrySequence = getSequence(entry);

  // -------------------------------------------------------
  // 3. IDENTIFICAR PUNTOS DEL SENDERO
  // -------------------------------------------------------

  const routePoints = checkpoints
    .filter((checkpoint) => {
      const type =
        getCheckpointType(checkpoint);

      return (
        type === "NORMAL" ||
        type === "REST" ||
        type === "SUMMIT" ||
        type === "VIEWPOINT"
      );
    })
    .sort(
      (a, b) =>
        getSequence(a) - getSequence(b),
    );

  if (routePoints.length === 0) {
    throw new Error(
      "El sendero no tiene puntos suficientes para validar el circuito.",
    );
  }

  if (
    routePoints.some(
      (checkpoint) =>
        getSequence(checkpoint) <= entrySequence,
    )
  ) {
    throw new Error(
      "Los checkpoints deben estar después de la portería en la secuencia del sendero.",
    );
  }

  // -------------------------------------------------------
  // 4. IDENTIFICAR CIMA
  // -------------------------------------------------------

  const explicitSummits = routePoints.filter(
    (checkpoint) =>
      getCheckpointType(checkpoint) === "SUMMIT",
  );

  const viewpoints = routePoints.filter(
    (checkpoint) =>
      getCheckpointType(checkpoint) === "VIEWPOINT",
  );

  if (explicitSummits.length > 1) {
    throw new Error(
      "Este circuito solo admite una cima principal.",
    );
  }

  let summit: Checkpoint | null =
    explicitSummits[0] ?? null;

  if (!summit && viewpoints.length === 1) {
    const viewpoint = viewpoints[0];

    const lastPoint =
      routePoints[routePoints.length - 1];

    // Un mirador intermedio no se interpreta
    // automáticamente como cima.
    if (viewpoint.id === lastPoint.id) {
      summit = viewpoint;
    }
  }

  if (
    !summit &&
    viewpoints.length > 0
  ) {
    throw new Error(
      "El sendero contiene miradores sin una cima inequívoca. Revisa la configuración del circuito.",
    );
  }

  // Si existe SUMMIT explícito,
  // los VIEWPOINT intermedios funcionan
  // como checkpoints normales.
  const outboundPoints = routePoints.filter(
    (checkpoint) =>
      checkpoint.id !== summit?.id,
  );

  if (summit) {
    const summitSequence =
      getSequence(summit);

    if (
      outboundPoints.some(
        (checkpoint) =>
          getSequence(checkpoint) >=
          summitSequence,
      )
    ) {
      throw new Error(
        "La cima debe encontrarse después de los checkpoints intermedios.",
      );
    }
  }

  // -------------------------------------------------------
  // 5. CONSTRUIR SECUENCIA
  // -------------------------------------------------------

  const steps: CircuitStep[] = [
    {
      checkpoint: entry,
      eventType: "CHECK_IN",
    },
  ];

  // IDA EN ORDEN ASCENDENTE
  for (const checkpoint of outboundPoints) {
    steps.push({
      checkpoint,
      eventType: "CHECKPOINT_OUTBOUND",
    });
  }

  // CIMA: DOS LECTURAS EXPLÍCITAS
  if (summit) {
    steps.push({
      checkpoint: summit,
      eventType: "SUMMIT_ARRIVAL",
    });

    steps.push({
      checkpoint: summit,
      eventType: "SUMMIT_DESCENT",
    });
  }

  // VUELTA EN ORDEN DESCENDENTE
  for (
    const checkpoint of
    [...outboundPoints].reverse()
  ) {
    steps.push({
      checkpoint,
      eventType: "CHECKPOINT_RETURN",
    });
  }

  // CHECK-OUT EN PORTERÍA ORIGINAL
  steps.push({
    checkpoint: entry,
    eventType: "CHECK_OUT",
  });

  return steps;
}

// ---------------------------------------------------------
// VALIDAR HISTORIAL DE EVENTOS
// ---------------------------------------------------------

export function validateQrCircuitProgress(
  steps: CircuitStep[],
  events: CircuitEvent[],
): void {
  if (events.length > steps.length) {
    throw new Error(
      "El trekking contiene más eventos QR de los permitidos.",
    );
  }

  let previousTimestamp = -Infinity;

  for (
    let index = 0;
    index < events.length;
    index++
  ) {
    const event = events[index];
    const expected = steps[index];

    if (!expected) {
      throw new Error(
        "Se encontró un evento fuera del circuito.",
      );
    }

    const timestamp =
      Date.parse(event.occurred_at);

    if (
      !Number.isFinite(timestamp) ||
      timestamp < previousTimestamp
    ) {
      throw new Error(
        "Los eventos QR tienen fechas inconsistentes.",
      );
    }

    previousTimestamp = timestamp;

    const sameCheckpoint =
      event.checkpoint_id ===
      expected.checkpoint.id;

    const sameQr =
      event.qr_identifier ===
      expected.checkpoint.qr_identifier;

    const sameEventType =
      event.event_type ===
      expected.eventType;

    if (
      !sameCheckpoint ||
      !sameQr ||
      !sameEventType
    ) {
      throw new Error(
        `El historial QR es inconsistente en el paso ${index + 1}. Se esperaba "${expected.checkpoint.name}" (${expected.eventType}).`,
      );
    }
  }
}

// ---------------------------------------------------------
// OBTENER SIGUIENTE PASO
// ---------------------------------------------------------

export function getNextQrCircuitStep(
  steps: CircuitStep[],
  events: CircuitEvent[],
): CircuitStep | null {
  validateQrCircuitProgress(
    steps,
    events,
  );

  return steps[events.length] ?? null;
}
