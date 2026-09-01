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

export default function TrekkingHistoryScreen() {
  const {
    trekkings,
    isLoading,
    error,
    refresh,
  } = useTrekkings();

  const renderTrekking = ({
    item,
  }: {
    item: Trekking;
  }) => {
    return (
      <Pressable
        style={styles.card}
        onPress={() =>
          router.push(
            `/trekking/${item.id}`,
          )
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Ionicons name="trail-sign-outline" size={18} color="#111111" style={{ marginRight: 6 }} />
            <Text style={styles.cardTitle}>
              Trekking #{item.id}
            </Text>
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="map-outline" size={15} color="#666666" style={styles.infoIcon} />
          <Text style={styles.info}>
            Sendero #{item.trail}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={15} color="#666666" style={styles.infoIcon} />
          <Text style={styles.info}>
            Inicio: {formatDate(item.started_at)}
          </Text>
        </View>

        {item.finished_at && (
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-done-outline" size={15} color="#2E7D32" style={styles.infoIcon} />
            <Text style={[styles.info, styles.finishedInfo]}>
              Finalizado: {formatDate(item.finished_at)}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  if (isLoading && trekkings.length === 0) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "left", "right", "bottom"]}>
        <ActivityIndicator size="large" color="#111111" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Text style={styles.header}>
        Mis trekkings
      </Text>

      {error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}

      {!isLoading && trekkings.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="footsteps-outline" size={48} color="#999999" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyText}>
            Todavía no tienes trekkings registrados.
          </Text>
        </View>
      ) : (
        <FlatList
          data={trekkings}
          keyExtractor={(item) =>
            String(item.id)
          }
          renderItem={renderTrekking}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refresh}
              tintColor="#111111"
            />
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
    paddingTop: 16,
    backgroundColor: "#F4F5F7",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F4F5F7",
  },
  header: {
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 16,
    color: "#111111",
    letterSpacing: -0.5,
  },
  listContainer: {
    paddingBottom: 24,
  },
  card: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
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
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111111",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#E8F5E9",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2E7D32",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  infoIcon: {
    marginRight: 8,
  },
  info: {
    fontSize: 14,
    color: "#666666",
    fontWeight: "400",
  },
  finishedInfo: {
    color: "#2E7D32",
    fontWeight: "500",
  },
  error: {
    marginBottom: 12,
    fontSize: 14,
    color: "#E53935",
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 15,
    color: "#666666",
    fontWeight: "500",
  },
});