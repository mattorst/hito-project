
export type TrackingSyncStatus =
  | "pending"
  | "synced";

// ID numérico de Django o UUID de una sesión local.
export type TrackingTrekkingId = number | string;

export interface TrackingPoint {
  id: number;
  localId: string;

  // Puede ser NULL mientras Django no haya creado el trekking.
  trekkingId: number | null;

  // UUID de la sesión local; NULL para datos antiguos.
  trekkingLocalId: string | null;

  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;

  recordedAt: string;
  syncStatus: TrackingSyncStatus;
  createdAt: string;
}
