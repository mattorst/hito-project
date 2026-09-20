export type TrackingSyncStatus =
  | "pending"
  | "synced";

export interface TrackingPoint {
  id: number;
  localId: string;
  trekkingId: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  recordedAt: string;
  syncStatus: TrackingSyncStatus;
  createdAt: string;
}