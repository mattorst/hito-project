/**
 * Cola global de sincronización de Hito.
 *
 * Compartida por los cinco servicios en el mismo proceso JS.
 * Los errores de una tarea no detienen las siguientes.
 * No altera SQLite ni bloquea las escrituras de registros offline.
 */
let queue: Promise<void> = Promise.resolve();

export async function withSyncLock<T>(
  name: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = queue;
  let release!: () => void;

  queue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  try {
    console.log(`[Hito SyncLock] Iniciando: ${name}`);
    return await operation();
  } finally {
    console.log(`[Hito SyncLock] Finalizando: ${name}`);
    release();
  }
}
