import { useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/features/auth/context/AuthContext";

// --- Paleta -----------------------------------------------------------------
// Misma línea que el resto del flujo: negro como lienzo, blanco/gris para
// texto, un único verde lima como acento y como color de "logro".
const COLORS = {
  bg: "#0B0C0D",
  surface: "#17181B",
  surfaceBorder: "rgba(255,255,255,0.08)",
  divider: "rgba(255,255,255,0.10)",
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

// Calcula "3h 24m" / "48m" entre el inicio y el cierre del recorrido.
// Es un dato real derivado de started_at/finished_at, no inventado.
function getDuration(startedAt: string, finishedAt: string): string | null {
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return null;
  }

  const totalMinutes = Math.round((end - start) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export default function TrekkingSummaryScreen() {
  const { lastCompletedTrekking, setLastCompletedTrekking } = useAuth();

  useEffect(() => {
    if (!lastCompletedTrekking) {
      router.replace("/");
    }
  }, [lastCompletedTrekking]);

  if (!lastCompletedTrekking) {
    return null;
  }

  const handleFinish = () => {
    setLastCompletedTrekking(null);
    router.replace("/");
  };

  const duration = lastCompletedTrekking.finished_at
    ? getDuration(lastCompletedTrekking.started_at, lastCompletedTrekking.finished_at)
    : null;

  const handleShare = async () => {
    try {
      await Share.share({
        message: duration
          ? `Acabo de completar el trekking #${lastCompletedTrekking.id} en el Sendero #${lastCompletedTrekking.trail} en ${duration}. 🏔️🥾`
          : `Acabo de completar el trekking #${lastCompletedTrekking.id} en el Sendero #${lastCompletedTrekking.trail}. 🏔️🥾`,
      });
    } catch (err) {
      console.error("Error al compartir el resumen:", err);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.headerContainer}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark" size={26} color={COLORS.black} />
          </View>
          <Text style={styles.title}>¡Aventura finalizada!</Text>
          <Text style={styles.subtitle}>Otra ruta que ya queda en tu historia.</Text>
        </View>

        {/* --- Tarjeta "ticket" pensada para capturar y compartir --- */}
        <View style={styles.ticket}>
          <Ionicons
            name="trail-sign-outline"
            size={160}
            color="rgba(255,255,255,0.035)"
            style={styles.ticketWatermark}
          />
          <MaterialCommunityIcons
            name="tent"
            size={90}
            color="rgba(255,255,255,0.035)"
            style={styles.ticketWatermarkTent}
          />

          <View style={styles.ticketTopRow}>
            <View style={styles.trailTag}>
              <Ionicons name="map-outline" size={12} color={COLORS.lime} style={{ marginRight: 4 }} />
              <Text style={styles.trailTagText}>Sendero #{lastCompletedTrekking.trail}</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{lastCompletedTrekking.status}</Text>
            </View>
          </View>

          {/* Badge de actividad: identifica el tipo de recorrido de un vistazo */}
          <View style={styles.activityRow}>
            <View style={styles.activityIconWrap}>
              <Ionicons name="walk" size={20} color={COLORS.black} />
            </View>
            <View>
              <Text style={styles.activityLabel}>Senderismo</Text>
              <Text style={styles.activitySublabel}>Recorrido registrado</Text>
            </View>
          </View>

          {/* Estadística hero: lo primero que se lee en una captura */}
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>TIEMPO EN RUTA</Text>
            <Text style={styles.heroStatValue}>{duration ?? "—"}</Text>
            <View style={styles.heroCaption}>
              <Ionicons name="footsteps-outline" size={13} color={COLORS.inkTertiary} style={{ marginRight: 5 }} />
              <Text style={styles.heroCaptionText}>Completado a pie</Text>
            </View>
          </View>

          {/* Separador estilo "ticket", con muescas a los lados */}
          <View style={styles.perforationRow}>
            <View style={styles.notchLeft} />
            <View style={styles.dashedLine} />
            <View style={styles.notchRight} />
          </View>

          <View style={styles.ticketDetails}>
            <View style={styles.detailItem}>
              <View style={styles.detailIconWrap}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.lime} />
              </View>
              <Text style={styles.detailLabel}>Fecha</Text>
              <Text style={styles.detailValue}>{formatShortDate(lastCompletedTrekking.started_at)}</Text>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.detailIconWrap}>
                <Ionicons name="time-outline" size={14} color={COLORS.lime} />
              </View>
              <Text style={styles.detailLabel}>Inicio</Text>
              <Text style={styles.detailValue}>
                {new Date(lastCompletedTrekking.started_at).toLocaleTimeString("es-CL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            {lastCompletedTrekking.finished_at && (
              <View style={styles.detailItem}>
                <View style={styles.detailIconWrap}>
                  <Ionicons name="checkmark-done-outline" size={14} color={COLORS.lime} />
                </View>
                <Text style={styles.detailLabel}>Término</Text>
                <Text style={styles.detailValue}>
                  {new Date(lastCompletedTrekking.finished_at).toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.ticketFooter}>
            <Text style={styles.ticketFooterId}>ID #{lastCompletedTrekking.id}</Text>
            <Text style={styles.ticketFooterTag}>#AventuraCompletada</Text>
          </View>
        </View>

        {/* Botón para compartir el logro fuera de la tarjeta, para que la
            captura de la tarjeta quede limpia */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.85}>
          <Ionicons name="share-outline" size={18} color={COLORS.ink} style={{ marginRight: 8 }} />
          <Text style={styles.shareButtonText}>Compartir aventura</Text>
        </TouchableOpacity>

        <View style={styles.messageCard}>
          <Ionicons name="cloud-done-outline" size={18} color={COLORS.lime} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.messageTitle}>Buen trabajo en terreno</Text>
            <Text style={styles.messageText}>
              Tus datos de checkpoints sincronizados han quedado registrados en el sistema.
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleFinish} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Volver al inicio</Text>
        </TouchableOpacity>
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
    paddingTop: 24,
    paddingBottom: 36,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  successIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.lime,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.ink,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.inkSecondary,
    marginTop: 4,
    textAlign: "center",
  },

  // --- Ticket ---
  ticket: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingTop: 18,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  ticketWatermark: {
    position: "absolute",
    top: -30,
    right: -30,
  },
  ticketWatermarkTent: {
    position: "absolute",
    bottom: -14,
    left: -14,
  },
  ticketTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  trailTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  trailTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.ink,
  },
  statusPill: {
    backgroundColor: COLORS.lime,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.black,
  },

  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  activityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lime,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.ink,
  },
  activitySublabel: {
    fontSize: 12,
    color: COLORS.inkSecondary,
    marginTop: 2,
  },

  heroStat: {
    alignItems: "center",
    marginBottom: 20,
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.inkTertiary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  heroStatValue: {
    fontSize: 52,
    fontWeight: "800",
    color: COLORS.lime,
    letterSpacing: -1.5,
  },
  heroCaption: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  heroCaptionText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.inkTertiary,
  },

  perforationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: -20,
    marginBottom: 18,
  },
  notchLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    marginRight: 2,
  },
  notchRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    marginLeft: 2,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  ticketDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  detailItem: {
    alignItems: "center",
    flex: 1,
  },
  detailIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.limeDim,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.inkTertiary,
    fontWeight: "600",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.ink,
    fontWeight: "700",
  },
  ticketFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  ticketFooterId: {
    fontSize: 11,
    color: COLORS.inkTertiary,
    fontWeight: "600",
  },
  ticketFooterTag: {
    fontSize: 11,
    color: COLORS.lime,
    fontWeight: "700",
  },

  shareButton: {
    flexDirection: "row",
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.ink,
  },

  messageCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: COLORS.limeDim,
    borderWidth: 1,
    borderColor: COLORS.limeBorder,
  },
  messageTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.ink,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 13,
    color: COLORS.inkSecondary,
    lineHeight: 18,
  },

  button: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: COLORS.lime,
  },
  buttonText: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: "800",
  },
});