
import * as SQLite from "expo-sqlite";

const DATABASE_NAME = "hito.db";
const DATABASE_VERSION = 5;

let databasePromise:
  | Promise<SQLite.SQLiteDatabase>
  | null = null;

async function initializeDatabase(
  database: SQLite.SQLiteDatabase,
): Promise<void> {
  await database.execAsync(
    "PRAGMA foreign_keys = ON;",
  );

  const result = await database.getFirstAsync<{
    user_version: number;
  }>("PRAGMA user_version;");

  const currentVersion = result?.user_version ?? 0;

  if (currentVersion > DATABASE_VERSION) {
    throw new Error(
      `La base de datos utiliza una versión más reciente (${currentVersion}).`,
    );
  }

  // -------------------------------------------------------
  // V1 — Seguimiento GPS original
  // -------------------------------------------------------

  if (currentVersion < 1) {
    await database.withExclusiveTransactionAsync(
      async (tx) => {
        await tx.execAsync(`
          CREATE TABLE IF NOT EXISTS tracking_points (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            local_id TEXT NOT NULL UNIQUE,
            trekking_id INTEGER NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            accuracy REAL,
            altitude REAL,
            speed REAL,
            recorded_at TEXT NOT NULL,
            sync_status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL
          );

          CREATE INDEX IF NOT EXISTS idx_tracking_points_trekking_id
          ON tracking_points (trekking_id);

          CREATE INDEX IF NOT EXISTS idx_tracking_points_sync_status
          ON tracking_points (sync_status);
        `);

        await tx.execAsync(
          "PRAGMA user_version = 1;",
        );
      },
    );
  }

  // -------------------------------------------------------
  // V2 — Excursiones locales y acompañantes
  // -------------------------------------------------------

  if (currentVersion < 2) {
    await database.withExclusiveTransactionAsync(
      async (tx) => {
        await tx.execAsync(`
          CREATE TABLE IF NOT EXISTS local_trekkings (
            local_id TEXT PRIMARY KEY NOT NULL,
            server_id INTEGER UNIQUE,
            trail_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            started_at TEXT NOT NULL,
            sync_status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL
          );

          CREATE INDEX IF NOT EXISTS idx_local_trekkings_sync
          ON local_trekkings (sync_status);

          CREATE TABLE IF NOT EXISTS trekking_companions (
            local_id TEXT PRIMARY KEY NOT NULL,
            trekking_local_id TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            sex TEXT NOT NULL DEFAULT '',
            emergency_contact_name TEXT NOT NULL,
            emergency_contact_phone TEXT NOT NULL,
            sync_status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,

            FOREIGN KEY (trekking_local_id)
              REFERENCES local_trekkings(local_id)
              ON DELETE CASCADE
          );

          CREATE INDEX IF NOT EXISTS idx_companions_trekking
          ON trekking_companions (trekking_local_id);

          CREATE INDEX IF NOT EXISTS idx_companions_sync
          ON trekking_companions (sync_status);
        `);

        await tx.execAsync(
          "PRAGMA user_version = 2;",
        );
      },
    );
  }

  // -------------------------------------------------------
  // V3 — GPS compatible con excursiones Offline-First
  // -------------------------------------------------------

  if (currentVersion < 3) {
    await database.withExclusiveTransactionAsync(
      async (tx) => {
        await tx.execAsync(`
          CREATE TABLE tracking_points_v3 (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            local_id TEXT NOT NULL UNIQUE,
            trekking_id INTEGER,
            trekking_local_id TEXT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            accuracy REAL,
            altitude REAL,
            speed REAL,
            recorded_at TEXT NOT NULL,
            sync_status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,

            CHECK (
              trekking_id IS NOT NULL
              OR trekking_local_id IS NOT NULL
            ),

            FOREIGN KEY (trekking_local_id)
              REFERENCES local_trekkings(local_id)
              ON DELETE RESTRICT
          );
        `);

        // Preservar coordenadas existentes.

        await tx.execAsync(`
          INSERT INTO tracking_points_v3 (
            id,
            local_id,
            trekking_id,
            trekking_local_id,
            latitude,
            longitude,
            accuracy,
            altitude,
            speed,
            recorded_at,
            sync_status,
            created_at
          )
          SELECT
            id,
            local_id,
            trekking_id,
            NULL,
            latitude,
            longitude,
            accuracy,
            altitude,
            speed,
            recorded_at,
            sync_status,
            created_at
          FROM tracking_points;
        `);

        await tx.execAsync(`
          DROP TABLE tracking_points;

          ALTER TABLE tracking_points_v3
          RENAME TO tracking_points;

          CREATE INDEX idx_tracking_points_trekking_id
          ON tracking_points (trekking_id);

          CREATE INDEX idx_tracking_points_local_trekking
          ON tracking_points (trekking_local_id);

          CREATE INDEX idx_tracking_points_sync_status
          ON tracking_points (sync_status);
        `);

        await tx.execAsync(
          "PRAGMA user_version = 3;",
        );
      },
    );
  }

  // -------------------------------------------------------
  // V4 — Propietario de la excursión
  // -------------------------------------------------------

  if (currentVersion < 4) {
    await database.withExclusiveTransactionAsync(
      async (tx) => {
        await tx.execAsync(`
          ALTER TABLE local_trekkings
          ADD COLUMN owner_user_id TEXT;

          CREATE INDEX IF NOT EXISTS
            idx_local_trekkings_owner
          ON local_trekkings (owner_user_id);

          CREATE UNIQUE INDEX IF NOT EXISTS
            idx_local_trekkings_one_active_owner
          ON local_trekkings (owner_user_id)
          WHERE status = 'IN_PROGRESS'
            AND owner_user_id IS NOT NULL;
        `);

        await tx.execAsync(
          "PRAGMA user_version = 4;",
        );
      },
    );
  }

  // -------------------------------------------------------
  // V5 — Eventos de checkpoints locales
  // -------------------------------------------------------

  if (currentVersion < 5) {
    await database.withExclusiveTransactionAsync(
      async (tx) => {
        await tx.execAsync(`
          CREATE TABLE IF NOT EXISTS
            local_checkpoint_events (
              local_id TEXT PRIMARY KEY NOT NULL,
              trekking_local_id TEXT NOT NULL,
              checkpoint_id INTEGER NOT NULL,
              qr_identifier TEXT NOT NULL,
              event_type TEXT NOT NULL,
              occurred_at TEXT NOT NULL,
              sync_status TEXT NOT NULL DEFAULT 'pending',
              created_at TEXT NOT NULL,

              FOREIGN KEY (trekking_local_id)
                REFERENCES local_trekkings(local_id)
                ON DELETE RESTRICT
            );

          CREATE INDEX IF NOT EXISTS
            idx_local_checkpoint_events_trekking
          ON local_checkpoint_events (
            trekking_local_id
          );

          CREATE INDEX IF NOT EXISTS
            idx_local_checkpoint_events_sync
          ON local_checkpoint_events (
            sync_status
          );

          CREATE UNIQUE INDEX IF NOT EXISTS
            idx_local_checkpoint_events_unique
          ON local_checkpoint_events (
            trekking_local_id,
            checkpoint_id,
            event_type
          );
        `);

        await tx.execAsync(
          "PRAGMA user_version = 5;",
        );
      },
    );
  }

  // -------------------------------------------------------
  // Comprobación final
  // -------------------------------------------------------

  const versionResult =
    await database.getFirstAsync<{
      user_version: number;
    }>("PRAGMA user_version;");

  if (
    (versionResult?.user_version ?? 0) !==
    DATABASE_VERSION
  ) {
    throw new Error(
      "La versión de la base de datos Hito no es compatible.",
    );
  }
}

// ---------------------------------------------------------
// ACCESO CENTRALIZADO
// ---------------------------------------------------------

export async function getDatabase():
  Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const database =
        await SQLite.openDatabaseAsync(
          DATABASE_NAME,
        );

      try {
        // Permite esperar transacciones breves de GPS, QR y catálogo.
        // WAL mantiene lecturas disponibles durante escrituras.
        // No elimina tablas ni cambia PRAGMA user_version.
        await database.execAsync("PRAGMA busy_timeout = 5000;");
        await database.execAsync("PRAGMA journal_mode = WAL;");

        await initializeDatabase(database);

        return database;
      } catch (error) {
        databasePromise = null;

        await database.closeAsync();

        throw error;
      }
    })();
  }

  return databasePromise;
}

export { DATABASE_VERSION };
