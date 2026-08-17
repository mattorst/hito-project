import AsyncStorage from "@react-native-async-storage/async-storage";

import type { SyncEvent } from "../types";

const SYNC_QUEUE_KEY = "@hito/sync_queue";

async function getAll(): Promise<SyncEvent[]> {
  try {
    const storedQueue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);

    if (!storedQueue) {
      return [];
    }

    const parsedQueue: unknown = JSON.parse(storedQueue);

    if (!Array.isArray(parsedQueue)) {
      console.warn(
        "[SyncQueue] El contenido almacenado no es una cola válida.",
      );

      return [];
    }

    return parsedQueue as SyncEvent[];
  } catch (error) {
    console.error(
      "[SyncQueue] Error al obtener la cola:",
      error,
    );

    return [];
  }
}

async function saveQueue(queue: SyncEvent[]): Promise<void> {
  await AsyncStorage.setItem(
    SYNC_QUEUE_KEY,
    JSON.stringify(queue),
  );
}

async function enqueue(event: SyncEvent): Promise<void> {
  const queue = await getAll();

  queue.push(event);

  await saveQueue(queue);
}

async function remove(eventId: string): Promise<void> {
  const queue = await getAll();

  const updatedQueue = queue.filter(
    (event) => event.id !== eventId,
  );

  await saveQueue(updatedQueue);
}

async function clear(): Promise<void> {
  await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
}

export const syncQueue = {
  enqueue,
  getAll,
  remove,
  clear,
};