export type SyncEventType = "checkpoint" | "incident" | "tracking_point";

export interface SyncEvent {
  id: string;
  type: SyncEventType;
  createdAt: string;
  payload: SyncCheckpointRecord | IncidentSyncPayload | any;
}

export interface SyncCheckpointRecord {
  trekking: number;
  checkpoint: number;
  registered_at: string;
}

export interface IncidentSyncPayload {
  trekking: number;
  incident_type: string;
  description: string;
  latitude: string;
  longitude: string;
  registered_at: string;
  photoUri: string | null;
}

export interface SyncIncident {
  trekking: number;
  description: string;
  latitude: number;
  longitude: number;
  photo?: string | null;
}

// --- EXTENSIÓN TRACKING POINTS (M10.7.7) ---

export interface BackendTrackingPointPayload {
  local_id: string;
  trekking: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  recorded_at: string;
}

export interface SyncRequest {
  checkpoint_records?: SyncCheckpointRecord[];
  incidents?: SyncIncident[];
  tracking_points?: BackendTrackingPointPayload[];
}

export interface SyncFailedEvent {
  index: number;
  type: "checkpoint_record" | "incident" | "tracking_point";
  local_id?: string;
  error: string;
}

export interface SyncData {
  synchronized: {
    checkpoint_records?: number;
    incidents?: number;
    tracking_points?: number;
  };
  synced_local_ids?: string[];
  failed: SyncFailedEvent[];
}

export interface SyncResponse {
  status: string;
  message: string;
  data: SyncData;
}

export interface SyncTrackingResult {
  requested: number;
  synchronized: number;
  failed: number;
  syncedLocalIds: string[];
}