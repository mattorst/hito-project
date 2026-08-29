export type SyncEventType = "checkpoint" | "incident";

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

export interface SyncRequest {
  checkpoint_records: SyncCheckpointRecord[];
  incidents: SyncIncident[];
}

export interface SyncFailedEvent {
  index: number;
  type: "checkpoint_record" | "incident";
  error: string;
}

export interface SyncData {
  synchronized: number;
  failed: SyncFailedEvent[];
}

export interface SyncResponse {
  success: boolean;
  data: SyncData;
  message: string;
}