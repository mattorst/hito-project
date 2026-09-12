import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getTrekkingById } from "@/features/trekking/services/trekkingService";
import type { Trekking } from "@/features/trekking/types";

// --- Paleta -----------------------------------------------------------------
// Misma línea que Parques, Trekking activo, Incidente e Historial: negro
// como lienzo, blanco/gris para jerarquía de texto, un único verde lima
// como acento y como color de "logro" para lo completado.
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
  black: "#0B0C0D",
};

function BackButton() {
  return (
    <Pressable style={styles.roundButton} onPress={() => router.back()} hitSlop={8}>
      <Ionicons name="chevron-back" size={20} color={COLORS.ink} />
    </Pressable>
  );
}

export default function TrekkingDetailScreen() {
  const { trekkingId } = useLocalSearchParams<{ trekkingId: string }>();

  const [trekking, setTrekking] = useState<Trekking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrekkingDetail() {
      if (!trekkingId) return;

      try {
        setIsLoading(true);
        setError(null);
        const data = await getTrekkingById(Number(trekkingId));
        setTrekking(data);
      } catch (err) {
        console.error("Error al cargar detalle del trekking:", err);
        setError("No fue posible cargar el detalle del trekking.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrekkingDetail();
  }, [trekkingId]);

  const handleShare = async () => {
    if (!trekking) return;

    const isCompletedShare = trekking.status?.toUpperCase() === "COMPLETED";

    try {
      await Share.share({
        message: isCompletedShare
          ? `Acabo de completar mi trekking #${trekking.id} en el Sendero #${trekking.trail}. ¡Otra cumbre en la lista! 🏔️`
          : `Estoy en ruta: trekking #${trekking.id} en el Sendero #${trekking.trail}. 🥾`,
      });
    } catch (err) {
      console.error("Error al compartir el trekking:", err);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "left", "right", "bottom"]}>
        <ActivityIndicator size="large" color={COLORS.lime} />
        <Text style={styles.message}>Cargando detalle del recorrido...</Text>
      </SafeAreaView>
    );
  }

  if (error || !trekking) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.topRowFixed}>
          <BackButton />
        </View>
        <View style={styles.errorContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="alert-circle-outline" size={34} color={COLORS.inkTertiary} />
          </View>
          <Text style={styles.errorTitle}>¡Ups!</Text>
          <Text style={styles.error}>{error || "Trekking no encontrado."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCompleted = trekking.status?.toUpperCase() === "COMPLETED";

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Cabecera */}
        <View style={styles.topRow}>
          <BackButton />
          <Pressable style={styles.roundButton} onPress={handleShare} hitSlop={8}>
            <Ionicons name="share-outline" size={19} color={COLORS.ink} />
          </Pressable>
        </View>

        <View style={styles.headerContainer}>
          <Text style={styles.title}>Resumen de expedición</Text>
          <Text style={styles.subtitle}>Detalle completo del recorrido registrado</Text>
        </View>

        {/* Tarjeta "poster" — pensada para lucir bien al compartirse */}
        <View style={styles.heroCard}>
          <Ionicons
            name="trail-sign-outline"
            size={150}
            color="rgba(255,255,255,0.04)"
            style={styles.heroWatermark}
          />

          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.cardSublabel}>ID DE RECORRIDO</Text>
              <Text style={styles.cardIdText}>#{trekking.id}</Text>
            </View>
            <View style={[styles.badge, isCompleted ? styles.badgeCompleted : styles.badgeProgress]}>
              <Ionicons
                name={isCompleted ? "checkmark-done" : "navigate"}
                size={12}
                color={isCompleted ? COLORS.black : COLORS.lime}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.badgeText, isCompleted ? styles.badgeTextCompleted : styles.badgeTextProgress]}>
                {trekking.status}
              </Text>
            </View>
          </View>

          <View style={styles.heroTrailRow}>
            <Ionicons name="map-outline" size={18} color={COLORS.lime} style={{ marginRight: 6 }} />
            <Text style={styles.valueHighlight}>Sendero #{trekking.trail}</Text>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroMessageRow}>
            <Ionicons
              name={isCompleted ? "trophy-outline" : "compass-outline"}
              size={20}
              color={COLORS.lime}
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.heroMessageTitle}>
                {isCompleted ? "¡Aventura completada!" : "Aventura en curso"}
              </Text>
              <Text style={styles.heroMessageSubtitle}>
                {isCompleted
                  ? "Otra cumbre en tu historial. Buen trabajo allá afuera."
                  : "Sigue avanzando con calma, la ruta sigue abierta."}
              </Text>
            </View>
          </View>
        </View>

        {/* Cuadrícula de datos del recorrido */}
        <Text style={styles.sectionTitle}>Cronología</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.lime} />
            </View>
            <Text style={styles.statLabel}>Hora de inicio</Text>
            <Text style={styles.statValue}>
              {new Date(trekking.started_at).toLocaleString("es-CL")}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Ionicons name="time-outline" size={16} color={COLORS.lime} />
            </View>
            <Text style={styles.statLabel}>Retorno estimado</Text>
            <Text style={styles.statValue}>
              {new Date(trekking.estimated_return_time).toLocaleString("es-CL")}
            </Text>
          </View>

          {trekking.finished_at && (
            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <Ionicons name="checkmark-done-outline" size={16} color={COLORS.lime} />
              </View>
              <Text style={styles.statLabel}>Finalizado el</Text>
              <Text style={styles.statValue}>
                {new Date(trekking.finished_at).toLocaleString("es-CL")}
              </Text>
            </View>
          )}

          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Ionicons
                name={trekking.tracking_enabled ? "radio-button-on" : "radio-button-off"}
                size={16}
                color={trekking.tracking_enabled ? COLORS.lime : COLORS.inkTertiary}
              />
            </View>
            <Text style={styles.statLabel}>Rastreo GPS</Text>
            <Text style={styles.statValue}>
              {trekking.tracking_enabled ? "Habilitado" : "Inactivo"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 36,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    padding: 24,
  },
  topRowFixed: {
    position: "absolute",
    top: 8,
    left: 20,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  roundButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.glass,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  headerContainer: {
    marginBottom: 18,
  },
  title: {
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

  // --- Tarjeta hero / poster compartible ---
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: 24,
    overflow: "hidden",
  },
  heroWatermark: {
    position: "absolute",
    bottom: -30,
    right: -30,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  cardSublabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.inkTertiary,
    letterSpacing: 0.5,
  },
  cardIdText: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.ink,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  heroTrailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  valueHighlight: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.lime,
  },
  heroDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginBottom: 16,
  },
  heroMessageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  heroMessageTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.ink,
    marginBottom: 2,
  },
  heroMessageSubtitle: {
    fontSize: 13,
    color: COLORS.inkSecondary,
    lineHeight: 18,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeCompleted: {
    backgroundColor: COLORS.lime,
  },
  badgeProgress: {
    backgroundColor: COLORS.limeDim,
    borderWidth: 1,
    borderColor: COLORS.limeBorder,
  },
  badgeText: {
    fontWeight: "700",
    fontSize: 12,
  },
  badgeTextCompleted: {
    color: COLORS.black,
  },
  badgeTextProgress: {
    color: COLORS.lime,
  },

  // --- Cuadrícula de estadísticas ---
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.ink,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "47%",
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.limeDim,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.inkSecondary,
    fontWeight: "500",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.ink,
  },

  message: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.inkSecondary,
    fontWeight: "500",
  },
  emptyIconContainer: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  errorContainer: {
    alignItems: "center",
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.ink,
    marginBottom: 8,
  },
  error: {
    color: COLORS.inkSecondary,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
});