import * as SQLite from "expo-sqlite";

const DATABASE_NAME = "hito.db";

async function initializeDatabase(
  database: SQLite.SQLiteDatabase,
): Promise<void> {
  const result = await database.getFirstAsync<{
    user_version: number;
  }>("PRAGMA user_version;");

  const currentVersion = result?.user_version ?? 0;

  if (currentVersion < 1) {
    await database.execAsync(`
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

      PRAGMA user_version = 1;
    `);
  }
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const database =
        await SQLite.openDatabaseAsync(DATABASE_NAME);

      await initializeDatabase(database);

      return database;
    })();
  }

  return databasePromise;
}

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;