import React, { useState } from "react";
import {
  Button,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getDatabase } from "../../src/features/trekking/storage/database";

export default function StorageTestScreen() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState<string | null>(null);

  const testDatabase = async () => {
    setStatus("testing");
    setError(null);

    try {
      const database = await getDatabase();

      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS storage_test (
          id INTEGER PRIMARY KEY NOT NULL,
          created_at TEXT NOT NULL
        );
      `);

      await database.runAsync(
        `
          INSERT INTO storage_test (created_at)
          VALUES (?);
        `,
        new Date().toISOString(),
      );

      const row = await database.getFirstAsync<{
        id: number;
        created_at: string;
      }>(
        `
          SELECT id, created_at
          FROM storage_test
          ORDER BY id DESC
          LIMIT 1;
        `,
      );

      if (!row) {
        throw new Error(
          "No fue posible recuperar el registro de prueba.",
        );
      }

      setStatus(
        `SQLite OK — ID ${row.id} — ${row.created_at}`,
      );
    } catch (err) {
      console.error(
        "Error en prueba SQLite:",
        err,
      );

      setStatus("error");
      setError(
        "No fue posible inicializar o consultar SQLite.",
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        SQLite test
      </Text>

      <Text>
        Estado: {status}
      </Text>

      {error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}

      <Button
        title="Probar SQLite"
        onPress={testDatabase}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  error: {
    marginVertical: 12,
  },
});