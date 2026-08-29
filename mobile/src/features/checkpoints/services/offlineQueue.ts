import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SyncEvent } from "@/features/sync/types"; 

const SYNC_QUEUE_KEY = "@hito_sync_queue";

export async function getSyncQueue(): Promise<SyncEvent[]> {
  try {
    const data = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error al leer la cola offline:", error);
    return [];
  }
}

export async function enqueueSyncEvent(event: SyncEvent): Promise<void> {
  try {
    const queue = await getSyncQueue();
    queue.push(event);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Error al encolar evento offline:", error);
    throw error;
  }
}

// Mantenemos compatibilidad por si ActiveTrekkingScreen sigue llamando a enqueueCheckpoint directamente
export async function enqueueCheckpoint(event: any): Promise<void> {
  await enqueueSyncEvent({
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    type: "checkpoint",
    createdAt: new Date().toISOString(),
    payload: event,
  });
}