import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
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
          <Text style={styles.title}>
            Trekking #{item.id}
          </Text>

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {item.status}
            </Text>
          </View>
        </View>

        <Text style={styles.info}>
          Sendero #{item.trail}
        </Text>

        <Text style={styles.info}>
          Inicio: {formatDate(item.started_at)}
        </Text>

        {item.finished_at && (
          <Text style={styles.info}>
            Finalizado: {formatDate(item.finished_at)}
          </Text>
        )}
      </Pressable>
    );
  };

  if (isLoading && trekkings.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
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
    padding: 20,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
    color: "#1a1a1a",
  },
  card: {
    padding: 18,
    borderRadius: 14,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#e8f5e9",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2e7d32",
  },
  info: {
    fontSize: 14,
    marginBottom: 5,
    color: "#555",
  },
  error: {
    marginBottom: 12,
    fontSize: 14,
    color: "#d32f2f",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
  },
});