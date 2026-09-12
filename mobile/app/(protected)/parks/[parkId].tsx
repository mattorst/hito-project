import React from "react";
import { useLocalSearchParams, router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTrails } from "@/features/parks/hooks/useTrails";
import { useAuth } from "@/features/auth/context/AuthContext";
import { startTrekking } from "@/features/trekking/services/trekkingService";

// --- Paleta -----------------------------------------------------------------
// Misma línea que Resumen y Detalle de trekking: negro como lienzo,
// blanco/gris para jerarquía de texto, un único verde lima como acento.
const COLORS = {
  bg: "#0B0C0D",
  surface: "#17181B",
  surfaceBorder: "rgba(255,255,255,0.08)",
  divider: "rgba(255,255,255,0.08)",
  glass: "rgba(255,255,255,0.06)",
  glassBorder: "rgba(255,255,255,0.10)",
  ink: "#FFFFFF",
  inkSecondary: "#9BA1A6",
  inkTertiary: "#6E7378",
  lime: "#C6FF4D",
  limeDim: "rgba(198,255,77,0.14)",
  limeBorder: "rgba(198,255,77,0.35)",
  danger: "#FF6B5E",
  dangerDim: "rgba(255,107,94,0.12)",
  black: "#0B0C0D",
};

export default function ParkDetailScreen() {
  const { parkId } = useLocalSearchParams<{
    parkId: string;
  }>();

  const numericParkId = parkId ? parseInt(parkId, 10) : 0;

  const {
    trails,
    isLoading,
    error,
    reload,
  } = useTrails(numericParkId);

  const { activeTrekking, setActiveTrekking } = useAuth();

  const handleStartTrekking = async (trailId: number, trailName: string) => {
    if (activeTrekking) {
      Alert.alert(
        "Trekking en curso",
        "Ya tienes un recorrido activo. Ciérralo antes de iniciar uno nuevo.",
        [{ text: "OK", style: "cancel" }]
      );
      return;
    }

    Alert.alert(
      "Comenzar recorrido",
      `¿Deseas iniciar el sendero "${trailName}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Iniciar",
          onPress: async () => {
            try {
              const trekking = await startTrekking({ trail: trailId });
              setActiveTrekking(trekking);
              router.push("/(protected)/trekking");
            } catch (err) {
              console.error(err);
              Alert.alert("Error", "No fue posible iniciar el trekking. Inténtalo de nuevo.");
            }
          },
          style: 'default'
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color={COLORS.lime} />
        <Text style={styles.loadingText}>Cargando rutas...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

      {/* Cabecera minimalista, misma línea que el resto del flujo */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <View style={styles.roundButton}>
            <Ionicons name="chevron-back" size={20} color={COLORS.ink} />
          </View>
          <Text style={styles.backText}>Parques</Text>
        </TouchableOpacity>
        <Text style={styles.mainTitle}>Senderos</Text>
        <Text style={styles.subtitle}>Elige una ruta y comienza tu recorrido</Text>
      </View>

      {error && (
        <View style={styles.statusContainer}>
          <Ionicons name="alert-circle" size={22} color={COLORS.danger} />
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity onPress={reload} style={styles.retryButton}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {!error && trails.length === 0 && (
        <View style={styles.center}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="trail-sign-outline" size={30} color={COLORS.inkTertiary} />
          </View>
          <Text style={styles.emptyText}>
            Este parque aún no posee senderos registrados.
          </Text>
        </View>
      )}

      {/* Lista de Senderos */}
      {!error && trails.length > 0 && (
        <FlatList
          data={trails}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isLoading}
          onRefresh={reload}
          renderItem={({ item, index }) => (
            <View style={[styles.card, index === 0 && { marginTop: 4 }]}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push(`/(protected)/parks/trails/${item.id}`)}
                style={styles.cardTouch}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={styles.trailIconWrap}>
                    <MaterialCommunityIcons name="terrain" size={18} color={COLORS.lime} />
                  </View>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.inkTertiary} />
                </View>

                <Text style={styles.description} numberOfLines={3}>
                  {item.description}
                </Text>

                <View style={styles.metaContainer}>
                  <View style={styles.metaItem}>
                    <Ionicons name="map-outline" size={14} color={COLORS.lime} />
                    <Text style={styles.info}>{item.distance_km} km</Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color={COLORS.lime} />
                    <Text style={styles.info}>{item.estimated_duration}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Botón de Acción Principal */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleStartTrekking(item.id, item.name)}
                activeOpacity={0.85}
              >
                <Ionicons name="navigate-outline" size={16} color={COLORS.black} style={{ marginRight: 8 }} />
                <Text style={styles.actionButtonText}>Iniciar Trekking</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  header: {
    marginBottom: 18,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -6,
    marginBottom: 14,
  },
  roundButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.glass,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    marginRight: 6,
  },
  backText: {
    color: COLORS.inkSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.ink,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.inkSecondary,
    marginTop: 4,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.inkSecondary,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 36,
  },
  // Tarjeta estilo oscuro minimalista
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
  },
  cardTouch: {
    padding: 18,
    paddingBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trailIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.limeDim,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.ink,
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    color: COLORS.inkSecondary,
    marginBottom: 14,
    lineHeight: 18,
    marginLeft: 40,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 12,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: COLORS.divider,
    marginHorizontal: 12,
  },
  info: {
    color: COLORS.inkSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 5,
  },
  // Botón de acción principal — acento lima, coherente con el resto de la app
  actionButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.lime,
    margin: 16,
    marginTop: 4,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonText: {
    color: COLORS.black,
    fontSize: 15,
    fontWeight: "800",
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: COLORS.dangerDim,
    marginVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,94,0.25)',
  },
  error: {
    color: COLORS.danger,
    fontSize: 14,
    marginHorizontal: 8,
    flex: 1,
    fontWeight: '500',
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.glass,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  retryText: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.inkSecondary,
    textAlign: "center",
    fontWeight: '500',
  },
});