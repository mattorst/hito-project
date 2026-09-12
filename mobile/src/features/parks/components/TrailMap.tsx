import React, { useMemo } from "react";
import MapView, { Polyline } from "react-native-maps";
import type { GeoJSONLineString } from "../types";

interface TrailMapProps {
  routeGeoJSON: GeoJSONLineString | null;
}

export default function TrailMap({
  routeGeoJSON,
}: TrailMapProps) {
  const routeCoordinates = useMemo(() => {
    if (!routeGeoJSON) {
      return [];
    }

    return routeGeoJSON.coordinates.map(
      ([longitude, latitude]) => ({
        latitude,
        longitude,
      }),
    );
  }, [routeGeoJSON]);

  return (
    <MapView
      style={{ flex: 1 }}
    >
      {routeCoordinates.length >= 2 && (
        <Polyline
          coordinates={routeCoordinates}
          strokeWidth={4}
        />
      )}
    </MapView>
  );
}