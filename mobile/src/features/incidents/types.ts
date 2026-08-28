export type IncidentType =
  | "PERSON_INJURED"
  | "DANGEROUS_ANIMAL"
  | "LANDSLIDE"
  | "FALLEN_TREE"
  | "BLOCKED_TRAIL"
  | "LOST_PERSON"
  | "WEATHER"
  | "OTHER";

export interface Incident {
  id: number;
  trekking: number;
  incident_type: IncidentType;
  description: string;
  latitude: string;
  longitude: string;
  registered_at: string;
  photo: string | null;
  created_at: string;
}

export interface CreateIncidentRequest {
  trekking: number;
  incident_type: IncidentType;
  description: string;
  latitude: string;
  longitude: string;
  registered_at: string;
  photo?: string | null;
}