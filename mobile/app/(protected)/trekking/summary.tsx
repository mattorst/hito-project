
import { useEffect } from "react";
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useAuth } from "@/features/auth/context/AuthContext";

// --------------------------------------------------
// HITO — PALETA
// --------------------------------------------------

const COLORS = {
  bg: "#0B0C0D",
  surface: "#17181B",
  surfaceAlt: "#202226",
  white: "#FFFFFF",
  secondary: "#9BA1A6",
  tertiary: "#6E7378",
  lime: "#C6FF4D",
  limeDim: "rgba(198,255,77,0.11)",
  limeBorder: "rgba(198,255,77,0.25)",
  border: "rgba(255,255,255,0.09)",
  divider: "rgba(255,255,255,0.11)",
};

// --------------------------------------------------
// FUNCIONES ORIGINALES
// --------------------------------------------------

function getDuration(
  startedAt: string,
  finishedAt: string,
): string | null {
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    end < start
  ) {
    return null;
  }

  const totalMinutes = Math.round(
    (end - start) / 60000,
  );

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function formatShortDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

// --------------------------------------------------
// COMPONENTES VISUALES
// --------------------------------------------------

function SuccessEmblem() {
  return (
    <View style={styles.emblemOuter}>
      <View style={styles.emblemInner}>
        <Ionicons
          name="checkmark"
          size={31}
          color={COLORS.bg}
        />
      </View>
    </View>
  );
}

function MountainIllustration() {
  return (
    <View
      style={styles.mountainScene}
      pointerEvents="none"
    >
      <View style={styles.sun} />

      <MaterialCommunityIcons
        name="image-filter-hdr"
        size={170}
        color="#39423A"
        style={styles.mountainBack}
      />

      <MaterialCommunityIcons
        name="image-filter-hdr"
        size={190}
        color="#58664C"
        style={styles.mountainFront}
      />

      <View style={styles.mountainFade} />
    </View>
  );
}

function InfoCell({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoCell}>
      <View style={styles.infoIcon}>
        <Ionicons
          name={icon}
          size={17}
          color={COLORS.lime}
        />
      </View>

      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text
        style={styles.infoValue}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {value}
      </Text>
    </View>
  );
}

// --------------------------------------------------
// PANTALLA PRINCIPAL
// --------------------------------------------------

export default function TrekkingSummaryScreen() {
  const {
    lastCompletedTrekking,
    setLastCompletedTrekking,
  } = useAuth();

  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const isCompact = height < 740;
  const isNarrow = width < 360;

  // Espacio extra para una posible barra inferior
  // de navegación, además del área segura del sistema.
  const bottomSpace = Math.max(
    insets.bottom + 32,
    110,
  );

  useEffect(() => {
    if (!lastCompletedTrekking) {
      router.replace("/");
    }
  }, [lastCompletedTrekking]);

  if (!lastCompletedTrekking) {
    return null;
  }

  // --------------------------------------------------
  // LÓGICA ORIGINAL
  // --------------------------------------------------

  const handleFinish = () => {
    setLastCompletedTrekking(null);
    router.replace("/");
  };

  const duration = lastCompletedTrekking.finished_at
    ? getDuration(
        lastCompletedTrekking.started_at,
        lastCompletedTrekking.finished_at,
      )
    : null;

  const handleShare = async () => {
    try {
      await Share.share({
        message: duration
          ? `Acabo de completar el trekking #${lastCompletedTrekking.id} en el Sendero #${lastCompletedTrekking.trail} en ${duration}. 🏔️🥾`
          : `Acabo de completar el trekking #${lastCompletedTrekking.id} en el Sendero #${lastCompletedTrekking.trail}. 🏔️🥾`,
      });
    } catch (err) {
      console.error(
        "Error al compartir el resumen:",
        err,
      );
    }
  };

  const startTime = new Date(
    lastCompletedTrekking.started_at,
  ).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const finishTime = lastCompletedTrekking.finished_at
    ? new Date(
        lastCompletedTrekking.finished_at,
      ).toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  // --------------------------------------------------
  // INTERFAZ
  // --------------------------------------------------

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: isNarrow ? 16 : 20,
            paddingTop: isCompact ? 14 : 25,
            paddingBottom: bottomSpace,
          },
        ]}
      >
        {/* ENCABEZADO */}

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            HITO / EXPEDICIÓN FINALIZADA
          </Text>

          <SuccessEmblem />

          <Text
            style={[
              styles.title,
              { fontSize: isNarrow ? 27 : 32 },
            ]}
          >
            ¡Lo conseguiste!
          </Text>

          <Text style={styles.subtitle}>
            Cada paso cuenta una historia.
            Esta es la tuya.
          </Text>
        </View>

        {/* TARJETA DE EXPEDICIÓN */}

        <View style={styles.expeditionCard}>
          {/* CABECERA DE LA TARJETA */}

          <View style={styles.cardHeader}>
            <View style={styles.cardBrand}>
              <Ionicons
                name="trail-sign-outline"
                size={17}
                color={COLORS.lime}
              />

              <Text style={styles.cardBrandText}>
                HITO
              </Text>
            </View>

            <View style={styles.completedBadge}>
              <View style={styles.badgeDot} />

              <Text style={styles.completedBadgeText}>
                COMPLETADO
              </Text>
            </View>
          </View>

          {/* PRESENTACIÓN DEL SENDERO */}

          <View style={styles.cardIntro}>
            <Text style={styles.cardEyebrow}>
              ADVENTURE PASS / #{lastCompletedTrekking.id}
            </Text>

            <Text
              style={[
                styles.trailTitle,
                {
                  fontSize: isNarrow ? 27 : 32,
                },
              ]}
            >
              Sendero #{lastCompletedTrekking.trail}
            </Text>

            <View style={styles.activityLabel}>
              <Ionicons
                name="walk-outline"
                size={15}
                color={COLORS.secondary}
              />

              <Text style={styles.activityLabelText}>
                Senderismo · Recorrido registrado
              </Text>
            </View>
          </View>

          {/* ILUSTRACIÓN DE MONTAÑA */}

          <MountainIllustration />

          {/* ESTADÍSTICA PRINCIPAL */}

          <View style={styles.durationSection}>
            <Text style={styles.durationLabel}>
              TIEMPO EN RUTA
            </Text>

            <Text
              style={[
                styles.durationValue,
                {
                  fontSize: isNarrow ? 43 : 52,
                },
              ]}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {duration ?? "—"}
            </Text>

            <View style={styles.durationCaption}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={COLORS.lime}
              />

              <Text style={styles.durationCaptionText}>
                Una aventura más en tu historia
              </Text>
            </View>
          </View>

          {/* SEPARADOR */}

          <View style={styles.cardDivider}>
            <View style={styles.dividerNotchLeft} />

            <View style={styles.dividerLine} />

            <View style={styles.dividerNotchRight} />
          </View>

          {/* INFORMACIÓN REAL */}

          <View style={styles.detailsSection}>
            <Text style={styles.detailsHeading}>
              DETALLES DEL RECORRIDO
            </Text>

            <View style={styles.detailsGrid}>
              <InfoCell
                icon="calendar-outline"
                label="Fecha"
                value={formatShortDate(
                  lastCompletedTrekking.started_at,
                )}
              />

              <InfoCell
                icon="time-outline"
                label="Inicio"
                value={startTime}
              />

              {finishTime && (
                <InfoCell
                  icon="flag-outline"
                  label="Término"
                  value={finishTime}
                />
              )}
            </View>
          </View>

          {/* PIE DE TARJETA */}

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.footerSmall}>
                EXPEDICIÓN
              </Text>

              <Text style={styles.footerId}>
                #{lastCompletedTrekking.id}
              </Text>
            </View>

            <View style={styles.footerRight}>
              <Ionicons
                name="footsteps-outline"
                size={17}
                color={COLORS.lime}
              />

              <Text style={styles.footerTag}>
                CADA PASO CUENTA
              </Text>
            </View>
          </View>
        </View>

        {/* COMPARTIR */}

        <View style={styles.shareSection}>
          <Text style={styles.sectionTitle}>
            Tu aventura merece recordarse.
          </Text>

          <Text style={styles.sectionSubtitle}>
            Comparte este logro con quien quieras.
          </Text>

          <Pressable
            onPress={handleShare}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.shareButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="share-social-outline"
              size={20}
              color={COLORS.white}
            />

            <Text style={styles.shareButtonText}>
              Compartir aventura
            </Text>

            <Ionicons
              name="arrow-forward"
              size={19}
              color={COLORS.white}
            />
          </Pressable>
        </View>

        {/* MENSAJE INFORMATIVO */}

        <View style={styles.messageCard}>
          <View style={styles.messageIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={21}
              color={COLORS.lime}
            />
          </View>

          <View style={styles.messageContent}>
            <Text style={styles.messageTitle}>
              Buen trabajo en terreno
            </Text>

            <Text style={styles.messageText}>
              Tus datos de checkpoints sincronizados
              han quedado registrados en el sistema.
            </Text>
          </View>
        </View>

        {/* FINALIZAR */}

        <Pressable
          onPress={handleFinish}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.finishButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="compass-outline"
            size={20}
            color={COLORS.bg}
          />

          <Text style={styles.finishButtonText}>
            Volver a explorar
          </Text>

          <Ionicons
            name="arrow-forward"
            size={19}
            color={COLORS.bg}
          />
        </Pressable>

        <Text style={styles.bottomBrand}>
          HITO · EXPLORA CON SEGURIDAD
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// --------------------------------------------------
// ESTILOS
// --------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  pressed: {
    opacity: 0.78,
  },

  // ENCABEZADO

  header: {
    alignItems: "center",
    marginBottom: 27,
  },

  eyebrow: {
    color: COLORS.lime,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.7,
    textAlign: "center",
    marginBottom: 20,
  },

  emblemOuter: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: COLORS.limeDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.limeBorder,
  },

  emblemInner: {
    width: 57,
    height: 57,
    borderRadius: 29,
    backgroundColor: COLORS.lime,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    color: COLORS.white,
    fontWeight: "800",
    letterSpacing: -1,
    textAlign: "center",
  },

  subtitle: {
    color: COLORS.secondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 9,
    maxWidth: 270,
  },

  // TARJETA PRINCIPAL

  expeditionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },

  cardHeader: {
    paddingHorizontal: 19,
    paddingTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  cardBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  cardBrandText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2.2,
  },

  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.limeDim,
    borderWidth: 1,
    borderColor: COLORS.limeBorder,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 30,
    flexShrink: 1,
  },

  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.lime,
  },

  completedBadgeText: {
    color: COLORS.lime,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  // SENDERO

  cardIntro: {
    paddingHorizontal: 19,
    paddingTop: 27,
  },

  cardEyebrow: {
    color: COLORS.tertiary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 9,
  },

  trailTitle: {
    color: COLORS.white,
    fontWeight: "800",
    letterSpacing: -0.8,
  },

  activityLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 10,
  },

  activityLabelText: {
    color: COLORS.secondary,
    fontSize: 12,
    flexShrink: 1,
  },

  // MONTAÑAS

  mountainScene: {
    height: 145,
    position: "relative",
    overflow: "hidden",
    marginTop: 8,
  },

  sun: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.lime,
    opacity: 0.82,
    top: 12,
    right: 64,
  },

  mountainBack: {
    position: "absolute",
    bottom: -51,
    left: -10,
    opacity: 0.9,
  },

  mountainFront: {
    position: "absolute",
    bottom: -58,
    right: -7,
    opacity: 0.95,
  },

  mountainFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 24,
    backgroundColor: COLORS.surface,
    opacity: 0.15,
  },

  // DURACIÓN

  durationSection: {
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 25,
  },

  durationLabel: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.8,
    marginBottom: 7,
  },

  durationValue: {
    color: COLORS.lime,
    fontWeight: "800",
    letterSpacing: -1.8,
    textAlign: "center",
  },

  durationCaption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 8,
  },

  durationCaptionText: {
    color: COLORS.secondary,
    fontSize: 12,
  },

  // DIVISOR

  cardDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  dividerNotchLeft: {
    width: 15,
    height: 24,
    backgroundColor: COLORS.bg,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    borderStyle: "dashed",
    marginHorizontal: 7,
  },

  dividerNotchRight: {
    width: 15,
    height: 24,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },

  // DETALLES

  detailsSection: {
    paddingHorizontal: 18,
    paddingBottom: 22,
  },

  detailsHeading: {
    color: COLORS.tertiary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 17,
  },

  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 7,
  },

  infoCell: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },

  infoIcon: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: COLORS.limeDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  infoLabel: {
    color: COLORS.tertiary,
    fontSize: 11,
    marginBottom: 6,
  },

  infoValue: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },

  // FOOTER DE TARJETA

  cardFooter: {
    marginHorizontal: 19,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingVertical: 17,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  footerSmall: {
    color: COLORS.tertiary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.2,
  },

  footerId: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },

  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexShrink: 1,
  },

  footerTag: {
    color: COLORS.lime,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    flexShrink: 1,
  },

  // COMPARTIR

  shareSection: {
    marginTop: 28,
  },

  sectionTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  sectionSubtitle: {
    color: COLORS.secondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 16,
  },

  shareButton: {
    minHeight: 54,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 17,
    gap: 12,
  },

  shareButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },

  // MENSAJE

  messageCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 19,
    padding: 16,
    backgroundColor: COLORS.limeDim,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.limeBorder,
  },

  messageIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: "rgba(198,255,77,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  messageContent: {
    flex: 1,
  },

  messageTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 5,
  },

  messageText: {
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 19,
  },

  // VOLVER

  finishButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: COLORS.lime,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 17,
    gap: 12,
    marginTop: 23,
  },

  finishButtonText: {
    color: COLORS.bg,
    fontSize: 14,
    fontWeight: "800",
    flex: 1,
  },

  bottomBrand: {
    color: COLORS.tertiary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    textAlign: "center",
    marginTop: 24,
  },
});
