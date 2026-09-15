import React, {
  useEffect,
  useMemo,
  useRef,
} from "react";
import MapView, {
  Marker,
  Polyline,
} from "react-native-maps";
import type {
  Checkpoint,
  GeoJSONLineString,
} from "../types";

interface TrailMapProps {
  routeGeoJSON: GeoJSONLineString | null;
  checkpoints: Checkpoint[];
}

export default function TrailMap({
  routeGeoJSON,
  checkpoints,
}: TrailMapProps) {
  const mapRef = useRef<MapView | null>(null);

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

  const validCheckpoints = useMemo(() => {
    return checkpoints
      .map((checkpoint) => {
        const latitude = Number(checkpoint.latitude);
        const longitude = Number(checkpoint.longitude);

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return null;
        }

        if (
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          return null;
        }

        return {
          checkpoint,
          latitude,
          longitude,
        };
      })
      .filter(
        (
          item,
        ): item is {
          checkpoint: Checkpoint;
          latitude: number;
          longitude: number;
        } => item !== null,
      );
  }, [checkpoints]);

  const mapCoordinates = useMemo(() => {
    return [
      ...routeCoordinates,
      ...validCheckpoints.map(
        ({ latitude, longitude }) => ({
          latitude,
          longitude,
        }),
      ),
    ];
  }, [routeCoordinates, validCheckpoints]);

  useEffect(() => {
    if (!mapRef.current || mapCoordinates.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        mapCoordinates,
        {
          edgePadding: {
            top: 40,
            right: 40,
            bottom: 70,
            left: 40,
          },
          animated: false,
        },
      );
    }, 100);

    return () => clearTimeout(timer);
  }, [mapCoordinates]);

  return (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
    >
      {routeCoordinates.length >= 2 && (
        <Polyline
          coordinates={routeCoordinates}
          strokeWidth={4}
        />
      )}

      {validCheckpoints.map(
        ({
          checkpoint,
          latitude,
          longitude,
        }) => (
          <Marker
            key={checkpoint.id}
            coordinate={{
              latitude,
              longitude,
            }}
            title={checkpoint.name}
          />
        ),
      )}
    </MapView>
  );
}