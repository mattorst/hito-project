import React, {
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  Image,
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


// Referencia a la imagen checkpointIcon.jpg dentro de src/assets/images/
const checkpointImage = require("@/assets/images/iconqr.png");

// --- Paleta de diseño Senior (High Contrast Dark Mode iOS Style) -------------
const MAP_THEME = {
  background: "#0B0C0D",
  surface: "#17181B",
  surfaceBorder: "rgba(255, 255, 255, 0.12)",

  // Colores de Recorrido y Guiado
  plannedRoute: "#4A4D55", // Gris Grafito visible sobre terreno oscuro
  activeTrack: "#000000",   // Recorrido real en Negro Sólido
  accentLime: "#C8FF00",    // Verde Lima de acento Hito

  // Indicador de Ubicación iOS Puck
  userPuckBlue: "#007AFF",
  userPuckHalo: "rgba(0, 122, 255, 0.22)",

  // Textos y Estados
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

  // Sanitización y parseo de coordenadas de la ruta planificada
  const routeCoordinates = useMemo(() => {
    if (!routeGeoJSON?.coordinates) {
      return [];
    }

    return routeGeoJSON.coordinates
      .map(([longitude, latitude]) => ({
        latitude: Number(latitude),
        longitude: Number(longitude),
      }))
      .filter(
        (coord) =>
          Number.isFinite(coord.latitude) &&
          Number.isFinite(coord.longitude) &&
          coord.latitude >= -90 &&
          coord.latitude <= 90 &&
          coord.longitude >= -180 &&
          coord.longitude <= 180,
      );
  }, [routeGeoJSON]);

  // Sanitización de Checkpoints
  const validCheckpoints = useMemo(() => {
    return checkpoints
      .map((checkpoint) => {
        const latitude = Number(checkpoint.latitude);
        const longitude = Number(checkpoint.longitude);

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

  // Sanitización de Coordenadas de Tracking GPS
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

  // Coordenada actual del usuario
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

  // Encuadre automático basado en ruta y checkpoints
  const mapCoordinates = useMemo(() => {
    return [
      ...routeCoordinates,
      ...validCheckpoints.map(({ latitude, longitude }) => ({
        latitude,
        longitude,
      })),
    ];
  }, [routeCoordinates, validCheckpoints]);

  useEffect(() => {
    if (!mapRef.current || mapCoordinates.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(mapCoordinates, {
        edgePadding: {
          top: 48,
          right: 48,
          bottom: 72,
          left: 48,
        },
        animated: false,
      });
    }, 120);

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
            color={MAP_THEME.inkTertiary}
          />
        </View>

        <Text style={styles.emptyTitle}>Mapa no disponible</Text>

        <Text style={styles.emptySubtitle}>
          Este sendero aún no tiene una ruta o checkpoints configurados.
        </Text>
      </View>
    );
  }

  return (
    <MapView ref={mapRef} style={styles.map}>
      {/* 1. RUTA PLANIFICADA (Línea de base - Gris Grafito) */}
      {routeCoordinates.length >= 2 && (
        <Polyline
          coordinates={routeCoordinates}
          strokeWidth={5}
          strokeColor={MAP_THEME.plannedRoute}
          lineCap="round"
          lineJoin="round"
        />
      )}

      {/* 2. RECORRIDO GPS REAL (Track activo - Negro Sólido) */}
      {validTrackingCoordinates.length >= 2 && (
        <Polyline
          coordinates={validTrackingCoordinates}
          strokeWidth={6}
          strokeColor={MAP_THEME.activeTrack}
          lineCap="round"
          lineJoin="round"
        />
      )}

      {/* 3. CHECKPOINTS (Con tamaño delimitado mediante Image) */}
      {validCheckpoints.map(({ checkpoint, latitude, longitude }) => (
        <Marker
          key={checkpoint.id}
          coordinate={{
            latitude,
            longitude,
          }}
          title={checkpoint.name}
          anchor={{
            x: 0.5,
            y: 1.0,
          }}
        >
          <View style={styles.checkpointImageContainer}>
            <Image
              source={checkpointImage}
              style={styles.checkpointImage}
              resizeMode="contain"
            />
          </View>
        </Marker>
      ))}

      {/* 4. POSICIÓN ACTUAL (Puck de Navegación estilo iOS) */}
      {userCoordinate && (
        <Marker
          coordinate={userCoordinate}
          title="Mi ubicación"
          anchor={{
            x: 0.5,
            y: 0.5,
          }}
        >
          <View style={styles.userPuckHalo}>
            <View style={styles.userPuckOuter}>
              <View style={styles.userPuckInner} />
            </View>
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

  /* --- Checkpoint Image Marker --- */
  checkpointImageContainer: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  checkpointImage: {
    width: 38,
    height: 38,
  },

  /* --- Marcador Ubicación Actual (iOS Navigation Puck) --- */
  userPuckHalo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: MAP_THEME.userPuckHalo,
    justifyContent: "center",
    alignItems: "center",
  },

  userPuckOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: MAP_THEME.userPuckBlue,
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 5,
  },

  userPuckInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },

  /* --- Estado Vacío --- */
  emptyContainer: {
    flex: 1,
    backgroundColor: MAP_THEME.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: MAP_THEME.surface,
    borderWidth: 1,
    borderColor: MAP_THEME.surfaceBorder,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: MAP_THEME.inkPrimary,
    marginBottom: 4,
  },

  emptySubtitle: {
    fontSize: 13,
    color: MAP_THEME.inkSecondary,
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 18,
  },
});