
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  Alert,
  PanResponder,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  router,
  useFocusEffect,
} from "expo-router";
import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import LocalRescueCard from "@/features/rescues/components/LocalRescueCard";
import TrekkingSyncCard from "@/features/sync/components/TrekkingSyncCard";
import QrSyncCard from "@/features/sync/components/QrSyncCard";
import TrackingSyncCard from "@/features/sync/components/TrackingSyncCard";
import IncidentSyncCard from "@/features/sync/components/IncidentSyncCard";
import RescueSyncCard from "@/features/sync/components/RescueSyncCard";
import { useAuth } from "@/features/auth/context/AuthContext";
import { finishTrekking } from "@/features/trekking/services/trekkingService";
import { useScan } from "@/features/checkpoints/context/ScanContext";
import { findCheckpointByQr } from "@/features/checkpoints/utils";
import { useCheckpoints } from "@/features/parks/hooks/useCheckpoints";
import { registerCheckpoint } from "@/features/checkpoints/services/checkpointService";
import { enqueueCheckpoint } from "@/features/checkpoints/services/offlineQueue";
import { useRescue } from "@/features/rescues/hooks/useRescue";
import { getTrails } from "@/features/parks/services/parksService";
import type { Trail } from "@/features/parks/types";
import { useTracking } from "@/features/trekking/hooks/useTracking";
import { useTrackingTrack } from "@/features/trekking/hooks/useTrackingTrack";
import { useLocalCheckpointQr } from "@/features/trekking/hooks/useLocalCheckpointQr";
import { getDatabase } from "@/features/trekking/storage/database";
import TrailMap from "@/features/parks/components/TrailMap";
import type {
  TrailMapQrEvent,
} from "@/features/parks/components/TrailMap";

const C = {
  bg: "#0B0C0D",
  ink: "#FFFFFF",
  lime: "#C6FF4D",
  red: "#FF655D",
  muted: "#ACB3B7",
  subtle: "#747C80",
  glass: "rgba(14,19,18,0.93)",
  lightGlass: "rgba(31,38,36,0.89)",
  line: "rgba(255,255,255,0.14)",
  limeSoft: "rgba(198,255,77,0.15)",
};

type Icon = keyof typeof Ionicons.glyphMap;
type Panel = "actions" | "rescue" | "sync";

// ---------------------------------------------------------
// COMPONENTES
// ---------------------------------------------------------

function CircleButton({
  icon,
  onPress,
  label,
}: {
  icon: Icon;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        s.circleButton,
        pressed && s.pressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={19}
        color={C.ink}
      />
    </Pressable>
  );
}

function ActionTile({
  iconNode,
  name,
  onPress,
}: {
  iconNode: ReactNode;
  name: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [
        s.tile,
        pressed && s.pressed,
      ]}
    >
      <View style={s.tileIcon}>
        {iconNode}
      </View>

      <Text
        style={s.tileLabel}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.78}
      >
        {name}
      </Text>
    </Pressable>
  );
}

function Metric({
  icon,
  label,
  value,
  detail,
}: {
  icon: Icon;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <View style={s.metric}>
      <View style={s.metricLabelRow}>
        <Ionicons
          name={icon}
          color={C.muted}
          size={13}
        />
        <Text
          style={s.metricLabel}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>

      <Text
        style={s.metricValue}
        numberOfLines={1}
      >
        {value}
      </Text>

      {detail ? (
        <Text
          style={s.metricDetail}
          numberOfLines={1}
        >
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

function formatHour(value: string): string {
  const d = new Date(value);

  return Number.isNaN(d.getTime())
    ? "--:--"
    : d.toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
}

// ---------------------------------------------------------
// PANTALLA PRINCIPAL
// ---------------------------------------------------------

export default function ActiveTrekkingScreen() {
  const {
    activeTrekking,
    activeLocalTrekking,
    setActiveTrekking,
    setLastCompletedTrekking,
  } = useAuth();

  const {
    scannedQr,
    setScannedQr,
  } = useScan();

  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const [trail, setTrail] =
    useState<Trail | null>(null);

  const [isFinishing, setIsFinishing] =
    useState(false);

  const [expanded, setExpanded] =
    useState(true);

  const [panel, setPanel] =
    useState<Panel>("actions");

  const [now, setNow] =
    useState(Date.now());

  const [qrInfo, setQrInfo] = useState({
    count: 0,
    last: "Sin registros",
  });

  const [
    checkpointEvents,
    setCheckpointEvents,
  ] = useState<TrailMapQrEvent[]>([]);

  const [focusRequest, setFocusRequest] =
    useState(0);

  const [fitRequest, setFitRequest] =
    useState(0);

  // -------------------------------------------------------
  // IDENTIFICAR TREKKING ACTIVO
  // -------------------------------------------------------

  const localTrekking =
    activeLocalTrekking?.trekking.status ===
    "IN_PROGRESS"
      ? activeLocalTrekking.trekking
      : null;

  const isLocalTrekking =
    Boolean(localTrekking);

  const remoteTrekking =
    !activeLocalTrekking &&
    activeTrekking?.status === "IN_PROGRESS"
      ? activeTrekking
      : null;

  const hasActiveTrekking =
    isLocalTrekking || Boolean(remoteTrekking);

  const activeTrailId =
    localTrekking?.trail_id ??
    remoteTrekking?.trail ??
    0;

  const trackingId =
    localTrekking?.local_id ??
    remoteTrekking?.id ??
    0;

  const startedAt =
    localTrekking?.started_at ??
    remoteTrekking?.started_at ??
    "";

  // -------------------------------------------------------
  // RESCATES
  // -------------------------------------------------------

  const {
    activeRescue,
    activeRescueLoading,
    loading: rescueLoading,
    closingRescue,
    cancellingRescue,
    requestRescue,
    loadActiveRescue,
    closeActiveRescue,
    cancelActiveRescue,
  } = useRescue();

  // -------------------------------------------------------
  // CHECKPOINTS Y TRACKING
  // -------------------------------------------------------

  const { checkpoints } =
    useCheckpoints(activeTrailId);

  const {
    location: currentLocation,
    startTracking,
    stopTracking,
  } = useTracking(trackingId);

  useLocalCheckpointQr(
    isLocalTrekking,
    stopTracking,
  );

  const {
    coordinates: trackingCoordinates,
    refresh: refreshTrackingTrack,
  } = useTrackingTrack(trackingId);

  // -------------------------------------------------------
  // CONTROL GPS
  // -------------------------------------------------------

  useEffect(() => {
    if (
      !trackingId ||
      !hasActiveTrekking
    ) {
      stopTracking();
      return;
    }

    void startTracking();

    return () => {
      stopTracking();
    };
  }, [
    trackingId,
    hasActiveTrekking,
    startTracking,
    stopTracking,
  ]);

  useEffect(() => {
    if (
      hasActiveTrekking &&
      currentLocation
    ) {
      refreshTrackingTrack();
    }
  }, [
    hasActiveTrekking,
    currentLocation,
    refreshTrackingTrack,
  ]);

  // -------------------------------------------------------
  // RESCATE REMOTO
  // -------------------------------------------------------

  useEffect(() => {
    if (
      isLocalTrekking ||
      !remoteTrekking
    ) {
      return;
    }

    void loadActiveRescue(remoteTrekking.id);
  }, [
    isLocalTrekking,
    remoteTrekking?.id,
  ]);

  // -------------------------------------------------------
  // CARGAR SENDERO
  // -------------------------------------------------------

  useEffect(() => {
    if (!activeTrailId) {
      setTrail(null);
      return;
    }

    let mounted = true;

    void getTrails()
      .then((items) => {
        if (mounted) {
          setTrail(
            items.find(
              (t) =>
                t.id === activeTrailId,
            ) ?? null,
          );
        }
      })
      .catch((error) => {
        console.error(
          "[Hito] No se pudo cargar sendero:",
          error,
        );

        if (mounted) {
          setTrail(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, [activeTrailId]);

  // -------------------------------------------------------
  // QR REMOTO ORIGINAL
  // -------------------------------------------------------

  useEffect(() => {
    if (
      !scannedQr ||
      isLocalTrekking
    ) {
      return;
    }

    if (!remoteTrekking) {
      setScannedQr(null);
      return;
    }

    const checkpoint = findCheckpointByQr(
      checkpoints,
      scannedQr,
    );

    if (!checkpoint) {
      Alert.alert(
        "QR inválido",
        "Este checkpoint no pertenece al sendero actual.",
      );

      setScannedQr(null);
      return;
    }

    const register = async () => {
      try {
        await registerCheckpoint({
          trekking: remoteTrekking.id,
          checkpoint: checkpoint.id,
          registered_at:
            new Date().toISOString(),
        });

        Alert.alert(
          "Checkpoint registrado",
          `"${checkpoint.name}" sincronizado.`,
        );
      } catch (error: any) {
        if (error?.response) {
          Alert.alert(
            "Error",
            "No fue posible registrar el checkpoint.",
          );
        } else {
          try {
            await enqueueCheckpoint({
              trekking: remoteTrekking.id,
              checkpoint: checkpoint.id,
              registered_at:
                new Date().toISOString(),
            });

            Alert.alert(
              "Guardado sin conexión",
              "El checkpoint se sincronizará después.",
            );
          } catch {
            Alert.alert(
              "Error",
              "No se pudo guardar el checkpoint.",
            );
          }
        }
      } finally {
        setScannedQr(null);
      }
    };

    void register();
  }, [
    scannedQr,
    isLocalTrekking,
    remoteTrekking,
    checkpoints,
    setScannedQr,
  ]);

  // -------------------------------------------------------
  // HISTORIAL QR REAL DE SQLITE
  // -------------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      if (!localTrekking?.local_id) {
        setQrInfo({
          count: 0,
          last: "Sin registros",
        });

        setCheckpointEvents([]);
        return;
      }

      let alive = true;

      void (async () => {
        try {
          const db = await getDatabase();

          const data =
            await db.getFirstAsync<{
              count: number;
              last_qr: string | null;
            }>(
              `
              SELECT COUNT(*) AS count,
                (
                  SELECT qr_identifier
                  FROM local_checkpoint_events
                  WHERE trekking_local_id = ?
                  ORDER BY
                    occurred_at DESC,
                    created_at DESC,
                    rowid DESC
                  LIMIT 1
                ) AS last_qr
              FROM local_checkpoint_events
              WHERE trekking_local_id = ?;
              `,
              [
                localTrekking.local_id,
                localTrekking.local_id,
              ],
            );

          const events =
            await db.getAllAsync<TrailMapQrEvent>(
              `
              SELECT
                checkpoint_id,
                event_type
              FROM local_checkpoint_events
              WHERE trekking_local_id = ?
              ORDER BY
                occurred_at ASC,
                created_at ASC,
                rowid ASC;
              `,
              [localTrekking.local_id],
            );

          if (alive) {
            setQrInfo({
              count: data?.count ?? 0,
              last:
                data?.last_qr ??
                "Sin registros",
            });

            setCheckpointEvents(events);
          }
        } catch (error) {
          console.error(
            "[Hito] Error al leer progreso QR:",
            error,
          );
        }
      })();

      return () => {
        alive = false;
      };
    }, [localTrekking?.local_id]),
  );

  // -------------------------------------------------------
  // RELOJ
  // -------------------------------------------------------

  useEffect(() => {
    if (!hasActiveTrekking) {
      return;
    }

    const id = setInterval(
      () => setNow(Date.now()),
      30000,
    );

    return () => clearInterval(id);
  }, [hasActiveTrekking]);

  // -------------------------------------------------------
  // PANEL DESLIZABLE
  // -------------------------------------------------------

  const drag = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder:
          () => true,

        onMoveShouldSetPanResponder:
          () => true,

        onPanResponderRelease:
          (_event, gesture) => {
            if (gesture.dy < -24) {
              setExpanded(true);
            } else if (gesture.dy > 24) {
              setExpanded(false);
            } else {
              setExpanded(
                (v) => !v,
              );
            }
          },
      }),
    [],
  );

  // -------------------------------------------------------
  // MÉTRICAS
  // -------------------------------------------------------

  const duration = (() => {
    const start = Date.parse(startedAt);

    if (!Number.isFinite(start)) {
      return "--:--";
    }

    const minutes = Math.max(
      0,
      Math.floor(
        (now - start) / 60000,
      ),
    );

    return (
      `${String(
        Math.floor(minutes / 60),
      ).padStart(2, "0")}:` +
      `${String(
        minutes % 60,
      ).padStart(2, "0")}`
    );
  })();

  const group = isLocalTrekking
    ? 1 +
      (
        Array.isArray(
          (
            activeLocalTrekking as {
              companions?: unknown[];
            } | null
          )?.companions,
        )
          ? (
              activeLocalTrekking as {
                companions?: unknown[];
              }
            ).companions!.length
          : 0
      )
    : 1;

  const lastCheckpoint =
    checkpoints.find(
      (cp) =>
        cp.qr_identifier ===
        qrInfo.last,
    );

  const lastQr =
    lastCheckpoint?.name ??
    (
      qrInfo.count
        ? qrInfo.last
        : "Sin registros"
    );

  const totalEvents =
    checkpoints.length * 2;

  const totalProgress =
    totalEvents > 0
      ? `${qrInfo.count}/${totalEvents}`
      : `${qrInfo.count}/--`;

  const gpsCount =
    Array.isArray(trackingCoordinates)
      ? trackingCoordinates.length
      : 0;

  const sheetBottom =
    Math.max(insets.bottom, 10) + 5;

  const maxSheetHeight = Math.max(
    230,
    height -
      insets.top -
      sheetBottom -
      138,
  );

  // -------------------------------------------------------
  // FINALIZAR TREKKING
  // -------------------------------------------------------

  const handleFinishTrekking =
    async () => {
      if (isLocalTrekking) {
        Alert.alert(
          "Salida mediante QR",
          "Debes regresar a la portería y escanear su QR original por segunda vez. Hito verificará el circuito antes de finalizar.",
        );
        return;
      }

      if (
        !remoteTrekking ||
        isFinishing
      ) {
        return;
      }

      setIsFinishing(true);

      try {
        const completed =
          await finishTrekking(
            remoteTrekking.id,
          );

        stopTracking();

        setLastCompletedTrekking(
          completed,
        );

        setActiveTrekking(null);

        router.replace(
          "/trekking/summary",
        );
      } catch (error) {
        console.error(
          "[Hito] Error al cerrar trekking:",
          error,
        );

        Alert.alert(
          "Error",
          "No fue posible finalizar el trekking.",
        );
      } finally {
        setIsFinishing(false);
      }
    };

  // -------------------------------------------------------
  // SOLICITAR RESCATE REMOTO
  // -------------------------------------------------------

  const handleRequestRescue = () => {
    if (
      !remoteTrekking ||
      isLocalTrekking ||
      rescueLoading ||
      activeRescue
    ) {
      return;
    }

    Alert.alert(
      "Solicitar rescate",
      "¿Confirmas que necesitas asistencia de emergencia?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Solicitar rescate",
          style: "destructive",
          onPress: () => {
            void requestRescue({
              trekking:
                remoteTrekking.id,
            }).then((rescue) => {
              if (rescue) {
                Alert.alert(
                  "Rescate solicitado",
                  "Tu solicitud fue registrada.",
                );
              }
            });
          },
        },
      ],
    );
  };

  const handleCloseRescue = () => {
    if (
      !activeRescue ||
      closingRescue ||
      cancellingRescue
    ) {
      return;
    }

    Alert.alert(
      "Cerrar rescate",
      "¿Confirmas que la situación fue atendida?",
      [
        {
          text: "Volver",
          style: "cancel",
        },
        {
          text: "Cerrar rescate",
          onPress: () => {
            void closeActiveRescue(
              activeRescue.id,
            ).then((ok) => {
              if (ok) {
                Alert.alert(
                  "Rescate cerrado",
                  "Solicitud finalizada.",
                );
              }
            });
          },
        },
      ],
    );
  };

  const handleCancelRescue = () => {
    if (
      !activeRescue ||
      closingRescue ||
      cancellingRescue
    ) {
      return;
    }

    Alert.alert(
      "Cancelar rescate",
      "¿Confirmas que ya no necesitas asistencia?",
      [
        {
          text: "Volver",
          style: "cancel",
        },
        {
          text: "Cancelar rescate",
          style: "destructive",
          onPress: () => {
            void cancelActiveRescue(
              activeRescue.id,
            ).then((ok) => {
              if (ok) {
                Alert.alert(
                  "Rescate cancelado",
                  "Solicitud cancelada.",
                );
              }
            });
          },
        },
      ],
    );
  };

  // -------------------------------------------------------
  // SIN TREKKING ACTIVO
  // -------------------------------------------------------

  if (!hasActiveTrekking) {
    return (
      <View style={s.emptyRoot}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={C.bg}
        />

        <View style={s.emptyCenter}>
          <Ionicons
            name="compass-outline"
            size={40}
            color={C.lime}
          />

          <Text style={s.emptyTitle}>
            Sin recorrido activo
          </Text>

          <Text style={s.emptyText}>
            Inicia tu excursión mediante
            el QR de portería para ver
            el mapa.
          </Text>

          <Pressable
            style={s.emptyButton}
            onPress={() =>
              router.push(
                "/trekking/history",
              )
            }
          >
            <Text style={s.emptyButtonText}>
              Mis trekkings
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // -------------------------------------------------------
  // INTERFAZ GLASS
  // -------------------------------------------------------

  return (
    <View style={s.root}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* MAPA PRINCIPAL */}

      <View
        style={StyleSheet.absoluteFillObject}
      >
        <TrailMap
          routeGeoJSON={
            trail?.route_geojson ?? null
          }
          checkpoints={checkpoints}
          location={currentLocation}
          trackingCoordinates={
            trackingCoordinates
          }
          checkpointEvents={
            checkpointEvents
          }
          focusRequest={focusRequest}
          fitRequest={fitRequest}
        />
      </View>

      {/* CABECERA GLASS */}

      <View
        pointerEvents="box-none"
        style={[
          s.topArea,
          {
            top: insets.top + 10,
          },
        ]}
      >
        <View style={s.headerGlass}>
          <BlurView
            intensity={54}
            tint="dark"
            style={
              StyleSheet.absoluteFillObject
            }
          />

          <View
            style={s.headerTint}
            pointerEvents="none"
          />

          <View style={s.headerMain}>
            <Pressable
              onPress={() =>
                router.back()
              }
              style={s.headerBack}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={C.ink}
              />
            </Pressable>

            <View style={s.headerCenter}>
              <Text
                style={s.headerKicker}
              >
                NAVEGACIÓN ACTIVA
              </Text>

              <Text
                style={s.headerTitle}
                numberOfLines={2}
              >
                {trail?.name ??
                  `Sendero #${activeTrailId}`}
              </Text>
            </View>

            
            <View style={{ width: 34, height: 34 }} />

          </View>

          <View style={s.headerMeta}>
            <Ionicons
              name="time-outline"
              size={14}
              color={C.muted}
            />

            <Text style={s.headerTime}>
              Inicio {formatHour(startedAt)}
            </Text>

            <View style={s.metaDivider} />

            <View style={s.statusPill}>
              <View style={s.dot} />

              <Text style={s.statusText}>
                En curso
              </Text>
            </View>

            <View style={s.metaDivider} />

            <Text style={s.headerElapsed}>
              {duration} h
            </Text>
          </View>
        </View>
      </View>

      {/* CONTROLES DEL MAPA */}

      <View
        pointerEvents="box-none"
        style={[
          s.mapTools,
          {
            top: Math.min(
              insets.top + 183,
              height * 0.35,
            ),
          },
        ]}
      >
        <CircleButton
          icon="navigate"
          label="Centrar y acercar mapa en mi ubicación"
          onPress={() => {
            if (!currentLocation) {
              Alert.alert(
                "GPS",
                "Todavía no hay una ubicación disponible.",
              );
              return;
            }

            setFocusRequest(
              (v) => v + 1,
            );
          }}
        />

        <CircleButton
          icon="expand-outline"
          label="Ver el sendero completo"
          onPress={() =>
            setFitRequest(
              (v) => v + 1,
            )
          }
        />
      </View>

      {/* PANEL INFERIOR GLASS */}

      <View
        style={[
          s.sheet,
          {
            bottom: sheetBottom,
            maxHeight: maxSheetHeight,
          },
        ]}
      >
        <BlurView
          intensity={64}
          tint="dark"
          style={
            StyleSheet.absoluteFillObject
          }
        />

        <View
          style={s.sheetTint}
          pointerEvents="none"
        />

        {/* TIRADOR */}

        <View
          {...drag.panHandlers}
          style={s.grabberHit}
        >
          <View style={s.grabber} />
        </View>

        {/* MÉTRICAS */}

        <View style={s.metricBox}>
          <Metric
            icon="flag-outline"
            label="Progreso"
            value={
              isLocalTrekking
                ? totalProgress
                : "En ruta"
            }
            detail="lecturas QR"
          />

          <View style={s.metricDivider} />

          <Metric
            icon="qr-code-outline"
            label="Último QR"
            value={
              isLocalTrekking
                ? lastQr
                : "—"
            }
          />

          <View style={s.metricDivider} />

          <Metric
            icon="radio-outline"
            label="GPS"
            value={`${gpsCount}`}
            detail="puntos"
          />

          <View style={s.metricDivider} />

          <Metric
            icon="people-outline"
            label="Grupo"
            value={`${group}`}
          />
        </View>

        {/* BOTÓN ACCIONES */}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            expanded
              ? "Contraer acciones"
              : "Desplegar acciones"
          }
          onPress={() => {
            setPanel("actions");

            setExpanded(
              (v) => !v,
            );
          }}
          style={({ pressed }) => [
            s.actionsBar,
            pressed && s.pressed,
          ]}
        >
          <Ionicons
            name="layers-outline"
            size={19}
            color={C.bg}
          />

          <Text style={s.actionsBarText}>
            Acciones
          </Text>

          <Ionicons
            name={
              expanded
                ? "chevron-down"
                : "chevron-up"
            }
            size={19}
            color={C.bg}
          />
        </Pressable>

        {/* ACCIONES DESPLEGABLES */}

        {expanded && (
          <ScrollView
            style={s.sheetScroller}
            contentContainerStyle={
              s.sheetScroll
            }
            showsVerticalScrollIndicator={
              false
            }
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {panel === "actions" ? (
              <>
                <View style={s.tileRow}>
                  <ActionTile
                    name="Escanear checkpoint"
                    iconNode={
                      <Ionicons
                        name="scan-outline"
                        size={23}
                        color={C.lime}
                      />
                    }
                    onPress={() =>
                      router.push("/scan")
                    }
                  />

                  <ActionTile
                    name="Reportar incidente"
                    iconNode={
                      <Ionicons
                        name="warning-outline"
                        size={23}
                        color={C.ink}
                      />
                    }
                    onPress={() =>
                      router.push(
                        "/trekking/incident",
                      )
                    }
                  />

                  <ActionTile
                    name="Solicitar rescate"
                    iconNode={
                      <View style={s.sos}>
                        <Text
                          style={s.sosText}
                        >
                          SOS
                        </Text>
                      </View>
                    }
                    onPress={() =>
                      setPanel("rescue")
                    }
                  />

                  <ActionTile
                    name="Finalizar trekking"
                    iconNode={
                      <MaterialCommunityIcons
                        name="flag-checkered"
                        size={23}
                        color={C.ink}
                      />
                    }
                    onPress={() => {
                      void handleFinishTrekking();
                    }}
                  />
                </View>

              </>
            ) : (
              <View
                style={s.secondaryPanel}
              >
                <Pressable
                  style={s.sectionBack}
                  onPress={() =>
                    setPanel("actions")
                  }
                >
                  <Ionicons
                    name="chevron-back"
                    color={C.lime}
                    size={17}
                  />

                  <Text
                    style={
                      s.sectionBackText
                    }
                  >
                    Volver a acciones
                  </Text>
                </Pressable>

                {panel === "rescue" ? (
                  <>
                    <Text
                      style={s.sectionTitle}
                    >
                      Asistencia de emergencia
                    </Text>

                    {isLocalTrekking ? (
                      <LocalRescueCard />
                    ) : activeRescue ? (
                      <View
                        style={s.rescueBox}
                      >
                        <Text
                          style={s.rescueText}
                        >
                          Tienes una solicitud
                          de rescate activa.
                        </Text>

                        <Pressable
                          onPress={
                            handleCloseRescue
                          }
                          disabled={
                            closingRescue ||
                            cancellingRescue
                          }
                          style={
                            s.rescueButton
                          }
                        >
                          <Text
                            style={
                              s.rescueButtonText
                            }
                          >
                            Cerrar rescate
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={
                            handleCancelRescue
                          }
                          disabled={
                            closingRescue ||
                            cancellingRescue
                          }
                          style={
                            s.outlineButton
                          }
                        >
                          <Text
                            style={
                              s.outlineText
                            }
                          >
                            Cancelar rescate
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        onPress={
                          handleRequestRescue
                        }
                        disabled={
                          rescueLoading ||
                          activeRescueLoading
                        }
                        style={
                          s.rescueButton
                        }
                      >
                        <Text
                          style={
                            s.rescueButtonText
                          }
                        >
                          {rescueLoading
                            ? "Solicitando..."
                            : "Solicitar rescate"}
                        </Text>
                      </Pressable>
                    )}
                  </>
                ) : (
                  <>
                    <Text
                      style={
                        s.sectionTitle
                      }
                    >
                      Sincronización offline
                    </Text>

                    {isLocalTrekking ? (
                      <>
                        <TrekkingSyncCard />
                        <QrSyncCard />
                        <TrackingSyncCard />
                        <IncidentSyncCard />
                        <RescueSyncCard />
                      </>
                    ) : (
                      <Text
                        style={
                          s.secondaryText
                        }
                      >
                        El trekking remoto
                        utiliza la conexión
                        actual.
                      </Text>
                    )}
                  </>
                )}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------
// ESTILOS
// ---------------------------------------------------------

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  pressed: {
    opacity: 0.76,
  },

  topArea: {
    position: "absolute",
    left: 14,
    right: 14,
  },

  headerGlass: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.22)",
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 13,
    backgroundColor:
      "rgba(20,28,27,0.40)",
    elevation: 7,
  },

  headerTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      "rgba(8,15,14,0.20)",
  },

  headerMain: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 46,
  },

  headerBack: {
    width: 34,
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },

  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  headerKicker: {
    color: C.lime,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.8,
    marginBottom: 5,
  },

  headerTitle: {
    color: C.ink,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.4,
  },

  headerMenu: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor:
      "rgba(255,255,255,0.06)",
  },

  headerMeta: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  headerTime: {
    color: C.muted,
    fontWeight: "600",
    fontSize: 11.5,
  },

  headerElapsed: {
    color: C.ink,
    fontWeight: "700",
    fontSize: 11.5,
  },

  metaDivider: {
    height: 16,
    width: 1,
    backgroundColor: C.line,
    marginHorizontal: 5,
  },

  statusPill: {
    backgroundColor: C.lime,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  statusText: {
    color: C.bg,
    fontWeight: "800",
    fontSize: 10.5,
  },

  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.bg,
  },

  mapTools: {
    position: "absolute",
    right: 16,
    gap: 10,
  },

  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor:
      "rgba(13,21,20,0.80)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.24)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },

  sheet: {
    position: "absolute",
    left: 9,
    right: 9,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.22)",
    backgroundColor:
      "rgba(17,23,22,0.62)",
    elevation: 18,
    paddingHorizontal: 13,
    paddingBottom: 11,
  },

  sheetTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      "rgba(12,17,16,0.26)",
  },

  grabberHit: {
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },

  grabber: {
    width: 40,
    height: 4,
    borderRadius: 4,
    backgroundColor:
      "rgba(255,255,255,0.42)",
  },

  metricBox: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 15,
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.13)",
    backgroundColor:
      "rgba(0,0,0,0.17)",
    paddingVertical: 8,
  },

  metric: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 3,
  },

  metricLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  metricLabel: {
    fontSize: 9.5,
    fontWeight: "600",
    color: C.muted,
  },

  metricValue: {
    fontSize: 14,
    fontWeight: "800",
    color: C.ink,
    textAlign: "center",
  },

  metricDetail: {
    fontSize: 8.5,
    color: C.subtle,
  },

  metricDivider: {
    width: 1,
    backgroundColor:
      "rgba(255,255,255,0.12)",
    marginVertical: 6,
  },

  actionsBar: {
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: C.lime,
    marginTop: 11,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  actionsBarText: {
    color: C.bg,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  sheetScroller: {
    flexShrink: 1,
  },

  sheetScroll: {
    paddingTop: 10,
    paddingBottom: 6,
    gap: 9,
  },

  tileRow: {
    flexDirection: "row",
    gap: 7,
  },

  tile: {
    flex: 1,
    minWidth: 0,
    minHeight: 80,
    borderRadius: 16,
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.15)",
    backgroundColor:
      "rgba(42,50,48,0.62)",
    paddingHorizontal: 3,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  tileIcon: {
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  tileLabel: {
    fontSize: 10,
    color: C.ink,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 13,
  },

  sos: {
    borderColor: C.red,
    borderWidth: 1.5,
    borderRadius: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  sosText: {
    color: C.red,
    fontSize: 11.5,
    fontWeight: "800",
  },

  sheetNote: {
    fontSize: 10,
    color: C.muted,
    textAlign: "center",
    paddingVertical: 4,
  },

  secondaryPanel: {
    gap: 11,
    paddingBottom: 12,
  },

  sectionBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
  },

  sectionBackText: {
    color: C.lime,
    fontSize: 13,
    fontWeight: "600",
  },

  sectionTitle: {
    color: C.ink,
    fontSize: 16,
    fontWeight: "800",
  },

  secondaryText: {
    color: C.muted,
    fontSize: 13,
  },

  rescueBox: {
    gap: 9,
  },

  rescueText: {
    color: C.muted,
    fontSize: 13,
  },

  rescueButton: {
    backgroundColor: C.red,
    borderRadius: 13,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },

  rescueButtonText: {
    color: C.ink,
    fontWeight: "800",
    fontSize: 13,
  },

  outlineButton: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 13,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },

  outlineText: {
    color: C.ink,
    fontWeight: "700",
    fontSize: 13,
  },

  emptyRoot: {
    flex: 1,
    backgroundColor: C.bg,
  },

  emptyCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 15,
    padding: 24,
  },

  emptyTitle: {
    color: C.ink,
    fontSize: 20,
    fontWeight: "800",
  },

  emptyText: {
    color: C.muted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },

  emptyButton: {
    backgroundColor: C.lime,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 15,
  },

  emptyButtonText: {
    color: C.bg,
    fontWeight: "800",
  },
});