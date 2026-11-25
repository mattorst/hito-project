
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, {
  Marker,
  Polyline,
  type LatLng,
} from "react-native-maps";
import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import type { LocationObject } from "expo-location";
import type {
  Checkpoint,
  GeoJSONLineString,
} from "../types";
import type {
  TrackingCoordinate,
} from "@/features/trekking/hooks/useTrackingTrack";

export type TrailMapQrEvent = {
  checkpoint_id: number;
  event_type: string;
};

interface TrailMapProps {
  routeGeoJSON: GeoJSONLineString | null;
  checkpoints: Checkpoint[];
  location?: LocationObject | null;
  trackingCoordinates?: TrackingCoordinate[];
  checkpointEvents?: TrailMapQrEvent[];
  focusRequest?: number;
  fitRequest?: number;
}

const C = {
  lime: "#C6FF4D",
  charcoal: "#18201D",
  white: "#FFFFFF",
  muted: "#D6DEDA",
  blue: "#167BFA",
  border: "rgba(255,255,255,0.30)",
  glassBg: "rgba(17,24,21,0.82)",
  glassBorder: "rgba(255,255,255,0.35)",
};

type VisualState =
  | "pending"
  | "outbound"
  | "complete"
  | "summitArrival"
  | "summitDescent";

function isValidCoordinate(
  latitude: number,
  longitude: number,
): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function getVisualState(
  checkpointId: number,
  events: TrailMapQrEvent[],
): VisualState {
  const types = new Set(
    events
      .filter(
        (event) =>
          Number(event.checkpoint_id) ===
          checkpointId,
      )
      .map((event) => event.event_type),
  );

  if (
    types.has("CHECK_OUT") ||
    types.has("CHECKPOINT_RETURN")
  ) {
    return "complete";
  }

  if (types.has("SUMMIT_DESCENT")) {
    return "summitDescent";
  }

  if (types.has("SUMMIT_ARRIVAL")) {
    return "summitArrival";
  }

  if (
    types.has("CHECK_IN") ||
    types.has("CHECKPOINT_OUTBOUND")
  ) {
    return "outbound";
  }

  return "pending";
}

function isCompleted(state: VisualState): boolean {
  return (
    state === "complete" ||
    state === "summitDescent"
  );
}

// ---------------------------------------------------------
// PIN DE CHECKPOINT
//
// Un único diseño para todo punto que no sea la portería:
// el circuito es cerrado (ida y vuelta), así que no existe
// un evento distinto para "cima" — es el mismo patrón
// outbound/return de cualquier otro checkpoint.
// Pendiente = oscuro con borde blanco.
// Ida registrada = blanco.
// Circuito completado = verde lima.
// ---------------------------------------------------------

function CheckpointPin({
  state,
}: {
  state: VisualState;
}) {
  const complete = isCompleted(state);
  const outbound = state !== "pending";

  return (
    <View
      style={styles.pinArea}
      collapsable={false}
    >
      <View
        style={[
          styles.pinBadge,
          !complete &&
            outbound &&
            styles.pinOutbound,
          complete && styles.pinComplete,
        ]}
      >
        <Ionicons
          name={
            complete
              ? "checkmark-sharp"
              : "scan-outline"
          }
          size={16}
          color={
            complete || outbound
              ? C.charcoal
              : C.white
          }
        />
      </View>

      <View
        style={[
          styles.pinTip,
          !complete &&
            outbound &&
            styles.pinTipOutbound,
          complete && styles.pinTipComplete,
        ]}
      />
    </View>
  );
}

// ---------------------------------------------------------
// PORTERÍA
//
// Inicio y meta son la misma ubicación física.
// Se representan juntos, no como dos markers
// superpuestos sobre el mismo GPS.
// ---------------------------------------------------------

function PorteriaPin({
  finished,
}: {
  finished: boolean;
}) {
  return (
    <View
      style={styles.porteriaArea}
      collapsable={false}
    >
      <View style={styles.flagsRow}>
        <View style={styles.startFlag}>
          <MaterialCommunityIcons
            name="flag-variant"
            color={C.charcoal}
            size={16}
          />
        </View>

        <View
          style={[
            styles.endFlag,
            finished && styles.endFlagDone,
          ]}
        >
          <MaterialCommunityIcons
            name="flag-checkered"
            color={
              finished
                ? C.charcoal
                : C.white
            }
            size={16}
          />
        </View>
      </View>

      <View style={styles.porteriaLabel}>
        <Text style={styles.porteriaText}>
          Inicio / Meta
        </Text>
      </View>
    </View>
  );
}

function CurrentLocationPin() {
  return (
    <View
      style={styles.gpsHalo}
      collapsable={false}
    >
      <View style={styles.gpsOuter}>
        <View style={styles.gpsInner} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------
// COMPONENTE PRINCIPAL
// ---------------------------------------------------------

export default function TrailMap({
  routeGeoJSON,
  checkpoints,
  location,
  trackingCoordinates = [],
  checkpointEvents = [],
  focusRequest = 0,
  fitRequest = 0,
}: TrailMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const fittedKey = useRef("");
  const lastFocus = useRef(focusRequest);
  const lastFit = useRef(fitRequest);

  const route = useMemo<LatLng[]>(
    () =>
      (routeGeoJSON?.coordinates ?? [])
        .map(([longitude, latitude]) => ({
          latitude: Number(latitude),
          longitude: Number(longitude),
        }))
        .filter(({ latitude, longitude }) =>
          isValidCoordinate(latitude, longitude),
        ),
    [routeGeoJSON],
  );

  const points = useMemo(
    () =>
      checkpoints
        .map((checkpoint) => ({
          checkpoint,
          latitude: Number(checkpoint.latitude),
          longitude: Number(checkpoint.longitude),
        }))
        .filter(({ latitude, longitude }) =>
          isValidCoordinate(latitude, longitude),
        ),
    [checkpoints],
  );

  
const trackSegments = useMemo<LatLng[][]>(() => {
  const segments: LatLng[][] = [];

  let currentSegment: LatLng[] = [];

  for (const point of trackingCoordinates) {
    const latitude = Number(point.latitude);
    const longitude = Number(point.longitude);

    if (!isValidCoordinate(latitude, longitude)) {
      continue;
    }

    if (point.breakBefore) {
      if (currentSegment.length >= 2) {
        segments.push(currentSegment);
      }

      currentSegment = [];
    }

    currentSegment.push({
      latitude,
      longitude,
    });
  }

  if (currentSegment.length >= 2) {
    segments.push(currentSegment);
  }

  return segments;
}, [trackingCoordinates]);


  const userCoordinate = useMemo<LatLng | null>(() => {
    const latitude = Number(location?.coords.latitude);
    const longitude = Number(location?.coords.longitude);

    return isValidCoordinate(latitude, longitude)
      ? { latitude, longitude }
      : null;
  }, [
    location?.coords.latitude,
    location?.coords.longitude,
  ]);

  const bounds = useMemo<LatLng[]>(
    () => [
      ...route,
      ...points.map(({ latitude, longitude }) => ({
        latitude,
        longitude,
      })),
    ],
    [route, points],
  );

  const boundsKey = useMemo(() => {
    if (!bounds.length) return "";

    const first = bounds[0];
    const last = bounds[bounds.length - 1];

    return [
      bounds.length,
      first.latitude,
      first.longitude,
      last.latitude,
      last.longitude,
    ].join(":");
  }, [bounds]);

  const fitTrail = useCallback(
    (animated = true) => {
      if (
        !mapReady ||
        !mapRef.current ||
        bounds.length === 0
      ) {
        return;
      }

      if (bounds.length === 1) {
        mapRef.current.animateToRegion(
          {
            ...bounds[0],
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          },
          animated ? 450 : 0,
        );
        return;
      }

      mapRef.current.fitToCoordinates(bounds, {
        edgePadding: {
          top: 170,
          right: 90,
          bottom: 280,
          left: 55,
        },
        animated,
      });
    },
    [bounds, mapReady],
  );

  useEffect(() => {
    if (
      !mapReady ||
      !boundsKey ||
      fittedKey.current === boundsKey
    ) {
      return;
    }

    fittedKey.current = boundsKey;

    const timer = setTimeout(
      () => fitTrail(false),
      200,
    );

    return () => clearTimeout(timer);
  }, [mapReady, boundsKey, fitTrail]);

  useEffect(() => {
    if (focusRequest === lastFocus.current) {
      return;
    }

    if (!mapReady || !mapRef.current || !userCoordinate) {
      return;
    }

    lastFocus.current = focusRequest;

    mapRef.current.animateCamera(
      {
        center: userCoordinate,
        zoom: 16.5,
      },
      { duration: 600 },
    );
  }, [focusRequest, mapReady, userCoordinate]);

  useEffect(() => {
    if (fitRequest === lastFit.current) {
      return;
    }

    if (!mapReady || bounds.length === 0) {
      return;
    }

    lastFit.current = fitRequest;
    fitTrail(true);
  }, [fitRequest, mapReady, bounds.length, fitTrail]);

  if (bounds.length === 0 && !userCoordinate) {
    return (
      <View style={styles.empty}>
        <Ionicons
          name="map-outline"
          size={29}
          color={C.lime}
        />
        <Text style={styles.emptyTitle}>
          Mapa no disponible
        </Text>
        <Text style={styles.emptyDescription}>
          No hay coordenadas para este sendero.
        </Text>
      </View>
    );
  }

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFillObject}
      mapType="hybrid"
      showsCompass={false}
      showsScale={false}
      showsUserLocation={false}
      toolbarEnabled={false}
      onMapReady={() => setMapReady(true)}
      initialRegion={{
        ...(bounds[0] ?? userCoordinate!),
        latitudeDelta: 0.035,
        longitudeDelta: 0.035,
      }}
    >
      {/* RUTA PLANIFICADA */}

      {route.length >= 2 && (
        <>
          <Polyline
            coordinates={route}
            strokeColor="rgba(255,255,255,0.94)"
            strokeWidth={7}
            lineCap="round"
            lineJoin="round"
          />
          <Polyline
            coordinates={route}
            strokeColor="#464E50"
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        </>
      )}

   
{/* TRAZADO GPS REAL — SEGMENTOS DEPURADOS */}

{trackSegments.map((segment, index) => (
  <React.Fragment key={`gps-segment-${index}`}>
    <Polyline
      coordinates={segment}
      strokeColor="rgba(16,23,17,0.75)"
      strokeWidth={9}
      lineCap="round"
      lineJoin="round"
    />

    <Polyline
      coordinates={segment}
      strokeColor={C.lime}
      strokeWidth={5}
      lineCap="round"
      lineJoin="round"
    />
  </React.Fragment>
))}


      {/* MARCADORES */}

      {points.map(({ checkpoint, latitude, longitude }) => {
        const state = getVisualState(
          checkpoint.id,
          checkpointEvents,
        );

        const type = String(
          checkpoint.checkpoint_type ?? "",
        ).toUpperCase();

        const isEntry = type === "ENTRY";

        return (
          <Marker
            key={`${checkpoint.id}-${state}`}
            coordinate={{ latitude, longitude }}
            title={checkpoint.name}
            anchor={{
              x: 0.5,
              y: isEntry ? 0.85 : 0.9,
            }}
            tracksViewChanges
            zIndex={isEntry ? 30 : 10}
          >
            {isEntry ? (
              <PorteriaPin
                finished={state === "complete"}
              />
            ) : (
              <CheckpointPin state={state} />
            )}
          </Marker>
        );
      })}

      {/* POSICIÓN REAL DEL USUARIO */}

      {userCoordinate && (
        <Marker
          coordinate={userCoordinate}
          anchor={{ x: 0.5, y: 0.5 }}
          title="Mi ubicación"
          zIndex={100}
          tracksViewChanges
        >
          <CurrentLocationPin />
        </Marker>
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  pinArea: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 2,
  },

  pinBadge: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: C.glassBg,
    borderWidth: 1.5,
    borderColor: C.glassBorder,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.32,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },

  pinOutbound: {
    backgroundColor: C.white,
    borderColor: C.charcoal,
  },

  pinComplete: {
    backgroundColor: C.lime,
    borderColor: C.charcoal,
  },

  pinTip: {
    width: 9,
    height: 9,
    marginTop: -5,
    borderRadius: 2,
    backgroundColor: C.glassBg,
    borderWidth: 1.5,
    borderColor: C.glassBorder,
    transform: [{ rotate: "45deg" }],
  },

  pinTipOutbound: {
    backgroundColor: C.white,
    borderColor: C.charcoal,
  },

  pinTipComplete: {
    backgroundColor: C.lime,
    borderColor: C.charcoal,
  },

  porteriaArea: {
    alignItems: "center",
    justifyContent: "flex-start",
  },

  flagsRow: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },

  startFlag: {
    width: 32,
    height: 32,
    borderRadius: 13,
    backgroundColor: C.lime,
    alignItems: "center",
    justifyContent: "center",
    borderColor: C.charcoal,
    borderWidth: 1.5,
    overflow: "visible",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },

  endFlag: {
    width: 32,
    height: 32,
    borderRadius: 13,
    backgroundColor: C.glassBg,
    borderColor: C.glassBorder,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },

  endFlagDone: {
    backgroundColor: C.lime,
    borderColor: C.charcoal,
  },

  porteriaLabel: {
    marginTop: 6,
    backgroundColor: "rgba(12,18,16,0.92)",
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  porteriaText: {
    color: C.white,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  gpsHalo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(22,123,250,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },

  gpsOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },

  gpsInner: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: C.blue,
  },

  empty: {
    flex: 1,
    backgroundColor: "#0B0C0D",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.white,
  },

  emptyDescription: {
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
  },
});