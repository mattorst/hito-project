
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  router,
  useLocalSearchParams,
} from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { getTrekkingById } from "@/features/trekking/services/trekkingService";
import type { Trekking } from "@/features/trekking/types";

const COLORS = {
  bg: "#0B0C0D",
  surface: "#17181B",
  surfaceBorder: "rgba(255,255,255,0.08)",
  divider: "rgba(255,255,255,0.08)",
  ink: "#FFFFFF",
  inkSecondary: "#9BA1A6",
  inkTertiary: "#6E7378",
  lime: "#C6FF4D",
  limeDim: "rgba(198,255,77,0.12)",
  limeBorder: "rgba(198,255,77,0.28)",
  black: "#0B0C0D",
};

function BackButton() {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.roundButton,
        pressed && styles.pressed,
      ]}
      onPress={() => router.back()}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Volver"
    >
      <Ionicons
        name="chevron-back"
        size={20}
        color={COLORS.ink}
      />
    </Pressable>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function MountainPosterArtwork() {
  return (
    <View style={styles.posterArtwork}>
      <Ionicons
        name="triangle"
        size={230}
        color="rgba(198,255,77,0.065)"
        style={styles.posterMountainBack}
      />

      <Ionicons
        name="triangle"
        size={175}
        color="rgba(198,255,77,0.13)"
        style={styles.posterMountainFront}
      />

      <Ionicons
        name="triangle-outline"
        size={133}
        color="rgba(198,255,77,0.30)"
        style={styles.posterMountainLine}
      />
    </View>
  );
}

function TimelineCard({
  icon,
  label,
  date,
  value,
  highlighted = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  date?: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <View style={styles.timelineCard}>
      <View style={styles.timelineIconContainer}>
        <Ionicons
          name={icon}
          size={19}
          color={
            highlighted
              ? COLORS.lime
              : COLORS.inkSecondary
          }
        />
      </View>

      <Text style={styles.timelineLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.timelineValue,
          highlighted && styles.timelineValueHighlight,
        ]}
      >
        {value}
      </Text>

      {date ? (
        <Text style={styles.timelineDate}>
          {date}
        </Text>
      ) : null}
    </View>
  );
}

export default function TrekkingDetailScreen() {
  const { trekkingId } =
    useLocalSearchParams<{ trekkingId: string }>();

  const insets = useSafeAreaInsets();

  const [trekking, setTrekking] =
    useState<Trekking | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function fetchTrekkingDetail() {
      if (!trekkingId) return;

      try {
        setIsLoading(true);
        setError(null);

        const data = await getTrekkingById(
          Number(trekkingId)
        );

        setTrekking(data);
      } catch (err) {
        console.error(
          "Error al cargar detalle del trekking:",
          err
        );

        setError(
          "No fue posible cargar el detalle del trekking."
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrekkingDetail();
  }, [trekkingId]);

  const handleShare = async () => {
    if (!trekking) return;

    const isCompletedShare =
      trekking.status?.toUpperCase() === "COMPLETED";

    try {
      await Share.share({
        message: isCompletedShare
          ? `Acabo de completar mi trekking #${trekking.id} en el Sendero #${trekking.trail}. ¡Otra cumbre en la lista! 🏔️`
          : `Estoy en ruta: trekking #${trekking.id} en el Sendero #${trekking.trail}. 🥾`,
      });
    } catch (err) {
      console.error(
        "Error al compartir el trekking:",
        err
      );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.center}
        edges={["top", "left", "right", "bottom"]}
      >
        <View style={styles.loadingIcon}>
          <Ionicons
            name="trail-sign-outline"
            size={35}
            color={COLORS.lime}
          />
        </View>

        <ActivityIndicator
          size="small"
          color={COLORS.lime}
        />

        <Text style={styles.message}>
          Preparando tu expedición...
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !trekking) {
    return (
      <SafeAreaView
        style={styles.center}
        edges={["top", "left", "right", "bottom"]}
      >
        <View style={styles.topRowFixed}>
          <BackButton />
        </View>

        <View style={styles.errorContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={34}
              color={COLORS.inkTertiary}
            />
          </View>

          <Text style={styles.errorTitle}>
            No encontramos tu expedición.
          </Text>

          <Text style={styles.error}>
            {error || "Trekking no encontrado."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCompleted =
    trekking.status?.toUpperCase() === "COMPLETED";

  return (
    <SafeAreaView
      style={styles.safeContainer}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 130 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}

        <View style={styles.topRow}>
          <BackButton />

          <Pressable
            style={({ pressed }) => [
              styles.roundButton,
              pressed && styles.pressed,
            ]}
            onPress={handleShare}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Compartir expedición"
          >
            <Ionicons
              name="share-outline"
              size={19}
              color={COLORS.ink}
            />
          </Pressable>
        </View>

        <View style={styles.headerContainer}>
          <Text style={styles.eyebrow}>
            HITO / EXPEDICIÓN #{trekking.id}
          </Text>

          <Text style={styles.title}>
            Tu recorrido.
          </Text>

          <Text style={styles.subtitle}>
            Una aventura que merece ser recordada.
          </Text>
        </View>

        {/* POSTER PRINCIPAL */}

        <View style={styles.posterCard}>
          <MountainPosterArtwork />

          <View style={styles.posterContent}>
            <View style={styles.posterTopRow}>
              <View style={styles.posterBrand}>
                <Ionicons
                  name="trail-sign-outline"
                  size={18}
                  color={COLORS.lime}
                />

                <Text style={styles.posterBrandText}>
                  HITO
                </Text>
              </View>

              <Text style={styles.posterEdition}>
                EXPEDITION SERIES
              </Text>
            </View>

            <View style={styles.posterMainContent}>
              <Text style={styles.posterEyebrow}>
                TU AVENTURA
              </Text>

              <Text style={styles.posterTitle}>
                Sendero #{trekking.trail}
              </Text>

              <View style={styles.posterIdRow}>
                <Ionicons
                  name="navigate-outline"
                  size={15}
                  color={COLORS.lime}
                />

                <Text style={styles.posterId}>
                  Expedición #{trekking.id}
                </Text>
              </View>
            </View>

            <View style={styles.posterStatusRow}>
              <View
                style={[
                  styles.posterStatusBadge,
                  isCompleted
                    ? styles.posterStatusCompleted
                    : styles.posterStatusProgress,
                ]}
              >
                <Ionicons
                  name={
                    isCompleted
                      ? "checkmark-circle"
                      : "compass-outline"
                  }
                  size={14}
                  color={
                    isCompleted
                      ? COLORS.black
                      : COLORS.lime
                  }
                />

                <Text
                  style={[
                    styles.posterStatusText,
                    {
                      color: isCompleted
                        ? COLORS.black
                        : COLORS.lime,
                    },
                  ]}
                >
                  {trekking.status}
                </Text>
              </View>
            </View>

            <View style={styles.posterBottomDivider} />

            <View style={styles.posterBottomRow}>
              <View>
                <Text style={styles.posterBottomLabel}>
                  INICIO DE EXPEDICIÓN
                </Text>

                <Text style={styles.posterBottomValue}>
                  {formatDate(trekking.started_at)}
                </Text>
              </View>

              <Ionicons
                name="trail-sign-outline"
                size={25}
                color={COLORS.lime}
              />
            </View>
          </View>
        </View>

        {/* MENSAJE DE EXPEDICIÓN */}

        <View style={styles.achievementCard}>
          <View style={styles.achievementIcon}>
            <Ionicons
              name={
                isCompleted
                  ? "trophy-outline"
                  : "compass-outline"
              }
              size={23}
              color={COLORS.lime}
            />
          </View>

          <View style={styles.achievementText}>
            <Text style={styles.achievementTitle}>
              {isCompleted
                ? "¡Aventura completada!"
                : "Tu aventura continúa"}
            </Text>

            <Text style={styles.achievementSubtitle}>
              {isCompleted
                ? "Otra expedición en tu historia. Cada paso cuenta."
                : "Sigue avanzando con calma. El camino continúa."}
            </Text>
          </View>
        </View>

        {/* CRONOLOGÍA */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Cronología
          </Text>

          <Ionicons
            name="time-outline"
            size={18}
            color={COLORS.inkSecondary}
          />
        </View>

        <View style={styles.timelineGrid}>
          <TimelineCard
            icon="calendar-outline"
            label="Hora de inicio"
            value={formatTime(trekking.started_at)}
            date={formatDate(trekking.started_at)}
          />

          <TimelineCard
            icon="flag-outline"
            label="Retorno estimado"
            value={formatTime(
              trekking.estimated_return_time
            )}
            date={formatDate(
              trekking.estimated_return_time
            )}
          />

          {trekking.finished_at && (
            <TimelineCard
              icon="checkmark-done-outline"
              label="Finalizado el"
              value={formatTime(trekking.finished_at)}
              date={formatDate(trekking.finished_at)}
              highlighted
            />
          )}

          <TimelineCard
            icon={
              trekking.tracking_enabled
                ? "radio-button-on"
                : "radio-button-off"
            }
            label="Rastreo GPS"
            value={
              trekking.tracking_enabled
                ? "Habilitado"
                : "Inactivo"
            }
            highlighted={
              trekking.tracking_enabled
            }
          />
        </View>

        {/* COMPARTIR */}

        <View style={styles.shareSection}>
          <View style={styles.shareSectionHeader}>
            <View style={styles.shareIcon}>
              <Ionicons
                name="share-social-outline"
                size={21}
                color={COLORS.lime}
              />
            </View>

            <View style={styles.shareTextContainer}>
              <Text style={styles.shareTitle}>
                Comparte tu aventura
              </Text>

              <Text style={styles.shareSubtitle}>
                Cada expedición tiene una historia
                que contar.
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.shareButton,
              pressed && styles.pressed,
            ]}
            onPress={handleShare}
          >
            <Ionicons
              name="share-outline"
              size={19}
              color={COLORS.black}
            />

            <Text style={styles.shareButtonText}>
              Compartir expedición
            </Text>

            <Ionicons
              name="arrow-forward"
              size={18}
              color={COLORS.black}
            />
          </Pressable>
        </View>

        {/* FOOTER */}

        <View style={styles.footer}>
          <Ionicons
            name="trail-sign-outline"
            size={16}
            color={COLORS.inkTertiary}
          />

          <Text style={styles.footerText}>
            HITO · CADA PASO CUENTA
          </Text>
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
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  pressed: {
    opacity: 0.78,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 27,
  },

  roundButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },

  headerContainer: {
    marginBottom: 23,
  },

  eyebrow: {
    color: COLORS.lime,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginBottom: 9,
  },

  title: {
    color: COLORS.ink,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
  },

  subtitle: {
    color: COLORS.inkSecondary,
    fontSize: 13,
    marginTop: 7,
    lineHeight: 19,
  },

  posterCard: {
    minHeight: 345,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.limeBorder,
    overflow: "hidden",
    marginBottom: 13,
  },

  posterArtwork: {
    position: "absolute",
    right: -25,
    bottom: 25,
    width: 280,
    height: 245,
    overflow: "hidden",
  },

  posterMountainBack: {
    position: "absolute",
    right: -24,
    bottom: -50,
    transform: [{ rotate: "-12deg" }],
  },

  posterMountainFront: {
    position: "absolute",
    right: 83,
    bottom: -20,
    transform: [{ rotate: "8deg" }],
  },

  posterMountainLine: {
    position: "absolute",
    right: 12,
    bottom: 34,
  },

  posterContent: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
    minHeight: 345,
  },

  posterTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  posterBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  posterBrandText: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2,
  },

  posterEdition: {
    color: COLORS.inkTertiary,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.1,
  },

  posterMainContent: {
    marginTop: 34,
    marginBottom: 22,
  },

  posterEyebrow: {
    color: COLORS.lime,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginBottom: 10,
  },

  posterTitle: {
    color: COLORS.ink,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 39,
    maxWidth: "90%",
  },

  posterIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
  },

  posterId: {
    color: COLORS.inkSecondary,
    fontSize: 12,
    fontWeight: "500",
  },

  posterStatusRow: {
    flexDirection: "row",
    marginBottom: 20,
  },

  posterStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
  },

  posterStatusCompleted: {
    backgroundColor: COLORS.lime,
  },

  posterStatusProgress: {
    backgroundColor: COLORS.limeDim,
    borderWidth: 1,
    borderColor: COLORS.limeBorder,
  },

  posterStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  posterBottomDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 16,
  },

  posterBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  posterBottomLabel: {
    color: COLORS.inkTertiary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 6,
  },

  posterBottomValue: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: "700",
  },

  achievementCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 15,
    backgroundColor: COLORS.surface,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: 29,
  },

  achievementIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.limeDim,
    alignItems: "center",
    justifyContent: "center",
  },

  achievementText: {
    flex: 1,
    gap: 5,
  },

  achievementTitle: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: "700",
  },

  achievementSubtitle: {
    color: COLORS.inkSecondary,
    fontSize: 12,
    lineHeight: 18,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  sectionTitle: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.4,
  },

  timelineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 28,
  },

  timelineCard: {
    width: "48%",
    backgroundColor: COLORS.surface,
    borderRadius: 17,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    minHeight: 147,
  },

  timelineIconContainer: {
    width: 33,
    height: 33,
    borderRadius: 11,
    backgroundColor: COLORS.limeDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  timelineLabel: {
    color: COLORS.inkSecondary,
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 7,
  },

  timelineValue: {
    color: COLORS.ink,
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: -0.4,
    fontVariant: ["tabular-nums"],
  },

  timelineValueHighlight: {
    color: COLORS.lime,
  },

  timelineDate: {
    color: COLORS.inkSecondary,
    fontSize: 10,
    marginTop: 5,
  },

  shareSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 19,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: 17,
    marginBottom: 24,
  },

  shareSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  shareIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: COLORS.limeDim,
    alignItems: "center",
    justifyContent: "center",
  },

  shareTextContainer: {
    flex: 1,
    gap: 4,
  },

  shareTitle: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: "700",
  },

  shareSubtitle: {
    color: COLORS.inkSecondary,
    fontSize: 12,
    lineHeight: 18,
  },

  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.lime,
    borderRadius: 13,
    minHeight: 51,
    paddingHorizontal: 15,
    gap: 10,
  },

  shareButtonText: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
  },

  footerText: {
    color: COLORS.inkTertiary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.3,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    padding: 24,
  },

  loadingIcon: {
    width: 72,
    height: 72,
    borderRadius: 23,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  message: {
    marginTop: 14,
    fontSize: 13,
    color: COLORS.inkSecondary,
    fontWeight: "500",
  },

  topRowFixed: {
    position: "absolute",
    top: 8,
    left: 20,
  },

  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 23,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },

  errorContainer: {
    alignItems: "center",
    padding: 24,
  },

  errorTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: COLORS.ink,
    textAlign: "center",
    marginBottom: 10,
  },

  error: {
    color: COLORS.inkSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
});
