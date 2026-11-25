
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  router,
  useLocalSearchParams,
} from "expo-router";

import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useCheckpoints } from "@/features/parks/hooks/useCheckpoints";

import {
  getTrails,
  getParkById,
} from "@/features/parks/services/parksService";

import type {
  Park,
  Trail,
} from "@/features/parks/types";

import TrailMap from "@/features/parks/components/TrailMap";
import ParkScheduleCard from "@/features/parks/components/ParkScheduleCard";

// ---------------------------------------------------------
// HITO — COLORES
// ---------------------------------------------------------

const COLORS = {
  background: "#0B0C0D",
  surface: "#17181B",
  surfaceBorder: "rgba(255,255,255,0.10)",
  lime: "#C8FF00",
  limeBg: "rgba(200,255,0,0.12)",
  inkPrimary: "#FFFFFF",
  inkSecondary: "#9BA1A6",
  inkTertiary: "#6E7378",
  danger: "#FF453A",
  dangerBg: "rgba(255,69,58,0.15)",
};

// ---------------------------------------------------------
// FORMATO DE DIFICULTAD Y ESTADO
// ---------------------------------------------------------

const formatDifficulty = (diff?: string) => {
  if (!diff) return null;

  switch (diff.toUpperCase()) {
    case "EASY":
      return "Fácil";
    case "MEDIUM":
    case "MODERATE":
      return "Moderada";
    case "HARD":
      return "Exigente";
    case "EXPERT":
      return "Experto";
    default:
      return diff;
  }
};

const formatStatus = (status?: string) => {
  if (!status) return null;

  switch (status.toUpperCase()) {
    case "OPEN":
      return "Abierto";
    case "CLOSED":
      return "Cerrado";
    case "MAINTENANCE":
      return "En mantenimiento";
    default:
      return status;
  }
};

// ---------------------------------------------------------
// FOTOGRAFÍAS
// ---------------------------------------------------------

const ENLADRILLADO_PHOTOS = [
  require("@/assets/images/enladrillado/e1.jpg"),
  require("@/assets/images/enladrillado/e2.jpg"),
  require("@/assets/images/enladrillado/e3.jpg"),
];

// ---------------------------------------------------------
// EQUIPAMIENTO
// ---------------------------------------------------------

interface EquipmentItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail: string;
}

const EQUIPMENT_GRID: EquipmentItem[] = [
  {
    id: "water",
    icon: "water-sharp",
    label: "Agua",
    detail: "1.5 Litros mínimo",
  },
  {
    id: "footwear",
    icon: "footsteps-sharp",
    label: "Calzado",
    detail: "Botas o zapatillas Grip",
  },
  {
    id: "sun",
    icon: "sunny-sharp",
    label: "Protección Solar",
    detail: "Bloqueador y gorra",
  },
  {
    id: "powerbank",
    icon: "flash-sharp",
    label: "Batería Extra",
    detail: "Para GPS offline",
  },
];

// ---------------------------------------------------------
// CONSEJOS
// ---------------------------------------------------------

const TRAIL_TIPS = [
  {
    id: "1",
    icon: "footsteps",
    title: "Calzado adecuado",
    description:
      "Usa botas o zapatillas de trekking con buen agarre para terreno irregular.",
  },
  {
    id: "2",
    icon: "water",
    title: "Hidratación",
    description:
      "Lleva al menos 1.5L de agua por persona. No hay puntos de agua potable en ruta.",
  },
  {
    id: "3",
    icon: "partly-sunny",
    title: "Protección solar",
    description:
      "Aplica bloqueador y lleva gorra; hay tramos descubiertos expuestos al sol.",
  },
  {
    id: "4",
    icon: "medkit",
    title: "Seguridad Offline",
    description:
      "Asegúrate de llevar batería suficiente. El registro GPS funciona sin señal.",
  },
];

// ---------------------------------------------------------
// PANTALLA
// ---------------------------------------------------------

export default function TrailDetailScreen() {
  const { trailId } = useLocalSearchParams<{
    trailId: string;
  }>();

  const numericTrailId = trailId
    ? parseInt(trailId, 10)
    : 0;

  const [trail, setTrail] = useState<Trail | null>(null);
  const [park, setPark] = useState<Park | null>(null);

  const [isTrailLoading, setIsTrailLoading] =
    useState(true);

  const [isParkLoading, setIsParkLoading] =
    useState(false);

  const [isMapModalVisible, setIsMapModalVisible] =
    useState(false);

  const [selectedPhoto, setSelectedPhoto] =
    useState<any | null>(null);

  const [activePhotoIndex, setActivePhotoIndex] =
    useState(0);

  const {
    checkpoints,
    isLoading: isCheckpointsLoading,
    error: checkpointsError,
    reload: reloadCheckpoints,
  } = useCheckpoints(numericTrailId);

  // -------------------------------------------------------
  // CARGAR SENDERO
  // -------------------------------------------------------

  const loadTrail = useCallback(async () => {
    if (!numericTrailId) {
      setIsTrailLoading(false);
      return;
    }

    setIsTrailLoading(true);

    try {
      const trails = await getTrails();

      const found = trails.find(
        (item) => item.id === numericTrailId,
      );

      setTrail(found ?? null);
    } catch (error) {
      console.error(
        "Error al cargar detalle del sendero:",
        error,
      );
    } finally {
      setIsTrailLoading(false);
    }
  }, [numericTrailId]);

  useEffect(() => {
    void loadTrail();
  }, [loadTrail]);

  // -------------------------------------------------------
  // NUEVO: CARGAR PARQUE Y HORARIOS
  // -------------------------------------------------------

  useEffect(() => {
    if (!trail?.park) {
      setPark(null);
      setIsParkLoading(false);
      return;
    }

    let mounted = true;

    setPark(null);
    setIsParkLoading(true);

    const loadPark = async () => {
      try {
        const found = await getParkById(trail.park);

        if (mounted) {
          setPark(found);
        }
      } catch (error) {
        console.error(
          "Error al cargar los horarios del parque:",
          error,
        );

        if (mounted) {
          setPark(null);
        }
      } finally {
        if (mounted) {
          setIsParkLoading(false);
        }
      }
    };

    void loadPark();

    return () => {
      mounted = false;
    };
  }, [trail?.park]);

  const isLoading =
    isTrailLoading || isCheckpointsLoading;

  // -------------------------------------------------------
  // CARGANDO
  // -------------------------------------------------------

  if (isLoading && !trail) {
    return (
      <SafeAreaView
        style={[styles.container, styles.center]}
        edges={["top", "left", "right"]}
      >
        <ActivityIndicator
          size="small"
          color={COLORS.lime}
        />

        <Text style={styles.loadingText}>
          Cargando experiencia de sendero...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
    >
      {/* NAVEGACIÓN */}

      <View style={styles.navigationBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={COLORS.lime}
          />

          <Text style={styles.backText}>
            Senderos
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={checkpoints}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        onRefresh={() => {
          void loadTrail();
          void reloadCheckpoints();
        }}

        ListHeaderComponent={
          <View>
            {/* CABECERA */}

            <View style={styles.titleContainer}>
              <View style={styles.headerTopRow}>
                <View style={styles.headerBadge}>
                  <Ionicons
                    name="footsteps-sharp"
                    size={13}
                    color={COLORS.lime}
                    style={{ marginRight: 6 }}
                  />

                  <Text style={styles.headerBadgeText}>
                    RUTA DE SENDERISMO
                  </Text>
                </View>

                <View style={styles.weatherWidget}>
                  <Ionicons
                    name="sunny"
                    size={14}
                    color="#FFD60A"
                    style={{ marginRight: 4 }}
                  />

                  <Text style={styles.weatherText}>
                    18°C · Despejado
                  </Text>
                </View>
              </View>

              <Text
                style={styles.mainTitle}
                numberOfLines={2}
              >
                {trail?.name ?? "Detalle del Sendero"}
              </Text>

              <View style={styles.badgeRow}>
                {trail?.difficulty && (
                  <View style={styles.badge}>
                    <Ionicons
                      name="fitness-outline"
                      size={13}
                      color={COLORS.inkSecondary}
                      style={{ marginRight: 4 }}
                    />

                    <Text style={styles.badgeText}>
                      {formatDifficulty(trail.difficulty)}
                    </Text>
                  </View>
                )}

                {trail?.status && (
                  <View
                    style={[
                      styles.badge,
                      styles.badgeActive,
                    ]}
                  >
                    <View style={styles.activeDot} />

                    <Text
                      style={[
                        styles.badgeText,
                        styles.badgeActiveText,
                      ]}
                    >
                      {formatStatus(trail.status)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* GALERÍA */}

            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>
                  Galería en terreno
                </Text>

                <Text style={styles.sectionHeaderHint}>
                  Toca para ampliar
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={
                  styles.carouselContainer
                }
                decelerationRate="fast"
                snapToInterval={292}
                onScroll={(event) => {
                  const x =
                    event.nativeEvent.contentOffset.x;

                  const index = Math.round(x / 292);

                  setActivePhotoIndex(index);
                }}
                scrollEventThrottle={16}
              >
                {ENLADRILLADO_PHOTOS.map(
                  (photoSource, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.photoCard}
                      activeOpacity={0.88}
                      onPress={() =>
                        setSelectedPhoto(photoSource)
                      }
                    >
                      <Image
                        source={photoSource}
                        style={styles.photoImage}
                        resizeMode="cover"
                      />

                      <View style={styles.photoZoomBadge}>
                        <Ionicons
                          name="scan-outline"
                          size={14}
                          color="#FFFFFF"
                        />
                      </View>
                    </TouchableOpacity>
                  ),
                )}
              </ScrollView>

              <View style={styles.paginationDotsRow}>
                {ENLADRILLADO_PHOTOS.map(
                  (_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        activePhotoIndex === index &&
                          styles.dotActive,
                      ]}
                    />
                  ),
                )}
              </View>
            </View>

            {/* MAPA */}

            <View style={styles.mapCard}>
              <View style={styles.mapContainer}>
                <TrailMap
                  routeGeoJSON={
                    trail?.route_geojson ?? null
                  }
                  checkpoints={checkpoints}
                />

                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={() =>
                    setIsMapModalVisible(true)
                  }
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="expand"
                    size={14}
                    color={COLORS.inkPrimary}
                    style={{ marginRight: 6 }}
                  />

                  <Text
                    style={styles.expandButtonText}
                  >
                    Pantalla completa
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ESTADÍSTICAS */}

            {trail && (
              <View style={styles.statsBar}>
                <View style={styles.statItem}>
                  <Ionicons
                    name="map-outline"
                    size={18}
                    color={COLORS.lime}
                  />

                  <Text style={styles.statValue}>
                    {trail.distance_km} km
                  </Text>

                  <Text style={styles.statLabel}>
                    Distancia
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={COLORS.lime}
                  />

                  <Text style={styles.statValue}>
                    {trail.estimated_duration}
                  </Text>

                  <Text style={styles.statLabel}>
                    Duración
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <Ionicons
                    name="trending-up-outline"
                    size={18}
                    color={COLORS.lime}
                  />

                  <Text style={styles.statValue}>
                    {trail.max_altitude} m
                  </Text>

                  <Text style={styles.statLabel}>
                    Altitud Máx
                  </Text>
                </View>
              </View>
            )}

            {/* NUEVO: HORARIOS DEL PARQUE */}

            <ParkScheduleCard
              schedule={park}
              isLoading={isParkLoading}
            />

            {/* EQUIPAMIENTO */}

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeader}>
                Equipamiento recomendado
              </Text>

              <View style={styles.equipGrid}>
                {EQUIPMENT_GRID.map((item) => (
                  <View
                    key={item.id}
                    style={styles.equipGridCard}
                  >
                    <View style={styles.equipIconWrap}>
                      <Ionicons
                        name={item.icon}
                        size={18}
                        color={COLORS.lime}
                      />
                    </View>

                    <Text style={styles.equipTitle}>
                      {item.label}
                    </Text>

                    <Text style={styles.equipSubtext}>
                      {item.detail}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* DESCRIPCIÓN */}

            {trail?.description && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeader}>
                  Acerca de la ruta
                </Text>

                <Text style={styles.description}>
                  {trail.description}
                </Text>
              </View>
            )}

            {/* SEGURIDAD */}

            <View style={styles.securityBanner}>
              <View style={styles.securityIconWrap}>
                <Ionicons
                  name="shield-checkmark"
                  size={22}
                  color={COLORS.lime}
                />
              </View>

              <View style={styles.securityTextWrap}>
                <Text style={styles.securityTitle}>
                  Sendero Monitoreado
                </Text>

                <Text style={styles.securitySubtitle}>
                  Tu posición se registra en SQLite
                  sin necesidad de Internet. Los datos
                  pendientes se sincronizarán cuando
                  exista conexión.
                </Text>
              </View>
            </View>

            {/* CONSEJOS */}

            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>
                  Tips del Guardaparques
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={
                  styles.tipsContainer
                }
              >
                {TRAIL_TIPS.map((tip) => (
                  <View
                    key={tip.id}
                    style={styles.tipCard}
                  >
                    <View style={styles.tipIconWrap}>
                      <Ionicons
                        name={
                          tip.icon as keyof typeof Ionicons.glyphMap
                        }
                        size={18}
                        color={COLORS.lime}
                      />
                    </View>

                    <Text style={styles.tipTitle}>
                      {tip.title}
                    </Text>

                    <Text style={styles.tipDescription}>
                      {tip.description}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* CHECKPOINTS */}

            <Text style={styles.sectionHeader}>
              Checkpoints de Control
            </Text>

            {checkpointsError && (
              <View style={styles.statusContainer}>
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color={COLORS.danger}
                />

                <Text style={styles.error}>
                  {checkpointsError}
                </Text>
              </View>
            )}

            {!checkpointsError &&
              checkpoints.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Ionicons
                    name="flag-outline"
                    size={32}
                    color={COLORS.inkTertiary}
                    style={{ marginBottom: 6 }}
                  />

                  <Text style={styles.emptyText}>
                    Sin checkpoints configurados
                    en este tramo.
                  </Text>
                </View>
              )}
          </View>
        }

        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <View
              style={styles.checkpointIndexContainer}
            >
              <Text
                style={styles.checkpointIndexText}
              >
                {index + 1}
              </Text>
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.name}>
                {item.name}
              </Text>

              <View style={styles.infoRow}>
                <Ionicons
                  name="location-sharp"
                  size={13}
                  color={COLORS.inkSecondary}
                  style={{ marginRight: 4 }}
                />

                <Text style={styles.info}>
                  {item.latitude}, {item.longitude}
                </Text>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.miniTag}>
                  <Ionicons
                    name="radio-outline"
                    size={12}
                    color={COLORS.lime}
                    style={{ marginRight: 4 }}
                  />

                  <Text style={styles.miniTagText}>
                    {item.radius_meters} m radio
                  </Text>
                </View>

                <View style={styles.miniTag}>
                  <Ionicons
                    name="qr-code-outline"
                    size={12}
                    color={COLORS.inkSecondary}
                    style={{ marginRight: 4 }}
                  />

                  <Text style={styles.miniTagText}>
                    {item.qr_identifier}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      />

      {/* MODAL FOTO */}

      <Modal
        visible={selectedPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSelectedPhoto(null)
        }
      >
        <View style={styles.fullImageModalBg}>
          <TouchableOpacity
            style={styles.fullImageCloseBtn}
            onPress={() =>
              setSelectedPhoto(null)
            }
          >
            <Ionicons
              name="close"
              size={26}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {selectedPhoto && (
            <Image
              source={selectedPhoto}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* MODAL MAPA */}

      <Modal
        visible={isMapModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() =>
          setIsMapModalVisible(false)
        }
      >
        <SafeAreaView
          style={styles.modalContainer}
          edges={[
            "top",
            "left",
            "right",
            "bottom",
          ]}
        >
          <View style={styles.modalHeader}>
            <Text
              style={styles.modalTitle}
              numberOfLines={1}
            >
              {trail?.name ?? "Mapa del Sendero"}
            </Text>

            <TouchableOpacity
              onPress={() =>
                setIsMapModalVisible(false)
              }
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>
                Listo
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalMapWrapper}>
            <TrailMap
              routeGeoJSON={
                trail?.route_geojson ?? null
              }
              checkpoints={checkpoints}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------
// ESTILOS — HITO
// ---------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  navigationBar: {
    height: 44,
    justifyContent: "center",
    marginBottom: 4,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginLeft: -4,
  },
  backText: {
    color: COLORS.lime,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 2,
  },
  titleContainer: {
    marginBottom: 20,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.lime,
    letterSpacing: 1.2,
  },
  weatherWidget: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  weatherText: {
    fontSize: 11,
    color: COLORS.inkSecondary,
    fontWeight: "600",
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.inkPrimary,
    letterSpacing: -0.6,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.inkSecondary,
    textTransform: "uppercase",
  },
  badgeActive: {
    backgroundColor: COLORS.limeBg,
    borderColor: "rgba(200,255,0,0.3)",
  },
  badgeActiveText: {
    color: COLORS.lime,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.lime,
    marginRight: 6,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.inkSecondary,
    fontWeight: "500",
  },
  listContent: {
    paddingBottom: 40,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionHeaderHint: {
    fontSize: 12,
    color: COLORS.inkTertiary,
    fontWeight: "500",
  },
  carouselContainer: {
    paddingRight: 16,
    gap: 12,
    paddingVertical: 2,
  },
  photoCard: {
    width: 280,
    height: 165,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: "hidden",
    position: "relative",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoZoomBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(11,12,13,0.75)",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  paginationDotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.surfaceBorder,
  },
  dotActive: {
    width: 18,
    backgroundColor: COLORS.lime,
  },
  mapCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: "hidden",
  },
  mapContainer: {
    height: 220,
    width: "100%",
    position: "relative",
  },
  expandButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    backgroundColor: "rgba(11,12,13,0.85)",
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
  },
  expandButtonText: {
    color: COLORS.inkPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  statsBar: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.inkPrimary,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.inkSecondary,
    fontWeight: "500",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.surfaceBorder,
  },
  equipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  equipGridCard: {
    width: "48.5%",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 16,
    padding: 14,
  },
  equipIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.limeBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  equipTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.inkPrimary,
    marginBottom: 2,
  },
  equipSubtext: {
    fontSize: 12,
    color: COLORS.inkSecondary,
    fontWeight: "400",
    lineHeight: 16,
  },
  sectionBlock: {
    marginBottom: 22,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.inkPrimary,
    letterSpacing: -0.4,
    marginBottom: 10,
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    color: COLORS.inkSecondary,
    lineHeight: 22,
    fontWeight: "400",
  },
  securityBanner: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: "rgba(200,255,0,0.25)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 22,
    alignItems: "center",
  },
  securityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.limeBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  securityTextWrap: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.inkPrimary,
    marginBottom: 2,
  },
  securitySubtitle: {
    fontSize: 12,
    color: COLORS.inkSecondary,
    lineHeight: 17,
  },
  tipsContainer: {
    paddingRight: 16,
    gap: 12,
  },
  tipCard: {
    width: 190,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  tipIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.limeBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.inkPrimary,
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 12,
    color: COLORS.inkSecondary,
    lineHeight: 16,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    flexDirection: "row",
    alignItems: "center",
  },
  checkpointIndexContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.limeBg,
    borderWidth: 1,
    borderColor: "rgba(200,255,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkpointIndexText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.lime,
  },
  cardContent: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.inkPrimary,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  info: {
    color: COLORS.inkSecondary,
    fontSize: 12,
    fontWeight: "400",
  },
  infoGrid: {
    flexDirection: "row",
    gap: 8,
  },
  miniTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  miniTagText: {
    fontSize: 11,
    color: COLORS.inkSecondary,
    fontWeight: "500",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: COLORS.dangerBg,
    borderRadius: 12,
    marginBottom: 16,
  },
  error: {
    color: COLORS.danger,
    fontSize: 13,
    marginLeft: 8,
    fontWeight: "500",
    flex: 1,
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.inkSecondary,
    textAlign: "center",
    fontWeight: "500",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surface,
  },
  closeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeText: {
    color: COLORS.lime,
    fontSize: 16,
    fontWeight: "600",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.inkPrimary,
    flex: 1,
    textAlign: "center",
  },
  modalMapWrapper: {
    flex: 1,
  },
  fullImageModalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImageCloseBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "80%",
  },
});
