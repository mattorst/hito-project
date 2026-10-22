import React, {
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, {
  Marker,
  Polyline,
} from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import type { LocationObject } from "expo-location";

import type {
  Checkpoint,
  GeoJSONLineString,
} from "../types";

import type {
  TrackingCoordinate,
} from "@/features/trekking/hooks/useTrackingTrack";

import CheckpointMarker from "./CheckpointMarker";

// Paleta visual del mapa
const COLORS = {
  background: "#111214",
  surface: "#17181B",
  surfaceBorder: "rgba(255,255,255,0.08)",

  lime: "#C8FF00",

  route: "#FFFFFF",
  tracking: "#C8FF00",

  inkPrimary: "#FFFFFF",
  inkSecondary: "#9BA1A6",
  inkTertiary: "#6E7378",
};

interface TrailMapProps {
  routeGeoJSON: GeoJSONLineString | null;
  checkpoints: Checkpoint[];
  location?: LocationObject | null;
  trackingCoordinates?: TrackingCoordinate[];
}

export default function TrailMap({
  routeGeoJSON,
  checkpoints,
  location,
  trackingCoordinates = [],
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

  const validTrackingCoordinates = useMemo(() => {
    return trackingCoordinates.filter(
      ({ latitude, longitude }) =>
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180,
    );
  }, [trackingCoordinates]);

  const userCoordinate = useMemo(() => {
    if (!location) {
      return null;
    }

    const { latitude, longitude } = location.coords;

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null;
    }

    return {
      latitude,
      longitude,
    };
  }, [location]);

  // El encuadre considera solamente la ruta planificada
  // y los checkpoints. No seguimos automáticamente al usuario.
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

  const hasData = mapCoordinates.length > 0;

  if (!hasData) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <Ionicons
            name="map-outline"
            size={28}
            color={COLORS.inkTertiary}
          />
        </View>

        <Text style={styles.emptyTitle}>
          Mapa no disponible
        </Text>

        <Text style={styles.emptySubtitle}>
          Este sendero aún no tiene una ruta o checkpoints configurados.
        </Text>
      </View>
    );
  }

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
    >
      {/* Ruta planificada del sendero */}
      {routeCoordinates.length >= 2 && (
        <Polyline
          coordinates={routeCoordinates}
          strokeWidth={4}
          strokeColor={COLORS.route}
        />
      )}

      {/* Recorrido GPS registrado durante el trekking */}
      {validTrackingCoordinates.length >= 2 && (
        <Polyline
          coordinates={validTrackingCoordinates}
          strokeWidth={5}
          strokeColor={COLORS.tracking}
        />
      )}

      {/* Checkpoints del sendero */}
      {validCheckpoints.map(
        ({
          checkpoint,
          latitude,
          longitude,
        }) => (
          <CheckpointMarker
            key={checkpoint.id}
            checkpoint={checkpoint}
            latitude={latitude}
            longitude={longitude}
          />
        ),
      )}

      {/* Marcador de la posición actual del usuario */}
      {userCoordinate && (
        <Marker
          coordinate={userCoordinate}
          title="Mi ubicación"
          anchor={{
            x: 0.5,
            y: 0.5,
          }}
        >
          <View style={styles.userLocationMarker}>
            <View style={styles.userLocationDot} />
          </View>
        </Marker>
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },

  userLocationMarker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(200,255,0,0.18)",
    borderWidth: 2,
    borderColor: COLORS.lime,
    justifyContent: "center",
    alignItems: "center",
  },

  userLocationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.lime,
  },

  emptyContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.inkPrimary,
    marginBottom: 4,
  },

  emptySubtitle: {
    fontSize: 13,
    color: COLORS.inkSecondary,
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 18,
  },
});