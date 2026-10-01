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

// Paleta oscura consistente con el resto de la app
const COLORS = {
  surface: "#17181B",
  surfaceBorder: "rgba(255,255,255,0.08)",
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

  // Validar y calcular la coordenada actual del usuario
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

  // Excluimos deliberadamente userCoordinate y trackingCoordinates
  // de fitToCoordinates para mantener el encuadre de la ruta planificada.
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

  // Si no hay puntos de ruta ni checkpoints válidos, mostrar estado vacío
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
      style={{ flex: 1 }}
    >
      {/* Ruta planificada del sendero */}
      {routeCoordinates.length >= 2 && (
        <Polyline
          coordinates={routeCoordinates}
          strokeWidth={4}
        />
      )}

      {/* Recorrido GPS registrado durante el trekking */}
      {validTrackingCoordinates.length >= 2 && (
        <Polyline
          coordinates={validTrackingCoordinates}
          strokeWidth={5}
        />
      )}

      {/* Checkpoints del sendero */}
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

      {/* Marcador de la posición actual del usuario */}
      {userCoordinate && (
        <Marker
          coordinate={userCoordinate}
          title="Mi ubicación"
        />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    backgroundColor: "#111214",
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
    color: "#FFFFFF",
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