import AsyncStorage from "@react-native-async-storage/async-storage";
import { SyncEvent } from "../types";

const STORAGE_KEY = "SYNC_QUEUE";

export const syncQueue = {
  async getAll(): Promise<SyncEvent[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error reading sync queue:", error);
      return [];
    }
  },

  async saveAll(queue: SyncEvent[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error("Error saving sync queue:", error);
    }
  },

  async enqueue(eventOmitId: Omit<SyncEvent, "id" | "createdAt">): Promise<SyncEvent> {
    const queue = await this.getAll();
    const newEvent: SyncEvent = {
      ...eventOmitId,
      id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      createdAt: new Date().toISOString(),
    };

    queue.push(newEvent);
    await this.saveAll(queue);
    return newEvent;
  },

  async remove(idsToRemove: string[]): Promise<void> {
    let queue = await this.getAll();
    queue = queue.filter((item) => !idsToRemove.includes(item.id));
    await this.saveAll(queue);
  },

  async replace(newQueue: SyncEvent[]): Promise<void> {
    await this.saveAll(newQueue);
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing sync queue:", error);
    }
  },
};