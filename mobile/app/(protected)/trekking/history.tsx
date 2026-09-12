import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTrekkings } from "@/features/trekking/hooks/useTrekkings";
import type { Trekking } from "@/features/trekking/types";

// --- Paleta -----------------------------------------------------------------
// La misma línea de Parques, Trekking activo e Incidente: negro como lienzo,
// blanco/gris para jerarquía de texto y un único verde lima como acento.
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
    <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
      <Ionicons name="chevron-back" size={20} color={COLORS.ink} />
    </Pressable>
  );
}

export default function TrekkingHistoryScreen() {
  const { trekkings, isLoading, error, refresh } = useTrekkings();

  const renderTrekking = ({ item }: { item: Trekking }) => {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push(`/trekking/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="footsteps-outline" size={17} color={COLORS.lime} />
            </View>
            <Text style={styles.cardTitle}>Trekking #{item.id}</Text>
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.infoRow}>
          <Ionicons name="map-outline" size={15} color={COLORS.inkSecondary} style={styles.infoIcon} />
          <Text style={styles.info}>Sendero #{item.trail}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={15} color={COLORS.inkSecondary} style={styles.infoIcon} />
          <Text style={styles.info}>Inicio: {formatDate(item.started_at)}</Text>
        </View>

        {item.finished_at && (
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-done-outline" size={15} color={COLORS.lime} style={styles.infoIcon} />
            <Text style={[styles.info, styles.finishedInfo]}>
              Finalizado: {formatDate(item.finished_at)}
            </Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterText}>Ver detalle</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.inkTertiary} />
        </View>
      </Pressable>
    );
  };

  if (isLoading && trekkings.length === 0) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "left", "right", "bottom"]}>
        <ActivityIndicator size="large" color={COLORS.lime} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.headerContainer}>
        <View style={styles.topRow}>
          <BackButton />
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.header}>Mis trekkings</Text>
          {trekkings.length > 0 && (
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{trekkings.length}</Text>
            </View>
          )}
        </View>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {!isLoading && trekkings.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="footsteps-outline" size={30} color={COLORS.inkTertiary} />
          </View>
          <Text style={styles.emptyText}>Todavía no tienes trekkings registrados.</Text>
        </View>
      ) : (
        <FlatList
          data={trekkings}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTrekking}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={COLORS.lime} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("es-CL");
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
  headerContainer: {
    marginBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.glass,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  header: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.ink,
    letterSpacing: -0.6,
  },
  countPill: {
    backgroundColor: COLORS.limeDim,
    borderWidth: 1,
    borderColor: COLORS.limeBorder,
    minWidth: 26,
    height: 26,
    paddingHorizontal: 7,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  countPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.lime,
  },
  listContainer: {
    paddingBottom: 24,
  },
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: 14,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.limeDim,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.ink,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.inkSecondary,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoIcon: {
    marginRight: 8,
  },
  info: {
    fontSize: 14,
    color: COLORS.inkSecondary,
    fontWeight: "400",
  },
  finishedInfo: {
    color: COLORS.lime,
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 6,
    gap: 4,
  },
  cardFooterText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.inkTertiary,
  },
  error: {
    marginBottom: 12,
    fontSize: 14,
    color: COLORS.ink,
    textAlign: "center",
    fontWeight: "600",
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 15,
    color: COLORS.inkSecondary,
    fontWeight: "500",
  },
});