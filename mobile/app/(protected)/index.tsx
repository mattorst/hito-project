import { Button, SafeAreaView, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/features/auth/context/AuthContext";

export default function HomeScreen() {
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Bienvenido a Hito</Text>

      <Button
        title="Cerrar sesión"
        onPress={handleLogout}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
  },
});