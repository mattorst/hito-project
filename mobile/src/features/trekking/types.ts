export interface StartTrekkingRequest {
  trail: number;
}

export interface Trekking {
  id: number;
  trail: number;
  user: number;
  status: string;
  started_at: string;
  estimated_return_time: string;
  finished_at: string | null;
  tracking_enabled: boolean;
  created_at?: string; // Opcional o requerido según prefieras
}

export interface CheckpointRecord {
  id: number;
  trekking: number;
  checkpoint: number;
  registered_at: string;
}