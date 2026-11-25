
import { getDatabase } from "./database";

export async function checkDatabaseV3() {
  const db = await getDatabase();

  const version = await db.getFirstAsync<{
    user_version: number;
  }>("PRAGMA user_version;");

  const columns = await db.getAllAsync<{
    name: string;
    type: string;
    notnull: number;
  }>("PRAGMA table_info(tracking_points);");

  const count = await db.getFirstAsync<{
    total: number;
  }>(
    "SELECT COUNT(*) AS total FROM tracking_points;",
  );

  const integrity = await db.getFirstAsync<{
    integrity_check: string;
  }>("PRAGMA integrity_check;");

  const hasLocalId = columns.some(
    (column) => column.name === "trekking_local_id",
  );

  const serverIdColumn = columns.find(
    (column) => column.name === "trekking_id",
  );

  console.log("[HITO DB] Versión:", version?.user_version);
  console.log("[HITO DB] Total puntos GPS:", count?.total);
  console.log("[HITO DB] UUID local:", hasLocalId);
  console.log(
    "[HITO DB] ID remoto opcional:",
    serverIdColumn?.notnull === 0,
  );
  console.log(
    "[HITO DB] Integridad:",
    integrity?.integrity_check,
  );

  if (
    version?.user_version !== 3 ||
    !hasLocalId ||
    serverIdColumn?.notnull !== 0 ||
    integrity?.integrity_check !== "ok"
  ) {
    throw new Error(
      "La verificación de SQLite V3 no fue satisfactoria.",
    );
  }
}
