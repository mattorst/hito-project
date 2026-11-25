import { getDatabase } from "@/features/trekking/storage/database";

import type {
  Park,
  Trail,
  Checkpoint,
} from "../types";

// =========================================================
// HITO — CATÁLOGO OFFLINE
// =========================================================
//
// Comparte la conexión SQLite con el módulo de trekking.
//
// Todas las tablas permanecen en hito.db.
// No elimina ni modifica registros GPS, excursiones,
// acompañantes o eventos QR.
//
// No modifica PRAGMA user_version.
//
// =========================================================

type CatalogTable =
  | "cached_parks"
  | "cached_trails"
  | "cached_checkpoints";

interface CachedRow {
  payload: string;
  updated_at: string;
}

export interface OfflineCatalogStatus {
  parks: number;
  trails: number;
  checkpoints: number;
  lastUpdatedAt: string | null;
}

// ---------------------------------------------------------
// Reintentos acotados ante contención transitoria de SQLite.
// No se reintentan errores de validación ni otros errores SQL.
// Las escrituras del catálogo son UPSERT idempotentes.
// ---------------------------------------------------------

function isDatabaseLocked(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error);
  return /database is locked|database table is locked|SQLITE_BUSY|SQLITE_LOCKED/i.test(message);
}

async function withCatalogRetry<T>(operation: () => Promise<T>): Promise<T> {
  const delaysMs = [120, 300, 700, 1200];

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isDatabaseLocked(error) || attempt >= delaysMs.length) {
        throw error;
      }
      await new Promise<void>((resolve) => {
        setTimeout(resolve, delaysMs[attempt]);
      });
    }
  }
}

// ---------------------------------------------------------
// INICIALIZACIÓN
// ---------------------------------------------------------

let catalogInitializationPromise: Promise<void> | null =
  null;

async function initializeCatalog(): Promise<void> {
  if (!catalogInitializationPromise) {
    catalogInitializationPromise = (async () => {
      const db = await getDatabase();

      await withCatalogRetry(() => db.execAsync(`
        CREATE TABLE IF NOT EXISTS cached_parks (
          id INTEGER PRIMARY KEY NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS cached_trails (
          id INTEGER PRIMARY KEY NOT NULL,
          park_id INTEGER NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS
          idx_cached_trails_park
        ON cached_trails (park_id);

        CREATE TABLE IF NOT EXISTS cached_checkpoints (
          id INTEGER PRIMARY KEY NOT NULL,
          trail_id INTEGER NOT NULL,
          qr_identifier TEXT NOT NULL UNIQUE,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS
          idx_cached_checkpoints_trail
        ON cached_checkpoints (trail_id);

        -- Manifiesto escrito SOLO tras descargar el catálogo completo.
        CREATE TABLE IF NOT EXISTS cached_trail_snapshots (
          trail_id INTEGER PRIMARY KEY NOT NULL,
          checkpoint_ids TEXT NOT NULL,
          downloaded_at TEXT NOT NULL
        );
      `));
    })().catch((error) => {
      catalogInitializationPromise = null;
      throw error;
    });
  }

  return catalogInitializationPromise;
}

async function getCatalogDatabase() {
  // Aseguramos que las tablas del catálogo existan.
  await initializeCatalog();

  // Retornamos la MISMA conexión gestionada por trekking.
  return getDatabase();
}

// ---------------------------------------------------------
// VALIDACIONES
// ---------------------------------------------------------

function assertArray(
  value: unknown,
  label: string,
): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(
      `${label}: respuesta inválida de la API.`,
    );
  }
}

function parseCached<T>(payload: string): T {
  return JSON.parse(payload) as T;
}

// ---------------------------------------------------------
// GUARDAR PARQUES
// ---------------------------------------------------------

export async function cacheParks(
  parks: Park[],
): Promise<void> {
  return withCatalogRetry(async () => {
  assertArray(parks, "Parques");

  const db = await getCatalogDatabase();
  const now = new Date().toISOString();

  await db.withExclusiveTransactionAsync(
    async (transaction) => {
      for (const park of parks) {
        await transaction.runAsync(
          `
          INSERT INTO cached_parks (
            id,
            payload,
            updated_at
          )
          VALUES (?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            payload = excluded.payload,
            updated_at = excluded.updated_at;
          `,
          [
            park.id,
            JSON.stringify(park),
            now,
          ],
        );
      }
    },
  );
  });
}

// ---------------------------------------------------------
// GUARDAR SENDEROS
// ---------------------------------------------------------

export async function cacheTrails(
  trails: Trail[],
): Promise<void> {
  return withCatalogRetry(async () => {
  assertArray(trails, "Senderos");

  const db = await getCatalogDatabase();
  const now = new Date().toISOString();

  await db.withExclusiveTransactionAsync(
    async (transaction) => {
      for (const trail of trails) {
        await transaction.runAsync(
          `
          INSERT INTO cached_trails (
            id,
            park_id,
            payload,
            updated_at
          )
          VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            park_id = excluded.park_id,
            payload = excluded.payload,
            updated_at = excluded.updated_at;
          `,
          [
            trail.id,
            trail.park,
            JSON.stringify(trail),
            now,
          ],
        );
      }
    },
  );
  });
}

// ---------------------------------------------------------
// GUARDAR CHECKPOINTS
// ---------------------------------------------------------

export async function cacheCheckpoints(
  checkpoints: Checkpoint[],
): Promise<void> {
  return withCatalogRetry(async () => {
  assertArray(checkpoints, "Checkpoints");

  const db = await getCatalogDatabase();
  const now = new Date().toISOString();

  await db.withExclusiveTransactionAsync(
    async (transaction) => {
      for (const checkpoint of checkpoints) {
        if (
          !checkpoint.qr_identifier ||
          !checkpoint.qr_identifier.trim()
        ) {
          throw new Error(
            "Un checkpoint no tiene QR válido.",
          );
        }

        await transaction.runAsync(
          `
          INSERT INTO cached_checkpoints (
            id,
            trail_id,
            qr_identifier,
            payload,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            trail_id = excluded.trail_id,
            qr_identifier = excluded.qr_identifier,
            payload = excluded.payload,
            updated_at = excluded.updated_at;
          `,
          [
            checkpoint.id,
            checkpoint.trail,
            checkpoint.qr_identifier,
            JSON.stringify(checkpoint),
            now,
          ],
        );
      }
    },
  );
  });
}

// ---------------------------------------------------------
// GUARDAR CATÁLOGO COMPLETO ATÓMICAMENTE
// ---------------------------------------------------------

export async function cacheFullCatalog(
  parks: Park[],
  trails: Trail[],
  checkpoints: Checkpoint[],
): Promise<void> {
  return withCatalogRetry(async () => {
  assertArray(parks, "Parques");
  assertArray(trails, "Senderos");
  assertArray(checkpoints, "Checkpoints");

  const db = await getCatalogDatabase();
  const now = new Date().toISOString();

  // Preparar el manifiesto de cada sendero a partir de la
  // respuesta completa. Nunca se deduce de filas SQLite antiguas.
  const snapshots = new Map<number, number[]>();
  const qrCodes = new Set<string>();
  const checkpointIds = new Set<number>();
  for (const trail of trails) {
    if (!Number.isInteger(trail.id) || trail.id <= 0) {
      throw new Error("Sendero inválido en el catálogo.");
    }
    snapshots.set(trail.id, []);
  }
  for (const cp of checkpoints) {
    if (
      !Number.isInteger(cp.id) || cp.id <= 0 ||
      !snapshots.has(cp.trail) ||
      !cp.qr_identifier?.trim() ||
      checkpointIds.has(cp.id) ||
      qrCodes.has(cp.qr_identifier)
    ) {
      throw new Error("Catálogo incompleto o inconsistente: checkpoints inválidos o duplicados.");
    }
    checkpointIds.add(cp.id);
    qrCodes.add(cp.qr_identifier);
    snapshots.get(cp.trail)!.push(cp.id);
  }

  // Una sola transacción para todo el catálogo.
  // Si falla una escritura, no se guarda una descarga
  // parcial.

  await db.withExclusiveTransactionAsync(
    async (transaction) => {
      // Parques

      for (const park of parks) {
        await transaction.runAsync(
          `
          INSERT INTO cached_parks (
            id,
            payload,
            updated_at
          )
          VALUES (?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            payload = excluded.payload,
            updated_at = excluded.updated_at;
          `,
          [
            park.id,
            JSON.stringify(park),
            now,
          ],
        );
      }

      // Senderos

      for (const trail of trails) {
        await transaction.runAsync(
          `
          INSERT INTO cached_trails (
            id,
            park_id,
            payload,
            updated_at
          )
          VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            park_id = excluded.park_id,
            payload = excluded.payload,
            updated_at = excluded.updated_at;
          `,
          [
            trail.id,
            trail.park,
            JSON.stringify(trail),
            now,
          ],
        );
      }

      // Checkpoints

      for (const checkpoint of checkpoints) {
        if (
          !checkpoint.qr_identifier ||
          !checkpoint.qr_identifier.trim()
        ) {
          throw new Error(
            "Un checkpoint no tiene QR válido.",
          );
        }

        await transaction.runAsync(
          `
          INSERT INTO cached_checkpoints (
            id,
            trail_id,
            qr_identifier,
            payload,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            trail_id = excluded.trail_id,
            qr_identifier = excluded.qr_identifier,
            payload = excluded.payload,
            updated_at = excluded.updated_at;
          `,
          [
            checkpoint.id,
            checkpoint.trail,
            checkpoint.qr_identifier,
            JSON.stringify(checkpoint),
            now,
          ],
        );
      }

      // El manifiesto se guarda en la MISMA transacción que
      // parques, senderos y checkpoints: jamás queda a medias.
      for (const [trailId, ids] of snapshots) {
        const trailCheckpoints = checkpoints.filter((cp) => cp.trail === trailId);
        // Un sendero sin QR de entrada nunca se considera listo.
        if (!trailCheckpoints.some((cp) => cp.checkpoint_type === "ENTRY")) {
          await transaction.runAsync(
            "DELETE FROM cached_trail_snapshots WHERE trail_id = ?;",
            [trailId],
          );
          continue;
        }
        await transaction.runAsync(
          `INSERT INTO cached_trail_snapshots (trail_id, checkpoint_ids, downloaded_at)
           VALUES (?, ?, ?)
           ON CONFLICT(trail_id) DO UPDATE SET
             checkpoint_ids = excluded.checkpoint_ids,
             downloaded_at = excluded.downloaded_at;`,
          [trailId, JSON.stringify(ids.sort((a, b) => a - b)), now],
        );
      }
    },
  );
  });
}

// ---------------------------------------------------------
// CONSULTAR PARQUES OFFLINE
// ---------------------------------------------------------

export async function getCachedParks():
  Promise<Park[]> {
  return withCatalogRetry(async () => {
  const db = await getCatalogDatabase();

  const rows = await db.getAllAsync<CachedRow>(
    `
    SELECT payload, updated_at
    FROM cached_parks
    ORDER BY id ASC;
    `,
  );

  return rows.map((row) =>
    parseCached<Park>(row.payload),
  );
  });
}

// ---------------------------------------------------------
// CONSULTAR SENDEROS OFFLINE
// ---------------------------------------------------------

export async function getCachedTrails(
  parkId?: number,
): Promise<Trail[]> {
  return withCatalogRetry(async () => {
  const db = await getCatalogDatabase();

  const rows =
    parkId !== undefined
      ? await db.getAllAsync<CachedRow>(
          `
          SELECT payload, updated_at
          FROM cached_trails
          WHERE park_id = ?
          ORDER BY id ASC;
          `,
          [parkId],
        )
      : await db.getAllAsync<CachedRow>(
          `
          SELECT payload, updated_at
          FROM cached_trails
          ORDER BY id ASC;
          `,
        );

  return rows.map((row) =>
    parseCached<Trail>(row.payload),
  );
  });
}

// ---------------------------------------------------------
// CONSULTAR CHECKPOINTS OFFLINE
// ---------------------------------------------------------

export async function getCachedCheckpoints(
  trailId?: number,
): Promise<Checkpoint[]> {
  return withCatalogRetry(async () => {
  const db = await getCatalogDatabase();

  const rows =
    trailId !== undefined
      ? await db.getAllAsync<CachedRow>(
          `
          SELECT payload, updated_at
          FROM cached_checkpoints
          WHERE trail_id = ?
          ORDER BY id ASC;
          `,
          [trailId],
        )
      : await db.getAllAsync<CachedRow>(
          `
          SELECT payload, updated_at
          FROM cached_checkpoints
          ORDER BY id ASC;
          `,
        );

  return rows.map((row) =>
    parseCached<Checkpoint>(row.payload),
  );
  });
}

// ---------------------------------------------------------
// BUSCAR CHECKPOINT POR QR
// ---------------------------------------------------------

export async function findCachedCheckpointByQr(
  qrIdentifier: string,
): Promise<Checkpoint | null> {
  return withCatalogRetry(async () => {
  const code = qrIdentifier.trim();

  if (!code) {
    return null;
  }

  const db = await getCatalogDatabase();

  const row = await db.getFirstAsync<CachedRow>(
    `
    SELECT payload, updated_at
    FROM cached_checkpoints
    WHERE qr_identifier = ?
    LIMIT 1;
    `,
    [code],
  );

  if (!row) {
    return null;
  }

  return parseCached<Checkpoint>(row.payload);
  });
}

// ---------------------------------------------------------
// ESTADO DEL CATÁLOGO OFFLINE
// ---------------------------------------------------------

export async function getOfflineCatalogStatus():
  Promise<OfflineCatalogStatus> {
  return withCatalogRetry(async () => {
  const db = await getCatalogDatabase();

  const getCount = async (
    table: CatalogTable,
  ): Promise<number> => {
    const result = await db.getFirstAsync<{
      total: number;
    }>(
      `SELECT COUNT(*) AS total FROM ${table};`,
    );

    return result?.total ?? 0;
  };

  // Lecturas secuenciales para mantener un orden claro.
  const parks = await getCount("cached_parks");

  const trails = await getCount("cached_trails");

  const checkpoints = await getCount(
    "cached_checkpoints",
  );

  const updated = await db.getFirstAsync<{
    last_updated: string | null;
  }>(
    `
    SELECT MAX(updated_at) AS last_updated
    FROM (
      SELECT updated_at FROM cached_parks
      UNION ALL
      SELECT updated_at FROM cached_trails
      UNION ALL
      SELECT updated_at FROM cached_checkpoints
    );
    `,
  );

  return {
    parks,
    trails,
    checkpoints,
    lastUpdatedAt: updated?.last_updated ?? null,
  };
  });
}


// ---------------------------------------------------------
// VERIFICAR CATÁLOGO COMPLETO DESCARGADO PARA UN SENDERO
// ---------------------------------------------------------
// Una caché antigua sin manifiesto NO se considera completa.
// El manifiesto contiene los IDs recibidos en la descarga
// completa y se compara con las filas efectivamente guardadas.
export async function hasOfflineTrailSnapshot(trailId: number): Promise<boolean> {
  if (!Number.isInteger(trailId) || trailId <= 0) return false;

  return withCatalogRetry(async () => {
    const db = await getCatalogDatabase();
    const snapshot = await db.getFirstAsync<{ checkpoint_ids: string }>(
      "SELECT checkpoint_ids FROM cached_trail_snapshots WHERE trail_id = ? LIMIT 1;",
      [trailId],
    );
    if (!snapshot) return false;

    let expectedIds: number[];
    try {
      const parsed: unknown = JSON.parse(snapshot.checkpoint_ids);
      if (!Array.isArray(parsed) || parsed.length === 0 ||
          !parsed.every((id) => Number.isInteger(id) && id > 0)) {
        return false;
      }
      expectedIds = parsed as number[];
    } catch {
      return false;
    }

    const rows = await db.getAllAsync<{ id: number; payload: string }>(
      "SELECT id, payload FROM cached_checkpoints WHERE trail_id = ?;",
      [trailId],
    );
    const byId = new Map(rows.map((row) => [row.id, row.payload]));
    let entryFound = false;
    for (const id of expectedIds) {
      const payload = byId.get(id);
      if (!payload) return false;
      try {
        const cp = JSON.parse(payload) as Checkpoint;
        if (cp.id !== id || cp.trail !== trailId ||
            !cp.qr_identifier?.trim()) return false;
        if (cp.checkpoint_type === "ENTRY") entryFound = true;
      } catch {
        return false;
      }
    }
    return entryFound;
  });
}
