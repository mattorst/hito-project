export interface Park {
  id: number;
  name: string;
  description: string;
}

export interface Trail {
  id: number;
  park: number;
  name: string;
  description: string;
  distance_km: string;
  estimated_duration: string;
}

export interface Checkpoint {
  id: number;
  trail: number;
  name: string;
  latitude: string;
  longitude: string;
  radius_meters: number;
  qr_identifier: string;
}