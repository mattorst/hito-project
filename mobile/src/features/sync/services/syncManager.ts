
import {
  syncPendingTrekkingBootstraps,
} from "./localTrekkingBootstrapSync";

import {
  syncPendingQrEvents,
} from "./localCheckpointSync";

import {
  syncPendingTrackingPoints,
} from "./localTrackingSync";

import {
  syncPendingIncidents,
} from "./localIncidentSync";

import {
  syncPendingRescues,
} from "./localRescueSync";

// ---------------------------------------------------------
// HITO — COORDINADOR AUTOMÁTICO OFFLINE-FIRST
// ---------------------------------------------------------

export type SyncStage =
  | "trekkings"
  | "rescues"
  | "checkpoints"
  | "tracking"
  | "incidents";

export interface SyncStageResult {
  stage: SyncStage;
  synchronized: number;
  failed: number;
  skipped: number;
  error: string | null;
}

export interface SyncManagerResult {
  synchronized: number;
  failed: number;
  skipped: number;
  stages: SyncStageResult[];
}

export interface SyncManagerOptions {
  ownerUserId: string;

  shouldContinue?: () => boolean;
}

// Una sola sincronización automática a la vez.
// Las tarjetas manuales conservan sus controles propios.

let activeSync: Promise<SyncManagerResult> | null = null;

// ---------------------------------------------------------
// UTILIDADES
// ---------------------------------------------------------

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Error desconocido.";
}

function createResult(): SyncManagerResult {
  return {
    synchronized: 0,
    failed: 0,
    skipped: 0,
    stages: [],
  };
}

function addStage(
  result: SyncManagerResult,
  stage: SyncStageResult,
): void {
  result.stages.push(stage);

  result.synchronized += stage.synchronized;
  result.failed += stage.failed;
  result.skipped += stage.skipped;
}

// ---------------------------------------------------------
// EJECUTAR SINCRONIZACIÓN
// ---------------------------------------------------------

async function executeSync(
  options: SyncManagerOptions,
): Promise<SyncManagerResult> {
  const ownerUserId = options.ownerUserId.trim();

  if (!/^[1-9]\d*$/.test(ownerUserId)) {
    throw new Error(
      "No fue posible identificar al usuario.",
    );
  }

  const shouldContinue =
    options.shouldContinue ?? (() => true);

  const result = createResult();

  // -------------------------------------------------------
  // 1. EXCURSIONES Y ACOMPAÑANTES
  // -------------------------------------------------------
  //
  // Deben enviarse primero porque los demás
  // registros dependen del trekking remoto.
  //
  // Utilizamos directamente el servicio probado.
  // No dependemos de hooks de React.
  // -------------------------------------------------------

  if (!shouldContinue()) {
    return result;
  }

  try {
    const response =
      await syncPendingTrekkingBootstraps(
        ownerUserId,
      );

    addStage(result, {
      stage: "trekkings",
      synchronized: response.synchronized,
      failed: response.failed,
      skipped: 0,
      error:
        response.failed > 0
          ? `${response.failed} excursión(es) no se sincronizaron.`
          : null,
    });

    // No detenemos todos los módulos por un fallo
    // parcial: los servicios posteriores comprueban
    // individualmente si su trekking está sincronizado.
  } catch (error) {
    const message = errorMessage(error);

    console.warn(
      "[Hito AutoSync] Error en excursiones:",
      message,
    );

    addStage(result, {
      stage: "trekkings",
      synchronized: 0,
      failed: 1,
      skipped: 0,
      error: message,
    });

    // Sin poder comprobar el bootstrap,
    // no continuamos con registros dependientes.
    return result;
  }

  // -------------------------------------------------------
  // 2. SOLICITUDES Y CANCELACIONES DE RESCATE
  // -------------------------------------------------------
  //
  // Prioridad por seguridad.
  // Un rescate pendiente no debe esperar
  // detrás de muchas coordenadas GPS.
  // -------------------------------------------------------

  if (!shouldContinue()) {
    return result;
  }

  try {
    const response =
      await syncPendingRescues(ownerUserId);

    addStage(result, {
      stage: "rescues",
      synchronized: response.synchronized,
      failed: response.failed,
      skipped: 0,
      error:
        response.failed > 0
          ? "Algunos rescates siguen pendientes."
          : null,
    });
  } catch (error) {
    const message = errorMessage(error);

    console.warn(
      "[Hito AutoSync] Error en rescates:",
      message,
    );

    addStage(result, {
      stage: "rescues",
      synchronized: 0,
      failed: 1,
      skipped: 0,
      error: message,
    });
  }

  // -------------------------------------------------------
  // 3. CHECKPOINTS QR
  // -------------------------------------------------------

  if (!shouldContinue()) {
    return result;
  }

  try {
    const response =
      await syncPendingQrEvents(ownerUserId);

    addStage(result, {
      stage: "checkpoints",
      synchronized: response.synchronized,
      failed: response.failed,
      skipped: response.skipped,
      error:
        response.failed > 0 ||
        response.skipped > 0
          ? "Algunos checkpoints siguen pendientes."
          : null,
    });
  } catch (error) {
    const message = errorMessage(error);

    console.warn(
      "[Hito AutoSync] Error en checkpoints:",
      message,
    );

    addStage(result, {
      stage: "checkpoints",
      synchronized: 0,
      failed: 1,
      skipped: 0,
      error: message,
    });
  }

  // -------------------------------------------------------
  // 4. COORDENADAS GPS
  // -------------------------------------------------------

  if (!shouldContinue()) {
    return result;
  }

  try {
    const response =
      await syncPendingTrackingPoints(ownerUserId);

    addStage(result, {
      stage: "tracking",
      synchronized: response.synchronized,
      failed: response.failed,
      skipped: 0,
      error:
        response.failed > 0
          ? "Algunas coordenadas siguen pendientes."
          : null,
    });
  } catch (error) {
    const message = errorMessage(error);

    console.warn(
      "[Hito AutoSync] Error en GPS:",
      message,
    );

    addStage(result, {
      stage: "tracking",
      synchronized: 0,
      failed: 1,
      skipped: 0,
      error: message,
    });
  }

  // -------------------------------------------------------
  // 5. INCIDENTES Y FOTOGRAFÍAS
  // -------------------------------------------------------

  if (!shouldContinue()) {
    return result;
  }

  try {
    const response =
      await syncPendingIncidents(ownerUserId);

    addStage(result, {
      stage: "incidents",
      synchronized: response.synchronized,
      failed: response.failed,
      skipped: 0,
      error:
        response.failed > 0
          ? "Algunos incidentes siguen pendientes."
          : null,
    });
  } catch (error) {
    const message = errorMessage(error);

    console.warn(
      "[Hito AutoSync] Error en incidentes:",
      message,
    );

    addStage(result, {
      stage: "incidents",
      synchronized: 0,
      failed: 1,
      skipped: 0,
      error: message,
    });
  }

  return result;
}

// ---------------------------------------------------------
// ENTRADA PÚBLICA DEL COORDINADOR
// ---------------------------------------------------------

export async function syncPendingEvents(
  options: SyncManagerOptions,
): Promise<SyncManagerResult> {
  if (activeSync) {
    return activeSync;
  }

  const promise = executeSync(options);

  activeSync = promise;

  try {
    return await promise;
  } finally {
    if (activeSync === promise) {
      activeSync = null;
    }
  }
}
