import React, { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCheckpoints } from "@/features/parks/hooks/useCheckpoints";
import { getTrails } from "@/features/parks/services/parksService";
import type { Trail } from "@/features/parks/types";
import TrailMap from "@/features/parks/components/TrailMap";
import { useLocation } from "@/features/trekking/hooks/useLocation";

// --- Paleta de Colores iOS Auténtica ---
const COLORS = {
  paper: "#F2F2F7",      // Fondo gris sistema iOS claro
  ink: "#000000",        // Negro principal puro
  pine: "#34C759",       // Verde sistema iOS (Acento naturaleza)
  pineBg: "rgba(52, 199, 89, 0.12)",
  slate: "#8E8E93",      // Gris secundario iOS
  cloud: "#FFFFFF",      // Blanco tarjeta
  mist: "#C6C6C8",       // Divisores sutiles iOS
  danger: "#FF3B30",     // Rojo sistema iOS
  cardBorder: "rgba(0, 0, 0, 0.04)",
  shadow: "#000000",
};

export default function TrailDetailScreen() {
  const { trailId } = useLocalSearchParams<{
    trailId: string;
  }>();

  const numericTrailId = trailId ? parseInt(trailId, 10) : 0;

  const [trail, setTrail] = useState<Trail | null>(null);
  const [isTrailLoading, setIsTrailLoading] = useState(true);
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);

  // Integración de localización
  const { location, getLocation } = useLocation();

  const {
    checkpoints,
    isLoading: isCheckpointsLoading,
    error: checkpointsError,
    reload: reloadCheckpoints,
  } = useCheckpoints(numericTrailId);

  const loadTrail = useCallback(async () => {
    if (!numericTrailId) return;
    setIsTrailLoading(true);
    try {
      const trails = await getTrails();
      const found = trails.find((t) => t.id === numericTrailId);
      if (found) {
        setTrail(found);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTrailLoading(false);
    }
  }, [numericTrailId]);

  useEffect(() => {
    loadTrail();
  }, [loadTrail]);

  const isLoading = isTrailLoading || isCheckpointsLoading;

  if (isLoading && !trail) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="small" color={COLORS.ink} />
        <Text style={styles.loadingText}>Cargando sendero...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header Estilo iOS Minimalista */}
      <View style={styles.navigationBar}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton} 
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
          <Text style={styles.backText}>Senderos</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={checkpoints}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        onRefresh={() => {
          loadTrail();
          reloadCheckpoints();
        }}
        ListHeaderComponent={
          <View>
            {/* Título Principal y Metadata de Cabecera */}
            <View style={styles.titleContainer}>
              <Text style={styles.mainTitle} numberOfLines={2}>
                {trail?.name ?? "Detalle del Sendero"}
              </Text>
              
              {/* Badges de Dificultad y Estado Estilo iOS */}
              <View style={styles.badgeRow}>
                {trail?.difficulty && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{trail.difficulty}</Text>
                  </View>
                )}
                {trail?.status && (
                  <View style={[styles.badge, styles.badgeActive]}>
                    <Text style={[styles.badgeText, styles.badgeActiveText]}>{trail.status}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Tarjeta de Mapa Inmersiva con Estilo iOS Moderno */}
            <View style={styles.mapCard}>
              <View style={styles.mapContainer}>
                <TrailMap 
                  routeGeoJSON={trail?.route_geojson ?? null} 
                  checkpoints={checkpoints} 
                  location={location}
                />

                {/* Botón temporal de prueba para obtener posición actual */}
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={getLocation}
                  activeOpacity={0.8}
                >
                  <Ionicons name="locate-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.locationButtonText}>Mostrar mi ubicación</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={() => setIsMapModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="expand" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.expandButtonText}>Pantalla completa</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Barra de Estadísticas Clave del Sendero */}
            {trail && (
              <View style={styles.statsBar}>
                <View style={styles.statItem}>
                  <Ionicons name="map-outline" size={18} color={COLORS.pine} />
                  <Text style={styles.statValue}>{trail.distance_km} km</Text>
                  <Text style={styles.statLabel}>Distancia</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="time-outline" size={18} color={COLORS.pine} />
                  <Text style={styles.statValue}>{trail.estimated_duration}</Text>
                  <Text style={styles.statLabel}>Duración</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="trending-up-outline" size={18} color={COLORS.pine} />
                  <Text style={styles.statValue}>{trail.max_altitude} m</Text>
                  <Text style={styles.statLabel}>Altitud Máx</Text>
                </View>
              </View>
            )}

            {/* Descripción del Sendero */}
            {trail?.description && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeader}>Acerca de la ruta</Text>
                <Text style={styles.description}>{trail.description}</Text>
              </View>
            )}

            <Text style={styles.sectionHeader}>Checkpoints de Control</Text>

            {checkpointsError && (
              <View style={styles.statusContainer}>
                <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
                <Text style={styles.error}>{checkpointsError}</Text>
              </View>
            )}

            {!checkpointsError && checkpoints.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="flag-outline" size={32} color={COLORS.slate} style={{ marginBottom: 6 }} />
                <Text style={styles.emptyText}>Sin checkpoints configurados en este tramo.</Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <View style={styles.checkpointIndexContainer}>
              <Text style={styles.checkpointIndexText}>{index + 1}</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.name}>{item.name}</Text>
              
              <View style={styles.infoRow}>
                <Ionicons name="location-sharp" size={13} color={COLORS.slate} style={{ marginRight: 4 }} />
                <Text style={styles.info}>{item.latitude}, {item.longitude}</Text>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.miniTag}>
                  <Ionicons name="radio-outline" size={12} color={COLORS.pine} style={{ marginRight: 3 }} />
                  <Text style={styles.miniTagText}>{item.radius_meters} m radio</Text>
                </View>
                <View style={styles.miniTag}>
                  <Ionicons name="qr-code-outline" size={12} color={COLORS.slate} style={{ marginRight: 3 }} />
                  <Text style={styles.miniTagText}>{item.qr_identifier}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      />

      {/* Modal de Mapa en Pantalla Completa Estilo iOS */}
      <Modal visible={isMapModalVisible} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>{trail?.name ?? "Mapa del Sendero"}</Text>
            <TouchableOpacity 
              onPress={() => setIsMapModalVisible(false)} 
              style={styles.closeButton} 
              activeOpacity={0.7}
            >
              <Text style={styles.closeText}>Listo</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalMapWrapper}>
            <TrailMap 
              routeGeoJSON={trail?.route_geojson ?? null} 
              checkpoints={checkpoints} 
              location={location}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.paper,
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
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: -4,
  },
  backText: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 2,
  },
  titleContainer: {
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.ink,
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    backgroundColor: "#E5E5EA",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.slate,
    textTransform: 'uppercase',
  },
  badgeActive: {
    backgroundColor: COLORS.pineBg,
  },
  badgeActiveText: {
    color: COLORS.pine,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.slate,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 40,
  },
  mapCard: {
    backgroundColor: COLORS.cloud,
    borderRadius: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  mapContainer: {
    height: 220,
    width: "100%",
    position: 'relative',
  },
  locationButton: {
    position: "absolute",
    bottom: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  locationButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 5,
  },
  expandButton: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    flexDirection: 'row',
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  expandButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.cloud,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.ink,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.slate,
    fontWeight: "500",
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.mist,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.ink,
    letterSpacing: -0.4,
    marginBottom: 10,
    marginTop: 4,
  },
  description: {
    fontSize: 15,
    color: "#3A3A3C",
    lineHeight: 22,
    fontWeight: '400',
  },
  card: {
    backgroundColor: COLORS.cloud,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  checkpointIndexContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.pineBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkpointIndexText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.pine,
  },
  cardContent: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.ink,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  info: {
    color: COLORS.slate,
    fontSize: 12,
    fontWeight: '400',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  miniTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  miniTagText: {
    fontSize: 11,
    color: COLORS.slate,
    fontWeight: "500",
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    borderRadius: 12,
    marginBottom: 16,
  },
  error: {
    color: COLORS.danger,
    fontSize: 13,
    marginLeft: 8,
    fontWeight: '500',
    flex: 1,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.slate,
    textAlign: 'center',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.mist,
    backgroundColor: COLORS.cloud,
  },
  closeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeText: {
    color: "#007AFF",
    fontSize: 17,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.ink,
    flex: 1,
    textAlign: 'center',
  },
  modalMapWrapper: {
    flex: 1,
  },
});