
export interface TrekkingCompanion {
  local_id: string;
  first_name: string;
  last_name: string;
  sex?: "" | "M" | "F" | "O" | "N";
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

export interface StartTrekkingRequest {
  trail: number;

  // Opcional: [] o campo omitido = recorrido individual.
  companions?: TrekkingCompanion[];
}

export interface Trekking {
  id: number;
  trail: number;
  user?: number;
  status: string;
  started_at: string;
  estimated_return_time: string;
  finished_at: string | null;
  tracking_enabled: boolean;
  created_at?: string;

  // Nuevos campos recibidos desde Django.
  companions?: TrekkingCompanion[];
  participant_count?: number;
}

export interface CheckpointRecord {
  id: number;
  trekking: number;
  checkpoint: number;
  registered_at: string;
}

// Estados de persistencia local.
export type TrekkingSyncStatus =
  | "pending"
  | "synced"
  | "error";

export interface LocalTrekking {
  local_id: string;
  server_id: number | null;
  trail_id: number;
  status: string;
  started_at: string;
  sync_status: TrekkingSyncStatus;
  created_at: string;
}

export interface LocalTrekkingCompanion
  extends TrekkingCompanion {
  trekking_local_id: string;
  sync_status: TrekkingSyncStatus;
  created_at: string;
}
