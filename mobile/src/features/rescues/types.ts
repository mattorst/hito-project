export type RescueStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED";

export interface Rescue {
  id: number;
  trekking: number;
  status: RescueStatus;
  started_at: string;
  finished_at: string | null;
  closed_reason: string;
  notes: string;
  created_at: string;
}

export interface CreateRescueRequest {
  trekking: number;
  status?: RescueStatus;
  started_at: string;
  finished_at?: string | null;
  closed_reason?: string;
  notes?: string;
}