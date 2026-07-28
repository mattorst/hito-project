import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

export default function ParkDetailScreen() {
  const { parkId } = useLocalSearchParams<{
    parkId: string;
  }>();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <Text style={styles.title}>
          Parque #{parkId}
        </Text>

        <Text style={styles.subtitle}>
          Aquí se listarán los senderos del parque.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 16,
    color: "#666",
  },
});