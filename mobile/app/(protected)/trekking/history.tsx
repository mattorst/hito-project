
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTrekkings } from "@/features/trekking/hooks/useTrekkings";
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
  limeBorder: "rgba(198,255,77,0.25)",
  black: "#0B0C0D",
};

function BackButton() {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.backButton,
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

function MountainArtwork() {
  return (
    <View style={styles.mountainArtwork}>
      <Ionicons
        name="triangle"
        size={155}
        color="rgba(198,255,77,0.045)"
        style={styles.mountainBack}
      />

      <Ionicons
        name="triangle"
        size={112}
        color="rgba(198,255,77,0.09)"
        style={styles.mountainFront}
      />

      <Ionicons
        name="triangle-outline"
        size={82}
        color="rgba(198,255,77,0.30)"
        style={styles.mountainOutline}
      />
    </View>
  );
}

function getStatusInfo(status: string) {
  const normalized = status?.toUpperCase() ?? "";

  if (normalized === "COMPLETED") {
    return {
      label: "Completado",
      icon: "checkmark-circle" as const,
      color: COLORS.lime,
      background: COLORS.limeDim,
    };
  }

  if (
    normalized === "IN_PROGRESS" ||
    normalized === "ACTIVE"
  ) {
    return {
      label: "En curso",
      icon: "navigate" as const,
      color: COLORS.lime,
      background: COLORS.limeDim,
    };
  }

  return {
    label: status,
    icon: "ellipse" as const,
    color: COLORS.inkSecondary,
    background: "rgba(255,255,255,0.06)",
  };
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("es-CL");
}

function formatShortDate(value: string): string {
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

export default function TrekkingHistoryScreen() {
  const { trekkings, isLoading, error, refresh } =
    useTrekkings();

  const insets = useSafeAreaInsets();

  const renderTrekking = ({ item }: { item: Trekking }) => {
    const status = getStatusInfo(item.status);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        onPress={() => router.push(`/trekking/${item.id}`)}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.expeditionNumberRow}>
            <Ionicons
              name="trail-sign-outline"
              size={15}
              color={COLORS.lime}
            />

            <Text style={styles.expeditionNumber}>
              EXPEDICIÓN #{item.id}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: status.background },
            ]}
          >
            <Ionicons
              name={status.icon}
              size={12}
              color={status.color}
            />

            <Text
              style={[
                styles.statusText,
                { color: status.color },
              ]}
            >
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.cardMainRow}>
          <View style={styles.trailIconContainer}>
            <Ionicons
              name="trail-sign-outline"
              size={27}
              color={COLORS.lime}
            />
          </View>

          <View style={styles.trailInfo}>
            <Text style={styles.trailEyebrow}>
              SENDERO EXPLORADO
            </Text>

            <Text style={styles.trailName}>
              Sendero #{item.trail}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.dateSection}>
          <View style={styles.dateRow}>
            <Ionicons
              name="calendar-outline"
              size={15}
              color={COLORS.inkSecondary}
            />

            <Text style={styles.dateLabel}>
              Inicio
            </Text>

            <Text style={styles.dateValue}>
              {formatShortDate(item.started_at)}
            </Text>
          </View>

          {item.finished_at && (
            <View style={styles.dateRow}>
              <Ionicons
                name="checkmark-circle-outline"
                size={15}
                color={COLORS.lime}
              />

              <Text style={styles.dateLabel}>
                Finalizado
              </Text>

              <Text style={styles.dateValue}>
                {formatShortDate(item.finished_at)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterText}>
            Ver expedición
          </Text>

          <View style={styles.arrowContainer}>
            <Ionicons
              name="arrow-forward"
              size={17}
              color={COLORS.lime}
            />
          </View>
        </View>
      </Pressable>
    );
  };

  if (isLoading && trekkings.length === 0) {
    return (
      <SafeAreaView
        style={styles.center}
        edges={["top", "left", "right", "bottom"]}
      >
        <ActivityIndicator
          size="large"
          color={COLORS.lime}
        />

        <Text style={styles.loadingText}>
          Preparando tu bitácora...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
    >
      <View style={styles.headerContainer}>
        <View style={styles.topRow}>
          <BackButton />

          <View style={styles.brandContainer}>
            <Ionicons
              name="trail-sign-outline"
              size={18}
              color={COLORS.lime}
            />

            <Text style={styles.brandText}>
              HITO
            </Text>
          </View>
        </View>

        <Text style={styles.eyebrow}>
          HITO / BITÁCORA
        </Text>

        <Text style={styles.header}>
          Mis aventuras.
        </Text>

        <Text style={styles.subtitle}>
          Cada recorrido tiene una historia.
        </Text>
      </View>

      {error && (
        <View style={styles.errorCard}>
          <Ionicons
            name="alert-circle-outline"
            size={18}
            color={COLORS.inkSecondary}
          />

          <Text style={styles.error}>
            {error}
          </Text>
        </View>
      )}

      {!isLoading && trekkings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons
              name="trail-sign-outline"
              size={42}
              color={COLORS.lime}
            />
          </View>

          <Text style={styles.emptyTitle}>
            Tu historia comienza aquí.
          </Text>

          <Text style={styles.emptyText}>
            Aún no tienes expediciones registradas.
            Cada aventura merece ser recordada.
          </Text>
        </View>
      ) : (
        <FlatList
          data={trekkings}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTrekking}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refresh}
              tintColor={COLORS.lime}
              colors={[COLORS.lime]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: 130 + insets.bottom },
          ]}
          ListHeaderComponent={
            <>
              <View style={styles.summaryCard}>
                <MountainArtwork />

                <View style={styles.summaryContent}>
                  <View style={styles.summaryIcon}>
                    <Ionicons
                      name="compass-outline"
                      size={19}
                      color={COLORS.lime}
                    />
                  </View>

                  <Text style={styles.summaryEyebrow}>
                    TU BITÁCORA
                  </Text>

                  <View style={styles.summaryCountRow}>
                    <Text style={styles.summaryCount}>
                      {trekkings.length}
                    </Text>

                    <Text style={styles.summaryCountLabel}>
                      {trekkings.length === 1
                        ? "expedición"
                        : "expediciones"}
                    </Text>
                  </View>

                  <Text style={styles.summaryCaption}>
                    Historias que dejan huella.
                  </Text>
                </View>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Expediciones
                </Text>

                <Text style={styles.sectionCount}>
                  {trekkings.length} registros
                </Text>
              </View>
            </>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    backgroundColor: COLORS.bg,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: COLORS.bg,
  },

  pressed: {
    opacity: 0.75,
  },

  headerContainer: {
    marginBottom: 23,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 26,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },

  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  brandText: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.8,
  },

  eyebrow: {
    color: COLORS.lime,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.7,
    marginBottom: 9,
  },

  header: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.ink,
    letterSpacing: -1,
  },

  subtitle: {
    fontSize: 13,
    color: COLORS.inkSecondary,
    marginTop: 7,
    lineHeight: 19,
  },

  listContainer: {
    paddingTop: 1,
  },

  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    minHeight: 174,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: "hidden",
    marginBottom: 29,
  },

  summaryContent: {
    padding: 19,
    zIndex: 2,
  },

  summaryIcon: {
    width: 33,
    height: 33,
    borderRadius: 11,
    backgroundColor: COLORS.limeDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  summaryEyebrow: {
    color: COLORS.inkSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
  },

  summaryCountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 9,
    marginTop: 5,
  },

  summaryCount: {
    color: COLORS.ink,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1.4,
    fontVariant: ["tabular-nums"],
  },

  summaryCountLabel: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: "600",
  },

  summaryCaption: {
    color: COLORS.inkSecondary,
    fontSize: 12,
    marginTop: 4,
  },

  mountainArtwork: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 180,
    height: 160,
    overflow: "hidden",
  },

  mountainBack: {
    position: "absolute",
    right: -15,
    bottom: -51,
    transform: [{ rotate: "-10deg" }],
  },

  mountainFront: {
    position: "absolute",
    right: 54,
    bottom: -32,
    transform: [{ rotate: "8deg" }],
  },

  mountainOutline: {
    position: "absolute",
    right: 5,
    bottom: 3,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  sectionTitle: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.4,
  },

  sectionCount: {
    color: COLORS.inkSecondary,
    fontSize: 11,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 19,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: 12,
  },

  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 18,
  },

  expeditionNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexShrink: 1,
  },

  expeditionNumber: {
    color: COLORS.inkSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  cardMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    marginBottom: 18,
  },

  trailIconContainer: {
    width: 51,
    height: 51,
    borderRadius: 16,
    backgroundColor: COLORS.limeDim,
    alignItems: "center",
    justifyContent: "center",
  },

  trailInfo: {
    flex: 1,
    gap: 5,
  },

  trailEyebrow: {
    color: COLORS.inkTertiary,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
  },

  trailName: {
    color: COLORS.ink,
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: -0.5,
  },

  cardDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginBottom: 14,
  },

  dateSection: {
    gap: 11,
    marginBottom: 15,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  dateLabel: {
    color: COLORS.inkSecondary,
    fontSize: 12,
    flex: 1,
  },

  dateValue: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: "600",
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.035)",
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
  },

  cardFooterText: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: "600",
  },

  arrowContainer: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: COLORS.limeDim,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: COLORS.inkSecondary,
    fontSize: 13,
    marginTop: 15,
  },

  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 13,
    marginBottom: 15,
  },

  error: {
    flex: 1,
    fontSize: 13,
    color: COLORS.inkSecondary,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 80,
  },

  emptyIconContainer: {
    width: 84,
    height: 84,
    borderRadius: 27,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 22,
  },

  emptyTitle: {
    color: COLORS.ink,
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 9,
  },

  emptyText: {
    color: COLORS.inkSecondary,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
  },
});
