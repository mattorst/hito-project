export interface Park {
  id: number;
  name: string;
  description: string;
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

export interface Checkpoint {
  id: number;
  trail: number;
  name: string;
  latitude: string;
  longitude: string;
  radius_meters: number;
  qr_identifier: string;
}