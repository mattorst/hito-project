
export interface Park {
  id: number;
  name: string;
  description: string;
  region?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  default_return_time?: number | null;
  is_active?: boolean;

  opening_time: string | null;
  last_entry_time: string | null;
  return_deadline: string | null;
}

export interface GeoJSONLineString {
  type: "LineString";
  coordinates: [number, number][];
}

export interface Trail {
  id: number;
  park: number;
  name: string;
  description: string;
  difficulty: string;
  status: string;
  estimated_duration: string;
  distance_km: string;
  max_altitude: number;
  route_geojson: GeoJSONLineString | null;
}

// ---------------------------------------------------------
// HITO — CHECKPOINT
//
// Compatible con los tipos reales del backend:
//
// ENTRY: Portería de entrada.
// EXIT: Salida independiente, si existe.
// NORMAL: Checkpoint intermedio.
// REST: Punto de descanso.
// VIEWPOINT: Mirador o punto panorámico.
// SUMMIT: Cima explícita.
//
// sequence:
// Orden establecido en Django.
// Requerido para validar el circuito QR completo.
// ---------------------------------------------------------

export type CheckpointType =
  | "ENTRY"
  | "EXIT"
  | "NORMAL"
  | "REST"
  | "VIEWPOINT"
  | "SUMMIT";

export interface Checkpoint {
  id: number;
  trail: number;
  name: string;

  sequence: number;

  checkpoint_type: CheckpointType;

  latitude: string;
  longitude: string;
  radius_meters: number;
  qr_identifier: string;
}
